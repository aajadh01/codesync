/**
 * Detects whether CodeSync is running inside the native Android wrapper (WebView / CodeSyncApp)
 * versus a standard desktop or mobile web browser.
 */
export const isCodeSyncNativeApp = () => {
  if (typeof window === 'undefined') return false;
  try {
    const ua = navigator.userAgent || '';
    const hasBridge = Boolean(window.CodeSyncNative) || Boolean(window.isCodeSyncApp);
    const hasInAppStorage = localStorage.getItem('codesync_in_app') === 'true';
    const isCustomUA = /CodeSyncApp/i.test(ua);
    const isWebView = /;\s*wv\b|Version\/[0-9.]+\s+Chrome/i.test(ua) && hasInAppStorage;

    return hasBridge || hasInAppStorage || isCustomUA || isWebView;
  } catch {
    return false;
  }
};

export default isCodeSyncNativeApp;
