import React from 'react';

interface WorkflowBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const WorkflowBadge: React.FC<WorkflowBadgeProps> = ({ status, size = 'md' }) => {
  const getStyles = (s: string) => {
    const clean = (s || '').trim().toLowerCase();
    
    switch (clean) {
      case 'approved':
      case 'selected':
      case 'completed':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          color: '#065f46',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          text: s || 'Completed',
        };
      case 'rejected':
      case 'rejected at resume stage':
      case 'rejected at video stage':
      case 'rejected at technical stage':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          color: '#7f1d1d',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          text: s || 'Rejected',
        };
      case 'pending':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          text: s || 'Pending',
        };
      case 'scheduled':
        return {
          bg: 'rgba(59, 130, 246, 0.1)',
          color: '#1e40af',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          text: s || 'Scheduled',
        };
      case 'resume screening':
      case 'resume upload':
        return {
          bg: 'rgba(107, 114, 128, 0.1)',
          color: '#374151',
          border: '1px solid rgba(107, 114, 128, 0.25)',
          text: s || 'Resume Screening',
        };
      case 'video screening':
        return {
          bg: 'rgba(99, 102, 241, 0.1)',
          color: '#312e81',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          text: s || 'Video Screening',
        };
      case 'technical scheduler':
        return {
          bg: 'rgba(139, 92, 246, 0.1)',
          color: '#4c1d95',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          text: s || 'Tech Scheduler',
        };
      case 'technical evaluation':
        return {
          bg: 'rgba(236, 72, 153, 0.1)',
          color: '#831843',
          border: '1px solid rgba(236, 72, 153, 0.25)',
          text: s || 'Tech Evaluation',
        };
      case 'report generation':
        return {
          bg: 'rgba(20, 184, 166, 0.1)',
          color: '#115e59',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          text: s || 'Report Gen',
        };
      default:
        return {
          bg: 'rgba(107, 114, 128, 0.1)',
          color: '#374151',
          border: '1px solid rgba(107, 114, 128, 0.25)',
          text: s || 'Unknown',
        };
    }
  };

  const style = getStyles(status);
  
  const sizeStyles = {
    sm: { padding: '2px 8px', fontSize: '0.68rem' },
    md: { padding: '4px 12px', fontSize: '0.75rem' },
    lg: { padding: '6px 16px', fontSize: '0.85rem' }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        borderRadius: '9999px',
        whiteSpace: 'nowrap',
        backgroundColor: style.bg,
        color: style.color,
        border: style.border,
        ...sizeStyles[size]
      }}
    >
      {style.text}
    </span>
  );
};

export default WorkflowBadge;
