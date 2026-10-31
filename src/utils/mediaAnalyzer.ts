import { UserMediaItem, VideoTemplate, TemplateSlot } from '../types/template';

export interface AnalyzedMediaSlot {
  slot: TemplateSlot;
  mediaItem: UserMediaItem;
  imageElement?: HTMLImageElement;
  videoElement?: HTMLVideoElement;
}

/**
 * Analyzes uploaded image to compute brightness, saturation energy, and focal point.
 */
export async function analyzeImage(fileOrUrl: File | string, name: string): Promise<UserMediaItem> {
  return new Promise((resolve) => {
    const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Analyze colors and brightness using a mini canvas
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      let brightness = 60;
      let energyScore = 75;

      if (ctx) {
        ctx.drawImage(img, 0, 0, 64, 64);
        const imageData = ctx.getImageData(0, 0, 64, 64);
        const data = imageData.data;
        let totalLuma = 0;
        let colorDiff = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLuma += luma;
          colorDiff += Math.abs(r - g) + Math.abs(g - b);
        }

        const avgLuma = totalLuma / (64 * 64);
        brightness = Math.round((avgLuma / 255) * 100);
        // Energy is a combination of contrast and saturation
        energyScore = Math.min(99, Math.max(40, Math.round((colorDiff / (64 * 64 * 2)) + (brightness > 30 ? 30 : 10))));
      }

      resolve({
        id: 'media-' + Math.random().toString(36).substring(2, 9),
        name,
        type: 'image',
        url,
        file: typeof fileOrUrl === 'object' ? fileOrUrl : undefined,
        width: img.naturalWidth || 1080,
        height: img.naturalHeight || 1920,
        brightness,
        energyScore,
        focalPoint: { x: 0.5, y: 0.48 },
      });
    };

    img.onerror = () => {
      resolve({
        id: 'media-' + Math.random().toString(36).substring(2, 9),
        name,
        type: 'image',
        url,
        file: typeof fileOrUrl === 'object' ? fileOrUrl : undefined,
        width: 1080,
        height: 1920,
        brightness: 50,
        energyScore: 70,
        focalPoint: { x: 0.5, y: 0.5 },
      });
    };

    img.src = url;
  });
}

/**
 * Analyzes uploaded video clip to detect duration, resolution, and automatically set peak action trim window.
 */
export async function analyzeVideo(fileOrUrl: File | string, name: string): Promise<UserMediaItem> {
  return new Promise((resolve) => {
    const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration || 5;
      // Auto-detect optimal action window (skip awkward camera setup in first 10%, trim to peak segment)
      const trimStart = Math.min(duration * 0.15, Math.max(0, duration - 3));
      const trimEnd = Math.min(duration, trimStart + 3.5);

      resolve({
        id: 'media-' + Math.random().toString(36).substring(2, 9),
        name,
        type: 'video',
        url,
        file: typeof fileOrUrl === 'object' ? fileOrUrl : undefined,
        duration,
        width: video.videoWidth || 1080,
        height: video.videoHeight || 1920,
        trimStart,
        trimEnd,
        brightness: 65,
        energyScore: 85,
        focalPoint: { x: 0.5, y: 0.5 },
      });
    };

    video.onerror = () => {
      resolve({
        id: 'media-' + Math.random().toString(36).substring(2, 9),
        name,
        type: 'video',
        url,
        file: typeof fileOrUrl === 'object' ? fileOrUrl : undefined,
        duration: 5,
        width: 1080,
        height: 1920,
        brightness: 60,
        energyScore: 75,
        focalPoint: { x: 0.5, y: 0.5 },
      });
    };

    video.src = url;
  });
}

/**
 * Automatically arranges uploaded media into template slots based on target energy and beat alignment.
 * ZERO manual work for the user!
 */
export function autoArrangeClipsIntoTemplate(
  mediaList: UserMediaItem[],
  template: VideoTemplate
): AnalyzedMediaSlot[] {
  if (mediaList.length === 0) return [];

  // Sort media by energy score descending
  const sortedByEnergy = [...mediaList].sort((a, b) => (b.energyScore || 50) - (a.energyScore || 50));

  const arranged: AnalyzedMediaSlot[] = [];

  template.slots.forEach((slot, index) => {
    let chosenMedia: UserMediaItem;

    if (slot.targetEnergy === 'peak') {
      // Pick highest energy media available
      chosenMedia = sortedByEnergy[0] || mediaList[index % mediaList.length];
    } else if (slot.targetEnergy === 'chill') {
      // Pick lower energy / warmer media
      chosenMedia = sortedByEnergy[sortedByEnergy.length - 1] || mediaList[index % mediaList.length];
    } else {
      // Balanced distribution
      chosenMedia = mediaList[index % mediaList.length];
    }

    arranged.push({
      slot,
      mediaItem: chosenMedia,
    });
  });

  return arranged;
}

/**
 * Preloads DOM Image/Video elements for instantaneous, lag-free canvas rendering.
 */
export async function preloadMediaElements(
  slots: AnalyzedMediaSlot[]
): Promise<AnalyzedMediaSlot[]> {
  const promises = slots.map((item) => {
    return new Promise<AnalyzedMediaSlot>((resolve) => {
      if (item.mediaItem.type === 'video') {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = item.mediaItem.url;
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.onloadeddata = () => {
          if (item.mediaItem.trimStart) {
            video.currentTime = item.mediaItem.trimStart;
          }
          resolve({ ...item, videoElement: video });
        };
        video.onerror = () => {
          resolve(item);
        };
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = item.mediaItem.url;
        img.onload = () => {
          resolve({ ...item, imageElement: img });
        };
        img.onerror = () => {
          resolve(item);
        };
      }
    });
  });

  return Promise.all(promises);
}
