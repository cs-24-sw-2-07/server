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
		changeSettings(changeJson);
		socket.to(`/${changeJson.id}`).emit("changeSetting", changeJson);
	});
	socket.on("joinLobby", joinData => {
		const pathID = `/${joinData.id}`;
		if(Rooms.get(pathID)) { 
			joinLobby(joinData, socket)
			socket.to(pathID).emit("playerJoined", joinData);
			console.log(joinData.name, "has joined the lobby", pathID);
		} else {
			socket.emit("RoomNotExist");
		}
	});
	socket.on("leaveLobby", leaveData => {
		const pathID = `/${leaveData.id}`; 
		socket.to(pathID).emit("playerLeft");
		leaveLobby(leaveData, socket);
	});
	socket.on("deleteLobby", deleteData => {
		const roomID = `/${deleteData.id}`;
		socket.to(roomID).emit("lobbyDeleted");
		deleteLobby(deleteData.id, socket);
	});
	socket.on("DeckChoose", data => {
		const readyPlayers = ChangeDeckState(data, socket.id);
		if(readyPlayers.host) {
			socket.to(`/${data.id}`).emit("hostReadyUp", String(readyPlayers.ready));
		}
	});
	socket.on("PlayerReady", lobbyStateObj => {
		const readyObj = PlayerReady(socket.id,lobbyStateObj); 
		socket.to(`/${lobbyStateObj.id}`).emit("readyUp", readyObj); 
	});
	socket.on("startGame", startGameState => {
		const roomID = `/${startGameState.id}`;
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
			console.log("The room: \n\n" +JSON.stringify(Room)+"\n\n"); 

			console.log(`Readied players: ${Room.ready}/${Room.players.size}\n`);

			console.log("Players in the room \n");
			for (let player of Room.players) {
				console.log(player, "\n\n");
			}
		} else {
			console.log("Room doesnt exist");
		}
	})
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