// Scroll animation configuration
// Centralizes all timeline settings so they can be easily modified or disabled

export const ANIMATION_CONFIG = {
  // Enable/disable entire animation sections
  enabled: {
    hero: true,
    services: true,
    portfolio: true,
  },

  // Hero section animations
  hero: {
    blob: {
      initialSize: 0.5,
      shrinkSize: 0.2,
      expandSize: 5.4,
      shrinkDuration: 5,
      expandDuration: 5,
      centerOffset: { start: -0.2, end: -0.03 },
    },
    motion: {
      initialStage: "loop",
      scrollStage: "phase2",
      endStage: "disabled",
      transitionDuration: 3,
    },
    camera: {
      zoomToZ: 0,
      panToY: 0,
      duration: 2,
    },
  },

  // Services section animations
  services: {
    pxPerSecond: 300,
    fadeInDuration: 5,
    fadeOutDuration: 0.35,
    dwellTime: 4,
  },

  // Portfolio section animations
  portfolio: {
    stagger: 0.06,
    duration: 0.34,
  },
};

// Helper to check if animation is enabled
export function isAnimationEnabled(section) {
  return ANIMATION_CONFIG.enabled[section] ?? true;
}
