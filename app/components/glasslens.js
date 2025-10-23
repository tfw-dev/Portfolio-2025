import React from "react";
import '../glass.css';

/**
 * GlassCircle — single “liquid glass” circle using SVG filter pipeline.
 * Props:
 *   - size (number | string): width/height of the circle (default 320). Accepts px number or any CSS length.
 *   - className (string): optional extra classes.
 */
export default function GlassLens({ size = 320, noiseDataUrl}) {
  const sizeStyle =
    typeof size === "number" ? `${size}px` : (size || "320px");

  return (
    <>
      <svg >
        <filter id="frosted" primitiveUnits="objectBoundingBox">
          {noiseDataUrl ? (
            <feImage href={noiseDataUrl} x="0" y="0" width="1" height="1" result="map" preserveAspectRatio="none" />
          ) : (
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="2"
              seed="3"
              stitchTiles="stitch"
              result="map"
            />
          )}

          <feGaussianBlur in="SourceGraphic" stdDeviation="0.004" result="blur" />

          <feDisplacementMap in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G">
            {/* <animate attributeName="scale" to="1.4" dur="0.3s" begin="btn.mouseover" fill="freeze" />
            <animate attributeName="scale" to="1" dur="0.3s" begin="btn.mouseout" fill="freeze" /> */}
          </feDisplacementMap>
        </filter>
      </svg>
          <button id="btn" className="glass absolute top-50% left-50%"></button>

      </>
  );
  
}
