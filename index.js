// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, ChangeSettings, JoinLobby, LeaveLobby, DeleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady, MapToArrayObj } from "./Lobby.js"
import { updateLives, removeCardFromHand, drawHand, updateHand } from "./Battle.js";
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
		DeleteLobby(roomID, socket);
	});
	socket.on("changeDeck", (Deck) => {
		const roomID = PlayerRooms.get(socket.id);
		const Room = Rooms.get(roomID);

		const isPossible = ChangeDeckState(Deck, socket.id, Room);
		
		if(isPossible) {
			//Emit to other players that the host has readied up
			const playerArr = MapToArrayObj(Room.players);
			socket.to(roomID).emit("playerHandler", playerArr);
			socket.emit("playerHandler", playerArr);
			
			socket.emit("changeDeck", Deck.name);
			console.log("Deck accepted") //! Console log
		} else {
			console.log("Deck not accepted") //! Console log
			socket.emit("deckNotAccepted"); 
		}
	});

	//Listens for player ready and returns the players readyness status.
	socket.on("playerReady", () => {
		const roomID = PlayerRooms.get(socket.id);
		const ReturnPlayerReady = PlayerReady(socket.id, roomID); 
		console.log("player was ready") //! Console log
		socket.to(roomID).emit("readyUp", ReturnPlayerReady); 
		socket.emit("readyUp", ReturnPlayerReady);
	});
	socket.on("testEvent", () => {
		socket.join("/123456");
		console.log("User joined ", socket.id);
	})

	//Listens for a 'startGame' event and either emits a 'startedGame' event to all clients in a room if conditions are met, or sends a 'cantStartGame' event to the initiating client if not.
	socket.on("startGame", () => {
		const roomID = PlayerRooms.get(socket.id);
		if(ShouldStartGame(roomID)) {
			const roomData = Rooms.get(roomID);
			
			socket.to(roomID).emit("startedGame");
			socket.emit("startedGame");
			console.log("Started game")

			//give each player lives according to settings
			let lifeAmount = roomData.settings.life;
			
			//Give each player a starting hand			
			let hand = drawHand(roomData.settings.deckSize,roomData.settings.handSize);
		
			//give players correct information
			for(let [, player] of roomData.players.entries()){
				player.lives = lifeAmount;
				player.hand = [...hand];
				if(player.host){
					console.log("Sending to host")
					socket.emit("playerInfo", player);
				}else{
					console.log("Sending to non-host")
					socket.to(roomID).emit("playerInfo", player);
				}
			}
		} else {
			socket.emit("cantStartGame");
		}
	});

	//* ========================================Battle Page Handler ======================================================= *\\
	
	// Used for when a user picks a card to play
	// It also draws a new card
	socket.on("cardPicked",(data)=>{
		const roomID = PlayerRooms.get(socket.id);
		let roomPlayers = Rooms.get(roomID).players
		const player = roomPlayers.get(socket.id)
		//TODO make a validation that the played card is vaulied compaired to the hand
		socket.to(roomID).emit("cardPicked", player.deck.cards[player.hand[data.cardID]])
		removeCardFromHand(socket.id, data.cardID, roomID)
	});
	
	// Used when a user is done answering a question
	socket.on("doneAnswering",()=>{
		const roomID = PlayerRooms.get(socket.id);
		socket.to(roomID).emit("doneAnswering");
	})

	socket.on("C/W", (data) => {
		// data.value (True = Correct answer, False = Wrong answer)
		const roomID = PlayerRooms.get(socket.id);
		if(!data.value){
			let livesData = updateLives(socket.id, roomID)
			if(livesData == "winner"){
				socket.to(roomID).emit("foundWinner","lose");
				socket.emit("foundWinner", "win");
			}else{
				socket.to(roomID).emit("lifeUpdate",livesData);
			}
		}
		//check if there is more cards left and update hand
		let updateHandVaule = updateHand(socket.id, roomID);
		if(updateHandVaule == "winner"){
			socket.to(roomID).emit("foundWinner","lose");
			socket.emit("foundWinner", "win");
		} else if (updateHandVaule == "lost"){
			socket.to(roomID).emit("foundWinner","win");
			socket.emit("foundWinner", "lose");
		} else if (updateHandVaule == "draw"){
			socket.to(roomID).emit("foundWinner","draw");
			socket.emit("foundWinner", "draw");
		}
		socket.to(roomID).emit("switchRoles");
		socket.emit("switchRoles");
	})
});

export { Rooms, PlayerRooms };
// Start application server
server.listen(3000, () => {
	console.log("listening on *:3000");
});