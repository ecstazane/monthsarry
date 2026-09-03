import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Vinyl3D } from './Vinyl3D.js';

gsap.registerPlugin(ScrollTrigger);

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768;
}

class StoryTimelineManager {
  constructor() {
    this.lenis = null;
    this.useLenis = false;
  }

  async init() {
    this.useLenis = !isTouchDevice();

    if (this.useLenis) {
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
      this.lenis.stop();
    } else {
      // Lock native scroll during intro
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

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
        if (this.useLenis && this.lenis) {
          this.lenis.start();
        } else {
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
        }

        this.initScrollAnimations();
        ScrollTrigger.refresh();
      }
    });

    introTl
      .to(introMsg1, { opacity: 1, duration: 2.0, ease: 'power2.inOut' })
      .to(introMsg1, { duration: 1.8 })
      .to(introMsg1, { opacity: 0, duration: 1.5, ease: 'power2.inOut' })
      .to(introMsg2, { opacity: 1, duration: 2.0, ease: 'power2.inOut' }, '+=0.3')
      .to(introMsg2, { duration: 1.8 })
      .to(introMsg2, { opacity: 0, duration: 1.5, ease: 'power2.inOut' })
      .to(introScreen, {
        opacity: 0,
        duration: 0.6,
        onComplete: () => { introScreen.style.display = 'none'; }
      })
      .to(curtainLeft, { xPercent: -100, duration: 2.2, ease: 'power3.inOut' }, '-=0.3')
      .to(curtainRight, { xPercent: -100, x: '100vw', duration: 2.2, ease: 'power3.inOut' }, '<');
  }

  initScrollAnimations() {
    const paragraphs = document.querySelectorAll('.message-paragraph');
    const finalLines = document.querySelectorAll('.final-line');
    const fadeOverlay = document.getElementById('fade-overlay');

    // ──────────────────────────────────────────────────────────
    // Vinyl 3D scroll position tracker
    // ──────────────────────────────────────────────────────────
    ScrollTrigger.create({
      trigger: '.story-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        Vinyl3D.updateScroll(self.progress);
      }
    });

    // ──────────────────────────────────────────────────────────
    // Love Letter Paragraphs — IntersectionObserver
    // Trigger as SOON as any pixel enters the viewport (threshold: 0)
    // with generous rootMargin so it fires early
    // ──────────────────────────────────────────────────────────
    const paragraphObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('is-visible');
          paragraphObserver.unobserve(el); // once visible, stop watching
        }
      });
    }, {
      threshold: 0,
      rootMargin: '0px 0px 50px 0px'  // trigger 50px BEFORE it enters viewport
    });

    paragraphs.forEach(p => paragraphObserver.observe(p));

    // ──────────────────────────────────────────────────────────
    // Final Lines — IntersectionObserver with staggered delay
    // ──────────────────────────────────────────────────────────
    const finalObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const index = Array.from(finalLines).indexOf(el);
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay: index * 0.3,
            ease: 'power2.out'
          });
          finalObserver.unobserve(el);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px 30px 0px' });

    finalLines.forEach(el => finalObserver.observe(el));

    // ──────────────────────────────────────────────────────────
    // Fade overlay at end
    // ──────────────────────────────────────────────────────────
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

    // Refresh after images load
    window.addEventListener('load', () => ScrollTrigger.refresh());
    setTimeout(() => ScrollTrigger.refresh(), 500);
  }
}

export const StoryTimeline = new StoryTimelineManager();
