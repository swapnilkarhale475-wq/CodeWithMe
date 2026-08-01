const express = require('express');
const { createRoom, joinRoom } = require('../controllers/roomController');
const { askAI } = require('../controllers/aiController');

module.exports = (rooms) => {
  const router = express.Router();

  router.post('/create-room', createRoom(rooms));
  router.post('/join-room', joinRoom(rooms));
  router.post('/ask', askAI);

  return router;
};
