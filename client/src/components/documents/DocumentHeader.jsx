import React from 'react';

export default function DocumentHeader({ branding, title, documentNumber, documentDate }) {
  const hospitalName = branding?.hospitalName || 'SSSH Hospital';
  const tagline = branding?.tagline || '';
  const address = branding?.address || '';
  const city = branding?.city || '';
  const state = branding?.state || '';
  const postalCode = branding?.postalCode || '';
  const phone = branding?.phone || '';
  const email = branding?.email || '';
  const regNumber = branding?.regNumber || '';
  const logoUrl = branding?.logoUrl || '';

  const fullAddress = [address, city, state, postalCode].filter(Boolean).join(', ');

  return (
    <div className="border-b-2 border-slate-800 pb-4 mb-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={hospitalName}
              className="w-16 h-16 object-contain rounded-lg border border-slate-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shrink-0">
              {hospitalName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {hospitalName}
            </h1>
            {tagline && <p className="text-xs font-medium text-slate-500 italic">{tagline}</p>}
            {fullAddress && <p className="text-xs text-slate-600 mt-0.5">{fullAddress}</p>}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
              {phone && <span>Tel: {phone}</span>}
              {email && <span>Email: {email}</span>}
              {regNumber && <span>Reg: {regNumber}</span>}
            </div>
          </div>
        </div>

        {/* Document Title & Number Badge */}
        <div className="text-right shrink-0">
          <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
            {title}
          </div>
          {documentNumber && (
            <div className="text-sm font-bold font-mono text-slate-800 mt-1">
              #{documentNumber}
            </div>
          )}
          {documentDate && (
            <div className="text-xs text-slate-500 mt-0.5">
              Date: {new Date(documentDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
