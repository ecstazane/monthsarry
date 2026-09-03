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
    this.badgeTextEl = null;

    // Track list
    this.tracks = {
      captivated: { src: './assets/captivated.mp3', title: 'CAPTIVATED' },
      nothing:    { src: './assets/nothing.mp3',    title: 'NOTHING' },
      blessed:    { src: './assets/blessed.mp3',    title: 'BLESSED' },
    };
    this.currentTrack = 'captivated';

    // Web Audio Fallback
    this.audioCtx = null;
    this.synthOscs = [];
    this.synthGain = null;
  }

  init() {
    this.buttonEl = document.getElementById('music-btn');
    this.badgeEl = document.getElementById('now-playing-badge');
    this.badgeTextEl = this.badgeEl ? this.badgeEl.querySelector('.badge-text') : null;

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

    // Create audio element with default track (Captivated)
    this.audio = new Audio(this.tracks[this.currentTrack].src);
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
      console.warn('Audio load error:', e);
    });

    // Set up polaroid click listeners for track switching
    this.initPolaroidTrackSwitching();
  }

  initPolaroidTrackSwitching() {
    const polaroids = document.querySelectorAll('.polaroid-card[data-song]');

    polaroids.forEach((card) => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const songKey = card.dataset.song;
        if (songKey && this.tracks[songKey]) {
          this.switchTrack(songKey);
        }
      });
    });
  }

  switchTrack(trackKey) {
    if (!this.tracks[trackKey]) return;

    const wasPlaying = this.isPlaying;

    // Pause current
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }

    // Switch source
    this.currentTrack = trackKey;
    this.audio.src = this.tracks[trackKey].src;
    this.audio.load();

    // Update badge text
    if (this.badgeTextEl) {
      this.badgeTextEl.textContent = `NOW PLAYING — ${this.tracks[trackKey].title}`;
    }

    // Update active polaroid visual
    document.querySelectorAll('.polaroid-card').forEach(c => c.classList.remove('is-active-track'));
    const activeCard = document.querySelector(`.polaroid-card[data-song="${trackKey}"]`);
    if (activeCard) activeCard.classList.add('is-active-track');

    // Auto-play if music was already playing, or start playing on click
    this.play();
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
        playPromise.catch((err) => {
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
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
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
        this.synthOscs.forEach((osc) => { try { osc.stop(); } catch (e) {} });
        this.synthOscs = [];
      }, 800);
    }
  }
}

export const MusicPlayer = new MusicPlayerManager();
