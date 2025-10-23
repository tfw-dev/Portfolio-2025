"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export default function NewGlobs({ scaleProxy }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Helper to get current pixel dimensions of the host/container
    const size = () => ({ w: host.clientWidth || innerWidth, h: host.clientHeight || innerHeight });
    const { w, h } = size();

    // -----------------------------
    // Renderer (GPU drawing context)
    // -----------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // cap DPR for perf
    renderer.setSize(w, h);                                // canvas size in pixels
    renderer.setClearColor(0x000000, 0);                   // transparent background
    renderer.toneMapping = THREE.ACESFilmicToneMapping;    // filmic tonemapping
    renderer.toneMappingExposure = 2.5;                    // brightness/exposure
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0" }); // make canvas fill host
    host.appendChild(renderer.domElement); // attach to DOM

    // -----------------------------
    // Scene & Camera
    // -----------------------------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
    camera.position.z = 900; // pull camera back so objects are in view

    // -----------------------------
    // Lights (currently disabled)
    // -----------------------------
    // These were disabled in your code; leaving as-is.
    // scene.add(new THREE.HemisphereLight(0xffffff, 0xbbccff, 0.35));
    // const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(0, 0, -1); scene.add(rim);

    // -----------------------------
    // Material used by MarchingCubes meshes
    // -----------------------------
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      roughness: 0,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      ior: 1.5,
      flatShading: false,
      envMapIntensity: 6, // how strong the environment reflections appear
    });
    
    // -----------------------------
    // MarchingCubes fields (main + bursts)
    // -----------------------------
    // BASE_SCALE converts unit MC space [0..1] to world space
    const BASE_SCALE = new THREE.Vector3(500, 500, 500);

    // Main field for core blob + pointer-follow blob
    const globs = new MarchingCubes(120, material, true, true, 4000);
    // Separate field for temporary star-burst blobs
    const burstGlobs = new MarchingCubes(120, material, true, true, 4000);

    // Configure main field
    globs.scale.copy(BASE_SCALE);
    globs.position.z = 250;   // nudge forward along Z
    globs.isolation = 220;    // surface threshold / detail level
    globs.enableUvs = false;  // perf: we don’t need UVs
    globs.enableColors = false; // perf: we don’t use vertex colors
    scene.add(globs);

    // Configure burst field
    burstGlobs.scale.copy(BASE_SCALE);
    burstGlobs.isolation = 450;
    burstGlobs.position.z = 270;
    burstGlobs.enableUvs = false;  // perf: we don’t need UVs
    burstGlobs.enableColors = false; // perf: we don’t use vertex colors
    scene.add(burstGlobs);


    // ------------------------------------------------
    // Dynamic reflection probe (instant env reflections)
    // ------------------------------------------------
    const cubeTarget = new THREE.WebGLCubeRenderTarget(300, { type: THREE.HalfFloatType, generateMipmaps: false });
    const cubeCamera = new THREE.CubeCamera(10, 5000, cubeTarget);
    scene.add(cubeCamera);
    material.envMap = cubeTarget.texture; // use probe as envMap immediately

    // Capture current scene into the cube map for reflections
    const captureProbe = () => {
      // Hide MC meshes to prevent self-capture artifacts
      globs.visible = false;
      burstGlobs.visible = false;

      // Temporarily use environment as background so reflections aren’t black
      const prevBg = scene.background;
      scene.background = scene.environment || null;

      // Render scene from cubeCamera to update cubeTarget
      cubeCamera.update(renderer, scene);

      // Restore background and visibility
      scene.background = prevBg;
      globs.visible = true;
      burstGlobs.visible = true;
    };
    captureProbe(); // Initial capture so reflections exist on first frame

    // ------------------------------------------------
    // HDR IBL — prewarm + preload + seamless swap
    // ------------------------------------------------
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader(); // precompile to avoid first-use hitch

    (async () => {
      try {
        const hdrPath = "/hdr/AdobeStock_273357547_Preview.hdr";

        // Fetch HDR with cache warming (lets Next.js serve with long cache headers)
        const blob = await fetch(hdrPath, { cache: "force-cache" }).then((r) => r.blob());
        const objectUrl = URL.createObjectURL(blob);

        // Load HDR into a texture
        const hdr = await new HDRLoader().loadAsync(objectUrl);
        URL.revokeObjectURL(objectUrl);

        // Convert to PMREM-filtered env map for PBR materials
        const env = pmrem.fromEquirectangular(hdr).texture;

        // Cleanup temp resources
        hdr.dispose();
        pmrem.dispose();
        const rotation = new THREE.Euler(0, 9, 1.6, 'XYZ'); // Example: 90 degrees on the Y-axis


        // Apply as scene.environment then refresh reflection probe once
        scene.environment = env;
        scene.backgroundRotation.copy(rotation);
        captureProbe();
      } catch {
        // Even on failure, dispose PMREM to avoid leaks
        pmrem.dispose();
      }
    })();

    // -----------------------------
    // Star-burst state & spawner
    // -----------------------------
    // Array of active burst “balls” with their motion parameters
    const burstBalls = []; // each item: { dir, right, up, start, dur, strength, subtract, radius, spinHz, lateral, phase }
    let lastBurstAt = 0;   // timestamp of last burst (ms, performance.now())
    let wasClose = false;  // whether pointer was in the center “burst zone” during last event
    let isBursting = false; // simple lock to prevent overlapping bursts

    // Spawn a new burst with N balls
    function startBurst(count) {
      if (isBursting) return; // do not overlap bursts
      isBursting = true;

      // NOTE: This line sets pointerScale to 0 / baseScale (which is 0). Left intact per your code.
      // If you rely on pointerScale elsewhere, this may briefly force it to 0.
      // Keeping it exactly as you had it:
      pointerScale =  0 / baseScale 

      const now = performance.now();
      lastBurstAt = now;
      burstBalls.length = 0; // clear any existing burst balls

      for (let i = 0; i < count; i++) {
        const size = Math.random() * 0.02;
        const strength = 0.25 + size * 1.15;
        const subtract = 12 + Math.floor(size * 2);

        burstBalls.push({
        start: now,
        dur: 1000 + Math.random() * 900,        // life span (ms)
        strength,
        subtract,
        radius: 0.06 + Math.random() * 0.10,    // circle size in MC unit space
        spinHz: 0.25 + Math.random() * 0.35,    // how fast around
        phase: Math.random() * Math.PI * 2,     // where on the circle it starts
        // optional tiny layer to avoid perfect coplanar look
        zOffset: (Math.random() - 0.5) * 0.5
        });
    }
    }

    // -----------------------------
    // Pointer state / follower logic
    // -----------------------------
    let pointerScale = 1;          // external multiplier for main scale (can animate)
    const baseScale = 500;         // reference for absolute scaling
    const mouse = new THREE.Vector2(0.5, 0.5);   // current mouse in unit space
    const center = new THREE.Vector2(0.5, 0.5);  // center of MC unit space
    const maxR = 0.3;              // max distance follower can move from center

    // Convert screen coords to unit space and possibly trigger a burst
    const setMouse = (x, y) => {
        const r = host.getBoundingClientRect();

        // Simple “burst zone” near the screen center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const closeToCenter = Math.abs(x - centerX) <= 35 && Math.abs(y - centerY) <= 9999;

        // You had this line commented; leaving it as-is (no behavior change):
        // pointerScale = closeToCenter ? 300 / baseScale : 1;

        // Fire burst when entering the zone and the cooldown has elapsed
        if (closeToCenter && !wasClose && performance.now() - lastBurstAt > 500) {
            startBurst(4); // number of burst blobs
        }
        wasClose = closeToCenter;

        // Map client coords to [0..1] in X/Y relative to the host rect
        mouse.set(
            THREE.MathUtils.clamp((x - r.left) / r.width, 0, 1),
            THREE.MathUtils.clamp(1 - (y - r.top) / r.height, 0, 1)
        );
    };

    // Pointer + touch listeners (passive for perf)
    const onPointer = (e) => setMouse(e.clientX, e.clientY);
    const onTouch = (e) => e.touches?.length && setMouse(e.touches[0].clientX, e.touches[0].clientY);
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("touchmove", onTouch, { passive: true });

    // -----------------------------
    // Render loop (runs every frame)
    // -----------------------------
    let frames = 0;    // used to occasionally refresh reflections
    let scaleNow = 1;  // smoothed scale that eases toward pointerScale

    renderer.setAnimationLoop(() => {
       // External scale proxy (e.g., GSAP). Clamp to avoid zero scale.
       const proxy = Math.max(0.1, scaleProxy?.current?.value ?? 1);

       // Smoothly lerp scale toward pointerScale so changes aren’t jumpy
       scaleNow = THREE.MathUtils.lerp(scaleNow, pointerScale, 0.12);

       // Apply combined scale to main MarchingCubes (and bursts)
       globs.scale.copy(BASE_SCALE).multiplyScalar(proxy * scaleNow);

       // (Your original code did not scale burstGlobs here; leaving unchanged.)
       // If you want both to scale equally, you could mirror the line above for burstGlobs.

       // Compute follower position:
       // Move from center toward mouse but clamp distance to maxR
       const delta = mouse.clone().sub(center), d = Math.min(delta.length(), maxR);
       delta.setLength(d);
       const p = center.clone().add(delta), t = d / maxR; // t in [0..1] distance factor

       // Reset fields so we can rebuild blobs for this frame
       globs.reset();
       burstGlobs.reset();

       // -------------------------
       // Burst balls animation
       // -------------------------
       if (burstBalls.length) {
            const now = performance.now();

            for (let i = burstBalls.length - 1; i >= 0; i--) {
                const b = burstBalls[i];

                // life progress 0..1
                const u = THREE.MathUtils.clamp((now - b.start) / b.dur, 0, 1);

                // radius envelope: out and back (0→max→0)
                const r = b.radius * Math.sin(Math.PI * u);

                // angle around the shared XY circle
                const theta = b.phase + (Math.PI * 2) * b.spinHz * ((now - b.start) * 0.001);

                // ----- XY on one shared plane -----
                const x = 0.5 + Math.cos(theta) * r;
                const y = 0.5 + Math.sin(theta) * r;

                // ----- Z curve (depth motion) -----
                // simple “breathe” in/out; tweak 0.10 for more/less depth,
                // or swap to other functions for helical, lissajous, etc.
                const z =
                0.5                  // center plane of MC volume
                + 0.10 * Math.sin(theta) * Math.sin(Math.PI * u) // curved depth tied to angle + life
                + b.zOffset;         // tiny per-blob layer so they aren’t perfectly coplanar

                const pos = new THREE.Vector3(x, y, z);

                // match your small forward bias
                pos.z -= 0.06;

                // keep inside safe margins of MC unit cube
                const MARGIN = 0.12;
                pos.set(
                THREE.MathUtils.clamp(pos.x, MARGIN, 1 - MARGIN),
                THREE.MathUtils.clamp(pos.y, MARGIN, 1 - MARGIN),
                THREE.MathUtils.clamp(pos.z, MARGIN, 1 - MARGIN)
                );

                burstGlobs.addBall(pos.x, pos.y, pos.z, b.strength, b.subtract);

                if (u >= 1) {
                burstBalls.splice(i, 1);
                isBursting = false;
                pointerScale = 1; // keep your original reset behavior
                }
            }
            }


       // -------------------------
       // Core blobs (main + follower)
       // -------------------------
       // Main center blob
       globs.addBall(0.5, 0.5, 0.5, 1.2, 14);

       // Pointer follower blob (strength/subtract change as it moves away)
       globs.addBall(
         p.x, p.y, 0.5,
         THREE.MathUtils.lerp(0.55, 0.2, t), // strength diminishes with distance
         THREE.MathUtils.lerp(14, 24, t)     // subtract increases with distance
       );

       // Build meshes from the current fields
       globs.update();
       burstGlobs.update();

       // Occasionally refresh reflection probe (keeps reflections lively)
       if (++frames > 120) { captureProbe(); frames = 0; }

       // Draw the frame
       renderer.render(scene, camera);
    });

    // -----------------------------
    // Resize handling
    // -----------------------------
    const onResize = () => {
      const { w, h } = size();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      captureProbe(); // refresh reflections after layout change
    };

    // Prefer element-based observer; fallback to window resize
    const ro = "ResizeObserver" in window ? new ResizeObserver(onResize) : null;
    ro ? ro.observe(host) : addEventListener("resize", onResize);

    // -----------------------------
    // Cleanup on unmount
    // -----------------------------
    return () => {
      renderer.setAnimationLoop(null); // stop RAF loop
      removeEventListener("pointermove", onPointer);
      removeEventListener("touchmove", onTouch);
      ro ? ro.disconnect() : removeEventListener("resize", onResize);
      host.removeChild(renderer.domElement);
      renderer.dispose(); // free GPU resources
    };
  }, [scaleProxy]);

  // Host container: full-viewport, positioned for absolute canvas
  return <div ref={hostRef} style={{ width: "100vw", height: "100vh", position: "relative" }} />;
}
