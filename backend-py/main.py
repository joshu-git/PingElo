from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

#Load environment variables
load_dotenv()

#Create FastAPI app
app = FastAPI()

#Setup routes here

#Enable CORS for the frontend URL
allowed_origin = os.getenv("FRONTEND_URL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Health check for backend startup
@app.get("/")
def root():
    return {"message": "Backend is running!"}