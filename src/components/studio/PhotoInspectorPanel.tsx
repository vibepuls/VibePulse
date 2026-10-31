import React from 'react';
import { DocumentaryPhoto, TransitionType } from '../../types/documentary';
import {
  Sliders,
  Sparkles,
  Layers,
  Sun,
  Eye,
  Type,
  Move,
  Film,
  Cloud,
  Wind,
  User,
} from 'lucide-react';

interface PhotoInspectorPanelProps {
  photo: DocumentaryPhoto;
  onUpdatePhoto: (updated: DocumentaryPhoto) => void;
}

export const PhotoInspectorPanel: React.FC<PhotoInspectorPanelProps> = ({
  photo,
  onUpdatePhoto,
}) => {
  const handleVfxChange = (field: keyof DocumentaryPhoto['vfx'], value: any) => {
    onUpdatePhoto({
      ...photo,
      vfx: {
        ...photo.vfx,
        [field]: value,
      },
    });
  };

  const handleProceduralChange = (field: keyof DocumentaryPhoto['procedural'], value: any) => {
    onUpdatePhoto({
      ...photo,
      procedural: {
        ...photo.procedural,
        [field]: value,
      },
    });
  };

  const handleGraphicsChange = (title: string, subtitle: string) => {
    onUpdatePhoto({
      ...photo,
      graphics: {
        ...photo.graphics,
        lowerThird: {
          title,
          subtitle,
          style: photo.graphics?.lowerThird?.style || 'archival',
        },
      },
    });
  };

  return (
    <div className="w-80 bg-slate-950 border-l border-slate-800 p-4 space-y-6 overflow-y-auto scrollbar-thin text-xs select-none">
      {/* Panel Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5" />
          <span>Scene Inspector</span>
        </div>
        <h4 className="text-sm font-bold text-white truncate">{photo.name}</h4>
      </div>

      {/* AI Analysis Card */}
      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
          Documentary Scene Intelligence
        </span>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-500 block">Composition</span>
            <strong className="text-white capitalize">{photo.analysis?.compositionType}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Framing Mode</span>
            <strong className="text-emerald-400">100% Intact Photo</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Tone & Contrast</span>
            <strong className="text-white font-mono">{photo.analysis?.contrast}% Contrast</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Camera Dynamics</span>
            <strong className="text-amber-400 capitalize">{photo.analysis?.recommendedCamera?.replace(/-/g, ' ')}</strong>
          </div>
        </div>
      </div>

      {/* Smart Framing & Head Protection Card */}
      <div className="p-3 bg-slate-900/90 rounded-xl border border-amber-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            <User className="w-3.5 h-3.5" />
            <span>Face & Head Protection</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px]">
            Safe Headroom
          </span>
        </div>

        {/* Aspect Ratio Details */}
        <div className="flex items-center justify-between text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800">
          <span className="text-slate-400">Aspect Ratio</span>
          <span className="font-mono text-white">
            {photo.width} × {photo.height} (
            {photo.aspectRatio < 0.75
              ? '9:16 Portrait'
              : photo.aspectRatio < 1.15
              ? '1:1 Square'
              : photo.aspectRatio < 1.45
              ? '4:3 Standard'
              : '16:9 Landscape'}
            )
          </span>
        </div>

        {/* Framing Mode Selection */}
        <div className="space-y-1.5">
          <span className="text-slate-400 text-[11px] block">Framing Style</span>
          <div className="grid grid-cols-1 gap-1">
            {[
              {
                id: 'smart-headroom',
                label: 'Smart Headroom (Auto Face Protection)',
                desc: 'Protects heads & faces from top cropping',
              },
              {
                id: 'blur-wings',
                label: 'Documentary Blur Wings (100% Intact)',
                desc: 'Full photo with blurred ambient sides (zero crop)',
              },
              {
                id: 'center-crop',
                label: 'Center Crop',
                desc: 'Traditional center zoom',
              },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  onUpdatePhoto({
                    ...photo,
                    framingMode: opt.id as any,
                  })
                }
                className={`text-left p-2 rounded-lg border transition-all ${
                  (photo.framingMode || 'smart-headroom') === opt.id
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="font-semibold text-[11px]">{opt.label}</div>
                <div className="text-[10px] text-slate-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Headroom / Vertical Nudge Slider */}
        {(photo.framingMode || 'smart-headroom') !== 'blur-wings' && (
          <div className="space-y-1.5 pt-1 border-t border-slate-800/70">
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Vertical Position Nudge</span>
              <button
                onClick={() => onUpdatePhoto({ ...photo, headroomOffset: 0 })}
                className="text-[10px] text-amber-400 hover:underline cursor-pointer"
              >
                Reset Auto
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Head</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={photo.headroomOffset || 0}
                onChange={(e) =>
                  onUpdatePhoto({
                    ...photo,
                    headroomOffset: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[10px] text-slate-400">Body</span>
            </div>
          </div>
        )}
      </div>

      {/* Procedural Environmental Elements */}
      <div className="space-y-3">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          Procedural Environmental Elements
        </span>

        {/* Dust Particles */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span>3D Dust Motes & Embers</span>
            <span className="font-mono text-amber-400">{photo.procedural.dustParticles} particles</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="5"
            value={photo.procedural.dustParticles}
            onChange={(e) => handleProceduralChange('dustParticles', parseInt(e.target.value, 10))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Procedural Toggles */}
        <div className="pt-2 space-y-2 border-t border-slate-800/80">
          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-slate-400" />
              <span>Procedural Flowing Smoke</span>
            </div>
            <input
              type="checkbox"
              checked={photo.procedural.smoke}
              onChange={(e) => handleProceduralChange('smoke', e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <div className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span>Sky Horizon & Cloud Drift</span>
            </div>
            <input
              type="checkbox"
              checked={photo.procedural.clouds}
              onChange={(e) => handleProceduralChange('clouds', e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Volumetric Sunbeams (God Rays)</span>
            </div>
            <input
              type="checkbox"
              checked={photo.procedural.lightRays}
              onChange={(e) => handleProceduralChange('lightRays', e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Optical Rack Focus (DoF)</span>
            </div>
            <input
              type="checkbox"
              checked={photo.procedural.focusRack}
              onChange={(e) => handleProceduralChange('focusRack', e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded"
            />
          </label>
        </div>
      </div>

      {/* Visual Effects Sliders */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          Cinematic Visual Effects
        </span>

        {/* 35mm Film Grain */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span>35mm Archival Film Grain</span>
            <span className="font-mono text-amber-400">{Math.round(photo.vfx.filmGrain * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={photo.vfx.filmGrain}
            onChange={(e) => handleVfxChange('filmGrain', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Vignette */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span>Vignette Falloff</span>
            <span className="font-mono text-amber-400">{Math.round(photo.vfx.vignette * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={photo.vfx.vignette}
            onChange={(e) => handleVfxChange('vignette', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* Documentary Motion Graphics / Text Overlays */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Text Overlays & Titles
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-[10px] text-slate-400">Burn Text</span>
            <input
              type="checkbox"
              checked={photo.graphics?.enabled ?? false}
              onChange={(e) =>
                onUpdatePhoto({
                  ...photo,
                  graphics: {
                    ...photo.graphics,
                    enabled: e.target.checked,
                  },
                })
              }
              className="accent-amber-500 w-3.5 h-3.5 rounded"
            />
          </label>
        </div>

        {photo.graphics?.enabled ? (
          <div className="space-y-2 p-2 bg-slate-900/60 rounded-lg border border-slate-800">
            <div className="space-y-1">
              <label className="text-slate-400 block text-[11px]">Primary Headline</label>
              <input
                type="text"
                value={photo.graphics?.lowerThird?.title || ''}
                onChange={(e) => handleGraphicsChange(e.target.value, photo.graphics?.lowerThird?.subtitle || '')}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 block text-[11px]">Subtitle</label>
              <input
                type="text"
                value={photo.graphics?.lowerThird?.subtitle || ''}
                onChange={(e) => handleGraphicsChange(photo.graphics?.lowerThird?.title || '', e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-800/60 text-[11px] text-emerald-400/90 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Clean Mode: Zero Text Overlays on Video</span>
          </div>
        )}
      </div>

      {/* Transition Selector */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <label className="text-slate-400 block text-[11px]">Scene Transition</label>
        <select
          value={photo.transitionIn}
          onChange={(e) => onUpdatePhoto({ ...photo, transitionIn: e.target.value as TransitionType })}
          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
        >
          <option value="film-dissolve">Film Dissolve (Archival)</option>
          <option value="cross-dissolve">Cross Dissolve</option>
          <option value="fade-black">Fade Through Black</option>
          <option value="zoom-in">Zoom In Cut</option>
          <option value="whip-pan">Whip Pan Simulation</option>
          <option value="light-leak">Light Leak Burn</option>
        </select>
      </div>
    </div>
  );
};
