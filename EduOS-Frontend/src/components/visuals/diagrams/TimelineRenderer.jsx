import React from 'react';

export default function TimelineRenderer({ configuration = {} }) {
  const { title = 'Historical Timeline', events = [] } = configuration;

  if (!Array.isArray(events) || events.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl min-h-[300px]">
        <p className="text-xs text-neutral-450 font-bold uppercase tracking-wider">No timeline events provided.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[380px] p-5 flex flex-col bg-neutral-900 border border-neutral-750/30 rounded-3xl overflow-hidden shadow-2xl justify-between text-left">
      <div className="mb-6 select-none">
        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest">{title}</h4>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[340px] pr-2 space-y-6 relative border-l-2 border-neutral-800 pl-6 ml-2">
        {events.map((event, idx) => (
          <div key={idx} className="relative group">
            {/* Dot marker */}
            <span className="absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full bg-neutral-900 border-2 border-brand-500 group-hover:bg-brand-500 transition-colors flex items-center justify-center shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>

            {/* Event Details Card */}
            <div className="p-4 rounded-2xl bg-neutral-950/40 border border-neutral-800/60 shadow-sm/5 group-hover:border-neutral-750 transition-all hover:bg-neutral-950/70">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black bg-brand-500/10 text-brand-450 border border-brand-500/20 uppercase tracking-wider">
                {event.year}
              </span>
              <h5 className="text-xs font-black text-neutral-100 mt-2 tracking-wide">{event.title}</h5>
              <p className="text-[10px] text-neutral-400 font-medium leading-relaxed mt-1">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
