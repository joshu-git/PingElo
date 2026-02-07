import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import playersRoutes from "./routes/players.routes.js";
import matchesRoutes from "./routes/matches.routes.js";
import groupsRoutes from "./routes/groups.routes.js";
import tournamentsRoutes from "./routes/tournaments.routes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use(
	cors({
		origin: process.env.FRONTEND_URL,
		credentials: true,
		allowedHeaders: ["Content-Type", "Authorization"],
	})
);

//All routes
app.use("/players", playersRoutes);
app.use("/matches", matchesRoutes);
app.use("/groups", groupsRoutes);
app.use("/tournaments", tournamentsRoutes);

app.get("/", (_req, res) => {
	res.json({ message: "Backend is running" });
});

//Health check for UptimeRobot
app.head("/health", (_req, res) => {
	res.sendStatus(200);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`PingElo backend running on port ${PORT}`);
});
