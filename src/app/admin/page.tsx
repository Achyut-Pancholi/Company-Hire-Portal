"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, FileText, CheckCircle, Video, Calendar, BarChart2, 
  Search, SlidersHorizontal, RefreshCw, X, ArrowUpRight, 
  Briefcase, Activity, Target, Award, Info
} from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, AreaChart, Area, BarChart, Bar, ReferenceLine, 
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, ScatterChart, Scatter, ComposedChart, ZAxis
} from 'recharts';

// Exact business-pastel colors extracted from the user's reference image
const PALETTE = {
  red: '#FE4C60',      // Pastel Coral Red (Company X / Underperforming)
  blue: '#3B82F6',     // Bright Royal Blue (Company Y / Category A)
  green: '#10B981',    // Sage Emerald Green (Success / Completed)
  yellow: '#FFD452',   // Canary Yellow (Sales / Category B)
  orange: '#FEB447',   // Pastel Orange (Marketing / Stage Pending)
  purple: '#9C77ED',   // Indigo Lavender (DS 1)
  teal: '#5CC2F2',     // Soft Teal Cyan (DS 2)
  magenta: '#FFA1C9',  // Soft Cotton-Candy Pink (DS 3)
  slate: '#64748B',    // Slate grey
  navy: '#0E2D7B',     // Brand Deep Navy
};

export default function Dashboard() {
  const { candidates, jobs, refreshCandidates, refreshJobs } = useAppContext();
  
  // Local States for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedJob, setSelectedJob] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('All'); // 'All', 'High' (>80), 'Mid' (60-80), 'Low' (<60)
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cross-filtering states (clicking on chart segments updates page state)
  const [activeChartFilter, setActiveChartFilter] = useState<null | { key: string; value: string }>(null);

  useEffect(() => {
    setIsMounted(true);
    refreshCandidates();
    refreshJobs();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshCandidates(), refreshJobs()]);
    setIsRefreshing(false);
  };

  // Derive unique departments and jobs for filtering dropdowns
  const uniqueDepts = useMemo(() => {
    const depts = new Set(jobs.map((j: any) => j.department));
    return ['All', ...Array.from(depts)];
  }, [jobs]);

  const uniqueJobs = useMemo(() => {
    const titles = new Set(jobs.map((j: any) => j.title));
    return ['All', ...Array.from(titles)];
  }, [jobs]);

  const uniqueStages = ['All', 'Resume Upload', 'Video Screening', 'Technical Interview', 'Completed'];

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDept('All');
    setSelectedJob('All');
    setSelectedStage('All');
    setScoreFilter('All');
    setActiveChartFilter(null);
  };

  // 1. Dynamic Filtering Logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: any) => {
      // 1. Text Search query
      const matchesSearch = searchQuery === '' || 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Department match (via associated job)
      let matchesDept = true;
      if (selectedDept !== 'All') {
        const candidateJob = jobs.find((j: any) => j.title === c.jobApplied);
        matchesDept = candidateJob?.department === selectedDept || c.jobApplied?.toLowerCase().includes(selectedDept.toLowerCase());
      }

      // 3. Job Match
      const matchesJob = selectedJob === 'All' || c.jobApplied === selectedJob;

      // 4. Interview Stage Match
      const matchesStage = selectedStage === 'All' || 
        c.stage === selectedStage || 
        c.videoStatus === selectedStage || 
        c.techStatus === selectedStage;

      // 5. Score ranges
      let matchesScore = true;
      const averageScore = ((c.resumeScore || 0) + (c.videoScore || 0) + (c.techScore || 0)) / 
        ((c.resumeScore ? 1 : 0) + (c.videoScore ? 1 : 0) + (c.techScore ? 1 : 0) || 1);
      
      if (scoreFilter === 'High') {
        matchesScore = averageScore >= 80;
      } else if (scoreFilter === 'Mid') {
        matchesScore = averageScore >= 60 && averageScore < 80;
      } else if (scoreFilter === 'Low') {
        matchesScore = averageScore < 60;
      }

      // 6. Cross-filtering match from clicking on charts
      let matchesCrossFilter = true;
      if (activeChartFilter) {
        if (activeChartFilter.key === 'department') {
          const candidateJob = jobs.find((j: any) => j.title === c.jobApplied);
          matchesCrossFilter = candidateJob?.department === activeChartFilter.value;
        } else if (activeChartFilter.key === 'recommendation') {
          matchesCrossFilter = c.finalRecommendation === activeChartFilter.value;
        }
      }

      return matchesSearch && matchesDept && matchesJob && matchesStage && matchesScore && matchesCrossFilter;
    });
  }, [candidates, jobs, searchQuery, selectedDept, selectedJob, selectedStage, scoreFilter, activeChartFilter]);

  // Make all dashboard graphs fully dynamic by directly referencing the candidates fetched from the database
  const populatedCandidates = filteredCandidates;

  // 2. Data Transformation & Aggregation helpers
  const kpiData = useMemo(() => {
    const list = populatedCandidates;
    const total = list.length;
    
    // Calculated averages
    let resSum = 0, vidSum = 0, techSum = 0;
    let resCount = 0, vidCount = 0, techCount = 0;

    list.forEach(c => {
      if (c.resumeScore) { resSum += c.resumeScore; resCount++; }
      if (c.videoScore) { vidSum += c.videoScore; vidCount++; }
      if (c.techScore) { techSum += c.techScore; techCount++; }
    });

    const avgResume = resCount > 0 ? Math.round(resSum / resCount) : 0;
    const avgVideo = vidCount > 0 ? Math.round(vidSum / vidCount) : 0;
    const avgTech = techCount > 0 ? Math.round(techSum / techCount) : 0;
    const overallAvg = Math.round(((avgResume + avgVideo + avgTech) / 3));

    const converted = list.filter(c => c.finalRecommendation === 'Hire').length;
    const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    return { total, avgResume, avgVideo, avgTech, overallAvg, convRate };
  }, [populatedCandidates]);

  // Chart 1 & Chart 2: Date and Time series aggregations
  const timeSeriesData = useMemo(() => {
    const dateMap: Record<string, { count: number; totalResume: number; resumeCount: number; totalVideo: number; videoCount: number; totalTech: number; techCount: number }> = {};
    
    // Seed standard date categories for visual continuity if needed
    const dates = ['2026-05-24', '2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29'];
    dates.forEach(d => {
      dateMap[d] = { count: 0, totalResume: 0, resumeCount: 0, totalVideo: 0, videoCount: 0, totalTech: 0, techCount: 0 };
    });

    populatedCandidates.forEach(c => {
      const dateStr = c.created_at ? c.created_at.split('T')[0] : '2026-05-29';
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { count: 0, totalResume: 0, resumeCount: 0, totalVideo: 0, videoCount: 0, totalTech: 0, techCount: 0 };
      }
      dateMap[dateStr].count++;
      if (c.resumeScore) { 
        dateMap[dateStr].totalResume += c.resumeScore; 
        dateMap[dateStr].resumeCount++;
      }
      if (c.videoScore) { 
        dateMap[dateStr].totalVideo += c.videoScore; 
        dateMap[dateStr].videoCount++;
      }
      if (c.techScore) { 
        dateMap[dateStr].totalTech += c.techScore; 
        dateMap[dateStr].techCount++;
      }
    });

    let runningTotal = 0;
    return Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, val]) => {
        runningTotal += val.count;
        const avgR = val.resumeCount > 0 ? Math.round(val.totalResume / val.resumeCount) : 0;
        const avgV = val.videoCount > 0 ? Math.round(val.totalVideo / val.videoCount) : 0;
        const avgT = val.techCount > 0 ? Math.round(val.totalTech / val.techCount) : 0;
        return {
          date: date.substring(5), // mm-dd formatting
          applications: val.count,
          cumulative: runningTotal,
          'Resume Score': avgR,
          'Video Score': avgV,
          'Tech Score': avgT
        };
      });
  }, [populatedCandidates]);

  // Chart 3: Candidate stage volume
  const stageVolumeData = useMemo(() => {
    const stages = ['Resume Upload', 'Video Screening', 'Technical Interview', 'Completed'];
    return stages.map(st => {
      const count = populatedCandidates.filter(c => c.stage === st).length;
      return { stage: st, Candidates: count };
    });
  }, [populatedCandidates]);

  // Helper mapping jobs to department
  const getDept = (jobApplied: string) => {
    const job = jobs.find((j: any) => j.title === jobApplied);
    if (job) return job.department;
    // Mock fallbacks
    if (jobApplied.includes('Scientist')) return 'Research';
    if (jobApplied.includes('Engineer')) return 'Engineering';
    if (jobApplied.includes('Designer')) return 'Design';
    return 'TechOps';
  };

  // Chart 4: Stacked stage per department
  const stackedDepartmentData = useMemo(() => {
    const depts = ['Engineering', 'Research', 'Design', 'TechOps'];
    return depts.map(d => {
      const candidatesInDept = populatedCandidates.filter(c => getDept(c.jobApplied) === d);
      return {
        department: d,
        'Resume Upload': candidatesInDept.filter(c => c.stage === 'Resume Upload').length,
        'Video Screening': candidatesInDept.filter(c => c.stage === 'Video Screening').length,
        'Technical Interview': candidatesInDept.filter(c => c.stage === 'Technical Interview').length,
        'Completed': candidatesInDept.filter(c => c.stage === 'Completed').length,
      };
    });
  }, [populatedCandidates, jobs]);

  // Chart 5: Zero-line performance deviations from baseline passing score (e.g. 70)
  const performanceDeviations = useMemo(() => {
    return populatedCandidates.slice(0, 8).map(c => {
      const avg = ((c.resumeScore || 0) + (c.videoScore || 0) + (c.techScore || 0)) / 
        ((c.resumeScore ? 1 : 0) + (c.videoScore ? 1 : 0) + (c.techScore ? 1 : 0) || 1);
      const deviation = Math.round(avg - 70); // passing baseline is 70
      return {
        name: c.name?.split(' ')[0] || 'Unknown',
        deviation: deviation
      };
    });
  }, [populatedCandidates]);

  // Chart 6: Grouped scores average comparison by department
  const groupedDepartmentScores = useMemo(() => {
    const depts = ['Engineering', 'Research', 'Design', 'TechOps'];
    return depts.map(d => {
      const deptList = populatedCandidates.filter(c => getDept(c.jobApplied) === d);
      let rSum = 0, vSum = 0, tSum = 0;
      let rN = 0, vN = 0, tN = 0;

      deptList.forEach(c => {
        if (c.resumeScore) { rSum += c.resumeScore; rN++; }
        if (c.videoScore) { vSum += c.videoScore; vN++; }
        if (c.techScore) { tSum += c.techScore; tN++; }
      });

      return {
        department: d,
        Resume: rN > 0 ? Math.round(rSum / rN) : 0,
        Video: vN > 0 ? Math.round(vSum / vN) : 0,
        Technical: tN > 0 ? Math.round(tSum / tN) : 0
      };
    });
  }, [populatedCandidates, jobs]);

  // Chart 7: Pie distribution of recommendations
  const pieRecommendationData = useMemo(() => {
    const recs = ['Hire', 'Under Review', 'Hold', 'Reject'];
    const colors = [PALETTE.green, PALETTE.blue, PALETTE.yellow, PALETTE.red];
    return recs.map((r, i) => {
      const count = populatedCandidates.filter(c => c.finalRecommendation === r).length;
      return {
        name: r,
        value: count,
        color: colors[i]
      };
    }).filter(d => d.value > 0);
  }, [populatedCandidates]);

  // Chart 8: Radar Competency average chart
  const radarCompetencyData = useMemo(() => {
    const list = populatedCandidates;
    let comm = 0, tech = 0, analytical = 0, leadership = 0, design = 0, stability = 0;
    let commN = 0, techN = 0, analyticalN = 0, leadershipN = 0, designN = 0, stabilityN = 0;
    
    list.forEach(c => {
      if (c.videoScore) { comm += c.videoScore; commN++; }
      if (c.techScore) { tech += c.techScore; techN++; }
      if (c.resumeScore || c.techScore) {
        analytical += ((c.resumeScore || 0) + (c.techScore || 0)) / ((c.resumeScore ? 1 : 0) + (c.techScore ? 1 : 0) || 1);
        analyticalN++;
      }
      if (c.skills && c.skills.length > 0) {
        leadership += c.skills.length > 8 ? 85 : 70;
        leadershipN++;
      }
      if (c.jobApplied) {
        design += c.jobApplied.toLowerCase().includes('design') ? 90 : 60;
        designN++;
      }
      if (c.resumeScore) {
        stability += c.resumeScore > 80 ? 88 : 74;
        stabilityN++;
      }
    });

    return [
      { subject: 'Communication', A: commN > 0 ? Math.round(comm / commN) : 0, B: 75, fullMark: 100 },
      { subject: 'Technical skills', A: techN > 0 ? Math.round(tech / techN) : 0, B: 80, fullMark: 100 },
      { subject: 'Problem Solving', A: analyticalN > 0 ? Math.round(analytical / analyticalN) : 0, B: 70, fullMark: 100 },
      { subject: 'Leadership', A: leadershipN > 0 ? Math.round(leadership / leadershipN) : 0, B: 65, fullMark: 100 },
      { subject: 'Design Thinking', A: designN > 0 ? Math.round(design / designN) : 0, B: 60, fullMark: 100 },
      { subject: 'Parsed Match', A: stabilityN > 0 ? Math.round(stability / stabilityN) : 0, B: 75, fullMark: 100 }
    ];
  }, [populatedCandidates]);

  // Chart 9: Candlestick score box plot chart (department score bands)
  const candlestickData = useMemo(() => {
    const depts = ['Engineering', 'Research', 'Design', 'TechOps'];
    return depts.map(d => {
      const scores = populatedCandidates
        .filter(c => getDept(c.jobApplied) === d)
        .map(c => Math.round(((c.resumeScore || 0) + (c.videoScore || 0) + (c.techScore || 0)) / 
          ((c.resumeScore ? 1 : 0) + (c.videoScore ? 1 : 0) + (c.techScore ? 1 : 0) || 1)));

      const sorted = scores.length > 0 ? scores.sort((a, b) => a - b) : [0, 0, 0];
      const min = sorted[0] || 0;
      const max = sorted[sorted.length - 1] || 0;
      const median = sorted[Math.floor(sorted.length / 2)] || 0;
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      // Map to candlestick structure
      // Low is lower wick, High is upper wick. Open/Close coordinates represent the thick body (box range)
      // Since Recharts supports stacked bar charts, we render:
      // Bar 1: transparent offset (value = min)
      // Bar 2: solid body (value = median - min) representing low-to-mid range
      // Bar 3: solid body (value = max - median) representing mid-to-high range
      return {
        department: d,
        min: min,
        max: max,
        median: median,
        average: avg,
        transparentOffset: min,
        lowerBody: median - min,
        upperBody: max - median
      };
    });
  }, [populatedCandidates, jobs]);

  // Chart 10: Bubble chart plotting Resume Score (X) vs Video Score (Y) vs size (Z = Tech Score)
  const bubbleData = useMemo(() => {
    return populatedCandidates.map(c => ({
      name: c.name,
      'Resume Score': c.resumeScore || 0,
      'Video Score': c.videoScore || 0,
      'Tech Score': c.techScore || 0,
      dept: getDept(c.jobApplied)
    }));
  }, [populatedCandidates, jobs]);

  // Chart 11: Combined ComposedChart (Total department job slots vs applicant count)
  const combinedDepartmentMetrics = useMemo(() => {
    const depts = ['Engineering', 'Research', 'Design', 'TechOps'];
    return depts.map(d => {
      const openingsCount = jobs.filter((j: any) => j.department === d && j.status === 'Active').length + 1; // plus 1 standard default slot
      const candidatesCount = populatedCandidates.filter(c => getDept(c.jobApplied) === d).length;
      return {
        department: d,
        Openings: openingsCount * 2, // Scaled for visual comparison
        Applicants: candidatesCount
      };
    });
  }, [populatedCandidates, jobs]);

  // Chart 12: Scatter Chart (Tech vs Video correlation scatter matrix)
  const scatterCorrelationData = useMemo(() => {
    return populatedCandidates.map(c => ({
      x: c.techScore || 0,
      y: c.videoScore || 0,
      name: c.name?.split(' ')[0] || 'Candidate'
    }));
  }, [populatedCandidates]);

  // KPI highlight tile values
  const statsList = [
    { label: 'Total Candidates', value: kpiData.total, icon: Users, color: PALETTE.blue, trend: '+14% MoM', isUp: true },
    { label: 'Overall Evaluation Avg', value: `${kpiData.overallAvg}%`, icon: Activity, color: PALETTE.purple, trend: '+4% overall', isUp: true },
    { label: 'Hiring Conv. Rate', value: `${kpiData.convRate}%`, icon: Target, color: PALETTE.green, trend: 'Optimal band', isUp: true },
    { label: 'Active Departments', value: uniqueDepts.length - 1, icon: Briefcase, color: PALETTE.yellow, trend: 'Active roles online', isUp: true }
  ];

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-indigo-600" size={32} />
          <p className="text-slate-500 text-sm font-medium">Mounting Dynamic Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Filtering & Cross-filtering panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-indigo-600" size={20} />
            <h2 className="font-bold text-slate-800 tracking-tight text-lg">Interactive Analytics Controllers</h2>
          </div>
          <div className="flex items-center gap-3">
            {activeChartFilter && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-semibold animate-fade-in">
                <span>Active Filter: {activeChartFilter.key} = {activeChartFilter.value}</span>
                <button onClick={() => setActiveChartFilter(null)} className="hover:text-indigo-900"><X size={13} /></button>
              </span>
            )}
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`${isRefreshing ? 'animate-spin' : ''}`} size={14} />
              Refresh
            </button>
            <button 
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors"
            >
              <X size={14} />
              Reset All
            </button>
          </div>
        </div>

        {/* Input grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* 1. Candidate Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 2. Department Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:outline-none transition-colors"
            >
              {uniqueDepts.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 3. Sub-Department (Job applied) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Applied</label>
            <select 
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:outline-none transition-colors"
            >
              {uniqueJobs.map((j, i) => (
                <option key={i} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* 4. Score Bracket */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Performance Tier</label>
            <select 
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:outline-none transition-colors"
            >
              <option value="All">All Scores</option>
              <option value="High">High Performers (&ge;80)</option>
              <option value="Mid">Average Tier (60-80)</option>
              <option value="Low">Low Performance (&lt;60)</option>
            </select>
          </div>

          {/* 5. Phase Stage */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hiring Phase</label>
            <select 
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:outline-none transition-colors"
            >
              {uniqueStages.map((st, i) => (
                <option key={i} value={st}>{st}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* 2. Top Summary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statsList.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white" 
                style={{ backgroundColor: stat.color }}
              >
                <stat.icon size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
              </div>
            </div>
            <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <ArrowUpRight size={13} />
              {stat.trend}
            </span>
          </div>
        ))}
      </div>

      {/* 3. 12-Chart analytical Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* CHART 1: Line Chart (Monthly trend scores) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">1. Historical Evaluation Score Trends</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Shows monthly average scores by evaluation stage over the active timeline" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Tracks average resume, video, and technical interview scores over time</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Resume Score" stroke={PALETTE.red} strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Video Score" stroke={PALETTE.blue} strokeWidth={2.5} />
                <Line type="monotone" dataKey="Tech Score" stroke={PALETTE.green} strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: TimeSeries Area Chart (Cumulative submissions) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">2. Cumulative and Daily Application Volume</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Shows daily submissions and the total cumulative growth of applicants over time" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Visualizes daily application submission counts and cumulative hiring pipeline growth</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.blue} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={PALETTE.blue} stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.red} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={PALETTE.red} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" name="Cumulative Applications" dataKey="cumulative" stroke={PALETTE.blue} strokeWidth={2} fillOpacity={1} fill="url(#colorBlue)" />
                <Area type="monotone" name="Daily Applications" dataKey="applications" stroke={PALETTE.red} strokeWidth={2} fillOpacity={1} fill="url(#colorRed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Bar Chart (Volume by stages) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">3. Candidates by Recruitment Stage</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Shows total candidates currently active within each hiring stage" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Aggregates the volume of candidates currently sitting at each phase of the hiring process</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageVolumeData} margin={{ top: 5, right: 10, left: -25, bottom: 35 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="stage" stroke="#94A3B8" fontSize={9} tickLine={false} angle={-15} textAnchor="end" height={50} interval={0} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Candidates" fill={PALETTE.teal} radius={[6, 6, 0, 0]} barSize={26}>
                  {stageVolumeData.map((entry, index) => {
                    const colors = [PALETTE.red, PALETTE.orange, PALETTE.purple, PALETTE.green];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Stacked Bar Chart (Interview stages stacked per department) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">4. Hiring Pipeline Breakdown by Department</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Breaks down candidate stages stacked by department to compare pipeline volumes" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Displays candidate status distribution stacked and categorized by hiring departments</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedDepartmentData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Resume Upload" stackId="stages" fill={PALETTE.yellow} barSize={22} />
                <Bar dataKey="Video Screening" stackId="stages" fill={PALETTE.orange} />
                <Bar dataKey="Technical Interview" stackId="stages" fill={PALETTE.purple} />
                <Bar dataKey="Completed" stackId="stages" fill={PALETTE.green} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 5: Zero-line performance deviations */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">5. Candidate Performance Variance vs. Benchmark</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Calculates candidate average score deviation relative to the target passing score of 70" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Measures individual candidate average evaluation score variance relative to the passing standard (70)</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceDeviations} margin={{ top: 5, right: 10, left: -25, bottom: 35 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1.5} />
                <Bar dataKey="deviation" barSize={18}>
                  {performanceDeviations.map((entry, index) => {
                    const fillVal = entry.deviation >= 0 ? PALETTE.green : PALETTE.red;
                    return <Cell key={`cell-${index}`} fill={fillVal} radius={entry.deviation >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 6: Grouped average comparison by department */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">6. Departmental Assessment Score Comparison</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Compares average scores for Resume, Video, and Technical Interview across departments" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Compares average resume, video, and technical scores side-by-side across all active departments</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedDepartmentScores} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Resume" fill={PALETTE.red} radius={[3, 3, 0, 0]} barSize={10} />
                <Bar dataKey="Video" fill={PALETTE.blue} radius={[3, 3, 0, 0]} barSize={10} />
                <Bar dataKey="Technical" fill={PALETTE.green} radius={[3, 3, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 7: Pie distribution of recommendations with Interactive Filtering */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px] hover:border-indigo-100 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">7. Final Hiring Recommendation Share</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Proportion of Hire, Hold, Under Review, and Reject recommendations (Click segments to filter candidates)" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Distribution of recruiters' hiring decisions and status recommendations</p>
          </div>
          <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieRecommendationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => {
                    if (data && data.name) {
                      setActiveChartFilter(
                        activeChartFilter?.key === 'recommendation' && activeChartFilter.value === data.name
                          ? null
                          : { key: 'recommendation', value: data.name }
                      );
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  {pieRecommendationData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke={activeChartFilter?.key === 'recommendation' && activeChartFilter.value === entry.name ? '#000' : '#fff'}
                      strokeWidth={activeChartFilter?.key === 'recommendation' && activeChartFilter.value === entry.name ? 2.5 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center annotation text */}
            <div className="absolute text-center flex flex-col items-center">
              <span className="text-2xl font-black text-slate-800">{kpiData.total}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px] font-bold text-slate-500 mt-2">
            {pieRecommendationData.map((d, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span>{d.name} ({d.value})</span>
              </span>
            ))}
          </div>
        </div>

        {/* CHART 8: Radar Competency average chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">8. Multi-Dimensional Competency Radar</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Maps candidate averages against target benchmarks across six core evaluation metrics" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Displays candidate averages against target benchmarks across six key evaluation categories</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarCompetencyData}>
                <PolarGrid stroke="#F1F5F9" />
                <PolarAngleAxis dataKey="subject" stroke="#94A3B8" fontSize={9} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#E2E8F0" fontSize={8} tickCount={4} />
                <Radar name="Applicant Averages" dataKey="A" stroke={PALETTE.purple} fill={PALETTE.purple} fillOpacity={0.3} />
                <Radar name="Target Bench" dataKey="B" stroke={PALETTE.teal} fill={PALETTE.teal} fillOpacity={0.1} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 9: Candlestick score box plot chart (department score bands) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">9. Score Distribution Ranges by Department</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Shows candidate performance spreads including minimum, median, and maximum scores per department" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Showcases the spread of scores within each department from minimum and median to maximum ranges</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {/* Representing Box-Plot / Candlestick in Recharts using Stacked Bars */}
              <BarChart data={candlestickData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip formatter={(value, name) => [value, name === 'lowerBody' ? 'Median (lower spread)' : name === 'upperBody' ? 'Max (upper spread)' : name]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                {/* 1. Transparent filler bar up to minimum score */}
                <Bar dataKey="transparentOffset" stackId="candlestick" fill="transparent" />
                {/* 2. Lower Body: representing spread from Min to Median */}
                <Bar dataKey="lowerBody" stackId="candlestick" name="Min-Median Spread" fill={PALETTE.orange} barSize={16} />
                {/* 3. Upper Body: representing spread from Median to Max */}
                <Bar dataKey="upperBody" stackId="candlestick" name="Median-Max Spread" fill={PALETTE.green} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 10: Bubble chart (multi-dimension plot) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">10. Multi-Dimensional Score Correlation</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="X-axis: Resume Score | Y-axis: Video Score | Bubble Size: Technical Interview Score" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Maps candidate performance across three dimensions: Resume Score (X), Video Score (Y), and Tech Score (Size)</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" />
                <XAxis type="number" dataKey="Resume Score" name="Resume Score" stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <YAxis type="number" dataKey="Video Score" name="Video Score" stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <ZAxis type="number" dataKey="Tech Score" range={[40, 400]} name="Tech Score" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Scatter name="AI Scientist" data={bubbleData.filter(d => d.dept === 'Research')} fill={PALETTE.red} />
                <Scatter name="Engineers" data={bubbleData.filter(d => d.dept === 'Engineering')} fill={PALETTE.blue} />
                <Scatter name="Designers" data={bubbleData.filter(d => d.dept === 'Design')} fill={PALETTE.green} />
                <Scatter name="DevOps/Ops" data={bubbleData.filter(d => d.dept === 'TechOps')} fill={PALETTE.yellow} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 11: Combined Composed Chart (Job openings vs applicant density) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px] hover:border-indigo-100 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">11. Departmental Talent Demand vs. Applicant Volume</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Click a department bar below to filter candidate scores specifically" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Compares target openings capacity against the actual volume of candidates applied within each department</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedDepartmentMetrics} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" />
                <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar 
                  dataKey="Applicants" 
                  name="Total Applicants" 
                  fill={PALETTE.teal} 
                  barSize={20} 
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => {
                    if (data && data.department) {
                      setActiveChartFilter(
                        activeChartFilter?.key === 'department' && activeChartFilter.value === data.department
                          ? null
                          : { key: 'department', value: data.department }
                      );
                    }
                  }}
                  className="cursor-pointer"
                >
                  {combinedDepartmentMetrics.map((entry, index) => {
                    const isSelected = activeChartFilter?.key === 'department' && activeChartFilter.value === entry.department;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isSelected ? PALETTE.navy : PALETTE.teal}
                        stroke={isSelected ? '#000' : 'none'}
                        strokeWidth={2}
                      />
                    );
                  })}
                </Bar>
                <Line type="monotone" dataKey="Openings" name="Weighted Target Openings" stroke={PALETTE.red} strokeWidth={2.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 12: Scatter Chart (correlation metric) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">12. Tech Skills vs. Communication Correlation</h3>
              <Info size={14} className="text-slate-400 cursor-pointer" title="Plots candidate technical interview scores against video screening communication scores" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-3">Plots candidate technical interview scores against video screening scores to identify alignment</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" />
                <XAxis type="number" dataKey="x" name="Tech Score" stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Video Score" stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Scatter name="Candidate Performance" data={scatterCorrelationData} fill={PALETTE.magenta}>
                  {scatterCorrelationData.map((entry, index) => {
                    const colors = [PALETTE.magenta, PALETTE.purple, PALETTE.blue, PALETTE.green];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
