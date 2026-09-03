import { Vinyl3D } from './Vinyl3D.js';

class MusicPlayerManager {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.isLightOn = false;
    this.buttonEl = null;
    this.iconEl = null;
    this.textEl = null;
    this.badgeEl = null;

    // Web Audio Fallback Synth
    this.audioCtx = null;
    this.synthOscs = [];
    this.synthGain = null;
  }

  init() {
    this.buttonEl = document.getElementById('music-btn');
    this.badgeEl = document.getElementById('now-playing-badge');

    if (this.buttonEl) {
      this.iconEl = this.buttonEl.querySelector('.btn-icon');
      this.textEl = this.buttonEl.querySelector('.btn-text');

      this.buttonEl.addEventListener('click', (e) => {
        e.preventDefault();
        this.togglePlay();
      });

      this.buttonEl.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      }, { passive: true });
    }

    // Simple, direct relative URL — works with Vite base: './'
    // On GitHub Pages: https://ecstazane.github.io/monthsarry/assets/blessed.mp3
    this.audio = new Audio('./assets/blessed.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.85;
    this.audio.preload = 'auto';

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.setGlobalLighting(true);
      this.updateUI(true);
      Vinyl3D.setSpinning(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.setGlobalLighting(false);
      this.updateUI(false);
      Vinyl3D.setSpinning(false);
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio load failed for ./assets/blessed.mp3, error:', e);
    });
  }

  setGlobalLighting(illuminated) {
    this.isLightOn = illuminated;
    const appEl = document.getElementById('app');
    if (appEl) {
      if (illuminated) {
        appEl.classList.add('is-illuminated');
      } else {
        appEl.classList.remove('is-illuminated');
      }
    }
    Vinyl3D.setLightState(illuminated);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.isPlaying = true;
    this.setGlobalLighting(true);
    this.updateUI(true);
    Vinyl3D.setSpinning(true);

    if (this.audio) {
      const playPromise = this.audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Song playing successfully
          })
          .catch((err) => {
            console.warn('Audio play failed, starting fallback synth:', err);
            this.startFallbackSynth();
          });
      }
    } else {
      this.startFallbackSynth();
    }
  }

  pause() {
    this.isPlaying = false;
    this.setGlobalLighting(false);
    this.updateUI(false);
    Vinyl3D.setSpinning(false);

    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    this.stopFallbackSynth();
  }

  updateUI(playing) {
    if (this.textEl) {
      this.textEl.textContent = playing ? 'PAUSE OUR SONG' : 'PLAY OUR SONG';
    }

    if (this.iconEl) {
      this.iconEl.textContent = playing ? '⏸' : '▶';
    }

    if (this.badgeEl) {
      if (playing) {
        this.badgeEl.classList.add('active');
      } else {
        this.badgeEl.classList.remove('active');
      }
    }
  }

  startFallbackSynth() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.stopFallbackSynth();
      this.setGlobalLighting(true);

      const freqs = [261.63, 329.63, 392.00, 493.88, 523.25];
      this.synthGain = this.audioCtx.createGain();
      this.synthGain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      this.synthGain.gain.exponentialRampToValueAtTime(0.2, this.audioCtx.currentTime + 2.0);
      this.synthGain.connect(this.audioCtx.destination);

      this.synthOscs = freqs.map((freq) => {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(this.synthGain);
        osc.start();
        return osc;
      });

      this.isPlaying = true;
      this.updateUI(true);
      Vinyl3D.setSpinning(true);
    } catch (e) {
      console.error('Web Audio Synth failed:', e);
    }
  }

  stopFallbackSynth() {
    if (this.synthGain && this.audioCtx) {
      this.synthGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.8);
      setTimeout(() => {
        this.synthOscs.forEach((osc) => {
          try { osc.stop(); } catch (e) {}
        });
        this.synthOscs = [];
      }, 800);
    }
  }
}

export const MusicPlayer = new MusicPlayerManager();
