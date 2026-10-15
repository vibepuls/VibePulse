import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from './services/api';

const SITE = 'https://vibepulse-frontend.onrender.com';
const DEFAULT_TITLE = 'VibePulse — Share Moments, Discover People';
const DEFAULT_DESCRIPTION = 'VibePulse is a social network to share moments, discover creators, follow friends, join photo battles, and explore community rankings.';

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
  if (!element) { element = document.createElement('link'); element.rel = 'canonical'; document.head.appendChild(element); }
  element.href = url;
}
export default function SeoManager() {
  const location = useLocation();
  useEffect(() => {
    let cancelled = false;
    const path = location.pathname;
    const isPrivateRoute = /^\/(login|register|admin)(\/|$)/i.test(path);
    const profileMatch = path.match(/^\/profile\/([^/]+)\/?$/i);
    const apply = (title, description, url, noindex = false) => {
      if (cancelled) return;
      document.title = title;
      setMeta('description', description);
      setMeta('robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
      setMeta('og:title', title, 'property');
      setMeta('og:description', description, 'property');
      setMeta('og:url', url, 'property');
      setMeta('twitter:title', title);
      setMeta('twitter:description', description);
      setCanonical(url);
    };
    if (isPrivateRoute) {
      const title = path.startsWith('/login') ? 'Sign in to VibePulse' : path.startsWith('/register') ? 'Create a VibePulse Account' : 'VibePulse Admin';
      apply(title, 'Access your VibePulse account and community features.', SITE + path, true);
      return () => { cancelled = true; };
    }
    if (profileMatch) {
      const username = decodeURIComponent(profileMatch[1]).replace(/^@/, '');
      const profileUrl = SITE + '/profile/' + encodeURIComponent(username);
      apply(`@${username} on VibePulse`, `View the public profile and posts shared by @${username} on VibePulse.`, profileUrl);
      api.get(`/users/${encodeURIComponent(username)}/profile`)
        .then(({ data }) => {
          const displayName = data.displayName || data.username || username;
          const bio = String(data.bio || '').replace(/\s+/g, ' ').trim();
          const description = (bio ? `${displayName} on VibePulse: ${bio}` : `Discover ${displayName}'s public profile, posts, and community activity on VibePulse.`).slice(0, 300);
          apply(`${displayName} (@${data.username}) — VibePulse`, description, SITE + '/profile/' + encodeURIComponent(data.username));
        })
        .catch(() => apply(`@${username} on VibePulse`, `View the public profile and posts shared by @${username} on VibePulse.`, profileUrl, true));
      return () => { cancelled = true; };
    }
    apply(DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE + (path === '/' ? '/' : path), false);
    return () => { cancelled = true; };
  }, [location.pathname]);
  return null;
}
