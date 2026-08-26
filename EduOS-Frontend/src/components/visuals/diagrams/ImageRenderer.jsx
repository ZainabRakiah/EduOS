import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function ImageRenderer({ configuration = {} }) {
  const {
    image = '',
    prompt = '',
    explanation = '',
    aspectRatio = '16:9'
  } = configuration;

  const [loading, setLoading] = useState(false);

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'aspect-video';
      case '2:3':
        return 'aspect-[2/3] max-h-[480px]';
      case '3:2':
        return 'aspect-[3/2]';
      case '4:3':
        return 'aspect-[4/3]';
      case '9:16':
        return 'aspect-[9/16] max-h-[480px]';
      case '1:1':
      default:
        return 'aspect-square max-h-[380px]';
    }
  };

  return (
    <div className="w-full h-full p-5 flex flex-col bg-neutral-900 border border-neutral-750/30 rounded-3xl overflow-hidden shadow-2xl justify-between">
      {/* Header */}
      <div className="mb-4 select-none">
        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest">AI Generated Image</h4>
        {prompt && (
          <p className="text-[9px] text-neutral-450 uppercase font-black tracking-widest mt-0.5 truncate max-w-[95%]">
            Prompt: {prompt}
          </p>
        )}
      </div>

      {/* Main Image Frame */}
      <div className="flex-1 w-full flex items-center justify-center p-2 bg-neutral-950/40 rounded-2xl border border-neutral-800/30 overflow-hidden relative">
        {image ? (
          <div className={`relative w-full overflow-hidden rounded-xl bg-neutral-900 flex items-center justify-center ${getAspectRatioClass()}`}>
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 text-neutral-400 gap-2 z-10">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                <span className="text-[10px] font-black uppercase tracking-wider">Loading generated pixels...</span>
              </div>
            )}
            <img
              src={image}
              alt="AI Generated Visual"
              onLoad={() => setLoading(false)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            />
          </div>
        ) : (
          <div className="w-full min-h-[250px] flex items-center justify-center text-xs text-neutral-500 font-bold uppercase tracking-wider">
            Image asset is empty.
          </div>
        )}
      </div>

      {/* Explanation Footer */}
      {explanation && (
        <div className="mt-4 text-[10px] text-neutral-400 font-medium leading-relaxed max-w-[95%]">
          {explanation}
        </div>
      )}
    </div>
  );
}
