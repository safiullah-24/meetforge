# MeetForge

MeetForge is a full-stack collaboration platform foundation built with React, Vite, Tailwind CSS, Express, and MongoDB-ready configuration.

## Project Structure

- `client/` - React + Vite frontend
- `server/` - Express backend
- `docs/` - Project documentation

## Frontend

- React with Vite
- Tailwind CSS
- React Router

### Run frontend

```bash
cd client
npm install
npm run dev
```

## Backend

- Node.js + Express
- CORS
- dotenv
- Mongoose
- nodemon

### Run backend

```bash
cd server
npm install
npm run dev
```

## Health Check

```bash
curl http://localhost:5000/api/health
```

## Notes

This milestone initializes the production-ready project structure only. Authentication, database models, Socket.io, WebRTC, chat, meeting rooms, video calls, whiteboard, and file sharing are intentionally not implemented yet.
