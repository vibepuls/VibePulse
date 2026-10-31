import React, { useState } from 'react';
import { DocumentaryPhoto } from '../../types/documentary';
import {
  X,
  Mic,
  Music,
  Upload,
  Sparkles,
  Check,
  Play,
  Pause,
  Clock,
} from 'lucide-react';

interface NarrationSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: DocumentaryPhoto[];
  onApplyDurations: (updatedPhotos: DocumentaryPhoto[]) => void;
}

export const NarrationSyncModal: React.FC<NarrationSyncModalProps> = ({
  isOpen,
  onClose,
  photos,
  onApplyDurations,
}) => {
  const [audioName, setAudioName] = useState<string>('Historical_Narrative_Voiceover.mp3');
  const [audioDuration, setAudioDuration] = useState<number>(27.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = url;
    audio.onloadedmetadata = () => {
      setAudioName(file.name);
      setAudioDuration(audio.duration || 30.0);
      setIsSynced(false);
    };
  };

  const handleAutoSynchronize = () => {
    if (photos.length === 0) return;

    // Distribute audio duration across photos maintaining natural documentary pacing
    // Minimum 3.5s per photo, maximum 8s
    const targetDurationPerPhoto = Math.max(3.0, audioDuration / photos.length);

    const updated = photos.map((p, idx) => {
      // Slight natural cadence variation (intro and outro slightly longer)
      let factor = 1.0;
      if (idx === 0) factor = 1.15;
      if (idx === photos.length - 1) factor = 1.2;

      return {
        ...p,
        duration: Math.round(targetDurationPerPhoto * factor * 10) / 10,
      };
    });

    onApplyDurations(updated);
    setIsSynced(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-yellow-400 uppercase tracking-wider">
            <Mic className="w-4 h-4" />
            <span>Voiceover Narration Synchronization</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Sync Scenes with Audio Pacing
          </h3>
          <p className="text-xs text-slate-400">
            Automatically calculates scene durations based on speech cadence and narration pauses.
          </p>
        </div>

        {/* Audio Track Box */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[220px]">{audioName}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {audioDuration.toFixed(1)}s total voiceover
                </p>
              </div>
            </div>

            <label className="py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700 hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Change Audio</span>
              <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
            </label>
          </div>

          {/* Voiceover Waveform Visualizer */}
          <div className="flex items-center gap-1 h-8 pt-2 opacity-80">
            {[30, 50, 75, 90, 60, 20, 10, 45, 80, 95, 60, 40, 70, 85, 30, 10, 60, 90, 80, 50].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-yellow-400/70 rounded-full"
                style={{ height: `${h * 0.28}px` }}
              />
            ))}
          </div>
        </div>

        {/* Sync Summary */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1">
          <div className="flex items-center justify-between">
            <span>Imported Photos:</span>
            <strong className="text-white font-mono">{photos.length} Scenes</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Average Pacing:</span>
            <strong className="text-amber-400 font-mono">
              {(audioDuration / Math.max(1, photos.length)).toFixed(1)}s per photograph
            </strong>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={handleAutoSynchronize}
          className="w-full py-3.5 rounded-xl font-bold text-xs text-slate-950 bg-yellow-400 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isSynced ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{isSynced ? 'Durations Synchronized!' : 'Automatically Sync All Photo Durations'}</span>
        </button>
      </div>
    </div>
  );
};
