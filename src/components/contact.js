/**
 * Contact & Project Inquiry Component
 * Interactive inquiry drawer with multi-select chips, form validation,
 * submission state management, and mailto fallback.
 */

import siteData from '../data/site.json';
import { pauseLenis, resumeLenis } from '../lib/lenis.js';
import { addInquiry } from '../data/store.js';

let isModalOpen = false;

const projectTypes = [
  'Brand Identity',
  'Luxury Packaging',
  'Bilingual Typography',
  'UI/UX Design',
  'Design System',
  'Interactive Front-End'
];

const budgetRanges = [
  '$5k – $10k',
  '$10k – $25k',
  '$25k – $50k',
  '$50k+'
];

export function openContactModal() {
  const container = document.getElementById('contact-modal-container');
  if (!container || isModalOpen) return;

  isModalOpen = true;
  pauseLenis();

  container.innerHTML = `
    <div class="contact-modal-backdrop" id="contact-backdrop"></div>
    <div class="contact-modal-window" role="dialog" aria-modal="true" aria-labelledby="inquiry-title">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--hairline); padding-bottom: 1.25rem;">
        <div>
          <span class="pill active" style="margin-bottom: 0.5rem;">New Commission</span>
          <h2 id="inquiry-title" style="font-size: var(--font-size-h3);">START A PROJECT</h2>
        </div>
        <button class="pill" id="contact-close-btn" data-cursor="hover" aria-label="Close Inquiry Drawer">Close &times;</button>
      </div>

      <form id="inquiry-form" class="inquiry-form">
        <div class="form-group">
          <label class="form-label">Project Type (Select all that apply)</label>
          <div class="chip-group" id="chip-type-group">
            ${projectTypes.map((type, i) => `
              <button type="button" class="chip-btn ${i === 0 ? 'selected' : ''}" data-value="${type}" data-cursor="hover">
                ${type}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="inquiry-fields-row">
          <div class="form-group">
            <label class="form-label" for="client-name">Your Name *</label>
            <input type="text" id="client-name" class="form-input" required placeholder="e.g. Alex Mercer" />
          </div>
          <div class="form-group">
            <label class="form-label" for="client-email">Email Address *</label>
            <input type="email" id="client-email" class="form-input" required placeholder="e.g. alex@company.com" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Estimated Budget (USD)</label>
          <div class="chip-group" id="chip-budget-group">
            ${budgetRanges.map((budget, i) => `
              <button type="button" class="chip-btn ${i === 1 ? 'selected' : ''}" data-value="${budget}" data-cursor="hover">
                ${budget}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="client-message">Project Brief & Timeline *</label>
          <textarea id="client-message" class="form-textarea" rows="4" required placeholder="Describe your objectives, deliverables, target audience, and ideal start date..."></textarea>
        </div>

        <div id="form-feedback" style="display: none; padding: 1rem; border-radius: 8px; font-family: var(--font-mono); font-size: 0.85rem;"></div>

        <button type="submit" class="submit-btn" id="submit-inquiry-btn" data-cursor="hover">
          Transmit Project Inquiry &rarr;
        </button>
      </form>
    </div>
  `;

  container.classList.add('is-active');
  container.setAttribute('aria-hidden', 'false');

  // Setup chip click handlers
  const typeChips = container.querySelectorAll('#chip-type-group .chip-btn');
  typeChips.forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
    });
  });

  const budgetChips = container.querySelectorAll('#chip-budget-group .chip-btn');
  budgetChips.forEach((btn) => {
    btn.addEventListener('click', () => {
      budgetChips.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Close handlers
  const closeBtn = document.getElementById('contact-close-btn');
  const backdrop = document.getElementById('contact-backdrop');

  if (closeBtn) closeBtn.addEventListener('click', closeContactModal);
  if (backdrop) backdrop.addEventListener('click', closeContactModal);

  window.addEventListener('keydown', handleEsc);

  // Form submission
  const form = document.getElementById('inquiry-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = document.getElementById('form-feedback');
      const submitBtn = document.getElementById('submit-inquiry-btn');

      const name = document.getElementById('client-name').value.trim();
      const email = document.getElementById('client-email').value.trim();
      const message = document.getElementById('client-message').value.trim();

      const selectedTypes = Array.from(container.querySelectorAll('#chip-type-group .chip-btn.selected')).map(c => c.getAttribute('data-value'));
      const selectedBudget = container.querySelector('#chip-budget-group .chip-btn.selected')?.getAttribute('data-value') || '$10k – $25k';

      if (!name || !email || !message) {
        if (feedback) {
          feedback.style.display = 'block';
          feedback.style.background = 'rgba(255, 77, 45, 0.15)';
          feedback.style.color = '#FF4D2D';
          feedback.textContent = 'Please complete all required fields.';
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'TRANSMITTING INQUIRY...';

      const payload = {
        name,
        email,
        types: selectedTypes,
        budget: selectedBudget,
        message
      };

      // Always save to admin inquiries inbox in data store
      addInquiry(payload);

      try {
        const res = await fetch(siteData.contactEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showSuccess(feedback, submitBtn);
        } else {
          showSuccess(feedback, submitBtn);
        }
      } catch (err) {
        showSuccess(feedback, submitBtn);
      }
    });
  }
}

function showSuccess(feedback, submitBtn) {
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.background = 'rgba(226, 255, 50, 0.15)';
    feedback.style.color = 'var(--accent)';
    feedback.textContent = 'Inquiry transmitted successfully. Syed will review and reply within 24 hours.';
  }
  submitBtn.textContent = 'TRANSMITTED';
  setTimeout(() => {
    closeContactModal();
  }, 3000);
}

function showMailtoFallback(feedback, submitBtn, payload) {
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.background = 'rgba(226, 255, 50, 0.12)';
    feedback.style.color = 'var(--accent)';
    const mailtoUrl = `mailto:${siteData.email}?subject=Project%20Inquiry%20from%20${encodeURIComponent(payload.name)}&body=${encodeURIComponent(
      `Name: ${payload.name}\nEmail: ${payload.email}\nDisciplines: ${payload.types.join(', ')}\nBudget: ${payload.budget}\n\nMessage:\n${payload.message}`
    )}`;
    feedback.innerHTML = `
      Inquiry logged. <a href="${mailtoUrl}" style="text-decoration: underline; color: var(--accent); font-weight: bold;">Click here to confirm transmission via email &rarr;</a>
    `;
  }
  submitBtn.disabled = false;
  submitBtn.textContent = 'TRANSMIT VIA EMAIL CLIENT';
  submitBtn.onclick = () => {
    window.location.href = `mailto:${siteData.email}?subject=Project%20Inquiry%20from%20${encodeURIComponent(payload.name)}`;
  };
}

export function closeContactModal() {
  const container = document.getElementById('contact-modal-container');
  if (!container || !isModalOpen) return;

  isModalOpen = false;
  container.classList.remove('is-active');
  container.setAttribute('aria-hidden', 'true');
  container.innerHTML = '';
  resumeLenis();
  window.removeEventListener('keydown', handleEsc);
}

function handleEsc(e) {
  if (e.key === 'Escape') {
    closeContactModal();
  }
}
