import { useEffect, useState } from 'react';
import { Film, Plus, RefreshCw, Save, Trash2, Upload, X } from 'lucide-react';
import api from '../services/api';

const initialForm = {
  title: '', description: '', category: 'Trending', requiredSlots: 6, durationSeconds: 15,
  aspectRatio: '9:16', thumbnailUrl: '', previewUrl: '', musicUrl: '', musicLicense: '',
  configText: '{"motion":"zoom","filter":"none","transition":"fade","clipDuration":2.5}',
  trending: false, popular: false, published: false
};
const categories = ['Trending','Popular','New Templates','Photo Templates','Video Templates','Beat Sync','Cinematic','Love','Sad / Emotional','Birthday','Travel','Slow Motion','Flash Transitions','Instagram / Reels Style'];

export default function ManageTemplates() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/admin/templates');
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.response?.data?.error || 'Templates could not be loaded. Check admin permissions and API deployment.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const change = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const uploadAsset = async (kind, file) => {
    if (!file) return;
    const isPreview = kind === 'previewUrl';
    const valid = isPreview ? ['video/mp4','video/quicktime','video/webm'].includes(file.type) : ['image/jpeg','image/png','image/webp'].includes(file.type);
    if (!valid) { setError(isPreview ? 'Preview must be MP4, MOV, or WEBM.' : 'Thumbnail must be JPG, PNG, or WEBP.'); return; }
    if (file.size > (isPreview ? 100 : 5) * 1024 * 1024) { setError(isPreview ? 'Preview video must be under 50 MB.' : 'Thumbnail must be under 5 MB.'); return; }
    setUploading(kind); setError(''); setNotice('');
    try {
      const body = new FormData(); body.append('file', file);
      const { data } = await api.post(isPreview ? '/media/video-upload' : '/media/upload', body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
      change(kind, data.url); setNotice(isPreview ? 'Preview video uploaded.' : 'Thumbnail uploaded.');
    } catch (e) { setError(e.response?.data?.error || 'Upload failed. Check storage configuration.'); }
    finally { setUploading(''); }
  };
  const startEdit = item => {
    setEditingId(item.id);
    setForm({
      title:item.title || '', description:item.description || '', category:item.category || 'Trending',
      requiredSlots:item.requiredSlots || 6, durationSeconds:item.durationSeconds || 15, aspectRatio:item.aspectRatio || '9:16',
      thumbnailUrl:item.thumbnailUrl || '', previewUrl:item.previewUrl || '', musicUrl:item.musicUrl || '', musicLicense:item.musicLicense || '',
      configText:JSON.stringify(item.config || {}, null, 2), trending:!!item.trending, popular:!!item.popular, published:!!item.published
    });
    setError(''); setNotice('');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const reset = () => { setEditingId(''); setForm(initialForm); setError(''); setNotice(''); };
  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    let config;
    try { config = JSON.parse(form.configText || '{}'); if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(); }
    catch { setError('Editing configuration must be valid JSON.'); setSaving(false); return; }
    const payload = {
      title:form.title.trim(), description:form.description, category:form.category,
      requiredSlots:Number(form.requiredSlots), durationSeconds:Number(form.durationSeconds), aspectRatio:form.aspectRatio,
      thumbnailUrl:form.thumbnailUrl, previewUrl:form.previewUrl, musicUrl:form.musicUrl, musicLicense:form.musicLicense,
      config, trending:form.trending, popular:form.popular, published:form.published
    };
    try {
      if (editingId) await api.patch('/admin/templates/' + encodeURIComponent(editingId), payload);
      else await api.post('/admin/templates', payload);
      setNotice(editingId ? 'Template updated.' : 'Template created.');
      reset(); await load();
    } catch (e) { setError(e.response?.data?.error || 'Template could not be saved.'); }
    finally { setSaving(false); }
  };
  const remove = async item => {
    if (!window.confirm('Delete "' + item.title + '"? This cannot be undone.')) return;
    setError(''); setNotice('');
    try { await api.delete('/admin/templates/' + encodeURIComponent(item.id)); setItems(old => old.filter(x => x.id !== item.id)); setNotice('Template deleted.'); if (editingId === item.id) reset(); }
    catch (e) { setError(e.response?.data?.error || 'Template could not be deleted.'); }
  };
  const togglePublish = async item => {
    try { await api.patch('/admin/templates/' + encodeURIComponent(item.id), { ...item, published:!item.published }); await load(); setNotice(item.published ? 'Template unpublished.' : 'Template published.'); }
    catch (e) { setError(e.response?.data?.error || 'Publish status could not be changed.'); }
  };

  const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400';
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Manage Templates</h2><p className="mt-1 text-sm text-slate-400">Create, configure, publish and remove video templates.</p></div><button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"><RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh</button></div>
    {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
    <form onSubmit={save} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6 lg:grid-cols-2">
      <div className="flex items-center gap-2 lg:col-span-2"><Film className="text-violet-300"/><h3 className="font-bold">{editingId?'Edit template':'Add new template'}</h3></div>
      <label className="text-sm text-slate-300">Template name<input required minLength={2} maxLength={100} value={form.title} onChange={e=>change('title',e.target.value)} className={inputClass}/></label>
      <label className="text-sm text-slate-300">Category<select value={form.category} onChange={e=>change('category',e.target.value)} className={inputClass}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
      <label className="text-sm text-slate-300 lg:col-span-2">Description<textarea maxLength={1000} value={form.description} onChange={e=>change('description',e.target.value)} className={inputClass}/></label>
      <label className="text-sm text-slate-300">Required photo/video slots<input type="number" min="1" max="30" value={form.requiredSlots} onChange={e=>change('requiredSlots',e.target.value)} className={inputClass}/></label>
      <label className="text-sm text-slate-300">Duration (seconds)<input type="number" min="3" max="180" value={form.durationSeconds} onChange={e=>change('durationSeconds',e.target.value)} className={inputClass}/></label>
      <label className="text-sm text-slate-300">Aspect ratio<select value={form.aspectRatio} onChange={e=>change('aspectRatio',e.target.value)} className={inputClass}><option>9:16</option><option>1:1</option><option>16:9</option></select></label>
      <label className="text-sm text-slate-300">Thumbnail image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadAsset('thumbnailUrl',e.target.files?.[0])} className={inputClass}/><span className="mt-1 block text-xs text-slate-500">{uploading==='thumbnailUrl'?'Uploading…':form.thumbnailUrl?'Uploaded':'JPG, PNG, WEBP · max 5 MB'}</span></label>
      <label className="text-sm text-slate-300">Preview video<input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={e=>uploadAsset('previewUrl',e.target.files?.[0])} className={inputClass}/><span className="mt-1 block text-xs text-slate-500">{uploading==='previewUrl'?'Uploading…':form.previewUrl?'Uploaded':'MP4, MOV, WEBM · max 50 MB'}</span></label>
      <label className="text-sm text-slate-300">Music URL (optional)<input type="url" value={form.musicUrl} onChange={e=>change('musicUrl',e.target.value)} className={inputClass}/></label>
      <label className="text-sm text-slate-300">Music license / rights notes<input value={form.musicLicense} onChange={e=>change('musicLicense',e.target.value)} maxLength={500} className={inputClass}/></label>
      <label className="text-sm text-slate-300 lg:col-span-2">Editing configuration (JSON)<textarea value={form.configText} onChange={e=>change('configText',e.target.value)} rows={5} className={inputClass}/><span className="mt-1 block text-xs text-slate-500">Supported fields include motion, filter, transition, and clipDuration. Keep JSON valid.</span></label>
      <div className="flex flex-wrap gap-4 lg:col-span-2">{[['trending','Trending'],['popular','Popular'],['published','Published']].map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key]} onChange={e=>change(key,e.target.checked)}/>{label}</label>)}</div>
      <div className="flex flex-wrap gap-2 lg:col-span-2"><button disabled={saving||!!uploading} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 font-bold disabled:opacity-50"><Save size={16}/>{saving?'Saving…':editingId?'Save changes':'Create template'}</button>{editingId&&<button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5"><X size={16}/> Cancel</button>}</div>
    </form>
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900"><div className="border-b border-white/10 p-4 font-bold">Templates ({items.length})</div>{loading?<p className="p-5 text-sm text-slate-400">Loading templates…</p>:items.length===0?<p className="p-5 text-sm text-slate-400">No database templates yet. Add your first template above.</p>:<div className="divide-y divide-white/5">{items.map(item=><article key={item.id} className="flex flex-wrap items-center gap-3 p-4"><div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-black">{item.thumbnailUrl?<img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover"/>:<Film className="m-3 text-slate-500"/>}</div><div className="min-w-0 flex-1"><div className="font-bold">{item.title}</div><div className="mt-1 text-xs text-slate-400">{item.category} · {item.requiredSlots} slots · {item.durationSeconds}s · {item.aspectRatio}</div><div className="mt-1 flex flex-wrap gap-2 text-[11px]">{item.trending&&<span className="text-orange-300">Trending</span>}{item.popular&&<span className="text-violet-300">Popular</span>}<span className={item.published?'text-emerald-300':'text-slate-500'}>{item.published?'Published':'Unpublished'}</span></div></div><button onClick={()=>startEdit(item)} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Edit</button><button onClick={()=>togglePublish(item)} className="rounded-lg border border-white/10 px-3 py-2 text-xs">{item.published?'Unpublish':'Publish'}</button><button onClick={()=>remove(item)} className="rounded-lg border border-rose-400/20 p-2 text-rose-300" aria-label={'Delete '+item.title}><Trash2 size={15}/></button></article>)}</div>}</div>
  </section>;
}
