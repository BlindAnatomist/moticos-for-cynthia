import { useEffect, useRef } from "react";
import * as Tone from "tone";

export default function useMoticosAudio(soundOn) {
  const synthsRef = useRef(null);

  useEffect(() => {
    return () => {
      if (!synthsRef.current) return;
      Object.values(synthsRef.current).forEach((node) => {
        if (node && typeof node.dispose === "function") node.dispose();
      });
      synthsRef.current = null;
    };
  }, []);

  function getSynths() {
    if (synthsRef.current) return synthsRef.current;

    const pickupFilter = new Tone.Filter(2600, "highpass").toDestination();
    const pickup = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.03 },
    }).connect(pickupFilter);
    pickup.volume.value = -6;

    const pasteFilter = new Tone.Filter(650, "lowpass").toDestination();
    const paste = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.08 },
    }).connect(pasteFilter);
    paste.volume.value = 2;

    const flutterFilter = new Tone.Filter(2200, "highpass").toDestination();
    const flutter = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
    }).connect(flutterFilter);
    flutter.volume.value = -8;

    const tearFilter = new Tone.Filter(3000, "bandpass").toDestination();
    const tear = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.002, decay: 0.24, sustain: 0, release: 0.06 },
    }).connect(tearFilter);
    tear.volume.value = 0;

    const tapeFilter = new Tone.Filter(1800, "highpass").toDestination();
    const tape = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
    }).connect(tapeFilter);
    tape.volume.value = -4;

    const deniedFilter = new Tone.Filter(300, "lowpass").toDestination();
    const denied = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
    }).connect(deniedFilter);
    denied.volume.value = -10;

    synthsRef.current = {
      pickupFilter,
      pickup,
      pasteFilter,
      paste,
      flutterFilter,
      flutter,
      tearFilter,
      tear,
      tapeFilter,
      tape,
      deniedFilter,
      denied,
    };
    return synthsRef.current;
  }

  async function ensureAudio() {
    try {
      if (Tone.context.state !== "running") await Tone.start();
    } catch {
      // The game remains playable when Web Audio is unavailable.
    }
  }

  function safePlay(callback) {
    if (!soundOn) return;
    ensureAudio().then(callback).catch(() => {});
  }

  return {
    ensureAudio,
    playPickup: () => safePlay(() => getSynths().pickup.triggerAttackRelease(0.09)),
    playPaste: () =>
      safePlay(() => {
        const { paste, flutter } = getSynths();
        paste.triggerAttackRelease(0.13);
        flutter.triggerAttackRelease(0.05, Tone.now() + 0.03);
      }),
    playTear: () =>
      safePlay(() => {
        const { tear, tearFilter } = getSynths();
        const now = Tone.now();
        tearFilter.frequency.cancelScheduledValues(now);
        tearFilter.frequency.setValueAtTime(4200, now);
        tearFilter.frequency.exponentialRampToValueAtTime(300, now + 0.16);
        tear.triggerAttackRelease(0.2);
      }),
    playBonus: () =>
      safePlay(() => {
        const { paste, tape, tapeFilter, flutter } = getSynths();
        paste.triggerAttackRelease(0.14);
        flutter.triggerAttackRelease(0.05, Tone.now() + 0.03);
        const now = Tone.now();
        tapeFilter.frequency.cancelScheduledValues(now);
        tapeFilter.frequency.setValueAtTime(1200, now);
        tapeFilter.frequency.exponentialRampToValueAtTime(3800, now + 0.3);
        tape.triggerAttackRelease(0.32, now + 0.06);
      }),
    playDenied: () => safePlay(() => getSynths().denied.triggerAttackRelease(0.07)),
    playEnabledCue: () =>
      ensureAudio().then(() => getSynths().pickup.triggerAttackRelease(0.09)),
  };
}
