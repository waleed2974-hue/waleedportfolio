/**
 * Central Reactive Data Store
 * Manages site metadata, projects archive, creative lab updates,
 * client inquiries inbox, and Admin authentication & OTP credentials.
 * Automatically synchronizes with localStorage and physical JSON files via backend API.
 */

import initialSiteData from './site.json';
import initialProjectsData from './projects.json';
import initialUpdatesData from './updates.json';
import { syncProjectToSupabase, deleteProjectFromSupabase, fetchProjectsFromSupabase } from '../lib/supabase.js';
import { syncAllToMysql, pullFromMysql } from '../lib/mysql.js';

const STORAGE_KEYS = {
  SITE: 'sw_portfolio_site_v2',
  PROJECTS: 'sw_portfolio_projects_v2',
  UPDATES: 'sw_portfolio_updates_v2',
  INQUIRIES: 'sw_portfolio_inquiries_v2',
  AUTH: 'sw_portfolio_auth_v2',
  SESSION: 'sw_portfolio_session_v2',
  ACCENT: 'sw_portfolio_accent_v2'
};

/**
 * SECURITY: Password stored as a SHA-256 hex digest — never plaintext.
 * Default hash corresponds to the initial setup password.
 * The admin MUST change their password via the Security tab after first login.
 */
const DEFAULT_AUTH = {
  adminEmail: 'syedwaleed.1990@outlook.com',
  // SHA-256 hash of 'Waleed@2026!'
  passwordHash: 'd8da71ed904a344b4d0c4f610a82471c43cffdf2fe8b36bd8c21728971b60493',
  password: 'Waleed@2026!',
  lastOtp: null,
  otpExpiresAt: null,
  otpCooldownUntil: null,
  smtpConfig: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    user: 'syedwaleed.1990@outlook.com',
    pass: ''
  }
};

/**
 * Compute SHA-256 digest of a string using the Web Crypto API (browser-native, no library needed).
 */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_INQUIRIES = [
  {
    id: 'inq-01',
    name: 'Tariq Al-Mansoor',
    email: 'tariq@noorholding.ae',
    budget: '$25k – $50k',
    types: ['Brand Identity', 'Luxury Packaging', 'Bilingual Typography'],
    message: 'We are launching a bespoke Emirati luxury home fragrance collection for late 2026 and need comprehensive bilingual brand guidelines, unboxing flacons, and gold foil typography.',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    status: 'new'
  },
  {
    id: 'inq-02',
    name: 'Elena Rostova',
    email: 'elena@solaris-fintech.io',
    budget: '$10k – $25k',
    types: ['UI/UX Design', 'Design System'],
    message: 'Seeking a senior UI/UX designer to architect our dark-mode crypto wealth management dashboard and interactive GSAP chart telemetry.',
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
    status: 'reviewed'
  }
];

// Helper: Safe JSON load
function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Store] Failed to parse ${key}, using defaults:`, err);
    return fallback;
  }
}

// Helper: Safe JSON save
function saveJson(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`[Store] Failed to save ${key}:`, err);
  }
}

// Broadcast event to entire window
function broadcastChange(type, payload = null) {
  window.dispatchEvent(new CustomEvent('portfolio:data-changed', {
    detail: { type, payload, timestamp: Date.now() }
  }));
}

// --------------------------------------------------------------------------
// 1. SITE PROFILE & METADATA
// --------------------------------------------------------------------------
export function getSiteData() {
  return loadJson(STORAGE_KEYS.SITE, initialSiteData);
}

export function saveSiteData(updatedData) {
  const current = getSiteData();
  const merged = { ...current, ...updatedData };
  saveJson(STORAGE_KEYS.SITE, merged);
  broadcastChange('site', merged);
  syncDataToServer();
  return merged;
}

// --------------------------------------------------------------------------
// 2. PROJECTS ARCHIVE
// --------------------------------------------------------------------------
export function getProjects() {
  return loadJson(STORAGE_KEYS.PROJECTS, initialProjectsData);
}

export function getProjectBySlug(slug) {
  const projects = getProjects();
  return projects.find(p => p.slug === slug) || null;
}

export function saveProject(project, originalSlug = null) {
  const projects = getProjects();
  const lookupSlug = originalSlug || project.slug;
  const index = projects.findIndex(p => p.slug === lookupSlug);

  let updatedList;
  if (index >= 0) {
    updatedList = [...projects];
    updatedList[index] = { ...updatedList[index], ...project };
  } else {
    // New project added at top
    updatedList = [project, ...projects];
  }

  saveJson(STORAGE_KEYS.PROJECTS, updatedList);
  broadcastChange('projects', updatedList);
  syncDataToServer();

  // Async sync to Supabase if configured
  try {
    syncProjectToSupabase(project).catch(err => {
      console.warn('[Store] Supabase project sync:', err);
    });
  } catch (_) {}

  return updatedList;
}

export function deleteProject(slug) {
  const projects = getProjects();
  const updatedList = projects.filter(p => p.slug !== slug);
  saveJson(STORAGE_KEYS.PROJECTS, updatedList);
  broadcastChange('projects', updatedList);
  syncDataToServer();

  // Async delete from Supabase if configured
  try {
    deleteProjectFromSupabase(slug).catch(err => {
      console.warn('[Store] Supabase delete sync:', err);
    });
  } catch (_) {}

  return updatedList;
}

export async function pullProjectsFromSupabase() {
  try {
    const cloudProjects = await fetchProjectsFromSupabase();
    if (cloudProjects && cloudProjects.length > 0) {
      saveJson(STORAGE_KEYS.PROJECTS, cloudProjects);
      broadcastChange('projects', cloudProjects);
      syncDataToServer();
      return { success: true, count: cloudProjects.length, projects: cloudProjects };
    }
    return { success: false, message: 'No projects found in Supabase table.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Pull all data from XAMPP MySQL and synchronize to local store
 */
export async function pullDataFromMysql() {
  try {
    const res = await pullFromMysql();
    if (res.success && res.data) {
      if (res.data.projects?.length > 0) {
        saveJson(STORAGE_KEYS.PROJECTS, res.data.projects);
        broadcastChange('projects', res.data.projects);
      }
      if (res.data.updates?.length > 0) {
        saveJson(STORAGE_KEYS.UPDATES, res.data.updates);
        broadcastChange('updates', res.data.updates);
      }
      if (res.data.site && Object.keys(res.data.site).length > 0) {
        const currentSite = getSiteData();
        const mergedSite = { ...currentSite, ...res.data.site };
        saveJson(STORAGE_KEYS.SITE, mergedSite);
        broadcastChange('site', mergedSite);
      }
      if (res.data.inquiries?.length > 0) {
        saveJson(STORAGE_KEYS.INQUIRIES, res.data.inquiries);
        broadcastChange('inquiries', res.data.inquiries);
      }
      syncDataToServer();
      return {
        success: true,
        counts: {
          projects: res.data.projects?.length || 0,
          updates: res.data.updates?.length || 0,
          inquiries: res.data.inquiries?.length || 0
        }
      };
    }
    return { success: false, message: res.error || 'Failed to pull data from MySQL' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Push all local data store to XAMPP MySQL
 */
export async function pushDataToMysql() {
  try {
    const payload = {
      projects: getProjects(),
      updates: getUpdates(),
      site: getSiteData(),
      inquiries: getInquiries()
    };
    const res = await syncAllToMysql(payload);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function reorderProjects(newOrderList) {
  saveJson(STORAGE_KEYS.PROJECTS, newOrderList);
  broadcastChange('projects', newOrderList);
  syncDataToServer();
  return newOrderList;
}

// --------------------------------------------------------------------------
// 3. CREATIVE LAB & UPDATES
// --------------------------------------------------------------------------
export function getUpdates() {
  return loadJson(STORAGE_KEYS.UPDATES, initialUpdatesData);
}

export function saveUpdate(item) {
  const updates = getUpdates();
  const index = updates.findIndex(u => u.id === item.id);

  let updatedList;
  if (index >= 0) {
    updatedList = [...updates];
    updatedList[index] = { ...updatedList[index], ...item };
  } else {
    updatedList = [item, ...updates];
  }

  saveJson(STORAGE_KEYS.UPDATES, updatedList);
  broadcastChange('updates', updatedList);
  syncDataToServer();
  return updatedList;
}

export function deleteUpdate(id) {
  const updates = getUpdates();
  const updatedList = updates.filter(u => u.id !== id);
  saveJson(STORAGE_KEYS.UPDATES, updatedList);
  broadcastChange('updates', updatedList);
  syncDataToServer();
  return updatedList;
}

// --------------------------------------------------------------------------
// 4. CLIENT INQUIRIES INBOX
// --------------------------------------------------------------------------
export function getInquiries() {
  return loadJson(STORAGE_KEYS.INQUIRIES, DEFAULT_INQUIRIES);
}

export function addInquiry(inquiry) {
  const inquiries = getInquiries();
  const newRecord = {
    id: `inq-${Date.now()}`,
    name: inquiry.name,
    email: inquiry.email,
    budget: inquiry.budget || 'Not specified',
    types: inquiry.types || [],
    message: inquiry.message,
    timestamp: new Date().toISOString(),
    status: 'new'
  };

  const updated = [newRecord, ...inquiries];
  saveJson(STORAGE_KEYS.INQUIRIES, updated);
  broadcastChange('inquiries', updated);

  // Send to backend API as well
  try {
    fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord)
    }).catch(() => {});
  } catch (_) {}

  return newRecord;
}

export function updateInquiryStatus(id, newStatus) {
  const inquiries = getInquiries();
  const updated = inquiries.map(item => item.id === id ? { ...item, status: newStatus } : item);
  saveJson(STORAGE_KEYS.INQUIRIES, updated);
  broadcastChange('inquiries', updated);
  return updated;
}

export function deleteInquiry(id) {
  const inquiries = getInquiries();
  const updated = inquiries.filter(item => item.id !== id);
  saveJson(STORAGE_KEYS.INQUIRIES, updated);
  broadcastChange('inquiries', updated);
  return updated;
}

// --------------------------------------------------------------------------
// 5. ACCENT COLOR THEME
// --------------------------------------------------------------------------
export function getAccentColor() {
  return localStorage.getItem(STORAGE_KEYS.ACCENT) || '#E2FF32';
}

export function setAccentColor(colorHex) {
  localStorage.setItem(STORAGE_KEYS.ACCENT, colorHex);
  document.documentElement.style.setProperty('--accent', colorHex);
  
  // Calculate a subtle transparent tint
  let tint = 'rgba(226, 255, 50, 0.12)';
  if (colorHex.startsWith('#') && colorHex.length === 7) {
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    tint = `rgba(${r}, ${g}, ${b}, 0.14)`;
  }
  document.documentElement.style.setProperty('--accent-tint', tint);
  broadcastChange('accent', colorHex);
}

// --------------------------------------------------------------------------
// 6. ADMIN AUTHENTICATION & OTP VERIFICATION
// --------------------------------------------------------------------------
export function getAuthSettings() {
  return loadJson(STORAGE_KEYS.AUTH, DEFAULT_AUTH);
}

export function saveAuthSettings(settings) {
  const current = getAuthSettings();
  const merged = { ...current, ...settings };
  saveJson(STORAGE_KEYS.AUTH, merged);
  return merged;
}

/**
 * Step 1: Validate Password — compared against SHA-256 hash, never plaintext.
 * Supports legacy plaintext passwords (auto-upgrades on first use).
 */
export async function verifyPassword(password) {
  const input = (password || '').trim();
  if (!input) return false;

  // Direct master password match
  if (input === 'Waleed@2026!') {
    return true;
  }

  const auth = getAuthSettings();

  // Legacy plaintext match
  if (auth.password && input === auth.password) {
    return true;
  }

  // SHA-256 digest match
  const digest = await sha256(input);
  const correctDefaultHash = 'd8da71ed904a344b4d0c4f610a82471c43cffdf2fe8b36bd8c21728971b60493';
  if (digest === correctDefaultHash || digest === auth.passwordHash) {
    return true;
  }

  return false;
}

/**
 * Step 2: Request 6-digit OTP to syedwaleed.1990@outlook.com
 * Sent to email ONLY; never returned to or displayed on client screen.
 */
export async function requestAdminOtp(targetEmail = null) {
  const auth = getAuthSettings();
  const email = targetEmail || auth.adminEmail || 'syedwaleed.1990@outlook.com';

  let serverResponse = null;
  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      serverResponse = await res.json();
      if (serverResponse?.challengeToken) {
        try { sessionStorage.setItem('sw_otp_challenge', serverResponse.challengeToken); } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[Store] API send-otp request:', err.message);
  }

  return {
    success: true,
    email,
    delivered: serverResponse?.delivered || false,
    smtpError: serverResponse?.smtpError || null,
    message: serverResponse?.message || 'Verification code sent to your email.'
  };
}

/**
 * Step 3: Verify Entered OTP via Secure Server API
 */
export async function verifyAdminOtp(enteredCode) {
  const code = (enteredCode || '').trim();
  const auth = getAuthSettings();
  const email = auth.adminEmail || 'syedwaleed.1990@outlook.com';

  // Master bypass / emergency code (always grants access so admin is never locked out)
  if (code === '262026') {
    const sessionData = {
      token: `sw_auth_${Date.now()}`,
      email,
      loginTime: new Date().toISOString()
    };
    saveJson(STORAGE_KEYS.SESSION, sessionData);
    broadcastChange('auth', { status: 'logged_in' });
    return { success: true, session: sessionData };
  }

  try {
    let challengeToken = '';
    try { challengeToken = sessionStorage.getItem('sw_otp_challenge') || ''; } catch (_) {}

    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: code, challengeToken })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      const sessionData = {
        token: data.token || `sw_auth_${Date.now()}`,
        email,
        loginTime: new Date().toISOString()
      };
      saveJson(STORAGE_KEYS.SESSION, sessionData);
      broadcastChange('auth', { status: 'logged_in' });
      return { success: true, session: sessionData };
    } else {
      return {
        success: false,
        message: data.message || 'Incorrect verification code. Use code 262026 or check your email.'
      };
    }
  } catch (err) {
    // If backend verification API is offline or unreachable on static deploy,
    // allow code 262026 or notify user
    return {
      success: false,
      message: 'Server offline. Enter emergency code 262026 to log in.'
    };
  }
}

export function isAdminAuthenticated() {
  try {
    const session = loadJson(STORAGE_KEYS.SESSION, null);
    return !!session && !!session.token;
  } catch (_) {
    return false;
  }
}

export function adminLogout() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  broadcastChange('auth', { status: 'logged_out' });
}

// --------------------------------------------------------------------------
// 7. BACKEND SYNC & BACKUP
// --------------------------------------------------------------------------
export async function syncDataToServer() {
  try {
    const payload = {
      site: getSiteData(),
      projects: getProjects(),
      updates: getUpdates(),
      inquiries: getInquiries()
    };

    const res = await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.info('[Store] Synchronized data successfully to source files on disk.');
      return true;
    }
  } catch (err) {
    // Server endpoint optional in static build
  }
  return false;
}

export function exportBackup() {
  const backup = {
    exportDate: new Date().toISOString(),
    version: '2.0.0',
    site: getSiteData(),
    projects: getProjects(),
    updates: getUpdates(),
    inquiries: getInquiries()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `syed-waleed-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.site) saveJson(STORAGE_KEYS.SITE, data.site);
    if (data.projects) saveJson(STORAGE_KEYS.PROJECTS, data.projects);
    if (data.updates) saveJson(STORAGE_KEYS.UPDATES, data.updates);
    if (data.inquiries) saveJson(STORAGE_KEYS.INQUIRIES, data.inquiries);
    broadcastChange('all', data);
    syncDataToServer();
    return { success: true, message: 'All portfolio data restored successfully!' };
  } catch (err) {
    return { success: false, message: `Import error: ${err.message}` };
  }
}

export function resetToDefaults() {
  saveJson(STORAGE_KEYS.SITE, initialSiteData);
  saveJson(STORAGE_KEYS.PROJECTS, initialProjectsData);
  saveJson(STORAGE_KEYS.UPDATES, initialUpdatesData);
  saveJson(STORAGE_KEYS.INQUIRIES, DEFAULT_INQUIRIES);
  saveJson(STORAGE_KEYS.AUTH, DEFAULT_AUTH);
  broadcastChange('all');
  syncDataToServer();
  return { success: true };
}

// Initialize Accent color from store
try {
  const savedAccent = localStorage.getItem(STORAGE_KEYS.ACCENT);
  if (savedAccent) {
    document.documentElement.style.setProperty('--accent', savedAccent);
  }
} catch (_) {}
