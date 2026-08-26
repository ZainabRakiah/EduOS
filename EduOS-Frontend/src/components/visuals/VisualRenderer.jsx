import React, { useMemo } from 'react';
import IndiaMap from './maps/IndiaMap';
import FlowChartRenderer from './diagrams/FlowChartRenderer';
import ChartRenderer from './charts/ChartRenderer';
import ScientificDiagramRenderer from './diagrams/ScientificDiagramRenderer';
import ConceptDiagramRenderer from './diagrams/ConceptDiagramRenderer';
import TimelineRenderer from './diagrams/TimelineRenderer';
import TableRenderer from './diagrams/TableRenderer';
import ImageRenderer from './diagrams/ImageRenderer';

export default function VisualRenderer({ visualData = {}, onRetry, onSimplify }) {
  const { type = '', title = '', explanation = '' } = visualData;

  // Validate AI response payload schemas
  const validation = useMemo(() => {
    if (!type) return { valid: false, error: 'visual type is missing.' };

    switch (type.toUpperCase()) {
      case 'MAP':
        if (visualData.mapId !== 'india-states') {
          return { valid: false, error: 'Only india-states maps are supported.' };
        }
        return { valid: true };

      case 'FLOWCHART':
        if (!Array.isArray(visualData.nodes) || visualData.nodes.length === 0) {
          return { valid: false, error: 'Flowchart contains no nodes.' };
        }
        return { valid: true };

      case 'CHART':
        if (!Array.isArray(visualData.data) || visualData.data.length === 0) {
          return { valid: false, error: 'Chart data list is empty.' };
        }
        return { valid: true };

      case 'TIMELINE':
        if (!Array.isArray(visualData.events) || visualData.events.length === 0) {
          return { valid: false, error: 'Timeline contains no event coordinates.' };
        }
        return { valid: true };

      case 'TABLE':
        if (!Array.isArray(visualData.headers) || visualData.headers.length === 0) {
          return { valid: false, error: 'Table contains no column headers.' };
        }
        return { valid: true };

      case 'SCIENTIFIC_DIAGRAM':
        if (!visualData.diagramId) {
          return { valid: false, error: 'Scientific diagram ID is missing.' };
        }
        return { valid: true };

      case 'CONCEPT_DIAGRAM':
        if (!Array.isArray(visualData.nodes) || visualData.nodes.length === 0) {
          return { valid: false, error: 'Concept nodes list is empty.' };
        }
        return { valid: true };

      case 'IMAGE':
        if (!visualData.image) {
          return { valid: false, error: 'Image generation data is missing.' };
        }
        return { valid: true };

      default:
        return { valid: false, error: `Visual type "${type}" is unsupported.` };
    }
  }, [type, visualData]);

  if (!validation.valid) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center min-h-[350px] space-y-4">
        <div className="inline-flex h-12 w-12 rounded-full bg-red-950/40 text-red-500 items-center justify-center border border-red-800/40">
          ⚠️
        </div>
        <div>
          <h4 className="text-sm font-black text-neutral-100 uppercase tracking-wider">EduOS couldn't create this visual accurately</h4>
          <p className="text-[10px] text-neutral-450 mt-1 max-w-sm uppercase font-bold tracking-wider leading-relaxed">
            Validation failed: {validation.error}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Try Again
          </button>
          <button
            onClick={onSimplify}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-750 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Simplify Diagram
          </button>
        </div>
      </div>
    );
  }

  // Dispatch payloads to designated sub-renderers
  switch (type.toUpperCase()) {
    case 'MAP':
      return <IndiaMap configuration={visualData} />;
    case 'FLOWCHART':
      return <FlowChartRenderer configuration={visualData} />;
    case 'CHART':
      return <ChartRenderer configuration={visualData} />;
    case 'SCIENTIFIC_DIAGRAM':
      return <ScientificDiagramRenderer configuration={visualData} />;
    case 'CONCEPT_DIAGRAM':
      return <ConceptDiagramRenderer configuration={visualData} />;
    case 'TIMELINE':
      return <TimelineRenderer configuration={visualData} />;
    case 'TABLE':
      return <TableRenderer configuration={visualData} />;
    case 'IMAGE':
      return <ImageRenderer configuration={visualData} />;
    default:
      return null;
  }
}
