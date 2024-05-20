// Web app framework:
import express from "express";
import http from "http";
import { Server } from "socket.io";
import {
  createLobby,
  changeSettings,
  joinLobby,
  leaveLobby,
  deleteLobby,
  changeDeckState,
  shouldStartGame,
  playerReady,
  mapToArrayObj,
  isUsernameValid,
  checkPlayerDecks,
  calculateMaxDeckSize,
  checkValue
} from "./Lobby.js";
import {
  removeCardFromHand,
  drawHand,
  checkWinner,
  mapToPlayerLives,
  nextPlayer,
  switchRoles,
} from "./Battle.js";
//import { domainToASCII } from "url"
const app = express();
const server = http.createServer(app);

// Socket server that makes use of the above http app server:
const io = new Server(server, {
  cors: {
    origin: "*",
  },
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
io.on("connection", (socket) => {
  console.log(`a user with the id: ${socket.id} has connected`);
  socket.on("disconnect", () => {
    console.log(`a user with the id: ${socket.id} has disconnected`);
    if (PlayerRooms.has(socket.id)) {
      const roomID = PlayerRooms.get(socket.id);
      const roomData = Rooms.get(roomID);
      //Does the player have host status
      if (roomData.players.get(socket.id).host) {
        socket.to(roomID).emit("leaveLobby");
        deleteLobby(roomID, io);
      } else {
        // If game has already started, disconnect all clients from game, also if not a host and player is not dead.
        if (roomData.gameStarted && roomData.players.get(socket.id).lives > 0) {
          socket.to(roomID).emit("leaveLobby");
          deleteLobby(roomID, io);
        } else {
          const players = leaveLobby(socket, roomID);
          socket.to(roomID).emit("playerHandler", players);
        }
      }
    }
  });

  //* ================================================= Lobby Handler ======================================================== *\\
  socket.on("createLobby", (username) => {
    if (isUsernameValid(username)) {
      console.log("Lobby was created by", socket.id);
      const createLobbyObj = createLobby(socket, username);
      socket.emit("lobby", createLobbyObj);
    } else {
      socket.emit("invalidUsername");
    }
  });

  socket.on("changeSettings", (updatedSettings) => {
    const roomID = PlayerRooms.get(socket.id);
    const roomData = Rooms.get(roomID);
    const settingValid = checkValue(updatedSettings, roomData);
    socket.emit("changeSetting", settingValid);
    if (settingValid.value === "") {
      changeSettings(updatedSettings, roomData);
      socket.to(roomID).emit("changeSetting", updatedSettings);

      //Check if the changed setting is the deck size
      const setting = updatedSettings.key;
      if (setting === "deckSize") {
        //All players whose deck was not accepted will be in the array playersNotAccepted
        const playersNotAccepted = checkPlayerDecks(roomID, updatedSettings, setting);
        if (playersNotAccepted.length !== 0) {
          //Emit to the player that their deck is not valid anymore
          for (const playerID of playersNotAccepted) {
            io.to(playerID).emit("deckNotAccepted");
          }

          //Emit the updated player statuses
          const Players = roomData.players;
          const playersArr = mapToArrayObj(Players);
          io.to(roomID).emit("playerHandler", playersArr);
        }
      }
    }
  });
  
  socket.on("joinLobby", (joined) => {
    const roomID = `/${joined.id}`;
    const roomData = Rooms.get(roomID);
    if (roomData && roomData.players.size < roomData.settings.lobbySize && !roomData.gameStarted) {
      if (isUsernameValid(joined.name)) {
        const playersArr = joinLobby(joined, roomID, socket);
        socket.to(roomID).emit("playerHandler", playersArr);

        //Adds the current settings to the Object for the joining player
        const joinedreturnData = {
          ...roomData.settings,
          id: joined.id,
          players: playersArr,
        };
        socket.emit("lobby", joinedreturnData);
        console.log(joined.name, "/", socket.id, "has joined the lobby with id:", roomID);
      } else {
        socket.emit("invalidUsername");
      }
    } else if (roomData && !roomData.gameStarted) {
      socket.emit("roomFull");
    } else {
      socket.emit("roomNotExist");
    }
  });

  socket.on("lobbyLeave", () => {
    const roomID = PlayerRooms.get(socket.id);
    const players = leaveLobby(socket, roomID);
    socket.to(roomID).emit("playerHandler", players);
    socket.emit("leaveLobby");
  });

  socket.on("changeDeck", (deck) => {
    const roomID = PlayerRooms.get(socket.id);
    const Room = Rooms.get(roomID);

    const isPossible = changeDeckState(deck, socket.id, Room);

    if (isPossible) {
      //Emit to other players that the host has readied up
      const playerArr = mapToArrayObj(Room.players);
      io.to(roomID).emit("playerHandler", playerArr);

      socket.emit("changeDeck", deck.name);
    } else {
      socket.emit("deckNotAccepted");
    }
  });

  socket.on("deleteLobby", () => {
    const roomID = PlayerRooms.get(socket.id);
    io.to(roomID).emit("leaveLobby");
    deleteLobby(roomID, io);
  });

  //Listens for player ready and returns the players readyness status.
  socket.on("playerReady", () => {
    const roomID = PlayerRooms.get(socket.id);
    const ReturnPlayerReady = playerReady(socket.id, roomID);
    console.log("player", socket.id, "was ready"); //! Console log
    io.to(roomID).emit("playerHandler", ReturnPlayerReady);
  });

  //Listens for a 'startGame' event and either emits a 'startedGame' event to all clients in a room if conditions are met, or sends a 'cantStartGame' event to the initiating client if not.
  socket.on("startGame", () => {
    const roomID = PlayerRooms.get(socket.id);
    if (shouldStartGame(roomID)) {
      const roomData = Rooms.get(roomID);

      //give each player lives according to settings
      let lifeAmount = roomData.settings.life;

      //Give each player a starting hand
      let hand = drawHand(
        roomData.players.get(socket.id).deck,
        roomData.settings.handSize,
      );

      //give players correct information
      for (let [playerid, player] of roomData.players.entries()) {
        player.lives = lifeAmount;
        player.hand = [...hand];

        io.to(playerid).emit("playerInfo", player);
      }

      roomData.turn.current = socket.id;
      roomData.turn.next = nextPlayer(roomData);

      // Calculate the minimum amount of cards present in all decks
      roomData.maxDeckSize = calculateMaxDeckSize(roomData);
      roomData.gameStarted = true;

      const playerLives = mapToPlayerLives(roomData.players);
      const startedGameData = {
        playerLives: playerLives,
        maxLives: lifeAmount,
        handSize: roomData.settings.handSize,
        turn: roomData.turn,
      };
      io.to(roomID).emit("startedGame", startedGameData);
      console.log("Started game made by", socket.id);
    } else {
      console.log("Can not start game made by", socket.id);
      socket.emit("cantStartGame");
    }
  });

  //* ========================================Battle Page Handler ======================================================= *\\

  // Used for when a user picks a card to play
  // It also draws a new card
  socket.on("cardPicked", (data) => {
    // TODO: Flere spillere validering
    const roomID = PlayerRooms.get(socket.id);
    const roomPlayers = Rooms.get(roomID).players;
    const player = roomPlayers.get(socket.id);
    //TODO make a validation that the played card is vaulied compaired to the hand
    socket
      .to(roomID)
      .emit("cardPicked", player.deck.cards[player.hand[data.cardID]]);
    removeCardFromHand(socket.id, data.cardID, roomID);

  });

  // Used when a user is done answering a question
  socket.on("doneAnswering", () => {
    const roomID = PlayerRooms.get(socket.id);
    socket.to(roomID).emit("doneAnswering");
  });

  socket.on("answerReview", (correctAnswer) => {
    // correctAnswer (True = Correct answer, False = Wrong answer)
    const roomID = PlayerRooms.get(socket.id);
    const roomData = Rooms.get(roomID);

    // remove life if answer its incorrect from player room.turn.next
    if (!correctAnswer) {
      roomData.players.get(roomData.turn.next).lives--;
      const lifeUpdateData = mapToPlayerLives(roomData.players);
      io.to(roomID).emit("lifeUpdate", lifeUpdateData);
      io.to(roomData.turn.next).emit("wrongAnswered");
    }

    if (checkWinner(roomID, roomData, socket, io)) {
      console.log("Delete lobby made by", socket.id);
      return deleteLobby(roomID, io);
    }

    switchRoles(roomID, roomData, socket);
  });
});

export { Rooms, PlayerRooms };
// Start application server
server.listen(3000, () => {
  console.log("listening on *:3000");
});
