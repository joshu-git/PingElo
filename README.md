<h1>PingElo</h1>

<p>PingElo is a full stack web application for managing competitive ping pong rankings using an Elo system. It demonstrates real world full stack development skills including authentication, microservices, API design, and deployment. To view the website please click <strong><a href="https://pingelo.vercel.app" target="_black " rel="noopener noreferrer">Here</a></strong>. Thank you for reading; I appreciate it.</p>

<h3>Features</h3>
<ul>
  <li>Public leaderboard and matches</li>
  <li>Secure authentication</li>
  <li>Match submission with automatic Elo updates</li>
  <li>Smart player claiming and creation system</li>
  <li>Tournament setup with fair Elo adjustments</li>
</ul>

<h3>Architecture Overview</h3>
<p>PingElo uses a service oriented architecture:</p>
<ul>
  <li>Frontend: Next.js + TypeScript</li>
  <li>Backend: Express + TypeScript</li>
  <li>Database & Auth: Supabase</li>
  <li>Hosting: Vercel & Render</li>
</ul>
<p>This separation keeps business logic isolated, testable, and scalable.</p>

<h3>Tech Stack</h3>
<ul>
  <li>Next.js & TypeScript</li>
  <li>Node.js & Express</li>
  <li>PostgreSQL (Supabas)</li>
</ul>

<h3>Authentication</h3>
<ul>
  <li>Anyone can view rankings</li>
</ul>
<p>Users must sign in to:</p>
<ul>
  <li>Create groups</li>
  <li>Claim players</li>
  <li>Submit matches</li>
</ul>
