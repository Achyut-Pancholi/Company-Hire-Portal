"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Folder, FolderOpen, Search, X, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';

// ── tiny inline-delete confirmation popover ──────────────────────────────────
function DeletePopover({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: '110%',
        zIndex: 50,
        background: '#fff',
        border: '1px solid var(--gray-200)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        padding: '1rem',
        minWidth: '210px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, fontWeight: 500 }}>
        Delete this role?
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-outline"
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn"
          style={{
            padding: '0.35rem 0.85rem',
            fontSize: '0.8rem',
            backgroundColor: 'var(--danger)',
            color: '#fff',
            border: 'none',
          }}
          onClick={onConfirm}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Add / Edit modal ─────────────────────────────────────────────────────────
function DeptModal({
  open,
  onClose,
  onSave,
  initialData,
  uniqueDepartments,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { department: string; subDepartment: string; title: string }) => void;
  initialData?: { department: string; subDepartment: string; title: string } | null;
  uniqueDepartments: string[];
  isSaving: boolean;
}) {
  const [department, setDepartment] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (open) {
      setDepartment(initialData?.department ?? '');
      setSubDepartment(initialData?.subDepartment ?? '');
      setTitle(initialData?.title ?? '');
    }
  }, [open, initialData]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '520px',
          maxWidth: '95vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'slideUp 0.18s ease',
        }}
      >
        {/* header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--gray-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontWeight: 700, color: 'var(--brand-navy)', margin: 0, fontSize: '1.05rem' }}>
            {initialData ? 'Edit Department Entry' : 'Add Department Entry'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Engineering, Sales, Product"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              list="modal-departments-list"
            />
            <datalist id="modal-departments-list">
              {uniqueDepartments.map((d) => <option key={d} value={d} />)}
            </datalist>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Type to create new or select existing department.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Sub-Department Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Frontend, Backend, UI/UX"
              value={subDepartment}
              onChange={(e) => setSubDepartment(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Job Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Senior Frontend Developer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--gray-100)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button className="btn btn-outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={isSaving || !department.trim()}
            onClick={() => onSave({ department, subDepartment, title })}
          >
            {isSaving ? 'Saving…' : 'Save & Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline-editable row ───────────────────────────────────────────────────────
function RoleRow({
  job,
  onSave,
  onDelete,
}: {
  job: any;
  onSave: (id: string, subDept: string, title: string) => Promise<void>;
  onDelete: (job: any) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [subDept, setSubDept] = useState(job.sub_department || '');
  const [title, setTitle] = useState(job.title || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(job.id, subDept, title);
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await onDelete(job);
  };

  return (
    <tr>
      {/* Sub-Department */}
      <td style={{ paddingLeft: '1.5rem', fontWeight: 500, color: 'var(--gray-700)' }}>
        {editing ? (
          <input
            className="form-input"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem' }}
            value={subDept}
            onChange={(e) => setSubDept(e.target.value)}
          />
        ) : (
          <span>{job.sub_department || 'General'}</span>
        )}
      </td>

      {/* Job Title */}
      <td style={{ fontWeight: 500 }}>
        {editing ? (
          <input
            className="form-input"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        ) : (
          <span>{job.title}</span>
        )}
      </td>

      {/* Actions */}
      <td style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          {editing ? (
            <>
              <button
                className="btn btn-ghost"
                style={{ padding: '0.3rem 0.6rem', color: 'var(--success)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={handleSave}
                disabled={saving}
                title="Save changes"
              >
                <Check size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => { setEditing(false); setSubDept(job.sub_department || ''); setTitle(job.title || ''); }}
                title="Cancel"
              >
                <X size={14} /> Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-ghost"
                style={{ padding: '0.3rem', cursor: 'pointer' }}
                onClick={() => setEditing(true)}
                title="Edit role"
              >
                <Edit2 size={15} />
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '0.3rem', color: 'var(--danger)', cursor: 'pointer' }}
                  onClick={() => setConfirmDelete(true)}
                  title="Delete role"
                >
                  <Trash2 size={15} />
                </button>
                {confirmDelete && (
                  <DeletePopover
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(false)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Department Card ──────────────────────────────────────────────────────────
function DeptCard({
  deptName,
  subDepts,
  onEditParent,
  onSaveRole,
  onDeleteRole,
}: {
  deptName: string;
  subDepts: any[];
  onEditParent: () => void;
  onSaveRole: (id: string, subDept: string, title: string) => Promise<void>;
  onDeleteRole: (job: any) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card"
      style={{
        borderLeft: '4px solid var(--brand-navy)',
        transition: 'box-shadow 0.2s',
        overflow: 'visible',
      }}
    >
      {/* Card header – always visible */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {expanded
            ? <FolderOpen size={20} style={{ color: 'var(--brand-navy)' }} />
            : <Folder size={20} style={{ color: 'var(--brand-navy)' }} />}
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--brand-navy)' }}>
            {deptName}
          </span>
          <span
            className="badge"
            style={{ backgroundColor: 'var(--gray-100)', color: 'var(--text-muted)', fontSize: '0.75rem' }}
          >
            {subDepts.length} {subDepts.length === 1 ? 'role' : 'roles'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-ghost"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={onEditParent}
            title="Edit department name"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '0.35rem', color: 'var(--gray-400)' }}
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable sub-department table */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--gray-100)' }}>
          {subDepts.length === 0 ? (
            <p style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No roles yet. Add one using "+ Add Department".
            </p>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0, marginBottom: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '1.5rem' }}>Sub-Department</th>
                    <th>Job Title</th>
                    <th style={{ width: '160px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subDepts.map((job: any) => (
                    <RoleRow
                      key={job.id}
                      job={job}
                      onSave={onSaveRole}
                      onDelete={onDeleteRole}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const JobPostings = () => {
  const { jobs, refreshJobs, apiFetch } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);  // null = new entry

  // search
  const [search, setSearch] = useState('');

  useEffect(() => {
    refreshJobs();
  }, []);

  const uniqueDepartments: string[] = Array.from(
    new Set(jobs.map((job: any) => job.department).filter(Boolean))
  );

  // Group by parent department
  const grouped: Record<string, any[]> = jobs.reduce((acc: any, job: any) => {
    const dept = job.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(job);
    return acc;
  }, {});

  // Filter by search query
  const filteredEntries = Object.entries(grouped).filter(([deptName, roles]) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (deptName.toLowerCase().includes(q)) return true;
    return roles.some(
      (r: any) =>
        (r.sub_department || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q)
    );
  });

  // Save (create or update)
  const handleSave = async (data: { department: string; subDepartment: string; title: string }) => {
    setIsSaving(true);
    try {
      let res;
      if (editingJob) {
        if (editingJob.isParentEdit) {
          const jobsToUpdate = jobs.filter((j: any) => j.department === editingJob.oldDeptName);
          await Promise.all(
            jobsToUpdate.map((j: any) =>
              apiFetch('/api/jobs', {
                method: 'PATCH',
                body: JSON.stringify({
                  id: j.id,
                  department: data.department.trim(),
                  ...(j.id === editingJob.id
                    ? { sub_department: data.subDepartment.trim(), title: data.title.trim() }
                    : {}),
                }),
              })
            )
          );
          res = { ok: true };
        } else {
          res = await apiFetch('/api/jobs', {
            method: 'PATCH',
            body: JSON.stringify({
              id: editingJob.id,
              department: data.department.trim(),
              sub_department: data.subDepartment.trim(),
              title: data.title.trim(),
            }),
          });
        }
      } else {
        res = await apiFetch('/api/jobs', {
          method: 'POST',
          body: JSON.stringify({
            department: data.department.trim(),
            sub_department: data.subDepartment.trim(),
            title: data.title.trim(),
          }),
        });
      }
      if ((res as any).ok !== false) {
        setModalOpen(false);
        setEditingJob(null);
        refreshJobs();
      } else {
        const err = await (res as any).json?.();
        alert(err?.error || 'Failed to save department');
      }
    } catch {
      alert('Error saving department');
    } finally {
      setIsSaving(false);
    }
  };

  // Inline role save
  const handleSaveRole = async (id: string, subDept: string, title: string) => {
    try {
      const res = await apiFetch('/api/jobs', {
        method: 'PATCH',
        body: JSON.stringify({ id, sub_department: subDept.trim(), title: title.trim() }),
      });
      if ((res as any).ok !== false) refreshJobs();
      else alert('Failed to update role');
    } catch {
      alert('Error updating role');
    }
  };

  // Delete role
  const handleDeleteRole = async (job: any) => {
    try {
      const res = await apiFetch(`/api/jobs?id=${job.id}`, { method: 'DELETE' });
      if ((res as any).ok !== false) refreshJobs();
      else alert('Failed to delete role');
    } catch {
      alert('Error deleting role');
    }
  };

  // Open modal to edit department name
  const handleEditParent = (deptName: string, subDepts: any[]) => {
    const first = subDepts[0];
    if (!first) return;
    setEditingJob({ ...first, isParentEdit: true, oldDeptName: deptName });
    setModalOpen(true);
  };

  return (
    <>
      {/* keyframe for modal slide-up */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0 }}>
              Department Configuration
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.9rem' }}>
              Manage departments, sub-departments, and job titles used across the hiring pipeline.
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={() => { setEditingJob(null); setModalOpen(true); }}
          >
            <Plus size={16} /> Add Department
          </button>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', maxWidth: '420px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search department, sub-department, or job title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem', paddingRight: search ? '2.4rem' : undefined }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* ── Department cards ─────────────────────────────────────────────── */}
        {filteredEntries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            {search
              ? `No departments match "${search}".`
              : 'No departments configured. Click "+ Add Department" to get started.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredEntries.map(([deptName, subDepts]) => (
              <DeptCard
                key={deptName}
                deptName={deptName}
                subDepts={subDepts}
                onEditParent={() => handleEditParent(deptName, subDepts)}
                onSaveRole={handleSaveRole}
                onDeleteRole={handleDeleteRole}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <DeptModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingJob(null); }}
        onSave={handleSave}
        initialData={
          editingJob
            ? {
                department: editingJob.isParentEdit ? editingJob.oldDeptName : (editingJob.department || ''),
                subDepartment: editingJob.sub_department || '',
                title: editingJob.title || '',
              }
            : null
        }
        uniqueDepartments={uniqueDepartments}
        isSaving={isSaving}
      />
    </>
  );
};

export default JobPostings;
