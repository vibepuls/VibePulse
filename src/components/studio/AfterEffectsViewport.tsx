import React, { useRef, useState, useEffect } from 'react';
import { DocumentaryPhoto, ViewportDisplayMode, CameraMovePreset } from '../../types/documentary';
import { GeneratedParallaxLayers } from '../../utils/depthSegmentationEngine';
import { DocumentaryCompositingEngine } from '../../utils/documentaryVfxEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  Layers,
  Sparkles,
  Eye,
} from 'lucide-react';

interface AfterEffectsViewportProps {
  photo: DocumentaryPhoto;
  layers: GeneratedParallaxLayers | null;
  onUpdateCameraMove: (photoId: string, move: CameraMovePreset) => void;
}

export const AfterEffectsViewport: React.FC<AfterEffectsViewportProps> = ({
  photo,
  layers,
  onUpdateCameraMove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [displayMode, setDisplayMode] = useState<ViewportDisplayMode>('master-full-image');
  const [showCameraFrustum, setShowCameraFrustum] = useState(false);

  const duration = photo.duration || 5.0;

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          return next >= duration ? 0 : next;
        });
      }

      // Render to canvas
      const canvas = canvasRef.current;
      if (canvas && layers) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const progress = Math.max(0, Math.min(1, currentTime / duration));
          DocumentaryCompositingEngine.renderScene(
            ctx,
            canvas.width,
            canvas.height,
            progress,
            photo,
            layers,
            displayMode
          );

          // Draw 3D Camera Frustum Wireframe if toggled
          if (showCameraFrustum && displayMode !== 'camera-trajectory') {
            drawCameraFrustumOverlay(ctx, canvas.width, canvas.height, progress, photo);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, duration, photo, layers, displayMode, showCameraFrustum]);

  const drawCameraFrustumOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    progress: number,
    p: DocumentaryPhoto
  ) => {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);

    const camK0 = p.keyframes.camera[0];
    const camK1 = p.keyframes.camera[1] || camK0;
    const cx = w / 2 + (camK0.x + (camK1.x - camK0.x) * progress);
    const cy = h / 2 + (camK0.y + (camK1.y - camK0.y) * progress);

    ctx.strokeRect(cx - 160, cy - 90, 320, 180);
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Motion vector line
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(w / 2 + camK0.x, h / 2 + camK0.y);
    ctx.lineTo(w / 2 + camK1.x, h / 2 + camK1.y);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText('3D VIRTUAL CAMERA VECTOR', cx - 140, cy - 100);

    ctx.restore();
  };

  const formatSMPTE = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col bg-slate-950 border-r border-slate-800 h-full">
      {/* Top Bar: Viewport Mode Tabs & Camera Preset */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Layer View Modes */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto scrollbar-none">
          {[
            { id: 'master-full-image', label: 'Master Full-Image (Intact Photo)' },
            { id: 'raw-comparison', label: 'Raw vs Master (Before/After)' },
            { id: 'cinematic-lighting', label: 'Lighting & VFX Overlays' },
            { id: 'motion-graphics', label: 'Motion Graphics Pass' },
            { id: 'camera-trajectory', label: '3D Camera Trajectory' },
            { id: 'depth-map', label: 'Z-Depth Reference' },
            { id: 'optional-2.5d', label: 'Optional 2.5D Mode' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setDisplayMode(mode.id as ViewportDisplayMode)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                displayMode === mode.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Right Camera Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCameraFrustum(!showCameraFrustum)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors ${
              showCameraFrustum
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-700'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>3D Camera Wireframe</span>
          </button>

          <select
            value={photo.analysis?.recommendedCamera || 'cinematic-slow-zoom'}
            onChange={(e) => onUpdateCameraMove(photo.id, e.target.value as CameraMovePreset)}
            className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400 text-xs font-mono"
          >
            <option value="dolly-in-rack-focus">Dolly In (Rack Focus)</option>
            <option value="truck-left-parallax">Truck Left (Parallax)</option>
            <option value="truck-right-parallax">Truck Right (Parallax)</option>
            <option value="pedestal-crane-up">Pedestal Crane Up</option>
            <option value="orbital-subject-arc">Orbital 3D Arc</option>
            <option value="dramatic-push-impact">Dramatic Push Impact</option>
            <option value="cinematic-slow-zoom">Cinematic Slow Zoom</option>
            <option value="dolly-out-reveal">Dolly Out Reveal</option>
            <option value="pedestal-crane-down">Pedestal Crane Down</option>
            <option value="macro-evidence-crawl">Macro Evidence Crawl</option>
            <option value="wide-vista-pan">Wide Vista Pan</option>
          </select>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden p-2 min-h-[360px] md:min-h-[440px]">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="max-w-full max-h-full object-contain aspect-[16/9] shadow-2xl rounded-lg border border-slate-900"
        />
      </div>

      {/* Viewport Playback Scrub Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => setCurrentTime(0)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Rewind to start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="font-mono text-xs text-slate-200">
            <span className="text-amber-400">{formatSMPTE(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span>{formatSMPTE(duration)}</span>
          </div>
        </div>

        {/* Range Scrubber */}
        <div className="flex-1 max-w-2xl px-2">
          <input
            type="range"
            min="0"
            max={duration}
            step="0.033"
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div className="text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Fast Start → Continuous Glide (No Freeze at End)</span>
        </div>
      </div>
    </div>
  );
};
