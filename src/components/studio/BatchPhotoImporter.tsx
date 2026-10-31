import React, { useRef } from 'react';
import { DocumentaryPhoto } from '../../types/documentary';
import { analyzeDocumentaryPhoto } from '../../utils/depthSegmentationEngine';
import { SAMPLE_DOCUMENTARY_PHOTOS } from '../../data/sampleDocumentaryProjects';
import {
  Upload,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FolderUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Images,
} from 'lucide-react';

interface BatchPhotoImporterProps {
  photos: DocumentaryPhoto[];
  activePhotoId: string;
  onSelectPhoto: (id: string) => void;
  onAddPhotos: (newPhotos: DocumentaryPhoto[]) => void;
  onRemovePhoto: (id: string) => void;
  onClearAll: () => void;
  onReorderPhotos: (fromIndex: number, toIndex: number) => void;
}

export const BatchPhotoImporter: React.FC<BatchPhotoImporterProps> = ({
  photos,
  activePhotoId,
  onSelectPhoto,
  onAddPhotos,
  onRemovePhoto,
  onClearAll,
  onReorderPhotos,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const importedPhotos: DocumentaryPhoto[] = [];
    const existingNames = new Set(photos.map((p) => p.name));

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) continue;

      const isDup = existingNames.has(file.name);
      const { photo } = await analyzeDocumentaryPhoto(file, file.name);
      photo.isDuplicate = isDup;
      importedPhotos.push(photo);
      existingNames.add(file.name);
    }

    onAddPhotos(importedPhotos);
  };

  const handleLoadSamples = () => {
    // Clone with verified unique IDs to eliminate any duplicate scene IDs
    const cloned = SAMPLE_DOCUMENTARY_PHOTOS.map((p, idx) => ({
      ...p,
      id: `doc-scene-${String(idx + 1).padStart(2, '0')}-${Date.now()}`,
    }));
    onAddPhotos(cloned);
  };

  const completedCount = photos.filter((p) => p.status === 'animated' || p.status === 'rendered').length;
  const failedCount = photos.filter((p) => p.status === 'failed').length;
  const totalSizeBytes = photos.reduce((acc, p) => acc + p.sizeBytes, 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4 space-y-3">
      {/* Top Controls Strip: Stats & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Project Statistics */}
        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Images className="w-4 h-4 text-amber-400" />
            <span>{photos.length} / 200 Photos</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>{totalSizeMb} MB total</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{completedCount} Animated</span>
          </div>
          {failedCount > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <div className="flex items-center gap-1 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{failedCount} Failed</span>
              </div>
            </>
          )}
        </div>

        {/* Import Triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSamples}
            className="py-1.5 px-3 rounded-lg text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Load 20 Archival Stills</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-1.5 px-3 rounded-lg text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Import Photos</span>
          </button>

          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory supported in modern browsers
            webkitdirectory="true"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => folderInputRef.current?.click()}
            className="py-1.5 px-3 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FolderUp className="w-3.5 h-3.5" />
            <span>Import Folder</span>
          </button>

          {photos.length > 0 && (
            <button
              onClick={onClearAll}
              className="py-1.5 px-2.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Remove All Photos"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Drag & Drop Carousel Strip */}
      {photos.length === 0 ? (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="block border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all"
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-200">
              Drag & Drop 1–200 Documentary Photographs here, or browse files / folders
            </p>
            <p className="text-[11px] text-slate-500">
              Supports high-res JPG, PNG, WEBP. Automatic 2.5D depth maps and layer separation are applied upon import.
            </p>
          </div>
        </label>
      ) : (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {photos.map((photo, idx) => {
            const isActive = photo.id === activePhotoId;
            return (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo.id)}
                className={`group relative shrink-0 w-32 md:w-36 rounded-xl overflow-hidden border cursor-pointer transition-all ${
                  isActive
                    ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                {/* 16:9 Thumbnail */}
                <div className="aspect-[16/9] w-full bg-slate-950 relative overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Index and Duration */}
                  <div className="absolute top-1 left-1.5 text-[9px] font-mono text-white/90 bg-black/60 px-1 rounded">
                    #{idx + 1}
                  </div>
                  <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-amber-300 bg-black/60 px-1 rounded">
                    {photo.duration.toFixed(1)}s
                  </div>
                </div>

                {/* Info & Reorder Controls */}
                <div className="p-1.5 bg-slate-950 flex items-center justify-between text-[10px] text-slate-300">
                  <span className="truncate max-w-[70px] font-medium" title={photo.name}>
                    {photo.name}
                  </span>

                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (idx > 0) onReorderPhotos(idx, idx - 1);
                      }}
                      disabled={idx === 0}
                      className="hover:text-white disabled:opacity-30 p-0.5"
                      title="Move Left"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (idx < photos.length - 1) onReorderPhotos(idx, idx + 1);
                      }}
                      disabled={idx === photos.length - 1}
                      className="hover:text-white disabled:opacity-30 p-0.5"
                      title="Move Right"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePhoto(photo.id);
                      }}
                      className="hover:text-rose-400 p-0.5 ml-0.5"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
