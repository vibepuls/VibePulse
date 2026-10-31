import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from './services/api';

const SITE = 'https://vibepulse-frontend.onrender.com';
const DEFAULT_TITLE = 'VibePulse — Share Moments, Discover People';
const DEFAULT_DESCRIPTION = 'VibePulse is a social network to share moments, discover creators, follow friends, join photo battles, and explore community rankings.';
const PUBLIC_INDEXABLE_PATHS = new Set(['/', '/templates']);

function setMeta(name, value, attribute = 'name') {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

function setCanonical(url) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = url;
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const apply = (title, description, url, noindex = false) => {
      if (cancelled) return;
      document.title = title;
      setMeta('description', description);
      setMeta('robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1');
      setMeta('og:title', title, 'property');
      setMeta('og:description', description, 'property');
      setMeta('og:url', url, 'property');
      setMeta('twitter:title', title);
      setMeta('twitter:description', description);
      setCanonical(url);
    };

    const privateRoute = /^\/(login|register|admin|cinematic|documentary-studio)(\/|$)/i.test(path);
    if (privateRoute) {
      const title = path.startsWith('/login') ? 'Sign in to VibePulse'
        : path.startsWith('/register') ? 'Create a VibePulse Account'
        : path.startsWith('/admin') ? 'VibePulse Admin'
        : path.startsWith('/cinematic') ? 'Professional Video Editor — VibePulse'
        : 'Documentary Studio — VibePulse';
      apply(title, 'Sign in to access your VibePulse account and member tools.', SITE + path, true);
      return () => { cancelled = true; };
    }

    const profileMatch = path.match(/^\/profile\/([^/]+)$/i);
    if (profileMatch) {
      let username;
      try {
        username = decodeURIComponent(profileMatch[1]).replace(/^@/, '');
      } catch {
        apply(DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE + '/', true);
        return () => { cancelled = true; };
      }
      const profileUrl = SITE + '/profile/' + encodeURIComponent(username);
      apply(`@${username} on VibePulse`, `View the public profile and public posts shared by @${username} on VibePulse.`, profileUrl);
      api.get(`/users/${encodeURIComponent(username)}/profile`)
        .then(({ data }) => {
          const displayName = data.displayName || data.username || username;
          const bio = String(data.bio || '').replace(/\s+/g, ' ').trim();
          const description = (bio
            ? `${displayName} on VibePulse: ${bio}`
            : `Discover ${displayName}'s public profile, posts, and community activity on VibePulse.`).slice(0, 300);
          apply(`${displayName} (@${data.username}) — VibePulse`, description, SITE + '/profile/' + encodeURIComponent(data.username));
        })
        .catch(() => apply(`@${username} on VibePulse`, 'This public profile could not be found on VibePulse.', profileUrl, true));
      return () => { cancelled = true; };
    }

    if (path === '/templates') {
      apply(
        'Video Templates & Photo Reels — VibePulse',
        'Explore VibePulse video and photo templates for cinematic edits, reels, shorts, travel, birthdays, and more. Choose a template and create your next video.',
        SITE + '/templates'
      );
      return () => { cancelled = true; };
    }

    if (PUBLIC_INDEXABLE_PATHS.has(path)) {
      apply(DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE + path);
    } else {
      // Do not let private tools, unknown routes, or app-only screens become duplicate search results.
      apply(DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE + path, true);
    }

    return () => { cancelled = true; };
  }, [location.pathname]);

  return null;
}
