import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Vinyl3D } from './Vinyl3D.js';

gsap.registerPlugin(ScrollTrigger);

// Detect mobile/touch devices
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768;
}

class StoryTimelineManager {
  constructor() {
    this.lenis = null;
    this.scrollTl = null;
    this.useLenis = false;
  }

  async init() {
    this.useLenis = !isTouchDevice();

    if (this.useLenis) {
      // Only import and use Lenis on desktop for buttery wheel scrolling
      const { default: Lenis } = await import('lenis');
      this.lenis = new Lenis({
        lerp: 0.08,
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
      });

      this.lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        this.lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);

      // Block scrolling during intro
      this.lenis.stop();
    } else {
      // On mobile: block native scroll during intro, then unlock
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    // Play the intro sequence
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
        // Unlock scrolling
        if (this.useLenis && this.lenis) {
          this.lenis.start();
        } else {
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
        }

        this.initScrollTriggerAnimations();
        ScrollTrigger.refresh();
      }
    });

    // PHASE 1 — Black Screen Opening
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

    // PHASE 2 — Cinematic Curtain Reveal
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

    // Main scroll progress tracker for vinyl 3D position updates
    ScrollTrigger.create({
      trigger: '.story-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        Vinyl3D.updateScroll(self.progress);
      }
    });

    // Subtle parallax shift for polaroids
    if (pol1 && pol2 && pol3) {
      gsap.to([pol1, pol2, pol3], {
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
        y: '-=40',
        stagger: 0.05,
        ease: 'none'
      });
    }

    // Love Letter paragraph reveals — IntersectionObserver for bulletproof mobile support
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

    paragraphs.forEach(p => observer.observe(p));

    // Also use GSAP ScrollTrigger for desktop (more polished scrub behavior)
    if (this.useLenis) {
      paragraphs.forEach((p) => {
        gsap.to(p, {
          scrollTrigger: {
            trigger: p,
            start: 'top 88%',
            end: 'top 55%',
            scrub: 0.5
          },
          opacity: 1,
          y: 0,
          ease: 'power2.out'
        });
      });
    }

    // Final Finale Section
    if (f1 && f2 && f3 && f4) {
      // Use IntersectionObserver for finale lines too (mobile guarantee)
      const finalObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            gsap.to(entry.target, {
              opacity: 1,
              y: 0,
              duration: 1.0,
              ease: 'power2.out'
            });
          }
        });
      }, { threshold: 0.2 });

      [f1, f2, f3, f4].forEach(el => finalObserver.observe(el));

      // Fade overlay at very end
      if (fadeOverlay) {
        ScrollTrigger.create({
          trigger: '#final-section',
          start: 'center center',
          end: 'bottom bottom',
          scrub: true,
          onUpdate: (self) => {
            fadeOverlay.style.opacity = self.progress * 0.75;
          }
        });
      }
    }

    // Refresh ScrollTrigger once images load
    window.addEventListener('load', () => {
      ScrollTrigger.refresh();
    });

    // Extra safety refresh after a short delay
    setTimeout(() => ScrollTrigger.refresh(), 500);
  }
}

export const StoryTimeline = new StoryTimelineManager();
