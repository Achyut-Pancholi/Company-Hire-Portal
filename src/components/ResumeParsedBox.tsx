"use client";

import React, { useState } from 'react';
import { FileText, BookOpen, Award, Code2 } from 'lucide-react';
import { ResumeViewButton } from '@/components/ResumeViewButton';

export function ResumeParsedBox({ candidate }: { candidate: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const edu = candidate.extractedData?.educationDetails || [];
  const skills = candidate.skills || [];

  return (
    <div 
      className="zoom-box" 
      style={{ 
        backgroundColor: '#fff', 
        padding: '1.25rem', 
        borderRadius: '12px', 
        border: '1px solid var(--border)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem',
        maxHeight: isExpanded ? '1200px' : '380px',
        transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', gap: '8px' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: '750', color: 'var(--brand-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={16} /> Resume Parsed
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <button
            className="btn btn-outline"
            style={{ 
              padding: '2px 8px', 
              fontSize: '0.68rem', 
              height: '22px', 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              backgroundColor: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--brand-navy)',
              fontWeight: '600'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'View Less' : 'View More'}
          </button>
          <ResumeViewButton candidate={candidate} />
        </div>
      </div>

      {/* Education History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BookOpen size={14} /> Education History
        </p>
        {edu.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {edu.map((e: any, i: number) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: i === 0 ? 'linear-gradient(135deg,rgba(14,45,123,0.03) 0%,rgba(13,148,136,0.03) 100%)' : 'var(--gray-50)', position: 'relative' }}>
                {i === 0 && <span style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '0.58rem', fontWeight: '800', padding: '1px 6px', borderRadius: '999px', backgroundColor: 'var(--brand-navy)', color: '#fff' }}>Highest</span>}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(14,45,123,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Award size={16} color="var(--brand-navy)" />
                  </div>
                  <div>
                    <p style={{ fontWeight: '700', color: 'var(--brand-navy)', fontSize: '0.8rem', margin: 0 }}>{e.degree || 'N/A'}</p>
                    <p style={{ color: 'var(--gray-600)', fontSize: '0.74rem', margin: '2px 0' }}>{e.college || e.institution || 'Institution N/A'}</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '2px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {e.passingYear && <span>ðŸŽ“ Class of {e.passingYear}</span>}
                      {e.cgpaOrPercentage && <span>ðŸ“Š {e.cgpaOrPercentage}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: '10px' }}>No education records.</div>
        )}
      </div>

      {/* Extracted Skills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--brand-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Code2 size={14} /> Extracted Skills
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {skills.length > 0 ? skills.map((s: string, i: number) => (
            <span key={i} style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '600', backgroundColor: 'rgba(14,45,123,0.06)', color: 'var(--brand-navy)', border: '1px solid rgba(14,45,123,0.12)' }}>{s}</span>
          )) : <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No skills extracted.</span>}
        </div>
      </div>
    </div>
  );
}

