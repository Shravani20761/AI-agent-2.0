/** In-memory demo selection. It does not change the CRM voice widget or Dograh dialer. */
let activeMode = 'GEMINI_LIVE';

export function getActiveMode() {
  return activeMode;
}

export function setActiveMode(mode) {
  activeMode = mode;
  return activeMode;
}
