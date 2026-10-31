import React, { useState } from 'react';
import { FeedPost, VideoTemplate } from '../types/template';
import { VIDEO_TEMPLATES } from '../data/templates';
import { Heart, MessageCircle, Share2, Sparkles, Music, Bookmark } from 'lucide-react';

interface CommunityFeedProps {
  onUseTemplate: (template: VideoTemplate) => void;
  customPosts?: FeedPost[];
}

const DEFAULT_FEED_POSTS: FeedPost[] = [
  {
    id: 'post-1',
    creatorName: 'Alex Rivera',
    creatorHandle: '@alex_motion',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    templateId: 'midnight-drift',
    templateTitle: 'Midnight Drift 3.0',
    musicTitle: 'Tokyo Midnight Phonk · KAGE',
    videoUrl: '/src/assets/images/template_midnight_drift_1793377350418.jpg',
    likes: 42800,
    commentsCount: 394,
    sharesCount: 1200,
    caption: 'Tokyo rain night vibes with the new GTR drift template 🔥 Zero editing needed!',
    timeAgo: '2h ago',
    tags: ['#VibePulse', '#MidnightDrift', '#Tokyo', '#Phonk'],
  },
  {
    id: 'post-2',
    creatorName: 'Elena Rostova',
    creatorHandle: '@elena_sunset',
    creatorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    templateId: 'golden-memories',
    templateTitle: 'Golden Hour Memories',
    musicTitle: 'Summer Solstice Ambient · Aura Bloom',
    videoUrl: '/src/assets/images/template_golden_memories_1793377350299.jpg',
    likes: 89400,
    commentsCount: 612,
    sharesCount: 3400,
    caption: 'Summer beach recap with the best crew. The 35mm film grain tone is perfection ✨',
    timeAgo: '5h ago',
    tags: ['#GoldenHour', '#Memories', '#SummerVibes', '#Cinematic'],
  },
  {
    id: 'post-3',
    creatorName: 'Marcus Chen',
    creatorHandle: '@marcus_wanders',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    templateId: 'wanderlust-montage',
    templateTitle: 'Wanderlust Explorer',
    musicTitle: 'Horizons Calling · Atlas Soundscapes',
    videoUrl: '/src/assets/images/template_wanderlust_montage_1793377350994.jpg',
    likes: 64100,
    commentsCount: 450,
    sharesCount: 2100,
    caption: 'Alpine sunrise above the clouds! Just selected the template and dropped 6 photos 🏔️',
    timeAgo: '1d ago',
    tags: ['#TravelReels', '#Mountains', '#Wanderlust', '#VibePulse'],
  },
  {
    id: 'post-4',
    creatorName: 'Zoe Martinez',
    creatorHandle: '@zoe_vibes',
    creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    templateId: 'birthday-sparks',
    templateTitle: 'Birthday Glow Rewind',
    musicTitle: 'Celebration Confetti Rush · Nova Spark',
    videoUrl: '/src/assets/images/template_birthday_party_1793377351098.jpg',
    likes: 112000,
    commentsCount: 980,
    sharesCount: 5200,
    caption: 'Best 25th birthday ever! Beat drops right when the candles get blown out 🎂✨',
    timeAgo: '2d ago',
    tags: ['#BirthdayDump', '#Celebration', '#ViralReels'],
  },
];

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  onUseTemplate,
  customPosts = [],
}) => {
  const [posts, setPosts] = useState<FeedPost[]>([...customPosts, ...DEFAULT_FEED_POSTS]);

  const handleToggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === id) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );
  };

  const handleRemixClick = (templateId: string) => {
    const found = VIDEO_TEMPLATES.find((t) => t.id === templateId) || VIDEO_TEMPLATES[0];
    onUseTemplate(found);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 text-center">
        <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
          VibePulse Trending Feed
        </span>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Created with Automatic Templates
        </h2>
        <p className="text-xs text-slate-400">
          Tap “Use This Template” on any video to create your own in 1 tap.
        </p>
      </div>

      {/* Feed Stream */}
      <div className="space-y-8">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl"
          >
            {/* Creator Bar */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 p-0.5">
                  <img
                    src={post.creatorAvatar}
                    alt={post.creatorName}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {post.creatorName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>{post.creatorHandle}</span>
                    <span aria-hidden="true">·</span>
                    <span>{post.timeAgo}</span>
                  </div>
                </div>
              </div>

              {/* CapCut style Template Attribution Button */}
              <button
                onClick={() => handleRemixClick(post.templateId)}
                className="py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Use Template</span>
              </button>
            </div>

            {/* Video / Visual Media Card */}
            <div className="relative aspect-[9/16] max-h-[580px] w-full bg-black overflow-hidden flex items-center justify-center">
              {post.videoUrl.endsWith('.mp4') || post.videoUrl.startsWith('blob:') ? (
                <video
                  src={post.videoUrl}
                  controls
                  playsInline
                  loop
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={post.videoUrl}
                  alt={post.caption}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* In-feed template banner at bottom */}
              <div
                onClick={() => handleRemixClick(post.templateId)}
                className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-between text-white cursor-pointer hover:bg-black/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-500 flex items-center justify-center text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight line-clamp-1">
                      Template: {post.templateTitle}
                    </p>
                    <p className="text-[10px] text-slate-300 line-clamp-1">
                      Auto beat sync · 1080p
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-rose-400 whitespace-nowrap">
                  Try Now →
                </span>
              </div>
            </div>

            {/* Interaction Bar & Caption */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold hover:text-rose-400 transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        post.isLiked
                          ? 'fill-rose-500 text-rose-500'
                          : 'text-slate-300'
                      }`}
                    />
                    <span className="tabular-nums font-mono">
                      {post.likes.toLocaleString()}
                    </span>
                  </button>

                  <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span className="tabular-nums font-mono">
                      {post.commentsCount}
                    </span>
                  </button>

                  <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span className="tabular-nums font-mono">
                      {post.sharesCount}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Music className="w-3.5 h-3.5 text-rose-400" />
                  <span className="truncate max-w-[140px]">{post.musicTitle}</span>
                </div>
              </div>

              {/* Caption */}
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
                <strong className="text-white mr-1.5">{post.creatorName}</strong>
                {post.caption}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 text-[11px] text-rose-400 font-medium">
                {post.tags.map((tag, i) => (
                  <span key={i}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
