import React, { useState, useEffect } from 'react';
import { DocumentaryPhoto, DocumentaryStyleConfig, ProjectSettings, CameraMovePreset } from './types/documentary';
import { DOCUMENTARY_STYLES } from './data/documentaryStyles';
import { SAMPLE_DOCUMENTARY_PHOTOS } from './data/sampleDocumentaryProjects';
import { generate25DParallaxLayers, GeneratedParallaxLayers, generateVirtualCameraKeyframes } from './utils/depthSegmentationEngine';
import { DocNavbar } from './components/studio/DocNavbar';
import { BatchPhotoImporter } from './components/studio/BatchPhotoImporter';
import { StyleSelectorBar } from './components/studio/StyleSelectorBar';
import { AfterEffectsViewport } from './components/studio/AfterEffectsViewport';
import { AfterEffectsTimeline } from './components/studio/AfterEffectsTimeline';
import { PhotoInspectorPanel } from './components/studio/PhotoInspectorPanel';
import { ExportModal } from './components/studio/ExportModal';
import { NarrationSyncModal } from './components/studio/NarrationSyncModal';
import { exportProjectAsZip } from './utils/zipExporter';

export default function App() {
  const [photos, setPhotos] = useState<DocumentaryPhoto[]>([...SAMPLE_DOCUMENTARY_PHOTOS]);
  const [activePhotoId, setActivePhotoId] = useState<string>(SAMPLE_DOCUMENTARY_PHOTOS[0]?.id || '');
  const [activeStyle, setActiveStyle] = useState<DocumentaryStyleConfig>(DOCUMENTARY_STYLES[0]);
  const [layersMap, setLayersMap] = useState<Map<string, GeneratedParallaxLayers>>(new Map());

  const [isAnimatingAll, setIsAnimatingAll] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNarrationModal, setShowNarrationModal] = useState(false);

  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    projectName: 'The Hidden Archives · Master Documentary',
    style: 'historical',
    resolution: '1920x1080',
    fps: 24,
    qualityProfile: 'high-quality',
    autoMatchNarration: true,
    animationEngineMode: 'master-full-image',
    motionBlurEnabled: true,
    cameraShakeEnabled: true,
  });

  // Pre-generate 2.5D Parallax Layers for photos when loaded
  useEffect(() => {
    let isCancelled = false;

    const buildLayers = async () => {
      const newMap = new Map<string, GeneratedParallaxLayers>(layersMap);
      for (const photo of photos) {
        if (!newMap.has(photo.id)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = photo.url;
          await new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });

          if (!isCancelled) {
            const layers = await generate25DParallaxLayers(img, photo);
            newMap.set(photo.id, layers);
          }
        }
      }
      if (!isCancelled) {
        setLayersMap(new Map(newMap));
      }
    };

    buildLayers();
    return () => {
      isCancelled = true;
    };
  }, [photos]);

  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];
  const activeLayers = activePhoto ? layersMap.get(activePhoto.id) || null : null;

  // ONE-CLICK "ANIMATE ALL PHOTOS"
  const handleAnimateAll = async () => {
    setIsAnimatingAll(true);

    // Apply the chosen documentary style VFX, camera motion presets, and auto-keyframes across all photos
    const updatedPhotos = photos.map((p, idx) => {
      const preferredCam = activeStyle.preferredCameraMoves[idx % activeStyle.preferredCameraMoves.length];
      const keyframes = generateVirtualCameraKeyframes(preferredCam);

      return {
        ...p,
        keyframes,
        vfx: {
          ...p.vfx,
          filmGrain: activeStyle.vfxPresets.filmGrain,
          vignette: activeStyle.vfxPresets.vignette,
          dustParticles: activeStyle.vfxPresets.dustParticles,
          lightRays: activeStyle.vfxPresets.lightRays,
          lightLeak: activeStyle.vfxPresets.lightLeak,
          smokeHaze: activeStyle.vfxPresets.smokeHaze,
          chromaticAberration: activeStyle.vfxPresets.chromaticAberration,
          colorGrade: activeStyle.colorGrade,
        },
        duration: activeStyle.defaultDuration,
        transitionIn: activeStyle.transition,
        status: 'animated' as const,
      };
    });

    // Re-generate layers
    const newMap = new Map<string, GeneratedParallaxLayers>();
    for (const photo of updatedPhotos) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photo.url;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      const layers = await generate25DParallaxLayers(img, photo);
      newMap.set(photo.id, layers);
    }

    setPhotos(updatedPhotos);
    setLayersMap(newMap);
    setIsAnimatingAll(false);
  };

  const handleSelectStyle = (style: DocumentaryStyleConfig) => {
    setActiveStyle(style);
    setProjectSettings((prev) => ({ ...prev, style: style.id }));

    // Update current photos with the new style's color grade and VFX defaults
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        vfx: {
          ...p.vfx,
          filmGrain: style.vfxPresets.filmGrain,
          vignette: style.vfxPresets.vignette,
          dustParticles: style.vfxPresets.dustParticles,
          lightRays: style.vfxPresets.lightRays,
          lightLeak: style.vfxPresets.lightLeak,
          smokeHaze: style.vfxPresets.smokeHaze,
          colorGrade: style.colorGrade,
        },
        transitionIn: style.transition,
      }))
    );
  };

  const handleAddPhotos = (newPhotos: DocumentaryPhoto[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (!activePhotoId && newPhotos.length > 0) {
      setActivePhotoId(newPhotos[0].id);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (activePhotoId === id) {
      const remaining = photos.filter((p) => p.id !== id);
      if (remaining.length > 0) setActivePhotoId(remaining[0].id);
    }
  };

  const handleReorderPhotos = (fromIndex: number, toIndex: number) => {
    const updated = [...photos];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setPhotos(updated);
  };

  const handleUpdateDuration = (photoId: string, newDuration: number) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, duration: newDuration } : p))
    );
  };

  const handleUpdateCameraMove = (photoId: string, move: CameraMovePreset) => {
    const newKeyframes = generateVirtualCameraKeyframes(move);
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? {
              ...p,
              keyframes: newKeyframes,
              analysis: p.analysis ? { ...p.analysis, recommendedCamera: move } : undefined,
            }
          : p
      )
    );
  };

  const handleUpdatePhoto = (updated: DocumentaryPhoto) => {
    setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDownloadZip = async () => {
    try {
      await exportProjectAsZip({
        photos,
        settings: projectSettings,
        activeStyle,
      });
    } catch (err) {
      console.error('Failed to export ZIP:', err);
      alert('Could not export ZIP archive.');
    }
  };

  const totalSizeBytes = photos.reduce((acc, p) => acc + p.sizeBytes, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Professional Navigation Bar */}
      <DocNavbar
        settings={projectSettings}
        activeStyle={activeStyle}
        photoCount={photos.length}
        totalSizeBytes={totalSizeBytes}
        isAnimatingAll={isAnimatingAll}
        onAnimateAll={handleAnimateAll}
        onOpenExport={() => setShowExportModal(true)}
        onDownloadZip={handleDownloadZip}
        onOpenNarration={() => setShowNarrationModal(true)}
        showTimeline={showTimeline}
        onToggleTimeline={() => setShowTimeline(!showTimeline)}
      />

      {/* Documentary Style Selector Bar */}
      <StyleSelectorBar
        currentStyleId={activeStyle.id}
        onSelectStyle={handleSelectStyle}
      />

      {/* Batch Photo Importer Strip */}
      <BatchPhotoImporter
        photos={photos}
        activePhotoId={activePhotoId}
        onSelectPhoto={setActivePhotoId}
        onAddPhotos={handleAddPhotos}
        onRemovePhoto={handleRemovePhoto}
        onClearAll={() => setPhotos([])}
        onReorderPhotos={handleReorderPhotos}
      />

      {/* Central Studio Workspace: Canvas Viewport & Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {activePhoto ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 min-h-0">
              <AfterEffectsViewport
                photo={activePhoto}
                layers={activeLayers}
                onUpdateCameraMove={handleUpdateCameraMove}
              />
            </div>

            {/* Expandable Multi-Track Keyframe Timeline */}
            {showTimeline && (
              <AfterEffectsTimeline
                photo={activePhoto}
                onUpdateDuration={handleUpdateDuration}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
            <p>No photographs imported. Import 1–200 photos or click “1-Click Load 5 Archival Stills” above.</p>
          </div>
        )}

        {/* Right Inspector Panel */}
        {activePhoto && (
          <PhotoInspectorPanel
            photo={activePhoto}
            onUpdatePhoto={handleUpdatePhoto}
          />
        )}
      </div>

      {/* Export Master Video Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        photos={photos}
        layersMap={layersMap}
      />

      {/* Narration Sync Modal */}
      <NarrationSyncModal
        isOpen={showNarrationModal}
        onClose={() => setShowNarrationModal(false)}
        photos={photos}
        onApplyDurations={setPhotos}
      />
    </div>
  );
}
