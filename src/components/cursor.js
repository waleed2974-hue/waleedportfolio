/**
 * Custom Cursor Component
 * Physics-smoothed follower cursor with magnetic snapping and DISCOVER badge morph.
 * Disabled on touch/mobile devices or when prefers-reduced-motion is true.
 */

import { prefersReducedMotion } from '../lib/gsap-setup.js';

let cursorEl = null;
let cursorDot = null;
let cursorBadge = null;
let mouseX = -100;
let mouseY = -100;
let currentX = -100;
let currentY = -100;
let isHover = false;
let isDiscover = false;
let rafId = null;

export function initCursor() {
  cursorEl = document.getElementById('cursor');
  if (!cursorEl) return;

  cursorDot = cursorEl.querySelector('.cursor-dot');
  cursorBadge = cursorEl.querySelector('.cursor-badge');

  // Disable on touch devices or reduced motion
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (!isFinePointer || prefersReducedMotion()) {
    cursorEl.style.display = 'none';
    return;
  }

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Attach hover & discover triggers
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    
    // Check for discover badge trigger
    const discoverTarget = target.closest('[data-cursor="discover"]');
    if (discoverTarget) {
      cursorEl.classList.add('is-discover');
      cursorEl.classList.remove('is-hover');
      isDiscover = true;
      return;
    }

    // Check for standard hover trigger (links, buttons, interactive items)
    const hoverTarget = target.closest('a, button, [data-cursor="hover"], .pill, input, textarea');
    if (hoverTarget) {
      cursorEl.classList.add('is-hover');
      cursorEl.classList.remove('is-discover');
      isHover = true;
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target;
    const related = e.relatedTarget;

    const discoverTarget = target.closest('[data-cursor="discover"]');
    if (discoverTarget && (!related || !related.closest('[data-cursor="discover"]'))) {
      cursorEl.classList.remove('is-discover');
      isDiscover = false;
    }

    const hoverTarget = target.closest('a, button, [data-cursor="hover"], .pill, input, textarea');
    if (hoverTarget && (!related || !related.closest('a, button, [data-cursor="hover"], .pill, input, textarea'))) {
      cursorEl.classList.remove('is-hover');
      isHover = false;
    }
  });

  // Physics animation loop using linear interpolation
  function render() {
    const ease = 0.22;
    currentX += (mouseX - currentX) * ease;
    currentY += (mouseY - currentY) * ease;

    cursorEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

    rafId = requestAnimationFrame(render);
  }

  render();
}
