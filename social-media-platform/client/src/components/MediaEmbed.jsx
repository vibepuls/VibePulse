import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause, ShieldCheck } from 'lucide-react';

const providerNames = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
  direct: 'Media'
};

export function detectEmbed(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    if (url.hostname === 'youtu.be' || /(^|\.)youtube(-nocookie)?\.com$/i.test(url.hostname)) {
      const id = url.hostname === 'youtu.be'
        ? url.pathname.split('/').filter(Boolean)[0]
        : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
      if (id) {
        const params = new URLSearchParams({
          enablejsapi: '1',
          origin: window.location.origin,
          rel: '0',
          autoplay: '0',
          mute: '1',
          playsinline: '1',
          modestbranding: '1'
        });
        return { provider: 'youtube', type: 'video', embed_url: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}` };
      }
    }

    if (/(^|\.)instagram\.com$/i.test(url.hostname)) {
      const match = url.pathname.match(/^\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
      if (match) return { provider: 'instagram', type: 'video', embed_url: `https://www.instagram.com/${url.pathname.split('/')[1]}/${match[1]}/embed` };
    }

    if (/(^|\.)facebook\.com$/i.test(url.hostname) || url.hostname === 'fb.watch') {
      return {
        provider: 'facebook',
        type: 'video',
        embed_url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(raw)}&show_text=false`
      };
    }

    if (/\.(jpe?g|png|gif|webp|avif)(?:[?#].*)?$/i.test(raw)) {
      return { provider: 'direct', type: 'image', embed_url: raw };
    }
    if (/\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i.test(raw)) {
      return { provider: 'direct', type: 'video', embed_url: raw };
    }
  } catch {}
  return null;
}

function postYouTubeCommand(iframe, func) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({
    event: 'command',
    func,
    args: []
  }), 'https://www.youtube-nocookie.com');
}

function useViewportAutoplay(ref, { onEnter, onLeave, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const node = ref.current;
    let active = false;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.55;
      if (visible && !active) {
        active = true;
        window.dispatchEvent(new CustomEvent('vibepulse:media-enter', { detail: node }));
        onEnter?.();
      } else if (!visible && active) {
        active = false;
        onLeave?.();
      }
    }, { threshold: [0, 0.55, 0.8] });
    const stopWhenAnotherStarts = (event) => {
      if (event.detail && event.detail !== node) onLeave?.();
    };
    window.addEventListener('vibepulse:media-enter', stopWhenAnotherStarts);
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.removeEventListener('vibepulse:media-enter', stopWhenAnotherStarts);
    };
  }, [ref, onEnter, onLeave, enabled]);
}

export default function MediaEmbed({ media, preview = false }) {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  if (!media?.embed_url && !media?.url) return null;

  const provider = media.provider || 'direct';
  const type = media.type;
  const src = media.embed_url || media.url;

  const play = () => {
    if (provider === 'direct' && videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else if (provider === 'youtube') {
      postYouTubeCommand(iframeRef.current, 'playVideo');
      setPlaying(true);
    }
  };

  const pause = () => {
    if (provider === 'direct' && videoRef.current) videoRef.current.pause();
    if (provider === 'youtube') postYouTubeCommand(iframeRef.current, 'pauseVideo');
    setPlaying(false);
  };

  const toggleMute = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = !muted;
    setMuted(next);
    if (provider === 'direct' && videoRef.current) {
      videoRef.current.muted = next;
      if (next) {
        videoRef.current.play().catch(() => {});
      }
    } else if (provider === 'youtube') {
      postYouTubeCommand(iframeRef.current, next ? 'mute' : 'unMute');
      if (!playing) play();
    }
  };

  const onEnter = () => {
    // Browsers permit autoplay when the media starts muted.
    if (provider === 'direct' && videoRef.current) {
      videoRef.current.muted = true;
      setMuted(true);
    }
    play();
  };
  const onLeave = () => pause();

  useViewportAutoplay(containerRef, { onEnter, onLeave, enabled: type === 'video' });

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== 'https://www.youtube-nocookie.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onStateChange') setPlaying(data.info === 1);
      } catch {}
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (type === 'image') {
    return (
      <div ref={containerRef} className="overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900">
        <img src={src} alt={media.title || 'Post media'} loading="lazy" className="block w-full max-h-[680px] object-contain mx-auto pointer-events-none select-none" draggable="false" />
      </div>
    );
  }

  if (type === 'video' && provider === 'direct') {
    return (
      <div ref={containerRef} className={`media-embed media-secure ${preview ? 'media-embed-preview' : ''}`}>
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="metadata"
          className="block w-full h-full object-contain pointer-events-none select-none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        />
        <div className="media-click-shield" aria-hidden="true" />
        <div className="media-controls" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="media-control-btn" onClick={playing ? pause : play} aria-label={playing ? 'Pause video' : 'Play video'}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button type="button" className="media-control-btn" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <span className="media-secure-badge"><ShieldCheck size={14} /> VibePulse</span>
        </div>
      </div>
    );
  }

  if (type === 'video' || ['youtube', 'facebook', 'instagram'].includes(provider)) {
    const isYoutube = provider === 'youtube';
    return (
      <div ref={containerRef} className={`media-embed media-secure ${preview ? 'media-embed-preview' : ''}`}>
        <iframe
          ref={iframeRef}
          src={src}
          title={`${providerNames[provider] || 'Embedded'} media`}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          className="media-iframe"
        />
        {/* Strict shield: external player controls, logos, titles and links cannot receive pointer input. */}
        <div className="media-click-shield" aria-hidden="true" />
        <div className="media-controls" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="media-control-btn" onClick={playing ? pause : play} aria-label={playing ? 'Pause video' : 'Play video'}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button type="button" className="media-control-btn" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <span className="media-secure-badge"><ShieldCheck size={14} /> VibePulse</span>
        </div>
      </div>
    );
  }

  return null;
}
