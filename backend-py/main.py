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

#Enable CORS for the ts backend URL
allowed_origin = os.getenv("TYPESCRIPT_BACKEND_URL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin] if allowed_origin else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Health check for backend startup
@app.get("/")
def root():
    return {"message": "Backend is running!"}

#Health check for UptimeRobot
@app.head("/health")
def health():
    return Response(status_code=200)

#Elo calculation for every match

#Base elo sensitivity per match
BASE_K = 50

#Standard amount of points in a game
IDEAL_POINTS = 7

#Standard expected score formula for elo
def expected_score(rating_a: int, rating_b: int) -> float:
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

def calculate_effective_k(score_a: int, score_b: int, game_points: int) -> float:
    #Elo is scaled based on game length
    length_factor = game_points / IDEAL_POINTS

    #Elo is scaled based on score difference
    score_diff_factor =  abs(score_a - score_b) / game_points
    return BASE_K * score_diff_factor * length_factor

#The data py expects from ts
class EloRequest(BaseModel):
    rating_player_a: int
    rating_player_b: int
    score_player_a: int
    score_player_b: int
    game_points: int

#The data py will send ts
class EloResponse(BaseModel):
    new_rating_a: int
    new_rating_b: int
    rating_change_a: int
    rating_change_b: int
    winner: str

@app.post("/calculate_elo", response_model=EloResponse)
def calculate_elo(request: EloRequest):
    #Get previous elo of players
    rating_a = request.rating_player_a
    rating_b = request.rating_player_b

    #Get score of each player
    score_a = request.score_player_a
    score_b = request.score_player_b

    #Get how many points the game was
    game_points = request.game_points

    if score_a > score_b:
        winner = "A"
        actual_a = 1
        actual_b = 0
    else:
        winner = "B"
        actual_a = 0
        actual_b = 1

    #Determines who was expected to win
    expected_a = expected_score(rating_a, rating_b)
    expected_b = 1 - expected_a

    #Calculates elo scale modifier
    effective_k = calculate_effective_k(score_a, score_b, game_points)

    #Gives elo change for both players
    rating_change_a = round(effective_k * (actual_a - expected_a))
    rating_change_b = -rating_change_a

    #Uses change to assign new rating
    new_rating_a = rating_a + rating_change_a
    new_rating_b = rating_b + rating_change_b

    #returns winner and new elo ratings
    return EloResponse(
        new_rating_a=new_rating_a,
        new_rating_b=new_rating_b,
        rating_change_a=rating_change_a,
        rating_change_b=rating_change_b,
        winner=winner
    )