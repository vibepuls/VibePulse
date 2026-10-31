import { DocumentaryPhoto } from '../types/documentary';
import { GeneratedParallaxLayers } from './depthSegmentationEngine';
import { DocumentaryCompositingEngine } from './documentaryVfxEngine';

export interface BatchRenderProgress {
  overallPercent: number;
  currentPhotoIndex: number;
  totalPhotos: number;
  currentFrame: number;
  totalFrames: number;
  statusText: string;
}

export class DocumentaryExporterEngine {
  /**
   * Batch renders all photos into a complete master documentary video file.
   */
  public static async exportMasterDocumentary(
    photos: DocumentaryPhoto[],
    layersMap: Map<string, GeneratedParallaxLayers>,
    fps = 30,
    width = 1920,
    height = 1080,
    onProgress: (p: BatchRenderProgress) => void
  ): Promise<{ blob: Blob; blobUrl: string; duration: number }> {
    return new Promise(async (resolve, reject) => {
      try {
        if (photos.length === 0) throw new Error('No photos to render');

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create canvas context');

        // Total duration calculation
        const totalDuration = photos.reduce((acc, p) => acc + p.duration, 0);
        const totalFrames = Math.floor(totalDuration * fps);

        // Canvas capture stream
        const stream = canvas.captureStream(fps);

        // Optional Web Audio tone / cinematic sound bed
        let audioCtx: AudioContext | null = null;
        try {
          const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtx = new AudioCtor();
          const dest = audioCtx.createMediaStreamDestination();

          // Ambient low rumble / cello resonance
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(55, audioCtx.currentTime); // A1 note
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(dest);
          osc.start();

          if (dest.stream.getAudioTracks().length > 0) {
            dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
          }
        } catch {
          // Audio optional
        }

        let mimeType = 'video/mp4;codecs=avc1';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 12000000, // 12 Mbps Full HD broadcast quality
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          if (audioCtx) {
            audioCtx.close().catch(() => {});
          }
          const blob = new Blob(chunks, { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          onProgress({
            overallPercent: 100,
            currentPhotoIndex: photos.length,
            totalPhotos: photos.length,
            currentFrame: totalFrames,
            totalFrames,
            statusText: 'Documentary Master Render Complete!',
          });
          resolve({ blob, blobUrl, duration: totalDuration });
        };

        recorder.start();

        // Sequential Frame Renderer
        let currentPhotoIdx = 0;
        let photoElapsed = 0;
        const frameDeltaSec = 1 / fps;
        let renderedFramesCount = 0;

        const renderLoop = () => {
          if (currentPhotoIdx >= photos.length || renderedFramesCount >= totalFrames) {
            recorder.stop();
            return;
          }

          const currentPhoto = photos[currentPhotoIdx];
          const layers = layersMap.get(currentPhoto.id);

          const progressInPhoto = Math.min(1, photoElapsed / currentPhoto.duration);

          if (layers) {
            DocumentaryCompositingEngine.renderScene(
              ctx,
              width,
              height,
              progressInPhoto,
              currentPhoto,
              layers,
              'master-full-image'
            );

            // Cinematic In-Camera Transition Overlay at head of clip (< 0.45s)
            const transDuration = 0.45;
            if (photoElapsed < transDuration && currentPhotoIdx > 0) {
              const transT = photoElapsed / transDuration;
              ctx.save();
              if (currentPhoto.transitionIn === 'fade-black') {
                ctx.fillStyle = `rgba(0, 0, 0, ${(1 - transT).toFixed(3)})`;
                ctx.fillRect(0, 0, width, height);
              } else if (currentPhoto.transitionIn === 'film-dissolve') {
                ctx.fillStyle = `rgba(20, 15, 10, ${(0.8 * (1 - transT)).toFixed(3)})`;
                ctx.fillRect(0, 0, width, height);
              } else if (currentPhoto.transitionIn === 'light-leak') {
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = `rgba(255, 200, 100, ${(0.6 * (1 - transT)).toFixed(3)})`;
                ctx.fillRect(0, 0, width, height);
              }
              ctx.restore();
            }
          }

          renderedFramesCount++;
          photoElapsed += frameDeltaSec;

          // Transition to next photo
          if (photoElapsed >= currentPhoto.duration) {
            currentPhotoIdx++;
            photoElapsed = 0;
          }

          const overallPercent = Math.min(99, Math.round((renderedFramesCount / totalFrames) * 98) + 1);
          onProgress({
            overallPercent,
            currentPhotoIndex: Math.min(currentPhotoIdx + 1, photos.length),
            totalPhotos: photos.length,
            currentFrame: renderedFramesCount,
            totalFrames,
            statusText: `Master Full-Image Rendering: Scene ${Math.min(currentPhotoIdx + 1, photos.length)}/${photos.length} (${currentPhoto.name}) · Intact Photo Preserved`,
          });

          setTimeout(renderLoop, (frameDeltaSec * 1000) * 0.6);
        };

        renderLoop();
      } catch (err) {
        reject(err);
      }
    });
  }
}
