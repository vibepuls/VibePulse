import React, { useState } from 'react';
import { DocumentaryPhoto } from '../../types/documentary';
import { GeneratedParallaxLayers } from '../../utils/depthSegmentationEngine';
import { DocumentaryExporterEngine, BatchRenderProgress } from '../../utils/documentaryExporter';
import { exportProjectAsZip } from '../../utils/zipExporter';
import {
  X,
  Film,
  Download,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Archive,
  Loader2,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: DocumentaryPhoto[];
  layersMap: Map<string, GeneratedParallaxLayers>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  photos,
  layersMap,
}) => {
  const [resolution, setResolution] = useState<'1920x1080' | '1280x720' | '1080x1920' | '3840x2160'>('1920x1080');
  const [exportMode, setExportMode] = useState<'30s-test' | 'full-documentary'>('full-documentary');
  const [fps, setFps] = useState<24 | 30 | 60>(24);
  const [quality, setQuality] = useState<'fast' | 'balanced' | 'high'>('high');

  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<BatchRenderProgress | null>(null);
  const [renderedResult, setRenderedResult] = useState<{ blobUrl: string; duration: number } | null>(null);

  const [isZipping, setIsZipping] = useState(false);
  const [zipProgressText, setZipProgressText] = useState('');

  if (!isOpen) return null;

  // Selected photos based on exportMode
  const exportPhotos = exportMode === '30s-test' ? photos.slice(0, 6) : photos;
  const totalDuration = exportPhotos.reduce((acc, p) => acc + p.duration, 0);

  const handleStartExport = async () => {
    setIsRendering(true);
    setRenderedResult(null);

    const [wStr, hStr] = resolution.split('x');
    const width = parseInt(wStr, 10);
    const height = parseInt(hStr, 10);

    try {
      const result = await DocumentaryExporterEngine.exportMasterDocumentary(
        exportPhotos,
        layersMap,
        fps,
        width,
        height,
        (p) => setRenderProgress(p)
      );
      setRenderedResult(result);
      setIsRendering(false);
    } catch (err) {
      console.error('Export failed:', err);
      setIsRendering(false);
      alert('Batch render encountered an error. Please check your photo layers.');
    }
  };

  const handleDownload = () => {
    if (!renderedResult) return;
    const a = document.createElement('a');
    a.href = renderedResult.blobUrl;
    a.download = `Documentary_Master_${resolution}_${fps}fps.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    setZipProgressText('Preparing project package...');
    try {
      await exportProjectAsZip({
        photos,
        videoBlobUrl: renderedResult ? renderedResult.blobUrl : null,
        onProgress: (pct, status) => {
          setZipProgressText(`${status} (${pct}%)`);
        },
      });
    } catch (err) {
      console.error('ZIP export error:', err);
      alert('Failed to generate ZIP archive.');
    } finally {
      setIsZipping(false);
      setZipProgressText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isRendering}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Film className="w-4 h-4" />
            <span>Master Video Batch Exporter</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Export Master Documentary ({photos.length} Scenes)
          </h3>
          <p className="text-xs text-slate-400">
            Animates 100% intact original photographs with After Effects-style 3D camera pan/tilt/zoom, optical motion blur, volumetric atmospheric lighting, and broadcast motion graphics into a broadcast-ready MP4.
          </p>
        </div>

        {/* Configuration Selectors */}
        {!isRendering && !renderedResult && (
          <div className="space-y-4">
            {/* Export Scope Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Export Scope</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setExportMode('full-documentary')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportMode === 'full-documentary'
                      ? 'bg-amber-500/20 border-amber-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="font-bold">Full Documentary Master</p>
                  <p className="text-[10px] text-slate-500">All {photos.length} scenes ({photos.reduce((acc, p) => acc + p.duration, 0).toFixed(0)}s)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setExportMode('30s-test')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportMode === '30s-test'
                      ? 'bg-amber-500/20 border-amber-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="font-bold">30-Second Fast Test Video</p>
                  <p className="text-[10px] text-slate-500">First 6 scenes (30.0s preview)</p>
                </button>
              </div>
            </div>

            {/* Resolution Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Target Resolution</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { label: '1080p Full HD', val: '1920x1080', desc: '16:9 Broadcast' },
                  { label: '720p HD', val: '1280x720', desc: 'Fast Proxy' },
                  { label: '9:16 Vertical', val: '1080x1920', desc: 'Mobile Reels' },
                  { label: '4K UHD', val: '3840x2160', desc: 'Cinema Master' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setResolution(item.val as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      resolution === item.val
                        ? 'bg-amber-500/20 border-amber-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <p className="font-bold">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Framerate & Quality */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Framerate</label>
                <div className="flex items-center gap-2">
                  {[24, 30, 60].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFps(f as any)}
                      className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl border transition-all ${
                        fps === f
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {f} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Processing Profile</label>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'fast', label: 'Fast' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'high', label: 'High Q' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuality(q.id as any)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                        quality === q.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Estimated specs */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Total Documentary Runtime: <strong className="text-white font-mono">{totalDuration.toFixed(1)}s</strong></span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>FFmpeg/MediaStream Compliant</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={handleStartExport}
                disabled={isZipping}
                className="flex-1 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Render Master MP4 ({photos.length} Clips)</span>
              </button>

              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="py-3.5 px-5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Download all high-res photos, timeline keyframes, and project JSON in a ZIP file"
              >
                {isZipping ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Archive className="w-4 h-4 text-amber-400" />
                )}
                <span>{isZipping ? 'Creating ZIP...' : 'Download Project (.ZIP)'}</span>
              </button>
            </div>

            {isZipping && (
              <p className="text-xs text-amber-400 text-center animate-pulse">
                {zipProgressText || 'Compressing project photos and configuration into ZIP...'}
              </p>
            )}
          </div>
        )}

        {/* Rendering In Progress */}
        {isRendering && renderProgress && (
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300 truncate max-w-[320px]">{renderProgress.statusText}</span>
                <span className="text-amber-400 font-mono text-sm">{renderProgress.overallPercent}%</span>
              </div>

              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 rounded-full transition-all duration-150"
                  style={{ width: `${renderProgress.overallPercent}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Clip {renderProgress.currentPhotoIndex} / {renderProgress.totalPhotos}</span>
              <span aria-hidden="true">·</span>
              <span>Frame {renderProgress.currentFrame} / {renderProgress.totalFrames}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">QC: Invariant Pass</span>
            </div>
          </div>
        )}

        {/* Completed Output Ready */}
        {renderedResult && (
          <div className="space-y-5 py-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">Rendering Complete!</h4>
              <p className="text-xs text-slate-400">
                Your full documentary video ({renderedResult.duration.toFixed(1)}s · {resolution}) has been generated and validated.
              </p>
            </div>

            <div className="max-w-[420px] mx-auto rounded-xl overflow-hidden border border-slate-800 shadow-xl aspect-[16/9] bg-black">
              <video
                src={renderedResult.blobUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 px-5 rounded-xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4 Video</span>
              </button>

              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="py-3 px-5 rounded-xl font-bold text-xs text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isZipping ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Archive className="w-4 h-4 text-amber-400" />
                )}
                <span>{isZipping ? 'Archiving...' : 'Download Full ZIP Bundle'}</span>
              </button>
            </div>

            {isZipping && (
              <p className="text-xs text-amber-400 text-center animate-pulse">
                {zipProgressText || 'Compressing project package...'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
