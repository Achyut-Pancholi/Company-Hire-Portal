import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount?: number;
  pageSize?: number;
}

export default function Pagination({ currentPage, totalPages, onPageChange, totalCount, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * (pageSize || 20) + 1;
  const endItem = totalCount ? Math.min(currentPage * (pageSize || 20), totalCount) : '-';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px 0', borderTop: '1px solid var(--border, #e2e8f0)' }}>
      <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>
        {totalCount !== undefined ? (
          <span>Showing {startItem} to {endItem} of {totalCount} entries</span>
        ) : (
          <span>Page {currentPage} of {totalPages}</span>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '5px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border, #e2e8f0)',
            background: currentPage <= 1 ? 'var(--gray-100, #f1f5f9)' : 'var(--surface, #ffffff)',
            color: currentPage <= 1 ? 'var(--text-muted, #64748b)' : 'var(--text-main, #1e293b)',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Previous
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
          // Logic to show a limited number of pages (e.g. 1 2 ... 5 6 7 ... 10)
          if (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: page === currentPage ? '1px solid var(--primary, #0D9488)' : '1px solid var(--border, #e2e8f0)',
                  background: page === currentPage ? 'var(--primary, #0D9488)' : 'var(--surface, #ffffff)',
                  color: page === currentPage ? '#fff' : 'var(--text-main, #1e293b)',
                  cursor: 'pointer',
                  fontWeight: page === currentPage ? 'bold' : 'normal'
                }}
              >
                {page}
              </button>
            );
          } else if (
            page === currentPage - 2 ||
            page === currentPage + 2
          ) {
            return <span key={page} style={{ padding: '6px 4px', color: 'var(--text-muted, #64748b)' }}>...</span>;
          }
          return null;
        })}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border, #e2e8f0)',
            background: currentPage >= totalPages ? 'var(--gray-100, #f1f5f9)' : 'var(--surface, #ffffff)',
            color: currentPage >= totalPages ? 'var(--text-muted, #64748b)' : 'var(--text-main, #1e293b)',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
