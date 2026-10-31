export type DocumentaryStyleId =
  | 'historical'
  | 'war'
  | 'investigative'
  | 'political'
  | 'nature'
  | 'news'
  | 'emotional';

export type CameraMovePreset =
  | 'cinematic-slow-zoom'
  | 'dolly-in-rack-focus'
  | 'dolly-out-reveal'
  | 'truck-left-parallax'
  | 'truck-right-parallax'
  | 'pedestal-crane-up'
  | 'pedestal-crane-down'
  | 'orbital-subject-arc'
  | 'dramatic-push-impact'
  | 'macro-evidence-crawl'
  | 'wide-vista-pan';

export type TransitionType =
  | 'cross-dissolve'
  | 'film-dissolve'
  | 'fade-black'
  | 'zoom-in'
  | 'whip-pan'
  | 'light-leak'
  | 'none';

export type ViewportDisplayMode =
  | 'composite'
  | 'master-full-image'
  | 'cinematic-lighting'
  | 'motion-graphics'
  | 'camera-trajectory'
  | 'raw-comparison'
  | 'optional-2.5d'
  | 'depth-map'
  | 'subject-mask'
  | 'foreground-mask'
  | 'background-inpainted'
  | 'sky-layer'
  | 'layers-exploded';

export interface BoundingBox {
  x: number; // 0 to 1 relative
  y: number;
  width: number;
  height: number;
}

export interface PhotoAnalysis {
  subjectBox: BoundingBox;
  foregroundBox: BoundingBox;
  skyBox: BoundingBox;
  dominantColor: string;
  brightness: number; // 0-100
  contrast: number; // 0-100
  complexity: number;
  compositionType:
    | 'hero-subject-portrait'
    | 'wide-epic-landscape'
    | 'architectural-ruins'
    | 'investigative-evidence'
    | 'historical-gathering'
    | 'action-war-zone'
    | 'celestial-space';
  detectedObjects: string[];
  recommendedCamera: CameraMovePreset;
  recommendedDuration: number;
  hasSky: boolean;
  hasForegroundOccluder: boolean;
}

export interface KeyframePoint {
  time: number; // 0 to 1 progress within clip
  x: number;
  y: number;
  zoom: number;
  scale?: number;
  opacity?: number;
  rotation?: number;
  focusDepth?: number; // depth plane in focus (-500 to +300)
  easing: 'linear' | 'ease-in-out' | 'easy-ease' | 'ease-out' | 'bezier';
}

export interface DocumentaryPhoto {
  id: string;
  name: string;
  url: string;
  file?: File;
  sizeBytes: number;
  width: number;
  height: number;
  aspectRatio: number;
  isDuplicate?: boolean;
  analysis?: PhotoAnalysis;
  
  // Smart Headroom & Framing Protection (Prevents cut-off heads in portrait/square photos)
  framingMode?: 'smart-headroom' | 'blur-wings' | 'center-crop';
  headroomOffset?: number; // -1.0 (shift down/more headroom) to +1.0 (shift up)
  
  // Layer Masks & Parallax Assets
  masks?: {
    subjectMaskDataUrl?: string;
    foregroundMaskDataUrl?: string;
    secondaryMaskDataUrl?: string;
    inpaintedBackplateUrl?: string;
    skyMaskDataUrl?: string;
    depthMapDataUrl?: string;
  };

  // Virtual 3D Camera & Multi-Plane Keyframes
  keyframes: {
    camera: KeyframePoint[];
    foregroundParallax: KeyframePoint[];
    subjectParallax: KeyframePoint[];
    secondaryParallax: KeyframePoint[];
    backgroundParallax: KeyframePoint[];
    skyParallax: KeyframePoint[];
  };

  // Environmental & Procedural Elements
  procedural: {
    smoke: boolean;
    clouds: boolean;
    lightRays: boolean;
    dustParticles: number; // count 0 to 60
    focusRack: boolean;
    motionBlur: boolean;
  };

  // Visual Effects
  vfx: {
    filmGrain: number; // 0 to 1
    vignette: number; // 0 to 1
    lightLeak: boolean;
    chromaticAberration: number;
    colorGrade: string;
  };

  // Motion Graphics
  graphics?: {
    enabled?: boolean; // false by default for clean video without text
    lowerThird?: {
      title: string;
      subtitle: string;
      style: 'archival' | 'modern' | 'investigative' | 'news';
    };
    locationDateStamp?: {
      location: string;
      date: string;
    };
    chapterTitle?: string;
    calloutHighlight?: {
      x: number;
      y: number;
      radius: number;
      label: string;
    };
  };

  duration: number; // in seconds
  transitionIn: TransitionType;
  status: 'imported' | 'analyzing' | 'animated' | 'rendered' | 'failed';
}

export interface DocumentaryStyleConfig {
  id: DocumentaryStyleId;
  name: string;
  tagline: string;
  description: string;
  defaultDuration: number;
  colorGrade: string;
  vfxPresets: {
    filmGrain: number;
    vignette: number;
    dustParticles: number;
    lightRays: boolean;
    lightLeak: boolean;
    smokeHaze: boolean;
    chromaticAberration: number;
  };
  preferredCameraMoves: CameraMovePreset[];
  transition: TransitionType;
  motionGraphicsStyle: 'archival' | 'modern' | 'investigative' | 'news';
  previewColor: string;
}

export interface ProjectSettings {
  projectName: string;
  style: DocumentaryStyleId;
  resolution: '1920x1080' | '1280x720' | '3840x2160' | '1080x1920' | '1080x1080';
  fps: 24 | 25 | 30 | 60;
  qualityProfile: 'fast-preview' | 'balanced' | 'high-quality';
  autoMatchNarration: boolean;
  animationEngineMode?: 'master-full-image' | 'optional-2.5d';
  motionBlurEnabled?: boolean;
  cameraShakeEnabled?: boolean;
}
