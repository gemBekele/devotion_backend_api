# Devotion API Server

A Node.js/Express API server for the Devotion mobile app, built with TypeScript, Prisma, and Better Auth.

## Features

- **Authentication**: Better Auth with Expo support
- **Database**: PostgreSQL with Prisma ORM
- **API Endpoints**:
  - Devotions (CRUD operations)
  - Prayer Requests (CRUD operations)
  - Counseling Requests (CRUD operations)
  - Admin Management (User management, statistics)

## Tech Stack

- **Runtime**: Node.js 22.16.0
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma
- **Authentication**: Better Auth
- **Deployment**: Render

## Development

### Prerequisites

- Node.js 22.16.0 or higher
- PostgreSQL database
- npm or pnpm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and other variables
   ```

4. Set up the database:
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations

## Deployment

This project is configured for deployment on Render. The `render.yaml` file contains the deployment configuration.

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret key for Better Auth
- `BETTER_AUTH_URL` - Base URL for the API
- `BETTER_AUTH_TRUSTED_ORIGINS` - Trusted origins for CORS
- `CORS_ORIGIN` - CORS origin for the mobile app
- `PORT` - Server port (default: 10000)
- `HOST` - Server host (default: 0.0.0.0)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Devotions
- `GET /api/devotions` - Get all devotions
- `GET /api/devotions/:id` - Get devotion by ID
- `GET /api/devotions/date` - Get devotions by date
- `POST /api/devotions` - Create devotion (admin only)

### Prayer Requests
- `GET /api/prayer-requests` - Get all prayer requests
- `GET /api/prayer-requests/:id` - Get prayer request by ID
- `POST /api/prayer-requests` - Create prayer request
- `PUT /api/prayer-requests/:id` - Update prayer request
- `DELETE /api/prayer-requests/:id` - Delete prayer request
- `POST /api/prayer-requests/:id/pray` - Pray for a request

### Counseling
- `POST /api/counseling` - Create counseling request
- `GET /api/counseling` - Get user's counseling requests
- `GET /api/counseling/admin` - Get all counseling requests (admin)
- `PUT /api/counseling/:id` - Update counseling request status (admin)

### Admin
- `GET /api/admin/users` - Get all users (admin)
- `GET /api/admin/stats` - Get admin statistics
- `POST /api/admin/users/:userId/promote` - Promote user to admin
- `POST /api/admin/users/:userId/demote` - Demote admin to user
