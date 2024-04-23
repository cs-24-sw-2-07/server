//import path from "path";
import { Rooms } from "./index.js";
export { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady };
import fs from "fs"; 

//* ========================================= host lobby ===============================================================

/**
 * 
 * @param {*} socket 
 * @param {*} displayName 
 * @returns 
 */
function CreateLobby(socket, displayName) {
    //TODO: When done reinstate this
    //const id = CreateLobbyID(); 
    const id = "12345";
    const RoomID = `/${id}`;
    socket.join(RoomID);

    // Sets up roomObj and pushes to room map 
    let settingsJson = JSON.parse(fs.readFileSync("./settings.json"));
    let roomObj = roomStateObj(socket, displayName, settingsJson); 
    Rooms.set(RoomID, roomObj);
    
    const playerArr = mapToArrayObj(roomObj.players);
    // Sends the default settings and ID to the host
    const returnState = {
        ...settingsJson, 
        id: id,
        players: playerArr
    }
    return returnState; 
}


/*function CreateLobbyID() {
    let numbers;
    do {
        numbers = "";
        for(let i=0; i<6; i++){
            numbers += Math.floor(Math.random()*10); 
        }
    } while (Rooms.get(numbers)); 
    const id = String(numbers); 
    return id; 
}*/

/**
 * 
 * @param {*} socket 
 * @param {*} Roomid 
 * @param {*} name 
 * @param {*} settings 
 * @returns 
 */
function roomStateObj(socket, name, settings){
    // The lobby state is added to the rooms map as a value to the given room id 
    let lobbyStateObj = { 
        "players": new Map(),
        "settings": settings,
        "ready": 0
    };
    lobbyStateObj.players.set(socket.id, createPlayer(name, true, socket.id));
    return lobbyStateObj; 
}



/**
 * 
 * @param {*} changeJson 
 */
//change Settings 
function changeSettings(changeJson) {
    const setting = changeJson.key;
    const Room = Rooms.get(`/${changeJson.id}`); 
    Room.settings[setting] = changeJson[setting]; 
}


/**
 * 
 * @param {*} id 
 * @param {*} io 
 */
function deleteLobby(id, io){
    const pathID = `/${id}`;
    if (Rooms.get(pathID)){
        io.to(id).socketsLeave(id);
        Rooms.delete(pathID);
    } else{
        console.error("Room doesn't exist");
    }
}


/**
 * 
 * @param {*} roomID 
 * @returns 
 */
// Start Game
function ShouldStartGame(roomID){
    const players = Rooms.get(roomID).players; 
    if (players.size < 2)
        return false; 

    for (const player of players) {
        if (player.ready === false || player.deck === null) {
            return false;
        } 
    }
    return true;
}

//* ========================================= joined lobby ============================================================== 

/**
 * 
 * @param {*} socketID 
 * @param {*} lobbyStateObj 
 * @returns 
 */
function PlayerReady(socketID,lobbyStateObj){
    const pathID = `/${lobbyStateObj.id}`;
    const Room = Rooms.get(pathID);
    const playerData= Room.players.get(socketID);

    if(playerData.ready || playerData.deck === null) {
        playerData.ready = false; 
        Room.ready = Room.ready - 1; 
    } else {
        playerData.ready = true; 
        Room.ready = Room.ready + 1; 
    }
    return {
        name: playerData.name,
        ready: Room.ready
    }; 
}

/**
 * 
 * @param {*} playerJson 
 * @param {*} socket 
 */
function joinLobby(playerJson, socket){
    const pathID = `/${playerJson.id}`;
    
    const room = Rooms.get(pathID); 
    room.players.set(socket.id, createPlayer(playerJson.name, false, socket.id));

    socket.join(pathID);
    const joinData = { //TODO: Add every needed element here
        playerAmt: room.players.size,

    }
    return joinData; 
}

/**
 * 
 * @param {*} playerJson 
 * @param {*} socket 
 */
function leaveLobby(playerJson, socket){
    const pathID = `/${playerJson.id}`; 
    const Room = Rooms.get(pathID);
    const player = Room.players.get(socket.id);
    //If the player had readied up then the ready counter should be counted down
    if(player.ready)
        Room.ready = Room.ready - 1; 

    //Delete the player from the map
    Room.players.delete(socket.id);
    socket.leave(pathID);
}

//* ====================================================== Both ========================================================= */

/**
 * 
 * @param {*} deckJson 
 * @param {*} playerID 
 * @returns 
 */
//Choose Decks
function ChangeDeckState(deckJson, playerID) {
    const Room = Rooms.get(`/${deckJson.id}`);
    const player = Room.players.get(playerID); 
    player.deck = deckJson.deck;
    let host = false;
    if(player.host && !player.ready) {
        player.ready = true; 
        Room.ready = Room.ready + 1; 
        host = true; 
    }
    return {ready: Room.ready, host: host}; 
}
/**
 * 
 * @param {*} name 
 * @param {*} flag 
 * @returns 
 */
function createPlayer(name, flag) {
    return {
        "name": name, 
        "deck": null,
        "ready": false,
        "host": flag
    };
} 

function mapToArrayObj(map) {
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

export { Rooms }; 