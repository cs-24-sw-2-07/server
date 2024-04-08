// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, changeSettings } from "./Lobby.js" // TODO: Make this work
const app = express()
const server = http.createServer(app) 
 

// Socket server that makes use of the above http app server:
const io = new Server(server, {
  cors: {
    origin: "*"
  }
})

// This map contains all rooms and socket connections within the map
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

  /* ============ Lobby Handler =========== */ 
  socket.on("changeSettings", (change) => {
    try {
      const changesJson = JSON.parse(change);
      changeSettings(io, changesJson.id, changesJson);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  });
  /*socket.on("LobbyJoin", id => (
    Rooms.get(id) ? JoinLobby(id) : socket.emit("RoomNotExist"); 
  ));*/

});
export { Rooms };
// Start application server
server.listen(3000, () => {
  console.log("listening on *:3000")
})
