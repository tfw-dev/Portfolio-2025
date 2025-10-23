"use client";
import { createContext, useContext, useRef } from "react";

// Create a context to hold the GSAP timeline and its helpers
const ScrollTimelineContext = createContext(null);

export function ScrollTimelineProvider({ children }) {
    const timelines = useRef({
        hero: null,
        services: null
    });
    const servicesTimeline = useRef(null);     
    const scrollTriggerRef = useRef(null);       // optional ScrollTrigger
    const progressValue = useRef(0);          // readable progress

    return (
    <ScrollTimelineContext.Provider
      value={{ timelines, scrollTriggerRef, progressValue }}
    >
      {children}
    </ScrollTimelineContext.Provider>
  );
}

export function useScrollTimeline() {
  return useContext(ScrollTimelineContext);
}
