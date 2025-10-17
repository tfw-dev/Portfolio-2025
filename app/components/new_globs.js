"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Box3, Box3Helper, Vector3 } from "three";

import { MarchingCubes as Globs } from "three/examples/jsm/objects/MarchingCubes.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export default function NewGlobs({ scaleProxy }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const size = () => ({ w: host.clientWidth || innerWidth, h: host.clientHeight || innerHeight });
    const { w, h } = size();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.5;
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0" });
    host.appendChild(renderer.domElement);

    // Scene / camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
    camera.position.z = 1600;

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbccff, 0.35));
    const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(0, 0, -1); scene.add(rim);

    // Material + blobs
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x111111, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, envMapIntensity: 6,
    });
    // Bigger cube, deeper Z, a bit closer so it feels large again
    const BASE_SCALE = new THREE.Vector3(500, 500, 800);
    globs.scale.copy(BASE_SCALE);
    globs.position.z = -300;   // was -420
    globs.isolation = 90;
    globs.enableUvs = false;
    globs.enableColors = false;


const box = new THREE.Box3(new THREE.Vector3(0,0,0), new THREE.Vector3(1,1,1));
const helper = new THREE.Box3Helper(box, 0x444444);
globs.add(helper); // helper follows globs’ scale/position

    // Dynamic probe (used as immediate env to avoid HDR pop)
    const cubeTarget = new THREE.WebGLCubeRenderTarget(300, { type: THREE.HalfFloatType, generateMipmaps: true });
    const cubeCamera = new THREE.CubeCamera(10, 5000, cubeTarget); scene.add(cubeCamera);
    material.envMap = cubeTarget.texture; // give reflections instantly

    const captureProbe = () => {
      globs.visible = false;
      const prevBg = scene.background;
      scene.background = scene.environment || null;
      cubeCamera.update(renderer, scene);
      scene.background = prevBg;
      globs.visible = true;
    };
    captureProbe(); // first capture so we have env on frame 1

    // HDR IBL — prewarm + preload + seamless swap
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader(); // avoid shader compile hitch later

    (async () => {
      try {
        const hdrPath = "/hdr/AdobeStock_273357547_Preview.hdr";
        // warm the cache (lets Next.js serve with long cache headers)
        const blob = await fetch(hdrPath, { cache: "force-cache" }).then((r) => r.blob());
        const objectUrl = URL.createObjectURL(blob);
        const hdr = await new HDRLoader().loadAsync(objectUrl);
        URL.revokeObjectURL(objectUrl);

        const env = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose(); pmrem.dispose();

        // swap env only when ready, then recapture probe once
        scene.environment = env;
        captureProbe();
      } catch {
        pmrem.dispose();
      }
    })();

    // burst state
const burstBalls = []; // {dir, start, dur, strength, radius}
let lastBurstAt = 0;
let wasClose = false;

function startBurst(count = 10) {
  const now = performance.now();
  lastBurstAt = now;
  burstBalls.length = 0;

  for (let i = 0; i < count; i++) {
    const dir = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    (Math.random() * 2 - 1) * 0.6   // less toward camera
    ).normalize();

    radius: 0.16 + Math.random() * 0.06,  // 0.16–0.22 (smaller reach)

    burstBalls.push({
      dir,
      start: now,
      dur: 1200 + Math.random() * 600,  // 1.2–1.8s duration
      strength: 0.38 + Math.random() * 0.12,
      radius: 0.22 + Math.random() * 0.10,
    });
  }
}



    let pointerScale = 1; // multiplier controlled by pointer
    const baseScale = 500;

    // Pointer follower
    const mouse = new THREE.Vector2(0.5, 0.5), center = new THREE.Vector2(0.5, 0.5), maxR = 0.3;
    const setMouse = (x, y) => {
        const r = host.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const closeToCenter = Math.abs(x - centerX) <= 35 && Math.abs(y - centerY) <= 9999;
        pointerScale = closeToCenter ? 300 / baseScale : 1; // 50 absolute when close, else normal

        // fire burst only when entering "close" zone, with cooldown
        if (closeToCenter && !wasClose && performance.now() - lastBurstAt > 500) {
            startBurst(12); // number of burst blobs
        }
        wasClose = closeToCenter;


        mouse.set(
            THREE.MathUtils.clamp((x - r.left) / r.width, 0, 1),
            THREE.MathUtils.clamp(1 - (y - r.top) / r.height, 0, 1)
        );
    };
    const onPointer = (e) => setMouse(e.clientX, e.clientY);
    const onTouch = (e) => e.touches?.length && setMouse(e.touches[0].clientX, e.touches[0].clientY);
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("touchmove", onTouch, { passive: true });

    // Render
    let frames = 0;
    let scaleNow = 1;

    renderer.setAnimationLoop(() => {
       const proxy = Math.max(0.1, scaleProxy?.current?.value ?? 1);
        scaleNow = THREE.MathUtils.lerp(scaleNow, pointerScale, 0.12);
        globs.scale.copy(BASE_SCALE).multiplyScalar(proxy * scaleNow);


      const delta = mouse.clone().sub(center), d = Math.min(delta.length(), maxR);
      delta.setLength(d);
      const p = center.clone().add(delta), t = d / maxR;
      globs.reset();

            // burst blobs (out-and-back)
        if (burstBalls.length) {
        const now = performance.now();
        for (let i = burstBalls.length - 1; i >= 0; i--) {
            const b = burstBalls[i];
            const u = THREE.MathUtils.clamp((now - b.start) / b.dur, 0, 1);

            // out-and-back easing (sin curve)
            const ease = Math.sin(Math.PI * u);

            // position in normalized marching-cubes space
            const pos = new THREE.Vector3(0.5, 0.5, 0.5).addScaledVector(b.dir, b.radius * ease);

            pos.z -= 0.06;  // push 6% toward the back

            const MARGIN = 0.12; // 12% padding from each face
            pos.set(
            THREE.MathUtils.clamp(pos.x, MARGIN, 1 - MARGIN),
            THREE.MathUtils.clamp(pos.y, MARGIN, 1 - MARGIN),
            THREE.MathUtils.clamp(pos.z, MARGIN, 1 - MARGIN)
            );
            globs.addBall(pos.x, pos.y, pos.z, b.strength, 18);

            if (u >= 1) burstBalls.splice(i, 1); // remove when done
        }
        }

      globs.addBall(0.5, 0.5, 0.5, 1.2, 14);
      globs.addBall(p.x, p.y, 0.5, THREE.MathUtils.lerp(0.55, 0.2, t), THREE.MathUtils.lerp(14, 24, t));
      globs.update();



      if (++frames > 120) { captureProbe(); frames = 0; } // refresh reflections slowly
      renderer.render(scene, camera);
    });

    // Resize
    const onResize = () => {
      const { w, h } = size();
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h); captureProbe();
    };
    const ro = "ResizeObserver" in window ? new ResizeObserver(onResize) : null;
    ro ? ro.observe(host) : addEventListener("resize", onResize);

    // Cleanup
    return () => {
      renderer.setAnimationLoop(null);
      removeEventListener("pointermove", onPointer);
      removeEventListener("touchmove", onTouch);
      ro ? ro.disconnect() : removeEventListener("resize", onResize);
      host.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [scaleProxy]);

  return <div ref={hostRef} style={{ width: "100vw", height: "100vh", position: "relative" }} />;
}
