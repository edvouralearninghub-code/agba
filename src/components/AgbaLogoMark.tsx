import React from 'react';

interface AgbaLogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Custom SVG Emblem for AGBA ("The Respected Elder & Custodian of Wisdom").
 * Combines:
 * - Royal Yoruba Indigo Adire Octagonal Medallion (#1B1F5E / #0E1030)
 * - Geometric Elder's Crown / Fila & Wisdom Staff (Ọ̀pá Àṣẹ) in Warm Gold (#D9A441)
 * - Three Guiding Stars at the crest for Learn · Build · Ship
 * - Terracotta (#C85A32) inner hearth diamond representing grounded counsel
 */
export const AgbaLogoMark: React.FC<AgbaLogoMarkProps> = ({ size = 30, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 select-none transition-transform duration-200 group-hover:scale-105 ${className}`}
    >
      <defs>
        <linearGradient id="agbaBadgeBg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1B1F5E" />
          <stop offset="100%" stopColor="#0E1030" />
        </linearGradient>
        <linearGradient id="agbaGoldGrad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F4C96B" />
          <stop offset="50%" stopColor="#D9A441" />
          <stop offset="100%" stopColor="#B88224" />
        </linearGradient>
      </defs>

      {/* Outer Regal Rounded Crest */}
      <rect
        x="2.5"
        y="2.5"
        width="43"
        height="43"
        rx="11"
        fill="url(#agbaBadgeBg)"
        stroke="url(#agbaGoldGrad)"
        strokeWidth="2"
      />

      {/* Subtle Inner Adire Geometric Frame */}
      <rect
        x="6.5"
        y="6.5"
        width="35"
        height="35"
        rx="7.5"
        stroke="#D9A441"
        strokeOpacity="0.28"
        strokeWidth="1"
      />

      {/* Three Guiding Stars of Wisdom (Learn · Build · Ship) */}
      <circle cx="24" cy="11.5" r="2" fill="#F4C96B" />
      <circle cx="15.5" cy="14" r="1.5" fill="#D9A441" />
      <circle cx="32.5" cy="14" r="1.5" fill="#D9A441" />

      {/* Geometric Elder's Fila / Crown Arch (Àgbà Crest) */}
      <path
        d="M12 24.5L16.5 17.5L24 21.5L31.5 17.5L36 24.5"
        stroke="url(#agbaGoldGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Agbada Shoulders & Woven Adire Chevron */}
      <path
        d="M10.5 35.5C12.8 29.8 17.8 26.5 24 26.5C30.2 26.5 35.2 29.8 37.5 35.5"
        stroke="url(#agbaGoldGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Terracotta Inner Diamond (The Heart of Counsel) */}
      <path
        d="M24 21.5L27.8 26.5L24 31.5L20.2 26.5L24 21.5Z"
        fill="#C85A32"
        stroke="#F4C96B"
        strokeWidth="1.4"
      />

      {/* Staff of Wisdom Vertical Axis (Ọ̀pá Àṣẹ) */}
      <path
        d="M24 14.5V21.5M24 31.5V38.5"
        stroke="#F4C96B"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

interface AgbaHeroBackdropProps {
  isDark: boolean;
}

/**
 * Calm, atmospheric background tapestry for the Hero section.
 * Renders the Àgbà (wise Yoruba elder) geometric medallion, gentle orbital rings,
 * and the three subtle constellation anchors (01 · LEARN, 02 · BUILD, 03 · SHIP)
 * seamlessly blended into the right half of the Hero backdrop.
 */
export const AgbaHeroBackdrop: React.FC<AgbaHeroBackdropProps> = ({ isDark }) => {
  const strokePrimary = isDark ? '#D9A441' : '#3B3FA8';
  const strokeAccent = isDark ? '#F5CC70' : '#C85A32';
  const textFill = isDark ? '#FAF6EC' : '#0F1226';
  const nodeBg = isDark ? '#141848' : '#F3EDE0';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <style>{`
        @keyframes agbaBgOrbitSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes agbaBgOrbitReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes agbaBgFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agba-bg-orbit,
          .agba-bg-orbit-rev,
          .agba-bg-float {
            animation: none !important;
          }
        }
      `}</style>

      {/* Positioned in the upper-right of the Hero, fading softly into the background */}
      <div
        className={`absolute top-0 -right-36 h-[500px] w-[660px] sm:top-2 sm:-right-24 md:top-3 md:-right-16 lg:-right-10 xl:-right-4 ${
          isDark ? 'opacity-40 lg:opacity-65' : 'opacity-25 lg:opacity-45'
        }`}
        style={{
          maskImage:
            'radial-gradient(circle at 62% 46%, rgba(0,0,0,1) 26%, rgba(0,0,0,0.6) 56%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage:
            'radial-gradient(circle at 62% 46%, rgba(0,0,0,1) 26%, rgba(0,0,0,0.6) 56%, rgba(0,0,0,0) 80%)',
        }}
      >
        <svg
          viewBox="0 0 680 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <defs>
            <radialGradient id="agbaHeroAmbientGlow" cx="56%" cy="48%" r="46%">
              <stop offset="0%" stopColor="#D9A441" stopOpacity={isDark ? '0.26' : '0.18'} />
              <stop offset="55%" stopColor="#3B3FA8" stopOpacity={isDark ? '0.14' : '0.08'} />
              <stop offset="100%" stopColor="#0E1030" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="agbaHeroGoldLine" x1="180" y1="60" x2="560" y2="440" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5CC70" />
              <stop offset="50%" stopColor="#D9A441" />
              <stop offset="100%" stopColor="#C85A32" />
            </linearGradient>
          </defs>

          {/* Soft Ambient Glow */}
          <circle cx="380" cy="250" r="230" fill="url(#agbaHeroAmbientGlow)" />

          {/* Subtle Lagos Lekki–Ikoyi Cable Bridge Horizon Line */}
          <g opacity="0.32">
            <path d="M120 430H640" stroke={strokePrimary} strokeWidth="1" strokeDasharray="4 6" />
            <path d="M230 430L244 352L258 430" stroke={strokePrimary} strokeWidth="1.5" />
            <path
              d="M244 358L175 430M244 370L195 430M244 382L215 430M244 358L318 430M244 370L298 430M244 382L278 430"
              stroke={strokePrimary}
              strokeWidth="0.75"
            />
          </g>

          {/* Outer Slow-Rotating Celestial Wisdom Ring */}
          <g
            className="agba-bg-orbit"
            style={{
              transformOrigin: '380px 250px',
              animation: 'agbaBgOrbitSlow 60s linear infinite',
            }}
          >
            <circle
              cx="380"
              cy="250"
              r="182"
              stroke={strokePrimary}
              strokeOpacity="0.32"
              strokeWidth="1.2"
              strokeDasharray="6 10"
            />
            <circle cx="380" cy="68" r="4" fill="#D9A441" />
            <circle cx="538" cy="341" r="4" fill="#C85A32" />
            <circle cx="222" cy="341" r="4" fill="#2E8B57" />
          </g>

          {/* Inner Counter-Rotating Adire Sacred Geometry Ring */}
          <g
            className="agba-bg-orbit-rev"
            style={{
              transformOrigin: '380px 250px',
              animation: 'agbaBgOrbitReverse 45s linear infinite',
            }}
          >
            <circle
              cx="380"
              cy="250"
              r="134"
              stroke={strokePrimary}
              strokeOpacity="0.38"
              strokeWidth="1"
            />
            <rect
              x="285"
              y="155"
              width="190"
              height="190"
              rx="22"
              stroke={strokePrimary}
              strokeOpacity="0.18"
              strokeWidth="1"
            />
            <rect
              x="285"
              y="155"
              width="190"
              height="190"
              rx="22"
              transform="rotate(45 380 250)"
              stroke={strokePrimary}
              strokeOpacity="0.18"
              strokeWidth="1"
            />
          </g>

          {/* Delicate Constellation Threads to Learn · Build · Ship */}
          <path
            d="M312 205C270 175 235 148 195 128"
            stroke={strokePrimary}
            strokeOpacity="0.45"
            strokeWidth="1.3"
            strokeDasharray="4 5"
          />
          <path
            d="M448 205C490 175 520 148 552 128"
            stroke={strokePrimary}
            strokeOpacity="0.45"
            strokeWidth="1.3"
            strokeDasharray="4 5"
          />
          <path
            d="M380 342V402"
            stroke={strokePrimary}
            strokeOpacity="0.45"
            strokeWidth="1.3"
            strokeDasharray="4 5"
          />

          {/* === CENTERPIECE: THE ÀGBÀ (WISE YORUBA ELDER) MEDALLION === */}
          <g
            className="agba-bg-float"
            style={{ animation: 'agbaBgFloat 6s ease-in-out infinite' }}
          >
            <circle
              cx="380"
              cy="250"
              r="86"
              fill={nodeBg}
              fillOpacity="0.82"
              stroke="url(#agbaHeroGoldLine)"
              strokeWidth="2"
            />

            {/* Regal Agbada Shoulders & Pakaja Embroidery */}
            <path
              d="M306 314C318 276 344 258 380 258C416 258 442 276 454 314"
              stroke={strokePrimary}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M352 262L380 298L408 262"
              stroke={strokeAccent}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M362 266L380 286L398 266"
              stroke="#C85A32"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M380 286V322" stroke={strokePrimary} strokeWidth="1.6" strokeLinecap="round" />

            {/* Sculpted Elder Head, Glasses of Counsel & Fila Cap */}
            <path
              d="M360 214C360 200 369 191 380 191C391 191 400 200 400 214C400 231 391 244 380 244C369 244 360 231 360 214Z"
              stroke={strokeAccent}
              strokeWidth="1.8"
            />
            {/* Silver-Gold Elder Beard */}
            <path
              d="M364 226C366 238 372 246 380 246C388 246 394 238 396 226C391 230 386 232 380 232C374 232 369 230 364 226Z"
              fill={strokePrimary}
              fillOpacity="0.35"
            />
            {/* Serene Glasses */}
            <circle cx="372" cy="214" r="4.8" stroke={strokeAccent} strokeWidth="1.4" />
            <circle cx="388" cy="214" r="4.8" stroke={strokeAccent} strokeWidth="1.4" />
            <path d="M376.8 214H383.2" stroke={strokeAccent} strokeWidth="1.4" />

            {/* Traditional Yoruba Fila Cap */}
            <path
              d="M356 204L363 179L390 172L405 192L403 204H356Z"
              fill="#C85A32"
              fillOpacity="0.75"
              stroke={strokeAccent}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M358 199H402" stroke={strokeAccent} strokeWidth="2" strokeDasharray="3 2" />

            {/* Three Guiding Stars Above the Elder */}
            <circle cx="380" cy="158" r="3" fill="#D9A441" />
            <circle cx="362" cy="163" r="2" fill="#D9A441" />
            <circle cx="398" cy="163" r="2" fill="#D9A441" />
          </g>

          {/* === MINIMAL AMBIENT CONSTELLATION LABELS (LEARN · BUILD · SHIP) === */}
          {/* 01 · LEARN */}
          <g opacity="0.88">
            <rect
              x="108"
              y="96"
              width="124"
              height="38"
              rx="19"
              fill={nodeBg}
              fillOpacity="0.85"
              stroke={strokePrimary}
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
            <circle cx="128" cy="115" r="5" fill="#D9A441" />
            <text
              x="142"
              y="119"
              fill={textFill}
              fontSize="11.5"
              fontFamily="monospace"
              fontWeight="600"
            >
              01 · LEARN
            </text>
          </g>

          {/* 02 · BUILD */}
          <g opacity="0.88">
            <rect
              x="516"
              y="96"
              width="124"
              height="38"
              rx="19"
              fill={nodeBg}
              fillOpacity="0.85"
              stroke={strokePrimary}
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
            <circle cx="536" cy="115" r="5" fill="#C85A32" />
            <text
              x="550"
              y="119"
              fill={textFill}
              fontSize="11.5"
              fontFamily="monospace"
              fontWeight="600"
            >
              02 · BUILD
            </text>
          </g>

          {/* 03 · SHIP */}
          <g opacity="0.88">
            <rect
              x="318"
              y="404"
              width="124"
              height="38"
              rx="19"
              fill={nodeBg}
              fillOpacity="0.85"
              stroke={strokePrimary}
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
            <circle cx="338" cy="423" r="5" fill="#2E8B57" />
            <text
              x="352"
              y="427"
              fill={textFill}
              fontSize="11.5"
              fontFamily="monospace"
              fontWeight="600"
            >
              03 · SHIP
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
