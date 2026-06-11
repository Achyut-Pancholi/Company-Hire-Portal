"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import Image from 'next/image';

export default function SharedResumePage() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCandidate() {
      try {
        const res = await fetch(`/api/candidates?id=${id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch candidate');
        }
        const data = await res.json();
        setCandidate({
          ...data,
          jobApplied: data.job_applied,
          extractedData: data.extracted_data
        });
      } catch (err) {
        setError('Could not load candidate profile. It may have been deleted.');
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchCandidate();
    }
  }, [id]);

  const handlePrint = async () => {
    if (printRef.current && candidate) {
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const opt = {
          margin: [10, 0, 10, 0],
          filename: `${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`,
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading candidate profile...</div>;
  }

  if (error || !candidate) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }

  const extractedData = candidate.extractedData || {};
  const skills = candidate.skills ? candidate.skills.join(', ') : '';
  const expTotal = extractedData?.totalExperienceAnalysis?.totalExperience || 'N/A';
  const expDomain = extractedData?.totalExperienceAnalysis?.domainExperience || '0';
  const expLeadership = extractedData?.totalExperienceAnalysis?.leadershipExperience || '0';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Print Hide Block */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Standardized Candidate Profile</h2>
          <p className="text-slate-500 text-sm">Read-only view • Single Column Format</p>
        </div>
        <button 
          onClick={handlePrint} 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Printer size={18} /> Download Resume
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .shadow-xl { box-shadow: none !important; }
          .min-h-screen { min-height: auto !important; padding: 0 !important; }
        }
      `}} />

      {/* Main Resume Paper */}
      <div ref={printRef} className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200">
        <div className="p-10 lg:p-14 text-slate-800">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b-[3px] border-slate-900 pb-6 mb-10">
            <div className="flex-1">
              <h1 className="text-[2.5rem] font-black text-slate-900 m-0 leading-tight tracking-tight">
                {candidate.name.toUpperCase()}
              </h1>
              <p className="text-xl font-medium text-slate-600 mt-2 tracking-wide">
                {candidate.jobApplied} Professional
              </p>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 tracking-wider">
                ElastiCrew
              </div>
            </div>
          </div>

          {/* Notice */}
          <div className="p-3 bg-blue-50 border-l-4 border-blue-500 text-slate-500 text-sm mb-10 rounded-r-md">
            <strong>Note:</strong> Contact details (Email, Phone) have been hidden for unbiased review.
          </div>

          <div className="flex flex-col gap-10">
            
            {/* Experience Summary */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-5">
                Experience Overview
              </h2>
              <div className="flex gap-8 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[0.85rem] font-semibold uppercase">Total Experience</span>
                  <span className="text-lg font-semibold text-slate-900">{expTotal}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[0.85rem] font-semibold uppercase">Domain Experience</span>
                  <span className="text-lg font-semibold text-slate-900">{expDomain} years</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[0.85rem] font-semibold uppercase">Leadership</span>
                  <span className="text-lg font-semibold text-slate-900">{expLeadership}</span>
                </div>
              </div>
            </section>

            {/* Core Competencies */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-5">
                Core Competencies
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.split(',').filter(Boolean).map((skill: string, i: number) => (
                  <span key={i} className="bg-slate-100 text-slate-700 border border-slate-200 px-4 py-1.5 rounded-full text-sm font-medium">
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </section>

            {/* Project Highlights */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-6">
                Project Highlights & Experience
              </h2>
              <div className="flex flex-col gap-8">
                {extractedData?.projectAnalysis && extractedData.projectAnalysis.length > 0 ? (
                  extractedData.projectAnalysis.map((proj: any, i: number) => (
                    <div key={i} className="print-avoid flex flex-col gap-2">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-lg text-slate-900 m-0">
                          {proj.projectName || 'Unnamed Project'}
                        </h3>
                        {proj.duration && <span className="text-slate-500 text-sm font-medium">{proj.duration}</span>}
                      </div>
                      
                      {proj.role && (
                        <div className="text-slate-700 font-semibold text-[0.95rem]">Role: {proj.role}</div>
                      )}

                      <p className="text-[0.95rem] text-slate-600 leading-relaxed my-1">
                        {proj.projectDescription || 'No description provided.'}
                      </p>

                      {proj.responsibilities && proj.responsibilities.length > 0 && (
                        <ul className="list-disc pl-5 my-1 text-slate-600 text-[0.95rem] leading-relaxed space-y-1">
                          {proj.responsibilities.map((resp: string, rIdx: number) => (
                            <li key={rIdx}>{resp}</li>
                          ))}
                        </ul>
                      )}

                      {(proj.techStack && proj.techStack.length > 0) || (proj.technologiesUsed && proj.technologiesUsed.length > 0) ? (
                        <div className="mt-2 text-sm text-slate-500">
                          <strong className="text-slate-700">Technologies: </strong> 
                          {(proj.techStack || proj.technologiesUsed).join(', ')}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="italic text-slate-400 text-[0.95rem]">No project history available.</p>
                )}
              </div>
            </section>

            {/* Education */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-5">
                Education
              </h2>
              <div className="flex flex-col gap-5">
                {extractedData?.educationDetails && extractedData.educationDetails.length > 0 ? (
                  extractedData.educationDetails.map((edu: any, i: number) => (
                    <div key={i} className="print-avoid flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-[1.05rem] text-slate-900 m-0 mb-1">
                          {edu.degree || 'Degree details N/A'}
                        </h4>
                        <div className="text-[0.95rem] text-slate-600 font-medium">
                          {edu.college || 'Institution N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.9rem] text-slate-900 font-semibold">
                          {edu.passingYear ? `Class of ${edu.passingYear}` : ''}
                        </div>
                        <div className="text-[0.85rem] text-slate-500 mt-0.5">
                          {edu.cgpaOrPercentage ? `Grade: ${edu.cgpaOrPercentage}` : ''}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="italic text-slate-400 text-[0.95rem]">No education records available.</p>
                )}
              </div>
            </section>

          </div>
          
          {/* Footer */}
          <div className="mt-16 p-6 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center text-slate-500 text-sm">
            This resume was standardized and automatically generated via the ElastiCrew Interview Platform. <br/>
            Original contact details have been omitted to promote unbiased, skills-first evaluation.
          </div>

        </div>
      </div>
    </div>
  );
}
