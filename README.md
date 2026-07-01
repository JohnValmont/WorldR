# WORLDr

WORLDr is a highly dynamic, browser-based economic and political simulation game. It features deep interlocking systems:
- A macro-economic demand engine built around demographic segments and shifting affordability.
- Competitor AI that adjusts pricing, inventory, and production based on shifting market conditions.
- A fully integrated political system mimicking democratic legislative processes, elections, lobbying, and government procurement.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### Installation
1. Clone the repository.
2. Install dependencies for both frontend and backend:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```
3. Set up the environment variables by copying `.env.example` to `.env.local` for the frontend and `.env` for the backend. Ensure PostgreSQL connection details are correct.

### Database Setup
1. Create the `worldr` database in PostgreSQL.
2. Run database migrations and seeds from the backend:
   ```bash
   npm run knex migrate:latest
   npm run knex seed:run
   ```

### Running Locally
Run the backend and frontend simultaneously in separate terminals:

**Backend**
```bash
cd backend
npm run dev
```

**Frontend**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to access the WORLDr entry point.

## Pre-Alpha
Version `v0.1.0-prealpha` includes the complete functional economic layer (Manufacturing, Logistics, Business Ledgers) and the complete v0.1 Politics slice (Elections, Coalitions, Bills, and Tenders).
