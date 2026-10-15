import { copyFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url));
console.log('Created dist/404.html for React Router deep links.');

const site = 'https://vibepulse-frontend.onrender.com';
const api = 'https://vibepulse-backend-boxi.onrender.com/api';
const today = new Date().toISOString().slice(0, 10);
let profiles = [];
try {
  const response = await fetch(`${api}/seo/public-profiles`, { signal: AbortSignal.timeout(12000) });
  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data)) profiles = data.filter((item) => typeof item.username === 'string' && /^[a-z0-9_]{3,24}$/i.test(item.username));
  }
  console.log(`Loaded ${profiles.length} public profile URLs for the sitemap.`);
} catch (error) {
  console.warn('Could not fetch public profiles for sitemap; keeping homepage only:', error.message);
}

const urls = [
  `  <url><loc>${site}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  ...profiles.map((profile) => {
    const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(profile.lastmod || '') ? profile.lastmod : today;
    const username = encodeURIComponent(profile.username);
    return `  <url><loc>${site}/profile/${username}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
  })
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
await writeFile(new URL('../dist/sitemap.xml', import.meta.url), sitemap, 'utf8');
console.log(`Generated sitemap with ${urls.length} URLs.`);
