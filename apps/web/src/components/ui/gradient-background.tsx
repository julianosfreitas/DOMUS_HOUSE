'use client';

import * as React from 'react';

/**
 * Fundo "aurora" — blobs de gradiente com blur, animados suavemente. Reaproveitado
 * da tela de login (sign-up.tsx) para as páginas do app. As cores vêm de CSS vars
 * temáticas (--color-primary, --color-chart-*, etc.), então adapta a claro/escuro.
 */
export function GradientBackground() {
  return (
    <>
      <style>{`@keyframes float1{0%{transform:translate(0,0)}50%{transform:translate(-10px,10px)}100%{transform:translate(0,0)}}@keyframes float2{0%{transform:translate(0,0)}50%{transform:translate(10px,-10px)}100%{transform:translate(0,0)}}`}</style>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="absolute top-0 left-0 h-full w-full"
      >
        <defs>
          {/* Cores harmonizadas com a logo: --bg-green (folhagem), --bg-gold
              (bico), --bg-blue (ponta do bico do tucano). */}
          <linearGradient id="cx_grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--bg-green)', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: 'var(--bg-blue)', stopOpacity: 0.5 }} />
          </linearGradient>
          <linearGradient id="cx_grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--bg-gold)', stopOpacity: 0.55 }} />
            <stop offset="100%" style={{ stopColor: 'var(--bg-green)', stopOpacity: 0.45 }} />
          </linearGradient>
          <radialGradient id="cx_grad3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--bg-blue)', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: 'var(--bg-gold)', stopOpacity: 0.35 }} />
          </radialGradient>
          <filter id="cx_blur1" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="35" />
          </filter>
          <filter id="cx_blur2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="25" />
          </filter>
          <filter id="cx_blur3" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="45" />
          </filter>
        </defs>
        <g style={{ animation: 'float1 20s ease-in-out infinite' }}>
          <ellipse cx="200" cy="500" rx="250" ry="180" fill="url(#cx_grad1)" filter="url(#cx_blur1)" transform="rotate(-30 200 500)" />
          <rect x="500" y="100" width="300" height="250" rx="80" fill="url(#cx_grad2)" filter="url(#cx_blur2)" transform="rotate(15 650 225)" />
        </g>
        <g style={{ animation: 'float2 25s ease-in-out infinite' }}>
          <circle cx="650" cy="450" r="150" fill="url(#cx_grad3)" filter="url(#cx_blur3)" opacity="0.7" />
          <ellipse cx="50" cy="150" rx="180" ry="120" fill="var(--bg-green)" filter="url(#cx_blur2)" opacity="0.45" />
        </g>
      </svg>
    </>
  );
}
