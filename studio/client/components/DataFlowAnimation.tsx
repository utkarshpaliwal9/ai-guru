import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Settings, Zap, Network, Database, Globe } from 'lucide-react';
import Logo from './Logo';

const icons = [
  { component: Bot, angle: 0 },
  { component: Database, angle: 60 },
  { component: Settings, angle: 120 },
  { component: Zap, angle: 180 },
  { component: Globe, angle: 240 },
  { component: Network, angle: 300 },
];

const DataFlowAnimation = () => {
  const radius = 130;
  const size = 320;
  const center = size / 2;
  const centralLogoRadius = 48; // Based on w-24 class (6rem = 96px)
  const peripheralIconRadius = 24; // Based on p-3 + w-6 classes (padding + icon size)

  const getCoords = (angle: number) => {
    const angleRad = (angle - 90) * (Math.PI / 180);
    // Calculate the center of the peripheral icon
    const iconX = center + radius * Math.cos(angleRad);
    const iconY = center + radius * Math.sin(angleRad);
    
    // Calculate the vector from the canvas center to the icon center
    const vx = iconX - center;
    const vy = iconY - center;
    
    // Normalize the vector to get a unit direction
    const mag = Math.sqrt(vx*vx + vy*vy);
    const ux = vx / mag;
    const uy = vy / mag;

    // Calculate the line's start point on the edge of the central logo
    const lineStartX = center + ux * centralLogoRadius;
    const lineStartY = center + uy * centralLogoRadius;
    
    // Calculate the line's end point on the edge of the peripheral icon
    const lineEndX = iconX - ux * peripheralIconRadius;
    const lineEndY = iconY - uy * peripheralIconRadius;

    return {
      iconX,
      iconY,
      lineStartX,
      lineStartY,
      lineEndX,
      lineEndY,
    };
  };

  return (
    <div className={`relative w-[380px] h-[380px] mx-auto flex items-center justify-center`}>
      {/* Central Logo with futuristic effects */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.7 }}
      >
        {/* Opaque encircling circle */}
        <motion.div
          className="absolute inset-0 -m-3 bg-white/80 rounded-full"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
        />
        
        {/* Pulsating futuristic rings */}
        <motion.div
          className="absolute inset-0 border-2 border-purple-300 rounded-full"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1
          }}
        />
        <motion.div
          className="absolute inset-0 border-2 border-blue-300 rounded-full"
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2
          }}
        />

        <Logo size="lg" className="w-24 h-24 relative" />
      </motion.div>
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-200 rounded-full opacity-30 blur-2xl -z-10"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-64 h-64 bg-blue-200 rounded-full opacity-30 blur-2xl -z-10"></div>

      {/* SVG for lines and dots */}
      <svg className="absolute top-0 left-0 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {icons.map((icon, i) => {
            const { lineStartX, lineStartY, lineEndX, lineEndY } = getCoords(icon.angle);
            return (
              <React.Fragment key={`defs-${i}`}>
                <path
                  id={`path-to-center-${i}`}
                  d={`M${lineEndX},${lineEndY} L${lineStartX},${lineStartY}`}
                />
                <path
                  id={`path-from-center-${i}`}
                  d={`M${lineStartX},${lineStartY} L${lineEndX},${lineEndY}`}
                />
              </React.Fragment>
            );
          })}
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#ddd6fe" />
          </linearGradient>
        </defs>

        {/* Lines */}
        {icons.map((_, i) => (
          <use key={`line-${i}`} href={`#path-to-center-${i}`} stroke="url(#line-gradient)" strokeWidth="1" />
        ))}

        {/* Animated Dots */}
        {icons.map((_, i) => (
          <g key={`dot-group-${i}`}>
            {/* Dot to center */}
            <circle r="3.5" fill="#3b82f6">
              <animateMotion dur="4s" repeatCount="indefinite" begin={`${i * 0.6}s`}>
                <mpath href={`#path-to-center-${i}`} />
              </animateMotion>
            </circle>
            {/* Dot from center */}
            <circle r="3.5" fill="#8b5cf6">
              <animateMotion dur="4s" repeatCount="indefinite" begin={`${i * 0.6 + 2}s`}>
                <mpath href={`#path-from-center-${i}`} />
              </animateMotion>
            </circle>
          </g>
        ))}
      </svg>

      {/* Peripheral Icons */}
      {icons.map(({ component: Icon, angle }, i) => {
        const { iconX, iconY } = getCoords(angle);
        return (
          <motion.div
            key={i}
            className="absolute p-3 bg-white/70 backdrop-blur-sm rounded-full shadow-lg border"
            style={{
              left: `${iconX}px`,
              top: `${iconY}px`,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.8 + i * 0.1 }}
          >
            <Icon className="w-6 h-6 text-purple-700" />
          </motion.div>
        );
      })}
    </div>
  );
};

export default DataFlowAnimation; 