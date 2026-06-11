"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, FileSpreadsheet, Plus, X, Upload, Download, CheckCircle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '@/components/admin/context/AppContext';

const BASELINE_FALLBACK = {
  "Operations|HR|Fresher(0)": [
    "Tell us about yourself and what motivated you to pursue a career in HR operations?",
    "How do you prioritize your daily tasks when faced with multiple competing deadlines?",
    "Describe your familiarity with basic office productivity tools and spreadsheets.",
    "How do you maintain focus and accuracy when performing repetitive data entry tasks?",
    "What step would you take if you were unsure how to handle a candidate documentation issue?"
  ],
  "Operations|HR|Junior(1-3)": [
    "Walk us through your experience coordinating candidate pipeline data loops.",
    "How do you handle internal compliance steps when onboarding fresh team rosters?",
    "What strategies do you use to manage scheduling timelines across varying time zones?",
    "Describe a situation where you successfully resolved a scheduling conflict between interviewers.",
    "Which applicant tracking system modules are you most proficient in utilizing?"
  ],
  "Operations|HR|Mid Level(3-5)": [
    "How do you optimize candidate screening touchpoints to improve overall pipeline conversions?",
    "Detail your process for audit-checking employee resource logs against localized labor rules.",
    "How do you address sudden drop-offs or bottleneck constraints within specific recruitment tracks?",
    "Describe your approach to training junior HR coordinators on system documentation policies.",
    "How do you leverage data reports to provide weekly pipeline summaries to department heads?"
  ],
  "Operations|HR|Senior(5+)": [
    "How do you design, execute, and scale regional recruitment operational frameworks from scratch?",
    "Detail your stakeholder management strategy when department heads request unrealistic allocation timelines.",
    "How do you mitigate compliance risks during large-scale, high-velocity hiring cycles?",
    "What key performance indicators (KPIs) do you prioritize to track overall HR operations health?",
    "Describe a time you completely overhauled a broken administrative workflow to save processing costs."
  ],
  "Operations|HR|Lead(10+)": [
    "How do you construct global workforce talent allocation models aligned with enterprise fiscal budgets?",
    "Explain your approach to implementing predictive AI assessment scoring systems across non-technical tracks.",
    "How do you manage, mentor, and inspire cross-functional operational teams across distributed international landscapes?",
    "Detail your corporate conflict resolution roadmap when handling sensitive executive team grievances.",
    "How do you design an adaptive operational agility model to survive sudden macroeconomic structural changes?"
  ],
  "Engineering|Full Stack|Fresher(0)": [
    "What programming languages are you most comfortable with, and what projects have you built using them?",
    "Explain the difference between client-side rendering and server-side rendering.",
    "How do you test and debug your code when an unexpected application error occurs?"
  ],
  "Engineering|Full Stack|Junior(1-3)": [
    "Explain the exact event loop architecture execution paths inside production Node.js instances.",
    "How do you resolve complex asynchronous CORS exception loops within your Express route configurations?",
    "Detail your standard database optimization steps when dealing with slow lookup queries."
  ]
};

const TRACK_RELATIONS = {
  "Operations": ["HR", "Logistics", "Compliance"],
  "Engineering": ["Full Stack", "DevOps", "Data Platform"]
};

export default function AssessmentsPage() {
  const { jobs } = useAppContext();
  const [activeTab, setActiveTab] = useState<'videobot' | 'mcq'>('videobot');
  const [isClient, setIsClient] = useState(false);

  // Dropdown States
  const [targetDept, setTargetDept] = useState<string>('Operations');
  const [subDept, setSubDept] = useState<string>('HR');
  const [role, setRole] = useState<string>('');

  // Questions State
  const [questions, setQuestions] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalValue, setModalValue] = useState('');

  // Native input ref for MCQ file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MCQ states
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [loadingMcq, setLoadingMcq] = useState(false);
  const [isMcqModalOpen, setIsMcqModalOpen] = useState(false);
  const [mcqModalMode, setMcqModalMode] = useState<'add' | 'edit'>('add');
  const [editingMcqId, setEditingMcqId] = useState<string | null>(null);
  const [mcqModalQuestion, setMcqModalQuestion] = useState('');
  const [mcqModalOptA, setMcqModalOptA] = useState('');
  const [mcqModalOptB, setMcqModalOptB] = useState('');
  const [mcqModalOptC, setMcqModalOptC] = useState('');
  const [mcqModalOptD, setMcqModalOptD] = useState('');
  const [mcqModalCorrect, setMcqModalCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [mcqModalPoints, setMcqModalPoints] = useState(5);

  const fetchMcqQuestions = async () => {
    if (!isClient) return;
    setLoadingMcq(true);
    try {
      const res = await fetch(`/api/mcq/questions?department=${encodeURIComponent(targetDept)}&sub_department=${encodeURIComponent(subDept)}&experience_level=${encodeURIComponent(expLevel)}`);
      if (res.ok) {
        const data = await res.json();
        setMcqQuestions(data);
      }
    } catch (err) {
      console.error("Failed to fetch MCQ questions:", err);
    } finally {
      setLoadingMcq(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetchMcqQuestions();
  }, [targetDept, subDept, expLevel, isClient]);

  const handleAddMcqQuestion = () => {
    setMcqModalMode('add');
    setEditingMcqId(null);
    setMcqModalQuestion('');
    setMcqModalOptA('');
    setMcqModalOptB('');
    setMcqModalOptC('');
    setMcqModalOptD('');
    setMcqModalCorrect('A');
    setMcqModalPoints(5);
    setIsMcqModalOpen(true);
  };

  const handleEditMcqQuestion = (q: any) => {
    setMcqModalMode('edit');
    setEditingMcqId(q.id);
    setMcqModalQuestion(q.question_text || q.questionText || '');
    setMcqModalOptA(q.option_a || q.optionA || '');
    setMcqModalOptB(q.option_b || q.optionB || '');
    setMcqModalOptC(q.option_c || q.optionC || '');
    setMcqModalOptD(q.option_d || q.optionD || '');
    setMcqModalCorrect((q.correct_answer || q.correctAnswer || 'A').toUpperCase() as any);
    setMcqModalPoints(q.points_value || q.pointsValue || 5);
    setIsMcqModalOpen(true);
  };

  const handleSaveMcqModalQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcqModalQuestion.trim() || !mcqModalOptA.trim() || !mcqModalOptB.trim() || !mcqModalOptC.trim() || !mcqModalOptD.trim()) return;

    try {
      const payload: any = {
        department: targetDept,
        sub_department: subDept,
        experience_level: expLevel,
        question_text: mcqModalQuestion.trim(),
        option_a: mcqModalOptA.trim(),
        option_b: mcqModalOptB.trim(),
        option_c: mcqModalOptC.trim(),
        option_d: mcqModalOptD.trim(),
        correct_answer: mcqModalCorrect,
        points_value: mcqModalPoints
      };

      if (editingMcqId) {
        payload.id = editingMcqId;
      }

      const res = await fetch('/api/mcq/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'kl_internal_admin_secret_2026_secure'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setToast({
          type: 'success',
          message: editingMcqId ? 'MCQ question updated successfully.' : 'MCQ question added successfully.'
        });
        setIsMcqModalOpen(false);
        fetchMcqQuestions();
      } else {
        const err = await res.json();
        setToast({ type: 'error', message: err.error || 'Failed to save MCQ question.' });
      }
    } catch (err) {
      console.error("Error saving MCQ question:", err);
      setToast({ type: 'error', message: 'Error saving question.' });
    }
  };

  const handleDeleteMcqQuestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/mcq/questions?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': 'kl_internal_admin_secret_2026_secure'
        }
      });
      if (res.ok) {
        setToast({ type: 'success', message: 'Question removed successfully.' });
        fetchMcqQuestions();
      } else {
        const err = await res.json();
        setToast({ type: 'error', message: err.error || 'Failed to delete question.' });
      }
    } catch (err) {
      console.error("Error deleting MCQ question:", err);
      setToast({ type: 'error', message: 'Error deleting question.' });
    }
  };

  // Prevent server-side rendering hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync sub-departments when department changes
  useEffect(() => {
    const defaultSubDept = TRACK_RELATIONS[targetDept]?.[0] || '';
    setSubDept(defaultSubDept);
    setRole('');
  }, [targetDept]);

  // Reset role when subDept changes
  useEffect(() => {
    setRole('');
  }, [subDept]);

  // Load configured questions from localStorage or fallback
  useEffect(() => {
    if (!isClient) return;
    const matrixKey = `${targetDept}|${subDept}|${role}`;
    const stored = localStorage.getItem('elasticrew_question_matrix');
    
    let pool: Record<string, string[]> = BASELINE_FALLBACK;
    if (stored) {
      try {
        pool = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse elasticrew_question_matrix", e);
      }
    } else {
      localStorage.setItem('elasticrew_question_matrix', JSON.stringify(BASELINE_FALLBACK));
    }

    const setQuestionsList = pool[matrixKey] || [
      "Please describe your technical background and experience level with core development tools.",
      "How do you ensure data accuracy and track exceptions within your workflow pipelines?",
      "Describe a challenging technical constraint you encountered and how you resolved it.",
      "How do you approach learning a completely new structural framework or corporate protocol?",
      "What methods do you employ to collaborate cleanly and share documentation within distributed engineering teams?"
    ];

    setQuestions(setQuestionsList);
  }, [targetDept, subDept, role, isClient]);

  // Toast auto-clear
  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => {
        setToast({ type: null, message: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Save current questions pool to localStorage
  const handleSaveConfig = () => {
    const matrixKey = `${targetDept}|${subDept}|${role}`;
    const stored = localStorage.getItem('elasticrew_question_matrix');
    let pool: Record<string, string[]> = { ...BASELINE_FALLBACK };

    if (stored) {
      try {
        pool = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse elasticrew_question_matrix on save", e);
      }
    }

    // Filter out empty entries
    const cleanedQuestions = questions.map(q => q.trim()).filter(Boolean);
    pool[matrixKey] = cleanedQuestions;
    localStorage.setItem('elasticrew_question_matrix', JSON.stringify(pool));
    
    // Sync state
    setQuestions(cleanedQuestions);

    setToast({
      type: 'success',
      message: `Configuration updated successfully for ${targetDept} → ${subDept} (${role}).`
    });
  };

  // Inline question changes
  const handleQuestionChange = (index: number, val: string) => {
    const nextQ = [...questions];
    nextQ[index] = val;
    setQuestions(nextQ);
  };

  // Delete question
  const handleDeleteQuestion = (index: number) => {
    const nextQ = questions.filter((_, i) => i !== index);
    setQuestions(nextQ);
    setToast({
      type: 'success',
      message: 'Question removed from list.'
    });
  };

  // Open modal to add a new question
  const handleAddQuestion = () => {
    setModalMode('add');
    setModalValue('');
    setIsModalOpen(true);
  };

  // Open modal to edit an existing question
  const handleOpenEditModal = (index: number) => {
    setModalMode('edit');
    setEditingIndex(index);
    setModalValue(questions[index]);
    setIsModalOpen(true);
  };

  // Save question from modal
  const handleSaveModalQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalValue.trim()) return;

    if (modalMode === 'add') {
      setQuestions([...questions, modalValue.trim()]);
      setToast({
        type: 'success',
        message: 'Question added successfully.'
      });
    } else if (modalMode === 'edit' && editingIndex !== null) {
      const nextQ = [...questions];
      nextQ[editingIndex] = modalValue.trim();
      setQuestions(nextQ);
      setToast({
        type: 'success',
        message: 'Question updated successfully.'
      });
    }

    setIsModalOpen(false);
    setModalValue('');
    setEditingIndex(null);
  };

  // MCQ Spreadsheet actions
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt !== 'csv' && fileExt !== 'xlsx' && fileExt !== 'xls') {
        setToast({
          type: 'error',
          message: `Unsupported format (.${fileExt || 'unknown'}). Please save your spreadsheet as CSV (.csv) or Excel (.xlsx, .xls) and upload it.`
        });
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          let parsedQuestions: any[] = [];
          
          if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (rows.length < 2) {
              setToast({ type: 'error', message: 'The uploaded file is empty or missing headers.' });
              return;
            }
            
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 6 || row[0] === undefined || row[0] === null || String(row[0]).trim() === '') continue;
              
              parsedQuestions.push({
                question_text: String(row[0]).trim(),
                option_a: String(row[1] !== undefined && row[1] !== null ? row[1] : '').trim(),
                option_b: String(row[2] !== undefined && row[2] !== null ? row[2] : '').trim(),
                option_c: String(row[3] !== undefined && row[3] !== null ? row[3] : '').trim(),
                option_d: String(row[4] !== undefined && row[4] !== null ? row[4] : '').trim(),
                correct_answer: String(row[5] || 'A').toUpperCase().trim(),
                points_value: parseInt(String(row[6] || '5')) || 5
              });
            }
          }
          
          if (parsedQuestions.length === 0) {
            setToast({ type: 'error', message: 'No valid questions could be parsed from the file.' });
            return;
          }
          
          const res = await fetch('/api/mcq/questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'kl_internal_admin_secret_2026_secure'
            },
            body: JSON.stringify({
              department: targetDept,
              sub_department: subDept,
              experience_level: expLevel,
              questions: parsedQuestions
            })
          });
          
          if (res.ok) {
            setToast({
              type: 'success',
              message: `Successfully parsed and uploaded ${parsedQuestions.length} MCQ questions.`
            });
            fetchMcqQuestions();
          } else {
            const err = await res.json();
            setToast({ type: 'error', message: err.error || 'Failed to upload MCQ questions.' });
          }
        } catch (err) {
          console.error("Error parsing uploaded file:", err);
          setToast({ type: 'error', message: 'Error parsing the spreadsheet file.' });
        }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
    }
  };

  const handleDownloadBlankTemplate = () => {
    const headers = ["QuestionText", "OptionA", "OptionB", "OptionC", "OptionD", "CorrectAnswer", "PointsValue"];
    const rows = [
      [
        "What is the primary methodology used to optimize query performance in indexed tables?",
        "Linear scanning algorithm loops",
        "Composite B-Tree index node mapping",
        "Asynchronous execution threads",
        "Explicit structural casting",
        "B",
        "10"
      ],
      [
        "Which corporate protocol handles explicit cross-origin resource allocations natively?",
        "CORS middleware header matrix",
        "SMTP transport pipelines",
        "GraphQL endpoint schema parsing",
        "Basic base64 payload streams",
        "A",
        "5"
      ]
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "blank_mcq_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({
      type: 'success',
      message: "Template download initialized: blank_mcq_template.csv generated successfully."
    });
  };

  if (!isClient) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>Loading Assessments Engine...</span>
      </div>
    );
  }

  const subDeptList = TRACK_RELATIONS[targetDept] || [];
  const roleList = Array.from(new Set(
    jobs
      .filter((j: any) => j.department === targetDept && (j.sub_department === subDept || !j.sub_department || subDept === 'General'))
      .map((j: any) => j.title)
      .filter(Boolean)
  )) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      
      {/* Toast Alert Indicator */}
      {toast.type && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1100,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '600',
          fontSize: '13.5px',
          transition: 'all 0.3s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Sub Tabs Toggle Bar */}
      <div className="assessment-toggle-bar" style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('videobot')}
          className={`toggle-tab ${activeTab === 'videobot' ? 'active' : ''}`}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '6px',
            transition: 'all 0.12s ease',
            backgroundColor: activeTab === 'videobot' ? 'var(--brand-navy)' : 'transparent',
            color: activeTab === 'videobot' ? '#ffffff' : 'var(--text-inactive)'
          }}
        >
          Video Bot Screening Questions
        </button>
        <button 
          onClick={() => setActiveTab('mcq')}
          className={`toggle-tab ${activeTab === 'mcq' ? 'active' : ''}`}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '6px',
            transition: 'all 0.12s ease',
            backgroundColor: activeTab === 'mcq' ? 'var(--brand-navy)' : 'transparent',
            color: activeTab === 'mcq' ? '#ffffff' : 'var(--text-inactive)'
          }}
        >
          MCQ Objective Assessments
        </button>
      </div>

      {/* Allocation Matrix Filters Card */}
      <div className="matrix-filter-card" style={{
        backgroundColor: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: activeTab === 'videobot' ? 'repeat(auto-fit, minmax(200px, 1fr)) auto' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        alignItems: 'end',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Target Department</label>
          <select 
            value={targetDept} 
            onChange={e => setTargetDept(e.target.value as any)}
            className="form-control"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13.5px', color: 'var(--text-dark)', outline: 'none' }}
          >
            <option value="Operations">Operations</option>
            <option value="Engineering">Engineering</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Sub-Department Track</label>
          <select 
            value={subDept} 
            onChange={e => setSubDept(e.target.value)}
            className="form-control"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13.5px', color: 'var(--text-dark)', outline: 'none' }}
          >
            {subDeptList.map(track => (
              <option key={track} value={track}>{track}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Role</label>
          <select 
            value={role} 
            onChange={e => setRole(e.target.value)}
            className="form-control"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13.5px', color: 'var(--text-dark)', outline: 'none' }}
          >
            <option value="">Select Role...</option>
            {roleList.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {activeTab === 'videobot' && (
          <button 
            onClick={handleSaveConfig}
            className="btn-submit"
            style={{
              backgroundColor: 'var(--brand-teal)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13.5px',
              cursor: 'pointer',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-teal-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-teal)'}
          >
            Save Configuration
          </button>
        )}
      </div>

      {/* PANEL A: Video Bot Screening Questions */}
      {activeTab === 'videobot' && (
        <div className="question-builder-container" style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)', margin: 0 }}>
                {targetDept} - {subDept} {role ? `(${role})` : ''} Interview Parameters
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Configure custom question limits seamlessly. Changes apply to newly generated invite links.
              </p>
            </div>
            <button 
              type="button"
              onClick={handleAddQuestion}
              className="btn-outline"
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid var(--border-strong)',
                backgroundColor: '#ffffff',
                color: 'var(--brand-navy)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                e.currentTarget.style.borderColor = 'var(--brand-navy)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
            >
              <Plus size={14} /> Add Target Question
            </button>
          </div>

          {/* Question stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {questions.map((qText, index) => (
              <div 
                key={index} 
                className="q-entry-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: 'var(--gray-50)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div className="q-number-badge" style={{
                  backgroundColor: 'var(--brand-navy)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '11px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                
                <div style={{
                  flexGrow: 1,
                  fontSize: '13.5px',
                  color: 'var(--text-main)',
                  fontWeight: '500',
                  lineHeight: '1.6',
                  wordBreak: 'break-word'
                }}>
                  {qText}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0
                }}>
                  <button 
                    type="button"
                    onClick={() => handleOpenEditModal(index)}
                    title="Edit Question"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--brand-navy)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                      e.currentTarget.style.borderColor = 'var(--brand-navy)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDeleteQuestion(index)}
                    title="Delete Question"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '8px', fontSize: '13.5px' }}>
                No questions configured for this matrix selection. Click "+ Add Target Question" to configure one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL B: MCQ Objective Assessments */}
      {activeTab === 'mcq' && (
        <div className="question-builder-container" style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)', margin: 0 }}>
                MCQ Question Bank Configuration
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Manage the multiple-choice question pool for {targetDept} → {subDept} {role ? `(${role})` : ''}.
              </p>
            </div>
            <button 
              type="button"
              onClick={handleAddMcqQuestion}
              className="btn-outline"
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid var(--border-strong)',
                backgroundColor: '#ffffff',
                color: 'var(--brand-navy)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                e.currentTarget.style.borderColor = 'var(--brand-navy)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
            >
              <Plus size={14} /> Add MCQ Question
            </button>
          </div>

          {/* Excel Schema Preview Table */}
          <div className="excel-template-box" style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div className="excel-header-banner" style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileSpreadsheet size={16} />
                REQUIRED SPREADSHEET TEMPLATE (.CSV Schema Reference)
              </span>
              <button 
                onClick={handleDownloadBlankTemplate}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                <Download size={12} /> Download CSV Template
              </button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>QuestionText</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>OptionA</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>OptionB</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>OptionC</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>OptionD</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>CorrectAnswer</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>PointsValue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>What is the primary methodology used to optimize query performance in indexed tables?</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>Linear scanning algorithm loops</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>Composite B-Tree index node mapping</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>Asynchronous execution threads</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>Explicit structural casting</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>B</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff', textAlign: 'center' }}>10</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div 
            onClick={triggerFileSelect}
            className="upload-dropzone" 
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '30px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#15803d';
              e.currentTarget.style.backgroundColor = '#f0fdf4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
          >
            <Upload size={30} color="#15803d" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
              Click to browse or drop formatted CSV/Excel files here
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Accepts comma-delimited (.csv) or Excel (.xlsx, .xls) files matching the template columns
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".csv,.xlsx,.xls" 
              onChange={handleFileUpload} 
            />
          </div>

          {/* Questions Bank List */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '16px' }}>
              Existing Questions ({mcqQuestions.length})
            </h4>

            {loadingMcq ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Loading questions from database...
              </div>
            ) : mcqQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '8px', fontSize: '13.5px' }}>
                No MCQ questions configured for this matrix selection. Upload a CSV template or click "+ Add MCQ Question" to create one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {mcqQuestions.map((q, index) => (
                  <div key={q.id || index} style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: '#fafafb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-dark)' }}>
                        Q{index + 1}. {q.question_text || q.questionText}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#475569' }}>
                        {q.points_value || q.pointsValue} Points
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      {['A', 'B', 'C', 'D'].map((optKey) => {
                        const optVal = q[`option_${optKey.toLowerCase()}`] || q[`option${optKey}`];
                        const isCorrect = (q.correct_answer || q.correctAnswer || '').toUpperCase() === optKey;
                        return (
                          <div key={optKey} style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            border: isCorrect ? '1.5px solid #10b981' : '1px solid var(--border)',
                            backgroundColor: isCorrect ? '#f0fdf4' : '#ffffff',
                            color: isCorrect ? '#166534' : 'var(--text-main)',
                            fontWeight: isCorrect ? '600' : 'normal',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ fontWeight: '700' }}>{optKey}.</span>
                            <span>{optVal}</span>
                            {isCorrect && <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}>Correct Option</span>}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleEditMcqQuestion(q)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: 'var(--brand-navy)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 12px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMcqQuestion(q.id)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 12px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Bot Modal Dialog for Add/Edit Question */}
      {isModalOpen && (
        <div className="modal-overlay active" style={{ zIndex: 99999 }}>
          <div className="modal-card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)' }}>
                  {modalMode === 'add' ? 'Add Target Question' : 'Edit Target Question'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {targetDept} - {subDept} ({expLevel}) Parameters
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray-400)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModalQuestion} style={{ margin: 0 }}>
              {/* Body */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>
                  Evaluation Question
                </label>
                <textarea
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  placeholder="Enter question text here..."
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    fontSize: '13.5px',
                    color: 'var(--text-main)',
                    fontWeight: '500',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all 0.18s ease'
                  }}
                  autoFocus
                />
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalValue.trim()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--brand-teal)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: !modalValue.trim() ? 'not-allowed' : 'pointer',
                    opacity: !modalValue.trim() ? 0.6 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {modalMode === 'add' ? 'Add Question' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MCQ Modal Dialog for Add/Edit Question */}
      {isMcqModalOpen && (
        <div className="modal-overlay active" style={{ zIndex: 99999 }}>
          <div className="modal-card" style={{ width: '100%', maxWidth: '550px', padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)' }}>
                  {mcqModalMode === 'add' ? 'Add MCQ Question' : 'Edit MCQ Question'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {targetDept} - {subDept} ({expLevel}) Parameters
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMcqModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray-400)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMcqModalQuestion} style={{ margin: 0 }}>
              {/* Body */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>
                    Question text
                  </label>
                  <textarea
                    value={mcqModalQuestion}
                    onChange={(e) => setMcqModalQuestion(e.target.value)}
                    placeholder="Enter multiple-choice question text..."
                    required
                    rows={3}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border)',
                      fontSize: '13px',
                      color: 'var(--text-main)',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit'
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Option A</label>
                    <input
                      type="text"
                      value={mcqModalOptA}
                      onChange={(e) => setMcqModalOptA(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Option B</label>
                    <input
                      type="text"
                      value={mcqModalOptB}
                      onChange={(e) => setMcqModalOptB(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Option C</label>
                    <input
                      type="text"
                      value={mcqModalOptC}
                      onChange={(e) => setMcqModalOptC(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Option D</label>
                    <input
                      type="text"
                      value={mcqModalOptD}
                      onChange={(e) => setMcqModalOptD(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Correct Answer</label>
                    <select
                      value={mcqModalCorrect}
                      onChange={(e) => setMcqModalCorrect(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '13px', backgroundColor: '#ffffff' }}
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Points Value</label>
                    <input
                      type="number"
                      value={mcqModalPoints}
                      onChange={(e) => setMcqModalPoints(parseInt(e.target.value) || 5)}
                      min={1}
                      max={100}
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsMcqModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--brand-teal)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {mcqModalMode === 'add' ? 'Add MCQ' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

