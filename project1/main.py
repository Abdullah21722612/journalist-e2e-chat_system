from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import uvicorn
import os

load_dotenv()
PORT = int(os.getenv("PORT", 8001))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

from database.auth import router as auth_router
from database.data import router as data_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, tags=["auth"])
app.include_router(data_router, tags=["data"])

from database.chat_new import app as chat_app_routes
for route in chat_app_routes.routes:
    app.routes.append(route)

# StaticFiles mount 
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    print(f"🚀 Starting server on port {PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)