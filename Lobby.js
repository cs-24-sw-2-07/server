//import path from "path";
import { Rooms, PlayerRooms } from "./index.js";
export { CreateLobby, ChangeSettings, JoinLobby, LeaveLobby, DeleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady, MapToArrayObj, isUsernameValid, CheckPlayerDecks, CalculateMaxDeckSize };

//* =================================================== host lobby =============================================================== *\\
/**
 * Creates a lobby for the host that is stored in the Room map
 * @param {*} socket An instance of the users socket
 * @param {*} displayName The name that the user entered which will be their username in the lobby
 * @returns an object that is sent client-side to the update the lobby accordingly
 */
function CreateLobby(socket, displayName) {
    const id = CreateLobbyID();
    const roomID = `/${id}`;
    socket.join(roomID);

    //Sets the socket's id to be assigned to the room id when events are called
    PlayerRooms.set(socket.id, roomID);

    // Sets up roomObj and pushes to room map
    const settingsJson = {
        "deckSize": 15,
        "handSize" : 5,
        "life": 3,
        "lobbySize": 2
    };
    let RoomObj = RoomStateObj(socket, displayName, settingsJson);
    Rooms.set(roomID, RoomObj);

    const playerArr = MapToArrayObj(RoomObj.players);
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
function CreateLobbyID() {
    let id;
    do {
        id = "";
        for(let i=0; i<6; i++){
            id += Math.floor(Math.random()*10);
        }
    } while (Rooms.get(`/${id}`));
    return id;
}

/**
 * Function for creating the room object that contains the settings and a map for all players
 * @param {*} socket instance of the users socket
 * @param {*} username the name given by the player
 * @param {*} Settings object containing the settings
 * @returns the room object
 */
function RoomStateObj(socket, username, Settings){
    // The lobby state is added to the rooms map as a value to the given room id
    let LobbyStateObj = {
        "players": new Map(),
        "settings": Settings,
        "turn": { current: undefined, next: undefined }
    };
    LobbyStateObj.players.set(socket.id, CreatePlayer(username, true, socket.id));
    return LobbyStateObj;
}

/**
 * Function that changes a setting in the Room State
 * @param {*} ChangeObj object that contains the setting to be changed
 * @returns boolean whether the setting was accepted or not
 */
//change Settings
function ChangeSettings(ChangeObj, roomID) {
    if(!isSettingValid(ChangeObj, roomID)) {
        return false;
    }
    const setting = ChangeObj.key;
    const Room = Rooms.get(roomID);
    Room.settings[setting] = ChangeObj[setting];
    return true;
}

/**
 * Deletes a lobby if no id's are read
 * @param {*} roomID Uses to read players id
 * @param {*} io Allows for access to the overall socket connection
 */
function DeleteLobby(roomID, io){
    //Deletes the key-value pairs from the PlayerRooms map
    const players = Rooms.get(roomID).players
    for(const [id,] of players.entries()) {
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

function ShouldStartGame(roomID){
    const players = Rooms.get(roomID).players;
    if (players.size < 2) {
        return false;
    }
    for (const player of players) {
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
function PlayerReady(socketID, roomID){
    const Room = Rooms.get(roomID);
    const Player= Room.players.get(socketID);

    Player.ready = Player.deck !== null && !Player.ready;
    return MapToArrayObj(Room.players);
}

/**
 * Allows players to join lobby with ther username and id
 * @param {*} playerArr Includes all players in the lobby
 * @param {*} PlayerObj Holds the players username
 * @param {*} socket Holds the players socket id.
 */
function JoinLobby(PlayerObj, roomID, socket){
    socket.join(roomID);

    const Players = Rooms.get(roomID).players;
    const Player = CreatePlayer(PlayerObj.name, false, socket.id);

    PlayerRooms.set(socket.id, roomID);
    Players.set(socket.id, Player);

    return MapToArrayObj(Players);
}

/**
 * Allows for users to leave a lobby
 * @param {*} PlayerObj Object that contains the room's id
 * @param {*} PlayerObj Object that contains the room's id
 * @param {*} socket Gets the socket id for the user
 * @param {*} Room puts the players id into a map.
 * @param {*} playersleftArr creates a new array with the updated map.
 */
function LeaveLobby(socket, roomID){
    //Delete the player from the PlayerRoom map
    PlayerRooms.delete(socket.id);

    //Delete the player from the Rooms map
    const Room = Rooms.get(roomID);
    Room.players.delete(socket.id);
    socket.leave(roomID);

    const playersleftArr = MapToArrayObj(Room.players);
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
function ChangeDeckState(deck, playerID, Room) {
    if (deck.cards.length < Room.settings.deckSize) {
        return false;
    }
    const player = Room.players.get(playerID);
    player.deck = deck;
    if(player.host && !player.ready) {
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
function CreatePlayer(username, flag, socketid) {
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
function MapToArrayObj(map) {
    let array = [];
    for(const [key, value] of map.entries()) {
        array.push({
            name: value.name,
            ready: value.ready,
            host: value.host,
            playerid: key,
        });
    }
    return array;
}

/**
 * Function that checks whether the inputted setting is accepted
 * @param {*} SettingObj the object containing the new setting
 * @returns boolean is true if the setting is within the range and false if not
 */
function isSettingValid(SettingObj, roomID) {
    const setting = SettingObj.key;
    const settings = Rooms.get(roomID).settings;
    switch(setting) {
        case "deckSize":
            return SettingObj[setting] >= 5;
        case "handSize":
            return SettingObj[setting] >= 3 && SettingObj[setting] <= settings.deckSize;
        case "life":
            return SettingObj[setting] >= 1 && SettingObj[setting] <= 10;
        case "lobbySize":
            return SettingObj[setting] >= 2 && SettingObj[setting] <= 30;
        default:
            return false;
    }
}

function isUsernameValid(username) {
    if(username.length < 2) {
        return false;
    }
    return true;
}

function CheckPlayerDecks(roomID, settings, setting) {
    const players = Rooms.get(roomID).players;
    let playersNotAccepted = [];
    for (const [id, playerData] of players.entries()) {
        if(playerData.deck !== null && playerData.deck.cards.length < settings[setting]) {
            playerData.ready = false;
            playerData.deck = null;
            playersNotAccepted.push(id);
        }
    }
    return playersNotAccepted;
}

// Calculate the max deck size based on the players in the room
function CalculateMaxDeckSize(roomData) {
  return Math.min([...roomData.players.values()].map(player => player.deck.cards.length));
}


export { Rooms };
