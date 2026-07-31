// Cynthia's accepted direction is material and gentle: no sharp pings or high-pass transients.
export const AUDIO_PROFILE = Object.freeze({
  pickup: { noise: "pink", filterType: "lowpass", frequency: 820, volume: -12 },
  merge: { noise: "brown", filterType: "lowpass", frequency: 460, volume: -5 },
  cut: { noise: "brown", filterType: "bandpass", frequency: 520, volume: -9 },
  denied: { noise: "brown", filterType: "lowpass", frequency: 180, volume: -14 },
  reward: { oscillator: "triangle", frequency: 196, volume: -14 },
  arrival: { oscillator: "sine", frequency: 130.81, volume: -12 },
});

export const MAX_GENTLE_FREQUENCY = 1200;
