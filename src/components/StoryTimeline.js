import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Vinyl3D } from './Vinyl3D.js';

gsap.registerPlugin(ScrollTrigger);

class StoryTimelineManager {
  constructor() {
    this.lenis = null;
    this.scrollTl = null;
  }

  init() {
    // 1. Initialize Lenis with snappy, natural responsiveness (lerp: 0.08)
    this.lenis = new Lenis({
      lerp: 0.08,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.0,
    });

    // Synchronize Lenis with GSAP Ticker
    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // Disable scrolling during intro phase
    this.lenis.stop();

    // 2. Play Black Screen Intro & Curtain Split Sequence
    this.playIntroSequence();
  }

  playIntroSequence() {
    const introMsg1 = document.getElementById('intro-msg-1');
    const introMsg2 = document.getElementById('intro-msg-2');
    const introScreen = document.getElementById('intro-screen');
    const curtainLeft = document.querySelector('.curtain-left');
    const curtainRight = document.querySelector('.curtain-right');

    const introTl = gsap.timeline({
      onComplete: () => {
        // Enable smooth scrolling when curtain finishes opening
        this.lenis.start();
        this.initScrollTriggerAnimations();
        
        // Refresh ScrollTrigger calculations after initial setup
        ScrollTrigger.refresh();
      }
    });

    // --------------------------------------------------------------------------
    // PHASE 1 — Black Screen Opening
    // --------------------------------------------------------------------------
    introTl
      .to(introMsg1, {
        opacity: 1,
        duration: 2.0,
        ease: 'power2.inOut'
      })
      .to(introMsg1, {
        duration: 1.8
      })
      .to(introMsg1, {
        opacity: 0,
        duration: 1.5,
        ease: 'power2.inOut'
      })
      .to(introMsg2, {
        opacity: 1,
        duration: 2.0,
        ease: 'power2.inOut'
      }, '+=0.3')
      .to(introMsg2, {
        duration: 1.8
      })
      .to(introMsg2, {
        opacity: 0,
        duration: 1.5,
        ease: 'power2.inOut'
      })
      .to(introScreen, {
        opacity: 0,
        duration: 0.6,
        onComplete: () => {
          introScreen.style.display = 'none';
        }
      })

    // --------------------------------------------------------------------------
    // PHASE 2 — Cinematic Curtain Reveal
    // --------------------------------------------------------------------------
      .to(curtainLeft, {
        xPercent: -100,
        duration: 2.2,
        ease: 'power3.inOut'
      }, '-=0.3')
      .to(curtainRight, {
        xPercent: -100,
        x: '100vw',
        duration: 2.2,
        ease: 'power3.inOut'
      }, '<');
  }

  initScrollTriggerAnimations() {
    const pol1 = document.getElementById('polaroid-1');
    const pol2 = document.getElementById('polaroid-2');
    const pol3 = document.getElementById('polaroid-3');

    const paragraphs = document.querySelectorAll('.message-paragraph');

    const f1 = document.getElementById('final-line-1');
    const f2 = document.getElementById('final-line-2');
    const f3 = document.getElementById('final-line-3');
    const f4 = document.getElementById('final-line-4');
    const fadeOverlay = document.getElementById('fade-overlay');

    // Main Scroll Timeline using pure GPU transform properties
    this.scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.story-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.0,
        onUpdate: (self) => {
          Vinyl3D.updateScroll(self.progress);
        }
      }
    });

    // Subtle parallax shift for polaroids
    this.scrollTl
      .to([pol1, pol2, pol3], {
        y: '-=40',
        stagger: 0.05,
        ease: 'none'
      }, 0);

    // --------------------------------------------------------------------------
    // Love Letter Progressive Paragraph Reveals
    // --------------------------------------------------------------------------
    paragraphs.forEach((p) => {
      gsap.to(p, {
        scrollTrigger: {
          trigger: p,
          start: 'top 82%',
          end: 'top 45%',
          scrub: 0.8
        },
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        ease: 'power2.out'
      });
    });

    // --------------------------------------------------------------------------
    // Final Finale Section
    // --------------------------------------------------------------------------
    const finalTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#final-section',
        start: 'top 65%',
        end: 'bottom bottom',
        scrub: 1.0
      }
    });

    finalTl
      .to(f1, { opacity: 1, y: 0, duration: 1 })
      .to(f2, { opacity: 1, y: 0, duration: 1 }, '+=0.5')
      .to(f3, { opacity: 1, y: 0, duration: 1 }, '+=0.5')
      .to(f4, { opacity: 1, y: 0, duration: 1.5 }, '+=0.5')
      .to(fadeOverlay, { opacity: 0.75, duration: 2 }, '+=0.8');

    // Refresh ScrollTrigger when images load
    window.addEventListener('load', () => {
      ScrollTrigger.refresh();
    });
  }
}

export const StoryTimeline = new StoryTimelineManager();
