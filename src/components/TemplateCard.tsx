import React from 'react';
import { VideoTemplate } from '../types/template';
import { Play, Pause, Music, Sparkles, Flame, Eye } from 'lucide-react';

interface TemplateCardProps {
  template: VideoTemplate;
  isPlayingPreview: boolean;
  onTogglePreview: (template: VideoTemplate) => void;
  onSelectTemplate: (template: VideoTemplate) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isPlayingPreview,
  onTogglePreview,
  onSelectTemplate,
}) => {
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-rose-950/20 flex flex-col">
      {/* 9:16 Aspect Media Preview Container */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-slate-950">
        <img
          src={template.coverUrl}
          alt={template.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Cinematic Scrim Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/40 pointer-events-none" />

        {/* Top Badging: Tag and Usages (Clean unboxed text) */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs text-white/90">
          <div className="flex items-center gap-1.5 font-semibold text-rose-400 drop-shadow">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{template.tag || template.category}</span>
          </div>
          <span className="text-[11px] text-white/80 drop-shadow">
            {template.usagesCount}
          </span>
        </div>

        {/* Center Interactive Beat Preview Trigger */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePreview(template);
          }}
          aria-label={isPlayingPreview ? 'Pause audio preview' : 'Play audio preview'}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isPlayingPreview
              ? 'bg-rose-500 text-white scale-110 shadow-lg shadow-rose-500/50'
              : 'bg-black/60 backdrop-blur-md text-white hover:bg-rose-500 hover:scale-110'
          }`}
        >
          {isPlayingPreview ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Floating Bottom Info on Card Media */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1 text-white">
          <h3 className="text-base font-bold tracking-tight text-white line-clamp-1 drop-shadow">
            {template.title}
          </h3>

          {/* Music track label */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Music className="w-3 h-3 text-rose-400 shrink-0" />
            <span className="truncate">{template.audioTrack.title}</span>
          </div>

          {/* Unboxed metadata row with · separators */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <span>{template.duration}s</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{template.bpm} BPM</span>
            <span aria-hidden="true">·</span>
            <span>{template.minSlots}-{template.maxSlots} clips</span>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800/70 flex items-center gap-2">
        <button
          onClick={() => onSelectTemplate(template)}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/30"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Use Template</span>
        </button>
      </div>
    </div>
  );
};
