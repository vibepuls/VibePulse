import { copyFile, writeFile } from 'node:fs/promises';

await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url));
console.log('Created dist/404.html for React Router deep links.');

const site = 'https://vibepulse-frontend.onrender.com';
const today = new Date().toISOString().slice(0, 10);

// Keep the sitemap limited to confirmed HTTP-200 routes. Add public profile URLs
// only after Render's Static Site rewrite rule serves deep links with HTTP 200.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
await writeFile(new URL('../dist/sitemap.xml', import.meta.url), sitemap, 'utf8');
console.log('Generated safe sitemap with the confirmed homepage URL.');
