# Hospital Management System (HMS) — SaaS

A production-ready, secure, multi-tenant Hospital Management System (HMS) SaaS designed for healthcare institutions.

## 1. Project Overview

This repository houses the foundation for a modern, multi-tenant healthcare enterprise system. It is structured to support super-administrators, hospital administrators, doctors, nurses, receptionists, and patients with strict tenant isolation, audit logging, and role-based access control.

_Note: This repository currently contains **Step 1: Project Setup and Foundation Only**. Business functionality (authentication, patients, appointments, billing, etc.) will be added in subsequent phases._

## 2. Tech Stack

### Frontend

- **Framework**: React 19 / 18 + Vite
- **Language**: JavaScript (ES Modules, JSX)
- **Styling**: Tailwind CSS
- **Routing**: React Router v7 / v6
- **HTTP Client**: Axios
- **Code Quality**: ESLint, Prettier

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript (ES Modules)
- **Database & ORM**: PostgreSQL, Sequelize
- **Security**: Helmet, CORS allowlisting, Request body size limiting
- **Logging**: Morgan
- **Environment**: dotenv

### Development & Orchestration

- **Package Manager**: npm
- **Process Orchestration**: concurrently
- **Version Control**: Git

## 3. Project Structure

```text
hospital-management-system/
│
├── client/                     # Frontend application (React + Vite)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/             # Images, icons, static assets
│   │   ├── components/         # Shared UI components
│   │   ├── layouts/            # Page layouts
│   │   ├── pages/              # Application views / routes
│   │   ├── routes/             # Client-side routing configuration
│   │   ├── services/           # API clients and HTTP services
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # State management
│   │   ├── utils/              # Frontend helper functions
│   │   ├── App.jsx             # Main application component
│   │   ├── index.css           # Global stylesheet and Tailwind directives
│   │   └── main.jsx            # React application entry point
│   ├── .env.example            # Sample frontend environment configuration
│   ├── package.json            # Client dependencies and scripts
│   └── vite.config.js          # Vite configuration
│
├── server/                     # Backend application (Express + Sequelize)
│   ├── src/
│   │   ├── config/             # Environment, Database, and CORS configuration
│   │   │   ├── env.js
│   │   │   ├── database.js
│   │   │   └── cors.js
│   │   ├── controllers/        # Request controllers
│   │   │   └── health.controller.js
│   │   ├── middleware/         # Express middleware
│   │   │   ├── error.middleware.js
│   │   │   └── notFound.middleware.js
│   │   ├── models/             # Database models (populated in next phase)
│   │   ├── routes/             # API route definitions
│   │   │   ├── health.routes.js
│   │   │   └── index.js
│   │   ├── services/           # Business logic services
│   │   ├── utils/              # Server utilities
│   │   │   └── apiResponse.js
│   │   ├── validators/         # Input validation schemas
│   │   ├── database/           # Migrations and seeders
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server startup and database connection
│   ├── .env.example            # Sample backend environment configuration
│   └── package.json            # Server dependencies and scripts
│
├── docs/                       # Architecture and design documentation
│   └── README.md
├── .gitignore                  # Git ignore rules
├── README.md                   # Project documentation
└── package.json                # Root orchestration package
```

## 4. Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Git**

## 5. PostgreSQL Setup

1. Start your local PostgreSQL server or container.
2. Open your terminal or `psql` shell and create the database:
   ```sql
   CREATE DATABASE hms;
   ```
3. Ensure the database user has permissions to connect and manage tables in `hms`.

## 6. Environment Setup

Copy `.env.example` to `.env` in both `client` and `server`:

### Backend Configuration

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your PostgreSQL credentials:

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=hms
DB_USER=postgres
DB_PASSWORD=your_postgres_password

CLIENT_URL=http://localhost:5173
```

### Frontend Configuration

```bash
cp client/.env.example client/.env
```

Edit `client/.env` if your backend runs on a custom port:

```env
VITE_API_URL=http://localhost:5000/api
```

## 7. Installation

Install dependencies for all workspaces from the project root:

```bash
# Install root orchestration tools
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

## 8. Development Commands

Run from the root directory:

| Command          | Action                                                     |
| ---------------- | ---------------------------------------------------------- |
| `npm run dev`    | Starts both server and client concurrently                 |
| `npm run server` | Starts backend Express server with auto-reload (`nodemon`) |
| `npm run client` | Starts Vite development server at `http://localhost:5173`  |
| `npm run build`  | Builds the client for production                           |
| `npm run lint`   | Runs ESLint on both server and client                      |
| `npm run format` | Runs Prettier across all codebase files                    |

## 9. Health Check Endpoint

Once the server is running, the health endpoint can be tested:

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/health`
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "HMS API is running"
  }
  ```
