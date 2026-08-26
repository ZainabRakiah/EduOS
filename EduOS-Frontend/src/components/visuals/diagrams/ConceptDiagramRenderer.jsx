import React from 'react';

export default function ConceptDiagramRenderer({ configuration = {} }) {
  const { title = 'Concept Map', nodes = [], edges = [] } = configuration;

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl min-h-[300px]">
        <p className="text-xs text-neutral-450 font-bold uppercase tracking-wider">No concept mapping layout provided.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[380px] p-5 flex flex-col bg-neutral-900 border border-neutral-750/30 rounded-3xl overflow-hidden shadow-2xl justify-between text-left">
      <div className="mb-4 select-none">
        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest">{title}</h4>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center gap-6 p-6 bg-neutral-950/40 rounded-2xl border border-neutral-800/30">
        <div className="flex flex-wrap gap-4 items-center justify-center">
          {nodes.map((n, i) => (
            <React.Fragment key={n.id}>
              {i > 0 && (
                <span className="text-neutral-500 font-bold text-xs select-none">→</span>
              )}
              <div className="px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-150 shadow-md">
                {n.label}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
