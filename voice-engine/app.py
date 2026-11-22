import io
import os
import hmac
import tempfile
import subprocess
from pathlib import Path

import gradio as gr
import numpy as np
import soundfile as sf
import spaces
import torch
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from transformers import AutoModel

MODEL_ID = "ai4bharat/IndicF5"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
token = os.getenv("HF_TOKEN")
if not token:
    raise RuntimeError("Set HF_TOKEN in the Space secrets after accepting the IndicF5 model conditions.")
# ZeroGPU provides CUDA emulation during startup; load the model onto CUDA here,
# as recommended by Hugging Face, before GPU-decorated requests are called.
model = AutoModel.from_pretrained(
    MODEL_ID,
    trust_remote_code=True,
    token=token,
).to("cuda")

@spaces.GPU(duration=300)
def synthesize(text: str, sample_path: str, ref_text: str):
    audio = model(text, ref_audio_path=sample_path, ref_text=ref_text)
    audio = np.asarray(audio)
    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0
    else:
        audio = audio.astype(np.float32)
    audio = np.squeeze(audio)
    if audio.ndim != 1 or audio.size == 0:
        raise RuntimeError("The model returned an invalid audio result.")
    output = io.BytesIO()
    sf.write(output, audio, samplerate=24000, format="WAV", subtype="PCM_16")
    return output.getvalue()

api = FastAPI(title="VibePulse Bengali Voice Engine")

@api.get("/health")
def health():
    return {"status": "ok", "model": MODEL_ID, "language": "bn"}

@api.post("/api/clone")
async def clone_voice(
    sample: UploadFile = File(...),
    text: str = Form(...),
    language: str = Form(...),
    ref_text: str = Form(...),
    consent: str = Form(...),
    authorization: str | None = Header(default=None),
):
    expected = os.getenv("VOICE_ENGINE_TOKEN", "")
    supplied = (authorization or "").removeprefix("Bearer ").strip()
    if not expected or not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Unauthorized engine request.")
    if language != "bn":
        raise HTTPException(status_code=400, detail="Only Bengali is enabled.")
    if consent.lower() != "true":
        raise HTTPException(status_code=400, detail="Voice-owner permission is required.")
    if not text.strip() or len(text) > 1200:
        raise HTTPException(status_code=400, detail="Text must contain 1 to 1200 characters.")
    if not ref_text.strip() or len(ref_text) > 500:
        raise HTTPException(status_code=400, detail="Provide the Bengali transcript of the reference audio.")
    raw = await sample.read()
    if not raw or len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Audio sample must be smaller than 15 MB.")
    with tempfile.TemporaryDirectory() as workdir:
        source = Path(workdir) / (sample.filename or "reference-audio")
        wav_path = Path(workdir) / "reference.wav"
        source.write_bytes(raw)
        # ffmpeg safely normalizes browser recordings (including WEBM/M4A) for the model.
        proc = subprocess.run(
            ["ffmpeg", "-nostdin", "-y", "-i", str(source), "-ac", "1", "-ar", "24000", str(wav_path)],
            capture_output=True,
            text=True,
            timeout=45,
        )
        if proc.returncode != 0 or not wav_path.exists():
            raise HTTPException(status_code=400, detail="Could not read the uploaded audio. Try WAV or MP3.")
        try:
            wav_bytes = synthesize(text.strip(), str(wav_path), ref_text.strip())
        except Exception as exc:
            print(f"IndicF5 inference failed: {type(exc).__name__}: {exc}")
            raise HTTPException(status_code=502, detail="Bengali voice generation failed. Please retry when the free GPU is available.")
    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": 'attachment; filename="vibepulse-voice.wav"', "Cache-Control": "no-store"},
    )

# A Gradio Space is required for Hugging Face ZeroGPU. The API endpoint above is
# used privately by the VibePulse backend; the UI is intentionally minimal.
demo = gr.Blocks()
with demo:
    gr.Markdown("# VibePulse Bengali Voice Engine\nPrivate API for the VibePulse Voice Studio.")
app = gr.mount_gradio_app(api, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
