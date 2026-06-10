import React from 'react';
import { getStarBackground } from '../utils/starBackgrounds';

export default function StarTextBackground({ backgroundId, children, className = '', style = {} }) {
  const bg = getStarBackground(backgroundId);

  return (
    <div
      className={className}
      style={{
        background: bg.background,
        color: bg.color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
