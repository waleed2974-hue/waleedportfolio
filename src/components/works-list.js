/**
 * Works List Component
 * Hover-reactive project showcases with discipline pills, year stamps,
 * and click triggers initiating GSAP Flip transitions into the Case Study Reader.
 */

import { getProjects } from '../data/store.js';
import { openCaseStudy } from './case-drawer.js';

export function renderWorksList() {
  const projectsData = getProjects();
  return `
    <section class="works-section hairline-top" id="works">
      <div class="section-header">
        <div>
          <span class="pill" style="margin-bottom: 0.75rem;">Selected Archive</span>
          <h2 class="section-title">Case Studies</h2>
        </div>
        <span class="pill active">${projectsData.length.toString().padStart(2, '0')} Premier Systems</span>
      </div>

      <div class="works-grid">
        ${projectsData.map((project, idx) => {
          const safeCover = project.cover ? encodeURI(project.cover) : '/media/projects/luxury-fragrance/cover.webp';
          const safeTitle = project.title || 'Untitled Case Study';
          const safeYear = project.year || '2026';
          const disciplines = Array.isArray(project.disciplines) ? project.disciplines : [];

          return `
            <article class="project-card" data-slug="${project.slug}" data-cursor="discover">
              <div class="project-thumb-box">
                <img 
                  src="${safeCover}" 
                  alt="${safeTitle}" 
                  class="project-thumb-img" 
                  id="thumb-${project.slug}"
                  loading="lazy"
                  width="1024"
                  height="704"
                  onerror="this.onerror=null; this.src='/favicon.svg';"
                />
              </div>
              <div class="project-meta-row">
                <h3 class="project-title">${safeTitle}</h3>
                <span class="project-year">${safeYear}</span>
              </div>
              <div class="project-disciplines">
                ${disciplines.map(d => `<span class="pill">${d}</span>`).join('')}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

export function initWorksInteractions() {
  const cards = document.querySelectorAll('.project-card');
  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const slug = card.getAttribute('data-slug');
      const thumbImg = card.querySelector('.project-thumb-img');
      openCaseStudy(slug, thumbImg);
    });
  });
}
