# Before replacing the existing VibePulse Render service

1. Keep the downloaded old ZIP and export/backup the Supabase database.
2. Do not delete the old database or storage bucket.
3. This package is split into a Vite frontend and Express API. A single existing Render service configured for the previous app may not run it without changing settings. You may need a web service for `server` and a static site for `client`; the frontend URL and API URL are separate unless you add a reverse proxy/custom routing.
4. If the goal is exactly the same URL, first inspect the current Render service type and domain configuration. Do not switch it until the new deployment is tested on a temporary service.
5. The provided starter does not yet implement every item from the long specification. Do not advertise unfinished battles, point purchases, image upload, or full admin moderation as complete.
