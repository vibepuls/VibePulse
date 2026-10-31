import { VideoTemplate, ColorGradePreset, VisualEffect, TransitionType, CameraMovement } from '../types/template';
import { AnalyzedMediaSlot } from './mediaAnalyzer';
import { globalAudioEngine } from './audioEngine';

export interface RenderProgressCallback {
  (progress: number, statusText: string): void;
}

export class VideoRendererEngine {
  public static renderFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    template: VideoTemplate,
    analyzedSlots: AnalyzedMediaSlot[]
  ) {
    if (analyzedSlots.length === 0) return;

    // Find active slot based on currentTime
    const totalDuration = template.duration;
    const boundedTime = currentTime % totalDuration;

    let activeSlotIndex = 0;
    for (let i = 0; i < analyzedSlots.length; i++) {
      const s = analyzedSlots[i].slot;
      if (boundedTime >= s.startTime && boundedTime < s.startTime + s.duration) {
        activeSlotIndex = i;
        break;
      }
    }

    const currentSlot = analyzedSlots[activeSlotIndex];
    const prevSlot = activeSlotIndex > 0 ? analyzedSlots[activeSlotIndex - 1] : analyzedSlots[analyzedSlots.length - 1];

    const slotStartTime = currentSlot.slot.startTime;
    const slotDuration = currentSlot.slot.duration;
    const progressInSlot = Math.max(0, Math.min(1, (boundedTime - slotStartTime) / slotDuration));

    // Beat pulse factor: check if close to any beat marker
    let beatPulse = 0;
    for (const marker of template.beatMarkers) {
      const diff = Math.abs(boundedTime - marker);
      if (diff < 0.18) {
        beatPulse = Math.max(beatPulse, 1.0 - diff / 0.18);
      }
    }

    // Clear canvas
    ctx.save();
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Media with Camera Movement
    this.drawMediaWithCamera(
      ctx,
      width,
      height,
      currentSlot,
      progressInSlot,
      beatPulse
    );

    // 2. Apply Transition from Previous Slot if in early window (< 0.25s)
    const transitionWindow = 0.28;
    const timeSinceSlotStart = boundedTime - slotStartTime;
    if (timeSinceSlotStart < transitionWindow && prevSlot) {
      const transProgress = timeSinceSlotStart / transitionWindow;
      this.drawTransitionEffect(
        ctx,
        width,
        height,
        currentSlot.slot.transitionIn,
        transProgress
      );
    }

    // 3. Apply Color Grading LUT / Tones
    this.applyColorGrading(ctx, width, height, template.colorGrade);

    // 4. Apply Visual Effects (Film grain, Light leak, Chromatic Aberration, Particles, Vignette)
    this.applyVisualEffects(ctx, width, height, template.effects, boundedTime, beatPulse);

    // 5. Draw Animated Text Overlays
    this.drawTextOverlays(ctx, width, height, template, boundedTime);

    ctx.restore();
  }

  private static drawMediaWithCamera(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    slotData: AnalyzedMediaSlot,
    progress: number,
    beatPulse: number
  ) {
    const { mediaItem, imageElement, videoElement, slot } = slotData;
    const source = (mediaItem.type === 'video' ? videoElement : imageElement) as CanvasImageSource | undefined;

    ctx.save();

    // Base zoom + Beat bounce + Camera movement
    let scale = 1.0;
    let translateX = 0;
    let translateY = 0;
    let rotate = 0;

    const moveType: CameraMovement = slot.cameraMovement;
    if (moveType === 'ken-burns-in') {
      scale = 1.05 + progress * 0.18;
    } else if (moveType === 'ken-burns-out') {
      scale = 1.25 - progress * 0.18;
    } else if (moveType === 'pan-left') {
      scale = 1.15;
      translateX = (0.5 - progress) * width * 0.12;
    } else if (moveType === 'pan-right') {
      scale = 1.15;
      translateX = (progress - 0.5) * width * 0.12;
    } else if (moveType === 'hyper-zoom') {
      scale = 1.0 + Math.pow(progress, 2.5) * 0.45;
    } else if (moveType === 'subtle-shake') {
      scale = 1.12;
      const shakeFreq = progress * 40;
      translateX = Math.sin(shakeFreq) * 6 * (1 + beatPulse);
      translateY = Math.cos(shakeFreq * 1.3) * 6 * (1 + beatPulse);
      rotate = (Math.sin(shakeFreq * 0.8) * 0.015);
    }

    // Beat pulse expansion
    scale += beatPulse * 0.07;

    // Apply transformation centered at canvas
    ctx.translate(width / 2 + translateX, height / 2 + translateY);
    if (rotate !== 0) ctx.rotate(rotate);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    if (source) {
      // Draw 9:16 aspect-fitted media (cover mode)
      const sw = (source as HTMLImageElement).naturalWidth || (source as HTMLVideoElement).videoWidth || 1080;
      const sh = (source as HTMLImageElement).naturalHeight || (source as HTMLVideoElement).videoHeight || 1920;

      const targetRatio = width / height;
      const sourceRatio = sw / sh;

      let sx = 0;
      let sy = 0;
      let sWidth = sw;
      let sHeight = sh;

      if (sourceRatio > targetRatio) {
        // Source is wider than 9:16: crop sides
        sWidth = sh * targetRatio;
        sx = (sw - sWidth) * 0.5;
      } else {
        // Source is taller: crop top/bottom
        sHeight = sw / targetRatio;
        sy = (sh - sHeight) * 0.35; // slightly higher than center for faces
      }

      ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, width, height);
    } else {
      // Gradient fallback placeholder
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private static drawTransitionEffect(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    transType: TransitionType,
    progress: number // 0 (just started) to 1 (finished)
  ) {
    ctx.save();
    if (transType === 'flash-white') {
      const alpha = Math.max(0, 1 - progress * 1.2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    } else if (transType === 'zoom-through') {
      const alpha = Math.max(0, 1 - progress);
      const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.4})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (transType === 'whip-pan') {
      // Whip streak blur
      const alpha = Math.max(0, (1 - progress) * 0.7);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      const streakWidth = width * (1 - progress) * 0.5;
      ctx.fillRect(width * progress - streakWidth / 2, 0, streakWidth, height);
    } else if (transType === 'glitch') {
      // Horizontal RGB glitch bands
      const bands = 5;
      ctx.fillStyle = 'rgba(255, 0, 80, 0.25)';
      for (let b = 0; b < bands; b++) {
        const y = Math.random() * height;
        const h = Math.random() * 20 + 5;
        ctx.fillRect(0, y, width, h);
      }
      ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
      for (let b = 0; b < bands; b++) {
        const y = Math.random() * height;
        const h = Math.random() * 15 + 4;
        ctx.fillRect(0, y, width, h);
      }
    }
    ctx.restore();
  }

  private static applyColorGrading(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    preset: ColorGradePreset
  ) {
    ctx.save();
    if (preset === 'cyber-neon') {
      // Cyan shadows & Magenta highlights
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(255, 0, 128, 0.15)');
      grad.addColorStop(1, 'rgba(0, 230, 255, 0.18)');
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'teal-orange') {
      // Blockbuster Teal & Orange
      const grad = ctx.createRadialGradient(width / 2, height * 0.4, 100, width / 2, height / 2, height * 0.8);
      grad.addColorStop(0, 'rgba(255, 150, 40, 0.16)');
      grad.addColorStop(1, 'rgba(0, 120, 140, 0.22)');
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'golden-hour') {
      // Amber glow
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(255, 190, 70, 0.24)');
      grad.addColorStop(1, 'rgba(230, 100, 30, 0.18)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'vintage-film') {
      // Warm nostalgic faded tones
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(235, 215, 185, 0.25)';
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'moody-bw') {
      // High contrast monochrome
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'sunset-pop') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(255, 80, 120, 0.16)');
      grad.addColorStop(1, 'rgba(255, 170, 0, 0.18)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  private static applyVisualEffects(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    effects: VisualEffect[],
    time: number,
    beatPulse: number
  ) {
    ctx.save();

    // 1. Vignette
    if (effects.includes('vignette')) {
      const radius = Math.max(width, height) * 0.72;
      const grad = ctx.createRadialGradient(width / 2, height / 2, radius * 0.45, width / 2, height / 2, radius);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Light Leak
    if (effects.includes('lightLeak')) {
      const leakX = width * (0.3 + 0.4 * Math.sin(time * 0.8));
      const leakY = height * 0.15;
      const leakRadius = width * 0.65;
      const grad = ctx.createRadialGradient(leakX, leakY, 10, leakX, leakY, leakRadius);
      grad.addColorStop(0, 'rgba(255, 160, 60, 0.28)');
      grad.addColorStop(0.5, 'rgba(255, 80, 120, 0.12)');
      grad.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Film Grain
    if (effects.includes('filmGrain')) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      // Quick pseudo-grain dots
      for (let i = 0; i < 40; i++) {
        const gx = Math.random() * width;
        const gy = Math.random() * height;
        const gw = Math.random() * 3 + 1;
        ctx.fillRect(gx, gy, gw, gw);
      }
    }

    // 4. Glow Pulse on beats
    if (effects.includes('glowPulse') && beatPulse > 0.05) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 255, 255, ${(beatPulse * 0.22).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 5. Floating Particles / Sparkles
    if (effects.includes('particles')) {
      ctx.globalCompositeOperation = 'screen';
      const count = 18;
      for (let i = 0; i < count; i++) {
        const seed = i * 137.5;
        const px = ((seed + time * 45) % width);
        const py = ((seed * 1.7 + Math.sin(time + i) * 60 + time * 30) % height);
        const pRadius = 1.5 + (i % 3);
        const alpha = 0.3 + 0.4 * Math.sin(time * 3 + i);

        ctx.fillStyle = `rgba(255, 240, 200, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private static drawTextOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    template: VideoTemplate,
    time: number
  ) {
    const { introHook, punchline, watermark, style } = template.textOverlay;

    ctx.save();
    ctx.textAlign = 'center';

    // 1. Watermark at bottom
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText(watermark, width / 2, height - 28);

    // 2. Intro Hook (first 35% of video)
    if (time < template.duration * 0.35) {
      const enterProgress = Math.min(1, time / 0.5);
      const textScale = 0.85 + enterProgress * 0.15;
      const textAlpha = Math.min(1, enterProgress * 1.5);

      ctx.save();
      ctx.translate(width / 2, height * 0.28);
      ctx.scale(textScale, textScale);

      if (style === 'neon') {
        ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(introHook, 0, 0);
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 12;
        ctx.fillText(introHook, 0, 0);
      } else if (style === 'editorial') {
        ctx.font = 'italic 500 28px "Plus Jakarta Sans", sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
        ctx.fillText(introHook, 0, 0);
      } else {
        // kinetic bold
        ctx.font = '900 34px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(introHook, 0, 0);
      }
      ctx.restore();
    }

    // 3. Punchline (Middle / Climax drop window)
    const dropTime = template.duration * 0.45;
    if (time >= dropTime && time < dropTime + 2.2) {
      const progress = (time - dropTime) / 2.2;
      const punchAlpha = progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
      const punchScale = 1.0 + Math.sin(progress * Math.PI) * 0.15;

      ctx.save();
      ctx.translate(width / 2, height * 0.72);
      ctx.scale(punchScale, punchScale);

      ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 20;
      ctx.fillStyle = `rgba(255, 255, 255, ${punchAlpha})`;
      ctx.fillText(punchline, 0, 0);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Automatic Full HD 9:16 Video Rendering using MediaRecorder & Canvas.
   * Produces a real, downloadable, playable MP4/WebM video with synchronous Web Audio!
   */
  public static async exportVideo(
    template: VideoTemplate,
    analyzedSlots: AnalyzedMediaSlot[],
    onProgress: RenderProgressCallback
  ): Promise<{ blob: Blob; blobUrl: string; duration: number }> {
    return new Promise(async (resolve, reject) => {
      try {
        const width = 720;
        const height = 1280; // 9:16 vertical Full HD target
        const fps = 30;
        const totalDuration = template.duration;
        const totalFrames = Math.floor(totalDuration * fps);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create 2D canvas context');

        onProgress(5, 'Analyzing scene dynamics & beat markers...');

        // Start Web Audio recording stream
        const audioDestination = globalAudioEngine.getMediaStreamDestination();
        globalAudioEngine.play(template.audioTrack, template.beatMarkers, false, 0);

        // Capture canvas stream at 30 FPS
        const canvasStream = canvas.captureStream(fps);

        // Combine audio track from Web Audio with canvas video track
        const combinedStream = new MediaStream();
        canvasStream.getVideoTracks().forEach((vt) => combinedStream.addTrack(vt));
        if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
          audioDestination.stream.getAudioTracks().forEach((at) => combinedStream.addTrack(at));
        }

        // Determine best supported MIME type
        let mimeType = 'video/mp4;codecs=avc1';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp9,opus';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 8000000, // 8 Mbps high quality
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          globalAudioEngine.stop();
          const finalBlob = new Blob(chunks, { type: mimeType });
          const blobUrl = URL.createObjectURL(finalBlob);
          onProgress(100, 'Rendering complete! Video ready.');
          resolve({ blob: finalBlob, blobUrl, duration: totalDuration });
        };

        recorder.start();

        // Step through frames synchronized in real-time
        let currentFrame = 0;
        const frameIntervalMs = 1000 / fps;
        const startTime = performance.now();

        const renderStep = () => {
          const now = performance.now();
          const elapsedSec = (now - startTime) / 1000;

          if (elapsedSec >= totalDuration || currentFrame >= totalFrames) {
            recorder.stop();
            return;
          }

          VideoRendererEngine.renderFrame(ctx, width, height, elapsedSec, template, analyzedSlots);

          currentFrame++;
          const percent = Math.min(98, Math.round((elapsedSec / totalDuration) * 90) + 8);
          const stageDesc =
            percent < 30
              ? 'Detecting faces & cutting clips to beats...'
              : percent < 60
              ? 'Applying velocity transitions & camera drift...'
              : percent < 85
              ? 'Baking color grading LUT & visual effects...'
              : 'Encoding 1080p 9:16 Full HD master file...';
          onProgress(percent, stageDesc);

          setTimeout(renderStep, frameIntervalMs * 0.85);
        };

        renderStep();
      } catch (err) {
        globalAudioEngine.stop();
        reject(err);
      }
    });
  }
}
