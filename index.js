// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady } from "./Lobby.js" // TODO: Make this work
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

//TODO: Add logic to specific decisions: deck doesnt fulfill minCardAmt, lobbySize reached, the changedSetting is unachievable,  
//TODO: Make comments
//TODO: Look into changing received objects with one element to strings
//TODO: Create consistency through code
//TODO: Create better event names :P 
// Handle socket connection
io.on("connection", socket => {
	console.log(`a user with the id: ${socket.id} has connected`); 
	socket.on("buttonClick", (count) => {
		console.log(socket.id, "has clicked the button", count, "times")
	});
	socket.on("disconnect", () => { 
		console.log(`a user with the id: ${socket.id} has disconnected`);
	});

	//* ================================================= Lobby Handler ======================================================== */
	socket.on("createLobby", createData => {
		console.log("Lobby was created");
		const createLobbyObj = CreateLobby(socket, createData.name);
		socket.emit("Lobby", createLobbyObj);
	});
	socket.on("changeSettings", settingsData => {
		changeSettings(settingsData);
		socket.to(`/${settingsData.id}`).emit("changeSetting", settingsData);
	});
	socket.on("joinLobby", joinData => { //TODO: missing logic here
		const roomID = `/${joinData.id}`;
		const Room = Rooms.get(roomID);
		if(Room) { 
			const returnData = joinLobby(joinData, roomID, socket);
			socket.to(roomID).emit("playerJoined", returnData);
			
			//Adds the current settings to the Object for the joining player
			const JoinedreturnData = { ...returnData, ...Room.settings };
			socket.emit("Lobby", JoinedreturnData);
			//! Console log console.log(joinData.name, "has joined the lobby", roomID);
		} else {
			socket.emit("RoomNotExist");
		}
	});
	socket.on("leaveLobby", leaveData => { //TODO: add logic for removing name clientside
		const roomID = `/${leaveData.id}`; 
		socket.to(roomID).emit("playerLeft", socket.id);
		leaveLobby(leaveData, socket);
	});
	socket.on("deleteLobby", ID => {
		const roomID = `/${ID}`;
		socket.to(roomID).emit("lobbyDeleted");
		deleteLobby(ID, socket);
	});
	socket.on("DeckChoose", deckData => {
		const isHost = ChangeDeckState(deckData, socket.id);
		if(isHost) {
			socket.to(`/${deckData.id}`).emit("hostReadyUp", socket.id);
		}
	});
	socket.on("PlayerReady", readyData => {
		const returnData = PlayerReady(socket.id, readyData); 
		socket.to(`/${readyData.id}`).emit("readyUp", returnData); 
		socket.emit("readyUp", returnData);
	});
	socket.on("startGame", startData => {
		const roomID = `/${startData.id}`;
		if(ShouldStartGame(roomID)) {
			socket.to(roomID).emit("startedGame");
			socket.emit("startedGame");
		} else {
			socket.emit("CantStartGame");
		}
	});

	socket.on("test", roomID => {
		if(Rooms.get(roomID)) {
			const Room = Rooms.get(roomID); 
			console.log(`The room:\n${JSON.stringify(Room)}\n\n`); 
			console.log(`Readied players: ${Room.ready}/${Room.players.size}\n`);
			console.log("Players in the room");
			for (let player of Room.players) {
				console.table(`${JSON.stringify(player)}\n`);
			}
		} else {
			console.log("Room doesnt exist");
		}
	});

	//* ========================================Battle Page Handler ======================================================= */

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
