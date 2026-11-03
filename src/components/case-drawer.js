/**
 * Case Study Reader Component
 * Split-screen reader with sticky left metadata, right media stream,
 * GSAP Flip morph from thumbnail to banner, video observer integration,
 * and infinite next-project chaining on scroll.
 */

import { gsap, Flip, EASE_ENTER } from '../lib/gsap-setup.js';
import { pauseLenis, resumeLenis } from '../lib/lenis.js';
import { navigate } from '../lib/router.js';
import { observeVideos } from '../lib/video-observer.js';
import { getProjects } from '../data/store.js';

let activeSlug = null;
let isDrawerOpen = false;

export function openCaseStudy(slug, originImg = null) {
  const projectsData = getProjects();
  const project = projectsData.find((p) => p.slug === slug);
  if (!project) return;

  activeSlug = slug;
  isDrawerOpen = true;
  pauseLenis();

  const container = document.getElementById('case-drawer-container');
  if (!container) return;

  // Clear any residual GSAP inline opacity from previous close animation
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  gsap.set(container, { clearProps: 'opacity' });

  const currentIndex = projectsData.findIndex((p) => p.slug === slug);
  const nextProject = projectsData[(currentIndex + 1) % projectsData.length] || project;
  const isLastProject = currentIndex === projectsData.length - 1;

  const disciplines = Array.isArray(project.disciplines) ? project.disciplines : [];
  const safeTitle = project.title || 'Untitled Case Study';
  const safeClient = project.client || 'Direct Commission';
  const safeSummary = project.summary || project.description || 'Comprehensive design system, brand architecture, and tactile execution.';
  const safeImpact = project.impact || 'Delivered significant measurable engagement, pre-order velocity, and regional market distinction.';
  const safeYear = project.year || '2026';

  // Build Media Stream: If no gallery media items exist, automatically use the high-resolution cover photo!
  let mediaList = Array.isArray(project.media) && project.media.length > 0 ? [...project.media] : [];
  if (mediaList.length === 0 && project.cover) {
    mediaList = [{
      type: 'banner',
      src: project.cover,
      alt: `${safeTitle} — Hero Visual Showcase`,
      width: 1024,
      height: 600
    }];
  }

  container.innerHTML = `
    <div class="case-drawer-backdrop" id="case-backdrop"></div>
    <button class="case-close-btn" id="case-close-btn" aria-label="Close Case Study" data-cursor="hover">
      <span>Close &times;</span>
    </button>

    <div class="case-drawer-window" role="document">
      <!-- Left Sticky Column -->
      <aside class="case-drawer-left">
        <div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
            ${disciplines.map(d => `<span class="pill active">${d}</span>`).join('')}
            <span class="pill">${safeYear}</span>
          </div>

          <h2 style="font-size: var(--font-size-h2); line-height: 1.05; margin-bottom: 1rem;">
            ${safeTitle}
          </h2>
          <span class="pill" style="margin-bottom: 2rem;">Client: ${safeClient}</span>

          <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 1.5rem;">
            <div>
              <span class="footer-label">Challenge & Architecture</span>
              <p style="margin-top: 0.4rem; color: var(--text-primary); font-size: 1.05rem; line-height: 1.6;">
                ${safeSummary}
              </p>
            </div>

            ${safeImpact ? `
              <div>
                <span class="footer-label">Measurable Impact</span>
                <p style="margin-top: 0.4rem; color: var(--accent); font-size: 0.95rem; font-weight: 600;">
                  ${safeImpact}
                </p>
              </div>
            ` : ''}
          </div>
        </div>

        <div style="margin-top: 3rem; display: flex; flex-direction: column; gap: 1rem;">
          ${project.launchUrl ? `
            <a href="${project.launchUrl}" target="_blank" rel="noopener noreferrer" class="pill active" style="justify-content: center; padding: 0.85rem 1.5rem; font-size: 0.85rem;" data-cursor="hover">
              Launch Case Study &nearr;
            </a>
          ` : ''}
          ${project.behanceUrl ? `
            <a href="${project.behanceUrl}" target="_blank" rel="noopener noreferrer" class="pill" style="justify-content: center; padding: 0.85rem 1.5rem; font-size: 0.85rem;" data-cursor="hover">
              View on Behance &nearr;
            </a>
          ` : ''}
        </div>
      </aside>

      <!-- Right Media Stream -->
      <main class="case-drawer-right" id="case-media-container" data-lenis-prevent>
        <div class="case-media-stream">
          ${mediaList.map((item, idx) => {
            const safeSrc = encodeURI(item.src || '');
            if (item.type === 'video') {
              return `
                <div class="case-media-item banner">
                  <video 
                    src="${safeSrc}" 
                    poster="${item.poster ? encodeURI(item.poster) : ''}" 
                    autoplay 
                    loop 
                    muted 
                    playsinline
                    aria-label="${item.alt || safeTitle}"
                  ></video>
                </div>
              `;
            } else if (item.type === 'banner') {
              return `
                <div class="case-media-item banner">
                  <img 
                    src="${safeSrc}" 
                    alt="${item.alt || safeTitle}" 
                    id="${idx === 0 ? 'case-hero-banner' : ''}"
                    loading="${idx === 0 ? 'eager' : 'lazy'}" 
                    onerror="this.onerror=null; this.src='/favicon.svg';"
                    style="width:100%;height:auto;object-fit:contain;display:block;"
                  />
                </div>
              `;
            } else {
              return `
                <div class="case-media-item square">
                  <img 
                    src="${safeSrc}" 
                    alt="${item.alt || safeTitle}" 
                    loading="lazy" 
                    onerror="this.onerror=null; this.src='/favicon.svg';"
                    style="width:100%;height:auto;object-fit:contain;display:block;"
                  />
                </div>
              `;
            }
          }).join('')}

          <!-- Infinite Project Chaining Sentinel -->
          <div class="chaining-sentinel" id="chaining-sentinel">
            <svg class="chaining-progress-circle" viewBox="0 0 70 70">
              <circle class="chaining-circle-bg" cx="35" cy="35" r="30"></circle>
              <circle class="chaining-circle-bar" id="chaining-bar" cx="35" cy="35" r="30"></circle>
            </svg>
            <span class="pill active" id="chaining-label">
              ${isLastProject ? 'Keep scrolling for more &rarr;' : 'Keep scrolling for next project &rarr;'}
            </span>
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim);">
              Next: ${nextProject.title}
            </span>
          </div>
        </div>
      </main>
    </div>
  `;

  container.classList.add('is-active');
  container.setAttribute('aria-hidden', 'false');

  // Update URL via router
  navigate(`/work/${slug}`, false);

  // GSAP Flip animation from clicked thumbnail if available
  const heroBanner = document.getElementById('case-hero-banner');
  if (originImg && heroBanner) {
    const state = Flip.getState(originImg);
    Flip.from(state, {
      targets: heroBanner,
      duration: 0.8,
      ease: EASE_ENTER
    });
  }

  // Observe all videos in the drawer
  observeVideos(container);

  // Close handlers
  const closeBtn = document.getElementById('case-close-btn');
  const backdrop = document.getElementById('case-backdrop');

  const closeHandler = () => {
    closeCaseStudy();
  };

  if (closeBtn) closeBtn.addEventListener('click', closeHandler);
  if (backdrop) backdrop.addEventListener('click', closeHandler);

  // Escape key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeCaseStudy();
      window.removeEventListener('keydown', escHandler);
    }
  };
  window.addEventListener('keydown', escHandler);

  // Setup infinite chaining scroll detection
  setupInfiniteChaining(nextProject.slug);
}

function setupInfiniteChaining(nextSlug) {
  const scroller = document.getElementById('case-media-container');
  const progressBar = document.getElementById('chaining-bar');
  if (!scroller || !progressBar) return;

  const circumference = 2 * Math.PI * 30; // ~188.5
  progressBar.style.strokeDasharray = `${circumference}`;
  progressBar.style.strokeDashoffset = `${circumference}`;

  let triggered = false;

  scroller.addEventListener('scroll', () => {
    if (triggered) return;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    if (maxScroll <= 0) return;

    const currentScroll = scroller.scrollTop;
    const remaining = maxScroll - currentScroll;

    // Start filling when within 250px of bottom
    if (remaining < 250) {
      const progress = Math.max(0, Math.min(1, (250 - remaining) / 250));
      const offset = circumference - (progress * circumference);
      progressBar.style.strokeDashoffset = `${offset}`;

      if (progress >= 0.98) {
        triggered = true;
        // Smoothly mount next project
        gsap.to(scroller, {
          opacity: 0,
          duration: 0.35,
          onComplete: () => {
            openCaseStudy(nextSlug);
          }
        });
      }
    } else {
      progressBar.style.strokeDashoffset = `${circumference}`;
    }
  });
}

export function closeCaseStudy() {
  const container = document.getElementById('case-drawer-container');
  if (!container || !isDrawerOpen) return;

  isDrawerOpen = false;
  activeSlug = null;

  gsap.to(container, {
    opacity: 0,
    duration: 0.35,
    ease: 'power2.in',
    onComplete: () => {
      container.classList.remove('is-active');
      container.setAttribute('aria-hidden', 'true');
      container.innerHTML = '';
      container.style.opacity = '';
      container.style.visibility = '';
      gsap.set(container, { clearProps: 'opacity,visibility' });
      resumeLenis();
      navigate('/', false);
    }
  });
}
