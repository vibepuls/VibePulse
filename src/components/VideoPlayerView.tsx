import React, { useRef, useState, useEffect } from 'react';
import { RenderedVideoOutput, VideoTemplate } from '../types/template';
import {
  Download,
  Share2,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  Film,
  Music,
} from 'lucide-react';

interface VideoPlayerViewProps {
  output: RenderedVideoOutput;
  template: VideoTemplate;
  onPublish: (output: RenderedVideoOutput, caption: string) => void;
  onRemix: () => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  output,
  template,
  onPublish,
  onRemix,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(output.duration || 10);
  const [hasPublished, setHasPublished] = useState(output.publishedToFeed || false);
  const [caption, setCaption] = useState(`Made with ${template.title} on #VibePulse 🔥`);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Auto play
    video.play().catch(() => {
      setIsPlaying(false);
    });

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [output.blobUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = output.blobUrl;
    const cleanTitle = template.title.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `VibePulse_${cleanTitle}_1080p.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmPublish = () => {
    onPublish(output, caption);
    setHasPublished(true);
    setShowShareModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automatic Editing Finished</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Your Video is Ready!
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Cut and beat-synchronized to {template.audioTrack.title} in 1080p 9:16 vertical format.
          </p>
        </div>

        <button
          onClick={onRemix}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-all self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Use Another Template</span>
        </button>
      </div>

      {/* Main Player & Action Split Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 9:16 Vertical Video Player (Cols 5 on desktop) */}
        <div className="lg:col-span-5 mx-auto w-full max-w-[360px]">
          <div className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-2xl border border-slate-800 group">
            <video
              ref={videoRef}
              src={output.blobUrl}
              playsInline
              loop
              className="w-full h-full object-cover cursor-pointer"
              onClick={togglePlay}
            />

            {/* Floating Top Info Overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs text-white/90 drop-shadow pointer-events-none">
              <span className="font-semibold text-rose-400">
                {template.title}
              </span>
              <span className="text-[11px] font-mono bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
                1080p Full HD
              </span>
            </div>

            {/* Center Play Overlay when paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
            )}

            {/* Bottom Scrubber & Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2 opacity-95 transition-opacity">
              {/* Beat sync markers along scrub timeline */}
              <div className="relative w-full">
                <input
                  type="range"
                  min="0"
                  max={duration || 10}
                  step="0.05"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-rose-500 relative z-10"
                />
                {/* Beat tick marks */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 pointer-events-none flex">
                  {template.beatMarkers.map((marker, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-2 bg-amber-400/80 rounded-full"
                      style={{
                        left: `${(marker / template.duration) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Control buttons & time display */}
              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="hover:text-rose-400">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={toggleMute} className="hover:text-rose-400">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="font-mono text-[11px] tabular-nums text-slate-300">
                    {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <Music className="w-3 h-3 text-rose-400" />
                  <span className="truncate max-w-[110px]">{template.audioTrack.title}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel & Details (Cols 7 on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Export & Publishing
              </span>
              <h3 className="text-xl font-bold text-white">
                Save or Share to VibePulse
              </h3>
              <p className="text-xs text-slate-400">
                Direct export to high quality MP4 format. Works everywhere on TikTok, Instagram Reels, YouTube Shorts, and WhatsApp.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleDownload}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:opacity-95 shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4 Video (1080p)</span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                disabled={hasPublished}
                className={`w-full py-3 px-6 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 transition-all ${
                  hasPublished
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 cursor-default'
                    : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-white hover:bg-slate-800'
                }`}
              >
                {hasPublished ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Published to VibePulse Feed</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-rose-400" />
                    <span>Publish to Community Feed</span>
                  </>
                )}
              </button>
            </div>

            {/* Automated Editing Pipeline Summary */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Applied AI Operations (100% Automatic)
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Clip Arrangement</span>
                  <span className="font-semibold text-white">Auto Beat-Synced</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Transitions</span>
                  <span className="font-semibold text-white">{template.slots[0].transitionIn} + Glitch</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Color Grade LUT</span>
                  <span className="font-semibold text-white capitalize">{template.colorGrade}</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Camera Motion</span>
                  <span className="font-semibold text-white">Ken Burns 3D Zoom</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Publish to VibePulse Feed</h3>
              <p className="text-xs text-slate-400">
                Your video will appear on the public community feed where other creators can watch and remix this template.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Caption & Hashtags</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="w-full p-3 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-md shadow-rose-500/30"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
