"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export default function Canvas({
  scaleProxy,
  motionProxy,
  cameraProxy,
  threeRef
}) {
  // Create internal ref if none provided
  const internalRef = useRef(null);
  const containerRef = threeRef || internalRef;

  useEffect(() => {
    const hostEl = containerRef?.current;
    if (!hostEl) return;

    // Provide safe defaults if props aren't passed
    const safeScaleProxy = scaleProxy || { current: { size: 1, center: { x: 0, y: 0, z: 0 } } };
    const safeMotionProxy = motionProxy || { current: { stage: "loop" } };
    const safeCameraProxy = cameraProxy || { current: { position: { x: 0, y: 0, z: 500 }, target: { x: 0, y: 0, z: 0 } } };

    // Detect mobile device and adjust scale
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const mobileScaleFactor = 0.6; // 60% size on mobile

    const renderConfig = {
      fovDeg: 50, near: 1, far: 10000,
      cameraPos: new THREE.Vector3(0, 0, 500),
      exposure: 1.05, bgHex: 0x000000,
      baseScale: 1400 * (isMobile ? mobileScaleFactor : 1),
      iso: 30,
      grid: 125,  // Balance between smooth edges and no clipping
      envProbeSize: 150,
      hdrUrl: "/hdr/qwantani_dusk_2_4k.hdr",
    };

    const materialConfig = {
      color: 0x0f0f10, roughness: 0, metalness: 0,
      envMapIntensity: 10, clearcoat: 1, clearcoatRoughness: 0, ior: 0.8,
    };
    
    const motionConfig = {
      blobCount: 3,
      center01: new THREE.Vector2(0.5, 0.55),  // Shifted center up slightly
      ringRadius01: 0.12, roamRadius01: 0.18,  // Reduced from 0.16/0.26 to keep blobs within grid
      lerpXYRate: 0.55, lerpZRate: 0.5,
      lissajous: { ampX: 0.20, ampY: 0.12, freqX: 0.35, freqY: 0.27, phase: Math.PI * 0.33 },  // Increased X, reduced Y
      yBias: 0.06,  // Upward bias to prevent downward clash
      yMin: 0.35,   // Minimum Y position (prevents going too low)
      noise: 0.03, zCenter01: 0.5, zRange01: 0.04, zSpeed: 0.28,  // Small Z range with tight clamping
      phaseSeconds: { phase1: 8.0, phase2: 8.0, phase3: 8.0 },
      centralBall: { strength: 0.2, subtract: 40 }, // Higher subtract = tighter blob
      childBall:   { strength: 0.26, subtract: 30 }, // Higher subtract for tighter children
      gentleRotX: 0.05, gentleRotY: 0.08,
      probeEverySeconds: 1.2,
    };

    const mouseConfig = {
      maxRadius01: 0.34,
      strength: 0.10,   // we'll scale this so the cursor blob itself is smaller
      subtract: 35,  // Higher subtract for tighter cursor blob
      lerpXYRate: 5.0,
      lerpZRate: 2.0,
      zBase01: 0.5,
      zRange01: 0.02,  // Small cursor Z movement
      zSpeed: 0.9,
    };

    // ---- CHILD SIZE ONLY (does NOT affect center) ----
    // 1 = current size, 0.6 = smaller children, 0.3 = tiny
    const CHILD_SIZE = 0.3;

    // shrink child blobs (and cursor blob) by reducing their "strength"
    motionConfig.childBall.strength *= CHILD_SIZE;
    mouseConfig.strength            *= CHILD_SIZE;

    // optional: slightly increase subtract to keep small blobs crisp as they shrink
    // (higher subtract => smaller/tighter contribution)
    const subtractBoost = 1 + (1 - CHILD_SIZE) * 0.3; // gentle boost
    motionConfig.childBall.subtract *= subtractBoost;
    // If you also want the cursor blob crisper as it gets smaller, uncomment:
    // mouseConfig.subtract *= subtractBoost;

    const mouse01 = new THREE.Vector2(0.5, 0.5); // start at center

    const onMouseMove = (e) => {
      const rect = hostEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(1, rect.width);
      const y = (e.clientY - rect.top)  / Math.max(1, rect.height);
      mouse01.set(THREE.MathUtils.clamp(x, 0, 1), 1 - THREE.MathUtils.clamp(y, 0, 1));
    };
    hostEl.addEventListener("mousemove", onMouseMove, { passive: true });

    // ---------------- Engine ----------------
    const size = () => ({
      w: hostEl.clientWidth || window.innerWidth,
      h: hostEl.clientHeight || window.innerHeight,
    });
    let { w: widthPx, h: heightPx } = size();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(widthPx, heightPx);
    renderer.setClearColor(renderConfig.bgHex, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = renderConfig.exposure;
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    hostEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(renderConfig.fovDeg, widthPx / heightPx, renderConfig.near, renderConfig.far);
    camera.position.copy(renderConfig.cameraPos);

    // Darker ground color for more shadow contrast
    scene.add(new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 1.2));

    const rimKey = new THREE.DirectionalLight(0xffffff, 2.5);
    rimKey.position.set(5, 5, 5);
    scene.add(rimKey);

    // Reduced fill light for more shadow depth
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, -5, -5);
    scene.add(fillLight);

    const blobMaterial = new THREE.MeshStandardMaterial({
      color: "#000000",
      roughness: 0,
      metalness: 0.1
    });

    // Add environment map for glossy reflections
    const envMap = new THREE.TextureLoader().load('/env/1_rUxJt0LnuVviT6dxiQmkMg.png');
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    blobMaterial.envMap = envMap;
    blobMaterial.envMapIntensity = 1.5;
    const globs = new MarchingCubes(renderConfig.grid, blobMaterial, true, true, 5000);
    globs.scale.set(renderConfig.baseScale, renderConfig.baseScale, renderConfig.baseScale);
    globs.position.set(0, 0, -550);
    globs.isolation = renderConfig.iso;
    

    scene.add(globs);


    // HDR environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envState = { hdrReady: false, didFirstProbeAfterHdr: false };




    const cursor = {
      pos: motionConfig.center01.clone(),
      target: motionConfig.center01.clone(),
      zNow: mouseConfig.zBase01,
      zTarget: mouseConfig.zBase01,
    };

    // ---------------- Motion System ----------------
    const createMotion = () => {
      const twoPi = Math.PI * 2;
      const blobStates = Array.from({ length: motionConfig.blobCount }).map((_, blobIndex) => {
        const angle = (blobIndex / motionConfig.blobCount) * twoPi;
        const ringPos = new THREE.Vector2(
          motionConfig.center01.x + Math.cos(angle) * motionConfig.ringRadius01,
          motionConfig.center01.y + Math.sin(angle) * motionConfig.ringRadius01
        );
        return {
          pos: motionConfig.center01.clone(),
          home: ringPos,
          target: ringPos.clone(),
          zNow: motionConfig.zCenter01,
          zTarget: motionConfig.zCenter01,
          seed: Math.random() * 1000,
          sizeVariation: 0.6 + Math.random() * 1.4, // Random size between 0.3 and 1.7
        };
      });

      let phaseName = "phase1";
      let phaseSeconds = 0;

      const snapToCenter = () => { blobStates.forEach((b) => { b.pos.copy(motionConfig.center01); b.zNow = motionConfig.zCenter01; }); };

      const writeField = (elapsedSeconds) => {
        globs.reset();


        // central ball visibility (center size unchanged)
        let centralVis = 1; // keep always visible

        // Add continuous pulsating effect
        const pulsateScale = 1 + Math.sin(elapsedSeconds * 1.5) * 0.3; // Pulsate between 0.7x and 1.3x

        const s = Math.max(0.1, safeScaleProxy.current?.size ?? 1);
        const centralStrength = motionConfig.centralBall.strength * centralVis * s * pulsateScale;
        const centralSubtract  = motionConfig.centralBall.subtract * (1 + (s - 1) * 0.25);


        // --- central blob offset ONLY ---
        const co = (safeScaleProxy?.current?.center)

        // Clamp so it never leaves the marching field (staying well away from edges)
        const cx = THREE.MathUtils.clamp(0.5 + (co.x || 0), 0.08, 0.92);
        const cy = THREE.MathUtils.clamp(0.5 + (co.y || 0), 0.08, 0.92);
        const cz = THREE.MathUtils.clamp(0.5 + (co.z || 0), 0.08, 0.92);

        if (centralStrength > 1e-3) 
          globs.addBall(cx, cy, cz, centralStrength, centralSubtract);

        // children (now smaller via CHILD_SIZE)
        let childVis = 1; // always visible in all phases

        const breathScale = 1 + Math.sin(elapsedSeconds * 1.3) * 0.05;
        const childStrength = motionConfig.childBall.strength * childVis * breathScale;

        if (childStrength > 1e-3) {
          for (const state of blobStates) {
            // Clamp child blobs to stay within grid bounds
            const clampedX = THREE.MathUtils.clamp(state.pos.x, 0.15, 0.85);
            const clampedY = THREE.MathUtils.clamp(state.pos.y, 0.15, 0.85);
            const clampedZ = THREE.MathUtils.clamp(state.zNow, 0.15, 0.85);
            // Apply individual size variation to each blob
            const variedStrength = childStrength * state.sizeVariation;
            globs.addBall(clampedX, clampedY, clampedZ, variedStrength, motionConfig.childBall.subtract);
          }
        }

        // cursor follower removed - no mouse interaction with blobs

        globs.update();
      };

      const update = (deltaSeconds, elapsedSeconds) => {
        console.log(safeMotionProxy.current.stage)

        // Check if stage is explicitly set to a phase, otherwise use auto-cycling
        const externalStage = "phase2"
        if (externalStage === "phase1" || externalStage === "phase2" || externalStage === "phase3") {
          // External control: use the stage from motionProxy
          phaseName = externalStage;
        } else if (externalStage === "loop") {
          // Auto-cycling mode: phases transition automatically
          phaseSeconds += deltaSeconds;
          const d = motionConfig.phaseSeconds;
          if (phaseName === "phase1" && phaseSeconds >= d.phase1) { phaseName = "phase2"; phaseSeconds = 0; }
          else if (phaseName === "phase2" && phaseSeconds >= d.phase2) { phaseName = "phase3"; phaseSeconds = 0; }
          else if (phaseName === "phase3" && phaseSeconds >= d.phase3) { phaseName = "phase1"; phaseSeconds = 0; }
        }

        if (externalStage !== "disabled") {

          // PHASE 1: Wide liquid-like blobing movement from center
          if (phaseName === "phase1") {
            blobStates.forEach((state, blobIndex) => {
              const phaseOffset = (blobIndex / motionConfig.blobCount) * twoPi + motionConfig.lissajous.phase;

              // Wide movement range - full liquid-like blobing
              const movementScale = 1.0;
              const targetX =
                motionConfig.center01.x +
                Math.sin(elapsedSeconds * motionConfig.lissajous.freqX + phaseOffset) * motionConfig.lissajous.ampX * movementScale;
              const targetY =
                motionConfig.center01.y +
                Math.cos(elapsedSeconds * motionConfig.lissajous.freqY + phaseOffset) * motionConfig.lissajous.ampY * movementScale +
                motionConfig.yBias;  // Apply upward bias

              state.target.set(targetX, targetY);

              // Full radius for liquid-like movement
              const offset = state.target.clone().sub(motionConfig.center01);
              if (offset.length() > motionConfig.roamRadius01) offset.setLength(motionConfig.roamRadius01);
              state.target.copy(motionConfig.center01).add(offset);

              state.target.x += Math.sin((elapsedSeconds + state.seed) * 0.6) * motionConfig.noise;
              state.target.y += Math.cos((elapsedSeconds * 0.7 + state.seed)) * motionConfig.noise;

              // Apply minimum Y constraint to prevent downward clash
              state.target.y = Math.max(motionConfig.yMin, state.target.y);

              state.pos.lerp(state.target, 1 - Math.exp(-motionConfig.lerpXYRate * deltaSeconds));

              const desiredZ =
                motionConfig.zCenter01 +
                Math.sin(elapsedSeconds * motionConfig.zSpeed + phaseOffset) * motionConfig.zRange01;
              state.zTarget = THREE.MathUtils.clamp(desiredZ, 0.4, 0.6);
              state.zNow = THREE.MathUtils.lerp(state.zNow, state.zTarget, 1 - Math.exp(-motionConfig.lerpZRate * deltaSeconds));
            });
          }
          // PHASE 2: Tighter center-focused movement
          else if (phaseName === "phase2") {
            blobStates.forEach((state, blobIndex) => {
              const phaseOffset = (blobIndex / motionConfig.blobCount) * twoPi + motionConfig.lissajous.phase;

              // Very reduced movement range - stay very close to center
              const movementScale = 0.40;
              const targetX =
                motionConfig.center01.x +
                Math.sin(elapsedSeconds * motionConfig.lissajous.freqX + phaseOffset) * motionConfig.lissajous.ampX * movementScale;
              const targetY =
                motionConfig.center01.y +
                Math.cos(elapsedSeconds * motionConfig.lissajous.freqY + phaseOffset) * motionConfig.lissajous.ampY * movementScale +
                motionConfig.yBias;  // Apply upward bias

              state.target.set(targetX, targetY);

              // Much tighter radius limit
              const tighterRadius = motionConfig.roamRadius01 * 0.25;
              const offset = state.target.clone().sub(motionConfig.center01);
              if (offset.length() > tighterRadius) offset.setLength(tighterRadius);
              state.target.copy(motionConfig.center01).add(offset);

              state.target.x += Math.sin((elapsedSeconds + state.seed) * 0.6) * motionConfig.noise;
              state.target.y += Math.cos((elapsedSeconds * 0.7 + state.seed)) * motionConfig.noise;

              // Apply minimum Y constraint to prevent downward clash
              state.target.y = Math.max(motionConfig.yMin, state.target.y);

              state.pos.lerp(state.target, 1 - Math.exp(-motionConfig.lerpXYRate * deltaSeconds));

              const desiredZ =
                motionConfig.zCenter01 +
                Math.sin(elapsedSeconds * motionConfig.zSpeed + phaseOffset) * motionConfig.zRange01;
              state.zTarget = THREE.MathUtils.clamp(desiredZ, 0.4, 0.6);
              state.zNow = THREE.MathUtils.lerp(state.zNow, state.zTarget, 1 - Math.exp(-motionConfig.lerpZRate * deltaSeconds));
            });
          }
          // PHASE 3: Static stacked at center
          else if (phaseName === "phase3") {
            blobStates.forEach((state) => {
              state.pos.lerp(motionConfig.center01, 1 - Math.exp(-3.0 * deltaSeconds));
              state.zNow = THREE.MathUtils.lerp(state.zNow, motionConfig.zCenter01, 1 - Math.exp(-3.0 * deltaSeconds));
            });
          }
        } else {
          // motion disabled: keep children snug to center depth/pos
          blobStates.forEach((state) => {
            state.pos.lerp(motionConfig.center01, 1 - Math.exp(-0.9 * deltaSeconds));
            state.zNow = THREE.MathUtils.lerp(state.zNow, motionConfig.zCenter01, 1 - Math.exp(-0.9 * deltaSeconds));
          });
        }

        // ---- Cursor follow logic ----
        {
          const center = motionConfig.center01;
          const desired = mouse01.clone();
          const offset = desired.clone().sub(center);
          if (offset.length() > mouseConfig.maxRadius01) offset.setLength(mouseConfig.maxRadius01);
          cursor.target.copy(center).add(offset);

          cursor.pos.lerp(cursor.target, 1 - Math.exp(-mouseConfig.lerpXYRate * deltaSeconds));

          const desiredZ =
            mouseConfig.zBase01 +
            Math.sin(elapsedSeconds * mouseConfig.zSpeed) * mouseConfig.zRange01;
          cursor.zTarget = THREE.MathUtils.clamp(desiredZ, 0.4, 0.6);
          cursor.zNow = THREE.MathUtils.lerp(cursor.zNow, cursor.zTarget, 1 - Math.exp(-mouseConfig.lerpZRate * deltaSeconds));
        }

        writeField(elapsedSeconds);
      };

      return { update, snapToCenter };
    };

    const motion = createMotion();

    // ---------------- Loop, resize, cleanup ----------------
    const clock = new THREE.Clock();

    const onResize = () => {
      const s = size();
      widthPx = s.w; heightPx = s.h;
      camera.aspect = widthPx / heightPx;
      camera.updateProjectionMatrix();
      renderer.setSize(widthPx, heightPx);
    };
    window.addEventListener("resize", onResize);

    renderer.setAnimationLoop(() => {
      const deltaSeconds = clock.getDelta();
      const elapsedSeconds = clock.elapsedTime;

      // Update camera from proxy
      if (safeCameraProxy && safeCameraProxy.current && safeCameraProxy.current.position) {
        camera.position.set(
          safeCameraProxy.current.position.x ?? camera.position.x,
          safeCameraProxy.current.position.y ?? camera.position.y,
          safeCameraProxy.current.position.z ?? camera.position.z
        );

        // Optional: make camera look at a target point
        if (safeCameraProxy.current.target) {
          camera.lookAt(
            safeCameraProxy.current.target.x ?? 0,
            safeCameraProxy.current.target.y ?? 0,
            safeCameraProxy.current.target.z ?? 0
          );
        }
      }

      // keep global mesh size (center blob untouched)
      const externalScale =
        safeScaleProxy && safeScaleProxy.current && typeof safeScaleProxy.current.size === "number"
          ? Math.max(0.1, safeScaleProxy.current.size)
          : 1;
      globs.scale.setScalar(renderConfig.baseScale);


      // subtle rotation
      globs.rotation.x = Math.sin(elapsedSeconds * motionConfig.gentleRotX) * 0.06;
      globs.rotation.y = Math.sin(elapsedSeconds * motionConfig.gentleRotY) * 0.1;


      // advance motion + render
      motion.update(deltaSeconds, elapsedSeconds);
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.setAnimationLoop(null);
      hostEl.removeChild(renderer.domElement);
      hostEl.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose?.());
        }
      });
    };
  }, [scaleProxy, motionProxy, cameraProxy, containerRef]);

  return (
    <div
      ref={containerRef}
      className="sticky top-0"
      style={{ width: "100vw", height: "100vh", touchAction: "none", background: "transparent", zIndex: 0 }}
    />
  );
}
