from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#Data validation and parsing
from pydantic import BaseModel

from dotenv import load_dotenv
import os

#Load environment variables
load_dotenv()

#Create FastAPI app
app = FastAPI()

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

#Elo calculation for every match

#The data python expects from typescript
class EloRequest(BaseModel):
    RatingPlayerA: int
    RatingPlayerB: int
    ScorePlayerA: int
    ScorePlayerB: int
    GamePoints: int

#The data python will send typescript
class EloResponse(BaseModel):
    NewRatingPlayerA: int
    NewRatingPlayerB: int
    Winner = str

@app.post("/calculate_elo", response_model=EloResponse)
def calculate_elo(request: EloRequest):
    #Get previous elo of players
    RatingA = request.RatingPlayerA
    RatingB = request.RatingPlayerB

    #Get score of each player
    ScoreA = request.ScorePlayerA
    ScoreB = request.ScorePlayerB

    #Get how many points the game was
    GamePoints = request.GamePoints

    