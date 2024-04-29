// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, ChangeSettings, JoinLobby, LeaveLobby, DeleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady } from "./Lobby.js" // TODO: Make this work
import { updateLives, removeCardFromHand, drawHand } from "./Battle.js";
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
Rooms.set("/123456", {
  settings: {
    deckSize: 10,
    handSize: 5,
    life: 5,
    lobbySize: 2
  },
  players: new Map(Object.entries({
    1: {
      name: "player1",
      deck: {
        "name": "Testing",
        "id": "c197aab2-55ab-4724-9932-ff0d3638a5b7",
        "cards": [
          {"id": "6a658d2f-7cc7-439b-b031-efe228e57c4f", "answer": "test1", "question": "test1", "name": "test1"},
          {"id": "5982685b-3a96-4e0e-829e-d358d484f88d", "answer": "test2", "question": "test2", "name": "test2"},
          {"id": "088c44d2-165c-4161-ab81-ee23dd9c7224", "answer": "test3", "question": "test3", "name": "test3"},
          {"id": "ed39caa2-e563-4a74-ac07-25f3eb442823", "answer": "test4", "question": "test4", "name": "test4asdsad"},
          {"id": "c130187c-3951-4c1d-9549-69e26204f5f9", "answer": "test5", "question": "test5", "name": "test5"},
          {"id": "00b32047-0a5c-48a2-b33f-28662e5f2f7e", "answer": "test6", "question": "test6", "name": "test6"},
          {"id": "4f52105a-63ce-4c45-943d-b34acf11b651", "answer": "test7", "question": "test7", "name": "test7"},
          {"id": "d43f609e-4299-4b2e-8fc0-0d0641219c2a", "answer": "test8", "question": "test8", "name": "test8"},
          {"id": "ff745cf4-e004-4c47-869c-3ce75351dddd", "answer": "test9", "question": "test9", "name": "test9"},
          {"id": "895134f9-0acb-4507-a2f6-28632c82bc62", "answer": "test10", "question": "test10", "name": "test10"}
        ]
      },
      ready: true,
      host: true,
      lives: null,
      hand: [],
      usedCards: []
    },
    2: {
      name: "player2",
      deck: {
        "name": "Testing",
        "id": "c197aab2-55ab-4724-9932-ff0d3638a5b7",
        "cards": [
          {"id": "6a658d2f-7cc7-439b-b031-efe228e57c4f", "answer": "test1", "question": "test1", "name": "test1"},
          {"id": "5982685b-3a96-4e0e-829e-d358d484f88d", "answer": "test2", "question": "test2", "name": "test2"},
          {"id": "088c44d2-165c-4161-ab81-ee23dd9c7224", "answer": "test3", "question": "test3", "name": "test3"},
          {"id": "ed39caa2-e563-4a74-ac07-25f3eb442823", "answer": "test4", "question": "test4", "name": "test4asdsad"},
          {"id": "c130187c-3951-4c1d-9549-69e26204f5f9", "answer": "test5", "question": "test5", "name": "test5"},
          {"id": "00b32047-0a5c-48a2-b33f-28662e5f2f7e", "answer": "test6", "question": "test6", "name": "test6"},
          {"id": "4f52105a-63ce-4c45-943d-b34acf11b651", "answer": "test7", "question": "test7", "name": "test7"},
          {"id": "d43f609e-4299-4b2e-8fc0-0d0641219c2a", "answer": "test8", "question": "test8", "name": "test8"},
          {"id": "ff745cf4-e004-4c47-869c-3ce75351dddd", "answer": "test9", "question": "test9", "name": "test9"},
          {"id": "895134f9-0acb-4507-a2f6-28632c82bc62", "answer": "test10", "question": "test10", "name": "test10"}
        ]
      },
      ready: true,
      host: false,
      lives: null,
      hand: [],
      usedCards: []
    }
  })),
});

// Basic app routing
// app.get('/', (req, res) => {
//  res.sendFile(__dirname + '/index.html');
// }); 

// Handle socket connection
io.on("connection", socket => {
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
			socket.emit("cantChangeSettings");
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
	socket.on("testEvent", () => {
		socket.join("/123456");
		console.log("User joined ", socket.id);
	})
	//Listens for a 'startGame' event and either emits a 'startedGame' event to all clients in a room if conditions are met, or sends a 'cantStartGame' event to the initiating client if not.
	socket.on("startGame", (StartGame) => {
		const roomID = `/${StartGame.id}`;
		if(ShouldStartGame(roomID)) {
			const roomData = Rooms.get(roomID);
			
			socket.to(roomID).emit("startedGame");
			socket.emit("startedGame");

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
					console.log("Sending to nonehost")
					socket.to(roomID).emit("playerInfo", player);
				}
			}
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
	
	// Used for when a user picks a card to play
	// It also draws a new card
	socket.on("cardPicked",(data)=>{
		const roomID = `/${data.id}`;
		//TODO make a validation that the played card is vaulied compaired to the hand
		let roomPlayers = Rooms.get(roomID).players
		socket.to(roomID).emit("cardPicked", roomPlayers.get(data.playerID).deck.cards[data.cardID])
		removeCardFromHand(data.playerID, data.cardID, roomID)
		console.log(roomPlayers.get(data.playerID).hand)
	})
	
	// Used when a user is done answering a question
	socket.on("doneAnswering",(data)=>{
		const roomID = `/${data.id}`;
		socket.to(roomID).emit("doneAnswering");
	})

	socket.on("C/W", (data) => {
		// data.value (True = Correct answer, False = Wrong answer)
		const roomID = `/${data.id}`;
		if(!data.value){
			let livesData = updateLives(data.playerID, roomID)
			if(livesData == "winner"){
				socket.to(roomID).emit("foundWinner","lose");
				socket.emit("foundWinner", "win");
			}else{
				socket.to(roomID).emit("lifeUpdate",livesData);
			}
		}
		socket.to(roomID).emit("switchRoles");
		socket.emit("switchRoles");
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
