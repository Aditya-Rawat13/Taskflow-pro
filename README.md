# TaskFlow Pro

> Team task management made simple — create projects, assign tasks, and track progress with role-based access control.

![TaskFlow Pro](https://img.shields.io/badge/TaskFlow-Pro-indigo?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square)
![Railway](https://img.shields.io/badge/Deployed-Railway-purple?style=flat-square)

---

## Live URL

🌐 http://web-production-d4f82.up.railway.app/ 

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, TanStack Query v5, Axios |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL |
| Auth | JSON Web Tokens (JWT), bcrypt |
| Validation | Joi |
| Testing | Vitest, fast-check (property-based), Testing Library, msw |
| Deployment | Railway |

---

## Features

- User registration and login with JWT authentication
- Create and manage projects with name and description
- Role-Based Access Control: **Admin** (full control) and **Member** (read + limited write)
- Invite team members by email and assign roles
- Create tasks with title, description, priority, due date, and assignee
- Kanban board with four status columns: TODO, IN_PROGRESS, IN_REVIEW, DONE
- Personal dashboard with assigned tasks, overdue tasks, stats, and recent projects
- Task filtering by status, priority, and assignee
- Helmet security headers, CORS origin restriction, and bcrypt password hashing

---

## Demo Accounts

Log in with any of these pre-seeded accounts:

| Email | Password | Role |
|---|---|---|
| alice@taskflowpro.dev | Password1 | Admin (Project Alpha) |
| bob@taskflowpro.dev | Password1 | Member/Admin |
| carol@taskflowpro.dev | Password1 | Member/Admin |
| david@taskflowpro.dev | Password1 | Member (Project Beta) |

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a remote connection string)

### 1. Clone the repository

```bash
git clone https://github.com/Aditya-Rawat13/Taskflow-pro.git
cd Taskflow-pro
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment variables

**Backend:**

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/taskflow_pro"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5174"
```

**Frontend:**

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 4. Run database migrations

```bash
cd backend
npx prisma migrate deploy
```

### 5. Seed the database

```bash
cd backend
npx prisma db seed
```

This creates four demo users, two projects, memberships, and ten tasks.

### 6. Start the development servers

In one terminal (backend):

```bash
cd backend
npm run dev
```

In another terminal (frontend):

```bash
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5174` and the API at `http://localhost:3000`.

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Log in and receive a JWT |
| GET | `/api/auth/me` | ✓ | Get the authenticated user's profile |

### Projects — `/api/projects`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/projects` | ✓ | Any member | List projects the user belongs to |
| POST | `/api/projects` | ✓ | — | Create a new project |
| GET | `/api/projects/:id` | ✓ | Any member | Get project details with task summary |
| PUT | `/api/projects/:id` | ✓ | Admin | Update project name or description |
| DELETE | `/api/projects/:id` | ✓ | Admin | Delete project (cascades tasks and members) |

### Members — `/api/projects/:projectId/members`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/projects/:id/members` | ✓ | Any member | List project members |
| POST | `/api/projects/:id/members` | ✓ | Admin | Add a member by email |
| DELETE | `/api/projects/:id/members/:userId` | ✓ | Admin | Remove a member |

### Tasks — `/api/projects/:projectId/tasks`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/projects/:id/tasks` | ✓ | Any member | List tasks (filterable by status, priority, assigneeId) |
| POST | `/api/projects/:id/tasks` | ✓ | Admin | Create a task |
| GET | `/api/projects/:id/tasks/:taskId` | ✓ | Any member | Get task details |
| PUT | `/api/projects/:id/tasks/:taskId` | ✓ | Admin | Update task fields |
| PATCH | `/api/projects/:id/tasks/:taskId/status` | ✓ | Admin or assignee | Update task status |
| DELETE | `/api/projects/:id/tasks/:taskId` | ✓ | Admin | Delete a task |

### Dashboard — `/api/dashboard`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard` | ✓ | Get aggregated tasks, stats, and recent projects |

---

## Role Permissions

| Action | Admin | Member |
|---|---|---|
| View project details | ✓ | ✓ |
| Update project | ✓ | ✗ |
| Delete project | ✓ | ✗ |
| Add member | ✓ | ✗ |
| Remove member | ✓ | ✗ |
| Create task | ✓ | ✗ |
| Update task fields | ✓ | ✗ |
| Update task status | ✓ | Own tasks only |
| Delete task | ✓ | ✗ |
| View tasks and members | ✓ | ✓ |

---

## Deployment

Deployed on Railway with separate services for backend and frontend.

**Backend:** Node.js service with PostgreSQL database  
**Frontend:** Static site deployment (Vite build)

### Railway Configuration

**Backend Service:**
- Root Directory: `backend`
- Build Command: `npm install && npx prisma generate`
- Start Command: `npx prisma migrate deploy && node src/server.js`

**Environment Variables:**
```
DATABASE_URL=<Railway Postgres URL>
JWT_SECRET=<random secret>
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=<your frontend Railway URL>
```

**Frontend Service:**
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Start Command: (auto-detected by Railway)

**Environment Variables:**
```
VITE_API_BASE_URL=<your backend Railway URL>
```

---

## Author

Aditya Rawat — [GitHub](https://github.com/Aditya-Rawa
```bash
cd frontend && npx vitest run
```

Frontend tests use `msw` (Mock Service Worker) for HTTP mocking and run in jsdom — no database required.

The test suite covers **23 correctness properties** using fast-check property-based testing, running 100 random iterations per property to verify system behavior across all valid inputs.

---

## Railway Deployment

### Backend

1. Create a new Railway project and add a **PostgreSQL** plugin
2. Add a new service pointing to the `backend/` directory with Root Directory set to `backend`
3. Set Pre-deploy command: `npx prisma migrate deploy`
4. Set Start command: `node src/server.js`
5. Set environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-provided by Railway PostgreSQL plugin |
| `JWT_SECRET` | A long, random secret string |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your deployed frontend URL |

6. Seed the production database after first deploy:

```bash
DATABASE_URL="your-railway-db-url" node prisma/seed.js
```

### Frontend

Deploy the `frontend/` directory as a separate static site service and set:

```env
VITE_API_BASE_URL=https://your-backend.railway.app/api
```

---

## Project Structure

```
taskflow-pro/
  backend/
    prisma/
      schema.prisma       ← database models
      seed.js             ← demo data
      migrations/         ← SQL migration files
    src/
      middleware/         ← auth, rbac, validate
      routes/             ← auth, project, task, dashboard
      controllers/        ← business logic
      validators/         ← Joi schemas
      utils/              ← jwt, errors
      app.js
      server.js
  frontend/
    src/
      api/                ← axios instance + API functions
      components/         ← shared UI components
      context/            ← AuthContext
      hooks/              ← React Query hooks
      pages/              ← all route pages
      App.jsx
      main.jsx
  README.md
```

---

## Author

**Aditya Rawat** — [GitHub](https://github.com/Aditya-Rawat13)

---

## GitHub Repository

🔗 **[https://github.com/Aditya-Rawat13/Taskflow-pro](https://github.com/Aditya-Rawat13/Taskflow-pro)**
