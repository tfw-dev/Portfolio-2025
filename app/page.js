// page.js
"use client";
import { useRef, useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

// Context
import { useScrollTimeline } from "./context/TimelineContext";

// Components
import Hero from "./components/sections/hero/Hero";
import ServicesCarousel from "./components/sections/services/Services";
import Canvas from "./components/three/canvas";
import Portfolio from "./components/sections/Portfolio/Portfolio";
import About from "./components/sections/about/About";
import ConditionalRender from "./components/shared/ConditionalRender";

// Configuration
import { FEATURES } from "./config/features";

// Data
import { Services } from "./data/services";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

export default function Home() {
  // Context to share timeline with header
  const { timelines } = useScrollTimeline();

  // REFS - All optional now with Canvas defaults
  const scaleProxy = useRef({ size: 0.5, offset: 0, center: { x: 0, y: 0, z: 0 } });
  const motionProxy = useRef({ stage: "loop" });
  const cameraProxy = useRef({
    position: { x: 0, y: 0, z: 500 },
    target: { x: 0, y: 0, z: 0 }
  });
  const pageRef = useRef(null);
  const threeRef = useRef(null);
  const logoRef = useRef(null);

  // Scroll animations - all timeline logic extracted to this effect
  useLayoutEffect(() => {
    if (!FEATURES.SCROLL_ANIMATIONS) return;

    const context = gsap.context(() => {
      // Hero Timeline
      const heroTL = gsap.timeline({
        defaults: { ease: "in" },
        scrollTrigger: {
          trigger: pageRef.current,
          start: "top top",
          scrub: 1,
          pin: false,
          invalidateOnRefresh: true,
          anticipatePin: 1
        },
      });

      if (timelines?.current) {
        timelines.current["hero"] = heroTL;
      }

      heroTL.addLabel("start");

      // Blob motion and scale animations
      heroTL.to(motionProxy.current, { stage: "phase2", duration: 3 }, "<");
      heroTL.to(scaleProxy.current.center, { y: -0.2, duration: 5, ease: "power2.out" });
      heroTL.to(scaleProxy.current, { size: 0.2, duration: 5, ease: "power2.out" }, "<");
      heroTL.to(scaleProxy.current, { size: 5.4, duration: 5, ease: "power2.out" }, ">");
      heroTL.to(motionProxy.current, { stage: "disabled", duration: 3 }, "<");
      heroTL.to(scaleProxy.current.center, { y: -0.03, duration: 5, ease: "power2.out" }, ">");

      // Camera animations
      heroTL.to(cameraProxy.current.position, { z: 0, duration: 2, ease: "power2.out" }, "<");
      heroTL.to(cameraProxy.current.position, { y: 0, duration: 2, ease: "power2.out" }, "<");

      // Services Timeline
      if (FEATURES.SERVICES) {
        const servicesSection = document.getElementById("services");
        const serviceItems = servicesSection
          ? Array.from(servicesSection.querySelectorAll(".service-item"))
          : [];

        if (serviceItems.length) {
          const PX_PER_SEC = 300;
          const IN_DUR = 5;
          const OUT_DUR = 0.35;
          const DWELL_SEC = 4;

          gsap.set(serviceItems, { autoAlpha: 0, yPercent: 10 });
          gsap.set(servicesSection, { display: "block" });

          const servicesTL = gsap.timeline({ defaults: { ease: "none" } });

          if (timelines?.current) {
            timelines.current["services"] = servicesTL;
          }

          servicesTL.to(servicesSection, { autoAlpha: 1, duration: IN_DUR });
          servicesTL.addLabel("start");
          servicesTL
            .fromTo(
              serviceItems[0],
              { autoAlpha: 0, yPercent: 10 },
              { autoAlpha: 1, yPercent: 0, duration: IN_DUR, ease: "power2.out" }
            )
            .to({}, { duration: DWELL_SEC });

          for (let i = 0; i < serviceItems.length - 1; i++) {
            const curr = serviceItems[i];
            const next = serviceItems[i + 1];
            const serviceTitle = document.getElementById("serviceTitle");

            servicesTL
              .to(curr, { autoAlpha: 0, yPercent: -10, duration: OUT_DUR, ease: "power2.in" })
              .fromTo(
                next,
                { autoAlpha: 0, yPercent: 10 },
                { autoAlpha: 1, yPercent: 0, duration: IN_DUR, ease: "power2.out" }
              );

            if (serviceTitle && Services[i + 1]) {
              servicesTL.to(
                serviceTitle,
                {
                  duration: 3,
                  scrambleText: {
                    text: Services[i + 1].title,
                    revealDelay: 1,
                    speed: 0.9,
                    newClass: "myClass"
                  }
                },
                "<"
              );
            }

            servicesTL.to({}, { duration: DWELL_SEC });
          }

          ScrollTrigger.create({
            animation: servicesTL,
            trigger: servicesSection,
            start: "top top",
            end: () => "+=" + servicesTL.duration() * PX_PER_SEC,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
            anticipatePin: 1
          });

          heroTL.to(scaleProxy.current.center, { y: 0, duration: 5, ease: "power2.out" }, ">");
          servicesTL.to(scaleProxy.current, { size: 2.4, duration: 5, ease: "power2.out" }, "<");

          const TOTAL_Y = 0.01 * (serviceItems.length - 1);
          gsap.to(scaleProxy.current.center, {
            y: `+=${TOTAL_Y}`,
            ease: "none",
            scrollTrigger: {
              trigger: servicesSection,
              start: "top+=100 top",
              end: () => "+=" + servicesTL.duration() * PX_PER_SEC,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          }, ">");
        }
      }

      // Portfolio Timeline
      if (FEATURES.PORTFOLIO) {
        heroTL.addLabel("portfolioStart", ">");
        heroTL.fromTo(
          "#portfolio .card",
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.34 },
          "portfolioStart"
        );
        heroTL.addLabel("portfolioEnd");
      }
    }, pageRef);

    return () => context.revert();
  }, [timelines]);

  return (
    <div ref={pageRef}>
      <div className="relative font-sans">
        <div className="fixed w-[400px] max-sm:w-[280px] z-50 bottom-10 sm:bottom-24 text-center right-1/2 translate-x-1/2 ">
          <h2 className="text-md">
            Crafting intentional, digital experiences through data-driven strategy, design, and development.
          </h2>
          <br></br>
          <Link href="https://calendar.app.google/KP5DeMVNUB9EJLW56" target="_blank" className="block underline">Book a meeting</Link>
          <br></br>
          taylor@taylorward.dev
        </div>

        {/* Canvas with error boundary and feature flag */}
        <ConditionalRender feature="CANVAS">
          <Canvas
            threeRef={threeRef}
            cameraProxy={cameraProxy}
            scaleProxy={scaleProxy}
            motionProxy={motionProxy}
          />
        </ConditionalRender>

        {/* Hero with error boundary and feature flag */}
        <ConditionalRender feature="HERO">
          <Hero />
        </ConditionalRender>

        {/* <Image
          ref={logoRef}
          src="/tw_logo.png"
          alt="Taylor Ward"
          className="fixed invert top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
          width={60}
          height={20}
        /> */}
        <div
        className="fixed invert top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 text-black"
        >Taylor Ward</div>

        {/* <div className="scrollLabel">SCROLL</div> */}
        {/* <div className="h-[100px]"></div> */}

        {/* Services with error boundary and feature flag */}
        <ConditionalRender feature="SERVICES">
          <ServicesCarousel />
        </ConditionalRender>
      </div>

      {/* Portfolio with error boundary and feature flag */}
      <ConditionalRender feature="PORTFOLIO">
        <Portfolio />
      </ConditionalRender>

      {/* About with error boundary and feature flag */}
      <ConditionalRender feature="ABOUT">
        <About />
      </ConditionalRender>
    </div>
  );
}
