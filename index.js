// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, ChangeSettings, JoinLobby, LeaveLobby, DeleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady, MapToArrayObj } from "./Lobby.js" // TODO: Make this work
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
//This map contains all socket id's as keys and has the correlating Rooms key as the value
const PlayerRooms = new Map();

// Basic app routing
// app.get('/', (req, res) => {
//  res.sendFile(__dirname + '/index.html');
// }); 
// }); 
// }); 

// Handle socket connection
io.on("connection", socket => {
	console.log(`a user with the id: ${socket.id} has connected`);
	socket.on("disconnect", () => { 
		console.log(`a user with the id: ${socket.id} has disconnected`);
		if(PlayerRooms.has(socket.id)) {
			if(Rooms.get(PlayerRooms.get(socket.id)).players.get(socket.id).host) { //Does player have host status? 
				const roomID = PlayerRooms.get(socket.id);
				socket.to(roomID).emit("lobbyDeleted");
				DeleteLobby(roomID, socket);
			} else {
				const roomID = PlayerRooms.get(socket.id); 
				const players = LeaveLobby(socket, roomID);
				socket.to(roomID).emit("playerHandler", players);
			}
		}
	});

	//* ================================================= Lobby Handler ======================================================== *\\
	socket.on("createLobby", (username) => {
		console.log("Lobby was created");
		const CreateLobbyObj = CreateLobby(socket, username);
		socket.emit("lobby", CreateLobbyObj);
	});
	socket.on("changeSettings", (UpdatedSettings) => {
		const roomID = PlayerRooms.get(socket.id); 
		const isPossible = ChangeSettings(UpdatedSettings, roomID);
		if(isPossible) {
			socket.to(roomID).emit("changeSetting", UpdatedSettings);
			socket.emit("changeSetting", UpdatedSettings);
		} else {
			socket.emit("cantChangeSettings", UpdatedSettings);
		}
	});
	socket.on("joinLobby", (Joined) => {
		const roomID = `/${Joined.id}`;
		const Room = Rooms.get(roomID);
		if(Room && Room.players.size < Room.settings.lobbySize) { 
			const playersArr = JoinLobby(Joined, roomID, socket);
			socket.to(roomID).emit("playerHandler", playersArr);
			
			//Adds the current settings to the Object for the joining player
			const JoinedreturnData = {...Room.settings, id: Joined.id, players: playersArr};
			socket.emit("lobby", JoinedreturnData);
			
			console.log(Joined.name, "has joined the lobby with id:", roomID);
		} else if (Room) {
			socket.emit("RoomFull");
		} else {
			socket.emit("roomNotExist");
		}
	});
	socket.on("leaveLobby", () => {
		const roomID = PlayerRooms.get(socket.id); 
		const players = LeaveLobby(socket, roomID);
		socket.to(roomID).emit("playerHandler", players);
	});
	socket.on("deleteLobby", () => {
		const roomID = PlayerRooms.get(socket.id);
		socket.to(roomID).emit("lobbyDeleted");
		DeleteLobby(roomID, socket);
	});
	socket.on("changeDeck", (Deck) => {
		const roomID = PlayerRooms.get(socket.id);
		const Room = Rooms.get(roomID);
		const player = Room.players.get(socket.id);

		const isPossible = ChangeDeckState(Deck, socket.id, Room);
		if(isPossible && player.host) {
			//Emit to other players that the host has readied up
			const playerArr = MapToArrayObj(Room.players);
			socket.to(roomID).emit("playerHandler", playerArr);

			socket.emit("playerHandler", playerArr);
			socket.emit("changeDeck",  Deck.name);
		} else if (isPossible){
			socket.emit("changeDeck", Deck.name);
		} else {
			socket.emit("deckNotAccepted"); 
		}
	});

	//Listens for player ready and returns the players readyness status.
	socket.on("playerReady", () => {
		const roomID = PlayerRooms.get(socket.id);
		const playersArr = PlayerReady(socket.id, roomID); 
		socket.to(roomID).emit("playerHandler", playersArr); 
		socket.emit("playerHandler", playersArr);
	});

	//Listens for a 'startGame' event and either emits a 'startedGame' event to all clients in a room if conditions are met, or sends a 'cantStartGame' event to the initiating client if not.
	socket.on("startGame", () => {
		const roomID = PlayerRooms.get(socket.id);
		if(ShouldStartGame(roomID)) {
			socket.to(roomID).emit("startedGame");
			socket.emit("startedGame");
		} else {
			socket.emit("cantStartGame");
		}
	});

	socket.on("test", () => {
		const roomID = PlayerRooms.get(socket.id);
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
	});

	/*socket.on("testPlayerMap", () => {
		for(const [id, entry] of PlayerRooms.entries()) {
			console.log(`\nKey: ${id}, Value: ${entry}`);
		}
		if(PlayerRooms.size === 0 ) {
			console.log("\nMap is empty");
		}
	})*/

	//* ========================================Battle Page Handler ======================================================= *\\

});

export { Rooms, PlayerRooms };
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