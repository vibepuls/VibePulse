import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, Link2 } from 'lucide-react';
import api from '../services/api';
import Comments from './Comments';
import { avatarUrl, handleAvatarError } from '../services/media';
import { getYouTubeShortEmbedUrl } from './ShortsUtils';

function formatCount(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K`;
  return String(n);
}

export default function ShortsModal({ shorts = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);
  const [liked, setLiked] = useState(Boolean(shorts[initialIndex]?.isLiked));
  const [likes, setLikes] = useState(Number(shorts[initialIndex]?.likesCount || 0));
  const [shareBusy, setShareBusy] = useState(false);
  const [likePulse, setLikePulse] = useState(false);
  const touchStartY = useRef(null);

  const short = shorts[index];
  const embedUrl = useMemo(() => short ? getYouTubeShortEmbedUrl(short.videoId) : null, [short]);

  useEffect(() => {
    if (!short) return;
    setLiked(Boolean(short.isLiked));
    setLikes(Number(short.likesCount || 0));
    setMuted(true);
    setCommentOpen(false);
  }, [short?.id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowDown') setIndex((v) => Math.min(shorts.length - 1, v + 1));
      if (event.key === 'ArrowUp') setIndex((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shorts.length, onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  if (!short || !embedUrl) return null;

  const toggleLike = async () => {
    try {
      const res = await api.post(`/reactions/${short.postId}`, { type: 'like' });
      const removed = res.data.action === 'removed';
      setLiked(!removed);
      setLikes((value) => Math.max(0, value + (removed ? -1 : res.data.action === 'added' ? 1 : 0)));
      if (!removed) { setLikePulse(true); window.setTimeout(() => setLikePulse(false), 300); }
    } catch {}
  };

  const share = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    const shareUrl = `${window.location.origin}/shorts?video=${short.videoId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'VibePulse Short', text: 'Watch this Short on VibePulse', url: shareUrl });
      } else {
        await navigator.clipboard?.writeText(shareUrl);
        alert('Short link copied.');
      }
      try { await api.post(`/posts/${short.postId}/share`, { content: '' }); } catch {}
    } catch {}
    finally { setShareBusy(false); }
  };

  const toggleMute = () => {
    setMuted((value) => !value);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black text-white">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[140] w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
        aria-label="Close Shorts viewer"
      >
        <X size={24} />
      </button>

      <div
        className="shorts-modal-stage"
        onWheel={(event) => {
          if (Math.abs(event.deltaY) < 30) return;
          setIndex((value) => Math.max(0, Math.min(shorts.length - 1, value + (event.deltaY > 0 ? 1 : -1))));
        }}
        onTouchStart={(event) => { touchStartY.current = event.touches[0]?.clientY ?? null; }}
        onTouchEnd={(event) => {
          if (touchStartY.current == null) return;
          const endY = event.changedTouches[0]?.clientY ?? touchStartY.current;
          const delta = touchStartY.current - endY;
          if (Math.abs(delta) > 50) {
            setIndex((value) => Math.max(0, Math.min(shorts.length - 1, value + (delta > 0 ? 1 : -1))));
          }
          touchStartY.current = null;
        }}
      >
        <div className="shorts-modal-player">
          <iframe
            key={`${short.videoId}-${muted}`}
            src={embedUrl.replace('mute=1', `mute=${muted ? '1' : '0'}`)}
            title="VibePulse Short"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="origin"
            className="shorts-player-iframe"
          />

          <div className="shorts-source-mask">
            <div className="shorts-creator">
              <img
                src={avatarUrl(short.avatar, short.creator)}
                onError={(event) => handleAvatarError(event, short.creator)}
                alt=""
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-bold text-sm">{short.creator}</p>
                <p className="text-xs text-white/70">Shorts</p>
              </div>
            </div>
            {short.content && <p className="mt-3 max-w-[min(520px,70vw)] text-sm leading-5 line-clamp-3">{short.content}</p>}
          </div>

          <div className="shorts-actions">
            <button type="button" onClick={toggleLike} className="shorts-action" aria-label="Like">
              <span className={`shorts-action-icon ${liked ? 'text-red-500 scale-110' : ''} ${likePulse ? 'shorts-like-pulse' : ''}`}><Heart size={27} fill={liked ? 'currentColor' : 'none'} /></span>
              <span>{formatCount(likes)}</span>
            </button>
            <button type="button" onClick={() => setCommentOpen(true)} className="shorts-action" aria-label="Comments">
              <span className="shorts-action-icon"><MessageCircle size={27} /></span>
              <span>{formatCount(short.commentsCount)}</span>
            </button>
            <button type="button" onClick={share} className="shorts-action" aria-label="Share">
              <span className="shorts-action-icon"><Share2 size={27} /></span>
              <span>{shareBusy ? '...' : formatCount(short.sharesCount)}</span>
            </button>
            <button type="button" onClick={toggleMute} className="shorts-action" aria-label={muted ? 'Unmute' : 'Mute'}>
              <span className="shorts-action-icon">{muted ? <VolumeX size={27} /> : <Volume2 size={27} />}</span>
              <span>{muted ? 'Muted' : 'Sound'}</span>
            </button>
          </div>
        </div>

        <div className="shorts-modal-nav">
          <button disabled={index === 0} onClick={() => setIndex((v) => Math.max(0, v - 1))} className="shorts-nav-btn">↑</button>
          <span>{index + 1} / {shorts.length}</span>
          <button disabled={index === shorts.length - 1} onClick={() => setIndex((v) => Math.min(shorts.length - 1, v + 1))} className="shorts-nav-btn">↓</button>
        </div>
      </div>

      {commentOpen && (
        <div className="absolute inset-0 z-[150] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setCommentOpen(false)}>
          <div className="w-full sm:w-[min(520px,calc(100vw-2rem))] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Comments</h3>
              <button onClick={() => setCommentOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} /></button>
            </div>
            <Comments postId={short.postId} currentUser={JSON.parse(localStorage.getItem('user') || '{}')} />
          </div>
        </div>
      )}
    </div>
  );
}
