/**
 * Menu Overlay Component
 * Full-viewport navigation overlay with kinetic type reveals, interactive hover preview
 * imagery, focus trapping, click-to-copy email, and accessible controls.
 */

import { gsap, EASE_ENTER } from '../lib/gsap-setup.js';
import { pauseLenis, resumeLenis } from '../lib/lenis.js';
import { navigate } from '../lib/router.js';
import siteData from '../data/site.json';

let isOpen = false;
let previousActiveElement = null;

const previewImages = {
  '01': {
    src: '/media/projects/luxury-fragrance/cover.webp',
    title: 'Selected Works (2024–2026)',
    desc: 'Bilingual Brand Identities, Packaging & Dark-Mode UI'
  },
  '02': {
    src: '/media/updates/lab-02-poster.webp',
    title: 'Creative Lab / Feed',
    desc: 'Shader Waves, Bento Telemetry & Micro-Interactions'
  },
  '03': {
    src: '/media/projects/darkmode-uiux/square-tokens.webp',
    title: 'About & Capabilities',
    desc: 'Multidisciplinary Technologist & UI/UX Specialist'
  },
  '04': {
    src: '/media/projects/vector-identity/square-stationery.webp',
    title: 'Start a Project',
    desc: 'Available for Select Commissions Globally'
  },
  '05': {
    src: '/media/projects/darkmode-uiux/cover.webp',
    title: 'Admin Console & CMS',
    desc: 'Password + OTP 2FA Security & Real-Time Portfolio Management'
  }
};

export function initMenuOverlay() {
  const overlay = document.getElementById('menu-overlay');
  if (!overlay) return;

  const closeBtn = document.getElementById('menu-close-btn');
  const trigger = document.getElementById('menu-trigger');
  const copyBtn = document.getElementById('copy-email-btn');
  const copyPill = document.getElementById('copy-status-pill');
  const links = overlay.querySelectorAll('.menu-link');

  // Insert Preview Container into the menu layout if not present
  let previewPanel = overlay.querySelector('.menu-preview-panel');
  if (!previewPanel) {
    previewPanel = document.createElement('div');
    previewPanel.className = 'menu-preview-panel';
    previewPanel.innerHTML = `
      <div class="menu-preview-card">
        <div class="preview-img-wrapper">
          <img id="menu-preview-img" src="/media/projects/luxury-fragrance/cover.webp" alt="Menu Preview" />
        </div>
        <div class="preview-info">
          <span class="preview-title" id="menu-preview-title">Selected Works</span>
          <span class="preview-desc" id="menu-preview-desc">Brand Identity & Digital Products</span>
        </div>
      </div>
    `;
    const linksContainer = overlay.querySelector('.menu-nav-links');
    if (linksContainer) {
      linksContainer.after(previewPanel);
    }
  }

  // Hover reactive image updates
  links.forEach((link) => {
    const idx = link.getAttribute('data-index');
    link.addEventListener('mouseenter', () => {
      const data = previewImages[idx];
      if (data) {
        const img = document.getElementById('menu-preview-img');
        const title = document.getElementById('menu-preview-title');
        const desc = document.getElementById('menu-preview-desc');
        if (img && title && desc) {
          gsap.to(img, {
            opacity: 0.4,
            duration: 0.15,
            onComplete: () => {
              img.src = data.src;
              title.textContent = data.title;
              desc.textContent = data.desc;
              gsap.to(img, { opacity: 1, duration: 0.25 });
            }
          });
        }
      }
    });

    // Close on click and navigate
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      closeMenu();
      setTimeout(() => {
        navigate(href);
      }, 350);
    });
  });

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
    });
  }

  // Backdrop click to close
  const backdrop = overlay.querySelector('.menu-overlay-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeMenu();
    });
  }

  // Click to copy email
  if (copyBtn) {
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(siteData.email || 'hello@syedwaleed.design');
        if (copyPill) {
          copyPill.textContent = 'COPIED TO CLIPBOARD!';
          copyPill.classList.add('active');
          setTimeout(() => {
            copyPill.textContent = 'Click to Copy';
            copyPill.classList.remove('active');
          }, 2400);
        }
      } catch (err) {
        // Fallback for older browsers
        window.location.href = `mailto:${siteData.email || 'hello@syedwaleed.design'}`;
      }
    });
  }

  // Handle Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
    }
  });

  // Focus trapping
  overlay.addEventListener('keydown', (e) => {
    if (!isOpen || e.key !== 'Tab') return;
    const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

export function openMenu() {
  const overlay = document.getElementById('menu-overlay');
  const trigger = document.getElementById('menu-trigger');
  if (!overlay || isOpen) return;

  isOpen = true;
  previousActiveElement = document.activeElement;
  pauseLenis();

  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'true');
  }

  // Kinetic staggered link entrance
  const links = overlay.querySelectorAll('.menu-link');
  const footer = overlay.querySelector('.menu-overlay-footer');
  const preview = overlay.querySelector('.menu-preview-panel');

  gsap.fromTo(
    links,
    { y: 50, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.65,
      stagger: 0.08,
      ease: EASE_ENTER,
      overwrite: true
    }
  );

  if (preview) {
    gsap.fromTo(
      preview,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.7, delay: 0.15, ease: EASE_ENTER }
    );
  }

  if (footer) {
    gsap.fromTo(
      footer,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay: 0.3, ease: EASE_ENTER }
    );
  }

  // Set focus on close button
  const closeBtn = document.getElementById('menu-close-btn');
  if (closeBtn) {
    setTimeout(() => closeBtn.focus(), 100);
  }
}

export function closeMenu() {
  const overlay = document.getElementById('menu-overlay');
  const trigger = document.getElementById('menu-trigger');
  if (!overlay || !isOpen) return;

  isOpen = false;
  overlay.setAttribute('aria-hidden', 'true');
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }

  const links = overlay.querySelectorAll('.menu-link');
  gsap.to(links, {
    y: -30,
    opacity: 0,
    duration: 0.35,
    stagger: 0.04,
    ease: 'power2.in',
    onComplete: () => {
      overlay.classList.remove('is-open');
      resumeLenis();
      if (previousActiveElement && previousActiveElement.focus) {
        previousActiveElement.focus();
      }
    }
  });
}

export function toggleMenu() {
  if (isOpen) {
    closeMenu();
  } else {
    openMenu();
  }
}
