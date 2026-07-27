# ERP Procurement & Payment Management System

**Phase 1 — Foundation & Authentication**

A production-ready foundation for an enterprise ERP system: JWT authentication, role-based access
control across 9 roles, user/department/designation administration, and a role-aware dashboard shell.
Procurement, purchase orders, GRN, invoicing, and payment modules are intentionally **not** included —
they arrive in later phases.

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Router DOM, Axios, React Hook Form |
| Backend    | Node.js, Express.js |
| Database   | MongoDB Atlas (Mongoose) |
| Auth       | JWT, bcryptjs |
| Validation | express-validator |
| Security   | Helmet, CORS, express-rate-limit, express-mongo-sanitize, xss-clean, hpp |
| Logging    | Morgan |

---

## Project Structure

```
erp-procurement/
├── backend/
│   ├── config/        # env validation, MongoDB connection
│   ├── controllers/    # auth, user, department, designation
│   ├── middleware/     # auth (protect/authorize), error handling, validation
│   ├── models/         # User, Department, Designation
│   ├── routes/         # /api/auth, /api/admin/*
│   ├── seeders/        # seed.js, clear.js
│   ├── utils/           # asyncHandler, ErrorResponse, JWT, email
│   ├── validators/      # express-validator rule sets
│   ├── app.js
│   └── server.js
└── frontend/
    └── src/
        ├── components/common/  # Button, TextField, Alert, StatCard, LoadingScreen
        ├── context/             # AuthContext
        ├── hooks/               # useAuth
        ├── layouts/             # DashboardLayout, Sidebar, Navbar
        ├── pages/
        │   ├── auth/            # Login, ForgotPassword, ResetPassword
        │   └── dashboards/      # one dashboard per role + Admin Users/Departments
        ├── routes/              # ProtectedRoute
        └── services/            # api.js (Axios instance), authService.js
```

---

## Prerequisites

- Node.js 18+ and npm
- A MongoDB Atlas cluster (or a local MongoDB instance) and its connection string
- (Optional) SMTP credentials if you want real password-reset emails; without them, reset links are
  logged to the backend console instead of being sent

---

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in at minimum:

```
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=a-long-random-string
```

Then:

```bash
npm install
npm run seed     # creates a default department + one demo user per role
npm run dev       # starts the API on http://localhost:5000
```

All seeded demo accounts share the password `Passw0rd!`:

```
admin@example.com
requesting_employee@example.com
senior_employee@example.com
department_manager@example.com
budget_controller@example.com
department_director@example.com
managing_director@example.com
chairman@example.com
accountant@example.com
```

To wipe seeded data: `npm run clear` (refuses to run when `NODE_ENV=production`).

### 2. Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_URL defaults to http://localhost:5000/api
npm install
npm run dev              # starts the app on http://localhost:5173
```

Open `http://localhost:5173` and log in with any demo account above.

---

## What's Included in Phase 1

- **Auth**: login, logout, forgot/reset password (emailed token, 30-minute expiry), change password,
  profile view/update, JWT with configurable expiry, protected routes
- **RBAC**: 9 roles (Admin, Requesting Employee, Senior Employee, Department Manager, Budget
  Controller, Department Director, Managing Director, Chairman, Accountant); `protect` +
  `authorize(...roles)` middleware; frontend route guarding by role
- **Admin**: full CRUD for Users, Departments, and Designations (Designation CRUD is exposed via API;
  a dedicated admin UI screen can be added in a later pass — the Users/Departments screens under
  `/dashboard/admin` demonstrate the pattern)
- **Dashboards**: one per role, each showing name, role, department, current date, and placeholder
  stat cards for future modules
- **Security**: Helmet, CORS locked to `CLIENT_URL`, rate limiting (general + stricter on login),
  MongoDB query sanitization, XSS input sanitization, HTTP parameter pollution protection, password
  hashing with bcrypt, secrets never hardcoded

## What's Deliberately Excluded

Purchase requests, quotations, purchase orders, GRN, invoices, payments, and reporting — these are
scoped for later phases per the project brief.

---

## API Reference

### Auth (`/api/auth`)

| Method | Endpoint                    | Access  | Description |
|--------|------------------------------|---------|--------------|
| POST   | `/login`                     | Public  | Log in, returns JWT + user |
| POST   | `/logout`                    | Private | Logout (client discards token) |
| POST   | `/forgot-password`           | Public  | Sends password reset email |
| PUT    | `/reset-password/:token`     | Public  | Resets password with a valid token |
| PUT    | `/change-password`           | Private | Change password while logged in |
| GET    | `/me`                        | Private | Get current user |
| PUT    | `/profile`                   | Private | Update own profile |

### Admin (`/api/admin`)

| Resource      | Endpoints |
|---------------|-----------|
| Users         | `GET/POST /users`, `GET/PUT/DELETE /users/:id` |
| Departments   | `GET/POST /departments`, `GET/PUT/DELETE /departments/:id` |
| Designations  | `GET/POST /designations`, `GET/PUT/DELETE /designations/:id` |

All `/api/admin/*` routes require an authenticated Admin user.

---

## Verification Checklist

- [x] Backend loads and starts without errors (`node app.js` sanity-checked in this environment)
- [x] Frontend builds cleanly with `npm run build` and passes ESLint with zero errors
- [ ] MongoDB connects successfully — **verify this yourself** by running `npm run dev` with a real
      `MONGO_URI`; this sandbox has no MongoDB server available to test against live
- [ ] Full login → protected route → RBAC → password reset flow — verify manually once connected to
      a real database, using `npm run seed` to populate demo users

## Next Steps

Once you've confirmed Phase 1 runs cleanly end-to-end against your own MongoDB instance, Phase 2
(procurement workflow: purchase requests, quotations, purchase orders) can begin.
