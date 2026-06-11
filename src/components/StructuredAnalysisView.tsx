import React, { useMemo } from 'react';

export function StructuredAnalysisView({ text }: { text: string | any }) {
  const parsed = useMemo(() => {
    if (!text) return null;

    let pros: string[] = [];
    let cons: string[] = [];
    let okok: string[] = [];
    let summaryList: string[] = [];
    let summaryText = "";

    try {
      // Handle case where text is already an object or a stringified JSON
      let cleanText = text;
      if (typeof text === 'string') {
        cleanText = text.trim();
        // Remove markdown formatting
        cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/i, '').replace(/```$/, '').trim();
        // Try extracting JSON if there's text before or after it
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }
        
        // Attempt to fix unescaped newlines inside strings (common LLM error)
        // We replace newlines that are not preceded by a comma or bracket and not followed by a quote or bracket.
        // A simpler way is just let it fail and then the fallback handles it.
      }
      const data = typeof cleanText === 'string' ? JSON.parse(cleanText) : cleanText;
      
      if (Array.isArray(data)) {
        let reconstructedData: string[] = [];
        data.forEach(item => {
            if (typeof item !== 'string') return;
            const trimmed = item.trim();
            if (reconstructedData.length === 0) {
                reconstructedData.push(trimmed);
                return;
            }
            
            const last = reconstructedData[reconstructedData.length - 1].trim();
            const cleanLast = last.replace(/\*+$/, '').trim();
            const sentenceEnded = /[.!?]$/.test(cleanLast);
            const isExplicitBullet = /^[*•-]/.test(trimmed);
            
            if (sentenceEnded || isExplicitBullet) {
                reconstructedData.push(trimmed);
            } else {
                if (!/[.,:;]$/.test(cleanLast) && !trimmed.startsWith('and ') && !trimmed.startsWith('/')) {
                    reconstructedData[reconstructedData.length - 1] += ', ' + trimmed;
                } else {
                    reconstructedData[reconstructedData.length - 1] += (trimmed.startsWith('/') ? '' : ' ') + trimmed;
                }
            }
        });
        
        let finalData: string[] = [];
        reconstructedData.forEach(item => {
           item.split('\n').forEach(line => {
              if (line.trim()) finalData.push(line.trim());
           });
        });

        const positiveWords = ['good', 'great', 'excellent', 'strong', 'well', 'impressive', 'demonstrated', 'proficient', 'clear', 'effective', 'ability', 'positive'];
        const negativeWords = ['failed', 'lack', 'difficulty', 'require', 'weak', 'poor', 'bad', 'needs', 'not', 'unable', 'struggled', 'missed', 'unclear', 'necessary'];
        
        finalData.forEach(item => {
          const lower = item.toLowerCase();
          const hasPos = positiveWords.some(w => lower.includes(w));
          const hasNeg = negativeWords.some(w => lower.includes(w));
          
          if (hasNeg && !hasPos) {
            cons.push(item);
          } else if (hasPos && !hasNeg) {
            pros.push(item);
          } else if (hasPos && hasNeg) {
             // If both, consider it neutral
            okok.push(item);
          } else {
            okok.push(item);
          }
        });
      } else if (data && typeof data === 'object') {
        if (data.pros) pros = Array.isArray(data.pros) ? data.pros : [data.pros];
        if (data.cons) cons = Array.isArray(data.cons) ? data.cons : [data.cons];
        if (data.okok || data.neutral) okok = Array.isArray(data.okok || data.neutral) ? data.okok || data.neutral : [data.okok || data.neutral];
        if (data.summary) {
          if (Array.isArray(data.summary)) {
            summaryList = data.summary;
          } else {
            summaryText = data.summary;
          }
        }
      }
      
      // Fallback if the JSON didn't have structured arrays but had text
      if (!pros.length && !cons.length && !okok.length && !summaryList.length) {
        summaryText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
      }
    } catch (e) {
      // Not JSON. Let's try to parse it with Regex or line splitting.
      const strText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
      const lines = strText.split('\n');
      let currentSection = "summary";
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Filter out JSON artifacts that leaked into the text if parsing completely failed
        if (/^[\[\]{}],?$/.test(trimmed) || /^"[a-zA-Z0-9_]+"\s*:\s*([\[{]|[\d.]+,?|true,?|false,?|null,?|"[^"]*",?)$/.test(trimmed)) {
          return;
        }

        const lower = trimmed.toLowerCase();
        if (lower.startsWith('pros:') || lower.startsWith('strengths:') || lower === 'pros' || lower === 'strengths' || lower === 'pros / strengths' || lower === 'pros / strengths:') {
          currentSection = 'pros';
          const val = line.replace(/^(pros|strengths|pros \/ strengths):?/i, '').trim();
          if (val) pros.push(val);
        } else if (lower.startsWith('cons:') || lower.startsWith('weaknesses:') || lower === 'cons' || lower === 'weaknesses' || lower === 'cons / weaknesses' || lower === 'cons / weaknesses:') {
          currentSection = 'cons';
          const val = line.replace(/^(cons|weaknesses|cons \/ weaknesses):?/i, '').trim();
          if (val) cons.push(val);
        } else if (lower.startsWith('okok:') || lower.startsWith('neutral:') || lower.startsWith('neutral points') || lower === 'neutral' || lower === 'neutral points' || lower === 'neutral points:') {
          currentSection = 'okok';
          const val = line.replace(/^(okok|neutral|neutral points):?/i, '').trim();
          if (val) okok.push(val);
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
          const val = trimmed.replace(/^[-*•]\s*/, '').trim();
          if (val) {
            if (currentSection === 'pros') pros.push(val);
            else if (currentSection === 'cons') cons.push(val);
            else if (currentSection === 'okok') okok.push(val);
            else summaryList.push(val);
          }
        } else {
          if (currentSection === 'pros' && line.trim()) pros.push(line.trim());
          else if (currentSection === 'cons' && line.trim()) cons.push(line.trim());
          else if (currentSection === 'okok' && line.trim()) okok.push(line.trim());
          else if (line.trim()) {
            summaryText += line + '\n';
          }
        }
      });
    }

    return { pros, cons, okok, summaryList, summaryText: summaryText.trim() };
  }, [text]);

  if (!parsed) return <div style={{ fontSize: '0.82rem', color: 'var(--gray-700)' }}>No analysis available.</div>;

  const { pros, cons, okok, summaryList, summaryText } = parsed;

  const BulletList = ({ items, color, title }: { items: string[], color: string, title?: string }) => {
    if (!items || items.length === 0) return null;
    return (
      <div style={{ marginBottom: '12px' }}>
        {title && <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', fontWeight: '700', color: '#1e293b' }}>{title}</p>}
        <ul style={{ margin: 0, paddingLeft: '0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--gray-700)', lineHeight: '1.5' }}>
              <span style={{ color, marginRight: '8px', fontSize: '1.2em', lineHeight: '1' }}>•</span>
              <span style={{ flex: 1 }}>{item.replace(/^[-\\*]\s*/, '').replace(/\*+$/, '').trim()}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // If there are no structured points at all, just render text nicely
  if (!pros.length && !cons.length && !okok.length && (!summaryList || !summaryList.length)) {
    return (
      <div style={{ fontSize: '0.82rem', color: 'var(--gray-700)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
        {summaryText || (typeof text === 'string' ? text : JSON.stringify(text, null, 2))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {summaryText && (
        <div style={{ fontSize: '0.82rem', color: 'var(--gray-700)', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
          {summaryText}
        </div>
      )}
      
      {summaryList && summaryList.length > 0 && (
        <BulletList items={summaryList} color="#6366f1" />
      )}
      
      <BulletList title="Pros / Strengths" items={pros} color="#10b981" />
      <BulletList title="Neutral points" items={okok} color="#f59e0b" />
      <BulletList title="Cons / Weaknesses" items={cons} color="#ef4444" />
    </div>
  );
}
