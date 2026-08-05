const dotenv = require("dotenv");
dotenv.config();

const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const apiRoutes = require("./routes/api");
const { askGemini } = require("./controllers/aiController");

console.log("API Loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");

const app = express();
const server = http.createServer(app);

// ETag बंद करा जेणेकरून Googlebot ला 304 ऐवजी नेहमी 200 OK रिस्पॉन्स मिळेल
app.disable("etag");

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

const rooms = {};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files via /public prefix
app.use("/public", express.static(path.resolve(__dirname, "public")));

app.use("/api", apiRoutes(rooms));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/room", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "room.html"));
});

// Serve robots.txt with optimal Search Engine Headers
app.get("/robots.txt", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("X-Robots-Tag", "all");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).sendFile(path.resolve(__dirname, "public", "robots.txt"));
});

// Serve sitemap.xml with optimal Search Engine Headers
app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("X-Robots-Tag", "all");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).sendFile(path.resolve(__dirname, "public", "sitemap.xml"));
});

// Google Search Console Verification File Route
app.get("/google1c4bac604a7ea31a.html", (req, res) => {
  res.status(200).sendFile(path.resolve(__dirname, "public", "google1c4bac604a7ea31a.html"));
});

// Production 404 Route for Unmatched Requests
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

io.on("connection", (socket) => {

  socket.on("join-room", ({ roomCode, username }) => {

    const room = rooms[roomCode];

    if (!room) {
      socket.emit("room-error", "Room not found.");
      return;
    }

    socket.join(roomCode);

    socket.roomCode = roomCode;
    socket.username = username || "Student";

    room.participants.add(socket.id);
    room.usernames[socket.id] = socket.username;

    io.to(roomCode).emit("room-members", {
      count: room.participants.size,
      members: Object.values(room.usernames),
    });

    socket.emit("room-history", room.messages);
  });

  socket.on("room-message", ({ roomCode, username, content }) => {

    const room = rooms[roomCode];

    if (!room) return;

    const message = {
      id: Date.now(),
      sender: username,
      text: content,
      timestamp: new Date().toISOString(),
      type: "chat",
    };

    room.messages.push(message);

    io.to(roomCode).emit("new-message", message);

  });

  socket.on("ask-ai", async ({ roomCode, prompt, username }) => {

    const room = rooms[roomCode];

    if (!room) return;

    try {

      const userMessage = {
        id: Date.now(),
        sender: username,
        text: prompt,
        timestamp: new Date().toISOString(),
        type: "question",
      };

      room.messages.push(userMessage);

      io.to(roomCode).emit("new-message", userMessage);

      const answer = await askGemini(prompt);

      const aiMessage = {
        id: Date.now() + 1,
        sender: "CodeWithMe AI",
        text: answer,
        timestamp: new Date().toISOString(),
        type: "ai",
      };

      room.messages.push(aiMessage);

      io.to(roomCode).emit("ai-response", aiMessage);

    } catch (err) {

      console.error(err);

      socket.emit("ai-error", err.message);

    }

  });

  socket.on("disconnect", () => {

    const roomCode = socket.roomCode;

    if (!roomCode) return;

    const room = rooms[roomCode];

    if (!room) return;

    room.participants.delete(socket.id);

    delete room.usernames[socket.id];

    if (room.participants.size === 0) {

      delete rooms[roomCode];

      return;

    }

    io.to(roomCode).emit("room-members", {
      count: room.participants.size,
      members: Object.values(room.usernames),
    });

  });

});

server.listen(PORT, () => {
  console.log(`🚀 CodeWithMe running at http://localhost:${PORT}`);
});
