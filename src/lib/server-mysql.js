import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let pool = null;
let currentPoolKey = '';

export function getMysqlConfig() {
  const rootDir = process.cwd();
  const configPath = path.join(rootDir, 'src', 'data', 'mysql.json');
  let config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'portfolio',
    autoSync: true
  };

  if (fs.existsSync(configPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config = { ...config, ...saved };
    } catch (_) {}
  }

  return config;
}

export function saveMysqlConfig(newCfg) {
  const rootDir = process.cwd();
  const configPath = path.join(rootDir, 'src', 'data', 'mysql.json');
  const existing = getMysqlConfig();
  const merged = {
    host: (newCfg.host !== undefined ? newCfg.host : existing.host).trim(),
    port: Number(newCfg.port) || existing.port || 3306,
    user: (newCfg.user !== undefined ? newCfg.user : existing.user).trim(),
    password: newCfg.password !== undefined ? newCfg.password : existing.password,
    database: (newCfg.database !== undefined ? newCfg.database : existing.database).trim(),
    autoSync: newCfg.autoSync !== undefined ? Boolean(newCfg.autoSync) : existing.autoSync
  };

  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');

  // Reset pool if credentials changed
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
    currentPoolKey = '';
  }

  return merged;
}

export function getPool(overrideCfg = null) {
  const cfg = overrideCfg || getMysqlConfig();
  const key = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.database}`;

  if (!pool || currentPoolKey !== key) {
    if (pool) {
      pool.end().catch(() => {});
    }
    pool = mysql.createPool({
      host: cfg.host,
      port: Number(cfg.port) || 3306,
      user: cfg.user,
      password: cfg.password || '',
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      dateStrings: true
    });
    currentPoolKey = key;
  }

  return pool;
}

/**
 * Test Connection to MySQL
 */
export async function testConnection(customCfg = null) {
  const cfg = customCfg || getMysqlConfig();
  let conn = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port) || 3306,
      user: cfg.user,
      password: cfg.password || '',
      database: cfg.database,
      connectTimeout: 5000
    });

    const [rows] = await conn.query('SELECT VERSION() AS version, DATABASE() AS activeDb');
    const version = rows[0]?.version || 'Unknown';
    const activeDb = rows[0]?.activeDb || cfg.database;

    await conn.end();
    return {
      success: true,
      version,
      database: activeDb,
      message: `Connected successfully to XAMPP MySQL (${version}) on database "${activeDb}"!`
    };
  } catch (err) {
    if (conn) conn.end().catch(() => {});
    return {
      success: false,
      error: err.message,
      code: err.code,
      message: `Could not connect to MySQL: ${err.message}. Please check if XAMPP MySQL is running.`
    };
  }
}

/**
 * Initialize / Upgrade MySQL Tables
 */
export async function initSchema(customCfg = null) {
  const p = getPool(customCfg);
  const cfg = customCfg || getMysqlConfig();

  try {
    // 1. Projects table
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`projects\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`slug\` VARCHAR(191) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`year\` VARCHAR(50) DEFAULT '2026',
        \`client\` VARCHAR(255) DEFAULT '',
        \`description\` TEXT DEFAULT NULL,
        \`summary\` TEXT DEFAULT NULL,
        \`impact\` TEXT DEFAULT NULL,
        \`disciplines\` LONGTEXT DEFAULT NULL,
        \`image\` VARCHAR(500) DEFAULT NULL,
        \`cover\` VARCHAR(500) DEFAULT NULL,
        \`url\` VARCHAR(500) DEFAULT NULL,
        \`launch_url\` VARCHAR(500) DEFAULT NULL,
        \`behance_url\` VARCHAR(500) DEFAULT NULL,
        \`media\` LONGTEXT DEFAULT NULL,
        \`sort_order\` INT(11) DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_projects_slug\` (\`slug\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure all modern columns exist on existing table if created previously
    const [cols] = await p.query('SHOW COLUMNS FROM `projects`');
    const existingColNames = cols.map(c => c.Field.toLowerCase());

    const columnsToAdd = [
      { name: 'slug', def: 'VARCHAR(191) NULL' },
      { name: 'year', def: "VARCHAR(50) DEFAULT '2026'" },
      { name: 'client', def: "VARCHAR(255) DEFAULT ''" },
      { name: 'description', def: 'TEXT DEFAULT NULL' },
      { name: 'summary', def: 'TEXT DEFAULT NULL' },
      { name: 'impact', def: 'TEXT DEFAULT NULL' },
      { name: 'disciplines', def: 'LONGTEXT DEFAULT NULL' },
      { name: 'image', def: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'cover', def: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'url', def: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'launch_url', def: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'behance_url', def: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'media', def: 'LONGTEXT DEFAULT NULL' },
      { name: 'sort_order', def: 'INT(11) DEFAULT 0' },
      { name: 'created_at', def: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', def: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ];

    for (const col of columnsToAdd) {
      if (!existingColNames.includes(col.name.toLowerCase())) {
        try {
          await p.query(`ALTER TABLE \`projects\` ADD COLUMN \`${col.name}\` ${col.def}`);
        } catch (_) {}
      }
    }

    // Backfill any empty slug or cover from image/title
    await p.query(`
      UPDATE \`projects\`
      SET \`slug\` = CONCAT('project-', \`id\`)
      WHERE \`slug\` IS NULL OR \`slug\` = ''
    `);

    await p.query(`
      UPDATE \`projects\`
      SET \`cover\` = \`image\`
      WHERE (\`cover\` IS NULL OR \`cover\` = '') AND (\`image\` IS NOT NULL AND \`image\` != '')
    `);

    await p.query(`
      UPDATE \`projects\`
      SET \`summary\` = \`description\`
      WHERE (\`summary\` IS NULL OR \`summary\` = '') AND (\`description\` IS NOT NULL AND \`description\` != '')
    `);

    // 2. Local Media Library
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`media\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`filename\` VARCHAR(255) NOT NULL,
        \`url\` VARCHAR(500) NOT NULL,
        \`file_path\` VARCHAR(500) DEFAULT NULL,
        \`file_type\` VARCHAR(50) DEFAULT 'image',
        \`mime_type\` VARCHAR(100) DEFAULT NULL,
        \`file_size\` BIGINT(20) DEFAULT 0,
        \`folder\` VARCHAR(100) DEFAULT 'projects',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Creative Lab & Updates
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`updates\` (
        \`id\` VARCHAR(100) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`category\` VARCHAR(100) DEFAULT NULL,
        \`date\` VARCHAR(50) DEFAULT NULL,
        \`disciplines\` LONGTEXT DEFAULT NULL,
        \`type\` VARCHAR(50) DEFAULT 'image',
        \`src\` VARCHAR(500) NOT NULL,
        \`poster\` VARCHAR(500) DEFAULT NULL,
        \`aspect\` VARCHAR(50) DEFAULT '1/1',
        \`summary\` TEXT DEFAULT NULL,
        \`behance_url\` VARCHAR(500) DEFAULT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Site Profile
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`site_profile\` (
        \`setting_key\` VARCHAR(100) NOT NULL,
        \`setting_value\` LONGTEXT NOT NULL,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Inquiries
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`inquiries\` (
        \`id\` VARCHAR(100) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`budget\` VARCHAR(100) DEFAULT NULL,
        \`types\` LONGTEXT DEFAULT NULL,
        \`message\` TEXT DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'new',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Admin credentials table
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`admin\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`username\` VARCHAR(50) NOT NULL,
        \`password\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    return {
      success: true,
      message: `Database tables (projects, media, updates, site_profile, inquiries, admin) verified and active in MySQL!`
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Get Table Counts & Connection Telemetry
 */
export async function getStatus() {
  const p = getPool();
  try {
    const [projectRows] = await p.query('SELECT COUNT(*) AS cnt FROM `projects`').catch(() => [[{ cnt: 0 }]]);
    const [mediaRows] = await p.query('SELECT COUNT(*) AS cnt FROM `media`').catch(() => [[{ cnt: 0 }]]);
    const [updateRows] = await p.query('SELECT COUNT(*) AS cnt FROM `updates`').catch(() => [[{ cnt: 0 }]]);
    const [inquiryRows] = await p.query('SELECT COUNT(*) AS cnt FROM `inquiries`').catch(() => [[{ cnt: 0 }]]);
    const [versionRows] = await p.query('SELECT VERSION() AS ver, DATABASE() AS db');

    return {
      connected: true,
      database: versionRows[0]?.db || 'portfolio',
      version: versionRows[0]?.ver || '',
      projectsCount: projectRows[0]?.cnt || 0,
      mediaCount: mediaRows[0]?.cnt || 0,
      updatesCount: updateRows[0]?.cnt || 0,
      inquiriesCount: inquiryRows[0]?.cnt || 0
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      projectsCount: 0,
      mediaCount: 0,
      updatesCount: 0,
      inquiriesCount: 0
    };
  }
}

/**
 * Log Media Upload to MySQL
 */
export async function logMediaUpload({ filename, url, filePath, fileType, mimeType, fileSize, folder }) {
  try {
    const p = getPool();
    const [res] = await p.query(
      `INSERT INTO \`media\` (\`filename\`, \`url\`, \`file_path\`, \`file_type\`, \`mime_type\`, \`file_size\`, \`folder\`)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [filename, url, filePath || null, fileType || 'image', mimeType || null, fileSize || 0, folder || 'projects']
    );
    return { success: true, id: res.insertId };
  } catch (err) {
    console.warn('[MySQL Media Log Warning]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Push all local portfolio data to MySQL
 */
export async function syncPush({ projects, updates, site, inquiries }) {
  const p = getPool();
  const results = { projects: 0, updates: 0, site: 0, inquiries: 0 };

  try {
    // 1. Ensure schema exists
    await initSchema();

    // 2. Sync Projects
    if (Array.isArray(projects)) {
      for (let i = 0; i < projects.length; i++) {
        const proj = projects[i];
        const slug = proj.slug || `project-${Date.now()}-${i}`;
        const title = proj.title || 'Untitled Project';
        const year = proj.year || '2026';
        const client = proj.client || '';
        const summary = proj.summary || proj.description || '';
        const impact = proj.impact || '';
        const disciplines = JSON.stringify(proj.disciplines || []);
        const cover = proj.cover || proj.image || '';
        const launchUrl = proj.launchUrl || proj.url || '';
        const behanceUrl = proj.behanceUrl || '';
        const media = JSON.stringify(proj.media || []);
        const sortOrder = i;

        await p.query(`
          INSERT INTO \`projects\`
            (\`slug\`, \`title\`, \`year\`, \`client\`, \`description\`, \`summary\`, \`impact\`, \`disciplines\`, \`image\`, \`cover\`, \`url\`, \`launch_url\`, \`behance_url\`, \`media\`, \`sort_order\`)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`title\` = VALUES(\`title\`),
            \`year\` = VALUES(\`year\`),
            \`client\` = VALUES(\`client\`),
            \`description\` = VALUES(\`description\`),
            \`summary\` = VALUES(\`summary\`),
            \`impact\` = VALUES(\`impact\`),
            \`disciplines\` = VALUES(\`disciplines\`),
            \`image\` = VALUES(\`image\`),
            \`cover\` = VALUES(\`cover\`),
            \`url\` = VALUES(\`url\`),
            \`launch_url\` = VALUES(\`launch_url\`),
            \`behance_url\` = VALUES(\`behance_url\`),
            \`media\` = VALUES(\`media\`),
            \`sort_order\` = VALUES(\`sort_order\`)
        `, [slug, title, year, client, summary, summary, impact, disciplines, cover, cover, launchUrl, launchUrl, behanceUrl, media, sortOrder]);
        results.projects++;
      }
    }

    // 3. Sync Updates
    if (Array.isArray(updates)) {
      for (const upd of updates) {
        if (!upd.id) continue;
        const disciplines = JSON.stringify(upd.disciplines || []);
        await p.query(`
          INSERT INTO \`updates\`
            (\`id\`, \`title\`, \`category\`, \`date\`, \`disciplines\`, \`type\`, \`src\`, \`poster\`, \`aspect\`, \`summary\`, \`behance_url\`)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`title\` = VALUES(\`title\`),
            \`category\` = VALUES(\`category\`),
            \`date\` = VALUES(\`date\`),
            \`disciplines\` = VALUES(\`disciplines\`),
            \`type\` = VALUES(\`type\`),
            \`src\` = VALUES(\`src\`),
            \`poster\` = VALUES(\`poster\`),
            \`aspect\` = VALUES(\`aspect\`),
            \`summary\` = VALUES(\`summary\`),
            \`behance_url\` = VALUES(\`behance_url\`)
        `, [upd.id, upd.title || '', upd.category || '', upd.date || '', disciplines, upd.type || 'image', upd.src || '', upd.poster || null, upd.aspect || '1/1', upd.summary || '', upd.behanceUrl || '']);
        results.updates++;
      }
    }

    // 4. Sync Site Profile
    if (site && typeof site === 'object') {
      for (const [key, val] of Object.entries(site)) {
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        await p.query(`
          INSERT INTO \`site_profile\` (\`setting_key\`, \`setting_value\`)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE \`setting_value\` = VALUES(\`setting_value\`)
        `, [key, valStr]);
        results.site++;
      }
    }

    // 5. Sync Inquiries
    if (Array.isArray(inquiries)) {
      for (const inq of inquiries) {
        if (!inq.id) continue;
        const types = JSON.stringify(inq.types || []);
        await p.query(`
          INSERT INTO \`inquiries\` (\`id\`, \`name\`, \`email\`, \`budget\`, \`types\`, \`message\`, \`status\`)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`email\` = VALUES(\`email\`),
            \`budget\` = VALUES(\`budget\`),
            \`types\` = VALUES(\`types\`),
            \`message\` = VALUES(\`message\`),
            \`status\` = VALUES(\`status\`)
        `, [inq.id, inq.name, inq.email, inq.budget || '', types, inq.message || '', inq.status || 'new']);
        results.inquiries++;
      }
    }

    return { success: true, count: results };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Pull all data from MySQL into the portfolio
 */
export async function syncPull() {
  const p = getPool();
  try {
    // 1. Projects
    const [projectRows] = await p.query('SELECT * FROM `projects` ORDER BY `sort_order` ASC, `id` ASC');
    const projects = projectRows.map(r => {
      let disciplines = [];
      try {
        disciplines = typeof r.disciplines === 'string' ? JSON.parse(r.disciplines) : (r.disciplines || []);
      } catch (_) {
        disciplines = r.disciplines ? [String(r.disciplines)] : [];
      }

      let media = [];
      try {
        media = typeof r.media === 'string' ? JSON.parse(r.media) : (r.media || []);
      } catch (_) {
        media = [];
      }

      const cover = r.cover || r.image || '';
      const summary = r.summary || r.description || '';
      const launchUrl = r.launch_url || r.url || '';
      const behanceUrl = r.behance_url || '';

      return {
        id: r.id,
        slug: r.slug || `project-${r.id}`,
        title: r.title || 'Untitled',
        year: r.year || '2026',
        client: r.client || '',
        summary,
        impact: r.impact || '',
        disciplines: Array.isArray(disciplines) ? disciplines : [],
        launchUrl,
        behanceUrl,
        cover,
        media: Array.isArray(media) ? media : []
      };
    });

    // 2. Updates
    const [updateRows] = await p.query('SELECT * FROM `updates` ORDER BY `created_at` DESC').catch(() => [[]]);
    const updates = updateRows.map(r => {
      let disciplines = [];
      try {
        disciplines = typeof r.disciplines === 'string' ? JSON.parse(r.disciplines) : (r.disciplines || []);
      } catch (_) {
        disciplines = [];
      }

      return {
        id: r.id,
        title: r.title,
        category: r.category,
        date: r.date,
        disciplines: Array.isArray(disciplines) ? disciplines : [],
        type: r.type || 'image',
        src: r.src,
        poster: r.poster,
        aspect: r.aspect || '1/1',
        summary: r.summary,
        behanceUrl: r.behance_url
      };
    });

    // 3. Site Profile
    const [siteRows] = await p.query('SELECT * FROM `site_profile`').catch(() => [[]]);
    const site = {};
    for (const row of siteRows) {
      try {
        site[row.setting_key] = JSON.parse(row.setting_value);
      } catch (_) {
        site[row.setting_key] = row.setting_value;
      }
    }

    // 4. Inquiries
    const [inquiryRows] = await p.query('SELECT * FROM `inquiries` ORDER BY `created_at` DESC').catch(() => [[]]);
    const inquiries = inquiryRows.map(r => {
      let types = [];
      try {
        types = typeof r.types === 'string' ? JSON.parse(r.types) : (r.types || []);
      } catch (_) {
        types = [];
      }
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        budget: r.budget,
        types: Array.isArray(types) ? types : [],
        message: r.message,
        status: r.status,
        timestamp: r.created_at
      };
    });

    return {
      success: true,
      data: { projects, updates, site, inquiries }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Generate Complete .SQL Database Dump for Online Web Hosting
 */
export async function generateSqlDump() {
  const p = getPool();
  const cfg = getMysqlConfig();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  let sql = `-- ==============================================================================
-- SYED WALEED PORTFOLIO - COMPLETE MYSQL / MARIADB DATABASE EXPORT
-- Generated: ${now}
-- Target: Online Web Hosting (cPanel, phpMyAdmin, Apache, MariaDB, MySQL 5.7/8.x)
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

`;

  const tables = ['projects', 'media', 'updates', 'site_profile', 'inquiries', 'admin'];

  for (const table of tables) {
    try {
      // Check if table exists
      const [tableExists] = await p.query(`SHOW TABLES LIKE '${table}'`);
      if (tableExists.length === 0) continue;

      sql += `-- --------------------------------------------------------------------------\n`;
      sql += `-- Table structure for table \`${table}\`\n`;
      sql += `-- --------------------------------------------------------------------------\n`;
      sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;

      const [createTableRows] = await p.query(`SHOW CREATE TABLE \`${table}\``);
      if (createTableRows.length > 0) {
        const createSql = createTableRows[0]['Create Table'];
        sql += `${createSql};\n\n`;
      }

      // Dump rows
      const [rows] = await p.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        sql += `-- Dumping data for table \`${table}\` (${rows.length} records)\n`;
        const columns = Object.keys(rows[0]);
        const colList = columns.map(c => `\`${c}\``).join(', ');

        const valueRows = rows.map(row => {
          const vals = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            // Escape string for SQL
            const str = String(val)
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/\r/g, '\\r')
              .replace(/\n/g, '\\n')
              .replace(/\0/g, '\\0');
            return `'${str}'`;
          });
          return `(${vals.join(', ')})`;
        });

        sql += `INSERT INTO \`${table}\` (${colList}) VALUES\n${valueRows.join(',\n')};\n\n`;
      }
    } catch (tblErr) {
      sql += `-- Error dumping table ${table}: ${tblErr.message}\n\n`;
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  sql += `-- ==============================================================================\n`;
  sql += `-- End of export\n`;
  sql += `-- ==============================================================================\n`;

  return sql;
}
