import React from 'react';
import { Film, Sparkles, Compass, FolderHeart, Zap } from 'lucide-react';

interface NavbarProps {
  currentTab: 'studio' | 'feed' | 'creations';
  onSelectTab: (tab: 'studio' | 'feed' | 'creations') => void;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, savedCount }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-8">
      {/* Zone 1: Single Brand Wordmark */}
      <div 
        onClick={() => onSelectTab('studio')}
        className="flex items-center gap-2.5 cursor-pointer shrink-0 group select-none"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
          <Film className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            VibePulse
          </span>
          <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase">
            Studio
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (Clean unboxed typography) */}
      <nav className="flex items-center gap-6 md:gap-8 text-sm font-medium">
        <button
          onClick={() => onSelectTab('studio')}
          className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'studio'
              ? 'text-white font-semibold border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>Templates</span>
        </button>

        <button
          onClick={() => onSelectTab('feed')}
          className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'feed'
              ? 'text-white font-semibold border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>Community Feed</span>
        </button>

        <button
          onClick={() => onSelectTab('creations')}
          className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'creations'
              ? 'text-white font-semibold border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderHeart className="w-4 h-4 text-emerald-400" />
          <span>My Videos</span>
          {savedCount > 0 && (
            <span className="text-xs text-rose-400 font-bold tabular-nums">
              ({savedCount})
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectTab('studio')}
          className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 rounded-lg shadow-sm shadow-rose-500/30 hover:shadow-rose-500/50 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>One-Tap Video</span>
        </button>
      </div>
    </header>
  );
};
