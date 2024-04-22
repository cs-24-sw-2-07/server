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
		const createLobbyObj = CreateLobby(socket, data.name);
		socket.emit("lobbyCreated", createLobbyObj);
	});
	socket.on("changeSettings", changeJson => {
		//!Remove console.log
		console.log(changeJson);
		changeSettings(changeJson);
		socket.to(`/${changeJson.id}`).emit("changeSetting", changeJson);
	});
	socket.on("joinLobby", joinData => {
		console.log("got here"); 
		const pathID = `/${joinData.id}`;
		Rooms.get(pathID) ? joinLobby(joinData, socket) : socket.emit("RoomNotExist");

		socket.emit(joinLobby, socket.id);
		socket.to(pathID).emit("playerJoined", joinData);
		Rooms.get(pathID) ? joinLobby(joinData, socket) : socket.emit("RoomNotExist");
		//!Remove console.log
		//console.log(Rooms.get(`/${joinData.id}`).players);
		//console.log(Rooms.get(`/${joinData.id}`));
		console.log(`${Rooms.get(pathID).ready}/${Rooms.get(pathID).players.size}`);
	});
	socket.on("leaveLobby", leaveData => {
		//!console.log("got here ");
		//!console.log(leaveData);
		//!let playerleftJson = { id: playerJson.id }
		const pathID = `/${leaveData.id}`; 
		socket.to(pathID).emit("playerLeft");
		leaveLobby(leaveData, socket);
		console.log(`${Rooms.get(pathID).ready}/${Rooms.get(pathID).players.size}`);
	});
	socket.on("deleteLobby", deleteData => {
		console.log(deleteData);
		const pathID = `/${deleteData.id}`;
		console.log(Rooms.get(pathID));
		socket.to(`/${deleteData.id}`).emit("lobbyDeleted", "lobby has been deleted");
		deleteLobby(deleteData.id, socket);
		//TODO: Find a way to make this work --> Alternatively, let the event on client side, do the work
		//io.to(`/${deleteData.id}`).socketsLeave(`/${deleteData.id}`);
		//socket.emit("hostLobbyDeleted");
		
	});
	socket.on("DeckChoose", data => {
		const readyPlayers = ChangeDeckState(data, socket.id);
		if(readyPlayers.hostOrNot) {
			socket.to(`/${data.id}`).emit("hostReadyUp", String(readyPlayers.ready));
		}
		console.log(Rooms.get(`/${data.id}`).ready);
	});
	//socket.on player ready 
	socket.on("PlayerReady", lobbyStateObj => {
		const readyObj = PlayerReady(socket.id,lobbyStateObj); 
		socket.to(`/${lobbyStateObj.id}`).emit("readyUp", readyObj); 
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