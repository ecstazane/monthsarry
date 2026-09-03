import './style.css';
import { Vinyl3D } from './components/Vinyl3D.js';
import { MusicPlayer } from './components/MusicPlayer.js';
import { StoryTimeline } from './components/StoryTimeline.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Three.js 3D Vinyl Record Canvas
  const canvasContainer = document.getElementById('canvas-container');
  if (canvasContainer) {
    Vinyl3D.init(canvasContainer);
  }

  // 2. Initialize Audio & Music Control
  MusicPlayer.init();

  // 3. Initialize GSAP ScrollTrigger & Lenis Smooth Scroll Timeline
  StoryTimeline.init();
});
