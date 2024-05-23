import { Rooms, PlayerRooms } from "./index.js";
export { createLobbyID, createLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, changeDeckState, shouldStartGame, playerReady, mapToArrayObj, isUsernameValid, checkPlayerDecks, calculateMaxDeckSize, checkValue };

//* =================================================== host lobby =============================================================== *\\
function createLobby(socket, displayName) {
    const id = createLobbyID();
    const roomID = `/${id}`;
    socket.join(roomID);

    //Sets the socket's id to be assigned to the room id when events are called
    PlayerRooms.set(socket.id, roomID);

    // Sets up roomObj and pushes to room map
    const settingsJson = {
        "deckSize": 15,
        "handSize": 5,
        "life": 3,
        "lobbySize": 2
    };
    let roomObj = roomStateObj(socket, displayName, settingsJson);
    Rooms.set(roomID, roomObj);

    const playerArr = mapToArrayObj(roomObj.players);
    // Sends the default settings and id to the host
    return {
        ...settingsJson,
        id: id,
        players: playerArr
    };
}

function createLobbyID() {
    let id;
    do {
        id = "";
        for (let i = 0; i < 6; i++) {
            id += Math.floor(Math.random() * 10);
        }
    } while (Rooms.get(`/${id}`));
    return id;
}

function roomStateObj(socket, username, settings) {
    // The lobby state is added to the rooms map as a value to the given room id
    let lobbyStateObj = {
        "players": new Map(),
        "settings": settings,
        "turn": { current: undefined, next: undefined }
    };
    lobbyStateObj.players.set(socket.id, createPlayer(username, true, socket.id));
    return lobbyStateObj;
}

function changeSettings(changeObj, Room) {
    const setting = changeObj.key;
    Room.settings[setting] = Number(changeObj[setting]);
}

function deleteLobby(roomID, io) {
    //Deletes the key-value pairs from the PlayerRooms map
    const players = Rooms.get(roomID).players;
    for (const [id,] of players.entries()) {
        PlayerRooms.delete(id);
    }

    io.socketsLeave(roomID);
    Rooms.delete(roomID);
}

function shouldStartGame(roomID) {
    const players = Rooms.get(roomID).players;
    if (players.size < 2) {
        return false;
    }
    for (const player of players.values()) {
        if (player.ready === false) {
            return false;
        }
    }
    return true;
}

//* ============================================= joined lobby ============================================================== *\\
function playerReady(socketID, roomID) {
    const roomData = Rooms.get(roomID);
    const player = roomData.players.get(socketID);

    player.ready = player.deck !== null && !player.ready;
    return mapToArrayObj(roomData.players);
}

function joinLobby(playerObj, roomID, socket) {
    socket.join(roomID);

    const Players = Rooms.get(roomID).players;
    const player = createPlayer(playerObj.name, false, socket.id);

    PlayerRooms.set(socket.id, roomID);
    Players.set(socket.id, player);

    return mapToArrayObj(Players);
}

function leaveLobby(socket, roomID) {
    //Delete the player from the PlayerRoom map
    PlayerRooms.delete(socket.id);

    //Delete the player from the Rooms map
    const roomData = Rooms.get(roomID);
    roomData.players.delete(socket.id);
    socket.leave(roomID);

    const playersleftArr = mapToArrayObj(roomData.players);
    return playersleftArr;
}

//* ====================================================== All users ========================================================= *\\
function changeDeckState(deck, playerID, roomData) {
    if (deck.cards.length < roomData.settings.deckSize) {
        return false;
    }
    const player = roomData.players.get(playerID);
    player.deck = deck;
    if (player.host && !player.ready) {
        player.ready = true;
    }
    return true;
}

function createPlayer(username, flag, socketid) {
    return {
        "id": socketid,
        "name": username,
        "deck": null,
        "ready": false,
        "host": flag,
        "lives": null,
        "hand": [],
        "usedCards": []
    };
}

function mapToArrayObj(map) {
    let array = [];
    for (const [key, value] of map.entries()) {
        array.push({
            name: value.name,
            ready: value.ready,
            host: value.host,
            playerid: key,
        });
    }
    return array;
}

function checkValue(settingObj, roomData) {
    const settingKey = settingObj.key;
    const setting = settingObj[settingKey];

    let maximum;
    let minimum;
    switch (settingKey) {
        case "deckSize":
            minimum = 5;
            maximum = Number.MAX_SAFE_INTEGER;
            break;
        case "handSize":
            minimum = 3;
            maximum = roomData.settings.deckSize;
            break;
        case "life":
            minimum = 1;
            maximum = 10;
            break;
        case "lobbySize":
            minimum = roomData.players.size >= 2 ? roomData.players.size : 2;
            maximum = 30;
            break;
    }
    let value;
    if (Number(setting) > maximum) {
        value = "Setting is set too large";
    } else if (Number(setting) < minimum) {
        value = "Setting is set too small";
    } else {
        value = "";
    }

    return {
        key: settingKey,
        value: value
    };
}

function isUsernameValid(username) {
    if (username.length < 2) {
        return false;
    }
    return true;
}

function checkPlayerDecks(roomID, settings, setting) {
    const players = Rooms.get(roomID).players;
    let playersNotAccepted = [];
    for (const [id, playerData] of players.entries()) {
        if (playerData.deck !== null && playerData.deck.cards.length < settings[setting]) {
            playerData.ready = false;
            playerData.deck = null;
            playersNotAccepted.push(id);
        }
    }
    return playersNotAccepted;
}

// Calculate the max deck size based on the players in the room
function calculateMaxDeckSize(roomData) {
    let maxCards = Math.min(...[...roomData.players.values()].map(player => player.deck.cards.length)); //Uses ...[] because math.min does not take an array, so ...[] splits it into indivual values
    return maxCards;
}


export { Rooms };
