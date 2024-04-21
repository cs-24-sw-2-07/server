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

// Handle socket connection
io.on("connection", socket => {
	console.log(`a user with the id: ${socket.id} has connected`); 
	socket.on("buttonClick", (count) => {
		console.log(socket.id, "has clicked the button", count, "times")
	});
	socket.on("disconnect", () => {
		console.log(`a user with the id: ${socket.id} has disconnected`);
	});

	/* ============ Lobby Handler =========== */
	socket.on("createLobby", (data) => {
		console.log("Lobby was created");
		CreateLobby(socket, data.name);
	});
	socket.on("changeSettings", changeJson => {
		//!Remove console.log
		console.log(changeJson);
		changeSettings(changeJson);
		socket.to(`/${changeJson.id}`).emit("changeSetting", changeJson);
	});
	socket.on("joinLobby", joinData => {
		Rooms.get(`/${joinData.id}`) ? joinLobby(joinData, socket) : socket.emit("RoomNotExist");
		//!Remove console.log
		console.log(Rooms.get(`/${joinData.id}`).players);
	});
	socket.on("leaveLobby", leaveData => {
		//let playerleftJson = { id: playerJson.id }
		socket.to(`/${leaveData.id}`).emit("playerLeft", leaveData);
		leaveLobby(leaveData.id, socket);
	});
	socket.on("deleteLobby", deleteData => {
		deleteLobby(deleteData.id, socket);
		let Room = deleteData.id;
		socket.to(`/${Room}`).emit("lobbyDeleted", "lobby deleted");
		//TODO: Find a way to make this work --> Alternatively, let the event on client side, do the work
		//io.to(`/${deleteData.id}`).socketsLeave(`/${deleteData.id}`);
		//socket.emit("hostLobbyDeleted");

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
	socket.on("startGame", () =>{
		StartGame(); 
	});
});

export { Rooms };
// Start application server
server.listen(3000, () => {
	console.log("listening on *:3000");
});

/*
	Events - client side: 
	- lobbyCreated
	- RoomNotExist
	- changeSetting
	- playerJoined
	- playerLeft
	- lobbyDeleted

	Events - server side: 
	- createLobby
	- changeSettings
	- joinLobby
	- leaveLobby
	- deleteLobby
	- playerReady
	- startGame
*/