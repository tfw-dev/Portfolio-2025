// services.js
"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Services() {
  const sectionRef = useRef(null);
  const itemsRef = useRef([]);
  const setItemRef = (el, i) => (itemsRef.current[i] = el);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      const items = itemsRef.current;

      gsap.set(items, { autoAlpha: 0, yPercent: 10 });
      gsap.set(items[0], { autoAlpha: 1, yPercent: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top+=1",   // ← nudge start so it doesn’t overlap hero’s end
          end: "+=4000",
          scrub: 1,
          pin: true,
          // pinSpacing: false,   // ← uncomment to avoid adding extra spacer height
          // markers: true,
          snap: { snapTo: [0, 1/3, 2/3, 1], duration: 0.5, ease: "power1.inOut" },
          invalidateOnRefresh: true,
        },
      });

      items.forEach((item, i) => {
        const next = items[i + 1];
        if (!next) return;
        tl.to(item, { autoAlpha: 0, yPercent: -10, duration: 0.5 }, i)
          .fromTo(next, { autoAlpha: 0, yPercent: 10 }, { autoAlpha: 1, yPercent: 0, duration: 0.5 }, i + 0.25);
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative h-screen overflow-hidden bg-gradient-to-b"
    >
      <h2 className="absolute left-1/2 top-1/5 -translate-x-1/2">Services</h2>
      {[
        { title: "Design", desc: "Workshops, audits, and roadmap alignment." },
        { title: "Development", desc: "Rapid UX/UI exploration and concept iteration." },
        { title: "Consulting", desc: "Custom Shopify builds, performance, integrations." },
        { title: "Ecommerce", desc: "Analytics, optimization, and continuous improvement." },
      ].map((item, i) => (
        <div
          key={i}
          ref={(el) => setItemRef(el, i)}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
        >
          <h2 className="text-6xl text-white font-barcode-tfb tracking-[3px]">{item.title}</h2>
        </div>
      ))}
    </section>
  );
}
