# MeetForge

MeetForge is a full-stack collaboration platform with authentication, meeting rooms, and one-to-one video calling. It uses React, Vite, Tailwind CSS, Express, MongoDB-ready configuration, Socket.IO signaling, and browser WebRTC media.

## Project Structure

- `client/` - React + Vite frontend
- `server/` - Express backend
- `docs/` - Project documentation

## Frontend

- React with Vite
- Tailwind CSS
- React Router
- Authenticated meeting-room navigation
- One-to-one WebRTC audio/video calling with camera and microphone controls
- Socket.IO room signaling for SDP offers, answers, ICE candidates, and participant events

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
- JWT authentication endpoints
- Meeting creation and join endpoints
- Socket.IO signaling rooms for WebRTC negotiation

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

## Meeting flow

1. Create an account or sign in.
2. Create or join a meeting from the dashboard.
3. Share the meeting code with one other participant.
4. Both participants join the meeting room; Socket.IO coordinates WebRTC negotiation.
5. Use the room controls to toggle available camera/microphone tracks or leave the meeting.

The room tolerates unavailable or denied individual devices where possible, shows a placeholder when video is off, and reports participant connection state.

## Current scope

The current meeting experience intentionally supports one-to-one calls only. Chat, screen sharing, recording, group calls, file sharing, whiteboard, and AI features are not included yet.
