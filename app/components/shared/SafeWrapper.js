import React from 'react';

class SafeWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Component error caught by SafeWrapper:', error, errorInfo);
    }

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      if (this.props.showError && process.env.NODE_ENV === 'development') {
        return (
          <div style={{ padding: '20px', border: '2px solid red', margin: '10px' }}>
            <h3>Component Error</h3>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {this.state.error?.toString()}
            </pre>
          </div>
        );
      }

      // Silent failure - just hide the component
      return null;
    }

    return this.props.children;
  }
}

export default SafeWrapper;
