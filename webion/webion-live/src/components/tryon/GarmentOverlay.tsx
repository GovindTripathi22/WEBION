import { useRef, useEffect, useMemo, memo } from 'react';
import { useTryonStore } from '@/lib/tryon-store';
import { type PoseLandmark } from '@/lib/hooks/usePoseDetection';

interface GarmentOverlayProps {
  containerWidth: number;
  containerHeight: number;
  landmarks: PoseLandmark[] | null;
  segmentationMask?: any; // MediaPipe Mask
}

interface ClothNode {
  x: number;
  y: number;
  z: number;
  px: number; // Previous X
  py: number; // Previous Y
  pz: number; // Previous Z
  u: number;  // Static texture coordinate U (0-1)
  v: number;  // Static texture coordinate V (0-1)
  pinned: boolean;
}

interface ClothSpring {
  nodeA: number; // Index in node array
  nodeB: number; // Index in node array
  restLength: number;
  type: 'structural' | 'shear' | 'bending';
}

interface Triangle {
  p0: ClothNode;
  p1: ClothNode;
  p2: ClothNode;
  t0: { u: number; v: number };
  t1: { u: number; v: number };
  t2: { u: number; v: number };
  avgZ: number;
  normal: { x: number; y: number; z: number };
}

// Memoize to avoid re-renders since we use a requestAnimationFrame loop internally
export const GarmentOverlay = memo(function GarmentOverlay({
  containerWidth,
  containerHeight,
  landmarks,
  segmentationMask,
}: GarmentOverlayProps) {
  const {
    selectedGarmentId,
    garments,
    transform,
    snapToShoulders,
  } = useTryonStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const widthRef = useRef(containerWidth);
  const heightRef = useRef(containerHeight);
  const garmentImageRef = useRef<HTMLImageElement | null>(null);
  const landmarksRef = useRef<PoseLandmark[] | null>(null);
  const maskRef = useRef<any>(null);
  const requestRef = useRef<number>(undefined);
  const lastTrackingRef = useRef<boolean | null>(null);

  const transformRef = useRef(transform);
  const snapToShouldersRef = useRef(snapToShoulders);
  const selectedGarmentRef = useRef<any>(null);

  // Grid configuration parameters (5x6 grid)
  const cols = 5;
  const rows = 6;
  const kDepth = 0.05;          // Restoring force coefficient towards z=0 coronal plane
  const extensionFactor = 0.15; // Extend grid 15% past shoulders on each side

  // Light vector for 3D Dynamic Normal Shading (light coming from top-left front)
  const lightDir = { x: -0.35, y: -0.45, z: -0.82 }; // Normalized (-0.35^2 + -0.45^2 + -0.82^2 ≈ 1)

  // Cloth Simulation State Ref
  const clothRef = useRef<{
    nodes: ClothNode[];
    springs: ClothSpring[];
    initialShoulderWidth: number;
    initialScale: number;
    initialized: boolean;
  }>({
    nodes: [],
    springs: [],
    initialShoulderWidth: 1.0,
    initialScale: 1.0,
    initialized: false
  });

  const selectedGarment = useMemo(() => garments.find((g) => g.id === selectedGarmentId), [garments, selectedGarmentId]);

  // Sync props to refs to avoid re-running/re-creating the animation loop
  useEffect(() => {
    landmarksRef.current = landmarks;
    maskRef.current = segmentationMask;
    widthRef.current = containerWidth;
    heightRef.current = containerHeight;
  }, [landmarks, segmentationMask, containerWidth, containerHeight]);

  // Sync store state to refs to avoid stale closures in the animation loop
  useEffect(() => {
    transformRef.current = transform;
    snapToShouldersRef.current = snapToShoulders;
    selectedGarmentRef.current = selectedGarment;
  }, [transform, snapToShoulders, selectedGarment]);

  // Invalidate initialization on resize
  useEffect(() => {
    clothRef.current.initialized = false;
  }, [containerWidth, containerHeight]);

  // Initialize and cache context
  useEffect(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });
    }
  }, []);

  // Load garment image
  useEffect(() => {
    if (!selectedGarment) {
      garmentImageRef.current = null;
      clothRef.current.initialized = false;
      return;
    }
    const img = new Image();
    img.src = selectedGarment.src;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      garmentImageRef.current = img;
      clothRef.current.initialized = false; // Reset cloth to rebuild on new image load
    };
  }, [selectedGarment]);

  // Reset simulation when garment changes
  useEffect(() => {
    clothRef.current.initialized = false;
  }, [selectedGarmentId]);

  // Initialize the cloth grid
  const initializeCloth = (
    useShoulderTracking: boolean,
    currentLandmarks: PoseLandmark[] | null,
    w: number,
    h: number
  ) => {
    const imgWidth = garmentImageRef.current?.width || 600;
    const imgHeight = garmentImageRef.current?.height || 800;
    const currentTransform = transformRef.current;

    let pLS = { x: 0, y: 0, z: 0 };
    let pRS = { x: 0, y: 0, z: 0 };
    let pLH = { x: 0, y: 0, z: 0 };
    let pRH = { x: 0, y: 0, z: 0 };
    let initShoulderWidth = 1.0;
    let initScale = 1.0;

    if (useShoulderTracking && currentLandmarks) {
      const ls = currentLandmarks[11];
      const rs = currentLandmarks[12];
      const lh = currentLandmarks[23];
      const rh = currentLandmarks[24];

      if (!ls || !rs || !lh || !rh) return false;

      pLS = { x: ls.x * w, y: ls.y * h, z: (ls.z ?? 0) * w };
      pRS = { x: rs.x * w, y: rs.y * h, z: (rs.z ?? 0) * w };
      pLH = { x: lh.x * w, y: lh.y * h, z: (lh.z ?? 0) * w };
      pRH = { x: rh.x * w, y: rh.y * h, z: (rh.z ?? 0) * w };

      const dx = pRS.x - pLS.x;
      const dy = pRS.y - pLS.y;
      const dz = pRS.z - pLS.z;
      initShoulderWidth = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
    } else {
      // Manual Mode
      const scale = currentTransform.scale;
      const rot = (currentTransform.rotation * Math.PI) / 180;
      const W_m = imgWidth * scale;
      const H_m = imgHeight * scale;

      pLS = { x: currentTransform.x, y: currentTransform.y, z: 0 };
      pRS = { x: currentTransform.x + W_m * Math.cos(rot), y: currentTransform.y + W_m * Math.sin(rot), z: 0 };

      pLH = { x: pLS.x - H_m * Math.sin(rot), y: pLS.y + H_m * Math.cos(rot), z: 0 };
      pRH = { x: pRS.x - H_m * Math.sin(rot), y: pRS.y + H_m * Math.cos(rot), z: 0 };

      initScale = scale;
    }

    const dx = pRS.x - pLS.x;
    const dy = pRS.y - pLS.y;
    const dz = pRS.z - pLS.z;

    const shoulderMid = { x: (pLS.x + pRS.x) / 2, y: (pLS.y + pRS.y) / 2, z: (pLS.z + pRS.z) / 2 };
    const hipMid = { x: (pLH.x + pRH.x) / 2, y: (pLH.y + pRH.y) / 2, z: (pLH.z + pRH.z) / 2 };

    const dirTorso = {
      x: hipMid.x - shoulderMid.x,
      y: hipMid.y - shoulderMid.y,
      z: hipMid.z - shoulderMid.z
    };

    // 1. Generate Nodes
    const nodes: ClothNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t_c = c / (cols - 1);
        const t_r = r / (rows - 1);
        let x = 0;
        let y = 0;
        let z = 0;

        if (useShoulderTracking) {
          const colFactor = -extensionFactor + (1 + 2 * extensionFactor) * t_c;
          const rowFactor = t_r;
          x = pLS.x + dx * colFactor + dirTorso.x * rowFactor;
          y = pLS.y + dy * colFactor + dirTorso.y * rowFactor;
          z = pLS.z + dz * colFactor + dirTorso.z * rowFactor;
        } else {
          x = pLS.x + dx * t_c + dirTorso.x * t_r;
          y = pLS.y + dy * t_c + dirTorso.y * t_r;
          z = 0;
        }

        nodes.push({
          x, y, z,
          px: x, py: y, pz: z,
          u: t_c,
          v: t_r,
          pinned: r === 0
        });
      }
    }

    // 2. Generate Springs
    const springs: ClothSpring[] = [];
    const addSpring = (r1: number, c1: number, r2: number, c2: number, type: 'structural' | 'shear' | 'bending') => {
      if (r1 >= 0 && r1 < rows && c1 >= 0 && c1 < cols && r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols) {
        const idxA = r1 * cols + c1;
        const idxB = r2 * cols + c2;
        const nodeA = nodes[idxA];
        const nodeB = nodes[idxB];
        const sdx = nodeB.x - nodeA.x;
        const sdy = nodeB.y - nodeA.y;
        const sdz = nodeB.z - nodeA.z;
        const restLength = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz);
        springs.push({ nodeA: idxA, nodeB: idxB, restLength, type });
      }
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        addSpring(r, c, r, c + 1, 'structural');
        addSpring(r, c, r + 1, c, 'structural');
        addSpring(r, c, r + 1, c + 1, 'shear');
        addSpring(r, c + 1, r + 1, c, 'shear');
        addSpring(r, c, r, c + 2, 'bending');
        addSpring(r, c, r + 2, c, 'bending');
      }
    }

    clothRef.current = {
      nodes,
      springs,
      initialShoulderWidth: initShoulderWidth,
      initialScale: initScale,
      initialized: true
    };

    return true;
  };

  // Perform Verlet physics simulation update with 3D Torso Ellipsoid Collision
  const updatePhysics = (
    useShoulderTracking: boolean,
    currentLandmarks: PoseLandmark[] | null,
    w: number,
    h: number
  ) => {
    const state = clothRef.current;
    if (!state.initialized) return;

    const currentTransform = transformRef.current;

    let scaleFactor = 1.0;
    let pLS = { x: 0, y: 0, z: 0 };
    let pRS = { x: 0, y: 0, z: 0 };
    let pLH = { x: 0, y: 0, z: 0 };
    let pRH = { x: 0, y: 0, z: 0 };
    let dx = 0, dy = 0, dz = 0;

    if (useShoulderTracking && currentLandmarks) {
      const ls = currentLandmarks[11];
      const rs = currentLandmarks[12];
      const lh = currentLandmarks[23];
      const rh = currentLandmarks[24];
      if (!ls || !rs || !lh || !rh) return;

      pLS = { x: ls.x * w, y: ls.y * h, z: (ls.z ?? 0) * w };
      pRS = { x: rs.x * w, y: rs.y * h, z: (rs.z ?? 0) * w };
      pLH = { x: lh.x * w, y: lh.y * h, z: (lh.z ?? 0) * w };
      pRH = { x: rh.x * w, y: rh.y * h, z: (rh.z ?? 0) * w };

      dx = pRS.x - pLS.x;
      dy = pRS.y - pLS.y;
      dz = pRS.z - pLS.z;

      const currentShoulderWidth = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      scaleFactor = currentShoulderWidth / state.initialShoulderWidth;
    } else {
      const imgWidth = garmentImageRef.current?.width || 600;
      const imgHeight = garmentImageRef.current?.height || 800;
      const scale = currentTransform.scale;
      const rot = (currentTransform.rotation * Math.PI) / 180;
      const W_m = imgWidth * scale;
      const H_m = imgHeight * scale;

      pLS = { x: currentTransform.x, y: currentTransform.y, z: 0 };
      pRS = { x: currentTransform.x + W_m * Math.cos(rot), y: currentTransform.y + W_m * Math.sin(rot), z: 0 };
      pLH = { x: pLS.x - H_m * Math.sin(rot), y: pLS.y + H_m * Math.cos(rot), z: 0 };
      pRH = { x: pRS.x - H_m * Math.sin(rot), y: pRS.y + H_m * Math.cos(rot), z: 0 };

      dx = pRS.x - pLS.x;
      dy = pRS.y - pLS.y;
      dz = 0;

      scaleFactor = scale / state.initialScale;
    }

    // 1. Verlet Integration for free nodes
    const nodes = state.nodes;
    const gVal = 0.15; // Requirements: "gravity (g ≈ 0.15 px/frame^2)"
    const dVal = 1 - 0.08; // Requirements: "damping (c ≈ 0.08)" -> velocity multiplier = 0.92

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.pinned) {
        const vx = (node.x - node.px) * dVal;
        const vy = (node.y - node.py) * dVal;
        const vz = (node.z - node.pz) * dVal;

        node.px = node.x;
        node.py = node.y;
        node.pz = node.z;

        const ax = 0;
        const ay = gVal;
        const az = -kDepth * node.z;

        node.x += vx + ax;
        node.y += vy + ay;
        node.z += vz + az;
      }
    }

    // 2. Anchor Pinned Nodes (Row 0)
    for (let c = 0; c < cols; c++) {
      const t_c = c / (cols - 1);
      const node = nodes[0 * cols + c];

      if (useShoulderTracking) {
        const colFactor = -extensionFactor + (1 + 2 * extensionFactor) * t_c;
        node.x = pLS.x + dx * colFactor;
        node.y = pLS.y + dy * colFactor;
        node.z = pLS.z + dz * colFactor;
      } else {
        node.x = pLS.x + dx * t_c;
        node.y = pLS.y + dy * t_c;
        node.z = 0;
      }

      node.px = node.x;
      node.py = node.y;
      node.pz = node.z;
    }

    // 3. Satisfy Springs Constraints (K = 4 iterations)
    const springs = state.springs;

    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < springs.length; i++) {
        const spring = springs[i];
        const nodeA = nodes[spring.nodeA];
        const nodeB = nodes[spring.nodeB];

        const sdx = nodeB.x - nodeA.x;
        const sdy = nodeB.y - nodeA.y;
        const sdz = nodeB.z - nodeA.z;
        const dist = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz) || 0.001;

        const targetLength = spring.restLength * scaleFactor;
        const diff = (targetLength - dist) / dist;

        const offsetX = sdx * diff * 0.5;
        const offsetY = sdy * diff * 0.5;
        const offsetZ = sdz * diff * 0.5;

        if (!nodeA.pinned && !nodeB.pinned) {
          nodeA.x -= offsetX;
          nodeA.y -= offsetY;
          nodeA.z -= offsetZ;
          nodeB.x += offsetX;
          nodeB.y += offsetY;
          nodeB.z += offsetZ;
        } else if (nodeA.pinned && !nodeB.pinned) {
          nodeB.x += offsetX * 2;
          nodeB.y += offsetY * 2;
          nodeB.z += offsetZ * 2;
        } else if (!nodeA.pinned && nodeB.pinned) {
          nodeA.x -= offsetX * 2;
          nodeA.y -= offsetY * 2;
          nodeA.z -= offsetZ * 2;
        }
      }
    }

    // 4. R2: 3D Torso Ellipsoid Collision Detection & Projection
    const shoulderMid = { x: (pLS.x + pRS.x) / 2, y: (pLS.y + pRS.y) / 2, z: (pLS.z + pRS.z) / 2 };
    const hipMid = { x: (pLH.x + pRH.x) / 2, y: (pLH.y + pRH.y) / 2, z: (pLH.z + pRH.z) / 2 };

    const torsoCenterX = (shoulderMid.x + hipMid.x) / 2;
    const torsoCenterY = (shoulderMid.y + hipMid.y) / 2;
    const torsoCenterZ = (shoulderMid.z + hipMid.z) / 2;

    const shoulderDist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 100;
    const torsoLength = Math.sqrt(
      Math.pow(hipMid.x - shoulderMid.x, 2) +
      Math.pow(hipMid.y - shoulderMid.y, 2) +
      Math.pow(hipMid.z - shoulderMid.z, 2)
    ) || 150;

    const Rx = shoulderDist * 0.46; // Semi-axis X (chest width)
    const Ry = torsoLength * 0.55;  // Semi-axis Y (torso height)
    const Rz = shoulderDist * 0.28; // Semi-axis Z (torso depth)

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.pinned) {
        const normX = (node.x - torsoCenterX) / Rx;
        const normY = (node.y - torsoCenterY) / Ry;
        const normZ = (node.z - torsoCenterZ) / Rz;

        const val = normX * normX + normY * normY + normZ * normZ;
        if (val < 1.0 && val > 0.0001) {
          // Push node to front surface of the 3D torso ellipsoid
          const scale = 1.0 / Math.sqrt(val);
          node.x = torsoCenterX + (node.x - torsoCenterX) * scale;
          node.y = torsoCenterY + (node.y - torsoCenterY) * scale;
          node.z = torsoCenterZ + (node.z - torsoCenterZ) * scale;
        }
      }
    }
  };

  // Helper function to draw a single texture-mapped triangle with R3 Dynamic Normal Shading onto the 2D canvas
  const drawTriangle = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    p0: { x: number; y: number; z: number },
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number },
    t0: { u: number; v: number },
    t1: { u: number; v: number },
    t2: { u: number; v: number },
    normal: { x: number; y: number; z: number }
  ) => {
    const u0 = t0.u * img.width;
    const v0 = t0.v * img.height;
    const u1 = t1.u * img.width;
    const v1 = t1.v * img.height;
    const u2 = t2.u * img.width;
    const v2 = t2.v * img.height;

    const x0 = p0.x;
    const y0 = p0.y;
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;

    const du1 = u1 - u0;
    const dv1 = v1 - v0;
    const du2 = u2 - u0;
    const dv2 = v2 - v0;

    const dx1 = x1 - x0;
    const dy1 = y1 - y0;
    const dx2 = x2 - x0;
    const dy2 = y2 - y0;

    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 0.0001) return;

    const a = (dx1 * dv2 - dx2 * dv1) / det;
    const b = (dy1 * dv2 - dy2 * dv1) / det;
    const c = (dx2 * du1 - dx1 * du2) / det;
    const d = (dy2 * du1 - dy1 * du2) / det;
    const e = x0 - a * u0 - c * v0;
    const f = y0 - b * u0 - d * v0;

    const centroidX = (x0 + x1 + x2) / 3;
    const centroidY = (y0 + y1 + y2) / 3;

    const expand = (px: number, py: number) => {
      const dx = px - centroidX;
      const dy = py - centroidY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return { x: px, y: py };
      return {
        x: px + (dx / dist) * 0.5,
        y: py + (dy / dist) * 0.5
      };
    };

    const p0_e = expand(x0, y0);
    const p1_e = expand(x1, y1);
    const p2_e = expand(x2, y2);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0_e.x, p0_e.y);
    ctx.lineTo(p1_e.x, p1_e.y);
    ctx.lineTo(p2_e.x, p2_e.y);
    ctx.closePath();
    ctx.clip();

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // R3: Dynamic Normal Shading & Highlights
    // Compute dot product between surface normal and light direction
    const dot = normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z;

    if (Math.abs(dot) > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0_e.x, p0_e.y);
      ctx.lineTo(p1_e.x, p1_e.y);
      ctx.lineTo(p2_e.x, p2_e.y);
      ctx.closePath();

      if (dot < 0) {
        // Surface turning away from light -> Tilt-based Shadow
        const shadowOpacity = Math.min(0.35, Math.abs(dot) * 0.28);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity.toFixed(3)})`;
        ctx.fill();
      } else {
        // Surface facing light -> Dynamic Highlight
        const highlightOpacity = Math.min(0.20, dot * 0.16);
        ctx.fillStyle = `rgba(255, 255, 255, ${highlightOpacity.toFixed(3)})`;
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // High-performance Rendering & Simulation Loop
  const animate = () => {
    const ctx = contextRef.current;
    const img = garmentImageRef.current;
    const currentLandmarks = landmarksRef.current;
    const w = widthRef.current;
    const h = heightRef.current;
    const snapToShouldersVal = snapToShouldersRef.current;
    const currentTransform = transformRef.current;

    if (ctx && img) {
      ctx.clearRect(0, 0, w, h);

      // Verify necessary landmarks are present and visible
      const isTrackingMode = snapToShouldersVal;
      const hasLandmarks = !!(currentLandmarks && currentLandmarks.length > 0 &&
        currentLandmarks[11] && currentLandmarks[12] && currentLandmarks[23] && currentLandmarks[24] &&
        (currentLandmarks[11].visibility ?? 0) > 0.5 && (currentLandmarks[12].visibility ?? 0) > 0.5);

      const useShoulderTracking = isTrackingMode && hasLandmarks;

      // Detect if tracking status changed
      if (lastTrackingRef.current !== useShoulderTracking) {
        clothRef.current.initialized = false;
        lastTrackingRef.current = useShoulderTracking;
      }

      // Initialize cloth mesh if not yet initialized
      if (!clothRef.current.initialized) {
        const success = initializeCloth(useShoulderTracking, currentLandmarks, w, h);
        if (!success) {
          requestRef.current = requestAnimationFrame(animate);
          return;
        }
      }

      // 1. Update Physics & Torso Ellipsoid Collision
      updatePhysics(useShoulderTracking, currentLandmarks, w, h);

      // 2. Build Mesh Triangles, calculate 3D Normal Vectors, and compute avg Z for Painter's Algorithm sorting
      const state = clothRef.current;
      const nodes = state.nodes;
      const triangles: Triangle[] = [];

      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const nodeTL = nodes[r * cols + c];
          const nodeTR = nodes[r * cols + c + 1];
          const nodeBL = nodes[(r + 1) * cols + c];
          const nodeBR = nodes[(r + 1) * cols + c + 1];

          // Compute 3D Normal Vector for Triangle 1 (TL -> TR -> BL)
          const v1_x = nodeTR.x - nodeTL.x;
          const v1_y = nodeTR.y - nodeTL.y;
          const v1_z = nodeTR.z - nodeTL.z;
          const v2_x = nodeBL.x - nodeTL.x;
          const v2_y = nodeBL.y - nodeTL.y;
          const v2_z = nodeBL.z - nodeTL.z;

          let n1_x = v1_y * v2_z - v1_z * v2_y;
          let n1_y = v1_z * v2_x - v1_x * v2_z;
          let n1_z = v1_x * v2_y - v1_y * v2_x;
          const len1 = Math.sqrt(n1_x * n1_x + n1_y * n1_y + n1_z * n1_z) || 1;
          n1_x /= len1; n1_y /= len1; n1_z /= len1;

          triangles.push({
            p0: nodeTL, p1: nodeTR, p2: nodeBL,
            t0: { u: nodeTL.u, v: nodeTL.v },
            t1: { u: nodeTR.u, v: nodeTR.v },
            t2: { u: nodeBL.u, v: nodeBL.v },
            avgZ: (nodeTL.z + nodeTR.z + nodeBL.z) / 3,
            normal: { x: n1_x, y: n1_y, z: n1_z }
          });

          // Compute 3D Normal Vector for Triangle 2 (TR -> BR -> BL)
          const u1_x = nodeBR.x - nodeTR.x;
          const u1_y = nodeBR.y - nodeTR.y;
          const u1_z = nodeBR.z - nodeTR.z;
          const u2_x = nodeBL.x - nodeTR.x;
          const u2_y = nodeBL.y - nodeTR.y;
          const u2_z = nodeBL.z - nodeTR.z;

          let n2_x = u1_y * u2_z - u1_z * u2_y;
          let n2_y = u1_z * u2_x - u1_x * u2_z;
          let n2_z = u1_x * u2_y - u1_y * u2_x;
          const len2 = Math.sqrt(n2_x * n2_x + n2_y * n2_y + n2_z * n2_z) || 1;
          n2_x /= len2; n2_y /= len2; n2_z /= len2;

          triangles.push({
            p0: nodeTR, p1: nodeBR, p2: nodeBL,
            t0: { u: nodeTR.u, v: nodeTR.v },
            t1: { u: nodeBR.u, v: nodeBR.v },
            t2: { u: nodeBL.u, v: nodeBL.v },
            avgZ: (nodeTR.z + nodeBR.z + nodeBL.z) / 3,
            normal: { x: n2_x, y: n2_y, z: n2_z }
          });
        }
      }

      // Sort triangles in descending order of average Z-depth (furthest away is drawn first)
      triangles.sort((a, b) => b.avgZ - a.avgZ);

      // 3. Render Triangles with Dynamic Normal Shading
      for (const tri of triangles) {
        drawTriangle(ctx, img, tri.p0, tri.p1, tri.p2, tri.t0, tri.t1, tri.t2, tri.normal);
      }

      // 4. R4: Apply Z-Depth Arm Occlusion (Punch-out trick filtered by 3D relative depth)
      if (currentLandmarks && currentLandmarks.length > 0) {
        const leftElbow = currentLandmarks[13];
        const leftWrist = currentLandmarks[15];
        const rightElbow = currentLandmarks[14];
        const rightWrist = currentLandmarks[16];

        const ls = currentLandmarks[11];
        const rs = currentLandmarks[12];
        const lh = currentLandmarks[23];
        const rh = currentLandmarks[24];

        if (leftElbow && leftWrist && rightElbow && rightWrist && ls && rs) {
          // Calculate average Z of torso center
          const torsoCenterZ = ((ls.z ?? 0) + (rs.z ?? 0) + ((lh?.z) ?? 0) + ((rh?.z) ?? 0)) / 4;

          // Check arm Z relative to torso center (MediaPipe: smaller/negative Z is closer to camera)
          const leftArmZ = Math.min(leftElbow.z ?? 0, leftWrist.z ?? 0);
          const rightArmZ = Math.min(rightElbow.z ?? 0, rightWrist.z ?? 0);

          // Arm is in front of torso if arm Z is smaller than torso Z (with small depth threshold 0.05)
          const isLeftArmInFront = leftArmZ < torsoCenterZ + 0.05;
          const isRightArmInFront = rightArmZ < torsoCenterZ + 0.05;

          if (isLeftArmInFront || isRightArmInFront) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const pLS = { x: ls.x * w, y: ls.y * h };
            const pRS = { x: rs.x * w, y: rs.y * h };
            const shoulderWidth = Math.sqrt(Math.pow(pRS.x - pLS.x, 2) + Math.pow(pRS.y - pLS.y, 2)) || 100;

            const armLineWidth = shoulderWidth * 0.22;
            ctx.lineWidth = armLineWidth;

            // Draw Left Arm Path if closer to camera than torso
            if (isLeftArmInFront) {
              ctx.beginPath();
              ctx.moveTo(pLS.x, pLS.y);
              ctx.lineTo(leftElbow.x * w, leftElbow.y * h);
              ctx.lineTo(leftWrist.x * w, leftWrist.y * h);
              ctx.stroke();
            }

            // Draw Right Arm Path if closer to camera than torso
            if (isRightArmInFront) {
              ctx.beginPath();
              ctx.moveTo(pRS.x, pRS.y);
              ctx.lineTo(pRS.x, pRS.y);
              ctx.lineTo(rightElbow.x * w, rightElbow.y * h);
              ctx.lineTo(rightWrist.x * w, rightWrist.y * h);
              ctx.stroke();
            }

            ctx.restore();
          }
        }
      }

      // 5. Apply Occlusion Mask if available (External MediaPipe Mask)
      const currentMask = maskRef.current;
      if (currentMask) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        if (currentMask.canvas) {
          ctx.drawImage(currentMask.canvas, 0, 0, w, h);
        } else if (currentMask instanceof ImageBitmap || currentMask instanceof HTMLCanvasElement) {
          ctx.drawImage(currentMask, 0, 0, w, h);
        }
        ctx.restore();
      }
    } else if (ctx) {
      ctx.clearRect(0, 0, w, h);
      clothRef.current.initialized = false;
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [containerWidth, containerHeight]); // Re-start if dimensions change

  if (!selectedGarment) return null;

  return (
    <canvas
      ref={canvasRef}
      width={containerWidth}
      height={containerHeight}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ opacity: transform.opacity / 100 }}
    />
  );
});

