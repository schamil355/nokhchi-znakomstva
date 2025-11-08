# Face Verification Microservice

FastAPI-based service providing facial embeddings, similarity checks and lightweight liveness estimates for the dating app verification workflow.

## Features

- **/embed** – generate 512-dimension L2-normalised embeddings from a selfie or profile photo.
- **/verify** – compare selfie vs. profile image, return cosine similarity plus simple blink/head-turn heuristics.
- **/health** – readiness check for orchestration.
- Configurable similarity and liveness thresholds via environment variables.
- Processes images only in memory; no disk persistence or logging of PII/embeddings.

## Environment variables

| Variable         | Default     | Description                                    |
|------------------|-------------|------------------------------------------------|
| `MODEL_PATH`     | `buffalo_l` | insightface model name or ONNX path            |
| `THRESHOLD_SIM`  | `0.60`      | Minimum cosine similarity to mark as matched  |
| `THRESHOLD_BLINK`| `0.50`      | Minimum blink score for liveness               |

## Local development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Test the endpoints with curl:

```bash
curl -X POST http://localhost:8000/embed \
  -F "image=@selfie.jpg"

curl -X POST http://localhost:8000/verify \
  -F "selfie=@selfie.jpg" \
  -F "profile=@profile.jpg"
```

## Docker

```bash
docker build -t face-verification-service .
docker run -p 8000:8000 \
  -e MODEL_PATH=buffalo_l \
  -e THRESHOLD_SIM=0.65 \
  -e THRESHOLD_BLINK=0.55 \
  face-verification-service
```

## Notes

- Requires the specified insightface model to be available (default downloads `buffalo_l` automatically).
- Set `CUDAExecutionProvider` availability by providing CUDA drivers or adjust provider list in `main.py`.
- For production, ensure `THRESHOLD_SIM`/`THRESHOLD_BLINK` align with evaluation metrics and integrate with central logging/observability (without storing embeddings).
