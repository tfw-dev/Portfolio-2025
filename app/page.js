// page.js
"use client";
import Hero from "./components/hero";
import Services from "./components/services";
import Canvas from "./components/canvas";
import Portfolio from "./components/Portfolio";
import About from "./components/About";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useLayoutEffect } from "react";
import { useScrollTimeline } from "./context/TimelineContext"
gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const { timelines, scrollTriggerRef, progressValue } = useScrollTimeline();

  const scaleProxy   = useRef({ value: 1 });
  const motionProxy  = useRef({ stage: "disabled" });
  const motionDriver = useRef({ progress01: 0 });

  const pageRef      = useRef(null);
  const threeRef     = useRef(null);
  const heroTitle    = useRef(null);
  const heroSubtitle = useRef(null);

  useLayoutEffect(() => {
    ScrollTrigger.config({ anticipatePin: 1 });

    const context = gsap.context(() => {
      // --------------------------------
      // heroTL timeline + ScrollTrigger
      // --------------------------------
      const heroTL = gsap.timeline({
        defaults: { ease: "in" },
        scrollTrigger: {
          trigger: pageRef.current,
          start: "top top",
          scrub: 1,
          pin: false,
          invalidateOnRefresh: true,
        },
      });
      timelines.current["hero"] = heroTL

      // ================================
      // HERO (intro text + scale)
      // ================================
      heroTL.addLabel("start");

      // title in
      heroTL.fromTo(
        heroTitle.current,
        { autoAlpha: 0, display: "block" },
        { autoAlpha: 1, ease: "power1.out" },
        "heroStart"
      );

      // subtitle in (after title)
      heroTL.fromTo(
        heroSubtitle.current,
        { autoAlpha: 0, display: "block" },
        { autoAlpha: 1, ease: "power1.out" },
        ">"
      );

      heroTL.to(
        scaleProxy.current,
        {
          value: 1.8
          ,
          ease: "power1.out",
          onUpdate() {
            motionDriver.current.progress01 = this.progress();
          },
        },
        ">"
      );

      // enable looped motion mode once hero is rolling
      heroTL.to(motionProxy.current, { stage: "loop", duration: 0.001 }, "<");

      // hero text out
      heroTL.to(heroTitle.current,    { autoAlpha: 0,  ease: "power1.out" }, "heroTextOutStart");
      heroTL.to(heroSubtitle.current, { autoAlpha: 0,  ease: "power1.out" }, "heroTextOutStart");
  
    // const canvasTL = gsap.timeline({
    //     defaults: { ease: "in" },
    //     scrollTrigger: {
    //     trigger: threeRef.current,
    //     endTrigger: "#portfolio",
    //     end: "top bottom",
    //     start: "top top",
    //     scrub: 1,
    //     pin: true,
    //     invalidateOnRefresh: true,
    //     },
    //   });

    // Build the Services slideshow TL (paused by default)
    const servicesSection = document.getElementById("services");
    const serviceItems = servicesSection
      ? Array.from(servicesSection.querySelectorAll(".service-item"))
      : [];

    if (serviceItems.length) {
      // --- tuning: how much scroll equals 1 "timeline second"
      const PX_PER_SEC = 300;   // increase if you want longer scroll per second
      const IN_DUR     = 5;  // fade in time
      const OUT_DUR    = 0.35;  // fade out time
      const DWELL_SEC  = 4;     // ← each item centered for ~4s of scrolling

      // initial state
      gsap.set(serviceItems, { autoAlpha: 0, yPercent: 10 });
      gsap.set(servicesSection, { display: "block" });

      const servicesTL = gsap.timeline({ defaults: { ease: "none" } });

      timelines.current["services"] = servicesTL

      // first item: fade in, then dwell 4 "seconds"
      servicesTL.to(servicesSection, { autoAlpha: 1 , duration: IN_DUR });
      servicesTL.addLabel("start");
      servicesTL
        .fromTo(
          serviceItems[0],
          { autoAlpha: 0, yPercent: 10 },
          { autoAlpha: 1, yPercent: 0, duration: IN_DUR, ease: "power2.out" }
        )
        .to({}, { duration: DWELL_SEC }); // dwell while centered

      // subsequent items: out current → in next → dwell
      for (let i = 0; i < serviceItems.length - 1; i++) {
        const curr = serviceItems[i];
        const next = serviceItems[i + 1];
        servicesTL
          .to(curr, { autoAlpha: 0, yPercent: -10, duration: OUT_DUR, ease: "power2.in" })
          .fromTo(next, { autoAlpha: 0, yPercent: 10 }, { autoAlpha: 1, yPercent: 0, duration: IN_DUR, ease: "power2.out" })
          .to({}, { duration: DWELL_SEC }); // keep next centered ~4s of scrolling
      }

      // IMPORTANT: make end depend on the timeline length
      ScrollTrigger.create({
        animation: servicesTL,
        trigger: servicesSection,
        start: "top top",
        end: () => "+=" + (servicesTL.duration() * PX_PER_SEC), // ← maps timeline seconds → scroll px
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
        // markers: true,
      });




    }


      // ================================
      // portfolio (cards in)
      // ================================
      heroTL.addLabel("portfolioStart", ">");
      heroTL.fromTo(
        "#portfolio .card",
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.34 },
        "portfolioStart"
      );
      heroTL.addLabel("portfolioEnd");

      // OPTIONAL: Snap to labeled boundaries (progress-based)
      // const snaps = ["heroEnd","servicesEnd","portfolioEnd","exitEnd"].map(l => heroTL.labels[l] / heroTL.duration());
      // heroTL.scrollTrigger.vars.snap = { snapTo: snaps, duration: 0.6, inertia: false };
      // heroTL.scrollTrigger.refresh();
    }, pageRef);

    return () => context.revert();
  }, []);

  return (
    <div ref={pageRef}>
      <div className="relative font-sans">
        <h1 ref={heroTitle} className="hidden fixed top-1/4 left-1/2 -translate-x-1/2">
          Hello, I am Taylor Ward
        </h1>
        <h3 ref={heroSubtitle} className="hidden fixed bottom-1/5 left-1/2 -translate-x-1/2 max-w-md text-center">
          Intentional, no frills full bredth web services data-driven strategy, design, and development for your brand.
        </h3>

        <Canvas threeRef={threeRef} scaleProxy={scaleProxy} motionProxy={motionProxy} />
        <Hero />
        <div className="h-[8000px]"></div>
        {/* Services is presentational-only; each slide has class "service-item" */}
        <Services />
      </div>
      <Portfolio />
      <About />
    </div>
  );
}
