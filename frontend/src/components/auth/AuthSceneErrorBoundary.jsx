import { Component } from 'react';
import AuthSceneFallback from './AuthSceneFallback';

/**
 * Isolates WebGL / lazy-chunk errors inside the decorative 3D visual
 * so authentication remains completely usable under all browser conditions.
 */
export default class AuthSceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Graceful silent fallback; avoid noisy error propagation on WebGL failures
  }

  render() {
    if (this.state.hasError) {
      return <AuthSceneFallback variant={this.props.variant || 'desktop'} reason="error-boundary" />;
    }
    return this.props.children;
  }
}
