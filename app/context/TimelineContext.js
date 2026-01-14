"use client";
import { createContext, useContext, useRef } from "react";

// Create a context to hold the GSAP timeline and its helpers
const ScrollTimelineContext = createContext(null);

export function ScrollTimelineProvider({ children }) {
    const timelines = useRef({
        hero: null,
        services: null
    });

    return (
    <ScrollTimelineContext.Provider
      value={{ timelines }}
    >
      {children}
    </ScrollTimelineContext.Provider>
  );
}

export function useScrollTimeline() {
  return useContext(ScrollTimelineContext);
}
