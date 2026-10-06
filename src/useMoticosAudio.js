import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { AUDIO_PROFILE } from "./audioProfile.js";

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

    const pickupFilter = new Tone.Filter(
      AUDIO_PROFILE.pickup.frequency,
      AUDIO_PROFILE.pickup.filterType
    ).toDestination();
    const pickup = new Tone.NoiseSynth({
      noise: { type: AUDIO_PROFILE.pickup.noise },
      envelope: { attack: 0.008, decay: 0.11, sustain: 0, release: 0.08 },
    }).connect(pickupFilter);
    pickup.volume.value = AUDIO_PROFILE.pickup.volume;

    const mergeFilter = new Tone.Filter(
      AUDIO_PROFILE.merge.frequency,
      AUDIO_PROFILE.merge.filterType
    ).toDestination();
    const mergeNoise = new Tone.NoiseSynth({
      noise: { type: AUDIO_PROFILE.merge.noise },
      envelope: { attack: 0.002, decay: 0.16, sustain: 0, release: 0.1 },
    }).connect(mergeFilter);
    mergeNoise.volume.value = AUDIO_PROFILE.merge.volume;

    const thunk = new Tone.MembraneSynth({
      pitchDecay: 0.025,
      octaves: 1.8,
      oscillator: { type: "sine" },
      envelope: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.12 },
    }).toDestination();
    thunk.volume.value = -10;

    const cutFilter = new Tone.Filter(
      AUDIO_PROFILE.cut.frequency,
      AUDIO_PROFILE.cut.filterType
    ).toDestination();
    const cut = new Tone.NoiseSynth({
      noise: { type: AUDIO_PROFILE.cut.noise },
      envelope: { attack: 0.01, decay: 0.24, sustain: 0, release: 0.12 },
    }).connect(cutFilter);
    cut.volume.value = AUDIO_PROFILE.cut.volume;

    const deniedFilter = new Tone.Filter(
      AUDIO_PROFILE.denied.frequency,
      AUDIO_PROFILE.denied.filterType
    ).toDestination();
    const denied = new Tone.NoiseSynth({
      noise: { type: AUDIO_PROFILE.denied.noise },
      envelope: { attack: 0.004, decay: 0.08, sustain: 0, release: 0.04 },
    }).connect(deniedFilter);
    denied.volume.value = AUDIO_PROFILE.denied.volume;

    const rewardFilter = new Tone.Filter(900, "lowpass").toDestination();
    const reward = new Tone.Synth({
      oscillator: { type: AUDIO_PROFILE.reward.oscillator },
      envelope: { attack: 0.035, decay: 0.2, sustain: 0, release: 0.28 },
    }).connect(rewardFilter);
    reward.volume.value = AUDIO_PROFILE.reward.volume;

    const arrivalFilter = new Tone.Filter(760, "lowpass").toDestination();
    const arrival = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: AUDIO_PROFILE.arrival.oscillator },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.08, release: 0.55 },
    }).connect(arrivalFilter);
    arrival.volume.value = AUDIO_PROFILE.arrival.volume;

    synthsRef.current = {
      pickupFilter,
      pickup,
      mergeFilter,
      mergeNoise,
      thunk,
      cutFilter,
      cut,
      deniedFilter,
      denied,
      rewardFilter,
      reward,
      arrivalFilter,
      arrival,
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
    playPickup: () => safePlay(() => getSynths().pickup.triggerAttackRelease(0.1)),
    playMerge: () =>
      safePlay(() => {
        const { mergeNoise, thunk } = getSynths();
        const now = Tone.now();
        mergeNoise.triggerAttackRelease(0.14, now);
        thunk.triggerAttackRelease("C2", 0.16, now + 0.015);
      }),
    playCut: () =>
      safePlay(() => {
        const { cut, cutFilter } = getSynths();
        const now = Tone.now();
        cutFilter.frequency.cancelScheduledValues(now);
        cutFilter.frequency.setValueAtTime(780, now);
        cutFilter.frequency.exponentialRampToValueAtTime(240, now + 0.2);
        cut.triggerAttackRelease(0.22, now);
      }),
    playReward: () =>
      safePlay(() => {
        const { reward, thunk } = getSynths();
        const now = Tone.now();
        thunk.triggerAttackRelease("C2", 0.13, now);
        reward.triggerAttackRelease("G3", 0.22, now + 0.08);
      }),
    playArrival: () =>
      safePlay(() => {
        const { arrival, thunk } = getSynths();
        const now = Tone.now();
        thunk.triggerAttackRelease("C2", 0.18, now);
        arrival.triggerAttackRelease(["C3", "G3"], 0.5, now + 0.09);
      }),
    playDenied: () => safePlay(() => getSynths().denied.triggerAttackRelease(0.07)),
    playEnabledCue: () =>
      ensureAudio().then(() => getSynths().pickup.triggerAttackRelease(0.1)).catch(() => {}),
  };
}
