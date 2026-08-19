import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';

const providerNames = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
  direct: 'Video'
};

function postYouTubeCommand(iframe, func) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func, args: [] }),
    'https://www.youtube-nocookie.com'
  );
}

function useViewportAutoplay(ref, { onEnter, onLeave, enabled }) {
  useEffect(() => {
    if (!enabled || !ref.current || typeof IntersectionObserver === 'undefined') return;

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
      if (event.detail && event.detail !== node) {
        active = false;
        onLeave?.();
      }
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
  const type = media.type || 'video';
  const src = media.embed_url || media.url;

  const play = () => {
    if (provider === 'direct' && videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.play()
        .then(() => setPlaying(true))
        .catch(() => {});
      return;
    }

    if (provider === 'youtube') {
      postYouTubeCommand(iframeRef.current, 'playVideo');
      setPlaying(true);
    }
  };

  const pause = () => {
    if (provider === 'direct' && videoRef.current) {
      videoRef.current.pause();
      return;
    }

    if (provider === 'youtube') {
      postYouTubeCommand(iframeRef.current, 'pauseVideo');
      setPlaying(false);
    }
  };

  const toggleMute = (event) => {
    event?.stopPropagation();

    const next = !muted;
    setMuted(next);

    if (provider === 'direct' && videoRef.current) {
      videoRef.current.muted = next;
      if (!next && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    } else if (provider === 'youtube') {
      postYouTubeCommand(iframeRef.current, next ? 'mute' : 'unMute');
      if (!playing) {
        postYouTubeCommand(iframeRef.current, 'playVideo');
        setPlaying(true);
      }
    }
  };

  const onEnter = () => {
    // Muted autoplay is required by most browsers.
    if (provider === 'direct' && videoRef.current) {
      videoRef.current.muted = true;
      setMuted(true);
    }

    if (provider === 'direct') {
      videoRef.current?.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    } else if (provider === 'youtube') {
      postYouTubeCommand(iframeRef.current, 'mute');
      postYouTubeCommand(iframeRef.current, 'playVideo');
      setMuted(true);
      setPlaying(true);
    }
  };

  const onLeave = () => pause();

  useViewportAutoplay(containerRef, {
    onEnter,
    onLeave,
    enabled: type === 'video'
  });

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== 'https://www.youtube-nocookie.com') return;

      try {
        const data = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data;

        if (data?.event === 'onStateChange') {
          setPlaying(data.info === 1);
        }
      } catch {}
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (type === 'image') {
    return (
      <div ref={containerRef} className="overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900">
        <img
          src={src}
          alt={media.title || 'Post media'}
          loading="lazy"
          className="block w-full max-h-[680px] object-contain mx-auto"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  if (type === 'video' && provider === 'direct') {
    return (
      <div
        ref={containerRef}
        className={`media-embed ${preview ? 'media-embed-preview' : ''}`}
      >
        <video
          ref={videoRef}
          src={src}
          muted={muted}
          playsInline
          controls
          preload="metadata"
          className="block w-full h-full object-contain"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        />

        <div className="media-controls" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="media-control-btn"
            onClick={playing ? pause : play}
            aria-label={playing ? 'Pause video' : 'Play video'}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            type="button"
            className="media-control-btn"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute video' : 'Mute video'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>
    );
  }

  if (type === 'video' || ['youtube', 'facebook', 'instagram'].includes(provider)) {
    return (
      <div
        ref={containerRef}
        className={`media-embed ${preview ? 'media-embed-preview' : ''}`}
      >
        <iframe
          ref={iframeRef}
          src={src}
          title={`${providerNames[provider] || 'Embedded'} media`}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          className="media-iframe"
        />

        {provider === 'youtube' && (
          <div className="media-controls media-controls-iframe">
            <button
              type="button"
              className="media-control-btn"
              onClick={playing ? pause : play}
              aria-label={playing ? 'Pause video' : 'Play video'}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              type="button"
              className="media-control-btn"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute video' : 'Mute video'}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
