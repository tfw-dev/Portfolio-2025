// page.js
"use client";
import Hero from "./components/hero";
import Services from "./components/services";
import InteractiveGlobs from "./components/globs";
import Projects from "./components/projects";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useLayoutEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const scaleProxy = useRef({ value: 1 });

  
  useLayoutEffect(() => {
    // helps when later pins (Services) affect earlier measurements
    ScrollTrigger.config({ anticipatePin: 1 });

    const hero = document.getElementById("hero");

    // Kill any previous triggers in this scope on hot reloads
    const ctx = gsap.context(() => {
      // Drive the scale strictly by Hero's own progress.
      const st = ScrollTrigger.create({
        trigger: hero,
        start: "200 bottom",
        end: "bottom top",  // stops exactly at Hero’s end
        markers: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // map 0→1 progress to 1→3 scale (clamped at edges)
          scaleProxy.current.value = 1 + 2 * self.progress;
        },
        onLeave: () => { scaleProxy.current.value = 3; },       // past Hero
        onLeaveBack: () => { scaleProxy.current.value = 1; },   // before Hero
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="font-sans">
      <div >
        <div className="sticky top-0 overflow-visible">
          <InteractiveGlobs scaleProxy={scaleProxy}></InteractiveGlobs>
        </div>
        <Hero/>
        <Services></Services>
        </div>
      <Projects></Projects>
    </div>
  );
}
