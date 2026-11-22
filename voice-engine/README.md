---
title: VibePulse Bengali Voice Engine
sdk: gradio
python_version: 3.10
app_file: app.py
---
# VibePulse Bengali Voice Engine

A private inference API for the VibePulse Voice Studio, powered by AI4Bharat IndicF5.

## Required Space secrets

- `HF_TOKEN`: a Hugging Face token with read access. First accept the model conditions at https://huggingface.co/ai4bharat/IndicF5.
- `VOICE_ENGINE_TOKEN`: a long random secret shared only with the VibePulse Render backend.

## API

- Health: `GET /health`
- Generate: `POST /api/clone` (multipart fields: `sample`, `text`, `language=bn`, `ref_text`, `consent=true`; header `Authorization: Bearer <VOICE_ENGINE_TOKEN>`).

The model accepts a reference audio sample and the exact transcript spoken in that sample. Only clone a voice you own or have explicit permission to use.

This Space uses Hugging Face ZeroGPU. Free GPU usage is subject to the account's provider quota and availability; the VibePulse app itself does not impose a daily or hourly generation quota.
