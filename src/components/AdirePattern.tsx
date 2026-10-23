import React from 'react';

interface AdirePatternProps {
  className?: string;
  opacity?: number;
}

/**
 * Custom-crafted geometric SVG pattern inspired by traditional West African Adire (indigo-dyed cloth).
 * Used strictly at 4–6% opacity on the Hero and Footer backgrounds only (Section 1).
 */
export const AdirePattern: React.FC<AdirePatternProps> = ({ className = '', opacity = 0.05 }) => {
  const patternId = React.useId();
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          <pattern
            id={patternId}
            width="96"
            height="96"
            patternUnits="userSpaceOnUse"
          >
            {/* Outer woven grid frame */}
            <path
              d="M 0 0 L 96 0 L 96 96 L 0 96 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            {/* Diagonal Adire resist-dye geometric motif */}
            <path
              d="M 0 48 L 48 0 L 96 48 L 48 96 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path
              d="M 24 48 L 48 24 L 72 48 L 48 72 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            {/* Concentric centre seed & corner comb lines */}
            <circle cx="48" cy="48" r="5" fill="none" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M 8 8 L 20 8 M 8 14 L 16 14 M 76 8 L 88 8 M 80 14 L 88 14 M 8 88 L 20 88 M 8 82 L 16 82 M 76 88 L 88 88 M 80 82 L 88 82"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
};
