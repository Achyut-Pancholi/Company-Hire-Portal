"use client";

import React, { useState, useRef } from 'react';
import { Edit2, Save, Printer } from 'lucide-react';
import { useAppContext } from '@/components/admin/context/AppContext';

// Converts a string to Title Case (e.g. "JOHN DOE" → "John Doe")
const toTitleCase = (str: string): string =>
  str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

// html2pdf is dynamically imported in handlePrint to prevent SSR issues
const StandardResume = ({ candidate, onClose, onUpdate, readOnly = false }) => {
  const context = useAppContext();
  const apiFetch = context?.apiFetch;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef(null);

  // Local state for editing
  const [name, setName] = useState(toTitleCase(candidate?.name || ''));
  const [skills, setSkills] = useState(candidate?.skills ? candidate.skills.join(', ') : '');
  
  const extractedData = candidate?.extractedData || {};
  const [expTotal, setExpTotal] = useState(extractedData?.totalExperienceAnalysis?.totalExperience || '');
  const [expDomain, setExpDomain] = useState(extractedData?.totalExperienceAnalysis?.domainExperience || '0');
  const [expLeadership, setExpLeadership] = useState(extractedData?.totalExperienceAnalysis?.leadershipExperience || '0');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      
      const updatedExtractedData = {
        ...extractedData,
        totalExperienceAnalysis: {
          ...extractedData.totalExperienceAnalysis,
          totalExperience: expTotal,
          domainExperience: expDomain,
          leadershipExperience: expLeadership,
        }
      };

      const normalizedName = toTitleCase(name.trim());
      setName(normalizedName);

      const res = await apiFetch('/api/candidates', {
        method: 'PATCH',
        body: JSON.stringify({
          id: candidate.id,
          name: normalizedName,
          skills: skillsArray,
          extracted_data: updatedExtractedData
        })
      });

      if (res.ok) {
        setIsEditing(false);
        if (onUpdate) onUpdate();
      } else {
        alert("Failed to save changes");
      }
    } catch (e) {
      alert("Error saving changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (printRef.current) {
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const opt = {
          margin: [10, 0, 10, 0],
          filename: `${name.replace(/\s+/g, '_')}_Resume.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: 'css', avoid: '.print-avoid' }
        };
        html2pdf().set(opt).from(printRef.current).save();
      } catch (err) {
        console.error("Failed to load html2pdf", err);
      }
    }
  };

  if (!candidate) return null;

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      borderRadius: 'var(--radius-xl)',
      width: '100%',
      maxWidth: '850px',
      maxHeight: '90vh',
      boxShadow: 'var(--shadow-xl)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: '1px solid var(--border)'
    }} onClick={(e) => e.stopPropagation()}>
      
      {/* Modal Header (Hidden during print) */}
      {(onClose || !readOnly) && (
        <div className="print-hide" style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafb'
        }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--brand-navy)' }}>
              Standardized Candidate Resume
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
              Format: Single Column • Role: <strong style={{ color: 'var(--brand-green)' }}>{candidate.jobApplied}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={handlePrint} className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
              <Printer size={16} /> Download Resume
            </button>
            {!readOnly && (
              isEditing ? (
                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
                  <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
                  <Edit2 size={16} /> Edit
                </button>
              )
            )}
            {onClose && (
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem',
                color: 'var(--gray-400)', width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }} className="hover:bg-gray-100">&times;</button>
            )}
          </div>
        </div>
      )}

      {/* Printable Area: Single Column Design */}
      <div className="print-area" ref={printRef} style={{ padding: '3rem 4rem', overflowY: 'auto', flex: 1, backgroundColor: '#fff', color: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}>
        
        {/* Header / Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0f172a', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', border: '1px solid #ccc', borderRadius: '4px', padding: '0.25rem', width: '100%', marginBottom: '0.5rem' }} 
              />
            ) : (
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {name}
              </h1>
            )}
            <p style={{ fontSize: '1.25rem', color: '#475569', fontWeight: '500', margin: '0.5rem 0 0 0', letterSpacing: '0.01em' }}>
              {candidate.jobApplied} Professional
            </p>
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--brand-navy)', letterSpacing: '-0.5px' }}>
              ElastiCrew
            </div>
          </div>
        </div>



        {/* Single Column Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Experience Summary */}
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              Experience Overview
            </h2>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Total Experience</span>
                {isEditing ? (
                  <input type="text" value={expTotal} onChange={e => setExpTotal(e.target.value)} style={{ padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                ) : (
                  <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a' }}>{expTotal || 'N/A'}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Domain Experience</span>
                {isEditing ? (
                  <input type="text" value={expDomain} onChange={e => setExpDomain(e.target.value)} style={{ padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                ) : (
                  <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a' }}>{expDomain} years</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Leadership</span>
                {isEditing ? (
                  <input type="text" value={expLeadership} onChange={e => setExpLeadership(e.target.value)} style={{ padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                ) : (
                  <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a' }}>{expLeadership || '0 years'}</span>
                )}
              </div>
            </div>
          </section>

          {/* Core Competencies */}
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              Core Competencies
            </h2>
            {isEditing ? (
              <textarea 
                value={skills} 
                onChange={e => setSkills(e.target.value)} 
                rows={4}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'inherit' }}
                placeholder="Comma separated skills"
              />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {skills.split(',').filter(Boolean).map((skill, i) => (
                  <span key={i} style={{ 
                    backgroundColor: '#f1f5f9', 
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    padding: '0.35rem 0.85rem', 
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {skill.trim()}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Project Highlights */}
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              Project Highlights & Experience
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {extractedData?.projectAnalysis && extractedData.projectAnalysis.length > 0 ? (
                extractedData.projectAnalysis.map((proj, i) => (
                  <div key={i} className="print-avoid" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h3 style={{ fontWeight: '700', fontSize: '1.125rem', color: '#0f172a', margin: 0 }}>
                        {proj.projectName || 'Unnamed Project'}
                      </h3>
                      {proj.duration && <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500' }}>{proj.duration}</span>}
                    </div>
                    
                    {proj.role && (
                      <div style={{ color: '#334155', fontWeight: '600', fontSize: '0.95rem' }}>Role: {proj.role}</div>
                    )}
                    
                    <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: '0.25rem 0' }}>
                      {proj.projectDescription || 'No description provided.'}
                    </p>
                    
                    {proj.responsibilities && proj.responsibilities.length > 0 && (
                      <ul style={{ paddingLeft: '1.25rem', margin: '0.25rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        {proj.responsibilities.map((resp, rIdx) => (
                          <li key={rIdx} style={{ marginBottom: '0.25rem' }}>{resp}</li>
                        ))}
                      </ul>
                    )}

                    {(proj.techStack && proj.techStack.length > 0) || (proj.technologiesUsed && proj.technologiesUsed.length > 0) ? (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                        <strong style={{ color: '#334155' }}>Technologies: </strong> 
                        {(proj.techStack || proj.technologiesUsed).join(', ')}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.95rem' }}>No project history available.</p>
              )}
            </div>
          </section>

          {/* Education */}
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              Education
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {extractedData?.educationDetails && extractedData.educationDetails.length > 0 ? (
                extractedData.educationDetails.map((edu, i) => (
                  <div key={i} className="print-avoid" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontWeight: '700', fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                        {edu.degree || 'Degree details N/A'}
                      </h4>
                      <div style={{ fontSize: '0.95rem', color: '#475569', fontWeight: '500' }}>
                        {edu.college || 'Institution N/A'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '600' }}>
                        {edu.passingYear ? `Class of ${edu.passingYear}` : ''}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.125rem' }}>
                        {edu.cgpaOrPercentage ? `Grade: ${edu.cgpaOrPercentage}` : ''}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.95rem' }}>No education records available.</p>
              )}
            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div style={{ marginTop: '4rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          This resume was standardized and automatically generated via the ElastiCrew Interview Platform. <br/>
          Original contact details have been omitted to promote unbiased, skills-first evaluation.
        </div>
      </div>

    </div>
  );
};

export default StandardResume;
