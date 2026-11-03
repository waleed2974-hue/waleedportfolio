import React, { useState, useEffect } from 'react';
import {
  getSiteData, saveSiteData,
  getProjects, saveProject, deleteProject, reorderProjects, pullProjectsFromSupabase,
  getUpdates, saveUpdate, deleteUpdate,
  getInquiries, updateInquiryStatus, deleteInquiry,
  getAccentColor, setAccentColor,
  getAuthSettings, saveAuthSettings,
  adminLogout, exportBackup, importBackup, resetToDefaults, syncDataToServer,
  requestAdminOtp,
  pullDataFromMysql, pushDataToMysql
} from '../data/store.js';

import {
  getAiConfig, saveAiConfig, generateAiContent,
  generateProjectSummary, generateProjectImpact, generateBio, generateProjectCaseStudyPack
} from '../lib/ai-writer.js';

import {
  fetchMysqlConfig, saveMysqlConfig, testMysqlConnection,
  initMysqlSchema, getMysqlStatus, syncAllToMysql,
  pullFromMysql, downloadSqlExport, getSqlDumpText
} from '../lib/mysql.js';

import {
  getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection,
  syncAllToSupabase, getSupabaseSchemaSql
} from '../lib/supabase.js';

import {
  uploadMediaFile, formatBytes
} from '../lib/cloud-storage.js';

import {
  LayoutDashboard, FolderGit2, FlaskConical, UserCheck, Inbox,
  Shield, ExternalLink, LogOut, Plus, Edit2, Trash2, ArrowUp, ArrowDown,
  Save, Download, Upload, Check, AlertCircle, RefreshCw, Eye, Sparkles,
  Mail, Video, Image as ImageIcon, FileText, Menu, X, Wand2, Database,
  Cloud, Copy, Grid, List, Search, UploadCloud, CheckCircle2, ChevronRight,
  Settings
} from 'lucide-react';

export default function AdminDashboard({ onLogout }) {
  // Navigation
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'updates' | 'profile' | 'ai-writer' | 'cloud' | 'inquiries' | 'security'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Core Data
  const [site, setSite] = useState(getSiteData());
  const [projects, setProjects] = useState(getProjects());
  const [updates, setUpdates] = useState(getUpdates());
  const [inquiries, setInquiries] = useState(getInquiries());
  const [accent, setAccent] = useState(getAccentColor());
  const [auth, setAuth] = useState(getAuthSettings());

  // Project Management State
  const [projectViewMode, setProjectViewMode] = useState('cards'); // 'cards' | 'table'
  const [projectSearch, setProjectSearch] = useState('');
  const [projectFilterDiscipline, setProjectFilterDiscipline] = useState('all');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingProjectOriginalSlug, setEditingProjectOriginalSlug] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState(null);
  const [previewProject, setPreviewProject] = useState(null);
  const [aiGeneratingSummary, setAiGeneratingSummary] = useState(false);
  const [aiGeneratingImpact, setAiGeneratingImpact] = useState(false);

  // Creative Lab Updates Modal State
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [updateMediaUploading, setUpdateMediaUploading] = useState(false);

  // AI Content Studio State
  const [aiStudioTab, setAiStudioTab] = useState('project'); // 'project' | 'bio' | 'copy' | 'settings'
  const [aiConfig, setAiConfigState] = useState(getAiConfig());
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiTone, setAiTone] = useState('luxury');
  const [aiResultText, setAiResultText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProjectForm, setAiProjectForm] = useState({
    title: '',
    client: '',
    category: 'Brand Identity & Packaging',
    brief: ''
  });
  const [aiBioForm, setAiBioForm] = useState({
    role: 'Senior Brand Identity Architect & UI/UX Director',
    location: 'Dubai, UAE',
    highlights: '10+ years directing bespoke visual languages for Emirati luxury houses, fintech flagships, and international design systems.'
  });

  // MySQL & Web Hosting State (XAMPP / cPanel)
  const [mysqlConfig, setMysqlConfig] = useState({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'portfolio',
    autoSync: true
  });
  const [mysqlStatus, setMysqlStatus] = useState({
    connected: false,
    database: 'portfolio',
    version: '',
    projectsCount: 0,
    mediaCount: 0,
    updatesCount: 0,
    inquiriesCount: 0
  });
  const [testingMysql, setTestingMysql] = useState(false);
  const [savingMysql, setSavingMysql] = useState(false);
  const [migratingSchema, setMigratingSchema] = useState(false);
  const [syncingMysql, setSyncingMysql] = useState(false);
  const [pullingMysql, setPullingMysql] = useState(false);
  const [exportingSql, setExportingSql] = useState(false);
  const [mysqlFeedback, setMysqlFeedback] = useState(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Security password change state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdFeedback, setPwdFeedback] = useState({ type: '', text: '' });
  const [otpTesting, setOtpTesting] = useState(false);

  // Email SMTP State
  const [smtpConfig, setSmtpConfig] = useState({
    user: 'syedwaleed.1990@outlook.com',
    pass: '',
    service: 'hotmail',
    host: 'smtp-mail.outlook.com',
    port: 587,
    resendApiKey: '',
    brevoApiKey: '',
    gmailUser: '',
    gmailPass: '',
    hasResend: false,
    hasBrevo: false,
    hasGmail: false,
    isConfigured: false
  });
  const [providerTab, setProviderTab] = useState('resend');
  const [savingSmtp, setSavingSmtp] = useState(false);

  // Load initial settings
  useEffect(() => {
    // 1. Fetch SMTP configuration
    fetch('/api/get-smtp')
      .then(res => res.json())
      .then(data => {
        setSmtpConfig(prev => ({
          ...prev,
          user: data.user || 'syedwaleed.1990@outlook.com',
          service: data.service || 'hotmail',
          host: data.host || 'smtp-mail.outlook.com',
          port: data.port || 587,
          hasResend: Boolean(data.hasResend),
          hasBrevo: Boolean(data.hasBrevo),
          hasGmail: Boolean(data.hasGmail),
          isConfigured: Boolean(data.isConfigured)
        }));
        if (data.hasResend) setProviderTab('resend');
        else if (data.hasGmail) setProviderTab('gmail');
        else if (data.hasBrevo) setProviderTab('brevo');
      })
      .catch(() => {});

    // 2. Fetch MySQL configuration & live telemetry
    fetchMysqlConfig()
      .then(cfg => {
        if (cfg) {
          setMysqlConfig(prev => ({
            ...prev,
            host: cfg.host || 'localhost',
            port: cfg.port || 3306,
            user: cfg.user || 'root',
            database: cfg.database || 'portfolio',
            autoSync: cfg.autoSync !== undefined ? Boolean(cfg.autoSync) : true
          }));
        }
      })
      .catch(() => {});

    getMysqlStatus()
      .then(stat => {
        if (stat) setMysqlStatus(stat);
      })
      .catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3800);
  };

  const reloadData = () => {
    setSite(getSiteData());
    setProjects(getProjects());
    setUpdates(getUpdates());
    setInquiries(getInquiries());
    setAccent(getAccentColor());
    setAuth(getAuthSettings());
  };

  // --------------------------------------------------------------------------
  // 1. PROJECT ACTIONS (Add, Edit, Delete, Duplicate, Reorder, High-Res Upload)
  // --------------------------------------------------------------------------
  const openNewProjectModal = () => {
    setEditingProjectOriginalSlug(null);
    setEditingProject({
      slug: '',
      title: '',
      year: new Date().getFullYear().toString(),
      client: '',
      summary: '',
      impact: '',
      disciplines: ['Brand Identity', 'Packaging'],
      launchUrl: '',
      behanceUrl: 'https://behance.net/syedwaleed',
      cover: '',
      media: []
    });
    setProjectModalOpen(true);
  };

  const openEditProjectModal = (proj) => {
    setEditingProjectOriginalSlug(proj.slug);
    setEditingProject(JSON.parse(JSON.stringify(proj)));
    setProjectModalOpen(true);
  };

  const handleDuplicateProject = (proj) => {
    const newSlug = `${proj.slug}-copy-${Date.now().toString().slice(-4)}`;
    const cloned = {
      ...JSON.parse(JSON.stringify(proj)),
      slug: newSlug,
      title: `${proj.title} (Copy)`,
      year: new Date().getFullYear().toString()
    };
    const updated = saveProject(cloned);
    setProjects(updated);
    showToast(`Project cloned as "${cloned.title}"!`);
  };

  const handleSaveProject = (e) => {
    e?.preventDefault();
    if (!editingProject.title) {
      alert('Please fill out the Project Title');
      return;
    }

    // Auto-generate slug if not provided
    const safeSlug = (editingProject.slug || editingProject.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const finalProject = {
      ...editingProject,
      slug: safeSlug,
      cover: editingProject.cover || '/media/projects/luxury-fragrance/cover.webp',
      media: editingProject.media || []
    };

    const updated = saveProject(finalProject, editingProjectOriginalSlug);
    setProjects(updated);
    setProjectModalOpen(false);
    showToast(`Case Study "${finalProject.title}" saved successfully!`);
  };

  const handleDeleteProject = (slug, title) => {
    const updated = deleteProject(slug);
    setProjects(updated);
    setDeleteConfirmProject(null);
    showToast(`Project "${title}" deleted.`);
  };

  const handleMoveProject = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= projects.length) return;
    const copy = [...projects];
    const [moved] = copy.splice(idx, 1);
    copy.splice(newIdx, 0, moved);
    const updated = reorderProjects(copy);
    setProjects(updated);
    showToast('Project display order updated.');
  };

  // High-Res Cover Image Upload (Cloudflare R2 or Local)
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploading(true);
    try {
      const res = await uploadMediaFile(file, { folder: 'projects' });
      setEditingProject(prev => ({ ...prev, cover: res.url }));
      showToast(`High-resolution cover uploaded via ${res.provider}!`);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setCoverUploading(false);
    }
  };

  // High-Res Media Gallery Upload (Banner, Square, Video MP4)
  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setGalleryUploading(true);
    try {
      const uploadedItems = [];
      for (const file of files) {
        const res = await uploadMediaFile(file, { folder: 'projects' });
        const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4');
        uploadedItems.push({
          type: isVideo ? 'video' : 'banner',
          src: res.url,
          alt: `${editingProject.title || 'Case Study'} Media Showcase`,
          poster: isVideo ? editingProject.cover : undefined
        });
      }

      setEditingProject(prev => ({
        ...prev,
        media: [...(prev.media || []), ...uploadedItems]
      }));
      showToast(`${uploadedItems.length} media asset(s) added to case study gallery!`);
    } catch (err) {
      alert(`Gallery upload error: ${err.message}`);
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleRemoveMediaItem = (idx) => {
    setEditingProject(prev => {
      const copy = [...(prev.media || [])];
      copy.splice(idx, 1);
      return { ...prev, media: copy };
    });
  };

  const handleMoveMediaItem = (idx, direction) => {
    setEditingProject(prev => {
      const copy = [...(prev.media || [])];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const [moved] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, moved);
      return { ...prev, media: copy };
    });
  };

  // Inline AI Writing inside Project Modal
  const handleAiAutoSummary = async () => {
    if (!editingProject.title) {
      alert('Please enter a Project Title first so the AI can craft a summary.');
      return;
    }
    setAiGeneratingSummary(true);
    try {
      const summary = await generateProjectSummary({
        title: editingProject.title,
        client: editingProject.client,
        notes: editingProject.summary,
        disciplines: editingProject.disciplines
      });
      setEditingProject(prev => ({ ...prev, summary }));
      showToast('AI crafted a luxury project summary!');
    } catch (err) {
      alert(`AI error: ${err.message}`);
    } finally {
      setAiGeneratingSummary(false);
    }
  };

  const handleAiAutoImpact = async () => {
    if (!editingProject.title) {
      alert('Please enter a Project Title first.');
      return;
    }
    setAiGeneratingImpact(true);
    try {
      const impact = await generateProjectImpact({
        title: editingProject.title,
        client: editingProject.client,
        notes: editingProject.summary
      });
      setEditingProject(prev => ({ ...prev, impact }));
      showToast('AI generated a high-impact metric!');
    } catch (err) {
      alert(`AI error: ${err.message}`);
    } finally {
      setAiGeneratingImpact(false);
    }
  };

  // Filtered projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      (p.title || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.client || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.slug || '').toLowerCase().includes(projectSearch.toLowerCase());

    const matchesDiscipline =
      projectFilterDiscipline === 'all' ||
      (p.disciplines && p.disciplines.some(d => d.toLowerCase().includes(projectFilterDiscipline.toLowerCase())));

    return matchesSearch && matchesDiscipline;
  });

  // Extract all unique disciplines for filter
  const allDisciplines = Array.from(
    new Set(projects.flatMap(p => p.disciplines || []))
  );

  // --------------------------------------------------------------------------
  // 2. CREATIVE LAB & EXPERIMENTS ACTIONS
  // --------------------------------------------------------------------------
  const openNewUpdateModal = () => {
    setEditingUpdate({
      id: `lab-${Date.now().toString().slice(-4)}`,
      title: '',
      category: 'UI/UX Shots',
      date: 'OCT 2026',
      disciplines: ['UI Design'],
      behanceUrl: 'https://behance.net/syedwaleed',
      type: 'image',
      src: '',
      poster: '',
      aspect: '1/1',
      summary: ''
    });
    setUpdateModalOpen(true);
  };

  const openEditUpdateModal = (item) => {
    setEditingUpdate(JSON.parse(JSON.stringify(item)));
    setUpdateModalOpen(true);
  };

  const handleSaveUpdate = (e) => {
    e?.preventDefault();
    if (!editingUpdate.title) {
      alert('Please fill out the title.');
      return;
    }
    const updated = saveUpdate(editingUpdate);
    setUpdates(updated);
    setUpdateModalOpen(false);
    showToast(`Lab Experiment "${editingUpdate.title}" saved!`);
  };

  const handleDeleteUpdate = (id, title) => {
    if (confirm(`Delete experimental shot "${title}"?`)) {
      const updated = deleteUpdate(id);
      setUpdates(updated);
      showToast(`Shot "${title}" deleted.`);
    }
  };

  const handleUpdateMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdateMediaUploading(true);
    try {
      const res = await uploadMediaFile(file, { folder: 'updates' });
      const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4');
      setEditingUpdate(prev => ({
        ...prev,
        src: res.url,
        type: isVideo ? 'video' : 'image'
      }));
      showToast(`Shot media uploaded (${res.provider})!`);
    } catch (err) {
      alert(`Media upload error: ${err.message}`);
    } finally {
      setUpdateMediaUploading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. AI CONTENT STUDIO ACTIONS
  // --------------------------------------------------------------------------
  const handleGenerateProjectPackage = async () => {
    setAiLoading(true);
    setAiResultText('');
    try {
      const pack = await generateProjectCaseStudyPack({
        title: aiProjectForm.title,
        client: aiProjectForm.client,
        category: aiProjectForm.category,
        brief: aiProjectForm.brief,
        tone: aiTone
      });
      const formatted = `TITLE:
${pack.title}

EXECUTIVE SUMMARY:
${pack.summary}

MEASURABLE IMPACT:
${pack.impact}

DISCIPLINES:
${pack.disciplines?.join(', ')}

SUGGESTED ASSET CAPTIONS:
${pack.mediaCaptions?.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

      setAiResultText(formatted);
      showToast('AI Case Study Package generated!');
    } catch (err) {
      setAiResultText(`Error generating copy: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateBioContent = async () => {
    setAiLoading(true);
    setAiResultText('');
    try {
      const result = await generateBio({
        name: site.name || 'Syed Waleed',
        role: aiBioForm.role,
        location: aiBioForm.location,
        highlights: aiBioForm.highlights,
        tone: aiTone
      });
      setAiResultText(result);
      showToast('AI Bio & Philosophy generated!');
    } catch (err) {
      setAiResultText(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCustomAiPrompt = async () => {
    if (!aiPromptInput.trim()) return;
    setAiLoading(true);
    setAiResultText('');
    try {
      const result = await generateAiContent({
        prompt: aiPromptInput,
        tone: aiTone
      });
      setAiResultText(result);
      showToast('AI copy draft generated!');
    } catch (err) {
      setAiResultText(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiToNewProject = () => {
    if (!aiResultText) return;
    // Extract pieces if possible
    const titleMatch = aiResultText.match(/TITLE:\s*([^\n]+)/i);
    const summaryMatch = aiResultText.match(/EXECUTIVE SUMMARY:\s*([\s\S]*?)(?=MEASURABLE IMPACT:|$)/i);
    const impactMatch = aiResultText.match(/MEASURABLE IMPACT:\s*([\s\S]*?)(?=DISCIPLINES:|$)/i);
    const disciplinesMatch = aiResultText.match(/DISCIPLINES:\s*([^\n]+)/i);

    const title = titleMatch ? titleMatch[1].trim() : (aiProjectForm.title || 'New Luxury Project');
    const summary = summaryMatch ? summaryMatch[1].trim() : aiResultText.slice(0, 160);
    const impact = impactMatch ? impactMatch[1].trim() : '+120% client engagement uplift.';
    const disciplines = disciplinesMatch
      ? disciplinesMatch[1].split(',').map(s => s.trim())
      : ['Brand Identity', 'Packaging'];

    setEditingProjectOriginalSlug(null);
    setEditingProject({
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      year: new Date().getFullYear().toString(),
      client: aiProjectForm.client || '',
      summary,
      impact,
      disciplines,
      launchUrl: '',
      behanceUrl: 'https://behance.net/syedwaleed',
      cover: '/media/projects/luxury-fragrance/cover.webp',
      media: []
    });
    setProjectModalOpen(true);
    setActiveTab('projects');
    showToast('AI text populated into New Case Study!');
  };

  const handleApplyAiToSiteBio = () => {
    if (!aiResultText) return;
    const heroMatch = aiResultText.match(/HERO TAGLINE[:\n]+([^\n]+)/i);
    const bioMatch = aiResultText.match(/EXECUTIVE BIO[:\n]+([\s\S]*?)(?=ELEVATOR PITCH:|$)/i);

    const updated = {
      ...site,
      bio: bioMatch ? bioMatch[1].trim() : aiResultText,
      headline: heroMatch ? heroMatch[1].trim() : site.headline
    };

    saveSiteData(updated);
    setSite(updated);
    setActiveTab('profile');
    showToast('AI copy applied directly to Site & Bio profile!');
  };

  // --------------------------------------------------------------------------
  // 4. MYSQL & ONLINE WEB HOSTING ACTIONS
  // --------------------------------------------------------------------------
  const handleSaveMysqlConfig = async (e) => {
    e?.preventDefault();
    setSavingMysql(true);
    setMysqlFeedback(null);
    try {
      const res = await saveMysqlConfig(mysqlConfig);
      setSavingMysql(false);
      if (res.success) {
        showToast('MySQL configuration saved successfully!');
        // Refresh telemetry
        const status = await getMysqlStatus();
        setMysqlStatus(status);
      } else {
        alert(res.error || 'Failed to save MySQL config');
      }
    } catch (err) {
      setSavingMysql(false);
      alert(`Error saving MySQL config: ${err.message}`);
    }
  };

  const handleTestMysql = async () => {
    setTestingMysql(true);
    setMysqlFeedback(null);
    try {
      const result = await testMysqlConnection(mysqlConfig);
      setMysqlFeedback(result);
      if (result.success) {
        showToast(result.message || 'Connected to XAMPP MySQL successfully!');
        const status = await getMysqlStatus();
        setMysqlStatus(status);
      }
    } catch (err) {
      setMysqlFeedback({ success: false, message: err.message });
    } finally {
      setTestingMysql(false);
    }
  };

  const handleInitMysqlSchema = async () => {
    setMigratingSchema(true);
    setMysqlFeedback(null);
    try {
      const result = await initMysqlSchema(mysqlConfig);
      setMysqlFeedback(result);
      if (result.success) {
        showToast('MySQL tables initialized and upgraded!');
        const status = await getMysqlStatus();
        setMysqlStatus(status);
      }
    } catch (err) {
      setMysqlFeedback({ success: false, message: err.message });
    } finally {
      setMigratingSchema(false);
    }
  };

  const handlePushAllToMysql = async () => {
    setSyncingMysql(true);
    try {
      const res = await syncAllToMysql({
        projects,
        updates,
        site,
        inquiries
      });
      if (res.success) {
        showToast(`Synchronized all data to MySQL (${res.count?.projects || projects.length} case studies, ${res.count?.updates || updates.length} lab updates)!`);
        const status = await getMysqlStatus();
        setMysqlStatus(status);
      } else {
        alert(`MySQL push notice: ${res.error || res.message}`);
      }
    } catch (err) {
      alert(`Error pushing to MySQL: ${err.message}`);
    } finally {
      setSyncingMysql(false);
    }
  };

  const handlePullFromMysql = async () => {
    setPullingMysql(true);
    try {
      const res = await pullDataFromMysql();
      if (res.success) {
        reloadData();
        showToast(`Loaded ${res.counts.projects} projects, ${res.counts.updates} updates from MySQL!`);
        const status = await getMysqlStatus();
        setMysqlStatus(status);
      } else {
        alert(`Could not pull from MySQL: ${res.message}`);
      }
    } catch (err) {
      alert(`Error pulling from MySQL: ${err.message}`);
    } finally {
      setPullingMysql(false);
    }
  };

  const handleDownloadSqlDump = async () => {
    setExportingSql(true);
    try {
      const res = await downloadSqlExport();
      showToast(`Exported ${res.filename} ready for online web hosting (phpMyAdmin)!`);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExportingSql(false);
    }
  };

  const handleCopySqlDump = async () => {
    try {
      const sql = await getSqlDumpText();
      navigator.clipboard.writeText(sql);
      setSqlCopied(true);
      showToast('Complete MySQL SQL Dump copied to clipboard!');
      setTimeout(() => setSqlCopied(false), 3000);
    } catch (err) {
      alert(`Could not copy SQL: ${err.message}`);
    }
  };

  // --------------------------------------------------------------------------
  // 5. SITE PROFILE & SETTINGS
  // --------------------------------------------------------------------------
  const handleSaveSiteProfile = (e) => {
    e.preventDefault();
    const updated = saveSiteData(site);
    setSite(updated);
    showToast('Portfolio metadata and profile saved live!');
  };

  const handleAccentChange = (color) => {
    setAccent(color);
    setAccentColor(color);
    showToast(`Accent theme updated to ${color}`);
  };

  const handleSyncToDisk = async () => {
    const success = await syncDataToServer();
    if (success) {
      showToast('All changes synchronized directly to source JSON files on disk!');
    } else {
      showToast('Synced to local storage.');
    }
  };

  const handleResetFactory = () => {
    if (confirm('Are you sure you want to reset all portfolio content to factory defaults? Any custom edits will be reverted.')) {
      resetToDefaults();
      reloadData();
      showToast('Portfolio reset to default state.');
    }
  };

  const unreadInquiriesCount = inquiries.filter(i => i.status === 'new').length;

  return (
    <div className="admin-layout">
      {/* Mobile Backdrop */}
      <div
        className={`admin-sidebar-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div>
          <div className="admin-brand">
            <div className="admin-brand-left">
              <span className="admin-brand-logo">SW</span>
              <div className="admin-brand-info">
                <h1>Syed Waleed</h1>
                <span>Admin Studio</span>
              </div>
            </div>
            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          <nav className="admin-nav-list">
            <button
              className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
            >
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => { setActiveTab('projects'); setMobileMenuOpen(false); }}
            >
              <FolderGit2 size={18} />
              <span>Case Studies ({projects.length})</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'updates' ? 'active' : ''}`}
              onClick={() => { setActiveTab('updates'); setMobileMenuOpen(false); }}
            >
              <FlaskConical size={18} />
              <span>Creative Lab ({updates.length})</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'ai-writer' ? 'active' : ''}`}
              onClick={() => { setActiveTab('ai-writer'); setMobileMenuOpen(false); }}
            >
              <Sparkles size={18} color="var(--accent, #E2FF32)" />
              <span style={{ color: 'var(--accent, #E2FF32)' }}>AI Copywriter</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'cloud' || activeTab === 'database' ? 'active' : ''}`}
              onClick={() => { setActiveTab('cloud'); setMobileMenuOpen(false); }}
            >
              <Database size={18} />
              <span>MySQL &amp; Hosting</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
            >
              <UserCheck size={18} />
              <span>Site &amp; Bio</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'inquiries' ? 'active' : ''}`}
              onClick={() => { setActiveTab('inquiries'); setMobileMenuOpen(false); }}
            >
              <Inbox size={18} />
              <span>Inquiries</span>
              {unreadInquiriesCount > 0 && (
                <span className="admin-nav-badge">{unreadInquiriesCount}</span>
              )}
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => { setActiveTab('security'); setMobileMenuOpen(false); }}
            >
              <Shield size={18} />
              <span>Security &amp; 2FA</span>
            </button>
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <a href="/" className="admin-live-site-link">
            <ExternalLink size={14} />
            <span>Visit Live Site</span>
          </a>

          <button
            onClick={() => {
              adminLogout();
              onLogout();
            }}
            className="admin-logout-btn"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-area">
        <header className="admin-top-bar">
          <div className="admin-top-left">
            <button
              className="admin-mobile-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle Navigation"
            >
              <Menu size={20} />
            </button>
            <h2 className="admin-top-title">
              {activeTab === 'overview' && 'System Overview & Telemetry'}
              {activeTab === 'projects' && 'Case Studies & Works Manager'}
              {activeTab === 'updates' && 'Creative Lab & Motion Shots'}
              {activeTab === 'ai-writer' && 'AI Content Writing Studio (Free)'}
              {(activeTab === 'cloud' || activeTab === 'database') && 'MySQL Database (XAMPP) & Online Hosting Export'}
              {activeTab === 'profile' && 'Site Identity, Copy & Capabilities'}
              {activeTab === 'inquiries' && 'Client Inquiries & Commission Leads'}
              {activeTab === 'security' && 'Security, OTP Settings & System Sync'}
            </h2>
          </div>

          <div className="admin-top-actions">
            <button
              onClick={() => setActiveTab('ai-writer')}
              className="admin-btn-secondary"
              style={{ color: 'var(--accent, #E2FF32)', borderColor: 'rgba(226, 255, 50, 0.3)' }}
              title="Open AI Content Writing Studio"
            >
              <Sparkles size={14} />
              <span className="hide-mobile">AI Studio</span>
            </button>

            <button
              onClick={handleSyncToDisk}
              className="admin-btn-secondary"
              title="Save all changes directly to source JSON files"
            >
              <Save size={14} />
              <span className="hide-mobile">Sync to Disk</span>
            </button>
          </div>
        </header>

        <div className="admin-view-content">
          {/* ==================== TAB 1: OVERVIEW ==================== */}
          {activeTab === 'overview' && (
            <div>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon-wrap">
                    <FolderGit2 size={24} />
                  </div>
                  <div>
                    <div className="admin-stat-value">{projects.length}</div>
                    <div className="admin-stat-label">Case Studies Archive</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon-wrap">
                    <FlaskConical size={24} />
                  </div>
                  <div>
                    <div className="admin-stat-value">{updates.length}</div>
                    <div className="admin-stat-label">Creative Lab Shots</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon-wrap">
                    <Inbox size={24} />
                  </div>
                  <div>
                    <div className="admin-stat-value">{inquiries.length}</div>
                    <div className="admin-stat-label">Client Leads ({unreadInquiriesCount} new)</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon-wrap" style={{ color: mysqlStatus.connected ? 'var(--accent, #E2FF32)' : '#FFB340' }}>
                    <Database size={24} />
                  </div>
                  <div>
                    <div className="admin-stat-value" style={{ fontSize: '1.1rem', color: mysqlStatus.connected ? 'var(--accent, #E2FF32)' : '#A1A1AA' }}>
                      {mysqlStatus.connected ? 'XAMPP MySQL' : 'Local Disk'}
                    </div>
                    <div className="admin-stat-label">Database &amp; Media Engine</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <h2>Quick Creation &amp; Management</h2>
                    <p>Rapid workflows for updating your portfolio assets and copy.</p>
                  </div>
                </div>
                <div className="admin-card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="admin-btn-primary" onClick={openNewProjectModal}>
                    <Plus size={16} />
                    <span>New Case Study</span>
                  </button>
                  <button className="admin-btn-secondary" onClick={() => setActiveTab('ai-writer')}>
                    <Sparkles size={16} color="var(--accent, #E2FF32)" />
                    <span>AI Content Studio</span>
                  </button>
                  <button className="admin-btn-secondary" onClick={() => setActiveTab('cloud')}>
                    <Database size={16} />
                    <span>MySQL &amp; Web Hosting</span>
                  </button>
                  <button className="admin-btn-secondary" onClick={openNewUpdateModal}>
                    <Plus size={16} />
                    <span>New Lab Shot</span>
                  </button>
                  <button className="admin-btn-secondary" onClick={() => setActiveTab('inquiries')}>
                    <Inbox size={16} />
                    <span>View Inquiries ({unreadInquiriesCount})</span>
                  </button>
                </div>
              </div>

              {/* Recent Inquiries Preview */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <h2>Recent Project Inquiries</h2>
                    <p>Latest briefs submitted from the portfolio contact drawer.</p>
                  </div>
                  <button className="admin-btn-secondary" onClick={() => setActiveTab('inquiries')}>
                    View All &rarr;
                  </button>
                </div>
                <div className="admin-card-body">
                  {inquiries.length === 0 ? (
                    <p style={{ color: '#8E8E93' }}>No inquiries received yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {inquiries.slice(0, 3).map((inq) => (
                        <div
                          key={inq.id}
                          style={{
                            background: '#16161B',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            padding: '1.25rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <strong style={{ color: '#FFFFFF', fontSize: '1rem' }}>{inq.name}</strong>
                              <span style={{ color: '#8E8E93', fontSize: '0.85rem', marginLeft: '0.75rem' }}>{inq.email}</span>
                            </div>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: inq.status === 'new' ? 'var(--accent, #E2FF32)' : 'rgba(255,255,255,0.1)',
                              color: inq.status === 'new' ? '#0B0B0C' : '#FFFFFF',
                              fontWeight: 700
                            }}>
                              {inq.status.toUpperCase()}
                            </span>
                          </div>
                          <p style={{ color: '#A1A1AA', fontSize: '0.9rem', margin: '0.75rem 0' }}>
                            {inq.message}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent, #E2FF32)' }}>
                              Budget: {inq.budget}
                            </span>
                            <a
                              href={`mailto:${inq.email}?subject=Regarding your project inquiry — Syed Waleed`}
                              className="admin-btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              <Mail size={12} />
                              <span>Reply to Client</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: PROJECTS MANAGER (SUPER EASY ADD/EDIT/DELETE) ==================== */}
          {activeTab === 'projects' && (
            <div>
              {/* Top Controls & Search Bar */}
              <div className="admin-card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8E8E93' }} />
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="Search projects, client, slug..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        style={{ paddingLeft: '36px' }}
                      />
                    </div>

                    <select
                      className="admin-select"
                      value={projectFilterDiscipline}
                      onChange={(e) => setProjectFilterDiscipline(e.target.value)}
                      style={{ maxWidth: '180px' }}
                    >
                      <option value="all">All Disciplines</option>
                      {allDisciplines.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* View Switcher: Cards vs Table */}
                    <div style={{ display: 'inline-flex', background: '#16161B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setProjectViewMode('cards')}
                        title="Visual Cards View"
                        style={{
                          background: projectViewMode === 'cards' ? 'rgba(226, 255, 50, 0.15)' : 'transparent',
                          color: projectViewMode === 'cards' ? 'var(--accent, #E2FF32)' : '#8E8E93',
                          border: 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        <Grid size={15} />
                        <span>Cards</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProjectViewMode('table')}
                        title="Compact Table View"
                        style={{
                          background: projectViewMode === 'table' ? 'rgba(226, 255, 50, 0.15)' : 'transparent',
                          color: projectViewMode === 'table' ? 'var(--accent, #E2FF32)' : '#8E8E93',
                          border: 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        <List size={15} />
                        <span>Table</span>
                      </button>
                    </div>

                    <button
                      className="admin-btn-primary"
                      onClick={openNewProjectModal}
                      style={{ padding: '0.55rem 1.25rem' }}
                    >
                      <Plus size={16} />
                      <span>Add New Project</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Visual Showcase Cards View */}
              {projectViewMode === 'cards' ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {filteredProjects.map((proj, idx) => (
                    <div
                      key={proj.slug}
                      style={{
                        background: '#121216',
                        border: '1px solid rgba(255, 255, 255, 0.09)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s ease, border-color 0.2s ease'
                      }}
                    >
                      {/* Cover Thumbnail with Order Badge */}
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          minHeight: '160px',
                          maxHeight: '260px',
                          background: '#0B0B0E',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                        onClick={() => setPreviewProject(proj)}
                        title="Click to preview project details"
                      >
                        <img
                          src={encodeURI(proj.cover || '')}
                          alt={proj.title}
                          style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '260px',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                          onError={(e) => { e.target.src = '/favicon.svg'; }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: 'rgba(0,0,0,0.75)',
                          backdropFilter: 'blur(8px)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          #{idx + 1}
                        </div>

                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          display: 'flex',
                          gap: '0.35rem'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleMoveProject(idx, -1)}
                            disabled={idx === 0}
                            title="Move Up"
                            style={{
                              background: 'rgba(0,0,0,0.75)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: idx === 0 ? '#555' : '#FFF',
                              borderRadius: '4px',
                              padding: '4px',
                              cursor: idx === 0 ? 'default' : 'pointer'
                            }}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveProject(idx, 1)}
                            disabled={idx === projects.length - 1}
                            title="Move Down"
                            style={{
                              background: 'rgba(0,0,0,0.75)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: idx === projects.length - 1 ? '#555' : '#FFF',
                              borderRadius: '4px',
                              padding: '4px',
                              cursor: idx === projects.length - 1 ? 'default' : 'pointer'
                            }}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.75)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          color: 'var(--accent, #E2FF32)'
                        }}>
                          {proj.media?.length || 0} media assets
                        </div>
                      </div>

                      {/* Card Details */}
                      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                            {proj.title}
                          </h3>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#8E8E93' }}>
                            {proj.year}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#A1A1AA', marginBottom: '0.75rem', fontFamily: 'monospace' }}>
                          Client: <strong style={{ color: '#FFF' }}>{proj.client || 'Confidential'}</strong> &bull; /{proj.slug}
                        </div>

                        <p style={{
                          fontSize: '0.85rem',
                          color: '#8E8E93',
                          lineHeight: 1.5,
                          marginBottom: '1rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {proj.summary || 'No summary specified.'}
                        </p>

                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                          {proj.disciplines?.map((d, i) => (
                            <span key={i} style={{ fontFamily: 'monospace', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}>
                              {d}
                            </span>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.45rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            style={{ padding: '0.5rem 0.65rem' }}
                            title="Preview Case Study Details"
                            onClick={() => setPreviewProject(proj)}
                          >
                            <Eye size={14} />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            className="admin-btn-primary"
                            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                            onClick={() => openEditProjectModal(proj)}
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="admin-btn-secondary"
                            style={{ padding: '0.5rem 0.65rem' }}
                            title="Duplicate Project"
                            onClick={() => handleDuplicateProject(proj)}
                          >
                            <Copy size={14} />
                          </button>

                          <button
                            type="button"
                            className="admin-btn-danger"
                            style={{ padding: '0.5rem 0.65rem' }}
                            title="Delete Project"
                            onClick={() => setDeleteConfirmProject(proj)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Classic Table View */
                <div className="admin-card">
                  <div className="admin-card-body" style={{ padding: 0 }}>
                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Preview</th>
                            <th>Title &amp; Slug</th>
                            <th>Client</th>
                            <th>Year</th>
                            <th>Disciplines</th>
                            <th>Assets</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProjects.map((proj, idx) => (
                            <tr key={proj.slug}>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    onClick={() => handleMoveProject(idx, -1)}
                                    disabled={idx === 0}
                                    style={{ background: 'none', border: 'none', color: idx === 0 ? '#444' : '#FFF', cursor: idx === 0 ? 'default' : 'pointer' }}
                                  >
                                    <ArrowUp size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleMoveProject(idx, 1)}
                                    disabled={idx === projects.length - 1}
                                    style={{ background: 'none', border: 'none', color: idx === projects.length - 1 ? '#444' : '#FFF', cursor: idx === projects.length - 1 ? 'default' : 'pointer' }}
                                  >
                                    <ArrowDown size={16} />
                                  </button>
                                </div>
                              </td>
                              <td>
                                <img
                                  src={proj.cover}
                                  alt={proj.title}
                                  style={{ width: '64px', height: '44px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                                  onError={(e) => { e.target.src = '/favicon.svg'; }}
                                />
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{proj.title}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#8E8E93' }}>/{proj.slug}</div>
                              </td>
                              <td>{proj.client || 'Confidential'}</td>
                              <td>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{proj.year}</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  {proj.disciplines?.slice(0, 2).map((d, i) => (
                                    <span key={i} style={{ fontFamily: 'monospace', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}>
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent, #E2FF32)' }}>
                                  {proj.media?.length || 0} items
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                  <button
                                    className="admin-btn-secondary"
                                    style={{ padding: '0.4rem 0.55rem' }}
                                    title="Preview Details"
                                    onClick={() => setPreviewProject(proj)}
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button
                                    className="admin-btn-secondary"
                                    style={{ padding: '0.4rem 0.65rem' }}
                                    onClick={() => openEditProjectModal(proj)}
                                  >
                                    <Edit2 size={13} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    className="admin-btn-secondary"
                                    style={{ padding: '0.4rem 0.55rem' }}
                                    title="Duplicate"
                                    onClick={() => handleDuplicateProject(proj)}
                                  >
                                    <Copy size={13} />
                                  </button>
                                  <button
                                    className="admin-btn-danger"
                                    style={{ padding: '0.4rem 0.55rem' }}
                                    onClick={() => setDeleteConfirmProject(proj)}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: CREATIVE LAB ==================== */}
          {activeTab === 'updates' && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <h2>Creative Lab &amp; Experiments</h2>
                    <p>Manage interactive shots, video demos (mp4), and vector studies.</p>
                  </div>
                  <button className="admin-btn-primary" onClick={openNewUpdateModal}>
                    <Plus size={16} />
                    <span>Add New Shot</span>
                  </button>
                </div>

                <div className="admin-card-body" style={{ padding: 0 }}>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Media</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updates.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div style={{ width: '56px', height: '56px', borderRadius: '6px', overflow: 'hidden', background: '#16161A', position: 'relative' }}>
                                {item.type === 'video' ? (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                                    <Video size={20} color="var(--accent, #E2FF32)" />
                                  </div>
                                ) : (
                                  <img
                                    src={item.src}
                                    alt={item.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.src = '/favicon.svg'; }}
                                  />
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{item.title}</div>
                              <div style={{ fontSize: '0.8rem', color: '#8E8E93', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.summary}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
                                {item.category}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                color: item.type === 'video' ? 'var(--accent, #E2FF32)' : '#A1A1AA'
                              }}>
                                {item.type.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.date}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button
                                  className="admin-btn-secondary"
                                  style={{ padding: '0.45rem 0.75rem' }}
                                  onClick={() => openEditUpdateModal(item)}
                                >
                                  <Edit2 size={14} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  className="admin-btn-danger"
                                  onClick={() => handleDeleteUpdate(item.id, item.title)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: AI CONTENT WRITING STUDIO (FREE) ==================== */}
          {activeTab === 'ai-writer' && (
            <div>
              {/* Studio Intro Banner */}
              <div className="admin-card" style={{
                background: 'linear-gradient(135deg, rgba(226, 255, 50, 0.08) 0%, rgba(20, 20, 26, 1) 100%)',
                borderColor: 'rgba(226, 255, 50, 0.25)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      <Sparkles size={20} color="var(--accent, #E2FF32)" />
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#FFF' }}>
                        AI Content Writing Studio
                      </h2>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: 'rgba(226, 255, 50, 0.15)',
                        color: 'var(--accent, #E2FF32)',
                        border: '1px solid rgba(226, 255, 50, 0.3)'
                      }}>
                        FREE VERSION ACTIVE
                      </span>
                    </div>
                    <p style={{ color: '#A1A1AA', fontSize: '0.88rem', margin: 0 }}>
                      Specialized design copywriter: craft case study challenges, measurable impact metrics, executive bios, and client inquiry responses.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#8E8E93', fontFamily: 'monospace' }}>Tone:</span>
                    <select
                      className="admin-select"
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <option value="luxury">Luxury &amp; Bespoke</option>
                      <option value="minimal">Minimal &amp; Modern Tech</option>
                      <option value="bold">Bold &amp; Award-Winning</option>
                      <option value="executive">Executive &amp; ROI-focused</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Workspace Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'project', label: 'Case Study Copywriter', icon: FolderGit2 },
                  { id: 'bio', label: 'Site Bio & Manifesto', icon: UserCheck },
                  { id: 'copy', label: 'Custom Prompt Sandbox', icon: Wand2 },
                  { id: 'settings', label: 'AI Provider Settings', icon: Settings }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAiStudioTab(t.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 1.1rem',
                        borderRadius: '8px',
                        border: aiStudioTab === t.id ? '1px solid var(--accent, #E2FF32)' : '1px solid rgba(255,255,255,0.08)',
                        background: aiStudioTab === t.id ? 'rgba(226, 255, 50, 0.1)' : '#141418',
                        color: aiStudioTab === t.id ? 'var(--accent, #E2FF32)' : '#A1A1AA',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <Icon size={15} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* AI Workspace Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: aiStudioTab === 'settings' ? '1fr' : '1.1fr 1fr', gap: '1.25rem' }}>
                {/* Left Column: Form Inputs */}
                {aiStudioTab === 'project' && (
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <div className="admin-card-header-left">
                        <h2>Case Study Generator</h2>
                        <p>Generate title, challenge summary, measurable impact, and tags.</p>
                      </div>
                    </div>
                    <div className="admin-card-body">
                      <div className="admin-form-group">
                        <label className="admin-label">Project / Brand Name</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="e.g. AFZAL Scents &amp; ZHALIA Flacons"
                          value={aiProjectForm.title}
                          onChange={(e) => setAiProjectForm({ ...aiProjectForm, title: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">Client or Industry</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="e.g. Luxury Goods UAE / Fintech / Haute Horlogerie"
                          value={aiProjectForm.client}
                          onChange={(e) => setAiProjectForm({ ...aiProjectForm, client: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">Category</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="e.g. Brand Identity, Packaging, UI/UX Design System"
                          value={aiProjectForm.category}
                          onChange={(e) => setAiProjectForm({ ...aiProjectForm, category: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">Rough Notes / Key Features (Optional)</label>
                        <textarea
                          rows={3}
                          className="admin-textarea"
                          placeholder="e.g. Bilingual Arabic and Latin typography, unboxing experience, gold foil, custom flacon 3D bottle..."
                          value={aiProjectForm.brief}
                          onChange={(e) => setAiProjectForm({ ...aiProjectForm, brief: e.target.value })}
                        />
                      </div>

                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={handleGenerateProjectPackage}
                        disabled={aiLoading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                      >
                        <Sparkles size={16} className={aiLoading ? 'spin' : ''} />
                        <span>{aiLoading ? 'Crafting High-End Copy...' : 'Generate Case Study Package'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {aiStudioTab === 'bio' && (
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <div className="admin-card-header-left">
                        <h2>Bio &amp; Philosophy Copywriter</h2>
                        <p>Craft executive designer statements and hero taglines.</p>
                      </div>
                    </div>
                    <div className="admin-card-body">
                      <div className="admin-form-group">
                        <label className="admin-label">Professional Role / Title</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={aiBioForm.role}
                          onChange={(e) => setAiBioForm({ ...aiBioForm, role: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">Base Location</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={aiBioForm.location}
                          onChange={(e) => setAiBioForm({ ...aiBioForm, location: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">Key Milestones &amp; Specializations</label>
                        <textarea
                          rows={4}
                          className="admin-textarea"
                          value={aiBioForm.highlights}
                          onChange={(e) => setAiBioForm({ ...aiBioForm, highlights: e.target.value })}
                        />
                      </div>

                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={handleGenerateBioContent}
                        disabled={aiLoading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                      >
                        <Sparkles size={16} className={aiLoading ? 'spin' : ''} />
                        <span>{aiLoading ? 'Drafting Designer Bio...' : 'Generate Bio & Taglines'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {aiStudioTab === 'copy' && (
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <div className="admin-card-header-left">
                        <h2>Custom Prompt Sandbox</h2>
                        <p>Draft email replies, website CTAs, award submissions, or design essays.</p>
                      </div>
                    </div>
                    <div className="admin-card-body">
                      <div className="admin-form-group">
                        <label className="admin-label">Writing Instruction / Prompt</label>
                        <textarea
                          rows={6}
                          className="admin-textarea"
                          placeholder="e.g. Write a polished executive email reply to Tariq Al-Mansoor proposing a $35k bilingual brand identity flacon proposal..."
                          value={aiPromptInput}
                          onChange={(e) => setAiPromptInput(e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={handleCustomAiPrompt}
                        disabled={aiLoading || !aiPromptInput.trim()}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <Sparkles size={16} className={aiLoading ? 'spin' : ''} />
                        <span>{aiLoading ? 'Generating...' : 'Generate with AI'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {aiStudioTab === 'settings' && (
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <div className="admin-card-header-left">
                        <h2>AI Engine &amp; Free Tier Configuration</h2>
                        <p>Configure which free AI provider powers your dashboard copywriting.</p>
                      </div>
                    </div>
                    <div className="admin-card-body" style={{ maxWidth: '640px' }}>
                      <div className="admin-form-group">
                        <label className="admin-label">AI Engine Provider</label>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...aiConfig, provider: 'pollinations' };
                              setAiConfigState(updated);
                              saveAiConfig(updated);
                              showToast('Pollinations AI (100% Free, No key needed) active!');
                            }}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              borderRadius: '8px',
                              background: aiConfig.provider === 'pollinations' ? 'rgba(226,255,50,0.1)' : '#16161B',
                              border: aiConfig.provider === 'pollinations' ? '1px solid var(--accent, #E2FF32)' : '1px solid rgba(255,255,255,0.1)',
                              color: aiConfig.provider === 'pollinations' ? 'var(--accent, #E2FF32)' : '#FFF',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                              Pollinations AI (Recommended)
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#8E8E93' }}>
                              100% Free &bull; No API key required &bull; Unlimited requests &bull; OpenAI &amp; Mistral models
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...aiConfig, provider: 'gemini' };
                              setAiConfigState(updated);
                              saveAiConfig(updated);
                              showToast('Google Gemini Free API selected.');
                            }}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              borderRadius: '8px',
                              background: aiConfig.provider === 'gemini' ? 'rgba(226,255,50,0.1)' : '#16161B',
                              border: aiConfig.provider === 'gemini' ? '1px solid var(--accent, #E2FF32)' : '1px solid rgba(255,255,255,0.1)',
                              color: aiConfig.provider === 'gemini' ? 'var(--accent, #E2FF32)' : '#FFF',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                              Google Gemini Free Tier
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#8E8E93' }}>
                              Free API key from Google AI Studio &bull; Ultra-fast Gemini Flash
                            </div>
                          </button>
                        </div>
                      </div>

                      {aiConfig.provider === 'pollinations' && (
                        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div className="admin-form-group">
                            <label className="admin-label">
                              Pollinations Secret Key (Optional)
                              <span style={{ fontSize: '0.72rem', color: aiConfig.pollinationsApiKey ? '#10B981' : 'var(--accent, #E2FF32)', marginLeft: '0.5rem', fontWeight: 600 }}>
                                {aiConfig.pollinationsApiKey ? '✓ Secret Key Active' : '● Free Public Mode Active (No Key Needed)'}
                              </span>
                            </label>
                            <input
                              type="password"
                              className="admin-input"
                              placeholder="sk_... (leave empty for 100% free mode)"
                              value={aiConfig.pollinationsApiKey || ''}
                              onChange={(e) => {
                                const updated = { ...aiConfig, pollinationsApiKey: e.target.value };
                                setAiConfigState(updated);
                                saveAiConfig(updated);
                              }}
                            />
                            <p style={{ fontSize: '0.78rem', color: '#8E8E93', marginTop: '0.35rem' }}>
                              Leave blank to generate 100% free with zero configuration! Or enter a secret key from{' '}
                              <a href="https://enter.pollinations.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #E2FF32)', textDecoration: 'underline' }}>
                                enter.pollinations.ai/keys
                              </a>{' '}
                              for dedicated access.
                            </p>
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-label">Model Selection</label>
                            <select
                              className="admin-select"
                              value={aiConfig.pollinationsModel || 'openai/gpt-5.4-nano'}
                              onChange={(e) => {
                                const updated = { ...aiConfig, pollinationsModel: e.target.value };
                                setAiConfigState(updated);
                                saveAiConfig(updated);
                              }}
                            >
                              <option value="openai/gpt-5.4-nano">openai/gpt-5.4-nano (Fast &amp; Accurate)</option>
                              <option value="openai/gpt-4o-mini">openai/gpt-4o-mini (OpenAI Flagship Mini)</option>
                              <option value="google/gemini-2.5-flash-lite">google/gemini-2.5-flash-lite (Ultra Fast)</option>
                              <option value="deepseek/deepseek-v4-flash">deepseek/deepseek-v4-flash (DeepSeek Reasoning)</option>
                              <option value="anthropic/claude-haiku-4.5">anthropic/claude-haiku-4.5 (Anthropic Claude)</option>
                              <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct (Meta LLaMA 3.3)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {aiConfig.provider === 'gemini' && (
                        <div className="admin-form-group" style={{ marginTop: '1.25rem' }}>
                          <label className="admin-label">Google Gemini API Key (Free)</label>
                          <input
                            type="password"
                            className="admin-input"
                            placeholder="AIzaSy..."
                            value={aiConfig.geminiApiKey || ''}
                            onChange={(e) => {
                              const updated = { ...aiConfig, geminiApiKey: e.target.value };
                              setAiConfigState(updated);
                              saveAiConfig(updated);
                            }}
                          />
                          <p style={{ fontSize: '0.78rem', color: '#8E8E93', marginTop: '0.35rem' }}>
                            Get your free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #E2FF32)' }}>Google AI Studio</a>.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Right Column: AI Output & Live Actions */}
                {aiStudioTab !== 'settings' && (
                  <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="admin-card-header">
                      <div className="admin-card-header-left">
                        <h2>Generated Content</h2>
                        <p>Review, edit, or inject directly into your portfolio with 1-click.</p>
                      </div>
                      {aiResultText && (
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => {
                            navigator.clipboard.writeText(aiResultText);
                            showToast('Copied to clipboard!');
                          }}
                        >
                          <Copy size={13} />
                          <span>Copy</span>
                        </button>
                      )}
                    </div>

                    <div className="admin-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <textarea
                        rows={14}
                        className="admin-textarea"
                        style={{
                          flex: 1,
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.85rem',
                          lineHeight: 1.6,
                          background: '#0B0B0E',
                          resize: 'none'
                        }}
                        placeholder="Generated copy will stream here..."
                        value={aiResultText}
                        onChange={(e) => setAiResultText(e.target.value)}
                      />

                      {aiResultText && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {aiStudioTab === 'project' && (
                            <button
                              type="button"
                              className="admin-btn-primary"
                              onClick={handleApplyAiToNewProject}
                              style={{ flex: 1 }}
                            >
                              <Plus size={15} />
                              <span>Create as New Project &rarr;</span>
                            </button>
                          )}

                          {aiStudioTab === 'bio' && (
                            <button
                              type="button"
                              className="admin-btn-primary"
                              onClick={handleApplyAiToSiteBio}
                              style={{ flex: 1 }}
                            >
                              <Check size={15} />
                              <span>Apply to Site Bio &rarr;</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 5: MYSQL DATABASE (XAMPP) & ONLINE HOSTING EXPORT ==================== */}
          {(activeTab === 'cloud' || activeTab === 'database') && (
            <div>
              {/* Telemetry & Connection Status Banner */}
              <div className="admin-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(22, 22, 26, 0.95), rgba(15, 15, 18, 0.95))', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: mysqlStatus.connected ? 'rgba(226, 255, 50, 0.15)' : 'rgba(255, 179, 64, 0.15)',
                      border: `1px solid ${mysqlStatus.connected ? 'var(--accent, #E2FF32)' : '#FFB340'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: mysqlStatus.connected ? 'var(--accent, #E2FF32)' : '#FFB340'
                    }}>
                      <Database size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                          MySQL Database &amp; Local Storage Hub
                        </h2>
                        <span style={{
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          background: mysqlStatus.connected ? 'rgba(226, 255, 50, 0.12)' : 'rgba(255, 179, 64, 0.12)',
                          color: mysqlStatus.connected ? 'var(--accent, #E2FF32)' : '#FFB340',
                          border: `1px solid ${mysqlStatus.connected ? 'rgba(226, 255, 50, 0.3)' : 'rgba(255, 179, 64, 0.3)'}`
                        }}>
                          {mysqlStatus.connected ? `● CONNECTED (XAMPP ${mysqlStatus.version || 'MariaDB'})` : '○ DISCONNECTED FROM MYSQL'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#8E8E93', margin: '0.25rem 0 0' }}>
                        Database: <strong style={{ color: '#FFF' }}>{mysqlStatus.database || mysqlConfig.database}</strong> on <code style={{ color: 'var(--accent, #E2FF32)' }}>{mysqlConfig.host}:{mysqlConfig.port}</code> • Images &amp; MP4s stored in local directory and indexed in MySQL.
                      </p>
                    </div>
                  </div>

                  {/* Telemetry quick pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ padding: '0.4rem 0.8rem', background: '#121215', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.68rem', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects</span>
                      <strong style={{ fontSize: '1rem', color: '#FFF' }}>{mysqlStatus.projectsCount}</strong>
                    </div>
                    <div style={{ padding: '0.4rem 0.8rem', background: '#121215', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.68rem', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Media Uploads</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--accent, #E2FF32)' }}>{mysqlStatus.mediaCount}</strong>
                    </div>
                    <div style={{ padding: '0.4rem 0.8rem', background: '#121215', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.68rem', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lab Shots</span>
                      <strong style={{ fontSize: '1rem', color: '#FFF' }}>{mysqlStatus.updatesCount}</strong>
                    </div>
                    <div style={{ padding: '0.4rem 0.8rem', background: '#121215', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.68rem', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inquiries</span>
                      <strong style={{ fontSize: '1rem', color: '#FFF' }}>{mysqlStatus.inquiriesCount}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. Online Web Hosting 1-Click Export Banner (Highlight Feature) */}
              <div className="admin-card" style={{
                background: 'linear-gradient(135deg, rgba(226, 255, 50, 0.08), rgba(22, 22, 26, 0.95))',
                border: '1px solid rgba(226, 255, 50, 0.3)',
                marginBottom: '1.5rem'
              }}>
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Download size={20} color="var(--accent, #E2FF32)" />
                      <h2 style={{ color: '#FFFFFF' }}>1-Click Export for Online Web Hosting</h2>
                    </div>
                    <p style={{ color: '#D4D4D8' }}>
                      Publish to any web hosting provider (cPanel, Hostinger, Namecheap, GoDaddy, VPS). Download your complete database dump (.sql) with all tables and data pre-formatted, ready to import directly in phpMyAdmin!
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={handleDownloadSqlDump}
                      disabled={exportingSql}
                      style={{
                        background: 'var(--accent, #E2FF32)',
                        color: '#0B0B0C',
                        fontWeight: 700,
                        padding: '0.65rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Download size={16} className={exportingSql ? 'spin' : ''} />
                      <span>{exportingSql ? 'Generating .SQL Dump...' : 'Download .SQL Database Export'}</span>
                    </button>

                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={handleCopySqlDump}
                    >
                      {sqlCopied ? <Check size={14} color="var(--accent, #E2FF32)" /> : <Copy size={14} />}
                      <span>{sqlCopied ? 'SQL Copied!' : 'Copy SQL to Clipboard'}</span>
                    </button>
                  </div>
                </div>

                <div className="admin-card-body" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#FFF', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Deployment Checklist: Moving from XAMPP to Live Online Web Hosting
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    <div style={{ background: '#121215', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent, #E2FF32)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>1</span>
                        <strong style={{ color: '#FFF', fontSize: '0.88rem' }}>Export &amp; Import Database</strong>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#8E8E93', margin: 0, lineHeight: 1.5 }}>
                        Click <strong>Download .SQL Database Export</strong> above. On your hosting cPanel, open <strong>phpMyAdmin</strong> &rarr; click <strong>Import</strong> &rarr; select the downloaded file &rarr; click <strong>Go</strong>.
                      </p>
                    </div>

                    <div style={{ background: '#121215', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent, #E2FF32)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</span>
                        <strong style={{ color: '#FFF', fontSize: '0.88rem' }}>Upload Build &amp; Media</strong>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#8E8E93', margin: 0, lineHeight: 1.5 }}>
                        Build the site (<code style={{ color: 'var(--accent, #E2FF32)' }}>npm run build</code>). Upload the contents of <code style={{ color: '#FFF' }}>dist/</code>, the <code style={{ color: '#FFF' }}>api/</code> folder, and <code style={{ color: '#FFF' }}>public/media/</code> to your web host's <code style={{ color: '#FFF' }}>public_html</code>.
                      </p>
                    </div>

                    <div style={{ background: '#121215', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent, #E2FF32)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</span>
                        <strong style={{ color: '#FFF', fontSize: '0.88rem' }}>Set Online Credentials</strong>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#8E8E93', margin: 0, lineHeight: 1.5 }}>
                        In <code style={{ color: '#FFF' }}>api/config.php</code> on your hosting server, update <code style={{ color: 'var(--accent, #E2FF32)' }}>DB_NAME</code>, <code style={{ color: 'var(--accent, #E2FF32)' }}>DB_USER</code>, and <code style={{ color: 'var(--accent, #E2FF32)' }}>DB_PASS</code> with your cPanel database details. Done!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. MySQL Connection Settings (XAMPP / Local / Remote) */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <h2>XAMPP MySQL Connection Settings</h2>
                    <p>Configure local XAMPP MySQL credentials. By default, XAMPP runs on localhost:3306 with username "root" and no password.</p>
                  </div>
                </div>

                <div className="admin-card-body">
                  <form onSubmit={handleSaveMysqlConfig}>
                    <div className="admin-form-grid">
                      <div className="admin-form-group">
                        <label className="admin-label">MySQL Host *</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="localhost"
                          value={mysqlConfig.host}
                          onChange={(e) => setMysqlConfig({ ...mysqlConfig, host: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">MySQL Port *</label>
                        <input
                          type="number"
                          className="admin-input"
                          placeholder="3306"
                          value={mysqlConfig.port}
                          onChange={(e) => setMysqlConfig({ ...mysqlConfig, port: Number(e.target.value) || 3306 })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">Database Name *</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="portfolio"
                          value={mysqlConfig.database}
                          onChange={(e) => setMysqlConfig({ ...mysqlConfig, database: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">MySQL Username *</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="root"
                          value={mysqlConfig.user}
                          onChange={(e) => setMysqlConfig({ ...mysqlConfig, user: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">MySQL Password (Leave blank for standard XAMPP)</label>
                        <input
                          type="password"
                          className="admin-input"
                          placeholder="Password (usually empty on XAMPP)"
                          value={mysqlConfig.password}
                          onChange={(e) => setMysqlConfig({ ...mysqlConfig, password: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#FFF', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={mysqlConfig.autoSync}
                            onChange={(e) => setMysqlConfig({ ...mysqlConfig, autoSync: e.target.checked })}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent, #E2FF32)' }}
                          />
                          <span>Auto-sync changes to MySQL whenever saved in Admin</span>
                        </label>
                        <span style={{ fontSize: '0.75rem', color: '#8E8E93', marginTop: '0.35rem' }}>
                          When enabled, modifying projects or bio updates writes instantly to both JSON &amp; MySQL.
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={handleTestMysql}
                        disabled={testingMysql}
                      >
                        <RefreshCw size={14} className={testingMysql ? 'spin' : ''} />
                        <span>{testingMysql ? 'Testing Connection...' : 'Test MySQL Connection'}</span>
                      </button>

                      <button
                        type="submit"
                        className="admin-btn-primary"
                        disabled={savingMysql}
                      >
                        <Save size={14} />
                        <span>{savingMysql ? 'Saving Settings...' : 'Save MySQL Settings'}</span>
                      </button>

                      {mysqlFeedback && (
                        <span style={{
                          fontSize: '0.82rem',
                          color: mysqlFeedback.success ? 'var(--accent, #E2FF32)' : '#FF6B4E',
                          marginLeft: '0.5rem'
                        }}>
                          {mysqlFeedback.message}
                        </span>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* 3. Database Schema Migration & Synchronization Operations */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <h2>Table Migration &amp; Data Synchronization</h2>
                    <p>
                      Safely initialize or upgrade database tables (<code style={{ color: 'var(--accent, #E2FF32)' }}>projects</code>, <code style={{ color: 'var(--accent, #E2FF32)' }}>media</code>, <code style={{ color: 'var(--accent, #E2FF32)' }}>updates</code>, <code style={{ color: 'var(--accent, #E2FF32)' }}>site_profile</code>, <code style={{ color: 'var(--accent, #E2FF32)' }}>inquiries</code>, <code style={{ color: 'var(--accent, #E2FF32)' }}>admin</code>). Existing tables and custom columns are preserved!
                    </p>
                  </div>
                </div>

                <div className="admin-card-body">
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={handleInitMysqlSchema}
                      disabled={migratingSchema}
                      title="Create missing tables and add any new columns without losing existing rows"
                    >
                      <Database size={14} className={migratingSchema ? 'spin' : ''} />
                      <span>{migratingSchema ? 'Migrating Schema...' : 'Initialize / Upgrade Tables'}</span>
                    </button>

                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={handlePushAllToMysql}
                      disabled={syncingMysql}
                      title="Upsert all local portfolio case studies, lab items, and profile settings to MySQL"
                    >
                      <UploadCloud size={14} className={syncingMysql ? 'spin' : ''} />
                      <span>{syncingMysql ? 'Pushing Data...' : 'Push Local Portfolio Data to MySQL'}</span>
                    </button>

                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={handlePullFromMysql}
                      disabled={pullingMysql}
                      title="Load projects and updates stored in MySQL directly into the portfolio"
                    >
                      <Download size={14} className={pullingMysql ? 'spin' : ''} />
                      <span>{pullingMysql ? 'Pulling Data...' : 'Pull Projects from MySQL into Portfolio'}</span>
                    </button>
                  </div>

                  <div style={{ marginTop: '1rem', background: '#0B0B0E', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h4 style={{ fontSize: '0.82rem', color: '#FFF', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Active MySQL Schema Structure:
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.78rem', color: '#A1A1AA', fontFamily: 'monospace' }}>
                      <div style={{ background: '#141418', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--accent, #E2FF32)', fontWeight: 700 }}>projects</span>
                        <div style={{ color: '#71717A', marginTop: '0.2rem' }}>id, slug, title, year, client, description, summary, impact, disciplines, image, cover, url, launch_url, behance_url, media</div>
                      </div>
                      <div style={{ background: '#141418', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--accent, #E2FF32)', fontWeight: 700 }}>media</span>
                        <div style={{ color: '#71717A', marginTop: '0.2rem' }}>id, filename, url, file_path, file_type, mime_type, file_size, folder, created_at</div>
                      </div>
                      <div style={{ background: '#141418', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--accent, #E2FF32)', fontWeight: 700 }}>updates</span>
                        <div style={{ color: '#71717A', marginTop: '0.2rem' }}>id, title, category, date, disciplines, type, src, poster, aspect, summary, behance_url</div>
                      </div>
                      <div style={{ background: '#141418', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--accent, #E2FF32)', fontWeight: 700 }}>site_profile &amp; inquiries</span>
                        <div style={{ color: '#71717A', marginTop: '0.2rem' }}>setting_key, setting_value, client leads, admin credentials</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Local High-Res Media Storage Details */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ImageIcon size={18} color="var(--accent, #E2FF32)" />
                      <h2>Local High-Res Media Library (JPG, PNG, WEBP, MP4)</h2>
                    </div>
                    <p>
                      Images and videos uploaded via the Case Studies or Creative Lab manager are stored with 100% lossless fidelity in <code style={{ color: '#FFF' }}>public/media/uploads/</code> and automatically recorded in the MySQL <code style={{ color: 'var(--accent, #E2FF32)' }}>media</code> table.
                    </p>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', background: '#121215', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#8E8E93', textTransform: 'uppercase' }}>Storage Destination</span>
                      <strong style={{ color: '#FFF', fontFamily: 'monospace', fontSize: '0.85rem' }}>public/media/uploads/</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#8E8E93', textTransform: 'uppercase' }}>Public URL Base</span>
                      <strong style={{ color: 'var(--accent, #E2FF32)', fontFamily: 'monospace', fontSize: '0.85rem' }}>/media/uploads/[timestamp]_[filename]</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#8E8E93', textTransform: 'uppercase' }}>Supported Formats</span>
                      <strong style={{ color: '#FFF', fontSize: '0.85rem' }}>JPG, PNG, WEBP, SVG, MP4, WEBM</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#8E8E93', textTransform: 'uppercase' }}>Cloud Vendor Lock-in</span>
                      <strong style={{ color: '#30D158', fontSize: '0.85rem' }}>None (100% Self-Hosted &amp; Portable)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 6: SITE PROFILE ==================== */}
          {activeTab === 'profile' && (
            <div>
              <form onSubmit={handleSaveSiteProfile}>
                {/* Accent Color Customizer */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <div className="admin-card-header-left">
                      <h2>Accent Color System</h2>
                      <p>Single token switch that re-themes all interactive glows, badges, and highlights across the entire site.</p>
                    </div>
                  </div>
                  <div className="admin-card-body">
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Acid Chartreuse', hex: '#E2FF32' },
                        { label: 'Neon Vermillion', hex: '#FF4D2D' },
                        { label: 'Cyber Cyan', hex: '#00F0FF' },
                        { label: 'Electric Violet', hex: '#A855F7' }
                      ].map((item) => (
                        <button
                          key={item.hex}
                          type="button"
                          onClick={() => handleAccentChange(item.hex)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '999px',
                            background: accent === item.hex ? `${item.hex}22` : '#18181D',
                            border: `2px solid ${accent === item.hex ? item.hex : 'rgba(255,255,255,0.1)'}`,
                            color: '#FFFFFF',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.hex }} />
                          <span>{item.label}</span>
                        </button>
                      ))}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                        <span style={{ fontSize: '0.8rem', color: '#8E8E93', fontFamily: 'monospace' }}>Custom HEX:</span>
                        <input
                          type="color"
                          value={accent}
                          onChange={(e) => handleAccentChange(e.target.value)}
                          style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* General Bio and Headings with AI helper */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <div className="admin-card-header-left">
                      <h2>Site Identity &amp; Bio Copywriting</h2>
                      <p>Main hero typography, biography, and designer narrative.</p>
                    </div>
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={() => setActiveTab('ai-writer')}
                      style={{ color: 'var(--accent, #E2FF32)' }}
                    >
                      <Sparkles size={14} />
                      <span>AI Bio Studio</span>
                    </button>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-form-grid">
                      <div className="admin-form-group">
                        <label className="admin-label">Designer Name</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={site.name || ''}
                          onChange={(e) => setSite({ ...site, name: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-label">Contact / Inquiries Email</label>
                        <input
                          type="email"
                          className="admin-input"
                          value={site.email || ''}
                          onChange={(e) => setSite({ ...site, email: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group full-width">
                        <label className="admin-label">Hero Headline / Value Proposition</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={site.headline || ''}
                          onChange={(e) => setSite({ ...site, headline: e.target.value })}
                        />
                      </div>

                      <div className="admin-form-group full-width">
                        <label className="admin-label">Biography &amp; Design Philosophy</label>
                        <textarea
                          rows={4}
                          className="admin-textarea"
                          value={site.bio || ''}
                          onChange={(e) => setSite({ ...site, bio: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
                      <button type="submit" className="admin-btn-primary">
                        <Save size={15} />
                        <span>Save Profile Changes</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ==================== TAB 7: INQUIRIES ==================== */}
          {activeTab === 'inquiries' && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <h2>Client Inquiries &amp; Leads Inbox</h2>
                    <p>Review project briefs submitted through the contact drawer.</p>
                  </div>
                </div>

                <div className="admin-card-body">
                  {inquiries.length === 0 ? (
                    <p style={{ color: '#8E8E93' }}>No inquiries received yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {inquiries.map((inq) => (
                        <div
                          key={inq.id}
                          style={{
                            background: '#141418',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            padding: '1.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                              <strong style={{ fontSize: '1.15rem', color: '#FFF' }}>{inq.name}</strong>
                              <span style={{ color: '#8E8E93', fontSize: '0.9rem', marginLeft: '0.75rem' }}>{inq.email}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <select
                                className="admin-select"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                                value={inq.status}
                                onChange={(e) => {
                                  const updated = updateInquiryStatus(inq.id, e.target.value);
                                  setInquiries(updated);
                                  showToast(`Status updated to ${e.target.value}`);
                                }}
                              >
                                <option value="new">New</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="archived">Archived</option>
                              </select>

                              <button
                                type="button"
                                className="admin-btn-danger"
                                style={{ padding: '0.35rem 0.6rem' }}
                                onClick={() => {
                                  if (confirm('Delete this inquiry?')) {
                                    const updated = deleteInquiry(inq.id);
                                    setInquiries(updated);
                                    showToast('Inquiry deleted.');
                                  }
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(226, 255, 50, 0.1)', color: 'var(--accent, #E2FF32)' }}>
                              Budget: {inq.budget}
                            </span>
                            {inq.types?.map((t, idx) => (
                              <span key={idx} style={{ fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}>
                                {t}
                              </span>
                            ))}
                          </div>

                          <div style={{
                            background: '#0B0B0C',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            padding: '1rem',
                            color: '#E4E4E7',
                            fontSize: '0.92rem',
                            lineHeight: 1.6
                          }}>
                            {inq.message}
                          </div>

                          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <a
                              href={`mailto:${inq.email}?subject=Regarding your portfolio commission — Syed Waleed&body=Hi ${inq.name},%0D%0A%0D%0AThank you for reaching out regarding your project (${inq.types?.join(', ')}).%0D%0A%0D%0A`}
                              className="admin-btn-primary"
                              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                            >
                              <Mail size={14} />
                              <span>Draft Reply in Email Client &rarr;</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 8: SECURITY & 2FA ==================== */}
          {activeTab === 'security' && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <h2>Admin Account Email</h2>
                    <p>Every login will send a secure 6-digit OTP to this verified email address.</p>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div className="admin-form-group" style={{ maxWidth: '480px' }}>
                    <label className="admin-label">Admin Email (Specified by Syed Waleed)</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input
                        type="email"
                        className="admin-input"
                        value={auth.adminEmail || 'syedwaleed.1990@outlook.com'}
                        onChange={(e) => setAuth({ ...auth, adminEmail: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={() => {
                          saveAuthSettings({ adminEmail: auth.adminEmail });
                          showToast(`Admin email saved: ${auth.adminEmail}`);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Backup & Factory Reset */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-header-left">
                    <h2>Data Backup &amp; Recovery</h2>
                    <p>Export JSON snapshots, restore past revisions, or sync directly to project files on disk.</p>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="admin-btn-secondary" onClick={() => { exportBackup(); showToast('Backup JSON downloaded!'); }}>
                      <Download size={16} />
                      <span>Download JSON Backup</span>
                    </button>

                    <button className="admin-btn-secondary" onClick={handleSyncToDisk}>
                      <Save size={16} />
                      <span>Sync All to Files on Disk</span>
                    </button>

                    <button
                      className="admin-btn-danger"
                      onClick={handleResetFactory}
                      style={{ marginLeft: 'auto' }}
                    >
                      <span>Reset to Factory Defaults</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================== PROJECT EDIT/ADD MODAL (HIGH-RES COVER & GALLERY) ==================== */}
      {projectModalOpen && editingProject && (
        <div className="admin-modal-backdrop" onClick={() => setProjectModalOpen(false)}>
          <div className="admin-modal-window" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveProject}>
              <div className="admin-modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                    {editingProjectOriginalSlug ? 'Edit Case Study' : 'Create New Case Study'}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#8E8E93' }}>
                    High-resolution imagery, gallery media stream, and AI copywriting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#8E8E93', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
                <div className="admin-form-grid">
                  {/* Title & Slug */}
                  <div className="admin-form-group">
                    <label className="admin-label">Project Title *</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingProject.title}
                      placeholder="e.g. AFZAL Scents &amp; ZHALIA Flacons"
                      onChange={(e) => {
                        const title = e.target.value;
                        const slug = editingProjectOriginalSlug
                          ? editingProject.slug
                          : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        setEditingProject({ ...editingProject, title, slug });
                      }}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">URL Slug *</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingProject.slug}
                      placeholder="e.g. luxury-fragrance-branding"
                      onChange={(e) => setEditingProject({ ...editingProject, slug: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Client Name</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingProject.client || ''}
                      placeholder="e.g. AFZAL Luxury Goods UAE"
                      onChange={(e) => setEditingProject({ ...editingProject, client: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Year</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingProject.year}
                      onChange={(e) => setEditingProject({ ...editingProject, year: e.target.value })}
                    />
                  </div>

                  {/* High-Resolution Cover Image Uploader */}
                  <div className="admin-form-group full-width">
                    <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>High-Resolution Cover Photo (JPG, PNG, WEBP) *</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent, #E2FF32)', fontFamily: 'monospace' }}>
                        Disk Storage + MySQL
                      </span>
                    </label>

                    {/* Image Preview Box */}
                    {editingProject.cover && (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        background: '#0B0B0E',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginBottom: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '120px',
                        maxHeight: '320px'
                      }}>
                        <img
                          src={encodeURI(editingProject.cover)}
                          alt="Cover preview"
                          style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '320px',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                          onError={(e) => { e.target.src = '/favicon.svg'; }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingProject({ ...editingProject, cover: '' })}
                          title="Remove cover"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.8)',
                            color: '#FF6B4E',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label
                        className="admin-btn-secondary"
                        style={{
                          cursor: coverUploading ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'rgba(226, 255, 50, 0.08)',
                          borderColor: 'rgba(226, 255, 50, 0.3)',
                          color: 'var(--accent, #E2FF32)'
                        }}
                      >
                        <UploadCloud size={16} className={coverUploading ? 'spin' : ''} />
                        <span>{coverUploading ? 'Uploading High-Res Photo...' : 'Upload Cover Photo (JPG/PNG)'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
                          disabled={coverUploading}
                          onChange={handleCoverUpload}
                        />
                      </label>

                      <input
                        type="text"
                        className="admin-input"
                        style={{ flex: 1, minWidth: '220px' }}
                        placeholder="Or enter direct image URL / path..."
                        value={editingProject.cover}
                        onChange={(e) => setEditingProject({ ...editingProject, cover: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Summary with AI Trigger */}
                  <div className="admin-form-group full-width">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="admin-label" style={{ margin: 0 }}>Summary / Challenge &amp; Architecture</label>
                      <button
                        type="button"
                        onClick={handleAiAutoSummary}
                        disabled={aiGeneratingSummary}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent, #E2FF32)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontWeight: 600
                        }}
                      >
                        <Sparkles size={13} className={aiGeneratingSummary ? 'spin' : ''} />
                        <span>{aiGeneratingSummary ? 'Writing with AI...' : '✨ Write with AI'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      className="admin-textarea"
                      placeholder="Comprehensive brand identity, flacon geometry, and bilingual typography system..."
                      value={editingProject.summary}
                      onChange={(e) => setEditingProject({ ...editingProject, summary: e.target.value })}
                    />
                  </div>

                  {/* Measurable Impact with AI Trigger */}
                  <div className="admin-form-group full-width">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="admin-label" style={{ margin: 0 }}>Measurable Impact</label>
                      <button
                        type="button"
                        onClick={handleAiAutoImpact}
                        disabled={aiGeneratingImpact}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent, #E2FF32)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontWeight: 600
                        }}
                      >
                        <Sparkles size={13} className={aiGeneratingImpact ? 'spin' : ''} />
                        <span>{aiGeneratingImpact ? 'Generating...' : '✨ Generate Metric with AI'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      className="admin-textarea"
                      placeholder="e.g. Delivered 140% surge in regional pre-orders and captured Gold at regional luxury design showcase."
                      value={editingProject.impact}
                      onChange={(e) => setEditingProject({ ...editingProject, impact: e.target.value })}
                    />
                  </div>

                  {/* Disciplines */}
                  <div className="admin-form-group full-width">
                    <label className="admin-label">Disciplines / Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingProject.disciplines?.join(', ') || ''}
                      onChange={(e) => setEditingProject({
                        ...editingProject,
                        disciplines: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="Brand Identity, Luxury Packaging, Bilingual Typography"
                    />
                  </div>

                  {/* Case Study Media Gallery (Photos & MP4 Videos) */}
                  <div className="admin-form-group full-width" style={{
                    background: '#141419',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#FFF' }}>
                          Case Study Media Stream ({editingProject.media?.length || 0} Assets)
                        </h4>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#8E8E93' }}>
                          Upload high-res photography (PNG/JPG) and interactive looped video reels (MP4) for the full case reader.
                        </p>
                      </div>

                      <label
                        className="admin-btn-secondary"
                        style={{
                          cursor: galleryUploading ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <UploadCloud size={14} className={galleryUploading ? 'spin' : ''} />
                        <span>{galleryUploading ? 'Uploading Assets...' : '+ Upload Photos / MP4 Video'}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,video/mp4"
                          style={{ display: 'none' }}
                          disabled={galleryUploading}
                          onChange={handleGalleryUpload}
                        />
                      </label>
                    </div>

                    {/* Media Items List */}
                    {editingProject.media?.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '1.5rem',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#8E8E93',
                        fontSize: '0.85rem'
                      }}>
                        No media assets added yet. Click "+ Upload Photos / MP4 Video" above to populate the case study stream.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {editingProject.media?.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              background: '#0B0B0E',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '8px',
                              padding: '0.65rem 0.85rem'
                            }}
                          >
                            {/* Media thumbnail */}
                            <div style={{ width: '54px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: '#222', flexShrink: 0 }}>
                              {item.type === 'video' ? (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Video size={16} color="var(--accent, #E2FF32)" />
                                </div>
                              ) : (
                                <img
                                  src={item.src}
                                  alt={item.alt}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.src = '/favicon.svg'; }}
                                />
                              )}
                            </div>

                            {/* Type selector */}
                            <select
                              className="admin-select"
                              value={item.type || 'banner'}
                              onChange={(e) => {
                                const copy = [...editingProject.media];
                                copy[idx] = { ...copy[idx], type: e.target.value };
                                setEditingProject({ ...editingProject, media: copy });
                              }}
                              style={{ width: '110px', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              <option value="banner">Banner (Full)</option>
                              <option value="square">Square (Grid)</option>
                              <option value="video">Video (MP4)</option>
                            </select>

                            {/* Caption / Alt */}
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="Photo caption / alt description..."
                              value={item.alt || ''}
                              onChange={(e) => {
                                const copy = [...editingProject.media];
                                copy[idx] = { ...copy[idx], alt: e.target.value };
                                setEditingProject({ ...editingProject, media: copy });
                              }}
                              style={{ flex: 1, fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                            />

                            {/* Reorder and Delete */}
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                type="button"
                                onClick={() => handleMoveMediaItem(idx, -1)}
                                disabled={idx === 0}
                                style={{ background: 'none', border: 'none', color: idx === 0 ? '#444' : '#FFF', cursor: idx === 0 ? 'default' : 'pointer', padding: '2px' }}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveMediaItem(idx, 1)}
                                disabled={idx === editingProject.media.length - 1}
                                style={{ background: 'none', border: 'none', color: idx === editingProject.media.length - 1 ? '#444' : '#FFF', cursor: idx === editingProject.media.length - 1 ? 'default' : 'pointer', padding: '2px' }}
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMediaItem(idx)}
                                style={{ background: 'none', border: 'none', color: '#FF6B4E', cursor: 'pointer', padding: '2px 4px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* External Links */}
                  <div className="admin-form-group">
                    <label className="admin-label">Live Launch URL</label>
                    <input
                      type="url"
                      className="admin-input"
                      value={editingProject.launchUrl || ''}
                      placeholder="https://..."
                      onChange={(e) => setEditingProject({ ...editingProject, launchUrl: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Behance Case Study URL</label>
                    <input
                      type="url"
                      className="admin-input"
                      value={editingProject.behanceUrl || ''}
                      placeholder="https://behance.net/..."
                      onChange={(e) => setEditingProject({ ...editingProject, behanceUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setProjectModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  Save Case Study
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {deleteConfirmProject && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirmProject(null)}>
          <div className="admin-modal-window" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 style={{ color: '#FF6B4E', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>Confirm Deletion</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirmProject(null)}
                style={{ background: 'none', border: 'none', color: '#8E8E93', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ color: '#F4F4F6', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete the case study:
              </p>
              <div style={{
                background: '#141418',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '0.75rem',
                margin: '1rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <img
                  src={deleteConfirmProject.cover}
                  alt={deleteConfirmProject.title}
                  style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px' }}
                  onError={(e) => { e.target.src = '/favicon.svg'; }}
                />
                <div>
                  <strong style={{ color: '#FFF', fontSize: '0.92rem' }}>{deleteConfirmProject.title}</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#8E8E93' }}>/{deleteConfirmProject.slug}</div>
                </div>
              </div>
              <p style={{ color: '#8E8E93', fontSize: '0.8rem', margin: 0 }}>
                This will remove it from the home page showcase, the database, and the case study reader.
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setDeleteConfirmProject(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-danger"
                onClick={() => handleDeleteProject(deleteConfirmProject.slug, deleteConfirmProject.title)}
              >
                Delete Case Study
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PROJECT DETAILS PREVIEW MODAL ==================== */}
      {previewProject && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewProject(null)}>
          <div className="admin-modal-window" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="pill active" style={{ fontSize: '0.7rem', marginBottom: '0.25rem', display: 'inline-block' }}>
                  Project Showcase Preview
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#FFF' }}>
                  {previewProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProject(null)}
                style={{ background: 'none', border: 'none', color: '#8E8E93', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
              {/* Cover Hero Banner */}
              <div style={{
                width: '100%',
                background: '#0B0B0E',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                maxHeight: '480px'
              }}>
                <img
                  src={encodeURI(previewProject.cover || '')}
                  alt={previewProject.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '480px',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => { e.target.src = '/favicon.svg'; }}
                />
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
                <span className="pill active">{previewProject.year || '2026'}</span>
                <span className="pill">Client: {previewProject.client || 'Direct Commission'}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#8E8E93' }}>/{previewProject.slug}</span>
                {previewProject.disciplines?.map((d, i) => (
                  <span key={i} className="pill" style={{ background: 'rgba(255,255,255,0.06)' }}>{d}</span>
                ))}
              </div>

              {/* Challenge & Architecture */}
              <div style={{ background: '#16161B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8E8E93', marginBottom: '0.4rem', fontFamily: 'monospace' }}>
                  Challenge &amp; Architecture
                </div>
                <p style={{ margin: 0, color: '#F4F4F6', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {previewProject.summary || 'No summary provided.'}
                </p>
              </div>

              {/* Measurable Impact */}
              {previewProject.impact && (
                <div style={{ background: '#16161B', border: '1px solid rgba(226, 255, 50, 0.2)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent, #E2FF32)', marginBottom: '0.4rem', fontFamily: 'monospace' }}>
                    Measurable Impact
                  </div>
                  <p style={{ margin: 0, color: 'var(--accent, #E2FF32)', fontSize: '0.95rem', fontWeight: 600 }}>
                    {previewProject.impact}
                  </p>
                </div>
              )}

              {/* External URLs */}
              {(previewProject.launchUrl || previewProject.behanceUrl) && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {previewProject.launchUrl && (
                    <a href={previewProject.launchUrl} target="_blank" rel="noopener noreferrer" className="pill active" style={{ fontSize: '0.8rem' }}>
                      Launch Project &nearr;
                    </a>
                  )}
                  {previewProject.behanceUrl && (
                    <a href={previewProject.behanceUrl} target="_blank" rel="noopener noreferrer" className="pill" style={{ fontSize: '0.8rem' }}>
                      Behance Case Study &nearr;
                    </a>
                  )}
                </div>
              )}

              {/* Gallery Media Stream */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#FFF' }}>
                  Media Stream ({previewProject.media?.length || 0} Assets)
                </h4>

                {(!previewProject.media || previewProject.media.length === 0) ? (
                  <p style={{ color: '#8E8E93', fontSize: '0.85rem' }}>
                    No additional gallery assets added yet. The cover image will be displayed on the website case reader.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {previewProject.media.map((item, idx) => (
                      <div key={idx} style={{
                        background: '#0B0B0E',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        {/* Media display — full image, no cropping */}
                        <div style={{
                          width: '100%',
                          background: '#0B0B0E',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '120px',
                          maxHeight: '320px',
                          overflow: 'hidden'
                        }}>
                          {item.type === 'video' ? (
                            <video
                              src={encodeURI(item.src || '')}
                              poster={item.poster ? encodeURI(item.poster) : ''}
                              controls
                              style={{ width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                            />
                          ) : (
                            <img
                              src={encodeURI(item.src || '')}
                              alt={item.alt || ''}
                              style={{ width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                              onError={(e) => { e.target.src = '/favicon.svg'; }}
                            />
                          )}
                        </div>
                        <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#A1A1AA' }}>
                          <span className="pill" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', marginBottom: '0.25rem', display: 'inline-block' }}>{item.type}</span>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.alt || 'Asset'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setPreviewProject(null)}
              >
                Close Preview
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => {
                  const proj = previewProject;
                  setPreviewProject(null);
                  openEditProjectModal(proj);
                }}
              >
                <Edit2 size={14} />
                <span>Edit This Case Study</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== UPDATE / SHOT MODAL ==================== */}
      {updateModalOpen && editingUpdate && (
        <div className="admin-modal-backdrop" onClick={() => setUpdateModalOpen(false)}>
          <div className="admin-modal-window" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveUpdate}>
              <div className="admin-modal-header">
                <h3>{editingUpdate.title ? 'Edit Lab Experiment' : 'New Lab Experiment'}</h3>
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#8E8E93', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-form-group full-width">
                    <label className="admin-label">Title *</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingUpdate.title}
                      onChange={(e) => setEditingUpdate({ ...editingUpdate, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Category</label>
                    <select
                      className="admin-select"
                      value={editingUpdate.category}
                      onChange={(e) => setEditingUpdate({ ...editingUpdate, category: e.target.value })}
                    >
                      <option value="UI/UX Shots">UI/UX Shots</option>
                      <option value="Brand Marks">Brand Marks</option>
                      <option value="Vector &amp; 3D Studies">Vector &amp; 3D Studies</option>
                      <option value="Code Experiments">Code Experiments</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Date</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingUpdate.date}
                      onChange={(e) => setEditingUpdate({ ...editingUpdate, date: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Media Type (User works with jpg, png, mp4)</label>
                    <select
                      className="admin-select"
                      value={editingUpdate.type}
                      onChange={(e) => setEditingUpdate({ ...editingUpdate, type: e.target.value })}
                    >
                      <option value="image">Static Image (jpg / png / webp)</option>
                      <option value="video">Looped Video Film (mp4)</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Aspect Ratio</label>
                    <select
                      className="admin-select"
                      value={editingUpdate.aspect}
                      onChange={(e) => setEditingUpdate({ ...editingUpdate, aspect: e.target.value })}
                    >
                      <option value="1/1">1:1 Square</option>
                      <option value="16/9">16:9 Wide</option>
                      <option value="4/5">4:5 Tall</option>
                    </select>
                  </div>

                  <div className="admin-form-group full-width">
                    <label className="admin-label">Media Asset (jpg, png, or mp4) *</label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <label
                        className="admin-btn-secondary"
                        style={{
                          cursor: updateMediaUploading ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <UploadCloud size={15} className={updateMediaUploading ? 'spin' : ''} />
                        <span>{updateMediaUploading ? 'Uploading...' : 'Upload Media'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,video/mp4"
                          style={{ display: 'none' }}
                          disabled={updateMediaUploading}
                          onChange={handleUpdateMediaUpload}
                        />
                      </label>

                      <input
                        type="text"
                        className="admin-input"
                        style={{ flex: 1 }}
                        value={editingUpdate.src}
                        onChange={(e) => setEditingUpdate({ ...editingUpdate, src: e.target.value })}
                        required
                        placeholder="Or enter URL / path..."
                      />
                    </div>
                  </div>

                  <div className="admin-form-group full-width">
                    <label className="admin-label">Summary / Technical Notes</label>
                    <textarea
                      rows={3}
                      className="admin-textarea"
                      value={editingUpdate.summary}
                      onChange={(e) => setEditingUpdate({ ...editingUpdate, summary: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setUpdateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  Save Experiment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Toast Notification */}
      {toastMessage && (
        <div className="admin-toast">
          <Check size={18} color="var(--accent, #E2FF32)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
