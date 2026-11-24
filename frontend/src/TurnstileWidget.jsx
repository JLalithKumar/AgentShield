import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

// Official Cloudflare Turnstile public test sitekey (always passes)
export const DEFAULT_TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const TurnstileWidget = forwardRef(function TurnstileWidget(
  {
    siteKey = DEFAULT_TURNSTILE_SITE_KEY,
    action = 'auth',
    onVerify,
    onExpire,
    onError,
    theme = 'light',
  },
  ref
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Expose reset method to parent forms
  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // Ignore reset error
        }
      }
    },
  }));

  // In test environments (Vitest / JSDOM), provide test mock helpers
  const isTestMode = import.meta.env.MODE === 'test';

  useEffect(() => {
    if (isTestMode) {
      // In test mode, if window.turnstile is not present, auto-emit mock verification
      // unless overridden by test fixtures
      if (typeof window.turnstile === 'undefined') {
        const timer = setTimeout(() => {
          if (onVerify) onVerify('mock-turnstile-valid-token');
        }, 50);
        return () => clearTimeout(timer);
      }
    }

    // Load official Turnstile script if not already in document
    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        setLoadError(true);
        if (onError) onError('Failed to load Cloudflare Turnstile script.');
      };
      document.head.appendChild(script);
    } else {
      if (window.turnstile) {
        setScriptLoaded(true);
      } else {
        script.addEventListener('load', () => setScriptLoaded(true));
      }
    }
  }, [isTestMode, onError, onVerify]);

  // Render Turnstile widget once script and container are ready
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    try {
      // Clean up any previously rendered widget
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme,
        size: 'normal',
        callback: token => {
          if (onVerify) onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': errorCode => {
          if (onError) onError(errorCode || 'Turnstile challenge failed.');
        },
      });

      widgetIdRef.current = id;
    } catch (err) {
      if (onError) onError('Error rendering Turnstile challenge.');
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore unmount error
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, action, theme, onVerify, onExpire, onError]);

  return (
    <div
      className="turnstile-container"
      data-testid="turnstile-widget"
      role="region"
      aria-label="Cloudflare Turnstile Bot Protection"
    >
      <div ref={containerRef} className="turnstile-render-box" />

      {loadError && (
        <div className="turnstile-error-notice" role="alert">
          <small>Security challenge provider is currently unreachable. Please check your connection.</small>
        </div>
      )}

      {/* Accessible fallback text for screen readers */}
      <span className="sr-only">
        Security verification by Cloudflare Turnstile to protect against automated bots.
      </span>
    </div>
  );
});

export default TurnstileWidget;
