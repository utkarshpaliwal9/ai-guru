import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <svg 
      className={`${sizeClasses[size]} ${className}`} 
      width="32" 
      height="32" 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M16 3C17.1046 3 18 3.89543 18 5C18 5.93162 17.3622 6.71129 16.5 6.93359V14H15.5V6.93359C14.6378 6.71129 14 5.93162 14 5C14 3.89543 14.8954 3 16 3Z" 
        fill="url(#paint0_linear_avalara)"
      />
      <path 
        d="M27 14C28.1046 14 29 14.8954 29 16C29 17.1046 28.1046 18 27 18C26.0683 18 25.2877 17.3623 25.0654 16.5H18V15.5H25.0654C25.2877 14.6377 26.0683 14 27 14Z" 
        fill="url(#paint1_linear_avalara)"
      />
      <path 
        d="M5 14C5.93171 14 6.71235 14.6377 6.93457 15.5H14V16.5H6.93457C6.71235 17.3623 5.93171 18 5 18C3.89543 18 3 17.1046 3 16C3 14.8954 3.89543 14 5 14Z" 
        fill="url(#paint2_linear_avalara)"
      />
      <path 
        d="M16.5 25.0654C17.3623 25.2877 18 26.0683 18 27C18 28.1046 17.1046 29 16 29C14.8954 29 14 28.1046 14 27C14 26.0683 14.6377 25.2877 15.5 25.0654V18H16.5V25.0654Z" 
        fill="url(#paint3_linear_avalara)"
      />
      <path 
        d="M7.51469 7.51473C7.90522 7.1242 8.53823 7.1242 8.92876 7.51473C9.19028 7.77626 9.27533 8.14615 9.18657 8.47957L12.0401 11.3331C12.0791 11.3721 12.0791 11.4356 12.0401 11.4747L11.4747 12.0401C11.4356 12.0792 11.3721 12.0791 11.3331 12.0401L8.47954 9.1866C8.14612 9.27536 7.77622 9.19031 7.51469 8.92879C7.12417 8.53826 7.12417 7.90525 7.51469 7.51473Z" 
        fill="url(#paint4_linear_avalara)"
      />
      <path 
        d="M20.5254 19.96C20.5644 19.9209 20.6279 19.9209 20.667 19.96L23.5195 22.8125C23.8531 22.7235 24.2237 22.8096 24.4853 23.0713C24.8757 23.4618 24.8758 24.0949 24.4853 24.4853C24.0949 24.8758 23.4618 24.8757 23.0713 24.4853C22.8096 24.2237 22.7235 23.8531 22.8125 23.5195L19.96 20.667C19.9209 20.6279 19.9209 20.5644 19.96 20.5254L20.5254 19.96Z" 
        fill="url(#paint5_linear_avalara)"
      />
      <circle cx="16" cy="16" r="3" fill="url(#paint6_linear_center)" />
      <defs>
        <linearGradient id="paint0_linear_avalara" x1="16" y1="3" x2="16" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="paint1_linear_avalara" x1="29" y1="16" x2="19" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="paint2_linear_avalara" x1="3" y1="16" x2="13" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="paint3_linear_avalara" x1="16" y1="29" x2="16" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="paint4_linear_avalara" x1="7.49763" y1="7.49766" x2="11.9599" y2="11.9599" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="paint5_linear_avalara" x1="24.5024" y1="24.5024" x2="20.041" y2="20.041" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="paint6_linear_center" x1="13" y1="13" x2="19" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo; 