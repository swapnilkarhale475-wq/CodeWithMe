function generateRoomCode(existingRooms) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  while (code.length < 6) {
    const index = Math.floor(Math.random() * charset.length);
    code += charset[index];
  }

  if (existingRooms[code]) {
    return generateRoomCode(existingRooms);
  }

  return code;
}

function createRoom(rooms) {
  return (req, res) => {
    const roomCode = generateRoomCode(rooms);
    rooms[roomCode] = {
      participants: new Set(),
      usernames: {},
      messages: []
    };

    res.json({ roomCode });
  };
}

function joinRoom(rooms) {
  return (req, res) => {
    const { roomCode } = req.body;
    if (!roomCode || typeof roomCode !== 'string') {
      return res.status(400).json({ error: 'Room code is required.' });
    }

    const code = roomCode.trim().toUpperCase();
    if (!rooms[code]) {
      return res.status(404).json({ error: 'Room not found. Please verify the code.' });
    }

    res.json({ roomCode: code });
  };
}

module.exports = {
  createRoom,
  joinRoom
};
