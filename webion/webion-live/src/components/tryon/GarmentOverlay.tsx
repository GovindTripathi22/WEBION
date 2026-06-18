import { useRef, useEffect, useMemo, memo } from 'react';
import { useTryonStore } from '@/lib/tryon-store';
import { type PoseLandmark } from '@/lib/hooks/usePoseDetection';

interface GarmentOverlayProps {
  containerWidth: number;
  containerHeight: number;
  landmarks: PoseLandmark[] | null;
  segmentationMask?: any; // MediaPipe Mask
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
  } = useTryonStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const widthRef = useRef(containerWidth);
  const heightRef = useRef(containerHeight);
  const garmentImageRef = useRef<HTMLImageElement | null>(null);
  const landmarksRef = useRef<PoseLandmark[] | null>(null);
  const maskRef = useRef<any>(null);
  const requestRef = useRef<number>(undefined);

  // EMA Smoothing State
  const smoothedPoseRef = useRef<{
    shoulderMid: { x: number; y: number };
    shoulderWidth: number;
    shoulderAngle: number;
    torsoLength: number;
    hipAngle: number;
  } | null>(null);

  const ALPHA = 0.75; // Smoothing factor (0.6 - 0.8)

  // Real-Time Spring-Mass Physics state for lower torso (sway/elasticity)
  const physicsRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    initialized: boolean;
  }>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    initialized: false
  });

  const selectedGarment = useMemo(() => garments.find((g) => g.id === selectedGarmentId), [garments, selectedGarmentId]);

  // Sync props to refs to avoid re-rendering the loop
  useEffect(() => {
    landmarksRef.current = landmarks;
    maskRef.current = segmentationMask;
    widthRef.current = containerWidth;
    heightRef.current = containerHeight;
  }, [landmarks, segmentationMask, containerWidth, containerHeight]);

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
      return;
    }
    const img = new Image();
    img.src = selectedGarment.src;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      garmentImageRef.current = img;
    };
  }, [selectedGarment]);

  // High-performance Rendering Loop
  const animate = () => {
    const ctx = contextRef.current;
    const img = garmentImageRef.current;
    const currentLandmarks = landmarksRef.current;
    const w = widthRef.current;
    const h = heightRef.current;

    if (ctx && img && currentLandmarks && currentLandmarks.length > 0) {
      ctx.clearRect(0, 0, w, h);

      // 1. Get Key Landmarks
      const ls = currentLandmarks[11]; // Left Shoulder
      const rs = currentLandmarks[12]; // Right Shoulder
      const lh = currentLandmarks[23]; // Left Hip
      const rh = currentLandmarks[24]; // Right Hip

      if (ls && rs && lh && rh && (ls.visibility ?? 0) > 0.5 && (rs.visibility ?? 0) > 0.5) {
        // 2. Compute Midpoints and Vectors (RAW)
        const pLS = { x: ls.x * w, y: ls.y * h };
        const pRS = { x: rs.x * w, y: rs.y * h };
        const pLH = { x: lh.x * w, y: lh.y * h };
        const pRH = { x: rh.x * w, y: rh.y * h };

        const rawShoulderMid = { x: (pLS.x + pRS.x) / 2, y: (pLS.y + pRS.y) / 2 };
        const rawHipMid = { x: (pLH.x + pRH.x) / 2, y: (pLH.y + pRH.y) / 2 };

        const rawShoulderWidth = Math.sqrt(Math.pow(pRS.x - pLS.x, 2) + Math.pow(pRS.y - pLS.y, 2));
        const rawTorsoLength = Math.sqrt(Math.pow(rawHipMid.x - rawShoulderMid.x, 2) + Math.pow(rawHipMid.y - rawShoulderMid.y, 2));
        
        const rawShoulderAngle = Math.atan2(pRS.y - pLS.y, pRS.x - pLS.x);
        const rawHipAngle = Math.atan2(pRH.y - pLH.y, pRH.x - pLH.x);

        // 3. Apply EMA Smoothing
        if (!smoothedPoseRef.current) {
            // First frame initialization
            smoothedPoseRef.current = {
                shoulderMid: rawShoulderMid,
                shoulderWidth: rawShoulderWidth,
                shoulderAngle: rawShoulderAngle,
                torsoLength: rawTorsoLength,
                hipAngle: rawHipAngle
            };
        } else {
            const prev = smoothedPoseRef.current;
            
            // Smoothed = alpha * current + (1 - alpha) * previous
            smoothedPoseRef.current = {
                shoulderMid: {
                    x: ALPHA * rawShoulderMid.x + (1 - ALPHA) * prev.shoulderMid.x,
                    y: ALPHA * rawShoulderMid.y + (1 - ALPHA) * prev.shoulderMid.y
                },
                shoulderWidth: ALPHA * rawShoulderWidth + (1 - ALPHA) * prev.shoulderWidth,
                shoulderAngle: ALPHA * rawShoulderAngle + (1 - ALPHA) * prev.shoulderAngle,
                torsoLength: ALPHA * rawTorsoLength + (1 - ALPHA) * prev.torsoLength,
                hipAngle: ALPHA * rawHipAngle + (1 - ALPHA) * prev.hipAngle
            };
        }

        const { shoulderMid, shoulderWidth, shoulderAngle, torsoLength, hipAngle } = smoothedPoseRef.current;

        // 4. Render in Two Slices (Regional Warping)
        const splitFactor = 0.4;
        const upperHeight = img.height * splitFactor;
        const lowerHeight = img.height * (1 - splitFactor);

        // --- DRAW UPPER SLICE ---
        ctx.save();
        ctx.translate(shoulderMid.x, shoulderMid.y);
        ctx.rotate(shoulderAngle);
        
        const scaleX = (shoulderWidth / img.width) * 2.2;
        ctx.scale(scaleX, scaleX);
        
        const offsetY = img.height * 0.05;
        ctx.drawImage(
          img,
          0, 0, img.width, upperHeight, // Source
          -img.width / 2, -offsetY, img.width, upperHeight // Dest
        );
        ctx.restore();

        // --- DRAW LOWER SLICE (with spring-mass physics sway & elasticity) ---
        ctx.save();
        const splitOffsetY = (upperHeight - offsetY) * scaleX; 
        const splitPos = {
            x: shoulderMid.x - Math.sin(shoulderAngle) * splitOffsetY,
            y: shoulderMid.y + Math.cos(shoulderAngle) * splitOffsetY
        };
        
        // Physics Simulation Update
        const phys = physicsRef.current;
        if (!phys.initialized) {
            phys.x = splitPos.x;
            phys.y = splitPos.y;
            phys.vx = 0;
            phys.vy = 0;
            phys.initialized = true;
        }

        // Stiffness k, drag/damping c, gravity offset
        const k = 0.18;      // Spring coefficient (0.15 - 0.25)
        const c = 0.60;      // Damping coefficient (0.50 - 0.70)
        const gravity = 0.25; // Constant downward gravitational force on cloth
        const dt = 1.0;

        const ax = k * (splitPos.x - phys.x) - c * phys.vx;
        const ay = k * (splitPos.y - phys.y) - c * phys.vy + gravity;

        phys.vx += ax * dt;
        phys.vy += ay * dt;
        phys.x += phys.vx * dt;
        phys.y += phys.vy * dt;

        // Constraint check: limit the displacement so the garment stays on body
        const dx = phys.x - splitPos.x;
        const dy = phys.y - splitPos.y;
        const offsetDist = Math.sqrt(dx * dx + dy * dy);
        const maxDisplacement = shoulderWidth * 0.22; // max offset is 22% of shoulder width
        if (offsetDist > maxDisplacement) {
            const angleLimit = Math.atan2(dy, dx);
            phys.x = splitPos.x + Math.cos(angleLimit) * maxDisplacement;
            phys.y = splitPos.y + Math.sin(angleLimit) * maxDisplacement;
            phys.vx *= 0.4;
            phys.vy *= 0.4;
        }

        // Translate to the simulated physics position
        ctx.translate(phys.x, phys.y);
        
        // Calculate physics-driven dynamic rotation and vertical scale (stretching)
        const physicsTorsoAngle = Math.atan2(phys.y - shoulderMid.y, phys.x - shoulderMid.x) - Math.PI / 2;
        ctx.rotate(physicsTorsoAngle);

        const baseTorsoLength = shoulderWidth * 1.2; 
        const scaleY = (torsoLength / baseTorsoLength) * scaleX;
        
        ctx.scale(scaleX, scaleY);

        ctx.drawImage(
          img,
          0, upperHeight, img.width, lowerHeight, // Source
          -img.width / 2, 0, img.width, lowerHeight // Dest
        );
        ctx.restore();

        // --- APPLY ARM OCCLUSION (Punch-out trick) ---
        const leftElbow = currentLandmarks[13];
        const leftWrist = currentLandmarks[15];
        const rightElbow = currentLandmarks[14];
        const rightWrist = currentLandmarks[16];

        if (leftElbow && leftWrist && rightElbow && rightWrist) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Adjust line width based on proximity (shoulder width is a good proxy)
            const armLineWidth = shoulderWidth * 0.22;
            ctx.lineWidth = armLineWidth;

            // Draw Left Arm Path
            ctx.beginPath();
            ctx.moveTo(pLS.x, pLS.y);
            ctx.lineTo(leftElbow.x * w, leftElbow.y * h);
            ctx.lineTo(leftWrist.x * w, leftWrist.y * h);
            ctx.stroke();

            // Draw Right Arm Path
            ctx.beginPath();
            ctx.moveTo(pRS.x, pRS.y);
            ctx.lineTo(rightElbow.x * w, rightElbow.y * h);
            ctx.lineTo(rightWrist.x * w, rightWrist.y * h);
            ctx.stroke();

            ctx.restore();
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
      } else {
        // Reset physics if pose landmarks are low visibility
        physicsRef.current.initialized = false;
      }
    } else if (ctx) {
        ctx.clearRect(0, 0, w, h);
        physicsRef.current.initialized = false;
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
