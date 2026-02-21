export class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      } catch (e) {
        console.warn("AudioContext not supported or blocked", e);
      }
    }
    return this.ctx;
  }

  resume() {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  playSwing() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      this.resume();
      const t = ctx.currentTime;

      // 1. "Whoosh" Noise (Air cutting sound)
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(400, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
      noiseFilter.Q.value = 1;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      noiseGain.gain.linearRampToValueAtTime(0, t + 0.2);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

      // 2. Subtle low pitch drop for "weight"
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
      
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.1, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);

    } catch (e) {}
  }

  playSmash() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      this.resume();
      const t = ctx.currentTime;

      // 1. Punchy Kick (Low Sine Drop)
      const kick = ctx.createOscillator();
      kick.frequency.setValueAtTime(200, t);
      kick.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      
      const kickGain = ctx.createGain();
      kickGain.gain.setValueAtTime(1, t);
      kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      
      kick.connect(kickGain);
      kickGain.connect(ctx.destination);
      kick.start(t);
      kick.stop(t + 0.2);

      // 2. Comic "Bonk" Tone (Square wave slide)
      const bonk = ctx.createOscillator();
      bonk.type = 'square';
      bonk.frequency.setValueAtTime(400, t);
      bonk.frequency.linearRampToValueAtTime(100, t + 0.1);

      const bonkGain = ctx.createGain();
      bonkGain.gain.setValueAtTime(0.2, t);
      bonkGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      bonk.connect(bonkGain);
      bonkGain.connect(ctx.destination);
      bonk.start(t);
      bonk.stop(t + 0.15);

      // 3. Impact Crunch (Filtered Noise)
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 1000;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

    } catch (e) {}
  }

  playMegaBonk() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      this.resume();
      const t = ctx.currentTime;

      // 1. Massive Sub Bass Drop
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(80, t);
      sub.frequency.exponentialRampToValueAtTime(10, t + 1.0);
      
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(1.0, t);
      subGain.gain.linearRampToValueAtTime(0, t + 1.0);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(t);
      sub.stop(t + 1.0);

      // 2. "Laser" Charge Down
      const laser = ctx.createOscillator();
      laser.type = 'sawtooth';
      laser.frequency.setValueAtTime(1500, t);
      laser.frequency.exponentialRampToValueAtTime(100, t + 0.4);

      const laserGain = ctx.createGain();
      laserGain.gain.setValueAtTime(0.3, t);
      laserGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      laser.connect(laserGain);
      laserGain.connect(ctx.destination);
      laser.start(t);
      laser.stop(t + 0.4);

      // 3. Explosion Noise
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(200, t);
      noiseFilter.frequency.linearRampToValueAtTime(1000, t + 0.2); // Explosion expanding

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.0, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

    } catch (e) {}
  }

  playMineHit() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      this.resume();
      const t = ctx.currentTime;

      // Dissonant interval (Tritone-ish)
      const freq1 = 200;
      const freq2 = 290; // Dissonant

      [freq1, freq2].forEach(f => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.linearRampToValueAtTime(f * 0.5, t + 0.4); // Pitch down "fail"

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });

      // Static Burst
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, t);
      noiseGain.gain.linearRampToValueAtTime(0, t + 0.3);
      
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

    } catch (e) {}
  }

  playClick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      this.resume();
      const t = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      osc.type = 'square'; // More 8-bit click
      osc.frequency.setValueAtTime(800, t);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  playGameOver() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      this.resume();
      const t = ctx.currentTime;

      // Sad slide
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(50, t + 1.5); // Long slide down

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, t);
      filter.frequency.linearRampToValueAtTime(100, t + 1.5); // Filter closing

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.linearRampToValueAtTime(0, t + 1.5);

      // Add vibrato for "wobbly" sad effect
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 10;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.5);

    } catch (e) {}
  }

  playMissionComplete() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      this.resume();
      const t = ctx.currentTime;
      
      // Major Arpeggio with Square waves (retro feel)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C E G C E G
      const duration = 0.1;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        
        const gain = ctx.createGain();
        const startTime = t + i * 0.08;
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      });
      
      // Final chord
      setTimeout(() => {
          if (!ctx) return;
          [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
             const osc = ctx.createOscillator();
             osc.type = 'triangle';
             osc.frequency.value = freq;
             const gain = ctx.createGain();
             const st = ctx.currentTime;
             gain.gain.setValueAtTime(0.05, st);
             gain.gain.linearRampToValueAtTime(0, st + 0.5);
             osc.connect(gain);
             gain.connect(ctx.destination);
             osc.start(st);
             osc.stop(st + 0.5);
          });
      }, notes.length * 80);

    } catch (e) {}
  }
}

export const soundManager = new SoundManager();