// Keep a viewport-filling game view even when native fullscreen is unavailable.
export function createFullscreenMode(document, onChange = () => {}, orientation = null) {
  const root = document.documentElement;
  let active = false, nativeSeen = false, orientationLocked = false;
  function releaseOrientation() {
    if (!orientationLocked) return;
    orientationLocked = false;
    try { orientation?.unlock?.(); } catch { /* The layout can still return to normal. */ }
  }
  async function lockLandscape() {
    if (!active || !orientation?.lock) return;
    try {
      await orientation.lock('landscape'); orientationLocked = true;
      if (!active) releaseOrientation();
    } catch { /* The rotated landscape layout remains available. */ }
  }
  const native = () => !!root && (document.fullscreenElement === root || document.webkitFullscreenElement === root);
  function setActive(value) {
    if (active === value) return;
    active = value; if (!active) releaseOrientation(); onChange(active);
  }
  async function exitNative() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!native() || !exit) return;
    try { await exit.call(document); } catch { /* The normal layout remains available. */ }
  }
  async function leave() { setActive(false); await exitNative(); }
  async function toggle() {
    if (active) { await leave(); return; }
    setActive(true);
    try {
      if (root?.requestFullscreen && document.fullscreenEnabled !== false) await root.requestFullscreen({ navigationUI: 'hide' });
      else if (root?.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false) await root.webkitRequestFullscreen();
    } catch { /* A declined request keeps the game in its viewport-filling view. */ }
    if (native()) { nativeSeen = true; if (!active) await exitNative(); }
    await lockLandscape();
  }
  function sync() {
    if (native()) { nativeSeen = true; if (!active) void exitNative(); }
    else if (nativeSeen) { nativeSeen = false; setActive(false); }
  }
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  return { get active() { return active; }, toggle, leave };
}
