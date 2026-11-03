import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';

// Register core plugins
gsap.registerPlugin(ScrollTrigger, Flip);

// Standard motion easing curves per project motion rules
export const EASE_ENTER = 'power4.out';
export const EASE_TRANSITION = 'power3.inOut';
export const EASE_SMOOTH = 'power2.out';

// Reduced motion media query state
export const prefersReducedMotion = () => {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export { gsap, ScrollTrigger, Flip };
