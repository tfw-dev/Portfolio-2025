export default function GlassFilter({ noiseDataUrl }) {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute", visibility: "hidden" }}
      aria-hidden="true"
    >
      <defs>
        <filter id="frosted" primitiveUnits="objectBoundingBox">
          {noiseDataUrl ? (
            <feImage
              href={noiseDataUrl}
              x="0"
              y="0"
              width="1"
              height="1"
              preserveAspectRatio="none"
              result="map"
            />
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
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur" />
          <feDisplacementMap
            in="blur"
            in2="map"
            scale="1"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
