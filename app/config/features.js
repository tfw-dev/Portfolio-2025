export const FEATURES = {
  // Page sections
  CANVAS: true,
  HERO: true,
  SERVICES: false,
  PORTFOLIO: false,
  ABOUT: false,

  // Animations
  SCROLL_ANIMATIONS: false,
  BLOB_ANIMATIONS: true,
  PARALLAX: true,

  // Interactive features
  MOUSE_FOLLOW: false, // Already disabled in code
  KEYBOARD_SHORTCUTS: false,

  // Debug/development
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  SHOW_ERROR_BOUNDARIES: process.env.NODE_ENV === 'development',
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature to check
 * @returns {boolean} - Whether the feature is enabled
 */
export function isFeatureEnabled(featureName) {
  return FEATURES[featureName] ?? false;
}

/**
 * Get all enabled features
 * @returns {string[]} - Array of enabled feature names
 */
export function getEnabledFeatures() {
  return Object.keys(FEATURES).filter((key) => FEATURES[key]);
}
