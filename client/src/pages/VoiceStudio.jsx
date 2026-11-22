import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AudioLines, CheckCircle2, Download, FileAudio, Mic, Play, ShieldCheck, Sparkles, Upload, WandSparkles } from 'lucide-react';
import './VoiceStudio.css';

export default function VoiceStudio() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('auto');
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('আপনার ভয়েস স্যাম্পল আপলোড করুন অথবা রেকর্ড করুন।');
  const [busy, setBusy] = useState(false);
  const recorder = useRef(null);
  const chunks = useRef([]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const acceptFile = (next) => {
    if (!next) return;
    if (!next.type.startsWith('audio/')) { setStatus('শুধু অডিও ফাইল আপলোড করুন।'); return; }
    if (next.size > 15 * 1024 * 1024) { setStatus('ফাইলের সাইজ ১৫ MB-এর মধ্যে রাখুন।'); return; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setStatus('ভয়েস স্যাম্পল প্রস্তুত।');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recorder.current = mr; chunks.current = [];
      mr.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        acceptFile(new File([blob], 'vibepulse-voice-sample.webm', { type: blob.type }));
        stream.getTracks().forEach(track => track.stop());
      };
      mr.start(); setRecording(true); setStatus('রেকর্ডিং চলছে…');
    } catch { setStatus('মাইক্রোফোন ব্যবহারের অনুমতি দিন।'); }
  };

  const stopRecording = () => {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    setRecording(false);
  };

  const generate = async () => {
    if (!file) { setStatus('প্রথমে আপনার ভয়েস স্যাম্পল দিন।'); return; }
    if (!text.trim()) { setStatus('যে লেখাটি ভয়েসে রূপান্তর করতে চান সেটি লিখুন।'); return; }
    if (!consent) { setStatus('কণ্ঠের মালিকানা/অনুমতির বিষয়টি নিশ্চিত করুন।'); return; }
    setBusy(true);
    setStatus('AI Voice Engine এখনো সার্ভারে সংযুক্ত হয়নি।');
    setBusy(false);
  };

  return <div className="vp-voice-page">
    <header className="vp-voice-header">
      <Link to="/" className="vp-voice-back"><ArrowLeft size={18}/> VibePulse</Link>
      <div className="vp-voice-brand"><span className="vp-voice-logo"><AudioLines size={20}/></span><span>VibePulse <b>Voice Studio</b></span></div>
      <span className="vp-voice-beta">AI STUDIO · BETA</span>
    </header>
    <main className="vp-voice-main">
      <section className="vp-voice-hero">
        <div className="vp-voice-kicker"><Sparkles size={14}/> AI VOICE TECHNOLOGY</div>
        <h1>আপনার কণ্ঠ, <span>AI-এর শক্তিতে</span></h1>
        <p>নিজের কণ্ঠের নমুনা দিয়ে বাংলা ও ইংরেজিতে ভয়েস তৈরি করার ওয়ার্কস্পেস।</p>
        <div className="vp-voice-langs"><span>বাংলা</span><span>English</span><span>Voice sample</span></div>
      </section>
      <div className="vp-voice-grid">
        <section className="vp-voice-card">
          <div className="vp-voice-card-heading"><span className="vp-voice-step">01</span><div><h2>Voice sample</h2><p>আপনার নিজের কণ্ঠ রেকর্ড করুন বা অডিও আপলোড করুন।</p></div></div>
          <label className="vp-voice-drop">
            <input type="file" accept="audio/*" onChange={e => acceptFile(e.target.files?.[0])}/>
            <span className="vp-voice-upload-icon"><Upload size={23}/></span>
            <strong>অডিও ফাইল বেছে নিন</strong><small>MP3, WAV, M4A, WEBM · সর্বোচ্চ ১৫ MB</small>
            <span className="vp-voice-browse">Browse files</span>
          </label>
          <div className="vp-voice-or"><span/> অথবা সরাসরি রেকর্ড করুন <span/></div>
          <button className={recording ? 'vp-voice-record recording' : 'vp-voice-record'} onClick={recording ? stopRecording : startRecording}>
            <Mic size={17}/>{recording ? 'রেকর্ডিং বন্ধ করুন' : 'মাইক্রোফোন দিয়ে রেকর্ড'}
          </button>
          {file && <div className="vp-voice-file"><FileAudio size={18}/><div><b>{file.name}</b><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div><CheckCircle2 size={18}/></div>}
          {preview && <audio className="vp-voice-audio" controls src={preview}/>}
          <div className="vp-voice-security"><ShieldCheck size={17}/><span>শুধু নিজের কণ্ঠ অথবা কণ্ঠের মালিকের স্পষ্ট অনুমতি থাকা অডিও ব্যবহার করুন।</span></div>
        </section>
        <section className="vp-voice-card">
          <div className="vp-voice-card-heading"><span className="vp-voice-step">02</span><div><h2>Text to speech</h2><p>যে কথাগুলো বলাতে চান, এখানে লিখুন।</p></div></div>
          <textarea className="vp-voice-textarea" value={text} onChange={e => setText(e.target.value)} maxLength={1200} placeholder={'এখানে বাংলা বা ইংরেজি লেখা লিখুন…\nWrite your script here…'}/>
          <div className="vp-voice-text-meta"><span>সর্বোচ্চ ১,২০০ অক্ষর</span><b>{text.length}/1200</b></div>
          <div className="vp-voice-field-label">ভাষা নির্বাচন</div>
          <select className="vp-voice-select" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="auto">স্বয়ংক্রিয়ভাবে শনাক্ত করুন</option><option value="bn">বাংলা</option><option value="en">English</option>
          </select>
          <label className="vp-voice-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>আমি নিশ্চিত করছি, আপলোড করা কণ্ঠটি আমার অথবা এটি ব্যবহারের স্পষ্ট অনুমতি আমার আছে।</span></label>
          <button className="vp-voice-generate" onClick={generate} disabled={busy}><WandSparkles size={18}/> {busy ? 'প্রস্তুত হচ্ছে…' : 'Generate AI Voice'}</button>
          <div className="vp-voice-status"><span/> {status}</div>
        </section>
      </div>
      <section className="vp-voice-info"><div className="vp-voice-info-icon"><ShieldCheck size={21}/></div><div><b>নিরাপদ ও দায়িত্বশীল ব্যবহার</b><p>কারও অনুমতি ছাড়া তার কণ্ঠ ক্লোন, পরিচয় নকল বা প্রতারণামূলক কাজে ব্যবহার করা যাবে না।</p></div></section>
    </main>
    <footer className="vp-voice-footer">VibePulse · Voice Studio <span>বাংলা + English</span></footer>
  </div>;
}
