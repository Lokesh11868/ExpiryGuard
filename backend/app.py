from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
@app.get("/")
def health_check():
    return {"status": "ok", "message": "ExpiryGuard Backend is running"}

@app.on_event("startup")
async def startup_event():
    from email_scheduler import start_alert_manager
    print("[Startup] V2: Starting centralized alert manager...")
    start_alert_manager()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)