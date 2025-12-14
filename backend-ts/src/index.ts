import express from "express";
import cors from "cors";
import dotenv from "dotenv";

//Gives access to player routes
import playersRoutes from "./routes/players.routes.js"

//Gives access to match routes
import matchesRoutes from "./routes/matches.routes.js"

//Gives access to admin routes
import adminRoutes from  "./routes/admin.routes.js"

//Load environment variables
dotenv.config();

//Create the Express app
const app = express();

//Parses JSON bodies
app.use(express.json())

//Enable CORS for the frontend URL
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

//All routes for players, matches and admins
app.use("/players", playersRoutes);
app.use("/matches", matchesRoutes);
app.use("/admin", adminRoutes)

//Health check to confirm the backend is running
app.get("/", (_req, res) => {
    res.json({ message: "Backend is running" });
});

//Health check for UptimeRobot
app.head("/health", (_req, res) => {
  res.sendStatus(200);
});

//Start server using Render Port or local dev
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PingElo backend running on port ${PORT}`);
});