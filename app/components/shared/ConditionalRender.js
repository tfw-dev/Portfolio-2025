import { isFeatureEnabled } from '../../config/features';
import SafeWrapper from './SafeWrapper';

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
