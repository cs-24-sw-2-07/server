// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState, StartGame, PlayerReady } from "./Lobby.js" // TODO: Make this work
//import { domainToASCII } from "url"
const app = express()
const server = http.createServer(app)

// Socket server that makes use of the above http app server:
const io = new Server(server, {
	cors: {
		origin: "*"
	}
});

// This map contains all rooms and every room's states
const Rooms = new Map();

// Basic app routing
// app.get('/', (req, res) => {
//  res.sendFile(__dirname + '/index.html');
// }); 

// Handle socket connections
io.on("connection", socket => {
	console.log("a user connected")

	socket.on("buttonClick", (count) => {
		console.log(socket.id, "has clicked the button", count, "times")
	});

	/* ============ Lobby Handler =========== */
	socket.on("createLobby", (data) => {
		CreateLobby(socket, io, data.name);
	});
	socket.on("changeSettings", changeJson => {
		console.log(changeJson);
		changeSettings(changeJson);
		socket.to(`/${changeJson.id}`).emit("changeSetting", changeJson);
	});
	socket.on("joinLobby", playerJson => {
		Rooms.get(`/${playerJson.id}`) ? joinLobby(playerJson, socket) : socket.emit("RoomNotExist");
	});
	//socket.on("leaveLobby", id => {});
	socket.on("leaveLobby", playerJson => {
		let playerleftJson = { id: playerJson.id }
		leaveLobby
		io.to(`/${playerJson.id}`).emit("PlayerLeftTheLobby", JSON.stringify(playerleftJson))
	});

	socket.on("deleteLobby", data => {
		data = JSON.parse(data)
		deleteLobby(io, data)
		let Room = data.id
		io.to(`/${Room}`).emit("RoomsIsNoLongerAvailable", JSON.stringify(data))
	});

	socket.on("DeckChose", data => {
		data = JSON.parse(data);
		ChangeDeckState(data, socket.id);
	});

	//socket.on player ready 
	socket.on("PlayerReady", lobbyStateObj => {
		PlayerReady(socket.id,lobbyStateObj); 
	});
	
	//socket.on start game
	socket.on("StartGame", () =>{
		//StartGame(lobbyStateObj); 
	});
});

export { Rooms };
// Start application server
server.listen(3000, () => {
	console.log("listening on *:3000");
});
