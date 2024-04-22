//import path from "path";
import { Rooms } from "./index.js";
export { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState, ShouldStartGame, PlayerReady };
import fs from "fs"; 
// ========================================= host lobby ===============================================================

// lobby page loaded
function CreateLobby(socket, displayName) {
    //TODO: When done reinstate this
    //const id = CreateLobbyID(); 
    const id = "12345";
    const RoomID = `/${id}`;
    socket.join(RoomID);

    // Sets up roomObj and pushes to room map 
    let settingsJson = JSON.parse(fs.readFileSync("./settings.json"));
    let roomObj = roomStateObj(socket, RoomID, displayName, settingsJson); 
    Rooms.set(RoomID, roomObj);

    // Sends the default settings and ID to the host
    const returnState = {
        ...settingsJson, 
        id: id,
        ready: roomObj.ready,
        playerAmt: roomObj.players.size
    }
    return returnState; 
}

/*function CreateLobbyID() {
    let numbers;
    do {
        numbers = "";
        for(let i=0; i<5; i++){
            numbers += Math.floor(Math.random()*10); 
        }
    } while (Rooms.get(numbers)); 
    const id = String(numbers); 
    return id; 
}*/

function roomStateObj(socket, Roomid, name, settings){
    // The lobby state is added to the rooms map as a value to the given room id 
    let lobbyStateObj = {
        "id": Roomid, 
        "players": new Map(),
        "settings": settings,
        "ready": 0
    };
    lobbyStateObj.players.set(socket.id, createPlayer(name, true));
    return lobbyStateObj; 
}

function createPlayer(name, flag) {
    return {
        "name": name, 
        "deck": null,
        "ready": false,
        "host": flag
    };
} 

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

//change Settings 
function changeSettings(changeJson) {
    const setting = changeJson.key;
    const Room = Rooms.get(`/${changeJson.id}`); 
    Room.settings[setting] = changeJson[setting]; 
}

function joinLobby(playerJson, socket){
    const pathID = `/${playerJson.id}`;
    
    const room = Rooms.get(pathID); 
    room.players.set(socket.id, createPlayer(playerJson.name, false));

    socket.join(pathID);
}

function leaveLobby(playerJson, socket){
    const pathID = `/${playerJson.id}`; 
    const Room = Rooms.get(pathID);
    const player = Room.players.get(socket.id);
    //If the player had readied up then their ready should be counted down
    if(player.ready)
        Room.ready = Room.ready - 1; 

    //Delete the player from the map
    Room.players.delete(socket.id);
    socket.leave(pathID);
}

function deleteLobby(id, io){
    const pathID = `/${id}`;
    if (Rooms.get(pathID)){
        io.to(id).socketsLeave(id);
        Rooms.delete(pathID);
    } else{
        console.error("Room doesn't exist");
    }
}



// Start Game
function ShouldStartGame(roomID){
    const players = Rooms.get(roomID).players; 
    if(players.size < 2)
        return false; 

    for(const player of players){
        if (player.ready === false || player.deck === null) {
            return false;
        } 
    }
    return true;
}

// players ready 

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
export { Rooms }; 
// funktion der kan genkende når en anden funktion bliver udført som så køre efterfølgende ( skal laves på client side) 


// ========================================= joined lobby ============================================================== 