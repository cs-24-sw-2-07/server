//import path from "path";
import { Rooms, PlayerRooms } from "./index.js";
export { createLobbyID, createLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, changeDeckState, shouldStartGame, playerReady, mapToArrayObj, isUsernameValid, checkPlayerDecks, calculateMaxDeckSize, checkValue };

//* =================================================== host lobby =============================================================== *\\
/**
 * Creates a lobby for the host that is stored in the Room map
 * @param {*} socket An instance of the users socket
 * @param {*} displayName The name that the user entered which will be their username in the lobby
 * @returns an object that is sent client-side to the update the lobby accordingly
 */
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
/**
 * Creates a lobby-id consisting of 6 numbers
 * @returns the id as a String
 */
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

/**
 * Function for creating the room object that contains the settings and a map for all players
 * @param {*} socket instance of the users socket
 * @param {*} username the name given by the player
 * @param {*} settings object containing the settings
 * @returns the room object
 */
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

/**
 * Function that changes a setting in the Room State
 * @param {*} changeObj object that contains the setting to be changed
 * @returns boolean whether the setting was accepted or not
 */
//change Settings
function changeSettings(changeObj, Room) {
    const setting = changeObj.key;
    Room.settings[setting] = Number(changeObj[setting]);
}

/**
 * Deletes a lobby if no id's are read
 * @param {*} roomID Uses to read players id
 * @param {*} io Allows for access to the overall socket connection
 */
function deleteLobby(roomID, io) {
    //Deletes the key-value pairs from the PlayerRooms map
    const players = Rooms.get(roomID).players;
    for (const [id,] of players.entries()) {
        PlayerRooms.delete(id);
    }

    io.socketsLeave(roomID);
    Rooms.delete(roomID);
}

/**
 * tjeks if there are 2 or more players in the room and tjeks if all players in the room are ready.
 * @param {*} roomID is the ID of the Room
 * @returns true or false depending on weather the the conditions for the game to start is met
 */

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
/**
 * Make it able for players to ready and unready if a deck has been chosen.
 * @param {*} socketID is the ID for user
 * @param {*} roomID is the id for the room
 * @returns an object
 */
function playerReady(socketID, roomID) {
    const roomData = Rooms.get(roomID);
    const player = roomData.players.get(socketID);

    player.ready = player.deck !== null && !player.ready;
    return mapToArrayObj(roomData.players);
}

/**
 * Allows players to join lobby with ther username and id
 * @param {*} playerArr Includes all players in the lobby
 * @param {*} playerObj Holds the players username
 * @param {*} socket Holds the players socket id.
 */
function joinLobby(playerObj, roomID, socket) {
    socket.join(roomID);

    const Players = Rooms.get(roomID).players;
    const player = createPlayer(playerObj.name, false, socket.id);

    PlayerRooms.set(socket.id, roomID);
    Players.set(socket.id, player);

    return mapToArrayObj(Players);
}

/**
 * Allows for users to leave a lobby
 * @param {*} socket Gets the socket id for the user
 * @param {*} Room puts the players id into a map.
 * @param {*} playersleftArr creates a new array with the updated map.
 */
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
/**
 * Changes the deck for the given user in the room object
 * @param {*} deck the object contains the deck
 * @param {*} playerID the socket id to recognize the user
 * @param {*} roomID Id of the Room
 * @returns a boolean for whether the user is a host or not
 */
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
/**
 * Function for creating a player object for the player map
 * @param {*} username the username of the user
 * @param {*} flag to set whether the user is host or not
 * @returns the object
 */
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
/**
 * Takes a map and pushes it to an array object
 * @param {*} map contains an object as the value
 * @returns the created array
 */
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
