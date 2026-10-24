FROM python:3.9-slim
RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir ai4bharat-transliteration==1.1.3 fastapi==0.115.6 "uvicorn[standard]==0.32.1"
WORKDIR /app
COPY app.py index.html ./
# Download the model and rescoring dictionary at build time so the Space starts warm.
RUN python -c "import argparse,torch; torch.serialization.add_safe_globals([argparse.Namespace]); from ai4bharat.transliteration import XlitEngine; print(XlitEngine('te', beam_width=10, rescore=True).translit_word('vachaavu', topk=3))"
RUN useradd -m -u 1000 user
USER user
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
