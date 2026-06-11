"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAppContext, apiFetch } from '@/components/admin/context/AppContext';

const QuestionBankModal = ({ onClose }) => {
  const { jobs } = useAppContext();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newDepartment, setNewDepartment] = useState('');
  const [newSubDepartment, setNewSubDepartment] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  
  // Unique departments combined from existing questions
  const allDepartments = [...new Set(questions.map(q => q.department || 'General'))].filter(Boolean);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSubDepartment, setSelectedSubDepartment] = useState('');
  // Dynamic Departments from jobs
  const availableDepartments = Array.from(new Set(jobs.map((j: any) => j.department).filter(Boolean))) as string[];
  
  const getAvailableSubDepartments = (dept: string) => {
    const subDepts = Array.from(new Set(jobs.filter((j: any) => j.department === dept && j.sub_department).map((j: any) => j.sub_department))) as string[];
    return subDepts.length > 0 ? subDepts : ['General'];
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    // Disabled auto-selection to allow manual cascading
  }, [jobs]);

  useEffect(() => {
    if (allDepartments.length > 0 && !selectedDepartment) {
      setSelectedDepartment(allDepartments[0]);
    }
  }, [questions]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/questions');
      const data = await res.json();
      setQuestions(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) return;

    try {
      const res = await apiFetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: newDepartment,
          sub_department: newSubDepartment,
          question_text: newQuestionText.trim(),
          is_mandatory: false
        })
      });
      if (res.ok) {
        setNewQuestionText('');
        fetchQuestions();
      } else {
        const err = await res.json();
        console.error("Failed to add question:", err);
        alert(err.error || "Failed to add question");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;

    try {
      const res = await apiFetch(`/api/questions?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchQuestions();
      } else {
        alert("Failed to delete question");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredQuestions = questions.filter((q: any) => {
    if (selectedDepartment && q.department !== selectedDepartment) return false;
    if (selectedSubDepartment && q.sub_department !== selectedSubDepartment) return false;
    return true;
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Question Bank Manager</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Add Question Form */}
          <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Add New Question</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label">Department</label>
                <select 
                  className="form-select"
                  value={newDepartment}
                  onChange={e => {
                    const newDept = e.target.value;
                    setNewDepartment(newDept);
                    setNewSubDepartment('');
                  }}
                >
                  <option value="">Select Department...</option>
                  {availableDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="form-label">Sub-Department</label>
                <select 
                  className="form-select"
                  value={newSubDepartment}
                  disabled={!newDepartment}
                  onChange={e => {
                    const newSub = e.target.value;
                    setNewSubDepartment(newSub);
                  }}
                >
                  <option value="">Select Sub-Department...</option>
                  {newDepartment && (getAvailableSubDepartments(newDepartment)).map(sd => (
                    <option key={sd} value={sd}>{sd}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Question Text</label>
              <textarea 
                className="form-input" 
                rows="2" 
                value={newQuestionText}
                onChange={e => setNewQuestionText(e.target.value)}
                placeholder="What is your experience with React?"
              ></textarea>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
              {!newSubDepartment && newQuestionText.trim() && (
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Please select a sub-department</span>
              )}
              <button className="btn btn-primary" onClick={handleAddQuestion} disabled={!newQuestionText.trim() || !newSubDepartment}>
                <Plus size={16} /> Add Question
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Existing Questions</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select 
                className="form-select" 
                style={{ width: 'auto', padding: '0.25rem 2rem 0.25rem 0.75rem', fontSize: '0.875rem' }}
                value={selectedDepartment}
                onChange={e => {
                  setSelectedDepartment(e.target.value);
                  setSelectedSubDepartment('');
                }}
              >
                <option value="">All Departments</option>
                {allDepartments.map((r: any) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {selectedDepartment && (
                <select 
                  className="form-select" 
                  style={{ width: 'auto', padding: '0.25rem 2rem 0.25rem 0.75rem', fontSize: '0.875rem' }}
                  value={selectedSubDepartment}
                  onChange={e => {
                    setSelectedSubDepartment(e.target.value);
                  }}
                >
                  <option value="">All Sub-Departments</option>
                  {(getAvailableSubDepartments(selectedDepartment)).map(sd => (
                    <option key={sd} value={sd}>{sd}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Loading...</div>
          ) : filteredQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              No questions found. Add one above!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredQuestions.map((q, i) => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block' }}>Q{i+1}. {q.question_text}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{q.department || 'General'}</span>
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{q.sub_department || 'General'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteQuestion(q.id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: 'var(--danger)', 
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete Question"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionBankModal;
