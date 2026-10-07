import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignAudioGate, createCampaignAudioVoice } from '../../src/career/audioGate.js';
import { AUDIO_PROFILE } from '../../src/audioProfile.js';
import { createCareer, createReplay, commandFor, reduceCareer } from '../../src/career/engine.js';
import { createCareerSession } from '../../src/career/session.js';
import { STORAGE_KEY } from '../../src/career/content.js';

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function harness(overrides = {}) {
  let clock = 0, running = false, resumes = 0, silences = 0, disposals = 0;
  const plays = [], resumesPending = [];
  const gate = createCampaignAudioGate({ now: () => clock, isRunning: () => running,
    resume: () => { resumes += 1; const pending = deferred(); resumesPending.push(pending); return pending.promise; },
    play: cue => plays.push(cue), silence: () => { silences += 1; }, dispose: () => { disposals += 1; }, ...overrides });
  return { gate, plays, resumesPending, setRunning: value => { running = value; }, setClock: value => { clock = value; },
    counts: () => ({ resumes, silences, disposals }) };
}

test('default-off and saved-on mounting never start audio or play a cue', async () => {
  const h = harness();
  assert.equal(await h.gate.playCue('merge'), false);
  h.gate.syncSound(true);
  assert.equal(await h.gate.playCue('merge'), false);
  assert.deepEqual(h.counts(), { resumes: 0, silences: 0, disposals: 0 });
});
test('resume begins synchronously inside caller gesture, without an audible enable cue', async () => {
  const h = harness(), result = h.gate.ensureAudio();
  assert.equal(h.counts().resumes, 1);
  assert.deepEqual(h.plays, []);
  h.setRunning(true); h.resumesPending[0].resolve();
  assert.equal(await result, true);
  assert.equal(await h.gate.playCue('pickup'), false);
  h.gate.syncSound(true);
  assert.equal(await h.gate.playCue('pickup'), true);
  assert.deepEqual(h.plays, ['pickup']);
});
test('nearby gesture preparation joins one resume, then cue follows readiness', async () => {
  const h = harness(); h.gate.syncSound(true);
  const start = h.gate.ensureAudio(), second = h.gate.ensureAudio(), cue = h.gate.playCue('merge');
  assert.equal(start, second); assert.equal(h.counts().resumes, 1);
  h.setClock(40); h.setRunning(true); h.resumesPending[0].resolve();
  assert.equal(await cue, true); assert.deepEqual(h.plays, ['merge']);
});
test('mute cancels a queued cue immediately, including after quickly enabling again', async () => {
  const h = harness(); h.gate.syncSound(true); h.gate.ensureAudio();
  const cue = h.gate.playCue('reward');
  h.gate.muteImmediately(); h.gate.syncSound(true);
  h.setRunning(true); h.resumesPending[0].resolve();
  assert.equal(await cue, false); assert.deepEqual(h.plays, []);
  assert.equal(h.counts().silences, 1);
  assert.equal(await h.gate.playCue('pickup'), true);
});
test('latest committed preference wins over an old render calling a play method', async () => {
  const h = harness(); h.setRunning(true); h.gate.syncSound(true);
  const oldRender = () => h.gate.playCue('reward');
  h.gate.syncSound(false);
  assert.equal(await oldRender(), false); assert.deepEqual(h.plays, []);
});
test('unmount disposes once and never resurrects nodes after pending resume', async () => {
  const h = harness(); h.gate.syncSound(true); h.gate.ensureAudio();
  const cue = h.gate.playCue('arrival');
  h.gate.dispose(); h.gate.dispose();
  h.setRunning(true); h.resumesPending[0].resolve();
  assert.equal(await cue, false);
  h.gate.syncSound(true);
  assert.equal(await h.gate.ensureAudio(), false);
  assert.equal(await h.gate.playCue('pickup'), false);
  assert.deepEqual(h.plays, []); assert.equal(h.counts().disposals, 1);
});
test('hidden-page transition stops tails and suppresses queued work without autoplay on return', async () => {
  const h = harness(); h.gate.syncSound(true); h.gate.ensureAudio();
  const cue = h.gate.playCue('cut');
  h.gate.setActive(false); h.setRunning(true); h.resumesPending[0].resolve();
  assert.equal(await cue, false); assert.equal(await h.gate.playCue('merge'), false);
  h.gate.setActive(true);
  assert.deepEqual(h.plays, []);
  assert.equal(await h.gate.playCue('merge'), true);
});
test('a late resume drops stale cues instead of producing a detached reward', async () => {
  const h = harness(); h.gate.syncSound(true); h.gate.ensureAudio();
  const cue = h.gate.playCue('reward');
  h.setClock(201); h.setRunning(true); h.resumesPending[0].resolve();
  assert.equal(await cue, false); assert.deepEqual(h.plays, []);
});
test('a stalled resume can retry in a later genuine gesture', async () => {
  const h = harness(); h.gate.syncSound(true); h.gate.ensureAudio();
  const cue = h.gate.playCue('pickup');
  h.setClock(201); const retry = h.gate.ensureAudio();
  assert.equal(h.counts().resumes, 2);
  h.setRunning(true); h.resumesPending[1].resolve();
  assert.equal(await retry, true);
  h.resumesPending[0].resolve(); assert.equal(await cue, false);
});
test('pending cues collapse to the most recent action instead of bursting together', async () => {
  const h = harness(); h.gate.syncSound(true); h.gate.ensureAudio();
  const first = h.gate.playCue('pickup'), second = h.gate.playCue('merge');
  h.setRunning(true); h.resumesPending[0].resolve();
  assert.equal(await first, false); assert.equal(await second, true);
  assert.deepEqual(h.plays, ['merge']);
});
test('resume rejection/throw and unsupported Web Audio are quiet and retryable', async () => {
  const h = harness(); h.gate.syncSound(true);
  const start = h.gate.ensureAudio(), cue = h.gate.playCue('denied');
  h.resumesPending[0].reject(new Error('gesture denied'));
  assert.equal(await start, false); assert.equal(await cue, false);
  const retry = h.gate.ensureAudio(); h.setRunning(true); h.resumesPending[1].resolve(); assert.equal(await retry, true);
  const throwing = harness({ resume: () => { throw new Error('no audio'); } });
  assert.equal(await throwing.gate.ensureAudio(), false);
});
test('a synthesis failure does not reject into gameplay', async () => {
  const h = harness({ play: () => { throw new Error('unavailable'); } });
  h.gate.syncSound(true); h.setRunning(true);
  assert.equal(await h.gate.playCue('merge'), false);
});

function fakeTone({ failAt = Infinity } = {}) {
  const nodes = [], events = [];
  let index = 0;
  function factory(kind) {
    return class {
      constructor(...args) {
        if (++index === failAt) throw new Error('construction failed');
        this.kind = kind; this.args = args; this.volume = { value: 0 }; this.disposed = 0;
        this.frequency = Object.fromEntries(['cancelScheduledValues', 'setValueAtTime', 'exponentialRampToValueAtTime'].map(method => [method, (...values) => events.push([kind, method, ...values])]));
        nodes.push(this);
      }
      toDestination() { this.destination = true; return this; }
      connect(target) { this.target = target; return this; }
      disconnect() { this.disconnected = true; events.push([this.kind, 'disconnect']); }
      dispose() { this.disposed += 1; events.push([this.kind, 'dispose']); }
      triggerAttackRelease(...args) { events.push([this.kind, 'play', ...args]); }
    };
  }
  const Tone = Object.fromEntries(['Gain', 'Filter', 'NoiseSynth', 'MembraneSynth', 'Synth', 'PolySynth'].map(kind => [kind, factory(kind)]));
  Tone.immediate = () => 10;
  Tone.now = () => { throw new Error('Do not add transport look-ahead to gesture feedback'); };
  return { Tone, nodes, events };
}
test('voice creates no nodes before a cue, owns one output, and retains profile values', () => {
  const h = fakeTone(), voice = createCampaignAudioVoice(h.Tone, AUDIO_PROFILE);
  assert.equal(h.nodes.length, 0);
  voice.play('pickup');
  assert.equal(h.nodes.filter(node => node.destination).length, 1);
  assert.equal(h.nodes.find(node => node.destination).kind, 'Gain');
  const noiseNodes = h.nodes.filter(node => node.kind === 'NoiseSynth');
  assert.deepEqual(noiseNodes.map(node => [node.args[0].noise.type, node.volume.value]),
    ['pickup', 'merge', 'cut', 'denied'].map(name => [AUDIO_PROFILE[name].noise, AUDIO_PROFILE[name].volume]));
  assert.deepEqual(h.events.find(event => event[1] === 'play'), ['NoiseSynth', 'play', 0.1, 10.005]);
});
test('merge, reward and arrival preserve the existing short material/note ordering', () => {
  const h = fakeTone(), voice = createCampaignAudioVoice(h.Tone, AUDIO_PROFILE);
  voice.play('merge'); voice.play('reward'); voice.play('arrival');
  const played = h.events.filter(event => event[1] === 'play');
  assert.equal(played.length, 6);
  assert.deepEqual(played[0], ['NoiseSynth', 'play', 0.14, 10.005]);
  assert.equal(played[1][2], 'C2'); assert.ok(Math.abs(played[1].at(-1) - 10.020) < 1e-10);
  assert.equal(played[3][2], 'G3'); assert.ok(Math.abs(played[3].at(-1) - 10.085) < 1e-10);
  assert.deepEqual(played[5][2], ['C3', 'G3']);
});
test('cut retains the downward paper-frequency sweep, never a high ping', () => {
  const h = fakeTone(), voice = createCampaignAudioVoice(h.Tone, AUDIO_PROFILE); voice.play('cut');
  assert.deepEqual(h.events.filter(event => event[0] === 'Filter'), [
    ['Filter', 'cancelScheduledValues', 10.005], ['Filter', 'setValueAtTime', 780, 10.005],
    ['Filter', 'exponentialRampToValueAtTime', 240, 10.205],
  ]);
});
test('mute disconnects the instance bus before disposing every owned node and can recreate cleanly', () => {
  const h = fakeTone(), voice = createCampaignAudioVoice(h.Tone, AUDIO_PROFILE); voice.play('reward');
  const firstNodes = [...h.nodes]; h.events.length = 0; voice.silence();
  assert.deepEqual(h.events[0], ['Gain', 'disconnect']);
  assert.ok(firstNodes.every(node => node.disposed === 1));
  voice.dispose(); assert.ok(firstNodes.every(node => node.disposed === 1));
  voice.play('pickup'); assert.equal(h.nodes.length, firstNodes.length * 2);
  voice.dispose(); assert.ok(h.nodes.every(node => node.disposed === 1));
});
test('partial node-construction failure cleans up the nodes already allocated', () => {
  const h = fakeTone({ failAt: 5 }), voice = createCampaignAudioVoice(h.Tone, AUDIO_PROFILE);
  assert.throws(() => voice.play('merge'), /construction failed/);
  assert.ok(h.nodes.every(node => node.disposed === 1));
});

function savedSession() {
  const bytes = new Map(); let denied = false;
  const storage = { getItem: key => bytes.get(key) ?? null,
    setItem: (key, value) => { if (denied) throw new Error('write denied'); bytes.set(key, value); } };
  const options = { storage, locks: { request: async (_name, _options, work) => work() }, makeCareer: () => createCareer('audio-setting') };
  return { bytes, options, session: createCareerSession(options), denyWrites: () => { denied = true; } };
}
test('sound starts off, opt-in survives session reopen, and mute persists in the campaign namespace', async () => {
  const h = savedSession(), opened = await h.session.open(); assert.equal(opened.state.sound, false);
  const enabled = await h.session.commit(commandFor(opened.state, { type: 'sound', enabled: true }));
  assert.equal(enabled.saved, true); assert.equal(enabled.state.sound, true);
  const reopened = createCareerSession(h.options), restored = await reopened.open(); assert.equal(restored.state.sound, true);
  const muted = await reopened.commit(commandFor(restored.state, { type: 'sound', enabled: false }));
  assert.equal(muted.saved, true); assert.equal(JSON.parse(h.bytes.get(STORAGE_KEY)).sound, false);
  assert.deepEqual([...h.bytes.keys()], [STORAGE_KEY]);
});
test('a failed preference write is temporary and never alters previously saved bytes', async () => {
  const h = savedSession(), opened = await h.session.open(), original = h.bytes.get(STORAGE_KEY);
  h.denyWrites();
  const result = await h.session.commit(commandFor(opened.state, { type: 'sound', enabled: true }));
  assert.equal(result.saved, false); assert.equal(result.status, 'practice'); assert.equal(result.state.sound, true);
  assert.equal(h.bytes.get(STORAGE_KEY), original);
});
test('replay sound changes are isolated from the persistent career setting', async () => {
  const h = savedSession(); await h.session.open(); const original = h.bytes.get(STORAGE_KEY);
  const replay = createReplay('garden-letter-1', 'audio-replay');
  const result = reduceCareer(replay, commandFor(replay, { type: 'sound', enabled: true }));
  assert.equal(result.ok, true); assert.equal(result.state.sound, true);
  assert.equal(h.bytes.get(STORAGE_KEY), original);
});
