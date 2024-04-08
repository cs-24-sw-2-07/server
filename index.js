// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
const app = express()
const server = http.createServer(app) 
export { Rooms }; 

// Socket server that makes use of the above http app server:
const io = new Server(server, {
  cors: {
    origin: "*"
  }
})
const Rooms = new Map(); 
// Basic app routing
// app.get('/', (req, res) => {
//  res.sendFile(__dirname + '/index.html');
// }); 

// Handle socket connections
io.on("connection", (socket) => {
  console.log("a user connected")

  socket.on("buttonClick", (count) => {
    console.log(socket.id, "has clicked the button", count, "times")
  });

  
  socket.on("lobbyCreate", createLobby(socket));
  //socket.on("changeSettings", changeSettings(socket));
})

// Start application server
server.listen(3000, () => {
  console.log("listening on *:3000")
})
