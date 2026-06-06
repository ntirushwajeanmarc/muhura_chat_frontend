import { getNotificationPrefs } from './notifications';

let messageAudio;
let ringAudio;
let unlocked = false;

function getMessageAudio() {
  if (typeof Audio === 'undefined') return null;
  if (!messageAudio) {
    messageAudio = new Audio('/sounds/message.wav');
    messageAudio.preload = 'auto';
  }
  return messageAudio;
}

function getRingAudio() {
  if (typeof Audio === 'undefined') return null;
  if (!ringAudio) {
    ringAudio = new Audio('/sounds/ring.wav');
    ringAudio.preload = 'auto';
    ringAudio.loop = true;
  }
  return ringAudio;
}

/** Call once after user interaction so mobile browsers allow playback */
export function unlockSounds() {
  if (unlocked) return;
  unlocked = true;
  [getMessageAudio(), getRingAudio()].forEach((audio) => {
    if (!audio) return;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {});
    }
  });
}

export function playMessageAlert() {
  const prefs = getNotificationPrefs();
  if (!prefs.enabled || !prefs.sound) return;
  const audio = getMessageAudio();
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function playCallAlert() {
  const audio = getRingAudio();
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function stopCallAlert() {
  const audio = getRingAudio();
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

export function handleServiceWorkerAlert(data) {
  if (!data?.playSound) return;
  if (data.alertType === 'call') {
    playCallAlert();
    return;
  }
  playMessageAlert();
}
