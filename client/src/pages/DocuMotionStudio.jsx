import { useEffect } from 'react';

export default function DocuMotionStudio() {
  useEffect(() => {
    document.title = 'DocuMotion Pro — VibePulse';
    return () => { document.title = 'VibePulse'; };
  }, []);

  return (
    <main className="h-screen w-full overflow-hidden bg-slate-950">
      <iframe
        title="DocuMotion Pro Documentary Animation Studio"
        src="/autocut-studio-app/index.html"
        className="h-full w-full border-0"
        allow="camera; microphone; clipboard-read; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}
