import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, RefreshCw } from 'lucide-react';
import api from '../services/api';
import ShortsModal from '../components/ShortsModal';
import { getFallbackShorts, getYouTubeShortEmbedUrl, normalizeShort } from '../components/ShortsUtils';

function count(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function Shorts() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  const feedRef = useRef(null);
  const lastSlideRef = useRef(null);
  const loadingRef = useRef(false);
  const nextPageTokenRef = useRef('');
  const queryIndexRef = useRef(0);
  const hasMoreRef = useRef(true);
  const mountedRef = useRef(true);
  const clientFallbackRef = useRef([]);
  const clientFallbackCursorRef = useRef(0);

  const loadShorts = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;

    loadingRef.current = true;
    if (reset) {
      setLoading(true);
      nextPageTokenRef.current = '';
      queryIndexRef.current = 0;
      hasMoreRef.current = true;
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const params = new URLSearchParams({
        limit: '50',
        queryIndex: String(queryIndexRef.current)
      });

      if (nextPageTokenRef.current) {
        params.set('pageToken', nextPageTokenRef.current);
      }

      const response = await api.get(`/shorts?${params.toString()}`, { timeout: 15000 });
      const incoming = Array.isArray(response.data?.items)
        ? response.data.items.map((item, index) => normalizeShort(item, index)).filter(Boolean)
        : [];

      if (!incoming.length) throw new Error('Empty Shorts response');

      // YouTube page tokens are tied to the same search query. Keep the
      // current query while a token exists; rotate only when it is exhausted.
      nextPageTokenRef.current = response.data?.nextPageToken || '';
      queryIndexRef.current = Number.isInteger(Number(response.data?.nextQueryIndex))
        ? Number(response.data.nextQueryIndex)
        : queryIndexRef.current;
      hasMoreRef.current = Boolean(nextPageTokenRef.current || response.data?.nextQueryIndex !== null);

      setShorts((current) => {
        if (reset) return incoming;

        const existing = new Set(current.map((item) => item.videoId));
        const uniqueIncoming = incoming.filter((item) => !existing.has(item.videoId));

        return [
          ...current,
          ...uniqueIncoming.map((item, index) => ({
            ...item,
            id: `${item.id}-${current.length + index}`,
            position: current.length + index
          }))
        ];
      });
    } catch {
      // Client-side fallback is only a last-resort network fallback. The
      // backend normally provides its own randomized, paginated fallback.
      if (
        reset ||
        !clientFallbackRef.current.length ||
        clientFallbackCursorRef.current >= clientFallbackRef.current.length - 2
      ) {
        clientFallbackRef.current = getFallbackShorts();
        clientFallbackCursorRef.current = 0;
      }

      const fallback = clientFallbackRef.current.slice(
        clientFallbackCursorRef.current,
        clientFallbackCursorRef.current + 50
      );
      clientFallbackCursorRef.current += fallback.length;

      setShorts((current) => {
        const existing = new Set(current.map((item) => item.videoId));
        const uniqueFallback = fallback.filter((item) => !existing.has(item.videoId));

        if (reset) return fallback;

        return [
          ...current,
          ...uniqueFallback.map((item, index) => ({
            ...item,
            id: `${item.id}-fallback-${current.length + index}`,
            position: current.length + index
          }))
        ];
      });

      // Keep trying the backend on the next scroll instead of trapping the
      // user in the same eight-item client array.
      hasMoreRef.current = true;
      setError('Live Shorts source unavailable. Showing randomized VibePulse fallback Shorts.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadShorts(true);
    return () => {
      mountedRef.current = false;
    };
  }, [loadShorts]);

  useEffect(() => {
    const root = feedRef.current;
    const node = lastSlideRef.current;
    if (!root || !node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMoreRef.current && !loadingRef.current) {
          loadShorts(false);
        }
      },
      { root, rootMargin: '200% 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shorts.length, loadShorts]);

  useEffect(() => {
    const video = searchParams.get('video');
    if (!video || !shorts.length) return;

    const index = shorts.findIndex((item) => item.videoId === video);
    if (index >= 0) setViewerIndex(index);
  }, [searchParams, shorts]);

  const retry = () => loadShorts(true);

  if (loading && !shorts.length) {
    return (
      <div className="shorts-feed-loading">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold">Loading Shorts…</p>
          <p className="text-xs text-white/50 mt-1">VibePulse is preparing your feed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shorts-page">
      <div className="shorts-header">
        <div>
          <h1 className="text-xl font-bold">Shorts</h1>
          <p className="text-xs text-white/60">Swipe up or down</p>
        </div>
        {error && (
          <button type="button" onClick={retry} className="shorts-source-status" title="Retry Shorts">
            <RefreshCw size={14} /> Fallback
          </button>
        )}
      </div>

      <div ref={feedRef} className="shorts-feed">
        {shorts.map((short, index) => (
          <section
            key={short.id}
            ref={index === shorts.length - 1 ? lastSlideRef : null}
            className="short-slide"
          >
            <ShortSlide short={short} onOpen={() => setViewerIndex(index)} />
          </section>
        ))}

        {loadingMore && (
          <div className="shorts-inline-loading">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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

function ShortSlide({ short, onOpen }) {
  const [liked, setLiked] = useState(short.isLiked);
  const [likes, setLikes] = useState(short.likesCount);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    setLiked(Boolean(short.isLiked));
    setLikes(Number(short.likesCount || 0));
  }, [short.id, short.isLiked, short.likesCount]);

  const toggleLike = async (event) => {
    event.stopPropagation();
    if (!short.postId) {
      setLiked((value) => !value);
      setLikes((value) => Math.max(0, value + (liked ? -1 : 1)));
      return;
    }

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
      else {
        await navigator.clipboard?.writeText(url);
        alert('Short link copied.');
      }
    } catch {}
  };

  const toggleMute = (event) => {
    event.stopPropagation();
    setMuted((value) => !value);
  };

  return (
    <div className="short-player-shell" onClick={onOpen}>
      <div className="short-iframe-viewport" aria-label="VibePulse Short player">
        <iframe
          key={`${short.videoId}-${muted}`}
          src={getYouTubeShortEmbedUrl(short.videoId, window.location.origin, muted)}
          title="VibePulse Short"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          className="short-player-iframe pointer-events-none"
        />
        <div className="short-brand-mask short-brand-mask-top" aria-hidden="true" />
        <div className="short-brand-mask short-brand-mask-bottom" aria-hidden="true" />
      </div>

      <div className="short-ui-mask">
        <div className="short-ui-creator">
          <img src="/default-avatar.svg" alt="" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <div className="font-bold text-sm">VibePulse Trends</div>
            <div className="text-xs text-white/70">Trending Shorts</div>
          </div>
        </div>
        {short.content && (
          <p className="max-w-[min(560px,72vw)] text-sm leading-5 mt-3 line-clamp-2">
            {short.content}
          </p>
        )}
      </div>

      <div className="short-actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={toggleLike} className="short-action" aria-label="Like">
          <Heart size={28} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-red-500' : ''} />
          <span>{count(likes)}</span>
        </button>

        <button type="button" onClick={onOpen} className="short-action" aria-label="Comments">
          <MessageCircle size={28} />
          <span>{count(short.commentsCount)}</span>
        </button>

        <button type="button" onClick={share} className="short-action" aria-label="Share">
          <Share2 size={28} />
          <span>{count(short.sharesCount)}</span>
        </button>

        <button type="button" onClick={toggleMute} className="short-action" aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
          <span>{muted ? 'Muted' : 'Sound'}</span>
        </button>
      </div>

      <button type="button" className="short-open-hint" onClick={onOpen}>
        <Play size={17} fill="currentColor" /> Open Short
      </button>
    </div>
  );
}
