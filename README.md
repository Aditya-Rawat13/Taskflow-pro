# TaskFlow Pro

> Team task management made simple — create projects, assign tasks, and track progress with role-based access control.

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

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a remote connection string)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/taskflow-pro.git
cd taskflow-pro
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
FRONTEND_URL="http://localhost:5173"
```

**Frontend:**

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
VITE_API_BASE_URL="http://localhost:3000/api"
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

**Demo credentials:**

| Name | Email | Password | Role |
|---|---|---|---|
| Arjun Sharma | arjun@example.com | Password1! | Admin (Project Alpha) |
| Priya Patel | priya@example.com | Password1! | Member (Project Alpha) |
| Carlos Rivera | carlos@example.com | Password1! | Admin (Project Beta) |
| Mei Chen | mei@example.com | Password1! | Member (Project Beta) |

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

The frontend runs at `http://localhost:5173` and the API at `http://localhost:3000`.

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

## Running Tests

### Set up the test database

Create a dedicated PostgreSQL database for tests (separate from your development database):

```sql
CREATE DATABASE taskflow_pro_test;
```

### Configure the test environment

```bash
cd backend
cp .env.test.example .env.test
```

Edit `backend/.env.test` and fill in your values:

```env
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/taskflow_pro_test"
JWT_SECRET="replace-with-a-long-random-test-secret"
NODE_ENV=test
```

The test setup file automatically runs pending migrations against the test database before the suite starts.

### Run backend tests

```bash
cd backend && npx vitest run
```

### Run frontend tests

```bash
cd frontend && npx vitest run
```

Frontend tests do not require a database. They use `msw` (Mock Service Worker) for HTTP mocking and run in a jsdom environment.

---

## Railway Deployment

1. Create a new Railway project and add a **PostgreSQL** plugin.
2. Add a new service pointing to the `taskflow-pro/backend` directory.
3. Set the following environment variables in the Railway service settings:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Provided automatically by the Railway PostgreSQL plugin |
   | `JWT_SECRET` | A long, random secret string |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | Your deployed frontend URL |

4. Railway will run `npm install && npx prisma migrate deploy` on each deploy (configured in `railway.json`), then start the server with `node src/server.js`.
5. To seed the production database after the first deploy:

   ```bash
   railway run npx prisma db seed
   ```

6. For the frontend, deploy the `taskflow-pro/frontend` directory as a separate static site service and set `VITE_API_BASE_URL` to your backend Railway URL.

**Live URL:** _https://your-app.railway.app_ (replace with your deployed URL)

---

## Author

_Your Name_ — [your-email@example.com](mailto:your-email@example.com)
