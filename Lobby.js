//import path from "path";
import { Rooms } from "./index.js";
export { CreateLobby, ChangeSettings, JoinLobby, LeaveLobby, DeleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady };

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
        "settings": Settings
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
function ChangeSettings(ChangeObj) {
    if(!isSettingValid(ChangeObj)) {
        return false; 
    }
    const setting = ChangeObj.key;
    const Room = Rooms.get(`/${ChangeObj.id}`); 
    Room.settings[setting] = ChangeObj[setting]; 
    return true; 
}

/**
 * Deletes a lobby if no id's are read
 * @param {*} id Uses to read players id
 * @param {*} io Allows for access to the overall socket connection
 */
function DeleteLobby(id, io){
    const pathID = `/${id}`;
    io.to(pathID).socketsLeave(pathID);
    Rooms.delete(pathID);
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
 * @param {*} id is the id for the room
 * @returns an object 
 */
function PlayerReady(socketID, id){
    const pathID = `/${id}`;
    const Room = Rooms.get(pathID);
    const Player= Room.players.get(socketID);

    Player.ready = Player.deck !== null && !Player.ready;
    return {
        ready: Player.ready,
        id: socketID
    }; 
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
    Players.set(socket.id, Player);
    
    const playersArr = MapToArrayObj(Players);
    return playersArr; 
}

/**
 * Allows for users to leave a lobby
 * @param {*} PlayerObj Object that contains the room's id
 * @param {*} socket Gets the socket id for the user
 * @param {*} Room puts the players id into a map.
 * @param {*} playersleftArr creates a new array with the updated map.
 */
function LeaveLobby(PlayerObj, socket){
    const pathID = `/${PlayerObj.id}`; 
    const Room = Rooms.get(pathID);
    
    //Delete the player from the map
    Room.players.delete(socket.id);
    socket.leave(pathID);
    const playersleftArr = MapToArrayObj(Room.players);
    return playersleftArr;
}

//* ====================================================== All users ========================================================= *\\
/**
 * Changes the deck for the given user in the room object
 * @param {*} deckObj contains the deck and id for the room
 * @param {*} playerID the socket id to recognize the user
 * @returns a boolean for whether the user is a host or not
 */
function ChangeDeckState(deckObj, playerID) {
    const Room = Rooms.get(`/${deckObj.id}`);
    if (deckObj.deck > Room.settings.deckSize) {
        return false;
    }
    const player = Room.players.get(playerID); 
    player.deck = deckObj.deck;
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
function CreatePlayer(username, flag) {
    return {
        "name": username, 
        "deck": null,
        "ready": false,
        "host": flag
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
            playerid: key
        }); 
    }
    return array;
}

/**
 * Function that checks whether the inputted setting is accepted
 * @param {*} SettingObj the object containing the new setting
 * @returns boolean is true if the setting is within the range and false if not
 */
function isSettingValid(SettingObj) {
    const setting = SettingObj.key;
    switch(setting) {
        case "deckSize": 
            return SettingObj[setting] >= 15 && SettingObj[setting] <= 50;
        case "handSize":
            return SettingObj[setting] >= 5 && SettingObj[setting] <= 7;
        case "life":
            return SettingObj[setting] >= 1 && SettingObj[setting] <= 5;
        case "lobbySize":
            return SettingObj[setting] >= 2 && SettingObj[setting] <= 30;
        default: 
            return false; 
    }
}

export { Rooms }; 