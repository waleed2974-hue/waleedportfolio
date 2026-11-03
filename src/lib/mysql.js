/**
 * Client-side MySQL Helper for Syed Waleed Portfolio
 * Communicates with XAMPP MySQL backend API and manages online web hosting exports.
 */

const STORAGE_KEY_MYSQL = 'sw_portfolio_mysql_config_v1';

export function getCachedMysqlConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MYSQL);
    if (!raw) {
      return {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'portfolio',
        autoSync: true
      };
    }
    return JSON.parse(raw);
  } catch (_) {
    return {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'portfolio',
      autoSync: true
    };
  }
}

export function saveCachedMysqlConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY_MYSQL, JSON.stringify(cfg));
  } catch (_) {}
  return cfg;
}

/**
 * Fetch MySQL configuration from server
 */
export async function fetchMysqlConfig() {
  try {
    const res = await fetch('/api/mysql/config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    saveCachedMysqlConfig(data);
    return data;
  } catch (err) {
    return getCachedMysqlConfig();
  }
}

/**
 * Save MySQL configuration on server
 */
export async function saveMysqlConfig(cfg) {
  saveCachedMysqlConfig(cfg);
  const res = await fetch('/api/mysql/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  });
  if (!res.ok) throw new Error(`Failed to save config: HTTP ${res.status}`);
  return await res.json();
}

/**
 * Test Connection to XAMPP MySQL
 */
export async function testMysqlConnection(cfg = null) {
  const payload = cfg ? { config: cfg } : {};
  const res = await fetch('/api/mysql/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

/**
 * Initialize / Upgrade MySQL Tables
 */
export async function initMysqlSchema(cfg = null) {
  const payload = cfg ? { config: cfg } : {};
  const res = await fetch('/api/mysql/init-schema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

/**
 * Get MySQL Telemetry and Table Row Counts
 */
export async function getMysqlStatus() {
  try {
    const res = await fetch('/api/mysql/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { connected: false, error: err.message, projectsCount: 0, mediaCount: 0, updatesCount: 0, inquiriesCount: 0 };
  }
}

/**
 * Push all portfolio data to MySQL
 */
export async function syncAllToMysql(data) {
  const res = await fetch('/api/mysql/sync-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

/**
 * Pull all data from MySQL into the application
 */
export async function pullFromMysql() {
  const res = await fetch('/api/mysql/sync-pull');
  return await res.json();
}

/**
 * Download complete .SQL file for online web hosting (cPanel / phpMyAdmin)
 */
export async function downloadSqlExport() {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `syed_waleed_portfolio_${dateStr}.sql`;

  const res = await fetch('/api/mysql/export-sql');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Export failed');
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);

  return { success: true, filename };
}

/**
 * Fetch raw SQL dump as text for 1-click clipboard copying
 */
export async function getSqlDumpText() {
  const res = await fetch('/api/mysql/export-sql?format=text');
  if (!res.ok) throw new Error('Could not retrieve SQL dump');
  return await res.text();
}
