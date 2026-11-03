import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { initLenis, scrollTo, pauseLenis, resumeLenis } from './lib/lenis.js';
import { initRouter, onRoute, getCurrentRoute, updateMeta, navigate } from './lib/router.js';
import { initVideoObserver, observeVideos } from './lib/video-observer.js';
import { initCursor } from './components/cursor.js';
import { initHeader } from './components/header.js';
import { initMenuOverlay } from './components/menu-overlay.js';
import { initPreloader } from './components/preloader.js';

import { renderHero, initHeroInteractions } from './components/hero.js';
import { renderWorksList, initWorksInteractions } from './components/works-list.js';
import { renderUpdatesFeed, initUpdatesInteractions } from './components/updates-feed.js';
import { renderAbout } from './components/about.js';
import { openCaseStudy, closeCaseStudy } from './components/case-drawer.js';
import { openContactModal } from './components/contact.js';

import { getSiteData, getProjects } from './data/store.js';
import { mountAdminPortal, unmountAdminPortal } from './admin/mount.jsx';

// 1. Initialize Foundational Systems
initLenis();
initVideoObserver();
initCursor();
initHeader();
initMenuOverlay();

// 2. Render Main Application Views
function renderHomeView(targetHash = '') {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const siteData = getSiteData();

  mainContent.innerHTML = `
    ${renderHero()}
    ${renderWorksList()}
    ${renderUpdatesFeed()}
    ${renderAbout()}
    <section class="section-wrapper hairline-top" id="contact" style="text-align: center; padding: clamp(3.5rem, 7vw, 7rem) var(--site-gutter);">
      <span class="pill active" style="margin-bottom: 1.25rem;">Transmission Node</span>
      <h2 style="font-size: var(--font-size-h1); line-height: 1.05; margin-bottom: 1.25rem;">
        HAVE AN AMBITIOUS PROJECT?
      </h2>
      <p style="max-width: 620px; margin: 0 auto 2.25rem; font-size: var(--font-size-body);">
        Currently evaluating senior UI/UX engagements, high-impact brand identities, and creative technology commissions worldwide.
      </p>
      <div style="display: flex; gap: 0.85rem; justify-content: center; flex-wrap: wrap;">
        <button class="pill active" id="footer-inquiry-btn" style="padding: 0.85rem 2rem; font-size: 0.95rem;" data-cursor="hover">
          Start a Project &rarr;
        </button>
        <a href="mailto:${siteData.email || 'syedwaleed.1990@outlook.com'}" class="pill" style="padding: 0.85rem 2rem; font-size: 0.95rem;" data-cursor="hover">
          Direct Email &nearr;
        </a>
      </div>
    </section>
  `;

  // Attach interactive lifecycle hooks
  initHeroInteractions();
  initWorksInteractions();
  initUpdatesInteractions();
  observeVideos(mainContent);

  const footerInquiryBtn = document.getElementById('footer-inquiry-btn');
  if (footerInquiryBtn) {
    footerInquiryBtn.addEventListener('click', () => openContactModal());
  }

  // Handle Hash Scrolling or Modals
  if (targetHash === '#contact') {
    setTimeout(() => openContactModal(), 200);
  } else if (targetHash === '#works') {
    setTimeout(() => scrollTo('#works'), 250);
  }
}

// 3. Route Lifecycle Listener
onRoute((route) => {
  console.info('[Router] Route active:', route.path, route.params);

  const siteData = getSiteData();
  const mainContent = document.getElementById('main-content');
  const adminRoot = document.getElementById('admin-root');
  const siteHeader = document.getElementById('site-header');

  // Handle /admin Route
  if (route.path === '/admin') {
    updateMeta(`Admin Portal — ${siteData.name || 'Syed Waleed'}`, 'Secure OTP 2FA Administrator Console');
    pauseLenis();

    if (mainContent) mainContent.style.display = 'none';
    if (siteHeader) siteHeader.style.display = 'none';
    if (adminRoot) {
      adminRoot.style.display = 'block';
      mountAdminPortal(adminRoot);
    }
    return;
  }

  // Non-admin routes: restore header and main content
  if (adminRoot && adminRoot.style.display !== 'none') {
    adminRoot.style.display = 'none';
  }
  if (siteHeader && siteHeader.style.display === 'none') {
    siteHeader.style.display = 'block';
  }
  if (mainContent && mainContent.style.display === 'none') {
    mainContent.style.display = 'block';
  }
  resumeLenis();

  if (route.path === '/') {
    updateMeta(siteData.title, siteData.metaDescription);
    renderHomeView(route.hash);
  } else if (route.path === '/work/:slug') {
    const projectsData = getProjects();
    const project = projectsData.find((p) => p.slug === route.params.slug);
    if (project) {
      updateMeta(`${project.title} — ${siteData.name || 'Syed Waleed'}`, project.summary);
      if (mainContent && !mainContent.children.length) {
        renderHomeView();
      }
      openCaseStudy(project.slug);
    } else {
      navigate('/');
    }
  } else if (route.path === '/updates') {
    updateMeta(`Creative Lab & Updates — ${siteData.name || 'Syed Waleed'}`, 'Experimental shots, 3D explorations, and creative code snippets.');
    if (mainContent) {
      mainContent.innerHTML = `
        <div style="padding-top: calc(var(--header-height) + 2rem);">
          <div style="padding: 0 var(--site-gutter) 2rem;">
            <a href="/" class="pill" data-cursor="hover">&larr; Back to Overview</a>
          </div>
          ${renderUpdatesFeed()}
        </div>
      `;
      initUpdatesInteractions();
      observeVideos(mainContent);
    }
  } else if (route.path === '/about') {
    updateMeta(`About & Capabilities — ${siteData.name || 'Syed Waleed'}`, siteData.positioning);
    if (mainContent) {
      mainContent.innerHTML = `
        <div style="padding-top: calc(var(--header-height) + 2rem);">
          <div style="padding: 0 var(--site-gutter) 2rem;">
            <a href="/" class="pill" data-cursor="hover">&larr; Back to Overview</a>
          </div>
          ${renderAbout()}
        </div>
      `;
      observeVideos(mainContent);
    }
  }
});

// Re-render live views if portfolio data changes
window.addEventListener('portfolio:data-changed', (e) => {
  const current = getCurrentRoute();
  if (current.path === '/') {
    renderHomeView(current.hash);
  }
});

// 4. Initialize Router
initRouter();

// 5. Preloader Lifecycle
initPreloader(() => {
  console.info('[Preloader] Complete. Portfolio experience live.');
});
