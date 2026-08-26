import React, { useState } from 'react';

export default function ScientificDiagramRenderer({ configuration = {} }) {
  const {
    diagramId = 'human-heart',
    title = 'Scientific Diagram',
    highlightParts = [],
    explanation = ''
  } = configuration;

  const [hoveredPart, setHoveredPart] = useState(null);

  const renderHeart = () => (
    <svg viewBox="0 0 400 400" className="w-full h-full max-h-[360px]">
      {/* Background card grid */}
      <rect width="400" height="400" rx="20" fill="#0c0a09" stroke="#292524" strokeWidth="1" />
      <circle cx="200" cy="200" r="160" fill="none" stroke="#292524" strokeWidth="0.5" strokeDasharray="4 4" />

      {/* Vena Cava */}
      <path 
        d="M 120,80 L 120,320 L 145,320 L 145,80 Z" 
        fill={hoveredPart === 'Vena Cava' ? '#3b82f6' : '#2563eb'} 
        stroke="#1d4ed8" 
        strokeWidth="1.5"
        className="cursor-pointer transition-all hover:opacity-90"
        onMouseEnter={() => setHoveredPart('Vena Cava')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Pulmonary Artery */}
      <path 
        d="M 140,160 L 260,110 L 270,130 L 155,180 Z" 
        fill={hoveredPart === 'Pulmonary Artery' ? '#60a5fa' : '#3b82f6'} 
        stroke="#2563eb" 
        strokeWidth="1.5"
        className="cursor-pointer transition-all hover:opacity-90"
        onMouseEnter={() => setHoveredPart('Pulmonary Artery')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Aorta Arch */}
      <path 
        d="M 160,180 C 160,80 280,80 280,180" 
        fill="none" 
        stroke={hoveredPart === 'Aorta' ? '#f43f5e' : '#e11d48'} 
        strokeWidth="28" 
        strokeLinecap="round"
        className="cursor-pointer transition-all hover:opacity-95"
        onMouseEnter={() => setHoveredPart('Aorta')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Heart Main Body (Left & Right Ventricle Shape) */}
      <path 
        d="M 140,170 C 100,240 180,360 200,380 C 220,360 300,240 260,170 C 200,210 200,210 140,170 Z" 
        fill="#b91c1c" 
        stroke="#991b1b" 
        strokeWidth="2" 
      />

      {/* Right Ventricle (Left side of drawing) */}
      <path 
        d="M 140,170 C 100,240 180,360 200,380 C 190,320 185,250 200,195 C 170,190 150,180 140,170 Z" 
        fill={hoveredPart === 'Right Ventricle' ? '#ef4444' : '#dc2626'} 
        stroke="#b91c1c" 
        strokeWidth="1"
        className="cursor-pointer transition-all hover:opacity-90"
        onMouseEnter={() => setHoveredPart('Right Ventricle')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Left Ventricle (Right side of drawing) */}
      <path 
        d="M 200,380 C 220,360 300,240 260,170 C 230,190 215,200 200,195 C 185,250 190,320 200,380 Z" 
        fill={hoveredPart === 'Left Ventricle' ? '#991b1b' : '#7f1d1d'} 
        stroke="#991b1b" 
        strokeWidth="1"
        className="cursor-pointer transition-all hover:opacity-90"
        onMouseEnter={() => setHoveredPart('Left Ventricle')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Left Atrium */}
      <circle 
        cx="250" 
        cy="160" 
        r="28" 
        fill={hoveredPart === 'Left Atrium' ? '#b91c1c' : '#991b1b'} 
        stroke="#7f1d1d" 
        strokeWidth="1.5"
        className="cursor-pointer transition-all hover:opacity-90"
        onMouseEnter={() => setHoveredPart('Left Atrium')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Right Atrium */}
      <circle 
        cx="150" 
        cy="160" 
        r="28" 
        fill={hoveredPart === 'Right Atrium' ? '#ef4444' : '#dc2626'} 
        stroke="#b91c1c" 
        strokeWidth="1.5"
        className="cursor-pointer transition-all hover:opacity-90"
        onMouseEnter={() => setHoveredPart('Right Atrium')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Labels with pointers */}
      {/* Aorta Label */}
      <line x1="220" y1="90" x2="310" y2="60" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="220" cy="90" r="3" fill="#ef4444" />
      <text x="315" y="63" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="start">Aorta</text>

      {/* Vena Cava Label */}
      <line x1="130" y1="120" x2="60" y2="100" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="130" cy="120" r="3" fill="#ef4444" />
      <text x="55" y="103" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="end">Vena Cava</text>

      {/* Right Atrium Label */}
      <line x1="140" y1="160" x2="50" y2="170" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="140" cy="160" r="3" fill="#ef4444" />
      <text x="45" y="173" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="end">Right Atrium</text>

      {/* Left Atrium Label */}
      <line x1="260" y1="160" x2="340" y2="170" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="260" cy="160" r="3" fill="#ef4444" />
      <text x="345" y="173" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="start">Left Atrium</text>

      {/* Left Ventricle Label */}
      <line x1="230" y1="260" x2="330" y2="280" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="230" cy="260" r="3" fill="#ef4444" />
      <text x="335" y="283" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="start">Left Ventricle</text>
    </svg>
  );

  const renderPlantCell = () => (
    <svg viewBox="0 0 400 400" className="w-full h-full max-h-[360px]">
      <rect width="400" height="400" rx="20" fill="#060504" stroke="#1c1917" strokeWidth="1" />
      
      {/* Outer Cell Wall */}
      <polygon 
        points="100,50 300,50 370,200 300,350 100,350 30,200" 
        fill="#064e3b" 
        stroke="#10b981" 
        strokeWidth="8" 
      />

      {/* Inner Cell Membrane */}
      <polygon 
        points="104,56 296,56 362,200 296,344 104,344 38,200" 
        fill="#022c22" 
        stroke="#34d399" 
        strokeWidth="2" 
      />

      {/* Large Central Vacuole */}
      <path 
        d="M 120,120 C 120,100 240,100 240,160 C 240,220 220,280 160,280 C 100,280 120,200 120,120 Z" 
        fill={hoveredPart === 'Vacuole' ? '#60a5fa' : '#1e3a8a'} 
        stroke="#3b82f6" 
        strokeWidth="1.5"
        className="cursor-pointer transition-all hover:opacity-90"
        onMouseEnter={() => setHoveredPart('Vacuole')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Nucleus */}
      <circle 
        cx="280" 
        cy="250" 
        r="32" 
        fill={hoveredPart === 'Nucleus' ? '#db2777' : '#9d174d'} 
        stroke="#f472b6" 
        strokeWidth="1.5"
        className="cursor-pointer transition-all hover:opacity-90"
        onMouseEnter={() => setHoveredPart('Nucleus')}
        onMouseLeave={() => setHoveredPart(null)}
      />
      <circle cx="270" cy="245" r="10" fill="#4d0426" />

      {/* Chloroplasts */}
      <ellipse 
        cx="90" 
        cy="130" 
        rx="22" 
        ry="12" 
        fill={hoveredPart === 'Chloroplast' ? '#10b981' : '#047857'} 
        stroke="#059669" 
        className="cursor-pointer transition-all"
        onMouseEnter={() => setHoveredPart('Chloroplast')}
        onMouseLeave={() => setHoveredPart(null)}
      />
      <ellipse 
        cx="310" 
        cy="120" 
        rx="22" 
        ry="12" 
        fill={hoveredPart === 'Chloroplast' ? '#10b981' : '#047857'} 
        stroke="#059669" 
        className="cursor-pointer transition-all"
        onMouseEnter={() => setHoveredPart('Chloroplast')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Labels */}
      <line x1="280" y1="250" x2="360" y2="280" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <text x="365" y="283" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="start">Nucleus</text>

      <line x1="180" y1="180" x2="250" y2="380" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <text x="250" y="392" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="middle">Central Vacuole</text>

      <line x1="90" y1="130" x2="30" y2="100" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <text x="25" y="103" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="end">Chloroplast</text>

      <line x1="104" y1="56" x2="160" y2="20" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />
      <text x="160" y="15" fill="#f3f4f6" fontSize="9" fontWeight="bold" textAnchor="middle">Cell Wall</text>
    </svg>
  );

  const renderCircuit = () => (
    <svg viewBox="0 0 400 400" className="w-full h-full max-h-[360px]">
      <rect width="400" height="400" rx="20" fill="#09090b" stroke="#27272a" strokeWidth="1" />
      
      {/* Wire Path rectangle */}
      <rect x="80" y="100" width="240" height="200" fill="none" stroke="#52525b" strokeWidth="3" />

      {/* Battery Component */}
      <g transform="translate(200, 100)" className="cursor-pointer" onMouseEnter={() => setHoveredPart('Battery')} onMouseLeave={() => setHoveredPart(null)}>
        <rect x="-30" y="-20" width="60" height="40" fill="#18181b" />
        <line x1="-10" y1="-25" x2="-10" y2="25" stroke={hoveredPart === 'Battery' ? '#eab308' : '#e5e7eb'} strokeWidth="5" />
        <line x1="10" y1="-12" x2="10" y2="12" stroke={hoveredPart === 'Battery' ? '#eab308' : '#e5e7eb'} strokeWidth="2" />
        <text x="-22" y="-12" fill="#22c55e" fontSize="10" fontWeight="bold">+</text>
        <text x="18" y="-12" fill="#ef4444" fontSize="10" fontWeight="bold">-</text>
      </g>

      {/* Light Bulb Component */}
      <g transform="translate(200, 300)" className="cursor-pointer" onMouseEnter={() => setHoveredPart('Light Bulb')} onMouseLeave={() => setHoveredPart(null)}>
        <circle cx="0" cy="0" r="22" fill={hoveredPart === 'Light Bulb' ? '#fef08a' : '#27272a'} stroke="#e5e7eb" strokeWidth="2.5" />
        {/* Filament */}
        <path d="M -8,8 C -8,-8 8,-8 8,8" fill="none" stroke="#e11d48" strokeWidth="2" />
        <line x1="-12" y1="12" x2="12" y2="12" stroke="#e5e7eb" strokeWidth="2.5" />
      </g>

      {/* Resistor zig zag */}
      <g transform="translate(80, 200) rotate(90)" className="cursor-pointer" onMouseEnter={() => setHoveredPart('Resistor')} onMouseLeave={() => setHoveredPart(null)}>
        <rect x="-25" y="-10" width="50" height="20" fill="#18181b" />
        <path d="M -25,0 L -15,8 L -5,-8 L 5,8 L 15,-8 L 25,0" fill="none" stroke={hoveredPart === 'Resistor' ? '#f97316' : '#d4d4d8'} strokeWidth="2.5" />
      </g>

      {/* Switch open */}
      <g transform="translate(320, 200)" className="cursor-pointer" onMouseEnter={() => setHoveredPart('Switch')} onMouseLeave={() => setHoveredPart(null)}>
        <circle cx="0" cy="-15" r="4" fill="#e5e7eb" />
        <circle cx="0" cy="15" r="4" fill="#e5e7eb" />
        <line x1="0" y1="15" x2="-18" y2="-10" stroke={hoveredPart === 'Switch' ? '#3b82f6' : '#e5e7eb'} strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Current flow arrows */}
      <path d="M 120,100 L 130,95 L 130,105 Z" fill="#22c55e" />
      <path d="M 280,100 L 290,95 L 290,105 Z" fill="#22c55e" />

      {/* Labels */}
      <text x="200" y="65" fill="#f3f4f6" fontSize="10" fontWeight="bold" textAnchor="middle">Battery (Voltage Source)</text>
      <text x="200" y="342" fill="#f3f4f6" fontSize="10" fontWeight="bold" textAnchor="middle">Light Bulb (Load)</text>
      <text x="35" y="203" fill="#f3f4f6" fontSize="10" fontWeight="bold" textAnchor="end">Resistor (R)</text>
      <text x="345" y="203" fill="#f3f4f6" fontSize="10" fontWeight="bold" textAnchor="start">Switch (Open)</text>
    </svg>
  );

  const getActiveDiagram = () => {
    switch (diagramId.toLowerCase()) {
      case 'plant-cell':
        return renderPlantCell();
      case 'electric-circuit':
      case 'circuit':
        return renderCircuit();
      case 'human-heart':
      case 'heart':
      default:
        return renderHeart();
    }
  };

  return (
    <div className="w-full h-full min-h-[380px] p-5 flex flex-col bg-neutral-900 border border-neutral-750/30 rounded-3xl overflow-hidden shadow-2xl justify-between">
      <div className="mb-4 select-none">
        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest">{title}</h4>
        {hoveredPart && (
          <p className="text-[10px] text-emerald-450 uppercase font-black tracking-widest animate-pulse mt-0.5">
            Active Focus: {hoveredPart}
          </p>
        )}
      </div>

      <div className="flex-1 w-full flex items-center justify-center p-2 bg-neutral-950/40 rounded-2xl border border-neutral-800/30">
        {getActiveDiagram()}
      </div>

      {explanation && (
        <div className="mt-4 text-[10px] text-neutral-400 font-medium leading-relaxed max-w-[95%]">
          {explanation}
        </div>
      )}
    </div>
  );
}
