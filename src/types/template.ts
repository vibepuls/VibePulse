export type TemplateCategory =
  | 'All'
  | 'Trending'
  | 'Viral'
  | 'Cinematic'
  | 'Beat Sync'
  | 'Slow Motion'
  | 'Photo Slideshow'
  | 'Birthday'
  | 'Travel'
  | 'Love & Memories'
  | 'Gaming'
  | 'Professional Reels'
  | 'Instagram/TikTok Style';

export type ColorGradePreset =
  | 'teal-orange'
  | 'cyber-neon'
  | 'vintage-film'
  | 'golden-hour'
  | 'moody-bw'
  | 'fresh-pastel'
  | 'sunset-pop'
  | 'raw-clean';

export type TransitionType =
  | 'zoom-through'
  | 'flash-white'
  | 'whip-pan'
  | 'blur-dissolve'
  | 'glitch'
  | 'slice';

export type CameraMovement =
  | 'ken-burns-in'
  | 'ken-burns-out'
  | 'pan-left'
  | 'pan-right'
  | 'subtle-shake'
  | 'hyper-zoom';

export type VisualEffect =
  | 'filmGrain'
  | 'lightLeak'
  | 'chromaticAberration'
  | 'vignette'
  | 'glowPulse'
  | 'particles'
  | 'vhsScanlines'
  | 'speedRamp';

export interface TextOverlayConfig {
  introHook: string;
  punchline: string;
  watermark: string;
  style: 'kinetic' | 'neon' | 'editorial' | 'bold-caps';
}

export interface AudioTrackConfig {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // in seconds
  genre: 'phonk' | 'cinematic' | 'dance' | 'synthwave' | 'acoustic' | 'hiphop';
  synthesizerPreset: 'heavy-808' | 'ambient-strings' | 'dance-lead' | 'cyber-bass' | 'lofi-acoustic';
}

export interface TemplateSlot {
  slotIndex: number;
  startTime: number; // seconds
  duration: number; // seconds
  targetEnergy: 'high' | 'medium' | 'chill' | 'peak';
  cameraMovement: CameraMovement;
  transitionIn: TransitionType;
}

export interface VideoTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  description: string;
  aspectRatio: '9:16';
  duration: number; // in seconds
  bpm: number;
  minSlots: number;
  maxSlots: number;
  coverUrl: string;
  audioTrack: AudioTrackConfig;
  beatMarkers: number[]; // timestamps in seconds
  slots: TemplateSlot[];
  colorGrade: ColorGradePreset;
  effects: VisualEffect[];
  textOverlay: TextOverlayConfig;
  tag?: 'Trending' | 'Viral' | 'Hot' | 'New' | 'Top 1';
  usagesCount: string;
}

export interface UserMediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  file?: File;
  duration?: number;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number }; // 0 to 1
  energyScore?: number; // 0 to 100
  brightness?: number; // 0 to 100
  dominantHue?: string;
  trimStart?: number; // for video clips
  trimEnd?: number;
}

export interface RenderedVideoOutput {
  id: string;
  title: string;
  templateId: string;
  templateTitle: string;
  blobUrl: string;
  blob: Blob;
  duration: number;
  thumbnailUrl: string;
  createdAt: number;
  mediaCount: number;
  publishedToFeed?: boolean;
  likesCount?: number;
  userHandle?: string;
}

export interface FeedPost {
  id: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  templateId: string;
  templateTitle: string;
  musicTitle: string;
  videoUrl: string;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  caption: string;
  timeAgo: string;
  tags: string[];
  isLiked?: boolean;
}
