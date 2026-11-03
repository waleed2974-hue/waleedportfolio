/**
 * About & Capabilities Component (/about)
 * Bio, two capability pillars, and interactive toolset breakdown.
 */

import { getSiteData } from '../data/store.js';

export function renderAbout() {
  const siteData = getSiteData();
  return `
    <section class="about-section hairline-top" id="about">
      <div class="section-header">
        <div>
          <span class="pill" style="margin-bottom: 0.75rem;">Philosophy & Expertise</span>
          <h2 class="section-title">About & Capabilities</h2>
        </div>
        <span class="pill active">${siteData.location}</span>
      </div>

      <div class="about-grid">
        <div>
          <h3 style="font-size: var(--font-size-h2); line-height: 1.1; margin-bottom: 1.5rem;">
            BRIDGING VISUAL ARTISTRY WITH TECHNICAL RIGOR
          </h3>
          <p style="font-size: 1.15rem; color: var(--text-primary); margin-bottom: 1.5rem; line-height: 1.6;">
            I am Syed Waleed, a multidisciplinary designer and creative technologist based in the UAE. For over 8 years, I have partnered with international luxury houses, venture-backed tech platforms, and high-growth brands to engineer identities that command attention.
          </p>
          <p style="margin-bottom: 2.5rem; line-height: 1.6;">
            My philosophy centers on precision: whether calibrating the micrometer foil emboss of an artisanal perfume box, standardizing multi-tier design tokens in Figma, or choreographing 60fps micro-interactions with GSAP.
          </p>

          <div style="padding: 1.5rem; background: var(--surface-card); border: 1px solid var(--hairline); border-radius: 12px; margin-bottom: 2rem;">
            <span class="footer-label">Primary Tool Stack</span>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
              ${siteData.tools.map(tool => `<span class="pill">${tool}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="about-pillars">
          ${siteData.capabilities.map((cap) => `
            <div class="pillar-card">
              <h4 class="pillar-title">${cap.pillar}</h4>
              <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem;">
                ${cap.summary}
              </p>
              <div class="pillar-items">
                ${cap.items.map(item => `<div class="pillar-item">${item}</div>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}
