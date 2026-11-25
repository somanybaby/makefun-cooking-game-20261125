// Tiny synthesized sound bank for Golden Ladle Kitchen.
// No audio files: every sound is a short WebAudio oscillator blip,
// created on the first user gesture (browsers block audio before that).
// M toggles mute; everything here is optional chrome for the game.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Call from a user gesture (key, click) so the context may start.
  unlock() {
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      } catch (err) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  pickup() {
    this.tone(520, 0.09, 'triangle', 0.1);
  }

  place() {
    this.tone(340, 0.08, 'triangle', 0.1);
    this.tone(510, 0.1, 'triangle', 0.08, 0.05);
  }

  grillStart() {
    this.tone(220, 0.12, 'sawtooth', 0.05, 0, 330);
  }

  pattyReady() {
    this.tone(880, 0.1, 'sine', 0.09);
    this.tone(1174, 0.14, 'sine', 0.08, 0.09);
  }

  orderPop() {
    this.tone(660, 0.08, 'triangle', 0.08);
    this.tone(880, 0.1, 'triangle', 0.08, 0.07);
  }

  serve() {
    // Little cash-register arpeggio.
    this.tone(784, 0.1, 'triangle', 0.11);
    this.tone(988, 0.1, 'triangle', 0.11, 0.09);
    this.tone(1319, 0.22, 'triangle', 0.12, 0.18);
  }

  error() {
    this.tone(160, 0.18, 'square', 0.07, 0, 110);
  }

  expire() {
    this.tone(392, 0.16, 'sawtooth', 0.06, 0, 196);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.11, i * 0.11));
  }

  tick() {
    this.tone(980, 0.05, 'square', 0.045);
  }
}
