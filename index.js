// Web app framework:
import express from 'express';
const app = express();
const http = require('http');
const server = http.createServer(app);

// Socket server that makes use of the above http app server:
const { Server } = require("socket.io");
const io = new Server(server);

// Basic app routing
//app.get('/', (req, res) => {
//  res.sendFile(__dirname + '/index.html');
//});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('a user connected');
});

// Start application server
server.listen(3000, () => {
  console.log('listening on *:3000');
});
