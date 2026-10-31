import React from 'react';
import { DocumentaryPhoto } from '../../types/documentary';
import {
  Camera,
  Layers,
  User,
  Image as ImageIcon,
  Sparkles,
  Type,
  Mic,
  Clock,
  Cloud,
  Box,
} from 'lucide-react';

interface AfterEffectsTimelineProps {
  photo: DocumentaryPhoto;
  onUpdateDuration: (photoId: string, newDuration: number) => void;
}

export const AfterEffectsTimeline: React.FC<AfterEffectsTimelineProps> = ({
  photo,
  onUpdateDuration,
}) => {
  const duration = photo.duration || 5.0;

  const tracks = [
    {
      id: 'camera',
      name: '3D Virtual Camera',
      icon: <Camera className="w-3.5 h-3.5 text-sky-400" />,
      color: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
      keyframes: [0.0, 1.0],
      detail: `${photo.analysis?.recommendedCamera || 'Slow Zoom'} · Easy-Ease Bezier`,
    },
    {
      id: 'foreground',
      name: 'Foreground Occluder (Z = +200)',
      icon: <Box className="w-3.5 h-3.5 text-rose-400" />,
      color: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
      keyframes: [0.0, 1.0],
      detail: 'Parallax Speed 2.1x · Optical Lens Blur',
    },
    {
      id: 'subject',
      name: '2.5D Focal Subject (Z = 0)',
      icon: <User className="w-3.5 h-3.5 text-amber-400" />,
      color: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      keyframes: [0.0, 1.0],
      detail: 'Focal Plane 1.0x · Feathered Alpha Matte',
    },
    {
      id: 'secondary',
      name: 'Secondary Midground (Z = -150)',
      icon: <Layers className="w-3.5 h-3.5 text-emerald-400" />,
      color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      keyframes: [0.0, 1.0],
      detail: 'Mid Depth 0.75x · Architecture / Terrain',
    },
    {
      id: 'backplate',
      name: 'Inpainted Backplate (Z = -400)',
      icon: <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />,
      color: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
      keyframes: [0.0, 1.0],
      detail: 'Deep Plane 0.45x · Seam Texture Inpainted',
    },
    {
      id: 'sky',
      name: 'Sky Dome & Horizon (Z = -800)',
      icon: <Cloud className="w-3.5 h-3.5 text-cyan-400" />,
      color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
      keyframes: [0.0, 1.0],
      detail: 'Atmospheric Cloud Drift · Infinite Horizon',
    },
    {
      id: 'vfx',
      name: 'Atmospheric VFX & Grain',
      icon: <Sparkles className="w-3.5 h-3.5 text-pink-400" />,
      color: 'bg-pink-500/20 border-pink-500/40 text-pink-300',
      keyframes: [0.0, 0.5, 1.0],
      detail: `35mm Grain (${photo.vfx.filmGrain}) · Dust (${photo.procedural.dustParticles}) · Smoke (${photo.procedural.smoke ? 'On' : 'Off'})`,
    },
    {
      id: 'graphics',
      name: 'Documentary Lower Thirds',
      icon: <Type className="w-3.5 h-3.5 text-emerald-400" />,
      color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      keyframes: [0.12, 0.88],
      detail: photo.graphics?.lowerThird?.title || 'Archival Motion Graphic',
    },
    {
      id: 'audio',
      name: 'Narration Voiceover Track',
      icon: <Mic className="w-3.5 h-3.5 text-yellow-400" />,
      color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
      keyframes: [0.0],
      detail: 'Waveform Sync · Automated Pace',
    },
  ];

  return (
    <div className="bg-slate-950 border-t border-slate-800 p-4 space-y-3 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>After Effects Multi-Track Keyframe Timeline</span>
          <span className="text-[10px] text-slate-500 font-normal">
            (5 Parallax Planes · Real 3D Camera Frustum)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Clip Duration:</span>
            <input
              type="number"
              min="2"
              max="20"
              step="0.5"
              value={duration}
              onChange={(e) => onUpdateDuration(photo.id, parseFloat(e.target.value) || 5.0)}
              className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-400 font-bold text-center"
            />
            <span>sec</span>
          </div>
        </div>
      </div>

      {/* Tracks Container */}
      <div className="space-y-1.5 bg-slate-900/60 rounded-xl p-2 border border-slate-800/80">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="grid grid-cols-12 items-center gap-2 text-xs py-1 px-2 rounded-lg hover:bg-slate-800/40 transition-colors"
          >
            {/* Track Name */}
            <div className="col-span-4 flex items-center gap-2 truncate">
              {track.icon}
              <span className="font-medium text-slate-300 truncate">{track.name}</span>
            </div>

            {/* Timeline Track Strip with Keyframe Diamonds */}
            <div className="col-span-8 relative h-7 bg-slate-950 rounded-md border border-slate-800 overflow-hidden flex items-center px-2">
              {track.id === 'audio' ? (
                <div className="flex items-center gap-0.5 h-3 w-full opacity-60">
                  {[20, 60, 80, 45, 90, 70, 30, 85, 95, 40, 60, 80, 50, 75, 90, 40, 60, 30].map(
                    (val, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-yellow-400/80 rounded-full"
                        style={{ height: `${val * 0.14}px` }}
                      />
                    )
                  )}
                </div>
              ) : (
                <div
                  className={`h-full w-full border-l-2 flex items-center px-2 text-[10px] truncate ${track.color}`}
                >
                  <span className="truncate">{track.detail}</span>
                </div>
              )}

              {/* Keyframe Diamond Indicators */}
              {track.keyframes.map((kfTime, kfIdx) => (
                <div
                  key={kfIdx}
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-amber-400 rotate-45 border border-slate-950 shadow-sm z-10"
                  style={{ left: `calc(${kfTime * 95}% + 8px)` }}
                  title={`Keyframe at ${(kfTime * duration).toFixed(2)}s`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
