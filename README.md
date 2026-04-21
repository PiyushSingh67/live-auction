# Real-Time Auction & Bidding Platform

A modern, high-performance, full-stack application built to facilitate live online auctions. Users can create auctions, view real-time countdowns, and place bids that sync instantly across all connected clients.

## Architecture & Tech Stack

This project adopts a modern full-stack architecture separated into two distinct services communicating via REST APIs and WebSockets.

### Frontend

- **Framework**: Next.js 14+ (App Router) for Server-Side Rendering capabilities and optimal SEO.
- **Styling**: Custom CSS with CSS variables, employing a **Glassmorphism** aesthetic, sleek dark mode, and dynamic interactive hover animations to give a premium feel. No third-party UI libraries like Tailwind were used, showcasing raw CSS proficiency.
- **Real-Time Integration**: `socket.io-client` handles live bid updates and auction creations without requiring manual page refreshes.

### Backend

- **Framework**: Node.js with Express.js.
- **Real-Time Engine**: `socket.io` for maintaining consistent auction state between clients. When a valid bid is placed, the server broadcasts an event, immediately updating the current price and bid history on all connected clients.
- **Database**: PostgreSQL (Containerized). Provides strict ACID compliance required for financial transactions (bids).
- **ORM**: Prisma for type-safe database access, automated migrations, and robust relationship management (User -> Auctions -> Bids).
- **Security**: JWT for secure, stateless user authentication, and bcryptjs for robust password hashing.

---

## Setup & Execution

### Prerequisites

- Node.js (v18+)
- Docker & Docker-Compose (for running PostgreSQL)

### Step 1: Start the Database

The project includes a `docker-compose.yml` file to instantly spin up a PostgreSQL instance.

```bash
docker-compose up -d
```

### Step 2: Configure & Start the Backend

Navigate to the `backend` directory, install dependencies, configure Prisma, and start the server:

```bash
cd backend
npm install

# Push the schema to the running PostgreSQL DB
npx prisma db push
npx prisma generate

# Start the Express server (Runs on port 3001)
npm start
```

### Step 3: Start the Frontend

In a separate terminal, navigate to the `frontend` directory:

```bash
cd frontend
npm install

# Start the Next.js development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Design Choices

1. **Optimistic UI with Source of Truth**: The frontend automatically requests the latest bid amount but waits for the WebSocket confirmation to append the bid to the history log, ensuring data integrity.
2. **Glassmorphism Aesthetic**: Selected to give the application a distinct "Web3/Premium App" vibe. By using `backdrop-filter: blur`, the UI feels layered and modern.
3. **Decoupled Architecture**: Next.js and Express are separated. While Next.js has an API router, using a dedicated Express backend simplifies WebSocket integrations (which can be tricky in Serverless environments).
4. **Prisma Transactions**: The bidding logic (`backend/server.js`) uses Prisma `$transaction` to ensure that when a bid is placed, both the `Bid` record is created, and the `Auction.currentPrice` is updated atomically. This prevents race conditions.
