"use client";

/**
 * InteractiveGlobs — Marching Cubes liquid split/merge
 * This version focuses on *explaining* each THREE.js call.
 */

import React, { useEffect, useRef } from "react";
// `THREE` is the core namespace with classes (Scene, Camera, Lights, etc.)
import * as THREE from "three";
// MarchingCubes builds an isosurface from “metaballs” via globs.addBall(...)
import { MarchingCubes as Globs } from "three/examples/jsm/objects/MarchingCubes.js";
// Loads .hdr (high-dynamic-range) textures for realistic image-based lighting
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export default function InteractiveGlobs({ scaleProxy }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ============================================================
    // 1) SIZING
    // ============================================================
    const container = containerRef.current;                       // DOM node we render into
    const width = container.clientWidth || window.innerWidth;     // canvas width in CSS pixels
    const height = container.clientHeight || window.innerHeight;  // canvas height in CSS pixels

    // ============================================================
    // 2) RENDERER
    // ============================================================
    // THREE.WebGLRenderer — the GPU-backed renderer that draws our scene to a <canvas>.
    //  - { antialias: true } smooths jagged edges (MSAA)
    //  - { alpha: true } allows transparent background
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    // setPixelRatio — matches device pixel ratio for sharpness (but cap it to keep perf sane)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // setSize — sets the canvas drawing buffer (and CSS size when using the DOM)
    renderer.setSize(width, height);

    // setClearColor — sets the background color *and* its alpha. Here we keep it fully transparent.
    renderer.setClearColor(0x000000, 0);

    // outputColorSpace — tells WebGL what color space to write to (sRGB for correct color on the web)
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // toneMapping — filmic tonemapper gives smoother highlight rolloff from HDR → LDR
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // toneMappingExposure — global exposure multiplier (simple brightness control)
    renderer.toneMappingExposure = 1.05;

    container.appendChild(renderer.domElement); // mount the canvas in the page
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100vw", height: "100vh" });

    // ============================================================
    // 3) SCENE + CAMERA
    // ============================================================
    // Scene — root graph node that holds everything we render
    const scene = new THREE.Scene();

    // PerspectiveCamera(fov, aspect, near, far)
    //  - fov: vertical field of view in degrees
    //  - aspect: width/height
    //  - near/far: depth clipping planes
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    // Camera is a regular Object3D, so you can position/rotate it like any mesh
    camera.position.set(0, 0, 1600);
    // lookAt(x, y, z) rotates the camera so it points at the given world position
    camera.lookAt(0, 0, 0);

    // ============================================================
    // 4) LIGHTS
    // ============================================================
    // HemisphereLight(skyColor, groundColor, intensity)
    // Gives a soft, ambient-like gradient from sky to ground
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbccff, 0.35));

    // DirectionalLight(color, intensity) — sun-like parallel light
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(0, 0, -1); // place it “behind” the object for a rim highlight
    scene.add(rim);

    // ============================================================
    // 5) MATERIAL (MeshPhysicalMaterial — PBR with clearcoat/IOR)
    // ============================================================
    // MeshPhysicalMaterial is a physically-based shader that supports clearcoat, IOR, etc.
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0f0f10,         // base albedo color
      roughness: 0.0,          // 0 = mirror-sharp reflections; 1 = very diffuse
      metalness: 0.08,         // metallic tint to reflections (0..1)
      envMapIntensity: 1.6,    // scales environment reflections (we’ll override with a probe)
      clearcoat: 1,            // extra glossy top layer (like car paint)
      clearcoatRoughness: 0,   // sharpness of that clearcoat
      ior: 0.75,               // index of refraction (visual effect; <1 is non-physical but stylized)
    });

    // ============================================================
    // 6) GEOMETRY VIA MARCHING CUBES
    // ============================================================
    // MarchingCubes(resolution, material, enableUvs, enableColors, maxPolygons)
    //  - resolution: grid size; higher = smoother surface, more GPU work
    //  - addBall(x, y, z, strength, subtract) “drops” a metaball into the scalar field
    //  - reset() clears the scalar field; update() builds/updates the mesh
    const resolution = 110;
    const globs = new Globs(resolution, material, true, true, 100000);

    const BASE_SCALE = 500;
    // Object3D.scale.set(x, y, z) — scales the marching-cubes volume in world units
    globs.scale.set(BASE_SCALE, BASE_SCALE, BASE_SCALE);

    // Object3D.position.set(x, y, z) — move the volume a bit back so reflections feel centered
    globs.position.set(0, 0, -250);

    // isolation — iso-threshold for the surface. Lower = gooier and more merged.
    globs.isolation = 50;

    scene.add(globs);

    // We’ll introduce a subtle rotation over time so reflections “parallax” slightly.
    // Object3D.rotation is in radians.
    const ROT_SPEED = { x: 0.05, y: 0.08 };

    // ============================================================
    // 7) HDR ENVIRONMENT (IMAGE-BASED LIGHTING)
    // ============================================================
    // PMREMGenerator — prefilters an HDR equirect texture into a cube map with mip levels
    // used by PBR materials for roughness-correct reflections.
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader(); // warms up the shader so first use is faster

    let hdrLoaded = false;
    // HDRLoader.load(url, onLoad, onProgress, onError) — async loads .hdr
    new HDRLoader().load(
      "/hdr/AdobeStock_273357547_Preview.hdr",
      (hdrTex) => {
        // fromEquirectangular(hdr) — converts the equirectangular HDR to a filtered cube env
        const envTex = pmrem.fromEquirectangular(hdrTex).texture;
        // scene.environment — global environment map read by standard/PBR materials
        scene.environment = envTex;
        hdrTex.dispose();      // free the original HDR texture
        pmrem.dispose();       // PMREM no longer needed after baking
        hdrLoaded = true;
      },
      undefined,
      () => { pmrem.dispose(); hdrLoaded = false; }
    );

    // ============================================================
    // 8) DYNAMIC REFLECTION PROBE
    // ============================================================
    // WebGLCubeRenderTarget(size, options) — GPU cube map you can render into
    const cubeRT = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType, // more precision for smoother highlights
      generateMipmaps: true,
    });

    // CubeCamera(near, far, renderTarget) — a camera that can render all 6 faces of a cube map
    const cubeCam = new THREE.CubeCamera(10, 5000, cubeRT);
    scene.add(cubeCam);

    // A couple of bright planes to act like studio softboxes for nice reflections
    // MeshBasicMaterial — unlit, pure color (ignores lights)
    const softboxMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // PlaneGeometry(width, height) — a simple rectangular plane
    const plane1 = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), softboxMaterial);
    // Object3D.position — set world position; Object3D.rotation — Euler angles in radians
    plane1.position.set(900, 700, 800);
    plane1.rotation.set(0, -0.3, 0);
    scene.add(plane1);

    const plane2 = plane1.clone();
    plane2.position.set(-900, -700, 800);
    plane2.rotation.set(0, 0.3, 0);
    scene.add(plane2);

    // Helper to “bake” the current scene (without the blobs) into the cube render target
    function updateProbe() {
      globs.visible = false;                        // hide the blobs to avoid self-reflections
      const prevBg = scene.background;
      // scene.background controls what’s rendered behind; use env so the cube has a sky
      scene.background = scene.environment || null;
      // cubeCam.update(renderer, scene) renders the 6 directions into the cube map
      cubeCam.update(renderer, scene);
      scene.background = prevBg;
      globs.visible = true;
    }

    // Initial probe capture + plug it into our material
    updateProbe();
    // PBR materials sample envMap for reflections; here we supply our dynamic cube map
    material.envMap = cubeRT.texture;
    material.envMapIntensity = 10; // strong “studio” reflections
    material.needsUpdate = true;   // tells the material to recompile if needed

    // ============================================================
    // 9) MOTION SYSTEM — “slow, fluid swarm”
    // ============================================================

    // Vector2 — a 2D float vector with helpers like set(), add(), sub(), length(), lerp(), etc.
    const CENTER = new THREE.Vector2(0.5, 0.5); // normalized field center (0..1)
    const NUM_BLOBS = 6;
    const BLOBS = [];

    const SPLIT_RING_R = 0.16;   // how far apart blobs sit during split
    const ROAM_RADIUS   = 0.26;  // how far they’re allowed to wander
    const LERP_RATE     = 0.55;  // exponential smoothing rate for XY (per sec)
    const LERP_Z        = 0.5;   // smoothing rate for Z (per sec)

    // Lissajous parameters for silky XY paths
    const LISS = { ax: 0.17, ay: 0.21, fx: 0.35, fy: 0.27, phaseOff: Math.PI * 0.33 };
    const NOISE_MAG = 0.02;      // tiny randomness so paths aren’t machine-perfect

    // Z parallax in marching-cubes space (0..1)
    const Z_CENTER = 0.5, Z_RANGE = 0.12, Z_SPEED = 0.28;

    // addBall strength/subtract pairs (bigger strength = fatter blob; larger subtract = tighter falloff)
    const CENTRAL_STRENGTH   = 1.15, CENTRAL_SUBTRACT   = 13.5;
    const BLOB_STRENGTH_BASE = 0.52, BLOB_SUBTRACT_BASE = 17.5;

    // Simple phase machine
    let phase = "single";
    let phaseT = 0;
    const DUR = { single: 1.8, split: 1.6, roam: 6.5, merge: 2.0 };

    // Initialize blobs at the center (collapsed state)
    for (let i = 0; i < NUM_BLOBS; i++) {
      const a = (i / NUM_BLOBS) * Math.PI * 2;
      const home = new THREE.Vector2(
        CENTER.x + Math.cos(a) * SPLIT_RING_R,
        CENTER.y + Math.sin(a) * SPLIT_RING_R
      );
      BLOBS.push({
        pos: CENTER.clone(),
        home,                          // where it sits right after split
        target: home.clone(),          // smoothed roam target
        z: Z_CENTER,                   // current Z position
        zTarget: Z_CENTER,             // smoothed Z target
        seed: Math.random() * 1000,    // per-blob random phase
      });
    }

    // Small easing helpers (used for fades/lerps)
    const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(Math.max(t, 0), 1));
    const easeOut   = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 2);

    // Clock — provides per-frame delta times; avoids relying on requestAnimationFrame timestamp directly
    const clock = new THREE.Clock();
    let timeSinceLastProbe = 0;
    let didHDRRecapture = false;

    // setAnimationLoop(cb) — like requestAnimationFrame, but works with VR/WebGPU/Offline too
    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();      // seconds since last frame
      const et = clock.elapsedTime;     // total seconds since start
      phaseT += dt;
      timeSinceLastProbe += dt;

      // Recapture the cube env once the HDR is ready, then occasionally
      if (hdrLoaded && !didHDRRecapture) { updateProbe(); didHDRRecapture = true; }
      if (timeSinceLastProbe > 1.2) { updateProbe(); timeSinceLastProbe = 0; }

      // Optional outside control: scaleProxy.current.value (e.g., GSAP)
      const proxyVal = scaleProxy?.current?.value ?? 1;
      // Object3D.scale.setScalar(s) — uniform scale on all axes
      globs.scale.setScalar(BASE_SCALE * Math.max(0.1, proxyVal));

      // Object3D.rotation.{x,y} — animate tiny rotation to make reflections feel alive
      globs.rotation.x = Math.sin(et * ROT_SPEED.x) * 0.06;
      globs.rotation.y = Math.sin(et * ROT_SPEED.y) * 0.1;

      // ---- Phase transitions
      if (phase === "single" && phaseT >= DUR.single) { phase = "split"; phaseT = 0; }
      else if (phase === "split" && phaseT >= DUR.split) { phase = "roam"; phaseT = 0; }
      else if (phase === "roam"  && phaseT >= DUR.roam)  { phase = "merge"; phaseT = 0; }
      else if (phase === "merge" && phaseT >= DUR.merge) { phase = "single"; phaseT = 0; BLOBS.forEach(b => { b.pos.copy(CENTER); b.z = Z_CENTER; }); }

      // ---- Update blob motion per phase
      const TWO_PI = Math.PI * 2;

      if (phase === "roam") {
        BLOBS.forEach((b, i) => {
          const p = (i / NUM_BLOBS) * TWO_PI + LISS.phaseOff;

          // Compute a smooth Lissajous target
          const tx = CENTER.x + Math.sin(et * LISS.fx + p) * LISS.ax * 0.9;
          const ty = CENTER.y + Math.cos(et * LISS.fy + p) * LISS.ay * 0.9;
          b.target.set(tx, ty);

          // Keep target inside a soft radius around the center
          const off = b.target.clone().sub(CENTER);
          if (off.length() > ROAM_RADIUS) off.setLength(ROAM_RADIUS);
          b.target.copy(CENTER).add(off);

          // Add a hint of desynced noise
          b.target.x += Math.sin((et + b.seed) * 0.6) * NOISE_MAG;
          b.target.y += Math.cos((et * 0.7 + b.seed)) * NOISE_MAG;

          // Vector2.lerp(target, alpha) — mixes current toward target by alpha
          // The (1 - exp(-k*dt)) trick makes lerp rate time-step independent.
          b.pos.lerp(b.target, 1 - Math.exp(-LERP_RATE * dt));

          // Z oscillates gently and is smoothed similarly
          const zt = Z_CENTER + Math.sin(et * Z_SPEED + p) * Z_RANGE;
          b.zTarget = THREE.MathUtils.clamp(zt, 0.08, 0.92); // MathUtils.clamp keeps value between min & max
          b.z = THREE.MathUtils.lerp(b.z, b.zTarget, 1 - Math.exp(-LERP_Z * dt));
        });
      } else if (phase === "split") {
        const t = easeInOut(phaseT / DUR.split);
        BLOBS.forEach((b) => {
          // Vector2.lerpVectors(a, b, t) — sets this vector to the mix of a→b
          b.pos.lerpVectors(CENTER, b.home, t);
          // MathUtils.lerp(a, b, t) — scalar linear interpolation
          b.z = THREE.MathUtils.lerp(Z_CENTER, Z_CENTER + 0.1, t * 0.6);
        });
      } else if (phase === "merge") {
        BLOBS.forEach((b) => {
          b.pos.lerp(CENTER, 1 - Math.exp(-0.9 * dt));           // smooth pull back
          b.z = THREE.MathUtils.lerp(b.z, Z_CENTER, 1 - Math.exp(-0.9 * dt));
        });
      } else {
        BLOBS.forEach((b) => { b.pos.copy(CENTER); b.z = Z_CENTER; }); // Vector2.copy — copy values from another vector
      }

      // ---- Build the scalar field for Marching Cubes
      globs.reset(); // clear previous frame’s field

      // Central ball fades depending on phase
      let centralAlpha = 1;
      if (phase === "split") centralAlpha = 1 - easeInOut(phaseT / DUR.split);
      else if (phase === "roam") centralAlpha = 0;
      else if (phase === "merge") centralAlpha = easeOut(phaseT / DUR.merge);

      const centralStrength = CENTRAL_STRENGTH * centralAlpha;
      if (centralStrength > 0.001) {
        // addBall(x, y, z, strength, subtract) — add a metaball to the field
        // Coordinates are normalized 0..1 inside the marching-cubes volume.
        globs.addBall(0.5, 0.5, 0.5, centralStrength, CENTRAL_SUBTRACT);
      }

      // Child blobs (also fade across phases)
      let blobAlpha = 0;
      if (phase === "split") blobAlpha = easeInOut(phaseT / DUR.split);
      else if (phase === "roam") blobAlpha = 1;
      else if (phase === "merge") blobAlpha = 1 - easeOut(phaseT / DUR.merge);

      const breath = 1 + Math.sin(clock.elapsedTime * 1.3) * 0.05; // small pulsation
      const blobStrength = BLOB_STRENGTH_BASE * blobAlpha * breath;
      const blobSubtract = BLOB_SUBTRACT_BASE;

      if (blobStrength > 0.001) {
        for (const b of BLOBS) {
          globs.addBall(b.pos.x, b.pos.y, b.z, blobStrength, blobSubtract);
        }
      }

      // update() — rebuilds the mesh from the scalar field and uploads to GPU
      globs.update();

      // render(scene, camera) — does the actual draw call
      renderer.render(scene, camera);
    });

    // ============================================================
    // 10) RESPONSIVE HANDLING
    // ============================================================
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      // Update camera aspect and projection when the viewport changes
      camera.aspect = w / h;
      camera.updateProjectionMatrix(); // recalculates the internal projection matrix

      renderer.setSize(w, h);          // resize the canvas/backbuffer
      updateProbe();                   // recapture reflections (FOV changed subtly)
    };

    // ResizeObserver — DOM API; not from THREE (but used with it frequently)
    const ro = "ResizeObserver" in window ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(container);
    else window.addEventListener("resize", onResize);

    // ============================================================
    // 11) CLEANUP
    // ============================================================
    return () => {
      // setAnimationLoop(null) — stops the RAF loop
      renderer.setAnimationLoop(null);

      if (ro) ro.disconnect();
      else window.removeEventListener("resize", onResize);

      container.removeChild(renderer.domElement);

      // renderer.dispose() — frees internal WebGL resources
      renderer.dispose();

      // Dispose geometries/materials/textures to avoid GPU leaks
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            m.map?.dispose?.();
            m.envMap?.dispose?.();
            m.dispose?.();
          });
        }
      });
    };
  }, [scaleProxy]); // re-run only if the *ref object* changes (not its .current.value)

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        touchAction: "none",
        background: "transparent",
        zIndex: 0,
      }}
    />
  );
}
