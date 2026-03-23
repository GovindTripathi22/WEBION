"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

export default function Cursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
  const followConfig = { damping: 35, stiffness: 200, mass: 0.8 };

  const springX = useSpring(cursorX, springConfig);
  const springY = useSpring(cursorY, springConfig);
  const followX = useSpring(dotX, followConfig);
  const followY = useSpring(dotY, followConfig);

  useEffect(() => {
    // Don't show on touch devices
    if ("ontouchstart" in window) {
      setIsMobile(true);
      return;
    }

    const moveCursor = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      dotX.set(e.clientX);
      dotY.set(e.clientY);
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      const interactive = target.closest(
        "button, a, [data-cursor-hover], input, select, textarea, [role='button']"
      );
      setIsHovering(!!interactive);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    // Hide native cursor globally
    document.body.style.cursor = "none";

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [cursorX, cursorY, dotX, dotY]);

  if (isMobile) return null;

  return (
    <>
      {/* Outer ring - follows with lag */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
        style={{
          x: followX,
          y: followY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isHovering ? 56 : isClicking ? 20 : 36,
          height: isHovering ? 56 : isClicking ? 20 : 36,
          borderColor: isHovering ? "#CA8A04" : "rgba(255,255,255,0.9)",
          borderWidth: isHovering ? 2 : 1.5,
        }}
        transition={{ type: "spring", damping: 20, stiffness: 250, mass: 0.5 }}
        style={{
          x: followX,
          y: followY,
          translateX: "-50%",
          translateY: "-50%",
          border: "1.5px solid rgba(255,255,255,0.9)",
          borderRadius: "50%",
          backdropFilter: "blur(2px)",
          backgroundColor: isHovering
            ? "rgba(202, 138, 4, 0.1)"
            : "transparent",
        }}
      />

      {/* Inner dot - snaps directly to cursor */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isClicking ? 8 : isHovering ? 4 : 6,
          height: isClicking ? 8 : isHovering ? 4 : 6,
          backgroundColor: isHovering ? "#CA8A04" : "white",
          opacity: isHovering ? 1 : 0.9,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 400 }}
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
          borderRadius: "50%",
          backgroundColor: "white",
        }}
      />
    </>
  );
}
