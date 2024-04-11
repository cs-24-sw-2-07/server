// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState } from "./Lobby.js" // TODO: Make this work
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
  socket.on("createLobby", data => {
    data = JSON.parse(data); 
    CreateLobby(io, data);
  }); 
  socket.on("changeSettings", changeJson => {
      const change = JSON.parse(changeJson);
      changeSettings(change);
      socket.to(`/${changeJson.id}`).emit(JSON.stringify(changeJson));
  });
  //socket.on("DeleteLobby", id => {})
  socket.on("joinLobby", playerJson => {
    playerJson = JSON.parse(playerJson)
    Rooms.get(`/${playerJson.id}`) ? joinLobby(playerJson, socket) : socket.emit("RoomNotExist");
  }); 
  //socket.on("leaveLobby", id => {});
socket.on("leaveLobby", playerJson =>{
  
})



  socket.on("DeckChose", data => {
    data = JSON.parse(data); 
    ChangeDeckState(data, socket);
  });
});
export { Rooms };
// Start application server
server.listen(3000, () => {
  console.log("listening on *:3000")
})
