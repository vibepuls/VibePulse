import React from 'react';
import { RenderedVideoOutput } from '../types/template';
import { Download, Play, Trash2, Film, Sparkles } from 'lucide-react';

interface MyCreationsViewProps {
  creations: RenderedVideoOutput[];
  onPlayCreation: (creation: RenderedVideoOutput) => void;
  onDeleteCreation: (id: string) => void;
  onOpenStudio: () => void;
}

export const MyCreationsView: React.FC<MyCreationsViewProps> = ({
  creations,
  onPlayCreation,
  onDeleteCreation,
  onOpenStudio,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
            Your Production Library
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            My Rendered Videos ({creations.length})
          </h2>
          <p className="text-xs text-slate-400">
            All videos are rendered locally in 1080p Full HD MP4 format.
          </p>
        </div>

        <button
          onClick={onOpenStudio}
          className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-sm shadow-rose-500/30 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Create New Video</span>
        </button>
      </div>

      {creations.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Rendered Videos Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Select any trending template, upload your photos or videos, and click create. Your videos will appear here.
            </p>
          </div>
          <button
            onClick={onOpenStudio}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl shadow-lg shadow-rose-500/20"
          >
            Explore Templates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {creations.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col"
            >
              <div className="relative aspect-[9/16] bg-black overflow-hidden">
                <video
                  src={item.blobUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Play Trigger */}
                <button
                  onClick={() => onPlayCreation(item)}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center group-hover:scale-110 hover:bg-rose-500 transition-all"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>

                {/* Bottom info */}
                <div className="absolute bottom-2 left-2 right-2 space-y-0.5 text-white">
                  <p className="text-xs font-bold truncate">{item.templateTitle}</p>
                  <p className="text-[10px] text-slate-300 font-mono">
                    {item.duration.toFixed(1)}s · 1080p
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2.5 bg-slate-950 flex items-center justify-between text-xs">
                <a
                  href={item.blobUrl}
                  download={`VibePulse_${item.templateTitle.replace(/\s+/g, '_')}.mp4`}
                  className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-rose-400" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => onDeleteCreation(item.id)}
                  aria-label="Delete video"
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
