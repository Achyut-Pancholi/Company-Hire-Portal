"use client";

/**
 * schedulerAPI.js
 * Centralized API layer for scheduler interviews.
 * Persistence: localStorage (primary) + mock-db fallback.
 * Designed for easy swap to REST API: change the FETCH_* functions below.
 *
 * Features:
 *  - Request timeout (5s)
 *  - Retry with backoff (max 2 retries)
 *  - Standardized error objects
 *  - Mock latency simulation
 *  - Graceful API failure → localStorage fallback
 */

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY   = 'kl_scheduler_interviews';
const API_BASE      = 'http://localhost:3000/api';
const TIMEOUT_MS    = 5000;
const MAX_RETRIES   = 2;

// ─── Seed Data ────────────────────────────────────────────────────────────────
// No dummy data — scheduler starts clean so only real scheduled interviews appear.

const SEED_INTERVIEWS = [];

// ─── localStorage Persistence ────────────────────────────────────────────────────────────────

// IDs and names of old seed/dummy entries that must be purged on load
const isDummyInterview = (iv) => {
  if (!iv) return false;
  const id = String(iv.id || '').toLowerCase();
  const candidateId = String(iv.candidate_id || '').toLowerCase();
  const candidateName = String(iv.candidate_name || '').toLowerCase();
  const notes = String(iv.notes || '').toLowerCase();
  const meetingLink = String(iv.meeting_link || '').toLowerCase();
  const meetingId = String(iv.meeting_id || '').toLowerCase();

  return (
    id.includes('seed') ||
    id.includes('demo') ||
    id.includes('mock') ||
    candidateId.includes('seed') ||
    candidateId.includes('demo') ||
    meetingId.includes('seed') ||
    meetingId.includes('demo') ||
    meetingLink.includes('seed') ||
    candidateName.includes('nikhil') ||
    candidateName.includes('rahul') ||
    candidateName.includes('jane smith') ||
    notes.includes('java testing fundamentals') ||
    notes.includes('system design round') ||
    notes.includes('culture fit assessment')
  );
};

const storage = {
  getAll() {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return []; // no stored data — return clean empty list
      const parsed = JSON.parse(raw);
      // Purge any old seed/dummy entries left from previous sessions
      const cleaned = parsed.filter(iv => !isDummyInterview(iv));
      if (cleaned.length !== parsed.length) {
        // Silently persist the cleaned list
        this.saveAll(cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveAll(interviews) {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(interviews));
      }
    } catch (e) {
      console.warn('[SchedulerAPI] localStorage write failed:', e);
    }
  },

  insert(interview) {
    const all = this.getAll();
    const updated = [interview, ...all];
    this.saveAll(updated);
    return interview;
  },

  update(id, changes) {
    const all = this.getAll();
    const updated = all.map(iv => iv.id === id ? { ...iv, ...changes, updated_at: new Date().toISOString() } : iv);
    this.saveAll(updated);
    return updated.find(iv => iv.id === id);
  },

  remove(id) {
    const all = this.getAll();
    const updated = all.filter(iv => iv.id !== id);
    this.saveAll(updated);
    return { id, deleted: true };
  },
};

// ─── Fetch Utilities ──────────────────────────────────────────────────────────

const withTimeout = (promise, ms = TIMEOUT_MS) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  );
  return Promise.race([promise, timeout]);
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await withTimeout(fetch(url, options));
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw { status: res.status, message: errBody.error || res.statusText, url };
      }
      return await res.json();
    } catch (err) {
      if (attempt < retries) {
        await sleep(300 * Math.pow(2, attempt)); // exponential backoff
        continue;
      }
      throw err;
    }
  }
};

// Standardized error object
const apiError = (message, status = 500, details = {}) => ({
  error: true,
  message,
  status,
  ...details,
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET all scheduler interviews.
 * Falls back to localStorage if API unavailable.
 */
export const fetchInterviews = async () => {
  try {
    // Attempt real API (future)
    // const data = await fetchWithRetry(`${API_BASE}/scheduler-interviews`);
    // return data;
    throw new Error('Use localStorage');
  } catch {
    // Always use localStorage in current mock mode
    await sleep(120); // mock latency
    return storage.getAll();
  }
};

/**
 * POST create a new scheduler interview.
 * @param {Object} interviewData
 */
export const createInterview = async (interviewData) => {
  const interview = {
    ...interviewData,
    id:         `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status:     interviewData.status || 'scheduled',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    // Also update candidate tech_status in real API
    if (interviewData.candidate_id) {
      fetchWithRetry(`${API_BASE}/candidates`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:          interviewData.candidate_id,
          tech_status: 'Scheduled',
          stage:       'Technical Interview',
        }),
      }).catch(() => {}); // non-blocking
    }
  } catch {}

  await sleep(150);
  return storage.insert(interview);
};

/**
 * PATCH update a scheduler interview (reschedule, cancel, etc.)
 * @param {string} id
 * @param {Object} changes
 */
export const updateInterview = async (id, changes) => {
  await sleep(100);
  const updated = storage.update(id, changes);

  if (!updated) throw apiError('Interview not found', 404);

  // Sync candidate status if cancelled
  if (changes.status === 'cancelled' && updated.candidate_id) {
    fetchWithRetry(`${API_BASE}/candidates`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        id:          updated.candidate_id,
        tech_status: 'Pending',
      }),
    }).catch(() => {});
  }

  return updated;
};

/**
 * DELETE a scheduler interview.
 * @param {string} id
 */
export const deleteInterview = async (id) => {
  await sleep(80);
  return storage.remove(id);
};

/**
 * Batch-check API health (used for connection status indicator).
 * @returns {boolean} true if API is reachable
 */
export const checkAPIHealth = async () => {
  try {
    await withTimeout(fetch(`${API_BASE}/candidates`), 2000);
    return true;
  } catch {
    return false;
  }
};

/**
 * Fetch all panelists from Supabase.
 * Falls back to localStorage if database query fails.
 */
export const fetchPanelists = async () => {
  try {
    const { data, error } = await supabase
      .from('panelists')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return data.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      email: p.email,
      avatar: p.avatar,
      color: p.color,
      daysAvailable: p.days_available || [1, 2, 3, 4, 5]
    }));
  } catch (err) {
    console.error('[SchedulerAPI] fetchPanelists failed, using localStorage fallback:', err);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('kl_scheduler_panelists');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
    }
    return [];
  }
};

/**
 * Create a new panelist in Supabase.
 * Falls back to localStorage on failure.
 */
export const createPanelist = async (panelistData) => {
  const payload = {
    name: panelistData.name,
    role: panelistData.role,
    email: panelistData.email,
    avatar: panelistData.avatar,
    color: panelistData.color,
    days_available: panelistData.daysAvailable || [1, 2, 3, 4, 5]
  };

  try {
    const { data, error } = await supabase
      .from('panelists')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      role: data.role,
      email: data.email,
      avatar: data.avatar,
      color: data.color,
      daysAvailable: data.days_available
    };
  } catch (err) {
    console.error('[SchedulerAPI] createPanelist failed, using localStorage fallback:', err);
    const localRecord = { ...panelistData, id: 'p_' + Date.now() };
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('kl_scheduler_panelists');
        const list = raw ? JSON.parse(raw) : [];
        list.push(localRecord);
        localStorage.setItem('kl_scheduler_panelists', JSON.stringify(list));
      } catch (e) {}
    }
    return localRecord;
  }
};

/**
 * Update an existing panelist in Supabase.
 * Falls back to localStorage on failure.
 */
export const updatePanelist = async (id, panelistData) => {
  const payload = {
    name: panelistData.name,
    role: panelistData.role,
    email: panelistData.email,
    days_available: panelistData.daysAvailable
  };

  if (panelistData.avatar) payload.avatar = panelistData.avatar;
  if (panelistData.color) payload.color = panelistData.color;

  try {
    if (String(id).startsWith('p_')) {
      return await createPanelist(panelistData);
    }

    const { data, error } = await supabase
      .from('panelists')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      role: data.role,
      email: data.email,
      avatar: data.avatar,
      color: data.color,
      daysAvailable: data.days_available
    };
  } catch (err) {
    console.error('[SchedulerAPI] updatePanelist failed, using localStorage fallback:', err);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('kl_scheduler_panelists');
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map(p => p.id === id ? { ...p, ...panelistData } : p);
          localStorage.setItem('kl_scheduler_panelists', JSON.stringify(updated));
        }
      } catch (e) {}
    }
    return { id, ...panelistData };
  }
};

/**
 * Delete a panelist from Supabase.
 * Falls back to localStorage on failure.
 */
export const deletePanelist = async (id) => {
  try {
    if (String(id).startsWith('p_')) {
      throw new Error('Local panelist');
    }

    const { error } = await supabase
      .from('panelists')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[SchedulerAPI] deletePanelist failed, using localStorage fallback:', err);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('kl_scheduler_panelists');
        if (raw) {
          const list = JSON.parse(raw).filter(p => p.id !== id);
          localStorage.setItem('kl_scheduler_panelists', JSON.stringify(list));
        }
      } catch (e) {}
    }
    return true;
  }
};
