/**
 * Web Audio API synthesized audio alerts (no external audio files required)
 */
class SoundService {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playAlertBeep(isCritical: boolean = false): void {
    if (!this.enabled) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isCritical ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isCritical ? 880 : 587.33, ctx.currentTime); // A5 or D5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isCritical ? 0.35 : 0.2));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + (isCritical ? 0.35 : 0.2));

      if (isCritical) {
        // Second quick chirp for critical alerts
        setTimeout(() => {
          if (!this.enabled || !this.ctx) return;
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'sawtooth';
          osc2.frequency.setValueAtTime(1046.5, this.ctx.currentTime); // C6
          gain2.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.start();
          osc2.stop(this.ctx.currentTime + 0.35);
        }, 120);
      }
    } catch {
      // Audio context might be blocked prior to user interaction
    }
  }
}

export const soundService = new SoundService();
