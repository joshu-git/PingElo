<h1>PingElo</h1>

<p>PingElo is a full stacj web application for managing competitive ping pong rankings using an Elo system. It demonstrates real world full stack development skills including authentication, microservices, API design, and deployment. To view the website please click <strong><a href="https://pingelo.vercel.app" target="_black " rel="noopener noreferrer">Here</a></strong>. Thank you for reading; I appreciate it.</p>

<h3>Features</h3>
<ul>
  <li>Public leaderboard (no login required)</li>
  <li>Secure authentication</li>
  <li>Match submission with automatic Elo updates</li>
  <li>Player claiming</li>
  <li>Dedicated Python Elo calculation service</li>
</ul>

<h3>Architecture Overview</h3>
<p>PingElo uses a service-oriented architecture:</p>
<ul>
  <li>Frontend: Next.js</li>
  <li>Backend API: Express + TypeScript</li>
  <li>Elo Service: FastAPI (Python)</li>
  <li>Database & Auth: Supabase</li>
  <li>Hosting: Vercel & Render</li>
</ul>
<p>This separation keeps business logic isolated, testable, and scalable.</p>

<h3>Tech Stack</h3>
<ul>
  <li>Next.js & TypeScript</li>
  <li>Node.js & Express</li>
  <li>Python & FastAPI</li>
  <li>PostgreSQL (Supabase)</li>
</ul>

<h3>Authentication</h3>
<ul>
  <li>Anyone can view rankings</li>
</ul>
<p>Users must sign in to:</p>
<ul>
  <li>Submit matches</li>
  <li>Claim players</li>
</ul>

<h3>Health & Monitoring</h3>
<ul>
  <li>Health endpoints for all services</li>
  <li>External uptime monitoring</li>
  <li>Graceful error handling between services</li>
</ul>
