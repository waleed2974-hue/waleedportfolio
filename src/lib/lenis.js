import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap-setup.js';

let lenis = null;

export function initLenis() {
  if (prefersReducedMotion()) {
    // Disable smooth scroll for users preferring reduced motion
    return null;
  }

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
    infinite: false,
  });

  // Sync with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Hook Lenis into GSAP ticker
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function getLenis() {
  return lenis;
}

export function pauseLenis() {
  if (lenis) {
    lenis.stop();
  }
}

export function resumeLenis() {
  if (lenis) {
    lenis.start();
  }
}

export function scrollTo(target, options = {}) {
  if (lenis) {
    lenis.scrollTo(target, { offset: 0, duration: 1.2, ...options });
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
