import React from 'react';
import { Sparkles, Film, Disc3, ShieldCheck } from 'lucide-react';

interface RenderingModalProps {
  isOpen: boolean;
  progress: number;
  statusText: string;
  templateTitle: string;
}

export const RenderingModal: React.FC<RenderingModalProps> = ({
  isOpen,
  progress,
  statusText,
  templateTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 animate-pulse">
            <Film className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-rose-400">
              AI Automatic Video Studio
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Rendering {templateTitle}
            </h3>
            <p className="text-xs text-slate-400">
              Zero manual editing in progress. AI is synchronizing clips, beat drops, and transitions.
            </p>
          </div>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 truncate max-w-[240px]">{statusText}</span>
            <span className="text-rose-400 font-mono tabular-nums">{progress}%</span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Dynamic Beat Visualizer Graphic */}
        <div className="flex items-center justify-center gap-1.5 h-8">
          {[40, 75, 95, 60, 85, 100, 70, 90, 45, 80, 65, 90].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-rose-500/80 rounded-full transition-all duration-150 animate-pulse"
              style={{
                height: `${h * 0.28}px`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>

        {/* Specs Badges */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-around text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>1080p Full HD</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>9:16 Vertical</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1">
            <Disc3 className="w-3.5 h-3.5 text-rose-400" />
            <span>30 FPS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
