/**
 * Header Component
 * Fixed header (z-index 100) with mix-blend-mode: difference.
 * Monogram brand mark top-left, 3-line menu trigger top-right.
 */

import { openMenu, toggleMenu } from './menu-overlay.js';

export function initHeader() {
  const menuTrigger = document.getElementById('menu-trigger');
  if (!menuTrigger) return;

  menuTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu();
  });

  // Keyboard shortcut 'm' to open menu
  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      toggleMenu();
    }
  });
}
