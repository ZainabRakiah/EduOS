import React, { useState, useMemo, useRef } from 'react';
import geojsonData from '../../../assets/maps/india-states.json';

const INDIAN_CAPITALS = [
  { name: "New Delhi", state: "Delhi", lng: 77.2090, lat: 28.6139 },
  { name: "Mumbai", state: "Maharashtra", lng: 72.8777, lat: 19.0760 },
  { name: "Kolkata", state: "West Bengal", lng: 88.3639, lat: 22.5726 },
  { name: "Chennai", state: "Tamil Nadu", lng: 80.2707, lat: 13.0827 },
  { name: "Bengaluru", state: "Karnataka", lng: 77.5946, lat: 12.9716 },
  { name: "Hyderabad", state: "Telangana", lng: 78.4867, lat: 17.3850 },
  { name: "Patna", state: "Bihar", lng: 85.1376, lat: 25.5941 },
  { name: "Lucknow", state: "Uttar Pradesh", lng: 80.9462, lat: 26.8467 },
  { name: "Jaipur", state: "Rajasthan", lng: 75.7873, lat: 26.9124 },
  { name: "Bhopal", state: "Madhya Pradesh", lng: 77.4126, lat: 23.2599 },
  { name: "Gandhinagar", state: "Gujarat", lng: 72.6369, lat: 23.2156 },
  { name: "Ranchi", state: "Jharkhand", lng: 85.3090, lat: 23.3441 },
  { name: "Bhubaneswar", state: "Odisha", lng: 85.8245, lat: 20.2961 },
  { name: "Dispur", state: "Assam", lng: 91.7898, lat: 26.1433 },
  { name: "Shimla", state: "Himachal Pradesh", lng: 77.1734, lat: 31.1048 },
  { name: "Srinagar", state: "Jammu & Kashmir", lng: 74.7973, lat: 34.0837 },
  { name: "Dehradun", state: "Uttarakhand", lng: 78.0322, lat: 30.3165 },
  { name: "Chandigarh", state: "Punjab", lng: 76.7794, lat: 30.7333 },
  { name: "Thiruvananthapuram", state: "Kerala", lng: 76.9366, lat: 8.5241 },
  { name: "Panaji", state: "Goa", lng: 73.8278, lat: 15.4909 },
  { name: "Raipur", state: "Chhattisgarh", lng: 81.6296, lat: 21.2514 },
  { name: "Imphal", state: "Manipur", lng: 93.9368, lat: 24.8170 },
  { name: "Shillong", state: "Meghalaya", lng: 91.8833, lat: 25.5788 },
  { name: "Aizawl", state: "Mizoram", lng: 92.7176, lat: 23.7307 },
  { name: "Kohima", state: "Nagaland", lng: 94.1086, lat: 25.6751 },
  { name: "Gangtok", state: "Sikkim", lng: 88.6138, lat: 27.3314 },
  { name: "Agartala", state: "Tripura", lng: 91.2868, lat: 23.8315 },
  { name: "Itanagar", state: "Arunachal Pradesh", lng: 93.6053, lat: 27.0844 },
  { name: "Amaravati", state: "Andhra Pradesh", lng: 80.4546, lat: 16.5747 }
];

export default function IndiaMap({ configuration = {} }) {
  const {
    highlightStates = [],
    showLabels = true,
    showBoundaries = true,
    showCapitals = false
  } = configuration;

  // Zoom / Pan states
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Interaction states
  const [hoveredState, setHoveredState] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);

  // Validate GeoJSON structure
  const isValidGeoJson = useMemo(() => {
    if (!geojsonData || geojsonData.type !== 'FeatureCollection') return false;
    if (!Array.isArray(geojsonData.features) || geojsonData.features.length === 0) return false;
    return true;
  }, []);

  // Compute bounding box from coordinates
  const bounds = useMemo(() => {
    if (!isValidGeoJson) return null;
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

    const scan = (coords) => {
      coords.forEach(pt => {
        if (Array.isArray(pt[0])) {
          scan(pt);
        } else {
          const [lng, lat] = pt;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      });
    };

    geojsonData.features.forEach(f => {
      if (f.geometry && f.geometry.coordinates) {
        scan(f.geometry.coordinates);
      }
    });

    return { minLng, maxLng, minLat, maxLat };
  }, [isValidGeoJson]);

  // SVG dimensions
  const width = 600;
  const height = 550;
  const padding = 30;

  // Linear projection helper
  const project = useMemo(() => {
    if (!bounds) return () => [0, 0];
    const { minLng, maxLng, minLat, maxLat } = bounds;
    const lngRange = maxLng - minLng;
    const latRange = maxLat - minLat;

    const scale = Math.min((width - 2 * padding) / lngRange, (height - 2 * padding) / latRange);
    const xOffset = (width - lngRange * scale) / 2;
    const yOffset = (height - latRange * scale) / 2;

    return (lng, lat) => {
      const x = xOffset + (lng - minLng) * scale;
      const y = height - (yOffset + (lat - minLat) * scale); // invert latitude axis
      return [x, y];
    };
  }, [bounds]);

  // Compute centroid of features
  const centroids = useMemo(() => {
    if (!isValidGeoJson) return {};
    const result = {};

    geojsonData.features.forEach(f => {
      const name = f.properties?.ST_NM;
      if (!name) return;

      let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

      const scan = (coords) => {
        coords.forEach(pt => {
          if (Array.isArray(pt[0])) {
            scan(pt);
          } else {
            const [lng, lat] = pt;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        });
      };

      if (f.geometry && f.geometry.coordinates) {
        scan(f.geometry.coordinates);
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;
        result[name] = project(centerLng, centerLat);
      }
    });

    return result;
  }, [isValidGeoJson, project]);

  // Pre-generate map path strings
  const mapPaths = useMemo(() => {
    if (!isValidGeoJson) return [];

    return geojsonData.features.map((feature, idx) => {
      const name = feature.properties?.ST_NM || `State-${idx}`;
      const geometry = feature.geometry;
      if (!geometry) return null;

      const projectPoint = (pt) => {
        const [x, y] = project(pt[0], pt[1]);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      };

      let d = '';
      if (geometry.type === 'Polygon') {
        d = geometry.coordinates
          .map(ring => 'M ' + ring.map(projectPoint).join(' L ') + ' Z')
          .join(' ');
      } else if (geometry.type === 'MultiPolygon') {
        d = geometry.coordinates
          .map(polygon => 
            polygon.map(ring => 'M ' + ring.map(projectPoint).join(' L ') + ' Z').join(' ')
          )
          .join(' ');
      }

      return { name, d, feature };
    }).filter(Boolean);
  }, [isValidGeoJson, project]);

  if (!isValidGeoJson) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-2xl text-center">
        <h4 className="text-sm font-bold text-red-750">India map data could not be loaded</h4>
        <p className="text-[11px] text-red-500 mt-1">GeoJSON file is missing or invalid.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Mouse drag handlers for panning
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    // Track tooltip position
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom control helpers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 6));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelectedState(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-neutral-900 border border-neutral-750/30 rounded-3xl overflow-hidden shadow-2xl">
      {/* Map Header details */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none select-none bg-neutral-900/80 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-neutral-800 shadow-md">
        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest flex items-center gap-1.5">
          🇮🇳 {configuration.title || "India"}
        </h4>
        <p className="text-[10px] text-neutral-400 mt-0.5 font-bold uppercase tracking-wider">
          {configuration.description || "Administrative Divisions Map"}
        </p>
      </div>

      {/* SVG Container */}
      <div 
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 w-full min-h-[420px] bg-neutral-950 flex items-center justify-center relative cursor-${isDragging ? 'grabbing' : 'grab'}`}
      >
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full max-h-[500px]"
        >
          {/* Compass rose symbol */}
          <g transform="translate(50, 480)" className="pointer-events-none opacity-80">
            <circle cx="0" cy="0" r="18" fill="#171717" stroke="#404040" strokeWidth="1" />
            <line x1="0" y1="-18" x2="0" y2="18" stroke="#737373" strokeWidth="1.5" />
            <line x1="-18" y1="0" x2="18" y2="0" stroke="#737373" strokeWidth="1.5" />
            <polygon points="0,-18 -4,-2 4,-2" fill="#ef4444" />
            <polygon points="0,18 -4,2 4,2" fill="#737373" />
            <text x="0" y="-22" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold">N</text>
          </g>

          {/* Group carrying translation and scaling transforms */}
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`} style={{ transformOrigin: 'center' }}>
            
            {/* Draw State outlines */}
            {mapPaths.map(({ name, d }) => {
              const normalizedName = name.toLowerCase();
              const isHighlighted = highlightStates.some(hs => hs.toLowerCase() === normalizedName);
              const isSelected = selectedState === name;
              const isHovered = hoveredState === name;

              // Color choices based on active highlight lists
              let fill = '#1f2937'; // default dark gray state fill
              if (highlightStates.length > 0) {
                fill = isHighlighted ? '#eab308' : '#111827'; // gold if highlighted, else midnight dark
              } else if (isSelected) {
                fill = '#3b82f6'; // bright blue if clicked
              } else if (isHovered) {
                fill = '#374151'; // warm gray on hover
              }

              return (
                <path
                  key={name}
                  d={d}
                  fill={fill}
                  stroke={showBoundaries ? '#4b5563' : 'none'}
                  strokeWidth={isHovered || isSelected ? 1.5 : 0.6}
                  className="transition-all duration-150 ease-out cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setHoveredState(name)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => setSelectedState(isSelected ? null : name)}
                />
              );
            })}

            {/* Render Capital Pin markers */}
            {showCapitals && INDIAN_CAPITALS.map((cap) => {
              const [cx, cy] = project(cap.lng, cap.lat);
              if (cx === 0 && cy === 0) return null;
              return (
                <g key={cap.name} className="pointer-events-none">
                  <circle cx={cx} cy={cy} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                  <circle cx={cx} cy={cy} r="8" fill="none" stroke="#ef4444" strokeWidth="1" className="animate-ping opacity-60" />
                  <text 
                    x={cx} 
                    y={cy - 6} 
                    textAnchor="middle" 
                    fill="#f3f4f6" 
                    fontSize="6" 
                    fontWeight="black" 
                    className="select-none bg-neutral-900"
                  >
                    {cap.name}
                  </text>
                </g>
              );
            })}

            {/* Render State labels */}
            {showLabels && Object.keys(centroids).map(stateName => {
              const coords = centroids[stateName];
              if (!coords) return null;
              const [lx, ly] = coords;

              const isHighlighted = highlightStates.some(hs => hs.toLowerCase() === stateName.toLowerCase());

              return (
                <text
                  key={stateName}
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  fill={isHighlighted ? '#111827' : '#9ca3af'}
                  fontSize="6.5"
                  fontWeight="bold"
                  className="select-none pointer-events-none transition-all"
                  style={{ textShadow: isHighlighted ? 'none' : '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {stateName}
                </text>
              );
            })}

          </g>
        </svg>

        {/* Floating HTML tooltip */}
        {hoveredState && (
          <div 
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
            className="absolute z-20 pointer-events-none bg-neutral-900/90 backdrop-blur-md px-3 py-2 border border-neutral-750 rounded-xl shadow-xl text-left"
          >
            <h5 className="text-[10px] font-black text-white uppercase tracking-widest">{hoveredState}</h5>
            <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">
              Capital: {INDIAN_CAPITALS.find(c => c.state === hoveredState)?.name || "UT HQ"}
            </p>
          </div>
        )}
      </div>

      {/* Floating Control buttons */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2.5 bg-neutral-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-800 shadow-md">
        <button
          onClick={handleZoomIn}
          className="h-8 w-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center transition-all text-sm font-black active:scale-95 cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="h-8 w-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center transition-all text-sm font-black active:scale-95 cursor-pointer"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="px-3.5 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center transition-all text-[10px] font-extrabold uppercase tracking-wider active:scale-95 cursor-pointer"
          title="Reset Center"
        >
          Reset
        </button>
      </div>

      {/* Highlights Legend indicator if states highlighted */}
      {highlightStates.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-neutral-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-neutral-800 shadow-md text-left max-w-[150px] pointer-events-none select-none">
          <h5 className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Map Legend</h5>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="h-3 w-3 rounded-md bg-yellow-500 border border-yellow-400 shadow-sm shrink-0" />
            <span className="text-[9.5px] font-bold text-neutral-200 uppercase tracking-wide">Highlighted</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-3 w-3 rounded-md bg-[#111827] border border-neutral-700 shrink-0" />
            <span className="text-[9.5px] font-bold text-neutral-450 uppercase tracking-wide">Other Regions</span>
          </div>
        </div>
      )}
    </div>
  );
}
