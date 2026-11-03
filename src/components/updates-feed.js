/**
 * Creative Lab & Updates Feed Component (/updates)
 * Filterable bento grid with animated Flip reflow, video loops, and discipline badges.
 */

import { Flip, gsap } from '../lib/gsap-setup.js';
import { observeVideos } from '../lib/video-observer.js';
import { getUpdates } from '../data/store.js';

const categories = ['All', 'UI/UX Shots', 'Brand Marks', 'Vector & 3D Studies', 'Code Experiments'];

export function renderUpdatesFeed() {
  const updatesData = getUpdates();
  return `
    <section class="updates-section hairline-top" id="updates-section">
      <div class="section-header">
        <div>
          <span class="pill" style="margin-bottom: 0.75rem;">Creative Lab & Archives</span>
          <h2 class="section-title">Experiments & Shots</h2>
        </div>
        <span class="pill active">${updatesData.length.toString().padStart(2, '0')} Interactive Studies</span>
      </div>

      <div class="updates-filters" id="updates-filters">
        ${categories.map((cat, i) => `
          <button class="pill filter-btn ${i === 0 ? 'active' : ''}" data-cat="${cat}" data-cursor="hover">
            ${cat}
          </button>
        `).join('')}
      </div>

      <div class="bento-grid" id="bento-grid">
        ${updatesData.map((item) => renderCard(item)).join('')}
      </div>
    </section>
  `;
}

function renderCard(item) {
  const isVideo = item.type === 'video';
  const aspectClass = item.aspect === '16/9' ? 'wide' : item.aspect === '4/5' ? 'tall' : 'square';

  return `
    <article class="bento-card" data-cat="${item.category || 'UI/UX Shots'}" data-id="${item.id}" data-cursor="hover">
      <div class="bento-media-box ${aspectClass}">
        ${isVideo ? `
          <video 
            src="${encodeURI(item.src || '')}" 
            poster="${item.poster ? encodeURI(item.poster) : ''}" 
            autoplay 
            loop 
            muted 
            playsinline 
            aria-label="${item.title || 'Creative Lab'}"
          ></video>
        ` : `
          <img 
            src="${encodeURI(item.src || '')}" 
            alt="${item.title || 'Creative Lab'}" 
            loading="lazy" 
            width="800" 
            height="800"
            onerror="this.onerror=null; this.src='/favicon.svg';"
          />
        `}
      </div>
      <div class="bento-info">
        <div class="bento-header-row">
          <span class="bento-date">${item.date || '2026'}</span>
          <span class="pill">${item.category || 'Study'}</span>
        </div>
        <h3 class="bento-title">${item.title || 'Untitled Experiment'}</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">${item.summary || ''}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            ${(Array.isArray(item.disciplines) ? item.disciplines : []).map(d => `<span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">#${d}</span>`).join(' ')}
          </div>
          ${item.behanceUrl ? `
            <a href="${item.behanceUrl}" target="_blank" rel="noopener noreferrer" class="pill" style="font-size: 0.7rem;" data-cursor="hover">
              Behance &nearr;
            </a>
          ` : ''}
        </div>
      </div>
    </article>
  `;
}

export function initUpdatesInteractions() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const grid = document.getElementById('bento-grid');
  if (!grid) return;

  observeVideos(grid);

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const selectedCat = btn.getAttribute('data-cat');
      const cards = grid.querySelectorAll('.bento-card');

      // Record state for Flip reflow
      const state = Flip.getState(cards);

      cards.forEach((card) => {
        const cardCat = card.getAttribute('data-cat');
        if (selectedCat === 'All' || cardCat === selectedCat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });

      Flip.from(state, {
        duration: 0.5,
        ease: 'power3.inOut',
        scale: true,
        stagger: 0.04
      });
    });
  });
}
