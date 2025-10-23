"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export default function Canvas({ scaleProxy, motionProxy, threeRef }) {

  useEffect(() => {
    const hostEl = threeRef.current;
    if (!hostEl) return;

    const renderConfig = {
      fovDeg: 50, near: 1, far: 10000,
      cameraPos: new THREE.Vector3(0, 0, 500),
      exposure: 1.05, bgHex: 0x000000,
      baseScale: 200, iso: 50, grid: 100,
      envProbeSize: 150,
      hdrUrl: "/hdr/AdobeStock_273357547_Preview.hdr",
    };

    const materialConfig = {
      color: 0x0f0f10, roughness: 0, metalness: 0,
      envMapIntensity: 10, clearcoat: 1, clearcoatRoughness: 0, ior: 0.8,
    };
    
    const motionConfig = {
      blobCount: 6,
      center01: new THREE.Vector2(0.5, 0.5),
      ringRadius01: 0.16, roamRadius01: 0.26,
      lerpXYRate: 0.55, lerpZRate: 0.5,
      lissajous: { ampX: 0.17, ampY: 0.21, freqX: 0.35, freqY: 0.27, phase: Math.PI * 0.33 },
      noise: 0.05, zCenter01: 0.5, zRange01: 0.12, zSpeed: 0.28,
      phaseSeconds: { single: 1.8, split: 1.6, roam: 6.5, merge: 2.0 },
      centralBall: { strength: 1.15, subtract: 13.5 },
      childBall: { strength: 0.52, subtract: 17.5 },
      gentleRotX: 0.05, gentleRotY: 0.08,
      probeEverySeconds: 1.2,
    };

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
    hostEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(renderConfig.fovDeg, widthPx / heightPx, renderConfig.near, renderConfig.far);
    camera.position.copy(renderConfig.cameraPos);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbccff, 0.35));
    const rimKey = new THREE.DirectionalLight(0xffffff, 1.1);
    rimKey.position.set(0, 0, -1);
    scene.add(rimKey);

    const blobMaterial = new THREE.MeshPhysicalMaterial(materialConfig);
    const globs = new MarchingCubes(renderConfig.grid, blobMaterial, true, true, 100000);
    globs.scale.set(renderConfig.baseScale, renderConfig.baseScale, renderConfig.baseScale);
    globs.position.set(0, 0, -250);
    globs.isolation = renderConfig.iso;
    scene.add(globs);

    // Softbox planes for tasty reflections
    const softboxMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const softboxA = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), softboxMaterial);
    softboxA.position.set(900, 700, 800); softboxA.rotation.set(0, -0.3, 0);
    const softboxB = softboxA.clone(); softboxB.position.set(-900, -700, 800); softboxB.rotation.set(0, 0.3, 0);
    scene.add(softboxA, softboxB);

    // HDR environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envState = { hdrReady: false, didFirstProbeAfterHdr: false };

    new HDRLoader().load(
      renderConfig.hdrUrl,
      (hdr) => {
        const envTexture = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = envTexture;
        hdr.dispose(); pmrem.dispose();
        envState.hdrReady = true;
      },
      undefined,
      () => { pmrem.dispose(); }
    );

    // Dynamic reflection probe
    const cubeTarget = new THREE.WebGLCubeRenderTarget(renderConfig.envProbeSize, { type: THREE.HalfFloatType, generateMipmaps: true });
    const cubeCamera = new THREE.CubeCamera(10, 5000, cubeTarget);
    scene.add(cubeCamera);
    const captureProbe = () => {
      globs.visible = false;
      const prevBg = scene.background;
      scene.background = scene.environment || null;
      cubeCamera.update(renderer, scene);
      scene.background = prevBg;
      globs.visible = true;
    };
    captureProbe();
    blobMaterial.envMap = cubeTarget.texture; blobMaterial.needsUpdate = true;

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
        };
      });

      let phaseName = "single";
      let phaseSeconds = 0;

      const easeInOut = (t) => { const u = Math.min(Math.max(t, 0), 1); return 0.5 - 0.5 * Math.cos(Math.PI * u); };
      const easeOut = (t) => { const u = Math.min(Math.max(t, 0), 1); return 1 - Math.pow(1 - u, 2); };
      const snapToCenter = () => { blobStates.forEach((b) => { b.pos.copy(motionConfig.center01); b.zNow = motionConfig.zCenter01; }); };

      const writeField = (elapsedSeconds) => {
        globs.reset();

        // central ball visibility
        const durs = motionConfig.phaseSeconds;
        let centralVis = 1;
        if (phaseName === "split") centralVis = 1 - easeInOut(phaseSeconds / durs.split);
        else if (phaseName === "roam") centralVis = 0;
        else if (phaseName === "merge") centralVis = easeOut(phaseSeconds / durs.merge);

        const centralStrength = motionConfig.centralBall.strength * centralVis;
        if (centralStrength > 1e-3) globs.addBall(0.5, 0.5, 0.5, centralStrength, motionConfig.centralBall.subtract);

        // children visibility + gentle breath
        let childVis = 0;
        if (phaseName === "split") childVis = easeInOut(phaseSeconds / durs.split);
        else if (phaseName === "roam") childVis = 1;
        else if (phaseName === "merge") childVis = 1 - easeOut(phaseSeconds / durs.merge);

        const breathScale = 1 + Math.sin(elapsedSeconds * 1.3) * 0.05;
        const childStrength = motionConfig.childBall.strength * childVis * breathScale;

        if (childStrength > 1e-3) {
          for (const state of blobStates) {
            globs.addBall(state.pos.x, state.pos.y, state.zNow, childStrength, motionConfig.childBall.subtract);
          }
        }
        globs.update();
      };

      const update = (deltaSeconds, elapsedSeconds) => {
        if (motionProxy.current.stage !== "disabled") {
        // phase clock
        phaseSeconds += deltaSeconds;
        const d = motionConfig.phaseSeconds;
        if (phaseName === "single" && phaseSeconds >= d.single) { phaseName = "split"; phaseSeconds = 0; }
        else if (phaseName === "split" && phaseSeconds >= d.split) { phaseName = "roam"; phaseSeconds = 0; }
        else if (phaseName === "roam" && phaseSeconds >= d.roam) { phaseName = "merge"; phaseSeconds = 0; }
        else if (phaseName === "merge" && phaseSeconds >= d.merge) { phaseName = "single"; phaseSeconds = 0; snapToCenter(); }

        // per-phase motion
        if (phaseName === "roam") {
          blobStates.forEach((state, blobIndex) => {
            const phaseOffset = (blobIndex / motionConfig.blobCount) * twoPi + motionConfig.lissajous.phase;

            const targetX =
              motionConfig.center01.x +
              Math.sin(elapsedSeconds * motionConfig.lissajous.freqX + phaseOffset) * motionConfig.lissajous.ampX * 0.9;
            const targetY =
              motionConfig.center01.y +
              Math.cos(elapsedSeconds * motionConfig.lissajous.freqY + phaseOffset) * motionConfig.lissajous.ampY * 0.9;

            state.target.set(targetX, targetY);

            const offset = state.target.clone().sub(motionConfig.center01);
            if (offset.length() > motionConfig.roamRadius01) offset.setLength(motionConfig.roamRadius01);
            state.target.copy(motionConfig.center01).add(offset);

            state.target.x += Math.sin((elapsedSeconds + state.seed) * 0.6) * motionConfig.noise;
            state.target.y += Math.cos((elapsedSeconds * 0.7 + state.seed)) * motionConfig.noise;

            state.pos.lerp(state.target, 1 - Math.exp(-motionConfig.lerpXYRate * deltaSeconds));

            const desiredZ =
              motionConfig.zCenter01 +
              Math.sin(elapsedSeconds * motionConfig.zSpeed + phaseOffset) * motionConfig.zRange01;
            state.zTarget = THREE.MathUtils.clamp(desiredZ, 0.08, 0.92);
            state.zNow = THREE.MathUtils.lerp(state.zNow, state.zTarget, 1 - Math.exp(-motionConfig.lerpZRate * deltaSeconds));
          });
        } else if (phaseName === "split") {
          const progress = easeInOut(phaseSeconds / d.split);
          blobStates.forEach((state) => {
            state.pos.lerpVectors(motionConfig.center01, state.home, progress);
            state.zNow = THREE.MathUtils.lerp(motionConfig.zCenter01, motionConfig.zCenter01 + 0.1, progress * 0.6);
          });
        } else if (phaseName === "merge") {
          blobStates.forEach((state) => {
            state.pos.lerp(motionConfig.center01, 1 - Math.exp(-0.9 * deltaSeconds));
            state.zNow = THREE.MathUtils.lerp(state.zNow, motionConfig.zCenter01, 1 - Math.exp(-0.9 * deltaSeconds));
          });
        } else {
          snapToCenter();
        }
      } else {
        blobStates.forEach((state) => {
            state.pos.lerp(motionConfig.center01, 1 - Math.exp(-0.9 * deltaSeconds));
            state.zNow = THREE.MathUtils.lerp(state.zNow, motionConfig.zCenter01, 1 - Math.exp(-0.9 * deltaSeconds));
          });

      }

        writeField(elapsedSeconds);
      };

      return { update, snapToCenter };
    };

    const motion = createMotion();

    // ---------------- Loop, resize, cleanup ----------------
    const clock = new THREE.Clock();
    let secondsSinceProbe = 0;

    const onResize = () => {
      const s = size();
      widthPx = s.w; heightPx = s.h;
      camera.aspect = widthPx / heightPx;
      camera.updateProjectionMatrix();
      renderer.setSize(widthPx, heightPx);
      captureProbe();
    };
    window.addEventListener("resize", onResize);

    renderer.setAnimationLoop(() => {
      const deltaSeconds = clock.getDelta();
      const elapsedSeconds = clock.elapsedTime;

      // external scale
      const externalScale =
        scaleProxy && scaleProxy.current && typeof scaleProxy.current.value === "number"
          ? Math.max(0.1, scaleProxy.current.value)
          : 1;
      globs.scale.setScalar(renderConfig.baseScale * externalScale);

      // subtle rotation
      globs.rotation.x = Math.sin(elapsedSeconds * motionConfig.gentleRotX) * 0.06;
      globs.rotation.y = Math.sin(elapsedSeconds * motionConfig.gentleRotY) * 0.1;

      // probe refresh cadence
      secondsSinceProbe += deltaSeconds;
      if (envState.hdrReady && !envState.didFirstProbeAfterHdr) {
        captureProbe(); envState.didFirstProbeAfterHdr = true;
      }
      if (secondsSinceProbe > motionConfig.probeEverySeconds) { captureProbe(); secondsSinceProbe = 0; }

      // advance motion + render
      motion.update(deltaSeconds, elapsedSeconds);
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.setAnimationLoop(null);
      hostEl.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose?.());
        }
      });
    };
  }, [scaleProxy]);

  return (
    <div
      ref={threeRef}
      className="sticky top-0"
      style={{ width: "100vw", height: "100vh", touchAction: "none", background: "transparent", zIndex: 0 }}
    />
  );
}
