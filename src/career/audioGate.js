// Campaign-only scheduling. The injected adapter keeps this lifecycle policy
// testable without starting Web Audio or interpreting events as heard sound.
export function createCampaignAudioGate({ resume, isRunning, play, silence, dispose,
  now = () => performance.now(), maxDeferredMs = 200 }) {
  let enabled = false, active = true, closed = false, epoch = 0;
  let pendingResume = null, resumeStarted = 0, latestDeferred = 0;
  const safely = callback => { try { return callback(); } catch { return undefined; } };
  const running = () => safely(isRunning) === true;
  const cancel = () => { epoch += 1; latestDeferred += 1; safely(silence); };

  function ensureAudio() {
    if (closed || !active) return Promise.resolve(false);
    if (running()) return Promise.resolve(true);
    if (pendingResume && now() - resumeStarted <= maxDeferredMs) return pendingResume;
    // Invoke resume now, before any promise continuation, so a caller's trusted
    // click/key gesture is still available. This function never starts a cue.
    let attempt;
    resumeStarted = now();
    try { attempt = resume(); } catch { return Promise.resolve(false); }
    const pending = Promise.resolve(attempt).then(() => !closed && active && running(), () => false);
    pendingResume = pending;
    pending.then(() => { if (pendingResume === pending) pendingResume = null; });
    return pending;
  }
  function syncSound(value) {
    if (closed) return;
    const next = value === true;
    if (!next && enabled) cancel();
    enabled = next;
  }
  function muteImmediately() {
    if (closed) return;
    enabled = false;
    cancel();
  }
  function setActive(value) {
    if (closed) return;
    active = value === true;
    if (!active) cancel();
  }
  function playCue(cue) {
    if (closed || !active || !enabled) return Promise.resolve(false);
    const deliver = () => {
      if (closed || !active || !enabled || !running()) return false;
      try { play(cue); return true; } catch { return false; }
    };
    if (running()) return Promise.resolve(deliver());
    // A committed action cannot create a fresh autoplay attempt after its save
    // await. It may briefly join a resume already begun in the input gesture.
    if (!pendingResume) return Promise.resolve(false);
    const requestedAt = now(), requestedEpoch = epoch, sequence = ++latestDeferred;
    return pendingResume.then(ready => ready && requestedEpoch === epoch && sequence === latestDeferred
      && now() - requestedAt <= maxDeferredMs ? deliver() : false);
  }
  function close() {
    if (closed) return;
    closed = true;
    enabled = false;
    cancel();
    safely(dispose);
  }
  return { ensureAudio, syncSound, muteImmediately, setActive, playCue, dispose: close };
}

// The accepted synthesis profile and envelopes are retained. Each campaign
// instance owns its nodes, so muting cannot mute unrelated Tone consumers.
export function createCampaignAudioVoice(Tone, profile) {
  let nodes = null;
  function silence() {
    if (!nodes) return;
    const existing = nodes;
    nodes = null;
    // Disconnect the local bus before disposal, including scheduled tail notes.
    try { existing.output.disconnect(); } catch { /* already disconnected */ }
    for (const node of Object.values(existing)) {
      try { node.dispose(); } catch { /* keep cleaning up other owned nodes */ }
    }
  }
  function getNodes() {
    if (nodes) return nodes;
    const built = {};
    const own = (name, node) => (built[name] = node);
    try {
      const output = own('output', new Tone.Gain(1)).toDestination();
      const noise = (id, envelope) => {
        const config = profile[id];
        const filter = own(`${id}Filter`, new Tone.Filter(config.frequency, config.filterType)).connect(output);
        const synth = own(id, new Tone.NoiseSynth({ noise: { type: config.noise }, envelope })).connect(filter);
        synth.volume.value = config.volume;
        return synth;
      };
      noise('pickup', { attack: 0.008, decay: 0.11, sustain: 0, release: 0.08 });
      noise('merge', { attack: 0.002, decay: 0.16, sustain: 0, release: 0.1 });
      noise('cut', { attack: 0.01, decay: 0.24, sustain: 0, release: 0.12 });
      noise('denied', { attack: 0.004, decay: 0.08, sustain: 0, release: 0.04 });
      const thunk = own('thunk', new Tone.MembraneSynth({ pitchDecay: 0.025, octaves: 1.8,
        oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.12 } })).connect(output);
      thunk.volume.value = -10;
      const rewardFilter = own('rewardFilter', new Tone.Filter(900, 'lowpass')).connect(output);
      const reward = own('reward', new Tone.Synth({ oscillator: { type: profile.reward.oscillator },
        envelope: { attack: 0.035, decay: 0.2, sustain: 0, release: 0.28 } })).connect(rewardFilter);
      reward.volume.value = profile.reward.volume;
      const arrivalFilter = own('arrivalFilter', new Tone.Filter(760, 'lowpass')).connect(output);
      const arrival = own('arrival', new Tone.PolySynth(Tone.Synth, { oscillator: { type: profile.arrival.oscillator },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.08, release: 0.55 } })).connect(arrivalFilter);
      arrival.volume.value = profile.arrival.volume;
      nodes = built;
      return nodes;
    } catch (error) {
      nodes = built;
      silence();
      throw error;
    }
  }
  function play(cue) {
    if (!['pickup', 'merge', 'cut', 'denied', 'reward', 'arrival'].includes(cue)) return;
    const n = getNodes();
    // Interactive cues use the actual audio clock, not Tone's sequencer
    // look-ahead (normally 100ms). No global context setting is changed.
    const now = Tone.immediate() + 0.005;
    if (cue === 'pickup') n.pickup.triggerAttackRelease(0.1, now);
    if (cue === 'merge') {
      n.merge.triggerAttackRelease(0.14, now);
      n.thunk.triggerAttackRelease('C2', 0.16, now + 0.015);
    }
    if (cue === 'cut') {
      n.cutFilter.frequency.cancelScheduledValues(now);
      n.cutFilter.frequency.setValueAtTime(780, now);
      n.cutFilter.frequency.exponentialRampToValueAtTime(240, now + 0.2);
      n.cut.triggerAttackRelease(0.22, now);
    }
    if (cue === 'denied') n.denied.triggerAttackRelease(0.07, now);
    if (cue === 'reward') {
      n.thunk.triggerAttackRelease('C2', 0.13, now);
      n.reward.triggerAttackRelease('G3', 0.22, now + 0.08);
    }
    if (cue === 'arrival') {
      n.thunk.triggerAttackRelease('C2', 0.18, now);
      n.arrival.triggerAttackRelease(['C3', 'G3'], 0.5, now + 0.09);
    }
  }
  return { play, silence, dispose: silence };
}
