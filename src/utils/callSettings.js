const KEY = 'eganira_call_settings';

const DEFAULTS = {
  speakerOn: true,
  defaultSpeaker: true,
  ringVolume: 0.4,
};

export function getCallSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setCallSettings(partial) {
  const next = { ...getCallSettings(), ...partial };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
