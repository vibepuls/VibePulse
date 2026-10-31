import React, { useState } from 'react';
import { VideoTemplate, UserMediaItem } from '../types/template';
import { SAMPLE_MEDIA_LIBRARY } from '../data/sampleMedia';
import { analyzeImage, analyzeVideo } from '../utils/mediaAnalyzer';
import {
  Upload,
  Sparkles,
  ArrowLeft,
  Trash2,
  Music,
  CheckCircle2,
  Zap,
  Image as ImageIcon,
  Video as VideoIcon,
  Layers,
} from 'lucide-react';

interface MediaUploaderProps {
  template: VideoTemplate;
  onBack: () => void;
  onStartRender: (mediaItems: UserMediaItem[]) => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  template,
  onBack,
  onStartRender,
}) => {
  const [mediaList, setMediaList] = useState<UserMediaItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    const newItems: UserMediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const item = await analyzeImage(file, file.name);
        newItems.push(item);
      } else if (file.type.startsWith('video/')) {
        const item = await analyzeVideo(file, file.name);
        newItems.push(item);
      }
    }

    setMediaList((prev) => [...prev, ...newItems]);
    setIsAnalyzing(false);
  };

  const handleFillSampleMedia = () => {
    // Curate sample items according to template slots
    setMediaList([...SAMPLE_MEDIA_LIBRARY]);
  };

  const handleRemoveItem = (id: string) => {
    setMediaList((prev) => prev.filter((item) => item.id !== id));
  };

  const isReady = mediaList.length >= Math.min(2, template.minSlots);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Templates</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Zero Manual Editing Mode</span>
        </div>
      </div>

      {/* Template Summary Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={template.coverUrl}
            alt={template.title}
            className="w-16 h-24 object-cover rounded-xl border border-slate-700/60 shrink-0"
          />
          <div className="space-y-1">
            <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider">
              Selected Template
            </span>
            <h2 className="text-xl font-bold text-white">{template.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Music className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{template.audioTrack.title}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{template.duration}s</span>
              <span aria-hidden="true">·</span>
              <span>{template.minSlots}-{template.maxSlots} clips suggested</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFillSampleMedia}
            className="py-2.5 px-4 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Test Media</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="space-y-4">
        <label className="relative border-2 border-dashed border-slate-700 hover:border-rose-500/60 rounded-3xl p-8 md:p-12 text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 transition-all flex flex-col items-center justify-center gap-3 group">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-md">
            <Upload className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <p className="text-base font-semibold text-white">
              Upload Photos or Videos from Your Device
            </p>
            <p className="text-xs text-slate-400">
              Supports JPG, PNG, WEBP, MP4, WEBM, MOV. No manual trimming required.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
            <span>Automatic 9:16 Focal Framing</span>
            <span aria-hidden="true">·</span>
            <span>Peak Action Detection</span>
            <span aria-hidden="true">·</span>
            <span>Beat Cut Sync</span>
          </div>
        </label>
      </div>

      {/* Media Slots Tray & AI Energy Badging */}
      {mediaList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 font-medium text-white">
              <Layers className="w-4 h-4 text-rose-400" />
              <span>
                {mediaList.length} Media Item{mediaList.length > 1 ? 's' : ''} Uploaded
              </span>
              <span className="text-slate-500 font-normal">
                (AI will arrange these into {template.slots.length} beat-synchronized slots)
              </span>
            </div>

            <button
              onClick={() => setMediaList([])}
              className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {mediaList.map((item, idx) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-[9/16]"
              >
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Dark gradient for labels */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Slot index & type icon */}
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white">
                  {item.type === 'video' ? (
                    <VideoIcon className="w-2.5 h-2.5 text-cyan-400" />
                  ) : (
                    <ImageIcon className="w-2.5 h-2.5 text-rose-400" />
                  )}
                  <span>Clip #{idx + 1}</span>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  aria-label="Remove clip"
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Bottom AI Analysis tags */}
                <div className="absolute bottom-2 left-2 right-2 space-y-0.5 text-[10px] text-white">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-rose-300 font-mono">
                    Energy: {item.energyScore || 80}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zero Manual Editing Guarantee Callout */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-300">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <p>
          <strong className="text-white">Zero manual editing needed:</strong> The engine will automatically select the best moments, crop to 9:16 vertical, apply transitions, sync cuts to {template.audioTrack.title}, and render 1080p video.
        </p>
      </div>

      {/* Primary Action Button */}
      <div className="pt-2">
        <button
          onClick={() => onStartRender(mediaList)}
          disabled={!isReady || isAnalyzing}
          className={`w-full py-4 px-6 rounded-2xl text-base font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
            isReady && !isAnalyzing
              ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:opacity-95 shadow-rose-500/25 active:scale-[0.99] cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>
            {mediaList.length === 0
              ? 'Upload Photos or Videos to Continue'
              : 'Create My Video (Automatic AI Render)'}
          </span>
        </button>
      </div>
    </div>
  );
};
