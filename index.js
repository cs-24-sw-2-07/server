// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, ChangeSettings, JoinLobby, LeaveLobby, DeleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady } from "./Lobby.js" // TODO: Make this work
//import { domainToASCII } from "url"
import { CreateLobby, ChangeSettings, JoinLobby, LeaveLobby, DeleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady } from "./Lobby.js" // TODO: Make this work
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
// }); 

// Handle socket connection
io.on("connection", socket => {
	console.log(`a user with the id: ${socket.id} has connected`);
	socket.on("disconnect", () => { 
		console.log(`a user with the id: ${socket.id} has disconnected`);
	});

	//* ================================================= Lobby Handler ======================================================== *\\
	socket.on("createLobby", (username) => {
		console.log("Lobby was created");
		const CreateLobbyObj = CreateLobby(socket, username);
		socket.emit("lobby", CreateLobbyObj);
	});
	socket.on("changeSettings", (UpdatedSettings) => {
		const isPossible = ChangeSettings(UpdatedSettings);
		if(isPossible) {
			socket.to(`/${UpdatedSettings.id}`).emit("changeSetting", UpdatedSettings);
		} else {
			socket.emit("cantChangeSettings", UpdatedSettings);
		}
	});
	socket.on("joinLobby", (Joined) => {
		const roomID = `/${Joined.id}`;
		const Room = Rooms.get(roomID);
		if(Room && Room.players.size < Room.settings.lobbySize) { 
			const players = JoinLobby(Joined, roomID, socket);
			socket.to(roomID).emit("playerJoined", {players: players});
			
			//Adds the current settings to the Object for the joining player
			const JoinedreturnData = { players: players , ...Room.settings };
			socket.emit("lobby", JoinedreturnData);
			
			console.log(Joined.name, "has joined the lobby with id:", roomID);
		} else if (Room) {
			socket.emit("RoomFull");
		} else {
			socket.emit("roomNotExist");
		}
	});
	socket.on("leaveLobby", (PlayerLeft) => {
		const roomID = `/${PlayerLeft.id}`; 
		const playersLeftArr = LeaveLobby(PlayerLeft, socket);
		socket.to(roomID).emit("playerLeft", {players: playersLeftArr});
	});
	socket.on("deleteLobby", (id) => {
		const roomID = `/${id}`;
		socket.to(roomID).emit("lobbyDeleted");
		DeleteLobby(id, socket);
	});
	socket.on("chooseDeck", (Deck) => {
		const player = Rooms.get(`/${Deck.id}`).players.get(socket.id);
		const isPossible = ChangeDeckState(Deck, socket.id);
		if(isPossible && player.host) {
			socket.to(`/${Deck.id}`).emit("hostReadyUp", socket.id);
		} else if (isPossible) {
			socket.emit("deckAccepted");
		} else {
			socket.emit("deckNotAccepted");
		}
	});

	//Listens for player ready and returns the players readyness status.
	socket.on("playerReady", (id) => {
		const ReturnPlayerReady = PlayerReady(socket.id, id); 
		socket.to(`/${id}`).emit("readyUp", ReturnPlayerReady); 
		socket.emit("readyUp", ReturnPlayerReady);
	});

	//Listens for a 'startGame' event and either emits a 'startedGame' event to all clients in a room if conditions are met, or sends a 'cantStartGame' event to the initiating client if not.
	socket.on("startGame", (StartGame) => {
		const roomID = `/${StartGame.id}`;
		if(ShouldStartGame(roomID)) {
			socket.to(roomID).emit("startedGame");
			socket.emit("startedGame");
		} else {
			socket.emit("cantStartGame");
		}
	});

	/*socket.on("test", (roomID) => {
		if(Rooms.get(roomID)) {
			const Room = Rooms.get(roomID); 
			console.log(`The room:\n${JSON.stringify(Room)}\n\n`); 
			console.log("Players in the room");
			for (const player of Room.players) {
				console.table(`${JSON.stringify(player)}\n`);
			}
		} else {
			console.log("Room doesnt exist");
		}
	});*/

	//* ========================================Battle Page Handler ======================================================= *\\

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
