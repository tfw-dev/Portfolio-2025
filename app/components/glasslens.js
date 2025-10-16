import React from "react";

/**
 * GlassCircle — single “liquid glass” circle using SVG filter pipeline.
 * Props:
 *   - size (number | string): width/height of the circle (default 320). Accepts px number or any CSS length.
 *   - className (string): optional extra classes.
 */
export default function GlassLens({ size = 320 }) {
  const sizeStyle =
    typeof size === "number" ? `${size}px` : (size || "320px");

  return (
    <>
      {/* One element = one glass circle */}
      <div
        aria-hidden="true"
        className="glass-circle absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
        style={{
          width: sizeStyle,
          aspectRatio: "1 / 1",
          borderRadius: "9999px",
          position: "relative",
          // Apply SVG filter stack to the backdrop
          backdropFilter: "url(#liquid-glass-new) url(#fresnel) drop-shadow(0 0 10px rgba(0,0,0,0.25))",
          WebkitBackdropFilter:
            "blur(0px) saturate(120%) contrast(0.95)", // fallback where url() is unsupported
          background: "rgba(255,255,255,0.001)", // define silhouette for SourceGraphic
        }}
      />

      {/* SVG FILTER DEFS (hidden but must be in the DOM once) */}
      <svg
        colorInterpolationFilters="sRGB"
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
      >
        {/* “New” liquid-glass filter (trimmed) */}
        <filter id="liquid-glass-new" x="-20%" y="-20%" width="140%" height="140%">
          {/* Unpack upper channel to create SourceBackground */}
          <feComponentTransfer result="SourceBackground" in="SourceGraphic">
            <feFuncR
              type="discrete"
              tableValues="0 .008 .016 .024 .031 .039 .047 .055 .063 .071 .079 .087 .094 .102 .110 .118 .126 .134 .142 .150 .157 .165 .173 .181 .189 .197 .205 .213 .220 .228 .236 .244 .252 .260 .268 .276 .283 .291 .299 .307 .315 .323 .331 .339 .346 .354 .362 .370 .378 .386 .394 .402 .409 .417 .425 .433 .441 .449 .457 .465 .472 .480 .488 .496 .504 .512 .520 .528 .535 .543 .551 .559 .567 .575 .583 .591 .598 .606 .614 .622 .630 .638 .646 .654 .661 .669 .677 .685 .693 .701 .709 .717 .724 .732 .740 .748 .756 .764 .772 .780 .787 .795 .803 .811 .819 .827 .835 .843 .850 .858 .866 .874 .882 .890 .898 .906 .913 .921 .929 .937 .945 .953 .961 .969 .976 .984 .992 1"
            />
            <feFuncG
              type="discrete"
              tableValues="0 .008 .016 .024 .031 .039 .047 .055 .063 .071 .079 .087 .094 .102 .110 .118 .126 .134 .142 .150 .157 .165 .173 .181 .189 .197 .205 .213 .220 .228 .236 .244 .252 .260 .268 .276 .283 .291 .299 .307 .315 .323 .331 .339 .346 .354 .362 .370 .378 .386 .394 .402 .409 .417 .425 .433 .441 .449 .457 .465 .472 .480 .488 .496 .504 .512 .520 .528 .535 .543 .551 .559 .567 .575 .583 .591 .598 .606 .614 .622 .630 .638 .646 .654 .661 .669 .677 .685 .693 .701 .709 .717 .724 .732 .740 .748 .756 .764 .772 .780 .787 .795 .803 .811 .819 .827 .835 .843 .850 .858 .866 .874 .882 .890 .898 .906 .913 .921 .929 .937 .945 .953 .961 .969 .976 .984 .992 1"
            />
            <feFuncB
              type="discrete"
              tableValues="0 .008 .016 .024 .031 .039 .047 .055 .063 .071 .079 .087 .094 .102 .110 .118 .126 .134 .142 .150 .157 .165 .173 .181 .189 .197 .205 .213 .220 .228 .236 .244 .252 .260 .268 .276 .283 .291 .299 .307 .315 .323 .331 .339 .346 .354 .362 .370 .378 .386 .394 .402 .409 .417 .425 .433 .441 .449 .457 .465 .472 .480 .488 .496 .504 .512 .520 .528 .535 .543 .551 .559 .567 .575 .583 .591 .598 .606 .614 .622 .630 .638 .646 .654 .661 .669 .677 .685 .693 .701 .709 .717 .724 .732 .740 .748 .756 .764 .772 .780 .787 .795 .803 .811 .819 .827 .835 .843 .850 .858 .866 .874 .882 .890 .898 .906 .913 .921 .929 .937 .945 .953 .961 .969 .976 .984 .992 1"
            />
          </feComponentTransfer>

          {/* Build a mask from the element shape */}
          <feColorMatrix type="luminanceToAlpha" />
          <feGaussianBlur stdDeviation="1" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 2 0" />
          <feComposite result="SourceMask" />

          {/* Multi-direction diffuse lights -> channelized faces */}
          {/* black (bottom) */}
          <feDiffuseLighting in="SourceMask" diffuseConstant="1" surfaceScale="100">
            <feDistantLight azimuth="225" elevation="180" />
          </feDiffuseLighting>
          <feColorMatrix type="luminanceToAlpha" />
          <feColorMatrix result="side-black" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 0" />

          {/* yellow (right/top) */}
          <feDiffuseLighting in="SourceMask" diffuseConstant=".52" surfaceScale="100">
            <feDistantLight azimuth="45" elevation="180" />
          </feDiffuseLighting>
          <feColorMatrix type="luminanceToAlpha" />
          <feColorMatrix result="side-yellow" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0  0 0 0 1 0" />

          {/* red (top/right) */}
          <feDiffuseLighting in="SourceMask" diffuseConstant="1" surfaceScale="100">
            <feDistantLight azimuth="315" elevation="180" />
          </feDiffuseLighting>
          <feColorMatrix type="luminanceToAlpha" />
          <feColorMatrix result="side-red" values="0 0 0 0 1  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />

          {/* green (left) */}
          <feDiffuseLighting result="diffuse-lighting-0" in="SourceMask" diffuseConstant="1" surfaceScale="100">
            <feDistantLight azimuth="135" elevation="180" />
          </feDiffuseLighting>
          <feColorMatrix result="color-matrix-0" in="diffuse-lighting-0" type="luminanceToAlpha" />
          <feColorMatrix result="side-green" in="color-matrix-0" values="0 0 0 0 0  0 0 0 0 1  0 0 0 0 0  0 0 0 1 0" />

          {/* combine sides to a normal-ish map */}
          <feBlend in="side-green" mode="screen" />
          <feBlend in="side-red" mode="screen" />
          <feBlend in="side-yellow" mode="screen" />
          <feBlend in="side-black" mode="multiply" />

          {/* refraction controls */}
          <feMorphology result="refraction-thickness" radius="5" operator="dilate" />
          {/* <feGaussianBlur result="refraction-smoothness" in="refraction-thickness" stdDeviation="5" /> */}
          {/* <feComposite result="balls-map" in2="SourceMask" operator="in" /> */}
          <feFlood result="normal-bg-color" floodColor="#808000" />
          {/* <feComposite result="NormalMapFull" in="balls-map" in2="normal-bg-color" operator="over" /> */}

          {/* displace background by the “normal map” */}
          <feDisplacementMap
            result="displacement"
            in="SourceBackground"
            in2="NormalMapFull"
            scale="100"
            xChannelSelector="R"
            yChannelSelector="G"
          />

          {/* optional soft blur + slight contrast */}
          <feGaussianBlur result="blur-out" stdDeviation="1" in="displacement" />
          <feColorMatrix in="blur-out" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
    
          <feComposite result="balls-final" in2="SourceMask" operator="in" />
        </filter>

        {/* Fresnel-ish outline */}
        <filter id="fresnel">
          <feMorphology in="SourceAlpha" result="stroke-width" radius="3" />
          <feGaussianBlur result="outline-smoothness" stdDeviation="2" />
          <feComposite
            result="bg-stroke-raw"
            in="SourceGraphic"
            operator="out"
            in2="outline-smoothness"
          />
          <feColorMatrix
            result="bg-stroke"
            values="2 0 0 0 .1  0 2 0 0 .1  0 0 2 0 .1  0 0 0 .69 0"
          />
          <feBlend result="outlined-balls" in="SourceGraphic" mode="overlay" />
        </filter>
      </svg>
    </>
  );
}
