import React from 'react';
import { DocumentaryStyleConfig, ProjectSettings } from '../../types/documentary';
import { Film, Sparkles, Download, Layers, Mic, Archive } from 'lucide-react';

interface DocNavbarProps {
  settings: ProjectSettings;
  activeStyle: DocumentaryStyleConfig;
  photoCount: number;
  totalSizeBytes: number;
  isAnimatingAll: boolean;
  onAnimateAll: () => void;
  onOpenExport: () => void;
  onDownloadZip?: () => void;
  onOpenNarration: () => void;
  showTimeline: boolean;
  onToggleTimeline: () => void;
}

export const DocNavbar: React.FC<DocNavbarProps> = ({
  settings,
  activeStyle,
  photoCount,
  totalSizeBytes,
  isAnimatingAll,
  onAnimateAll,
  onOpenExport,
  onDownloadZip,
  onOpenNarration,
  showTimeline,
  onToggleTimeline,
}) => {
  const formattedSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-6 select-none">
      {/* Zone 1: Brand Wordmark & Project Name */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
          <Film className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
              DOCUMOTION PRO
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
              Full-Image Documentary Studio
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>{settings.projectName}</span>
            <span aria-hidden="true">·</span>
            <span>{photoCount} photos ({formattedSizeMb} MB)</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300 font-medium">{activeStyle.name}</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Studio Tools & Toggles */}
      <div className="hidden lg:flex items-center gap-4 text-xs">
        <button
          onClick={onOpenNarration}
          className="flex items-center gap-1.5 py-1 px-3 text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors"
        >
          <Mic className="w-3.5 h-3.5 text-amber-400" />
          <span>Narration Audio Sync</span>
        </button>

        <button
          onClick={onToggleTimeline}
          className={`flex items-center gap-1.5 py-1 px-3 rounded-lg border transition-colors ${
            showTimeline
              ? 'bg-slate-800 text-amber-400 border-amber-500/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-900 border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>AE Multi-Track Timeline</span>
        </button>
      </div>

      {/* Zone 3: Primary Actions (ANIMATE ALL, ZIP EXPORT & VIDEO EXPORT) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onAnimateAll}
          disabled={photoCount === 0 || isAnimatingAll}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all ${
            photoCount > 0 && !isAnimatingAll
              ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-amber-500/25 active:scale-[0.98] cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAnimatingAll ? 'Applying Moves...' : 'ANIMATE ALL'}</span>
        </button>

        {onDownloadZip && (
          <button
            onClick={onDownloadZip}
            disabled={photoCount === 0}
            title="Download project as .ZIP (photos + keyframe JSON)"
            className="py-2 px-3 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Download ZIP</span>
          </button>
        )}

        <button
          onClick={onOpenExport}
          disabled={photoCount === 0}
          className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Export Master Video</span>
        </button>
      </div>
    </header>
  );
};
