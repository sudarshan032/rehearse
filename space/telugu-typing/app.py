import argparse
from functools import lru_cache

import torch
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# IndicXlit checkpoints store an argparse.Namespace; allow it for torch's safe loader.
torch.serialization.add_safe_globals([argparse.Namespace])
from ai4bharat.transliteration import XlitEngine  # noqa: E402

engine = XlitEngine("te", beam_width=10, rescore=True)
app = FastAPI(title="FlowFit Telugu Typing")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


def clean(s: str) -> str:
    return s.replace("‌", "").replace("‍", "")


@lru_cache(maxsize=50_000)
def word(w: str, k: int) -> tuple:
    if not w.isascii() or not w.isalpha():
        return (w,)  # numbers, punctuation and Telugu text pass through unchanged
    return tuple(dict.fromkeys(clean(s) for s in engine.translit_word(w.lower(), topk=k)["te"]))[:k]


@app.get("/api/xlit")
def xlit(text: str = Query(..., max_length=500), k: int = Query(3, ge=1, le=5)):
    words = text.split()[:60]
    return {"words": [{"input": w, "suggestions": list(word(w, k))} for w in words]}


@app.get("/")
def home():
    return FileResponse("index.html")
