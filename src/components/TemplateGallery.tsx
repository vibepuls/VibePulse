import React, { useState } from 'react';
import { VideoTemplate, TemplateCategory } from '../types/template';
import { VIDEO_TEMPLATES } from '../data/templates';
import { TemplateCard } from './TemplateCard';
import { globalAudioEngine } from '../utils/audioEngine';
import { Search, Sparkles, Wand2 } from 'lucide-react';

interface TemplateGalleryProps {
  onSelectTemplate: (template: VideoTemplate) => void;
}

const CATEGORIES: TemplateCategory[] = [
  'All',
  'Trending',
  'Viral',
  'Beat Sync',
  'Cinematic',
  'Slow Motion',
  'Photo Slideshow',
  'Birthday',
  'Travel',
  'Love & Memories',
  'Gaming',
  'Professional Reels',
  'Instagram/TikTok Style',
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate }) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const filteredTemplates = VIDEO_TEMPLATES.filter((tpl) => {
    const matchesCategory = selectedCategory === 'All' || tpl.category === selectedCategory;
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.audioTrack.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTogglePreview = (template: VideoTemplate) => {
    if (activePreviewId === template.id) {
      globalAudioEngine.stop();
      setActivePreviewId(null);
    } else {
      setActivePreviewId(template.id);
      globalAudioEngine.play(template.audioTrack, template.beatMarkers, true, 0);
    }
  };

  const handleSelectTemplate = (template: VideoTemplate) => {
    globalAudioEngine.stop();
    setActivePreviewId(null);
    onSelectTemplate(template);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Editorial Hero Header */}
      <div className="relative rounded-3xl p-6 md:p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800/80 overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
            <Wand2 className="w-4 h-4" />
            <span>ZERO MANUAL EDITING · 100% AUTOMATIC ENGINE</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white" style={{ textWrap: 'balance' }}>
            Choose a Template. <br />
            AI Edits & Synchronizes Everything.
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Pick a trending TikTok or CapCut template. Upload your photos or videos. The engine automatically detects focal moments, cuts to the beat, applies color grades, and bakes Full HD MP4 video.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Auto Beat Sync
            </span>
            <span aria-hidden="true">·</span>
            <span>Ken Burns 3D Parallax</span>
            <span aria-hidden="true">·</span>
            <span>Speed-Ramp Velocity</span>
            <span aria-hidden="true">·</span>
            <span>1080p 9:16 Vertical Video</span>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates, music, styles..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
            />
          </div>

          <div className="text-xs text-slate-400 whitespace-nowrap">
            Showing <span className="font-semibold text-white">{filteredTemplates.length}</span> ready-made templates
          </div>
        </div>

        {/* Category Horizontal Segmented Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Cards Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isPlayingPreview={activePreviewId === template.id}
              onTogglePreview={handleTogglePreview}
              onSelectTemplate={handleSelectTemplate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8">
          <p className="text-slate-400 text-sm">No templates matched your search.</p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="mt-3 px-4 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
