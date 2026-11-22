---
title: VibePulse Bengali Voice Engine
emoji: 🎙️
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: 5.50.0
python_version: "3.10"
app_file: app.py
short_description: Private Bengali voice cloning API for VibePulse
models:
  - ai4bharat/IndicF5
---
# VibePulse Bengali Voice Engine

A private inference API for the VibePulse Voice Studio, powered by AI4Bharat IndicF5.

## Space setup

Create this as a **Private Gradio Space** and select **ZeroGPU** in Space Settings. On eligible free personal accounts, Hugging Face currently allows up to two ZeroGPU Spaces.

## Required Space secrets

- `HF_TOKEN`: a Hugging Face read token. First accept the model conditions at https://huggingface.co/ai4bharat/IndicF5.
- `VOICE_ENGINE_TOKEN`: use the same long random token as `HF_TOKEN`. The VibePulse backend sends this token to authenticate to the private Space and the API checks it before running inference.

Add the same token to the Render backend as `VOICE_ENGINE_TOKEN`. Set `VOICE_ENGINE_URL` to `https://<your-space-subdomain>.hf.space/api/clone`. Never expose either token in frontend code or Git.

## API

- Health: `GET /health`
- Generate: `POST /api/clone` (multipart fields: `sample`, `text`, `language=bn`, `ref_text`, `consent=true`; header `Authorization: Bearer <VOICE_ENGINE_TOKEN>`).

The model accepts a reference audio sample and the exact transcript spoken in that sample. Only clone a voice you own or have explicit permission to use.

This Space uses Hugging Face ZeroGPU. Free GPU usage is subject to the account's provider quota and availability; the VibePulse app itself does not impose a daily or hourly generation quota.
