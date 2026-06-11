"use client";

/**
 * schedulerReducer.js
 * Enterprise state management: Context + useReducer pattern.
 * Separated concerns: UI state, server state, drag state, modal state.
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';

// â”€â”€â”€ Initial Panelists Constant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const INITIAL_PANELISTS = [
  { id: 'p1', name: 'John Doe',     role: 'Engineering Lead',  avatar: 'JD', color: '#0E2D7B', email: 'john.doe@elasticrew.com', daysAvailable: [1, 2, 3, 4, 5] },
  { id: 'p2', name: 'Sarah Smith',  role: 'Product Manager',   avatar: 'SS', color: '#0D9488', email: 'sarah.smith@elasticrew.com', daysAvailable: [1, 2, 3, 4, 5] }
];

// â”€â”€â”€ Action Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ACTIONS = {
  // View & Navigation
  SET_VIEW:              'SET_VIEW',
  NAVIGATE_DATE:         'NAVIGATE_DATE',
  GO_TO_TODAY:           'GO_TO_TODAY',

  // Panelists management
  SET_PANELISTS:         'SET_PANELISTS',
  ADD_PANELIST:          'ADD_PANELIST',
  EDIT_PANELIST:         'EDIT_PANELIST',
  REMOVE_PANELIST:       'REMOVE_PANELIST',

  // Interviews (server state)
  SET_INTERVIEWS:        'SET_INTERVIEWS',
  ADD_INTERVIEW:         'ADD_INTERVIEW',
  UPDATE_INTERVIEW:      'UPDATE_INTERVIEW',
  REMOVE_INTERVIEW:      'REMOVE_INTERVIEW',
  OPTIMISTIC_UPDATE:     'OPTIMISTIC_UPDATE',
  ROLLBACK_OPTIMISTIC:   'ROLLBACK_OPTIMISTIC',

  // Modal state
  OPEN_MODAL:            'OPEN_MODAL',
  CLOSE_MODAL:           'CLOSE_MODAL',
  SET_MODAL_STEP:        'SET_MODAL_STEP',
  UPDATE_MODAL_FORM:     'UPDATE_MODAL_FORM',
  SET_MODAL_LOADING:     'SET_MODAL_LOADING',

  // Drag state
  DRAG_START:            'DRAG_START',
  DRAG_OVER:             'DRAG_OVER',
  DRAG_END:              'DRAG_END',
  RESIZE_START:          'RESIZE_START',
  RESIZE_UPDATE:         'RESIZE_UPDATE',
  RESIZE_END:            'RESIZE_END',

  // Candidate drawer
  OPEN_DRAWER:           'OPEN_DRAWER',
  CLOSE_DRAWER:          'CLOSE_DRAWER',

  // Conflicts
  SET_CONFLICTS:         'SET_CONFLICTS',
  CLEAR_CONFLICTS:       'CLEAR_CONFLICTS',

  // Notifications
  PUSH_NOTIFICATION:     'PUSH_NOTIFICATION',
  DISMISS_NOTIFICATION:  'DISMISS_NOTIFICATION',

  // UI
  SET_LOADING:           'SET_LOADING',
  SET_SELECTED_DATE:     'SET_SELECTED_DATE',
  SET_ACTIVE_TAB:        'SET_ACTIVE_TAB',
  SET_SELECTED_PANELIST: 'SET_SELECTED_PANELIST',
  TOGGLE_THEME:          'TOGGLE_THEME',
};

// â”€â”€â”€ Modal Form Default State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_MODAL_FORM = {
  // Step 1 - Candidate
  candidateId:    '',
  candidateName:  '',
  candidateEmail: '',
  position:       '',
  round:          1,
  template:       'technical',

  // Step 2 - Panel
  panelistIds:    [],
  interviewType:  'technical',

  // Step 3 - Time & Place
  date:           '',
  time:           '',
  duration:       60,
  platform:       'teams',
  meetingLink:    '',
  timezone:       'Asia/Kolkata',
  notes:          '',

  // Step 4 - Notify
  notifyEmail:    true,
  notifyTeams:    false,
  notifySlack:    false,
};

// â”€â”€â”€ Initial State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getInitialState = () => {
  let storedPanelists = [];
  const hasLocalStorage = typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function';
  if (hasLocalStorage) {
    try {
      const raw = localStorage.getItem('kl_scheduler_panelists');
      if (raw) {
        storedPanelists = JSON.parse(raw).map(p => {
          if (p.id === 'p1' && !p.email) return { ...p, email: 'john.doe@elasticrew.com', daysAvailable: p.daysAvailable || [1, 2, 3, 4, 5] };
          if (p.id === 'p2' && !p.email) return { ...p, email: 'sarah.smith@elasticrew.com', daysAvailable: p.daysAvailable || [1, 2, 3, 4, 5] };
          if (!p.daysAvailable) return { ...p, daysAvailable: [1, 2, 3, 4, 5] };
          return p;
        });
      }
    } catch (e) {
      console.error('Failed to load panelists', e);
    }
  }

  if (!storedPanelists || storedPanelists.length === 0) {
    storedPanelists = [...INITIAL_PANELISTS];
    if (hasLocalStorage && typeof localStorage.setItem === 'function') {
      try {
        localStorage.setItem('kl_scheduler_panelists', JSON.stringify(storedPanelists));
      } catch {}
    }
  }

  return {
    // View
    view: 'week',
    currentDate: new Date(),
    activeTab: 'calendar',   // 'calendar' | 'analytics'
    selectedPanelistId: null, // highlight panelist on calendar
    darkMode: hasLocalStorage ? localStorage.getItem('scheduler-theme') === 'dark' : false,

    // Server state
    interviews: [],
    panelists: storedPanelists,
    optimisticQueue: [],   // pending ops to rollback on failure
    loading: true,  // true on mount â†’ prevents blank-calendar flash before first fetch

    // Modal state
    modal: {
      open:    false,
      step:    1,
      loading: false,
      formData: { ...DEFAULT_MODAL_FORM },
    },

    // Drag state (UI only â€” not persisted)
    drag: {
      active:       false,
      eventId:      null,
      originalDate: null,
      originalTime: null,
      ghostDate:    null,
      ghostTime:    null,
    },

    // Resize state
    resize: {
      active:           false,
      eventId:          null,
      originalDuration: null,
      ghostDuration:    null,
    },

    // Drawer (candidate detail)
    drawer: {
      open:        false,
      interviewId: null,
    },

    // Conflict detection results
    conflicts: [],

    // Notification toasts
    notifications: [],
  };
};

// â”€â”€â”€ Reducer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function schedulerReducer(state, action) {
  switch (action.type) {

    // â”€â”€ View & Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.SET_VIEW:
      return { ...state, view: action.payload };

    case ACTIONS.NAVIGATE_DATE: {
      const d = new Date(state.currentDate);
      if (state.view === 'week')  d.setDate(d.getDate() + action.payload * 7);
      if (state.view === 'day')   d.setDate(d.getDate() + action.payload);
      if (state.view === 'month') d.setMonth(d.getMonth() + action.payload);
      return { ...state, currentDate: d };
    }

    case ACTIONS.GO_TO_TODAY:
      return { ...state, currentDate: new Date() };

    case ACTIONS.SET_SELECTED_DATE:
      return { ...state, currentDate: action.payload };

    case ACTIONS.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload };

    case ACTIONS.SET_SELECTED_PANELIST:
      return {
        ...state,
        selectedPanelistId: state.selectedPanelistId === action.payload ? null : action.payload
      };

    // â”€â”€ Interviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.SET_INTERVIEWS:
      return { ...state, interviews: action.payload, loading: false };

    case ACTIONS.ADD_INTERVIEW:
      return {
        ...state,
        interviews: [action.payload, ...state.interviews],
      };

    case ACTIONS.UPDATE_INTERVIEW:
      return {
        ...state,
        interviews: state.interviews.map(iv =>
          iv.id === action.payload.id ? { ...iv, ...action.payload } : iv
        ),
      };

    case ACTIONS.REMOVE_INTERVIEW:
      return {
        ...state,
        interviews: state.interviews.filter(iv => iv.id !== action.payload),
      };

    // Optimistic update: save old state + apply new, keep pointer for rollback
    case ACTIONS.OPTIMISTIC_UPDATE:
      return {
        ...state,
        optimisticQueue: [
          ...state.optimisticQueue,
          { key: action.payload.key, snapshot: state.interviews }
        ],
        interviews: state.interviews.map(iv =>
          iv.id === action.payload.id ? { ...iv, ...action.payload.changes } : iv
        ),
      };

    case ACTIONS.ROLLBACK_OPTIMISTIC: {
      const item = state.optimisticQueue.find(q => q.key === action.payload);
      if (!item) return state;
      return {
        ...state,
        interviews: item.snapshot,
        optimisticQueue: state.optimisticQueue.filter(q => q.key !== action.payload),
      };
    }

    // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    // â”€â”€ Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.OPEN_MODAL:
      return {
        ...state,
        modal: {
          ...state.modal,
          open:     true,
          step:     1,
          loading:  false,
          formData: { ...DEFAULT_MODAL_FORM, ...action.payload },
        },
        conflicts: [],
      };

    case ACTIONS.CLOSE_MODAL:
      return {
        ...state,
        modal: { ...state.modal, open: false },
        conflicts: [],
      };

    case ACTIONS.SET_MODAL_STEP:
      return { ...state, modal: { ...state.modal, step: action.payload } };

    case ACTIONS.UPDATE_MODAL_FORM:
      return {
        ...state,
        modal: {
          ...state.modal,
          formData: { ...state.modal.formData, ...action.payload },
        },
      };

    case ACTIONS.SET_MODAL_LOADING:
      return { ...state, modal: { ...state.modal, loading: action.payload } };

    // â”€â”€ Drag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.DRAG_START:
      return {
        ...state,
        drag: {
          active:       true,
          eventId:      action.payload.eventId,
          originalDate: action.payload.date,
          originalTime: action.payload.time,
          ghostDate:    action.payload.date,
          ghostTime:    action.payload.time,
        },
      };

    case ACTIONS.DRAG_OVER:
      return {
        ...state,
        drag: {
          ...state.drag,
          ghostDate: action.payload.date,
          ghostTime: action.payload.time,
        },
      };

    case ACTIONS.DRAG_END:
      return { ...state, drag: { active: false, eventId: null, originalDate: null, originalTime: null, ghostDate: null, ghostTime: null } };

    // â”€â”€ Resize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.RESIZE_START:
      return {
        ...state,
        resize: {
          active:           true,
          eventId:          action.payload.eventId,
          originalDuration: action.payload.duration,
          ghostDuration:    action.payload.duration,
        },
      };

    case ACTIONS.RESIZE_UPDATE:
      return {
        ...state,
        resize: { ...state.resize, ghostDuration: action.payload },
      };

    case ACTIONS.RESIZE_END:
      return {
        ...state,
        resize: { active: false, eventId: null, originalDuration: null, ghostDuration: null },
      };

    // â”€â”€ Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.OPEN_DRAWER:
      return { ...state, drawer: { open: true, interviewId: action.payload } };

    case ACTIONS.CLOSE_DRAWER:
      return { ...state, drawer: { open: false, interviewId: null } };

    // â”€â”€ Conflicts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.SET_CONFLICTS:
      return { ...state, conflicts: action.payload };

    case ACTIONS.CLEAR_CONFLICTS:
      return { ...state, conflicts: [] };

    // â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case ACTIONS.PUSH_NOTIFICATION:
      return {
        ...state,
        notifications: [
          action.payload,
          ...state.notifications,
        ].slice(0, 5), // max 5 toasts
      };

    case ACTIONS.DISMISS_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };

    case ACTIONS.TOGGLE_THEME: {
      const nextMode = !state.darkMode;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem('scheduler-theme', nextMode ? 'dark' : 'light');
      }
      return { ...state, darkMode: nextMode };
    }

    case 'SET_PANELISTS':
    case ACTIONS.SET_PANELISTS:
      return {
        ...state,
        panelists: action.payload
      };

    case ACTIONS.ADD_PANELIST: {
      const nextPanelists = [...state.panelists, action.payload];
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        try {
          localStorage.setItem('kl_scheduler_panelists', JSON.stringify(nextPanelists));
        } catch {}
      }
      return {
        ...state,
        panelists: nextPanelists
      };
    }

    case 'EDIT_PANELIST': {
      const nextPanelists = state.panelists.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p);
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        try {
          localStorage.setItem('kl_scheduler_panelists', JSON.stringify(nextPanelists));
        } catch {}
      }
      return {
        ...state,
        panelists: nextPanelists
      };
    }

    case ACTIONS.REMOVE_PANELIST: {
      const nextPanelists = state.panelists.filter(p => p.id !== action.payload);
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        try {
          localStorage.setItem('kl_scheduler_panelists', JSON.stringify(nextPanelists));
        } catch {}
      }
      return {
        ...state,
        panelists: nextPanelists
      };
    }

    default:
      return state;
  }
}

// â”€â”€â”€ Context + Provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SchedulerContext = createContext(null);

export const SchedulerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(schedulerReducer, undefined, getInitialState);
  return React.createElement(
    SchedulerContext.Provider,
    { value: { state, dispatch } },
    children
  );
};

// â”€â”€â”€ Hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Raw context access */
export const useSchedulerContext = () => {
  const ctx = useContext(SchedulerContext);
  if (!ctx) throw new Error('useSchedulerContext must be used inside SchedulerProvider');
  return ctx;
};

// â”€â”€â”€ Derived Selectors (memoization-friendly pure functions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const selectInterviewById = (state, id) =>
  state.interviews.find(iv => iv.id === id) || null;

export const selectInterviewsForDate = (state, dateKey) =>
  state.interviews.filter(iv => iv.date === dateKey && iv.status !== 'cancelled');

export const selectScheduledCount = (state) =>
  state.interviews.filter(iv => iv.status === 'scheduled').length;

export const selectPanelistInterviews = (state, panelistId) =>
  state.interviews.filter(iv => (iv.panelists || []).includes(panelistId));

