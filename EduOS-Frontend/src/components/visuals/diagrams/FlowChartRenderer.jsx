import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true
  }
});

export default function FlowChartRenderer({ configuration = {} }) {
  const { title = 'Flowchart', nodes = [], edges = [] } = configuration;
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(nodes) || nodes.length === 0) return;

    // Compile node edges structure to Mermaid script
    let code = 'graph TD\n';
    nodes.forEach(node => {
      const cleanLabel = (node.label || '').replace(/"/g, '\\"');
      code += `  n_${node.id}["${cleanLabel}"]\n`;
    });
    edges.forEach(edge => {
      if (Array.isArray(edge) && edge.length >= 2) {
        code += `  n_${edge[0]} --> n_${edge[1]}\n`;
      }
    });

    const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
    setError(null);

    try {
      mermaid.render(uniqueId, code)
        .then(({ svg }) => {
          setSvgHtml(svg);
        })
        .catch(err => {
          console.error('Mermaid render error:', err);
          setError('Failed to render flowchart structure.');
        });
    } catch (e) {
      setError('Invalid flowchart layout configuration.');
    }
  }, [nodes, edges]);

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl min-h-[300px]">
        <p className="text-xs text-neutral-450 font-bold uppercase tracking-wider">No flowchart structure provided.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[380px] p-5 flex flex-col bg-neutral-900 border border-neutral-750/30 rounded-3xl overflow-hidden shadow-2xl justify-between">
      <div className="mb-4 select-none">
        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest">{title}</h4>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-red-400 text-xs font-bold bg-neutral-950/40 rounded-2xl border border-neutral-800/30 p-4">
          {error}
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="flex-1 w-full bg-neutral-950/40 border border-neutral-800/30 rounded-2xl p-4 overflow-auto flex items-center justify-center min-h-[280px] select-none"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      )}
    </div>
  );
}
