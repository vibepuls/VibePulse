import { copyFile } from 'node:fs/promises';

// Render Static Sites do not automatically apply the Netlify-style _redirects file.
// Copy the built entry point to 404.html so client-side routes can boot on direct visits.
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url));
console.log('Created dist/404.html for React Router deep links.');
