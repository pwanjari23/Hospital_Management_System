import React from 'react';

export default function DocumentFooter({ branding, generatedAt, doctorName, showSignature = true }) {
  const footerText = branding?.footerText || 'This is a computer-generated medical record.';
  const hospitalName = branding?.hospitalName || 'SSSH Hospital';

  return (
    <div className="mt-12 pt-6 border-t border-slate-200">
      <div className="flex items-end justify-between gap-6 mb-6">
        <div className="text-xs text-slate-500 max-w-md">
          <p className="font-medium text-slate-700">{footerText}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Generated on: {generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()} &bull; {hospitalName}
          </p>
        </div>

        {showSignature && (
          <div className="text-center w-52">
            <div className="border-b border-slate-400 h-12 mb-1.5" />
            <p className="text-xs font-semibold text-slate-800">{doctorName || 'Authorized Signatory'}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Signature & Stamp</p>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-400 font-mono">
        &bull; Confidential Medical Document &bull; Strictly Authorized Use Only &bull;
      </div>
    </div>
  );
}
