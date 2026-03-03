import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from routers import evaluate, history, analytics, manual_score, train, predict, detect

load_dotenv()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="AI Answer Evaluator API",
    description="Production-grade AI-powered answer evaluation backend",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow frontend origins
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(evaluate.router)
app.include_router(history.router)
app.include_router(analytics.router)
app.include_router(manual_score.router)
app.include_router(train.router)
app.include_router(predict.router)
app.include_router(detect.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "AI Answer Evaluator"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
