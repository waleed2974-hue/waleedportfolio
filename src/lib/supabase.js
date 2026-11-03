/**
 * Supabase Database Client & Sync Utility for Syed Waleed Portfolio
 * Handles cloud persistence for projects, site profile, creative lab updates,
 * and inquiries.
 */

import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE = 'sw_portfolio_supabase_config_v1';

export function getSupabaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE);
    if (!raw) {
      return {
        url: '',
        anonKey: '',
        tableName: 'projects',
        autoSync: true,
        isConnected: false
      };
    }
    return JSON.parse(raw);
  } catch (_) {
    return { url: '', anonKey: '', tableName: 'projects', autoSync: true, isConnected: false };
  }
}

export function saveSupabaseConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(cfg));
  } catch (_) {}
  return cfg;
}

let supabaseInstance = null;

export function getSupabaseClient() {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;

  if (!supabaseInstance || supabaseInstance._url !== cfg.url) {
    try {
      supabaseInstance = createClient(cfg.url.trim(), cfg.anonKey.trim());
      supabaseInstance._url = cfg.url;
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

/**
 * Test Connection to Supabase
 */
export async function testSupabaseConnection(overrideConfig = null) {
  const cfg = overrideConfig || getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) {
    return { success: false, message: 'Supabase URL and Anon Key are required.' };
  }

  try {
    const client = createClient(cfg.url.trim(), cfg.anonKey.trim());
    const { data, error } = await client
      .from(cfg.tableName || 'projects')
      .select('count', { count: 'exact', head: true });

    if (error) {
      // If table doesn't exist yet, it's still connected to Supabase
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return {
          success: true,
          tableMissing: true,
          message: `Connected to Supabase! The table "${cfg.tableName || 'projects'}" does not exist yet. Run the SQL schema provided below in your Supabase SQL Editor.`
        };
      }
      return { success: false, message: `Supabase Error: ${error.message} (Code: ${error.code})` };
    }

    return {
      success: true,
      tableMissing: false,
      message: `Successfully connected to Supabase database! Table "${cfg.tableName || 'projects'}" is active.`
    };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}

/**
 * Sync single project to Supabase
 */
export async function syncProjectToSupabase(project) {
  const client = getSupabaseClient();
  const cfg = getSupabaseConfig();
  if (!client) return { success: false, reason: 'Supabase not configured' };

  try {
    const record = {
      slug: project.slug,
      title: project.title,
      year: project.year,
      client: project.client || '',
      summary: project.summary || '',
      impact: project.impact || '',
      disciplines: project.disciplines || [],
      launch_url: project.launchUrl || '',
      behance_url: project.behanceUrl || '',
      cover: project.cover || '',
      media: project.media || [],
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from(cfg.tableName || 'projects')
      .upsert(record, { onConflict: 'slug' });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('[Supabase Sync Error]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Delete project from Supabase
 */
export async function deleteProjectFromSupabase(slug) {
  const client = getSupabaseClient();
  const cfg = getSupabaseConfig();
  if (!client) return { success: false, reason: 'Supabase not configured' };

  try {
    const { error } = await client
      .from(cfg.tableName || 'projects')
      .delete()
      .eq('slug', slug);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all projects from Supabase
 */
export async function fetchProjectsFromSupabase() {
  const client = getSupabaseClient();
  const cfg = getSupabaseConfig();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from(cfg.tableName || 'projects')
      .select('*')
      .order('year', { ascending: false });

    if (error) throw error;
    if (!data) return null;

    // Map DB columns to portfolio schema
    return data.map(item => ({
      slug: item.slug,
      title: item.title,
      year: item.year,
      client: item.client,
      summary: item.summary,
      impact: item.impact,
      disciplines: Array.isArray(item.disciplines) ? item.disciplines : [],
      launchUrl: item.launch_url || item.launchUrl || '',
      behanceUrl: item.behance_url || item.behanceUrl || '',
      cover: item.cover,
      media: Array.isArray(item.media) ? item.media : []
    }));
  } catch (err) {
    console.warn('[Supabase Fetch Error]', err.message);
    return null;
  }
}

/**
 * Full batch push to Supabase
 */
export async function syncAllToSupabase(projects) {
  const client = getSupabaseClient();
  const cfg = getSupabaseConfig();
  if (!client) return { success: false, message: 'Supabase is not configured' };

  try {
    const rows = projects.map(p => ({
      slug: p.slug,
      title: p.title,
      year: p.year,
      client: p.client || '',
      summary: p.summary || '',
      impact: p.impact || '',
      disciplines: p.disciplines || [],
      launch_url: p.launchUrl || '',
      behance_url: p.behanceUrl || '',
      cover: p.cover || '',
      media: p.media || [],
      updated_at: new Date().toISOString()
    }));

    const { error } = await client
      .from(cfg.tableName || 'projects')
      .upsert(rows, { onConflict: 'slug' });

    if (error) throw error;
    return { success: true, count: rows.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Returns Copy-Paste Ready Supabase SQL Schema
 */
export function getSupabaseSchemaSql() {
  return `-- ==========================================================================
-- SYED WALEED PORTFOLIO - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase Project: SQL Editor -> New Query -> Run
-- ==========================================================================

-- 1. Projects / Case Studies Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  year TEXT,
  client TEXT,
  summary TEXT,
  impact TEXT,
  disciplines JSONB DEFAULT '[]'::jsonb,
  launch_url TEXT,
  behance_url TEXT,
  cover TEXT NOT NULL,
  media JSONB DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow Public to Read Projects
CREATE POLICY "Public can view projects" ON public.projects
  FOR SELECT USING (true);

-- Allow Insert / Update / Delete with Anon or Authenticated key
CREATE POLICY "Allow management with anon key" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Site Profile & Metadata Table
CREATE TABLE IF NOT EXISTS public.site_profile (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read site profile" ON public.site_profile FOR SELECT USING (true);
CREATE POLICY "Manage site profile" ON public.site_profile FOR ALL USING (true) WITH CHECK (true);

-- 3. Creative Lab & Updates Table
CREATE TABLE IF NOT EXISTS public.updates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  date TEXT,
  disciplines JSONB DEFAULT '[]'::jsonb,
  type TEXT DEFAULT 'image',
  src TEXT NOT NULL,
  poster TEXT,
  aspect TEXT DEFAULT '1/1',
  summary TEXT,
  behance_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read updates" ON public.updates FOR SELECT USING (true);
CREATE POLICY "Manage updates" ON public.updates FOR ALL USING (true) WITH CHECK (true);

-- 4. Inquiries / Commission Leads Table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  budget TEXT,
  types JSONB DEFAULT '[]'::jsonb,
  message TEXT,
  status TEXT DEFAULT 'new',
  timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert inquiries" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Manage inquiries" ON public.inquiries FOR ALL USING (true) WITH CHECK (true);
`;
}
