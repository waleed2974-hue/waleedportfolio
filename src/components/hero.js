/**
 * Hero Component
 * Split headline ("VISUAL THINKER / DIGITAL MAKER") with nested mask reveals,
 * centerpiece 8-frame image sequencer with 2D cursor parallax, and discover prompts.
 */

import { gsap, EASE_ENTER, prefersReducedMotion } from '../lib/gsap-setup.js';
import { splitTextChars } from '../lib/split-text.js';
import { getSiteData } from '../data/store.js';

const sequencerImages = [
  '/media/hero/frame-01.webp',
  '/media/hero/frame-02.webp',
  '/media/hero/frame-03.webp',
  '/media/hero/frame-04.webp',
  '/media/hero/frame-05.webp',
  '/media/hero/frame-06.webp',
  '/media/hero/frame-07.webp',
  '/media/hero/frame-08.webp',
];

export function renderHero() {
  const siteData = getSiteData();
  const headlineParts = (siteData.heroHeadline || 'VISUAL THINKER / DIGITAL MAKER').split('/');
  const leftTitle = headlineParts[0]?.trim() || 'VISUAL THINKER';
  const rightTitle = headlineParts[1]?.trim() || 'DIGITAL MAKER';

  return `
    <section class="hero-section" id="hero-section" data-cursor="discover">
      <div class="hero-grid">
        <div class="hero-headline-left">
          <h1 class="split-title" id="hero-title-left">${leftTitle}</h1>
        </div>

        <div class="hero-sequencer-wrapper">
          <div class="hero-sequencer-card" id="hero-sequencer" data-cursor="discover" role="region" aria-label="Syed Waleed Featured Works Carousel">
            ${sequencerImages.map((src, i) => `
              <div class="sequencer-slide ${i === 0 ? 'active' : ''}" style="background-image: url('${src}')" data-idx="${i}"></div>
            `).join('')}
            <div class="sequencer-badge">
              <span class="pill active" id="sequencer-counter">01 / 08</span>
              <span class="pill" id="sequencer-category">AFZAL SCENTS</span>
            </div>
          </div>
        </div>

        <div class="hero-headline-right">
          <h2 class="split-title" id="hero-title-right">${rightTitle}</h2>
        </div>
      </div>

      <div class="hero-footer">
        <p class="hero-positioning" id="hero-positioning">
          ${siteData.positioning}
        </p>

        <div class="hero-actions">
          <a href="/#works" class="pill active" data-cursor="hover" id="hero-cta-works">Selected Works &darr;</a>
          <button class="pill" id="hero-inquiry-btn" data-cursor="hover">Start Inquiry &rarr;</button>
        </div>
      </div>
    </section>
  `;
}

export function initHeroInteractions() {
  const titleLeft = document.getElementById('hero-title-left');
  const titleRight = document.getElementById('hero-title-right');
  const sequencer = document.getElementById('hero-sequencer');
  const positioning = document.getElementById('hero-positioning');
  const actions = document.querySelector('.hero-actions');
  const inquiryBtn = document.getElementById('hero-inquiry-btn');

  if (inquiryBtn) {
    inquiryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      import('./contact.js').then((module) => {
        module.openContactModal();
      });
    });
  }

  // 1. Text Splitting and Vertical Mask Reveal Animation
  if (titleLeft && titleRight) {
    const charsLeft = splitTextChars(titleLeft);
    const charsRight = splitTextChars(titleRight);
    const allChars = [...charsLeft, ...charsRight];

    if (!prefersReducedMotion()) {
      gsap.fromTo(
        allChars,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.025,
          ease: EASE_ENTER,
          delay: 0.1
        }
      );
    }
  }

  // Animate sequencer entrance
  if (sequencer && !prefersReducedMotion()) {
    gsap.fromTo(
      sequencer,
      { scale: 0.85, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1, ease: EASE_ENTER, delay: 0.2 }
    );
  }

  // Animate positioning text & CTA entrance
  if (positioning && !prefersReducedMotion()) {
    gsap.fromTo(
      [positioning, actions],
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: EASE_ENTER, delay: 0.4 }
    );
  }

  // 2. Interactive Sequencer cycling & 2D parallax
  if (sequencer) {
    const slides = sequencer.querySelectorAll('.sequencer-slide');
    const counterPill = document.getElementById('sequencer-counter');
    const categoryPill = document.getElementById('sequencer-category');
    
    const categories = [
      'AFZAL SCENTS',
      'AETHELGARD CLOUD',
      'VELOCE COMMERCE',
      'KINETIX LOGISTICS',
      'GLSL SHADER WAVE',
      'BILINGUAL TYPE',
      'LUXURY FOILING',
      'UI INTERACTION'
    ];

    let currentIdx = 0;
    let autoCycle = null;

    if (!prefersReducedMotion()) {
      autoCycle = setInterval(() => {
        slides[currentIdx].classList.remove('active');
        currentIdx = (currentIdx + 1) % slides.length;
        slides[currentIdx].classList.add('active');
        if (counterPill) counterPill.textContent = `0${currentIdx + 1} / 08`;
        if (categoryPill) categoryPill.textContent = categories[currentIdx];
      }, 2600);
    }

    // 2D Cursor Parallax
    if (!prefersReducedMotion()) {
      const heroSection = document.getElementById('hero-section');
      if (heroSection) {
        heroSection.addEventListener('mousemove', (e) => {
          const rect = heroSection.getBoundingClientRect();
          const normX = (e.clientX - rect.left) / rect.width - 0.5;
          const normY = (e.clientY - rect.top) / rect.height - 0.5;

          gsap.to(sequencer, {
            x: normX * 36,
            y: normY * 36,
            rotationY: normX * 16,
            rotationX: -normY * 16,
            duration: 0.7,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        });

        heroSection.addEventListener('mouseleave', () => {
          gsap.to(sequencer, {
            x: 0,
            y: 0,
            rotationY: 0,
            rotationX: 0,
            duration: 0.8,
            ease: 'power2.out'
          });
        });
      }
    }
  }
}
