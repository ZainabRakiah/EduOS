import React from 'react';

export default function TableRenderer({ configuration = {} }) {
  const { title = 'Comparison Table', headers = [], rows = [] } = configuration;

  if (!Array.isArray(headers) || headers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl min-h-[300px]">
        <p className="text-xs text-neutral-450 font-bold uppercase tracking-wider">No comparison data provided.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[380px] p-5 flex flex-col bg-neutral-900 border border-neutral-750/30 rounded-3xl overflow-hidden shadow-2xl justify-between text-left">
      <div className="mb-4 select-none">
        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest">{title}</h4>
      </div>

      <div className="flex-1 overflow-x-auto w-full border border-neutral-800/80 rounded-2xl bg-neutral-950/20 shadow-inner">
        <table className="w-full text-left border-collapse min-w-[420px]">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800/80 select-none">
              {headers.map((h, i) => (
                <th key={i} className="px-4.5 py-3 text-[10px] font-black text-neutral-300 uppercase tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-850">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-neutral-900/60 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4.5 py-3 text-xs font-semibold text-neutral-200 leading-relaxed">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
