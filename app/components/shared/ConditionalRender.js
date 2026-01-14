import { isFeatureEnabled } from '../../config/features';
import SafeWrapper from './SafeWrapper';

/**
 * Renders a component only if its feature flag is enabled
 * Automatically wraps in error boundary for safety
 *
 * @param {Object} props
 * @param {string} props.feature - Feature flag name from config/features.js
 * @param {React.ReactNode} props.children - Component to render
 * @param {React.ReactNode} props.fallback - Optional fallback if feature is disabled
 * @param {boolean} props.showErrors - Show error UI in development (default: true)
 */
export default function ConditionalRender({
  feature,
  children,
  fallback = null,
  showErrors = true,
}) {
  // If feature is disabled, show fallback or nothing
  if (!isFeatureEnabled(feature)) {
    return fallback;
  }

  // Wrap in error boundary for safety
  return (
    <SafeWrapper showError={showErrors}>
      {children}
    </SafeWrapper>
  );
}
