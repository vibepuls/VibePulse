import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AudioLines, CheckCircle2, Download, FileAudio, Mic, Play, ShieldCheck, Sparkles, Upload, WandSparkles } from 'lucide-react';
import './VoiceStudio.css';
import api from '../services/api';

export default function VoiceStudio() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [generated, setGenerated] = useState('');
  const [text, setText] = useState('');
  const [sampleTranscript, setSampleTranscript] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [password, setPassword] = useState('');
  const [accessBusy, setAccessBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('আপনার ভয়েস স্যাম্পল আপলোড করুন অথবা রেকর্ড করুন।');
  const [busy, setBusy] = useState(false);
  const recorder = useRef(null);
  const chunks = useRef([]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (generated) URL.revokeObjectURL(generated); }, [generated]);

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

  const unlock = async (event) => {
    event.preventDefault();
    setAccessBusy(true);
    setStatus('পাসওয়ার্ড যাচাই করা হচ্ছে…');
    try {
      const response = await api.post('/voice/access', { password });
      setAccessToken(response.data.accessToken);
      setPassword('');
      setStatus('প্রবেশ অনুমোদিত।');
    } catch (error) {
      setStatus(error.response?.data?.error || 'প্রবেশ অনুমোদন পাওয়া যায়নি।');
    } finally { setAccessBusy(false); }
  };

  const generate = async () => {
    if (!file) { setStatus('প্রথমে আপনার ভয়েস স্যাম্পল দিন।'); return; }
    if (!text.trim()) { setStatus('যে লেখাটি ভয়েসে রূপান্তর করতে চান সেটি লিখুন।'); return; }
    if (!consent) { setStatus('কণ্ঠের মালিকানা/অনুমতির বিষয়টি নিশ্চিত করুন।'); return; }
    setBusy(true);
    setStatus('আপনার ভয়েস তৈরি করা হচ্ছে…');
    setGenerated('');
    try {
      const form = new FormData();
      form.append('sample', file);
      form.append('text', text.trim());
      form.append('language', 'bn');
      form.append('ref_text', sampleTranscript.trim());
      form.append('consent', 'true');
      const response = await api.post('/voice/clone', form, {
        headers: { 'Content-Type': 'multipart/form-data', 'X-Voice-Studio-Token': accessToken },
        responseType: 'blob',
        timeout: 190000
      });
      const audioUrl = URL.createObjectURL(response.data);
      setGenerated(audioUrl);
      setStatus('আপনার AI ভয়েস তৈরি হয়েছে। নিচে শুনুন অথবা ডাউনলোড করুন।');
    } catch (error) {
      let message = error.response?.data?.error;
      if (error.response?.data instanceof Blob) {
        try { message = JSON.parse(await error.response.data.text()).error; } catch {}
      }
      setStatus(message || 'ভয়েস তৈরি করা যায়নি। AI সার্ভার চালু আছে কি না দেখুন।');
    } finally {
      setBusy(false);
    }
  };

  if (!accessToken) return <div className="vp-voice-page vp-voice-lock-page">
    <div className="vp-voice-lock-card">
      <span className="vp-voice-logo"><ShieldCheck size={22}/></span>
      <div className="vp-voice-kicker">PRIVATE WORKSPACE</div>
      <h1>Voice Studio</h1>
      <p>এই বাংলা Voice Studio-টি ব্যক্তিগত। প্রবেশ করতে পাসওয়ার্ড দিন।</p>
      <form onSubmit={unlock}>
        <label htmlFor="vp-voice-password">পাসওয়ার্ড</label>
        <input id="vp-voice-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="পাসওয়ার্ড লিখুন" required />
        <button type="submit" disabled={accessBusy}>{accessBusy ? 'যাচাই হচ্ছে…' : 'প্রবেশ করুন'}</button>
      </form>
      <div className="vp-voice-status"><span/> {status}</div>
      <Link to="/" className="vp-voice-lock-back"><ArrowLeft size={15}/> VibePulse-এ ফিরে যান</Link>
    </div>
  </div>;

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
        <p>নিজের কণ্ঠের নমুনা দিয়ে বাংলায় AI ভয়েস তৈরি করুন।</p>
        <div className="vp-voice-langs"><span>শুধু বাংলা</span><span>ব্যক্তিগত ব্যবহার</span><span>Voice sample</span></div>
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
          <label className="vp-voice-field-label" htmlFor="vp-voice-reference-text">স্যাম্পল অডিওতে যা বলা হয়েছে (বিশেষ করে বাংলার জন্য)</label>
          <textarea id="vp-voice-reference-text" className="vp-voice-reference-text" value={sampleTranscript} onChange={e => setSampleTranscript(e.target.value)} maxLength={500} placeholder="অডিওতে বলা কথাগুলো এখানে লিখুন…"/>
          <div className="vp-voice-security"><ShieldCheck size={17}/><span>শুধু নিজের কণ্ঠ অথবা কণ্ঠের মালিকের স্পষ্ট অনুমতি থাকা অডিও ব্যবহার করুন।</span></div>
        </section>
        <section className="vp-voice-card">
          <div className="vp-voice-card-heading"><span className="vp-voice-step">02</span><div><h2>Text to speech</h2><p>যে কথাগুলো বলাতে চান, এখানে লিখুন।</p></div></div>
          <textarea className="vp-voice-textarea" value={text} onChange={e => setText(e.target.value)} maxLength={1200} placeholder="এখানে বাংলা লেখা লিখুন…"/>
          <div className="vp-voice-text-meta"><span>সর্বোচ্চ ১,২০০ অক্ষর</span><b>{text.length}/1200</b></div>
          <div className="vp-voice-language-fixed">ভাষা: বাংলা</div>
          <label className="vp-voice-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>আমি নিশ্চিত করছি, আপলোড করা কণ্ঠটি আমার অথবা এটি ব্যবহারের স্পষ্ট অনুমতি আমার আছে।</span></label>
          <button className="vp-voice-generate" onClick={generate} disabled={busy}><WandSparkles size={18}/> {busy ? 'প্রস্তুত হচ্ছে…' : 'Generate AI Voice'}</button>
          {generated && <div className="vp-voice-result">
            <div className="vp-voice-result-title"><CheckCircle2 size={17}/> Generated voice</div>
            <audio controls src={generated}/>
            <a href={generated} download="vibepulse-voice.wav"><Download size={16}/> Download audio</a>
          </div>}
          <div className="vp-voice-status"><span/> {status}</div>
        </section>
      </div>
      <section className="vp-voice-info"><div className="vp-voice-info-icon"><ShieldCheck size={21}/></div><div><b>নিরাপদ ও দায়িত্বশীল ব্যবহার</b><p>কারও অনুমতি ছাড়া তার কণ্ঠ ক্লোন, পরিচয় নকল বা প্রতারণামূলক কাজে ব্যবহার করা যাবে না।</p></div></section>
    </main>
    <footer className="vp-voice-footer">VibePulse · Voice Studio <span>শুধু বাংলা · Private</span></footer>
  </div>;
}
