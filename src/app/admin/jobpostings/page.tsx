"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, Folder } from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';

const JobPostings = () => {
  const { jobs, refreshJobs, apiFetch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshJobs();
  }, []);

  // Get unique list of existing parent departments
  const uniqueDepartments = Array.from(new Set(jobs.map((job: any) => job.department).filter(Boolean)));

  const handlePublishJob = async () => {
    // Validate input: require at least a parent department
    if (!department.trim()) {
      alert("Please provide a parent department.");
      return;
    }
    // Title (sub-department) is optional when creating a parent department

    setIsSubmitting(true);
    try {
      let res;
      if (editingJob) {
        if (editingJob.isParentEdit) {
          const jobsToUpdate = jobs.filter((j: any) => j.department === editingJob.oldDeptName);
          await Promise.all(
            jobsToUpdate.map((j: any) => {
              if (j.id === editingJob.id) {
                // Update everything for this specific row
                return apiFetch('/api/jobs', {
                  method: 'PATCH',
                  body: JSON.stringify({ 
                    id: j.id, 
                    department: department.trim(), 
                    sub_department: subDepartment.trim(),
                    title: title.trim()
                  })
                });
              } else {
                // Only rename the parent department for other rows
                return apiFetch('/api/jobs', {
                  method: 'PATCH',
                  body: JSON.stringify({ 
                    id: j.id, 
                    department: department.trim()
                  })
                });
              }
            })
          );
          res = { ok: true };
        } else {
          res = await apiFetch('/api/jobs', {
            method: 'PATCH',
            body: JSON.stringify({ id: editingJob.id, title: title.trim(), department: department.trim(), sub_department: subDepartment.trim() })
          });
        }
      } else {
        res = await apiFetch('/api/jobs', {
          method: 'POST',
          body: JSON.stringify({ title: title.trim(), department: department.trim(), sub_department: subDepartment.trim() })
        });
      }

      if (res.ok) {
        setTitle('');
        setDepartment('');
        setSubDepartment('');
        setEditingJob(null);
        setShowForm(false);
        refreshJobs(); // Reload jobs from Supabase
      } else {
        const err = await (res as any).json();
        alert(err.error || "Failed to save department");
      }
    } catch (e) {
      alert("Error saving department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setTitle(job.title);
    setDepartment(job.department || '');
    setSubDepartment(job.sub_department || '');
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditParentDept = (deptName: string, subDepts: any[]) => {
    const firstJob = subDepts[0];
    if (!firstJob) return;
    setEditingJob({ ...firstJob, isParentEdit: true, oldDeptName: deptName });
    setTitle(firstJob.title || '');
    setSubDepartment(firstJob.sub_department || '');
    setDepartment(deptName);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteJob = async (job: any) => {
    if (!window.confirm(`Are you sure you want to delete ${job.title}?`)) return;
    try {
      const res = await apiFetch(`/api/jobs?id=${job.id}`, { method: 'DELETE' });
      if (res.ok) {
        refreshJobs();
      } else {
        alert("Failed to delete department");
      }
    } catch (e) {
      alert("Error deleting department");
    }
  };

  // Group jobs by department
  const groupedDepartments = jobs.reduce((acc: any, job: any) => {
    const dept = job.department || 'Unassigned';
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(job);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--brand-navy)' }}>Department Hierarchy</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage parent Departments and their Sub-Departments</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingJob(null);
          setTitle('');
          setDepartment('');
          setShowForm(true);
          setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }}>
          <Plus size={16} /> Create New Department Configuration
        </button>
      </div>

      {showForm && (
        <div ref={formRef} className="card animate-slide-up" style={{ backgroundColor: 'var(--gray-50)', scrollMarginTop: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '1.125rem' }}>
              {editingJob ? (editingJob.isParentEdit ? 'Edit Parent Department' : 'Edit Department Configuration') : 'New Department Configuration'}
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-3 gap-6" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Parent Department</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Engineering, Sales, Product" 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  list="departments-list"
                />
                <datalist id="departments-list">
                  {uniqueDepartments.map((dept: any) => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type to create a new department or select an existing one.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Sub-Department</label>
                 <input
                   type="text"
                   className="form-input"
                   placeholder="e.g. Frontend, Backend, UI/UX"
                   value={subDepartment}
                   onChange={(e) => setSubDepartment(e.target.value)}
                 />
                 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                   {editingJob?.isParentEdit ? 'Updates the sub-department for this specific role, and renames the parent department for all roles in it.' : 'The sub-department under the parent.'}
                 </span>
              </div>
              <div className="form-group">
                <label className="form-label">Role Title</label>
                 <input
                   type="text"
                   className="form-input"
                   placeholder="e.g. Senior Frontend Dev"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                 />
                 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                   {editingJob?.isParentEdit ? 'Updates the role title for this specific role, and renames the parent department for all roles in it.' : 'The role under the sub-department.'}
                 </span>
              </div>
            </div>
             <div className="flex gap-4">
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePublishJob}
                  disabled={isSubmitting || !department.trim()}
              >
                {isSubmitting ? 'Saving...' : (editingJob ? 'Save Changes' : 'Publish Department')}
              </button>
              <button className="btn btn-outline" onClick={() => {
                setShowForm(false);
                setEditingJob(null);
                setTitle('');
                setDepartment('');
                setSubDepartment('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(groupedDepartments).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No departments configured. Click "Create New Department Configuration" to get started!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(groupedDepartments).map(([deptName, subDepts]: [string, any]) => (
            <div key={deptName} className="card" style={{ borderLeft: '4px solid var(--primary-color, #3b82f6)' }}>
              <div className="card-header flex justify-between items-center" style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div className="flex items-center gap-2">
                  <Folder size={20} style={{ color: 'var(--primary-color, #3b82f6)' }} />
                  <h3 
                    className="card-title" 
                    style={{ fontSize: '1.2rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
                    onClick={() => handleEditParentDept(deptName, subDepts)}
                    title="Click to edit parent department"
                  >
                    <span style={{ borderBottom: '1px dashed transparent' }} onMouseEnter={(e) => e.currentTarget.style.borderBottom = '1px dashed var(--brand-navy)'} onMouseLeave={(e) => e.currentTarget.style.borderBottom = '1px dashed transparent'}>{deptName}</span>
                    <Edit2 size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                  </h3>
                  <span className="badge" style={{ backgroundColor: 'var(--gray-100)', color: 'var(--text-main)', marginLeft: '0.5rem' }}>
                    {subDepts.length} {subDepts.length === 1 ? 'Sub-Department' : 'Sub-Departments'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost" style={{ padding: '0.25rem', cursor: 'pointer' }} onClick={() => handleEditParentDept(deptName, subDepts)} title="Edit Parent Department"><Edit2 size={16} /></button>
                </div>
              </div>
              <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '1.5rem' }}>Sub-Department</th>
                      <th>Role Title</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subDepts.map((job: any) => (
                      <tr key={job.id} style={{ cursor: 'pointer' }} onClick={() => handleEditJob(job)} title="Click to edit sub-department or role">
                        <td style={{ fontWeight: '500', paddingLeft: '1.5rem', color: 'var(--gray-600)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{job.sub_department || 'General'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: '500' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{job.title}</span>
                            <Edit2 size={12} style={{ color: 'var(--text-muted)', opacity: 0, transition: 'opacity 0.2s' }} className="edit-icon-hover" />
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost" style={{ padding: '0.25rem', cursor: 'pointer' }} onClick={() => handleEditJob(job)} title="Edit"><Edit2 size={16} /></button>
                            <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleDeleteJob(job)} title="Delete"><Archive size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobPostings;
