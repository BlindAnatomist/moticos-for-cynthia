import { useEffect, useRef } from 'react';
import { Gain, Filter, NoiseSynth, MembraneSynth, Synth, PolySynth, immediate, start, getContext } from 'tone';
import { AUDIO_PROFILE } from '../audioProfile.js';
import { createCampaignAudioGate, createCampaignAudioVoice } from './audioGate.js';

const synthesis = { Gain, Filter, NoiseSynth, MembraneSynth, Synth, PolySynth, immediate };

export default function useCampaignAudio(soundOn) {
  const gateRef = useRef(null), latestSound = useRef(soundOn);
  latestSound.current = soundOn;

  useEffect(() => {
    const voice = createCampaignAudioVoice(synthesis, AUDIO_PROFILE);
    const gate = createCampaignAudioGate({ ...voice, resume: () => start(),
      isRunning: () => getContext().state === 'running' });
    gateRef.current = gate;
    gate.syncSound(latestSound.current);
    const visibility = () => gate.setActive(!document.hidden);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      gate.dispose();
      if (gateRef.current === gate) gateRef.current = null;
    };
  }, []);
  useEffect(() => { gateRef.current?.syncSound(soundOn); }, [soundOn]);

  // All handlers consult the live gate, never a captured sound preference.
  const cue = name => gateRef.current?.playCue(name) ?? Promise.resolve(false);
  return {
    ensureAudio: () => gateRef.current?.ensureAudio() ?? Promise.resolve(false),
    syncSound: enabled => gateRef.current?.syncSound(enabled),
    muteImmediately: () => gateRef.current?.muteImmediately(),
    playPickup: () => cue('pickup'),
    playMerge: () => cue('merge'),
    playCut: () => cue('cut'),
    playReward: () => cue('reward'),
    playArrival: () => cue('arrival'),
    playDenied: () => cue('denied'),
    playEnabledCue: () => cue('pickup'),
  };
}
