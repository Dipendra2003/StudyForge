import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function DynamicBackground() {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Throttle to animation frame rate (~60fps) to prevent excessive React re-renders
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
        rafRef.current = null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const gradientStyles = {
    background: `
      radial-gradient(
        circle at ${mousePosition.x}px ${mousePosition.y}px,
        rgba(139, 92, 246, 0.15) 0%,
        rgba(59, 130, 246, 0.1) 25%,
        rgba(16, 185, 129, 0.05) 50%,
        rgba(0, 0, 0, 0) 70%
      )
    `,
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none"
        animate={{
          background: [
            'radial-gradient(circle at 25% 25%, rgba(79, 70, 229, 0.15) 0%, rgba(0, 0, 0, 0) 50%)',
            'radial-gradient(circle at 75% 25%, rgba(236, 72, 153, 0.15) 0%, rgba(0, 0, 0, 0) 50%)',
            'radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.15) 0%, rgba(0, 0, 0, 0) 50%)',
            'radial-gradient(circle at 25% 75%, rgba(139, 92, 246, 0.15) 0%, rgba(0, 0, 0, 0) 50%)',
            'radial-gradient(circle at 25% 25%, rgba(79, 70, 229, 0.15) 0%, rgba(0, 0, 0, 0) 50%)',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={gradientStyles}
      />
      <div className="fixed inset-0 z-[-2] bg-gradient-to-br from-background to-background/90 pointer-events-none" />
    </>
  );
}