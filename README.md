# CodeWithMe

CodeWithMe is a modern AI-powered learning platform for students, built by Swapnil Karhale.

## Features

- AI question answering with Gemini-compatible API
- Temporary study rooms with shared AI responses
- Real-time group chat using Socket.IO
- Responsive, beginner-friendly UI with dark mode
- No login, no signup, no database required

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with your Gemini API key.
3. Start the server:
   ```bash
   npm start
   ```

## Project Structure

- `server.js` - Express and Socket.IO server
- `routes/api.js` - API endpoints for room creation and AI queries
- `controllers/` - Backend logic for Gemini and room operations
- `views/` - Static HTML pages
- `public/` - Static assets, CSS, and client JavaScript
