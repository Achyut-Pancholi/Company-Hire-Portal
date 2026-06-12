"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext<any>(null);

export const useAppContext = () => useContext(AppContext);

const API_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
const API_SECRET = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET || process.env.INTERNAL_API_SECRET;

/** Authenticated fetch — automatically attaches the internal API secret header */
export const apiFetch = (path, options: any = {}) => {
  return fetch(`${API_URL}${path}`, {
    cache: 'no-store', // Disable fetch caching completely to show real-time scores
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_SECRET,
      ...(options.headers || {}),
    },
  });
};

export const AppProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidatesCount, setCandidatesCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const fetchJobs = async () => {
    try {
      const res = await apiFetch(`/api/jobs?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error("Error fetching jobs:", e);
    }
  };

  const fetchCandidates = async (page = 1, limit = 20, search = "", department = "all", subDepartment = "all") => {
    try {
      const queryParams = new URLSearchParams({
        t: Date.now().toString(),
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) queryParams.append("search", search);
      if (department !== "all") queryParams.append("department", department);
      if (subDepartment !== "all") queryParams.append("sub_department", subDepartment);

      const res = await apiFetch(`/api/candidates?${queryParams.toString()}`);
      if (res.ok) {
        const result = await res.json();
        const dataList = Array.isArray(result) ? result : (result.data || []);
        const count = result.count || 0;
        
        const mapped = dataList.map(c => {
          const ext = c.extracted_data || {};
          const technicalVideoUrl = (
            ext.videoUrl ||
            ext.video_url ||
            ext.video ||
            ext.video_path ||
            ''
          );
          return {
            ...c,
            jobApplied: c.job_applied,
            resumeStatus: c.resume_status,
            formStatus: c.form_status,
            videoStatus: c.video_status,
            techStatus: c.tech_status,
            reportStatus: c.report_status,
            resumeScore: c.resume_score,
            videoScore: c.video_score,
            techScore: c.tech_score,
            finalRecommendation: c.final_recommendation,
            extractedData: c.extracted_data,
            videoUrl: technicalVideoUrl || undefined,
            video_url: technicalVideoUrl || undefined,
          };
        });
        setCandidates(mapped);
        setCandidatesCount(count);
        return { data: mapped, count };
      }
    } catch (e) {
      console.error("Error fetching candidates:", e);
      return { data: [], count: 0 };
    }
  };

  useEffect(() => {
    fetchJobs();
    // We do not fetchCandidates here on mount anymore if the page components
    // are going to control their own pagination state.
    // Actually, keeping a default fetch is fine for generic cache.
    fetchCandidates(1, 20);
  }, []);

  return (
    <AppContext.Provider value={{
      jobs, setJobs,
      candidates, setCandidates,
      notifications, setNotifications,
      refreshJobs: fetchJobs,
      refreshCandidates: fetchCandidates,
      apiFetch,
    }}>
      {children}
    </AppContext.Provider>
  );
};

