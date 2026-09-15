export function isNativeApp(win = globalThis.window) {
  try {
    if (win?.Capacitor?.isNativePlatform?.()) return true;
  } catch (_) {}
  return win?.location?.protocol === 'capacitor:';
}

export function isStandaloneLaunch(win = globalThis.window, nav = globalThis.navigator) {
  const displayStandalone = Boolean(win?.matchMedia?.('(display-mode: standalone)')?.matches);
  return displayStandalone || nav?.standalone === true;
}

export function isIPhoneSafari(nav = globalThis.navigator) {
  const ua = nav?.userAgent || '';
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA)/i.test(ua);
  return isIPhone && isSafari;
}

export function getLaunchContext(win = globalThis.window, nav = globalThis.navigator) {
  if (isStandaloneLaunch(win, nav)) return 'home-screen';
  if (isIPhoneSafari(nav)) return 'iphone-safari';
  return 'browser';
}

export function shouldOfferInstall({ win = globalThis.window, nav = globalThis.navigator, dismissed = false } = {}) {
  return !isNativeApp(win) && isIPhoneSafari(nav) && !isStandaloneLaunch(win, nav) && !dismissed;
}

