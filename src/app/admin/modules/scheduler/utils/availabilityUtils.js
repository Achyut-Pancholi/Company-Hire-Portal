"use client";

/**
 * availabilityUtils.js
 * Panelist availability matrix and smart slot suggestion engine.
 * Pure functions — no side effects.
 */

import {
  timeToMinutes, minutesToTime, getWeekDays, getDateKey,
  snapToGrid, formatTime, START_HOUR, END_HOUR, SLOT_MINUTES
} from './calendarUtils.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKING_START = 9 * 60;   // 9:00 AM
const WORKING_END   = 18 * 60;  // 6:00 PM
const LUNCH_START   = 13 * 60;  // 1:00 PM
const LUNCH_END     = 14 * 60;  // 2:00 PM
const BUFFER_MINS   = 15;

export const AVAILABILITY_STATUS = {
  FREE:      'free',
  BUSY:      'busy',
  SOFT_BUSY: 'soft-busy',   // buffer zone around interviews
  BLOCKED:   'blocked',     // working hours / lunch
  WEEKEND:   'weekend',
};

// ─── Slot Status Calculator ───────────────────────────────────────────────────

/**
 * For a given date and panelist, get all 15-min slot statuses.
 * @param {Date}   date
 * @param {Array}  panelistInterviews - filtered to this panelist
 * @returns {Object} { "09:00": 'busy', "09:15": 'soft-busy', ... }
 */
const getPanelistDaySlots = (date, panelistInterviews, panelist) => {
  const slots = {};
  const isWeekend = [0, 6].includes(date.getDay());
  const totalSlots = (END_HOUR - START_HOUR) * (60 / SLOT_MINUTES);

  if (panelist && panelist.daysAvailable) {
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    if (!panelist.daysAvailable.includes(dayOfWeek)) {
      for (let i = 0; i < totalSlots; i++) {
        const slotMins = START_HOUR * 60 + i * SLOT_MINUTES;
        const time = minutesToTime(slotMins);
        slots[time] = AVAILABILITY_STATUS.BLOCKED;
      }
      return slots;
    }
  }

  for (let i = 0; i < totalSlots; i++) {
    const slotMins = START_HOUR * 60 + i * SLOT_MINUTES;
    const time = minutesToTime(slotMins);

    if (isWeekend) {
      slots[time] = AVAILABILITY_STATUS.WEEKEND;
      continue;
    }

    if (slotMins < WORKING_START || slotMins >= WORKING_END) {
      slots[time] = AVAILABILITY_STATUS.BLOCKED;
      continue;
    }

    if (slotMins >= LUNCH_START && slotMins < LUNCH_END) {
      slots[time] = AVAILABILITY_STATUS.BLOCKED;
      continue;
    }

    // Check against scheduled interviews
    let status = AVAILABILITY_STATUS.FREE;

    for (const interview of panelistInterviews) {
      if (interview.status === 'cancelled') continue;
      const iStart = timeToMinutes(interview.time);
      const iEnd   = iStart + (interview.duration || 60);

      // During interview
      if (slotMins >= iStart && slotMins < iEnd) {
        status = AVAILABILITY_STATUS.BUSY;
        break;
      }

      // Buffer zone
      if (slotMins >= iStart - BUFFER_MINS && slotMins < iStart) {
        status = AVAILABILITY_STATUS.SOFT_BUSY;
        break;
      }
      if (slotMins >= iEnd && slotMins < iEnd + BUFFER_MINS) {
        status = AVAILABILITY_STATUS.SOFT_BUSY;
        break;
      }
    }

    slots[time] = status;
  }

  return slots;
};

// ─── Matrix Generator ─────────────────────────────────────────────────────────

/**
 * Generate a full availability matrix for the given week.
 *
 * @param {Array}  panelists  - [{ id, name, ... }]
 * @param {Array}  interviews - all scheduler interviews
 * @param {Date}   weekDate   - any date in the target week
 * @returns {Object}
 *   {
 *     [panelistId]: {
 *       [dateKey]: {
 *         [timeSlot]: AVAILABILITY_STATUS
 *       }
 *     }
 *   }
 */
export const generateAvailabilityMatrix = (panelists, interviews, weekDate) => {
  const weekDays = getWeekDays(weekDate);
  const matrix   = {};

  panelists.forEach(panelist => {
    matrix[panelist.id] = {};

    weekDays.forEach(day => {
      const dateKey = getDateKey(day);

      // Filter interviews for this panelist on this day
      const dayInterviews = interviews.filter(iv =>
        iv.date === dateKey &&
        (iv.panelists || []).includes(panelist.id) &&
        iv.status !== 'cancelled'
      );

      matrix[panelist.id][dateKey] = getPanelistDaySlots(day, dayInterviews, panelist);
    });
  });

  return matrix;
};

// ─── Workload Calculator ──────────────────────────────────────────────────────

/**
 * Calculate panelist workload for a week.
 * @param {string} panelistId
 * @param {Array}  interviews
 * @param {Date}   weekDate
 * @returns {{ scheduledMinutes, busyPercent, interviewCount }}
 */
export const calculatePanelistWorkload = (panelistId, interviews, weekDate) => {
  const weekDays   = getWeekDays(weekDate);
  const dateKeys   = new Set(weekDays.map(getDateKey));
  const workdayMins = 5 * (WORKING_END - WORKING_START - (LUNCH_END - LUNCH_START));

  const panelistInterviews = interviews.filter(iv =>
    dateKeys.has(iv.date) &&
    (iv.panelists || []).includes(panelistId) &&
    iv.status !== 'cancelled'
  );

  const scheduledMinutes = panelistInterviews.reduce(
    (sum, iv) => sum + (iv.duration || 60), 0
  );

  return {
    scheduledMinutes,
    busyPercent: Math.min(100, Math.round((scheduledMinutes / workdayMins) * 100)),
    interviewCount: panelistInterviews.length,
  };
};

// ─── Smart Slot Suggestion Algorithm ─────────────────────────────────────────

/**
 * Score a candidate time slot for scheduling quality.
 * Lower score = better slot.
 */
const scoreSlot = (date, timeSlot, duration, matrix, panelistIds) => {
  let score = 0;
  const slotStart = timeToMinutes(timeSlot);
  const slotEnd   = slotStart + duration;

  // Prefer morning slots (before noon)
  if (slotStart < 12 * 60) score -= 10;

  // Slightly prefer early afternoon (2–4 PM)
  if (slotStart >= 14 * 60 && slotStart < 16 * 60) score -= 5;

  // Penalize late afternoon
  if (slotStart >= 16 * 60) score += 10;

  const dateKey = getDateKey(date);

  panelistIds.forEach(pid => {
    const dayMatrix = matrix[pid]?.[dateKey] || {};

    // Check all 15-min slots within the event duration
    for (let m = slotStart; m < slotEnd; m += SLOT_MINUTES) {
      const t = minutesToTime(m);
      const status = dayMatrix[t];

      if (status === AVAILABILITY_STATUS.BUSY)      { score += 100; break; }
      if (status === AVAILABILITY_STATUS.BLOCKED)   { score += 100; break; }
      if (status === AVAILABILITY_STATUS.SOFT_BUSY) { score += 20; }
      if (status === AVAILABILITY_STATUS.WEEKEND)   { score += 200; break; }
    }
  });

  return score;
};

/**
 * Find N best available time slots for a group of panelists.
 *
 * @param {Object} matrix      - from generateAvailabilityMatrix
 * @param {Array}  panelistIds - selected panelist IDs
 * @param {number} duration    - interview duration in minutes
 * @param {Date}   fromDate    - start searching from this date
 * @param {number} count       - number of suggestions to return (default 3)
 * @returns {Array<{ date, time, dateKey, label, score }>}
 */
export const suggestBestSlots = (matrix, panelistIds, duration, fromDate, count = 3) => {
  const candidates = [];
  const startDate  = fromDate || new Date();
  const checkDays  = 14; // look 2 weeks ahead

  for (let d = 0; d < checkDays; d++) {
    const date    = new Date(startDate);
    date.setDate(date.getDate() + d);
    date.setHours(0, 0, 0, 0);

    if ([0, 6].includes(date.getDay())) continue; // skip weekends

    const dateKey = getDateKey(date);

    // Try each working-hours 30-min slot (not every 15 to reduce candidates)
    for (let mins = WORKING_START; mins <= WORKING_END - duration; mins += 30) {
      const snapped = snapToGrid(mins);
      const time = minutesToTime(snapped);

      // Skip lunch
      if (snapped >= LUNCH_START && snapped < LUNCH_END) continue;
      if (snapped + duration > WORKING_END) continue;

      const score = scoreSlot(date, time, duration, matrix, panelistIds);

      if (score < 100) {
        candidates.push({ date, time, dateKey, score });
      }
    }
  }

  // Sort by score (lower = better), then by date
  candidates.sort((a, b) => a.score - b.score || a.date - b.date);

  // Deduplicate: no two suggestions on the same day
  const seen  = new Set();
  const final = [];
  for (const c of candidates) {
    if (!seen.has(c.dateKey)) {
      seen.add(c.dateKey);
      final.push({
        ...c,
        label: `${c.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${formatTime(c.time)}`,
      });
    }
    if (final.length >= count) break;
  }

  return final;
};

// ─── Aggregated Availability (for sidebar display) ─────────────────────────────

/**
 * Get overall availability status for a panelist on a given day.
 * Used for the availability dot in PanelistSidebar.
 *
 * @returns 'free' | 'limited' | 'busy' | 'blocked'
 */
export const getPanelistDayStatus = (panelistId, dateKey, matrix) => {
  const daySlots = matrix[panelistId]?.[dateKey];
  if (!daySlots) return 'free';

  const slots  = Object.values(daySlots);
  const total  = slots.filter(s => s !== AVAILABILITY_STATUS.BLOCKED && s !== AVAILABILITY_STATUS.WEEKEND).length;
  const busy   = slots.filter(s => s === AVAILABILITY_STATUS.BUSY).length;

  if (total === 0) return 'blocked';
  const ratio = busy / total;
  if (ratio >= 0.7) return 'busy';
  if (ratio >= 0.3) return 'limited';
  return 'free';
};

