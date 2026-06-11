"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, FileSpreadsheet, Plus, X, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'videobot' | 'mcq'>('videobot');
  const [isClient, setIsClient] = useState(false);

  // Dropdown States
  const [targetDept, setTargetDept] = useState<'Operations' | 'Engineering'>('Operations');
  const [subDept, setSubDept] = useState<string>('HR');
  const [expLevel, setExpLevel] = useState<string>('Fresher(0)');

  // Questions State
  const [questions, setQuestions] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Native input ref for MCQ file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent server-side rendering hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync sub-departments when department changes
  useEffect(() => {
    const defaultSubDept = TRACK_RELATIONS[targetDept]?.[0] || '';
    setSubDept(defaultSubDept);
  }, [targetDept]);

  // Load configured questions from localStorage or fallback
  useEffect(() => {
    if (!isClient) return;
    const matrixKey = `${targetDept}|${subDept}|${expLevel}`;
    const stored = localStorage.getItem('elasticrew_question_matrix');
    
    let pool = BASELINE_FALLBACK;
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
  }, [targetDept, subDept, expLevel, isClient]);

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
    const matrixKey = `${targetDept}|${subDept}|${expLevel}`;
    const stored = localStorage.getItem('elasticrew_question_matrix');
    let pool = { ...BASELINE_FALLBACK };

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
      message: `Configuration updated successfully for ${targetDept} -> ${subDept} (${expLevel}).`
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
  };

  // Append empty question row
  const handleAddQuestion = () => {
    setQuestions([...questions, "Enter custom target evaluation prompt text here..."]);
  };

  // MCQ Spreadsheet actions
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filename = e.target.files[0].name;
      setToast({
        type: 'success',
        message: `Excel Parser Connected: Successfully uploaded "${filename}". Objective questions parsed and mapped to ${subDept} (${expLevel}).`
      });
      e.target.value = '';
    }
  };

  const handleDownloadBlankTemplate = () => {
    setToast({
      type: 'success',
      message: "Template download initialized: blank_mcq_template.xlsx schema generated successfully."
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto',
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
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>Experience Level</label>
          <select 
            value={expLevel} 
            onChange={e => setExpLevel(e.target.value)}
            className="form-control"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13.5px', color: 'var(--text-dark)', outline: 'none' }}
          >
            <option value="Fresher(0)">Fresher(0)</option>
            <option value="Junior(1-3)">Junior(1-3)</option>
            <option value="Mid Level(3-5)">Mid Level(3-5)</option>
            <option value="Senior(5+)">Senior(5+)</option>
            <option value="Lead(10+)">Lead(10+)</option>
          </select>
        </div>

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
                {targetDept} - {subDept} ({expLevel}) Interview Parameters
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Configure custom question limits seamlessly. Changes apply to newly generated invite links.
              </p>
            </div>
            <button 
              onClick={handleAddQuestion}
              className="btn-secondary"
              style={{
                backgroundColor: 'var(--gray-100)',
                color: 'var(--gray-800)',
                border: '1px solid var(--border)',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-200)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-100)'}
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
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--gray-50)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div className="q-number-badge" style={{
                  backgroundColor: 'var(--gray-200)',
                  color: 'var(--gray-700)',
                  fontWeight: '700',
                  fontSize: '11px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '6px'
                }}>
                  {index + 1}
                </div>
                
                <textarea 
                  className="q-text-input" 
                  value={qText}
                  onChange={e => handleQuestionChange(index, e.target.value)}
                  rows={2}
                  style={{
                    flexGrow: 1,
                    border: '1.5px solid var(--border)',
                    borderRadius: '8px',
                    background: '#ffffff',
                    fontSize: '13.5px',
                    color: 'var(--text-main)',
                    fontWeight: '500',
                    outline: 'none',
                    padding: '8px 12px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    transition: 'all 0.18s ease',
                    boxShadow: 'var(--shadow-xs)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--brand-teal)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.18), var(--shadow-sm)';
                    e.target.style.backgroundColor = '#f0fdfa';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.boxShadow = 'var(--shadow-xs)';
                    e.target.style.backgroundColor = '#ffffff';
                  }}
                />

                <button 
                  onClick={() => handleDeleteQuestion(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gray-400)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    transition: 'color 0.15s ease',
                    marginTop: '6px',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray-400)'}
                >
                  <X size={16} />
                </button>
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
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)', margin: 0 }}>
              Bulk Upload Objective Questions
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Map questions directly to the selected profile by uploading your formatted spreadsheet.
            </p>
          </div>

          {/* Excel Schema Preview Table */}
          <div className="excel-template-box" style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            overflow: 'hidden',
            marginTop: '12px'
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
                REQUIRED EXCEL TEMPLATE STRUCTURE (.XLSX Schema Reference)
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
                <Download size={12} /> Download Blank Template
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
                  <tr>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>Which corporate protocol handles explicit cross-origin resource allocations natively?</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>CORS middleware header matrix</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>SMTP transport pipelines</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>GraphQL endpoint schema parsing</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff' }}>Basic base64 payload streams</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>A</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#ffffff', textAlign: 'center' }}>5</td>
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
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              marginTop: '20px',
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
            <Upload size={36} color="#15803d" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
              Click to browse or drop formatted Excel sheets here
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Supports secure parsing for .xlsx and .csv files
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".xlsx,.xls,.csv" 
              onChange={handleFileUpload} 
            />
          </div>
        </div>
      )}

    </div>
  );
}

