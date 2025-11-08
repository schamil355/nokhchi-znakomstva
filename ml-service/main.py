import io
import logging
import os
from functools import lru_cache
from typing import List, Optional, Tuple

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from insightface.app import FaceAnalysis
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verification-service")

THRESHOLD_SIM = float(os.getenv("THRESHOLD_SIM", "0.60"))
THRESHOLD_BLINK = float(os.getenv("THRESHOLD_BLINK", "0.50"))
MODEL_NAME = os.getenv("MODEL_PATH", "buffalo_l")

app = FastAPI(title="Face Verification Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmbedResponse(BaseModel):
    embedding: List[float]
    face_detected: bool


class LivenessPayload(BaseModel):
    blink: float
    head_turn: float


class VerifyResponse(BaseModel):
    similarity: float
    matched: bool
    liveness: LivenessPayload


def load_image(file: UploadFile) -> np.ndarray:
    data = file.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload.")
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unsupported image format.")
    return image


@lru_cache(maxsize=1)
def get_face_analyzer() -> FaceAnalysis:
    app = FaceAnalysis(name=MODEL_NAME, providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    logger.info("FaceAnalysis model loaded: %s", MODEL_NAME)
    return app


def embed_face(image: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[object]]:
    analyzer = get_face_analyzer()
    faces = analyzer.get(image)
    if not faces:
        return None, None
    face = faces[0]
    embedding = np.asarray(face.normed_embedding, dtype=np.float32)
    if embedding.size != 512:
        logger.warning("Unexpected embedding dimension: %s", embedding.size)
    return embedding, face


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    if vec_a is None or vec_b is None:
        return 0.0
    denom = (np.linalg.norm(vec_a) * np.linalg.norm(vec_b)) + 1e-10
    return float(np.dot(vec_a, vec_b) / denom)


def estimate_liveness(image: np.ndarray, face) -> LivenessPayload:
    if face is None:
        return LivenessPayload(blink=0.0, head_turn=0.0)

    x1, y1, x2, y2 = face.bbox.astype(int)
    y1 = max(y1, 0)
    x1 = max(x1, 0)
    y2 = min(y2, image.shape[0])
    x2 = min(x2, image.shape[1])

    face_region = image[y1:y2, x1:x2]
    if face_region.size == 0:
        return LivenessPayload(blink=0.0, head_turn=0.0)

    gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    blink_score = min(1.0, laplacian_var / 100.0)

    kps = face.kps
    left_eye, right_eye = kps[0], kps[1]
    eye_dist = abs(left_eye[0] - right_eye[0])
    face_width = max(1.0, face_region.shape[1])
    head_turn_score = min(1.0, eye_dist / face_width * 2)

    return LivenessPayload(blink=blink_score, head_turn=head_turn_score)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed", response_model=EmbedResponse)
async def embed(image: UploadFile = File(...)):
    img = load_image(image)
    embedding, _ = embed_face(img)
    if embedding is None:
        return EmbedResponse(embedding=[], face_detected=False)
    return EmbedResponse(embedding=embedding.tolist(), face_detected=True)


@app.post("/verify", response_model=VerifyResponse)
async def verify(
    selfie: UploadFile = File(...),
    profile: UploadFile = File(...)
):
    selfie_img = load_image(selfie)
    profile_img = load_image(profile)

    selfie_embedding, selfie_face = embed_face(selfie_img)
    profile_embedding, _ = embed_face(profile_img)

    if selfie_embedding is None or profile_embedding is None:
        raise HTTPException(status_code=422, detail="Face not detected in one or both images.")

    similarity = cosine_similarity(selfie_embedding, profile_embedding)
    liveness = estimate_liveness(selfie_img, selfie_face)

    matched = similarity >= THRESHOLD_SIM and liveness.blink >= THRESHOLD_BLINK

    return VerifyResponse(
        similarity=similarity,
        matched=matched,
        liveness=liveness,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
