"use client";

import Link from "next/link";
import { useRef, useState, useLayoutEffect, useEffect } from "react";
import clsx from "clsx";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useScrollTimeline } from "../context/TimelineContext";

gsap.registerPlugin(ScrollToPlugin);

export default function HeaderNav() {
  const { timelines } = useScrollTimeline();

  // Root wrapper so outside-click doesn’t close when hitting the toggle button
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);

  // Close on Escape + outside click (only when open)
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClickAway = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickAway);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickAway);
    };
  }, [open]);

  function scrollToLabel(e, tlName, label = "start") {
    e?.preventDefault?.()

    const targetTl = timelines?.current?.[tlName];
    if (!targetTl) {
        const element = document.getElementById(`${tlName}`)
        if (!element) return;
        gsap.to(window, { duration: 1, ease: "power2.out", scrollTo: element });
        setOpen(false);
        return;
    } 

    const t = targetTl.labels?.[label];
    if (t == null) {
      console.warn(`No timeline label named "${label}" on "${tlName}"`);
      return;
    }

    const st = targetTl.scrollTrigger;
    if (!st) {
      console.warn(`Timeline "${tlName}" has no ScrollTrigger yet.`);
      return;
    }

    const progress = t / targetTl.duration();
    const y = st.start + (st.end - st.start) * progress;

    gsap.to(window, { duration: 1, ease: "power2.out", scrollTo: y });

    // Close menu after navigating
    setOpen(false);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[100] mt-16 mx-20">
      <div ref={rootRef} className="flex flex-col justify-between items-start">
        {/* Toggle (button, not nested buttons) */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((v) => !v)}
          className="w-8 border-t pt-4 border-solid border-indigo-black focus:outline-none"
        >
          <div
            className={clsx(
              "w-5 pt-5 border-t border-solid border-indigo-black origin-center transition-transform duration-200",
              open ? "hidden" : "block"
            )}
          />
        </button>

        {/* Menu */}
        <nav
          id="site-menu"
          ref={menuRef}
          aria-hidden={!open}
          className={clsx(
            "flex flex-col gap-[10px] transition duration-200 origin-top",
            // keep in DOM for smooth transition; block clicks when closed
            open
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
          )}
        >
          <Link href="/#home" onClick={(e) => scrollToLabel(e, "hero", "start")}>
            Home
          </Link>
          <Link href="/#services" onClick={(e) => scrollToLabel(e, "services", "start")}>
            Services
          </Link>
          <Link href="/#portfolio" onClick={(e) => scrollToLabel(e, "portfolio", "start")}>
            Portfolio
          </Link>
          <Link href="/#about" onClick={(e) => scrollToLabel(e, "about", "start")}>
            About
          </Link>
          <Link href="/#contact" onClick={(e) => scrollToLabel(e, "contact", "start")}>
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
