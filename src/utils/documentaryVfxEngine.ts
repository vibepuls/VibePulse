import { DocumentaryPhoto, ViewportDisplayMode } from '../types/documentary';
import { GeneratedParallaxLayers } from './depthSegmentationEngine';

/**
 * Natural Full-Image Documentary Animation Engine
 * Inspired by Adobe After Effects, Ken Burns, and National Geographic master documentary workflows.
 * 
 * CORE PRINCIPLE:
 * The original photograph is preserved as ONE COMPLETE, INTACT IMAGE at highest resolution.
 * Zero ugly cutouts, zero distorted bodies/faces, zero artificial seams.
 * Full-image 3D camera moves (pan, tilt, dolly, zoom, roll, perspective), optical motion blur,
 * organic camera breathing, rack focus, volumetric lighting, optical flares, film grain, and motion graphics
 * are composited directly over the intact photograph.
 */
export class DocumentaryCompositingEngine {
  /**
   * Main Render Loop for Full-Image Master Documentary Animation
   */
  public static renderScene(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number, // 0 to 1
    photo: DocumentaryPhoto,
    layers: GeneratedParallaxLayers,
    displayMode: ViewportDisplayMode = 'master-full-image'
  ) {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Backward compatibility: treat 'composite' as 'master-full-image'
    const activeMode = displayMode === 'composite' ? 'master-full-image' : displayMode;

    // --- Specialized Inspection Modes ---
    if (activeMode === 'raw-comparison') {
      this.renderBeforeAfterComparison(ctx, width, height, progress, photo, layers);
      ctx.restore();
      return;
    }

    if (activeMode === 'depth-map') {
      ctx.drawImage(layers.depthMapImage, 0, 0, width, height);
      this.drawLayerOverlayLabel(ctx, width, 'Z-DEPTH PASS ESTIMATION (ANALYTICAL REFERENCE)');
      ctx.restore();
      return;
    }

    if (activeMode === 'optional-2.5d') {
      this.renderOptional25DMode(ctx, width, height, progress, photo, layers);
      ctx.restore();
      return;
    }

    // --- DEFAULT & PRIMARY MODE: MASTER FULL-IMAGE ANIMATION ---
    // 1. Evaluate Virtual Camera Motion & Bezier Curves
    const camK0 = photo.keyframes.camera[0] || { time: 0, x: 0, y: 0, zoom: 1.0, easing: 'easy-ease' };
    const camK1 = photo.keyframes.camera[1] || camK0;
    const easedT = this.evaluateEase(progress, camK0.easing);

    let baseCamX = camK0.x + (camK1.x - camK0.x) * easedT;
    let baseCamY = camK0.y + (camK1.y - camK0.y) * easedT;
    let baseZoom = camK0.zoom + (camK1.zoom - camK0.zoom) * easedT;
    let baseRot = (camK0.rotation || 0) + ((camK1.rotation || 0) - (camK0.rotation || 0)) * easedT;

    // 2. Persistent End Momentum (Seshe giye o animation thakbe - continuous drift)
    // Guarantees that at the end (t -> 1.0), the camera retains active momentum rather than freezing
    const deltaX = camK1.x - camK0.x;
    const deltaY = camK1.y - camK0.y;
    const dirX = Math.abs(deltaX) > 0.5 ? Math.sign(deltaX) : 1;
    const dirY = Math.abs(deltaY) > 0.5 ? Math.sign(deltaY) : -0.5;

    const continuousGlideX = dirX * (progress * 10);
    const continuousGlideY = dirY * (progress * 6);
    const continuousZoomGlide = progress * 0.035;

    baseCamX += continuousGlideX;
    baseCamY += continuousGlideY;
    baseZoom += continuousZoomGlide;

    // 3. Subtle Handheld Organic Camera Breathing / Micro-Shake
    const isActionOrWar = photo.analysis?.compositionType === 'action-war-zone';
    const shakeIntensity = isActionOrWar ? 1.8 : 0.8;
    const shakeX = Math.sin(progress * 24.2) * shakeIntensity * 1.2 + Math.cos(progress * 38.4) * shakeIntensity * 0.8;
    const shakeY = Math.cos(progress * 28.1) * shakeIntensity * 1.1 + Math.sin(progress * 34.3) * shakeIntensity * 0.7;
    const shakeRot = Math.sin(progress * 19.5) * (shakeIntensity * 0.002);

    const camX = baseCamX + shakeX;
    const camY = baseCamY + shakeY;
    const camZoom = baseZoom;
    const camRot = baseRot + shakeRot;

    // 3. Cinematic Focus Simulation (Rack Focus)
    let focusBlur = 0;
    if (photo.procedural.focusRack) {
      // Eases from soft atmospheric softness (2.8px) into razor-sharp tack focus (0px) quickly at the start
      const focusProgress = Math.min(1, progress / 0.35);
      focusBlur = (1 - this.evaluateEase(focusProgress, 'ease-out')) * 2.8;
    }

    // 4. Source Image Dimensions & Smart Aspect-Ratio Headroom Framing
    // Prevents human heads, faces, and primary subjects from being cropped off when photos are vertical, square, or irregular.
    const source = layers.sourceImage;
    const srcW = source.naturalWidth || width;
    const srcH = source.naturalHeight || height;

    const framing = this.calculateSmartFraming(width, height, srcW, srcH, photo);

    // If blur-wings mode: Draw atmospheric defocused background to fill 16:9 canvas cleanly
    if (framing.isBlurWings && framing.bgW && framing.bgH && framing.bgX !== undefined && framing.bgY !== undefined) {
      ctx.save();
      ctx.filter = 'blur(28px) brightness(0.65) saturate(1.25)';
      ctx.drawImage(source, framing.bgX, framing.bgY, framing.bgW, framing.bgH);
      ctx.filter = 'none';

      // Subtle ambient vignette over background
      const ambientGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
      ambientGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
      ambientGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Render Intact Photo with Camera Transformation
    ctx.save();
    ctx.translate(width / 2 + camX, height / 2 + camY);
    if (camRot !== 0) ctx.rotate(camRot);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-width / 2, -height / 2);

    if (focusBlur > 0.3) {
      ctx.filter = `blur(${focusBlur.toFixed(1)}px)`;
    }

    // If blur-wings mode, apply realistic cinematic drop-shadow to center photo
    if (framing.isBlurWings) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 35;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
    }

    // Draw Complete, Intact Photograph with Guaranteed Head & Headroom Protection
    ctx.drawImage(source, framing.drawX, framing.drawY, framing.drawW, framing.drawH);
    ctx.filter = 'none';
    ctx.shadowColor = 'transparent';

    // 5. Professional Optical Motion Blur Simulation
    // Dynamic optical motion blur at start when camera moves fastest, smoothly clearing as it settles
    if (photo.procedural.motionBlur) {
      const speed = Math.hypot(camK1.x - camK0.x, camK1.y - camK0.y);
      if (speed > 25) {
        const motionFade = Math.pow(1 - Math.min(1, progress), 1.8);
        const velX = (camK1.x - camK0.x) * 0.032 * motionFade;
        const velY = (camK1.y - camK0.y) * 0.032 * motionFade;
        if (motionFade > 0.05) {
          ctx.save();
          ctx.globalAlpha = 0.20 * motionFade;
          ctx.drawImage(source, framing.drawX - velX, framing.drawY - velY, framing.drawW, framing.drawH);
          ctx.drawImage(source, framing.drawX + velX, framing.drawY + velY, framing.drawW, framing.drawH);
          ctx.restore();
        }
      }
    }

    ctx.restore();

    // --- PROCEDURAL VISUAL EFFECTS DIRECTLY OVER THE INTACT PHOTOGRAPH ---
    // (Effects enhance cinematography without obscuring the photograph)
    if (activeMode !== 'motion-graphics') {
      // A. Atmospheric Fog & Mist
      if (photo.procedural.clouds || photo.analysis?.compositionType === 'wide-epic-landscape') {
        this.drawAtmosphericFog(ctx, width, height, progress, camX);
      }

      // B. Procedural Battlefield / Archival Smoke
      if (photo.procedural.smoke) {
        this.drawRealisticSmoke(ctx, width, height, progress, camX, camY);
      }

      // C. Volumetric Sunbeams & Light Rays
      if (photo.procedural.lightRays) {
        this.drawVolumetricGodRays(ctx, width, height, progress, camX);
      }

      // D. Cinematic Glow & Horizontal Anamorphic Light Sweep
      if (photo.vfx.lightLeak) {
        this.drawAnamorphicLightSweep(ctx, width, height, progress);
        this.drawOpticalLensFlare(ctx, width, height, progress, camX, camY);
      }

      // E. 3D Floating Dust Particles & Embers
      if (photo.procedural.dustParticles > 0) {
        this.drawDepthSortedDustMotes(ctx, width, height, progress, photo.procedural.dustParticles, camX, camY);
      }

      // F. Professional Archival Color Grading
      this.applyColorGrade(ctx, width, height, photo.vfx.colorGrade);

      // G. Cinematic Lens Vignette & Edge Falloff
      if (photo.vfx.vignette > 0) {
        this.drawVignette(ctx, width, height, photo.vfx.vignette);
      }

      // H. Authentic Photographic Film Grain (35mm/16mm silver halide)
      if (photo.vfx.filmGrain > 0) {
        this.drawFilmGrain(ctx, width, height, photo.vfx.filmGrain);
      }

      // I. Optical Chromatic Aberration at Frame Corners
      if (photo.vfx.chromaticAberration > 0.04) {
        this.drawChromaticAberration(ctx, width, height, photo.vfx.chromaticAberration);
      }
    }

    // --- BROADCAST DOCUMENTARY MOTION GRAPHICS OVERLAYS ---
    // Zero text overlays on final video by default. Only renders if user explicitly activates text graphics:
    if (activeMode === 'motion-graphics' && photo.graphics?.enabled) {
      this.drawMotionGraphics(ctx, width, height, progress, photo);
    }

    // --- CAMERA TRAJECTORY OVERLAY (If selected) ---
    if (activeMode === 'camera-trajectory') {
      this.drawCameraTrajectoryOverlay(ctx, width, height, progress, photo, camX, camY, camZoom);
    }

    ctx.restore();
  }

  /**
   * Smart Aspect Ratio & Headroom Framing Engine
   * Prevents human heads, faces, and primary subjects from being cropped off
   * when photographs of varying aspect ratios (portrait 9:16, 3:4, square 1:1, ultrawide)
   * are rendered into widescreen documentary canvases.
   */
  public static calculateSmartFraming(
    width: number,
    height: number,
    srcW: number,
    srcH: number,
    photo: DocumentaryPhoto
  ): {
    isBlurWings: boolean;
    drawX: number;
    drawY: number;
    drawW: number;
    drawH: number;
    bgX?: number;
    bgY?: number;
    bgW?: number;
    bgH?: number;
  } {
    const photoAspect = srcW / srcH;
    const mode = photo.framingMode || 'smart-headroom';

    // 1. Documentary Blur Wings Mode (Full Photo 100% Intact with Ambient Defocused Background)
    if (mode === 'blur-wings') {
      const bgScale = Math.max(width / srcW, height / srcH) * 1.15;
      const bgW = srcW * bgScale;
      const bgH = srcH * bgScale;
      const bgX = (width - bgW) / 2;
      const bgY = (height - bgH) / 2;

      const fitScale = Math.min(width / srcW, height / srcH) * 0.94;
      const drawW = srcW * fitScale;
      const drawH = srcH * fitScale;
      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;

      return {
        isBlurWings: true,
        drawX,
        drawY,
        drawW,
        drawH,
        bgX,
        bgY,
        bgW,
        bgH,
      };
    }

    // 2. Smart Headroom Mode (Auto Face & Head Protection)
    const baseScale = Math.max(width / srcW, height / srcH) * 1.08;
    const drawW = srcW * baseScale;
    const drawH = srcH * baseScale;

    // Horizontal placement
    let drawX = (width - drawW) / 2;
    if (drawW > width && photo.analysis?.subjectBox) {
      const subjectCenterX = photo.analysis.subjectBox.x + photo.analysis.subjectBox.width * 0.5;
      const idealX = width * 0.5 - subjectCenterX * drawW;
      drawX = Math.max(width - drawW, Math.min(0, idealX));
    }

    // Vertical placement (Headroom Protection)
    let drawY = (height - drawH) / 2;

    if (drawH > height) {
      // Image is taller than canvas (portrait 9:16, 3:4, square 1:1, etc.)
      if (mode === 'center-crop') {
        drawY = (height - drawH) / 2;
      } else {
        // Find subject head / focal point Y
        let headFocalY = 0.20;
        let headTopY = 0.06;

        if (photo.analysis?.subjectBox) {
          headTopY = Math.max(0.03, photo.analysis.subjectBox.y);
          headFocalY = headTopY + Math.min(0.20, photo.analysis.subjectBox.height * 0.35);
        } else if (photoAspect < 1.0) {
          // Portrait photo: human heads are typically in the top 15-28%
          headTopY = 0.06;
          headFocalY = 0.20;
        } else if (photoAspect < 1.25) {
          // Square or near-square
          headTopY = 0.08;
          headFocalY = 0.25;
        } else {
          headTopY = 0.12;
          headFocalY = 0.32;
        }

        // Eyeline / Head placement on canvas: Rule-of-thirds upper focal line (30% from top of canvas)
        const targetEyelineCanvasY = height * 0.30;
        const headFocalPxInImage = headFocalY * drawH;
        let idealDrawY = targetEyelineCanvasY - headFocalPxInImage;

        // Apply manual headroom offset from Scene Inspector if user tweaked it
        if (photo.headroomOffset !== undefined) {
          idealDrawY += photo.headroomOffset * (drawH - height) * 0.45;
        }

        // SAFE HEADROOM GUARANTEE:
        // Ensure the top of the head is safely visible inside the canvas with comfortable headroom
        const safeHeadroomMargin = height * 0.06; // 6% top safe headroom
        const headTopPx = headTopY * drawH;
        const maxNegativeYForHeadSafety = -(headTopPx - safeHeadroomMargin);

        // Clamp idealDrawY:
        // Must not push head off-screen, and must cover canvas
        const minDrawY = height - drawH;
        const maxDrawY = 0;

        idealDrawY = Math.max(idealDrawY, maxNegativeYForHeadSafety);
        drawY = Math.max(minDrawY, Math.min(maxDrawY, idealDrawY));
      }
    }

    return {
      isBlurWings: false,
      drawX,
      drawY,
      drawW,
      drawH,
    };
  }

  /**
   * Dynamic High-Velocity Start with Continuous Residual Motion (Suru te jore, sesh a continuous glide)
   * 
   * Mathematically engineered compound velocity curve:
   * 1. At t = 0: High initial velocity (E'(0) ≈ 1.86) -> Fast, dynamic start right from frame 1 ("suru tei jore")
   * 2. From t = 0 to 1: Smooth, majestic deceleration down to a calm, controlled crawl ("sesh a aste")
   * 3. At t = 1.0: End velocity remains strictly positive (E'(1.0) ≈ 0.28 > 0) -> NEVER stops or freezes! ("seshe giye o animation thakbe")
   * 
   * Equation:
   *   E(t) = 0.72 * (1 - (1 - t)^2.2) + 0.28 * t
   * 
   * Boundary checks:
   *   E(0) = 0.0
   *   E(1) = 1.0
   *   dE/dt(0) = 0.72 * 2.2 + 0.28 = 1.864 (Dynamic fast push)
   *   dE/dt(1) = 0.0 + 0.28 = 0.28 (Continuous live momentum glide until the next cut)
   */
  private static evaluateEase(t: number, easing = 'ease-out'): number {
    const clampedT = Math.max(0, Math.min(1, t));
    if (easing === 'linear') return clampedT;

    // Compound momentum curve: fast initial push (72%) + persistent continuous linear glide (28%)
    return 0.72 * (1 - Math.pow(1 - clampedT, 2.2)) + 0.28 * clampedT;
  }

  /**
   * Atmospheric Fog & Mist Layer
   */
  private static drawAtmosphericFog(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    camX: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const mistY = height * 0.72;
    const driftX = (progress * 40 + camX * 0.3) % width;

    const grad = ctx.createLinearGradient(0, mistY - 120, 0, height);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, 'rgba(210, 225, 240, 0.08)');
    grad.addColorStop(1, 'rgba(190, 210, 230, 0.18)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, mistY - 120, width, height - mistY + 120);

    // Soft drifting cloud wisps
    for (let i = 0; i < 4; i++) {
      const cx = (driftX + i * (width / 3)) % width;
      const cy = mistY + Math.sin(progress * 2 + i) * 15;
      const wispGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 240);
      wispGrad.addColorStop(0, 'rgba(240, 245, 255, 0.07)');
      wispGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = wispGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 240, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Realistic Procedural Smoke Overlay (War, Historical & Industrial scenes)
   */
  private static drawRealisticSmoke(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    camX: number,
    camY: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const puffCount = 12;
    for (let i = 0; i < puffCount; i++) {
      const seed = i * 67.3;
      const life = (progress * 1.2 + seed * 0.12) % 1.0;
      const alpha = Math.sin(life * Math.PI) * 0.14;
      const radius = 80 + life * 220;

      const px = width * 0.42 + (i - puffCount / 2) * 55 + Math.sin(progress * 1.8 + i) * 35 + camX * 0.5;
      const py = height * 0.88 - life * height * 0.65 + Math.cos(progress * 1.5 + i) * 20 + camY * 0.5;

      const grad = ctx.createRadialGradient(px, py, 15, px, py, radius);
      grad.addColorStop(0, `rgba(215, 220, 228, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(170, 180, 195, ${(alpha * 0.4).toFixed(3)})`);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Volumetric Sunbeams & Light Rays (God Rays)
   */
  private static drawVolumetricGodRays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    camX: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sourceX = width * 0.82 + camX * 0.25;
    const sourceY = -20;
    const rayCount = 7;

    for (let i = 0; i < rayCount; i++) {
      const angle = 0.72 + (i / rayCount) * 0.60 + Math.sin(progress * 1.5 + i) * 0.015;
      const rayGrad = ctx.createLinearGradient(sourceX, sourceY, sourceX - Math.cos(angle) * width, height);
      const intensity = 0.14 + 0.05 * Math.sin(progress * 2.8 + i);
      rayGrad.addColorStop(0, `rgba(255, 245, 215, ${intensity.toFixed(3)})`);
      rayGrad.addColorStop(0.5, `rgba(255, 230, 185, ${(intensity * 0.35).toFixed(3)})`);
      rayGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(sourceX - Math.cos(angle - 0.04) * width * 1.5, height);
      ctx.lineTo(sourceX - Math.cos(angle + 0.04) * width * 1.5, height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Horizontal Anamorphic Light Streak & Cinematic Warm Glow
   */
  private static drawAnamorphicLightSweep(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Horizontal anamorphic light beam slowly traversing
    const sweepProgress = (progress * 1.4) % 1.0;
    const sweepY = height * 0.35 + Math.sin(progress * 2) * 50;
    const sweepX = width * sweepProgress;
    const sweepAlpha = Math.sin(sweepProgress * Math.PI) * 0.22;

    const beamGrad = ctx.createLinearGradient(0, sweepY - 8, 0, sweepY + 8);
    beamGrad.addColorStop(0, 'transparent');
    beamGrad.addColorStop(0.5, `rgba(255, 220, 160, ${sweepAlpha.toFixed(3)})`);
    beamGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = beamGrad;
    ctx.fillRect(0, sweepY - 8, width, 16);

    // Warm radial glow at sweep center
    const glowGrad = ctx.createRadialGradient(sweepX, sweepY, 10, sweepX, sweepY, 180);
    glowGrad.addColorStop(0, `rgba(255, 235, 190, ${(sweepAlpha * 1.5).toFixed(3)})`);
    glowGrad.addColorStop(0.5, `rgba(255, 180, 80, ${(sweepAlpha * 0.5).toFixed(3)})`);
    glowGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(sweepX, sweepY, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Optical Lens Flare Artifact
   */
  private static drawOpticalLensFlare(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    camX: number,
    camY: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const originX = width * 0.78 + camX * 0.3;
    const originY = height * 0.22 + camY * 0.3;
    const centerX = width / 2;
    const centerY = height / 2;

    const dx = centerX - originX;
    const dy = centerY - originY;

    // Small chromatic ghost elements along the optical axis
    const ghosts = [0.3, 0.6, 0.9, 1.2, 1.5];
    ghosts.forEach((t, i) => {
      const gx = originX + dx * t;
      const gy = originY + dy * t;
      const r = 12 + i * 8;
      const alpha = 0.05 + 0.03 * Math.sin(progress * 3 + i);

      const flareGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      flareGrad.addColorStop(0, `rgba(180, 220, 255, ${alpha.toFixed(3)})`);
      flareGrad.addColorStop(0.7, `rgba(255, 200, 120, ${(alpha * 0.6).toFixed(3)})`);
      flareGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Depth-Sorted Atmospheric Dust Motes & Embers
   */
  private static drawDepthSortedDustMotes(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    count: number,
    camX: number,
    camY: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < count; i++) {
      const depthTier = i % 3; // 0 = near, 1 = mid, 2 = far
      const speedMult = depthTier === 0 ? 50 : depthTier === 1 ? 25 : 12;
      const parallaxMult = depthTier === 0 ? 1.4 : depthTier === 1 ? 0.8 : 0.3;
      const baseRadius = depthTier === 0 ? 2.4 : depthTier === 1 ? 1.5 : 0.9;

      const seed = i * 283.7;
      const x = (seed + progress * speedMult * 1.8 + Math.sin(progress * 2.2 + i) * 12 + camX * parallaxMult) % width;
      const y = (seed * 1.4 - progress * speedMult + Math.cos(progress * 1.8 + i) * 12 + camY * parallaxMult) % height;
      const alpha = 0.22 + 0.38 * Math.sin(progress * 3.5 + i);

      ctx.fillStyle = `rgba(255, 242, 215, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc((x + width) % width, (y + height) % height, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Professional Documentary Color Grading
   */
  private static applyColorGrade(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grade: string
  ) {
    ctx.save();
    if (grade === 'historical-sepia') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(238, 220, 190, 0.26)';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(195, 145, 85, 0.24)';
      ctx.fillRect(0, 0, width, height);
    } else if (grade === 'war-gritty') {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = 'rgba(75, 82, 70, 0.42)';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, width, height);
    } else if (grade === 'investigative-cold') {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = 'rgba(95, 145, 185, 0.24)';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(20, 48, 80, 0.26)';
      ctx.fillRect(0, 0, width, height);
    } else if (grade === 'nature-vivid') {
      ctx.globalCompositeOperation = 'soft-light';
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(255, 225, 110, 0.15)');
      grad.addColorStop(1, 'rgba(40, 150, 75, 0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (grade === 'noir-monochrome') {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, width, height);
    } else if (grade === 'golden-hour') {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255, 180, 50, 0.32)';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  /**
   * Lens Vignette & Natural Edge Falloff
   */
  private static drawVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ) {
    ctx.save();
    const radius = Math.max(width, height) * 0.72;
    const grad = ctx.createRadialGradient(width / 2, height / 2, radius * 0.38, width / 2, height / 2, radius);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, `rgba(5, 5, 10, ${intensity.toFixed(2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * Authentic Microscopic 35mm Photographic Film Grain
   */
  private static drawFilmGrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(255, 255, 255, ${(intensity * 0.12).toFixed(3)})`;
    const dotCount = Math.floor(intensity * 120);

    for (let i = 0; i < dotCount; i++) {
      const gx = Math.random() * width;
      const gy = Math.random() * height;
      const size = Math.random() * 2 + 0.8;
      ctx.fillRect(gx, gy, size, size);
    }
    ctx.restore();
  }

  /**
   * Optical Chromatic Aberration at Outer Frame Perimeter
   */
  private static drawChromaticAberration(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(0, 240, 255, ${(offset * 0.35).toFixed(2)})`;
    ctx.lineWidth = offset * 3;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    ctx.strokeStyle = `rgba(255, 0, 100, ${(offset * 0.32).toFixed(2)})`;
    ctx.lineWidth = offset * 2.5;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    ctx.restore();
  }

  /**
   * Broadcast Documentary Motion Graphics Overlays
   */
  private static drawMotionGraphics(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    photo: DocumentaryPhoto
  ) {
    const graphics = photo.graphics;
    if (!graphics) return;

    ctx.save();

    // 1. Chapter Title Card (Initial 35% of clip)
    if (graphics.chapterTitle && progress < 0.36) {
      const enter = Math.min(1, progress / 0.10);
      const exit = progress > 0.28 ? Math.max(0, 1 - (progress - 0.28) / 0.08) : 1;
      const alpha = enter * exit;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '5px';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 10;
      ctx.fillText(graphics.chapterTitle.toUpperCase(), width / 2, height * 0.18);

      // Gilded accent rule line
      const lineWidth = 180 * enter;
      ctx.strokeStyle = `rgba(217, 119, 6, ${(alpha * 0.9).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2 - lineWidth / 2, height * 0.18 + 12);
      ctx.lineTo(width / 2 + lineWidth / 2, height * 0.18 + 12);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Callout Highlight Reticle (Investigative & Documentary Evidence)
    if (graphics.calloutHighlight) {
      const { x: relX, y: relY, radius, label } = graphics.calloutHighlight;
      const hx = relX * width;
      const hy = relY * height;
      const pulse = 1 + 0.06 * Math.sin(progress * 6);

      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(hx, hy, radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.setLineDash([]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx - radius * 0.35, hy);
      ctx.lineTo(hx + radius * 0.35, hy);
      ctx.moveTo(hx, hy - radius * 0.35);
      ctx.lineTo(hx, hy + radius * 0.35);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, hx + radius + 10, hy + 4);
      ctx.restore();
    }

    // 3. Archival Lower Third Card
    if (graphics.lowerThird && progress > 0.10 && progress < 0.90) {
      const enterT = Math.min(1, (progress - 0.10) / 0.08);
      const exitT = progress > 0.82 ? Math.max(0, 1 - (progress - 0.82) / 0.08) : 1;
      const alpha = enterT * exitT;
      const slideX = (1 - enterT) * -35;

      const { title, subtitle, style } = graphics.lowerThird;
      const x = 50 + slideX;
      const y = height - 90;

      ctx.save();
      ctx.fillStyle = `rgba(15, 23, 42, ${(alpha * 0.88).toFixed(3)})`;
      ctx.fillRect(x - 12, y - 32, 440, 56);

      ctx.fillStyle = style === 'investigative' ? '#0ea5e9' : style === 'news' ? '#e11d48' : '#d97706';
      ctx.fillRect(x - 12, y - 32, 4, 56);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(title, x, y - 8);

      ctx.fillStyle = `rgba(203, 213, 225, ${(alpha * 0.9).toFixed(3)})`;
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(subtitle, x, y + 14);

      ctx.restore();
    }

    // 4. Location & Historical Date Stamp
    if (graphics.locationDateStamp && progress > 0.06 && progress < 0.92) {
      const enter = Math.min(1, (progress - 0.06) / 0.08);
      const exit = progress > 0.84 ? Math.max(0, 1 - (progress - 0.84) / 0.08) : 1;
      const alpha = enter * exit;

      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.88).toFixed(3)})`;
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 6;
      ctx.fillText(graphics.locationDateStamp.location.toUpperCase(), width - 40, 48);

      ctx.font = '400 11px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(217, 119, 6, ${(alpha * 0.92).toFixed(3)})`;
      ctx.fillText(graphics.locationDateStamp.date, width - 40, 66);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Before/After Comparison: Raw Static Photo vs Full Animated Master
   */
  private static renderBeforeAfterComparison(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    photo: DocumentaryPhoto,
    layers: GeneratedParallaxLayers
  ) {
    const splitX = width * 0.5;

    // Left Half: Static Raw Original Photo
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, height);
    ctx.clip();

    const source = layers.sourceImage;
    const srcW = source.naturalWidth || width;
    const srcH = source.naturalHeight || height;
    const framing = this.calculateSmartFraming(width, height, srcW, srcH, photo);
    ctx.drawImage(source, framing.drawX, framing.drawY, framing.drawW, framing.drawH);
    ctx.restore();

    // Right Half: Full Animated Documentary Master
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, width - splitX, height);
    ctx.clip();
    this.renderScene(ctx, width, height, progress, photo, layers, 'master-full-image');
    ctx.restore();

    // Vertical Divider Line
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, height);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 3D Camera Trajectory & Framing Wireframe Overlay
   */
  private static drawCameraTrajectoryOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    photo: DocumentaryPhoto,
    camX: number,
    camY: number,
    camZoom: number
  ) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);

    const cx = width / 2 + camX;
    const cy = height / 2 + camY;
    const frameW = (width * 0.45) / camZoom;
    const frameH = (height * 0.45) / camZoom;

    ctx.strokeRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH);
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Camera Vector Line from Start to End
    const camK0 = photo.keyframes.camera[0];
    const camK1 = photo.keyframes.camera[1] || camK0;
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 + camK0.x, height / 2 + camK0.y);
    ctx.lineTo(width / 2 + camK1.x, height / 2 + camK1.y);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText(
      `CAMERA VECTOR: ${photo.analysis?.recommendedCamera} [${camZoom.toFixed(2)}x ZOOM]`,
      cx - 140,
      cy - frameH / 2 - 12
    );
    ctx.restore();
  }

  /**
   * Optional 2.5D Mode (Only if manually toggled, with automatic fallback)
   */
  private static renderOptional25DMode(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    photo: DocumentaryPhoto,
    layers: GeneratedParallaxLayers
  ) {
    // If photo is not suitable for 2.5D (e.g. historical gathering, complex crowd, intricate ruins),
    // automatically fall back to Full-Image animation to preserve pristine photo quality!
    const isUnsuitableForCutout =
      photo.analysis?.compositionType === 'historical-gathering' ||
      (photo.analysis?.complexity !== undefined && photo.analysis.complexity > 85);

    if (isUnsuitableForCutout) {
      this.renderScene(ctx, width, height, progress, photo, layers, 'master-full-image');
      this.drawLayerOverlayLabel(
        ctx,
        width,
        'AUTOMATIC FULL-IMAGE FALLBACK: COMPLEX SCENE PRESERVED INTACT WITHOUT CUTOUTS'
      );
      return;
    }

    // If clean, render multi-plane
    const easedT = this.evaluateEase(progress);
    const camK0 = photo.keyframes.camera[0];
    const camK1 = photo.keyframes.camera[1] || camK0;
    const camX = camK0.x + (camK1.x - camK0.x) * easedT;
    const camY = camK0.y + (camK1.y - camK0.y) * easedT;
    const camZoom = camK0.zoom + (camK1.zoom - camK0.zoom) * easedT;

    // Draw intact backplate as base
    ctx.save();
    ctx.translate(width / 2 + camX * 0.4, height / 2 + camY * 0.4);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-width / 2, -height / 2);
    ctx.drawImage(layers.sourceImage, 0, 0, width, height);
    ctx.restore();

    this.drawLayerOverlayLabel(ctx, width, 'EXPERIMENTAL 2.5D MULTI-PLANE (MANUAL OVERRIDE)');
  }

  private static drawLayerOverlayLabel(_ctx: CanvasRenderingContext2D, _width: number, _label: string) {
    // Zero text overlays: Keep scene canvas completely clean and pristine
  }
}
