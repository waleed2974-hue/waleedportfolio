/**
 * Preloader Component
 * Cycles 8 square 1024x1024 frames at 180ms intervals, increments progress counter,
 * and orchestrates the transition into the main site experience.
 */

import { gsap, prefersReducedMotion } from '../lib/gsap-setup.js';

const heroFrames = [
  '/media/hero/frame-01.webp',
  '/media/hero/frame-02.webp',
  '/media/hero/frame-03.webp',
  '/media/hero/frame-04.webp',
  '/media/hero/frame-05.webp',
  '/media/hero/frame-06.webp',
  '/media/hero/frame-07.webp',
  '/media/hero/frame-08.webp',
];

export function initPreloader(onComplete) {
  const preloader = document.getElementById('preloader');
  if (!preloader) {
    if (onComplete) onComplete();
    return;
  }

  const frameSlot = document.getElementById('preloader-frame-slot');
  const counterEl = document.getElementById('preloader-counter');
  const progressBar = document.getElementById('preloader-progress-bar');

  // Fast path for reduced motion
  if (prefersReducedMotion()) {
    preloader.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    if (onComplete) onComplete();
    return;
  }

  let currentFrameIdx = 0;
  let progress = 0;
  let intervalId = null;

  // Frame cycling interval (160ms)
  intervalId = setInterval(() => {
    currentFrameIdx = (currentFrameIdx + 1) % heroFrames.length;
    if (frameSlot) {
      frameSlot.style.backgroundImage = `url(${heroFrames[currentFrameIdx]})`;
    }
  }, 160);

  // Set initial frame
  if (frameSlot) {
    frameSlot.style.backgroundImage = `url(${heroFrames[0]})`;
  }

  // Preload images
  heroFrames.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  // Progress animation
  const tl = gsap.timeline({
    onUpdate: () => {
      const p = Math.round(tl.progress() * 100);
      if (counterEl) {
        counterEl.textContent = `${p < 10 ? '0' : ''}${p}%`;
      }
      if (progressBar) {
        progressBar.style.width = `${p}%`;
      }
    },
    onComplete: () => {
      clearInterval(intervalId);

      gsap.to(preloader, {
        yPercent: -100,
        duration: 0.85,
        ease: 'power4.inOut',
        onComplete: () => {
          preloader.classList.add('is-hidden');
          document.body.classList.remove('is-loading');
          if (onComplete) onComplete();
        }
      });
    }
  });

  tl.to({}, { duration: 1.4 });
}
