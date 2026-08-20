import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play } from 'lucide-react';
import api from '../services/api';
import ShortsModal from '../components/ShortsModal';
import { getShortsFromPosts, getYouTubeShortEmbedUrl } from '../components/ShortsUtils';

function count(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function Shorts() {
  const [rawPosts, setRawPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [searchParams] = useSearchParams();
  const lastSlideRef = useRef(null);

  const shorts = useMemo(() => getShortsFromPosts(rawPosts), [rawPosts]);

  const loadPosts = async (reset = false) => {
    if (reset ? loading : loadingMore || !hasMore) return;

    if (reset) setLoading(true);
    else setLoadingMore(true);

    const nextOffset = reset ? 0 : offset;

    try {
      const res = await api.get(`/posts/feed?mode=for-you&limit=20&offset=${nextOffset}`);
      const incoming = Array.isArray(res.data) ? res.data : [];

      setRawPosts((current) => {
        const merged = reset ? incoming : [...current, ...incoming];
        const seen = new Set();
        return merged.filter((post) => {
          if (seen.has(post.id)) return false;
          seen.add(post.id);
          return true;
        });
      });
      setOffset(nextOffset + incoming.length);
      setHasMore(incoming.length === 20);
    } catch {
      if (reset) setRawPosts([]);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts(true);
  }, []);

  useEffect(() => {
    const node = lastSlideRef.current;
    if (!node || !hasMore || loadingMore) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadPosts(false);
      },
      { rootMargin: '100vh 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shorts.length, hasMore, loadingMore]);

  useEffect(() => {
    const video = searchParams.get('video');
    if (!video || !shorts.length) return;
    const index = shorts.findIndex((item) => item.videoId === video);
    if (index >= 0) setViewerIndex(index);
  }, [searchParams, shorts]);

  if (loading) return <div className="shorts-feed-loading">Loading Shorts...</div>;

  return (
    <div className="shorts-page">
      <div className="shorts-header">
        <div>
          <h1 className="text-xl font-bold">Shorts</h1>
          <p className="text-xs text-white/60">Swipe up or down</p>
        </div>
      </div>

      <div className="shorts-feed">
        {shorts.map((short, index) => (
          <section key={short.id} ref={index === shorts.length - 1 ? lastSlideRef : null} className="short-slide">
            <ShortSlide short={short} index={index} onOpen={() => setViewerIndex(index)} />
          </section>
        ))}
        {loadingMore && (
          <div className="h-20 flex items-center justify-center text-white/60 text-sm">Loading more Shorts...</div>
        )}
        {!shorts.length && (
          <div className="h-screen flex items-center justify-center text-gray-500">
            No YouTube Shorts are available in your feed yet.
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <ShortsModal
          shorts={shorts}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}

function ShortSlide({ short, index, onOpen }) {
  const [liked, setLiked] = useState(short.isLiked);
  const [likes, setLikes] = useState(short.likesCount);
  const [muted, setMuted] = useState(true);

  const toggleLike = async (event) => {
    event.stopPropagation();
    try {
      const res = await api.post(`/reactions/${short.postId}`, { type: 'like' });
      const removed = res.data.action === 'removed';
      setLiked(!removed);
      setLikes((value) => Math.max(0, value + (removed ? -1 : res.data.action === 'added' ? 1 : 0)));
    } catch {}
  };

  const share = async (event) => {
    event.stopPropagation();
    const url = `${window.location.origin}/shorts?video=${short.videoId}`;
    try {
      if (navigator.share) await navigator.share({ title: 'VibePulse Short', url });
      else { await navigator.clipboard?.writeText(url); alert('Short link copied.'); }
    } catch {}
  };

  return (
    <div className="short-player-shell" onClick={onOpen}>
        <iframe
          src={getYouTubeShortEmbedUrl(short.videoId).replace('mute=1', `mute=${muted ? '1' : '0'}`)}
          title="VibePulse Short"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="origin"
          className="short-player-iframe pointer-events-none"
        />

        <div className="short-ui-mask">
          <div className="short-ui-creator">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-bold">V</div>
            <div>
              <div className="font-bold text-sm">VibePulse Shorts</div>
              <div className="text-xs text-white/70">Shorts</div>
            </div>
          </div>
          {short.content && <p className="max-w-[min(560px,72vw)] text-sm leading-5 mt-3 line-clamp-3">{short.content}</p>}
        </div>

        <div className="short-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={toggleLike} className="short-action"><Heart size={28} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-red-500' : ''} /><span>{count(likes)}</span></button>
          <button type="button" onClick={onOpen} className="short-action"><MessageCircle size={28} /><span>{count(short.commentsCount)}</span></button>
          <button type="button" onClick={share} className="short-action"><Share2 size={28} /><span>{count(short.sharesCount)}</span></button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setMuted((v) => !v); }} className="short-action">{muted ? <VolumeX size={28} /> : <Volume2 size={28} />}<span>{muted ? 'Muted' : 'Sound'}</span></button>
        </div>

        <button type="button" className="short-open-hint" onClick={onOpen}><Play size={17} fill="currentColor" /> Open Short</button>
      </div>
    </div>
  );
}
