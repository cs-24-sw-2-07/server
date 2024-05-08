// Web app framework:
import express from "express"
import http from "http"
import { Server } from "socket.io"
import { CreateLobby, ChangeSettings, JoinLobby, LeaveLobby, DeleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady, MapToArrayObj, isUsernameValid, CheckPlayerDecks } from "./Lobby.js"
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
			if(Rooms.get(PlayerRooms.get(socket.id)).players.get(socket.id).host) { //Does the player have host status
				const roomID = PlayerRooms.get(socket.id);
				socket.to(roomID).emit("leaveLobby");
				DeleteLobby(roomID, io);
			} else {
				const roomID = PlayerRooms.get(socket.id);
				const players = LeaveLobby(socket, roomID);
				socket.to(roomID).emit("playerHandler", players);
			}
		}
	});

	//* ================================================= Lobby Handler ======================================================== *\\
	socket.on("createLobby", (username) => {
		if(isUsernameValid(username)) {
			console.log("Lobby was created");
			const CreateLobbyObj = CreateLobby(socket, username);
			socket.emit("lobby", CreateLobbyObj);
		} else {
			socket.emit("invalidUsername");
		}
	});
	socket.on("changeSettings", (UpdatedSettings) => {
		const roomID = PlayerRooms.get(socket.id);
		const isPossible = ChangeSettings(UpdatedSettings, roomID);
		if(isPossible) {
			socket.to(roomID).emit("changeSetting", UpdatedSettings);

			//Check if the changed setting is the deck size
			const setting = UpdatedSettings.key
			if(setting === "deckSize") {
				//All players whose deck was not accepted will be in the array playersNotAccepted
				const playersNotAccepted = CheckPlayerDecks(roomID, UpdatedSettings, setting);
				if(playersNotAccepted.length !== 0) {
					//Emit to the player that their deck is not valid anymore
					for(const playerID of playersNotAccepted) {
						io.to(playerID).emit("deckNotAccepted");
					}

					//Emit the updated player statuses
					const players = Rooms.get(roomID).players;
					const playersArr = MapToArrayObj(players);
					io.to(roomID).emit("playerHandler", playersArr);
				}

			}

		}
	});
	socket.on("joinLobby", (Joined) => {
		const roomID = `/${Joined.id}`;
		const Room = Rooms.get(roomID);
		if(Room && Room.players.size < Room.settings.lobbySize) {
			if(isUsernameValid(Joined.name)) {
				const playersArr = JoinLobby(Joined, roomID, socket);
				socket.to(roomID).emit("playerHandler", playersArr);

				//Adds the current settings to the Object for the joining player
				const JoinedreturnData = {...Room.settings, id: Joined.id, players: playersArr};
				socket.emit("lobby", JoinedreturnData);
				console.log(Joined.name, "has joined the lobby with id:", roomID);
			} else {
				socket.emit("invalidUsername");
			}
		} else if (Room) {
			socket.emit("RoomFull");
		} else {
			socket.emit("roomNotExist");
		}
	});
	socket.on("lobbyLeave", () => {
		const roomID = PlayerRooms.get(socket.id);
		const players = LeaveLobby(socket, roomID);
		socket.to(roomID).emit("playerHandler", players);
		socket.emit("LeaveLobby");
	});
	socket.on("changeDeck", (Deck) => {
		const roomID = PlayerRooms.get(socket.id);
		const Room = Rooms.get(roomID);

		const isPossible = ChangeDeckState(Deck, socket.id, Room);

		if(isPossible) {
			//Emit to other players that the host has readied up
			const playerArr = MapToArrayObj(Room.players);
			io.to(roomID).emit("playerHandler", playerArr);

			socket.emit("changeDeck", Deck.name);
		} else {
			socket.emit("deckNotAccepted");
		}
	});
	socket.on("deleteLobby", () => {
		const roomID = PlayerRooms.get(socket.id);
		io.to(roomID).emit("LeaveLobby");
		DeleteLobby(roomID, io);
	});
	//Listens for player ready and returns the players readyness status.
	socket.on("playerReady", () => {
		const roomID = PlayerRooms.get(socket.id);
		const ReturnPlayerReady = PlayerReady(socket.id, roomID);
		console.log("player was ready") //! Console log
		io.to(roomID).emit("playerHandler", ReturnPlayerReady);
	});

	//Listens for a 'startGame' event and either emits a 'startedGame' event to all clients in a room if conditions are met, or sends a 'cantStartGame' event to the initiating client if not.
	socket.on("startGame", () => {
		const roomID = PlayerRooms.get(socket.id);
		if(ShouldStartGame(roomID)) {
			const roomData = Rooms.get(roomID);
			const startedGameData = {
				lives: roomData.settings.life,
				handSize: roomData.settings.handSize
			}
			io.to(roomID).emit("startedGame", startedGameData);
			console.log("Started game")

			//give each player lives according to settings
			let lifeAmount = roomData.settings.life;

			//Give each player a starting hand
			let hand = drawHand(roomData.settings.deckSize, roomData.settings.handSize);
			// ! TODO lave så vært deck indebære decksize antal kort
			//give players correct information
			for(let [playerid, player] of roomData.players.entries()){
				player.lives = lifeAmount;
				player.hand = [...hand];
				// if(player.host){
				// 	console.log("Sending to host")
				// 	socket.emit("playerInfo", player);
				// }else{
				// 	console.log("Sending to non-host")
				// 	socket.to(roomID).emit("playerInfo", player);
				// }

				//TODO: Tjek om dette stadig sender til den enkelte spiller.
				io.to(playerid).emit("playerInfo", player);
			}
		} else {
			socket.emit("cantStartGame");
		}
	});

	//* ========================================Battle Page Handler ======================================================= *\\

	// Used for when a user picks a card to play
	// It also draws a new card
	socket.on("cardPicked", (data) => {
		// TODO: Flere spillere validering
		const roomID = PlayerRooms.get(socket.id);
		const roomPlayers = Rooms.get(roomID).players
		const player = roomPlayers.get(socket.id)
		//TODO make a validation that the played card is vaulied compaired to the hand
		socket.to(roomID).emit("cardPicked", player.deck.cards[player.hand[data.cardID]])
		removeCardFromHand(socket.id, data.cardID, roomID)
	});

	// Used when a user is done answering a question
	socket.on("doneAnswering", () => {
		// TODO: Flere spillere
		const roomID = PlayerRooms.get(socket.id);
		socket.to(roomID).emit("doneAnswering");
	})

	socket.on("answerReview", (data) => {
		// data.value (True = Correct answer, False = Wrong answer)
		const roomID = PlayerRooms.get(socket.id);
		// check if there is more cards left and update hand
		let updateHandVaule = updateHand(socket.id, roomID);
		let winnerFound = false
		if(updateHandVaule == "winner"){
			winnerFound = true
			socket.to(roomID).emit("foundWinner","lose");
			socket.emit("foundWinner", "win");
		} else if (updateHandVaule == "lost"){
			winnerFound = true
			socket.to(roomID).emit("foundWinner","win");
			socket.emit("foundWinner", "lose");
		} else if (updateHandVaule == "draw"){
			winnerFound = true
			socket.to(roomID).emit("foundWinner","draw");
			socket.emit("foundWinner", "draw");
		}
		if(!data.value){
			let livesData = updateLives(socket.id, roomID)
			if(livesData == "winner"){
				socket.to(roomID).emit("foundWinner","lose");
				socket.emit("foundWinner", "win");
				socket.to(roomID).emit("lifeUpdate",0);
				socket.emit("lifeUpdateOpp",0);

				winnerFound = true
			}else{
				socket.to(roomID).emit("lifeUpdate",livesData);
				socket.emit("lifeUpdateOpp",livesData);
			}
		}
		socket.to(roomID).emit("switchRoles");
		socket.emit("switchRoles", Rooms.get(roomID).players.get(socket.id).hand);
		if(winnerFound){
			console.log("Room have been delete")
			const players = Rooms.get(roomID).players
			for(const [id,] of players.entries()) {
				PlayerRooms.delete(id);
			}

			io.socketsLeave(roomID);
			Rooms.delete(roomID);
		}
	})
});

export { Rooms, PlayerRooms };
// Start application server
server.listen(3000, () => {
	console.log("listening on *:3000");
});
