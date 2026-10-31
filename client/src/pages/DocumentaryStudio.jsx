import { useEffect } from 'react';

export default function DocumentaryStudio() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'DocuMotion Pro — VibePulse';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <main style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#080b12', zIndex: 100 }}>
      <iframe
        title="DocuMotion Pro Documentary Animation Studio"
        src="/autocut-studio-app/index.html"
        style={{ display: 'block', width: '100%', height: '100%', border: 0, background: '#080b12' }}
        allow="fullscreen; clipboard-read; clipboard-write"
      />
    </main>
  );
}
