//import path from "path";
import { Rooms } from "./index.js";
export { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState, StartGame, PlayerReady };
import fs from "fs"; 
// ========================================= host lobby ===============================================================

// lobby page loaded
function CreateLobby(socket, displayName) {
    //TODO: When done reinstate this
    //const id = CreateLobbyID(); 
    const id = "12345";
    const pathID = `/${id}`;
    socket.join(pathID);

    // Sets up roomObj and pushes to room map 
    let settingsJson = JSON.parse(fs.readFileSync("./settings.json"));
    let roomObj = roomStateObj(socket, pathID, displayName, settingsJson); 
    Rooms.set(pathID, roomObj);

    //!console.log(Rooms.get(pathID));

    // Sends the default settings and ID to the host
    settingsJson.id = id;
    settingsJson.ready = roomObj.ready; 
    settingsJson.playerAmt = roomObj.players.size; 
    console.log(roomObj.players.size);
    return settingsJson; 
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
    const room = Rooms.get(`/${deckJson.id}`);
    const player = room.players.get(playerID); 
    player.deck = deckJson.deck;
    let host = false;
    if(player.host) {
        player.ready = true; 
        room.ready = room.ready + 1; 
        host = true; 
    }
    return {ready: room.ready, hostOrNot: host}; 
}

//change Settings 
function changeSettings(changeJson) {
    const setting = changeJson.key;
    const room = Rooms.get(`/${changeJson.id}`); 
    room.settings[setting] = changeJson[setting]; 
}

function joinLobby(playerJson, socket){
    const pathID = `/${playerJson.id}`;
    
    const room = Rooms.get(pathID); 
    room.players.set(socket.id, createPlayer(playerJson.name, false));

    socket.join(pathID);

    let name = socket.id; 
    console.log(name, "has joined the lobby", pathID);
}

function leaveLobby(playerJson, socket){
    const pathID = `/${playerJson.id}`; 
    let Room = Rooms.get(pathID);
    Room.players.delete(socket.id);
    Room.ready = Room.ready - 1; 
    socket.leave(pathID);
}

function deleteLobby(id, io){
    const pathID = `/${id}`;

    if (Rooms.get(pathID)){
        io.in(id).socketsLeave(id);
        Rooms.delete(pathID);
    } else{
        console.error("Room dosen't exist");
    }
}



// Start Game
function StartGame(lobbyStateObj){
for( let playerData of lobbyStateObj.players.values()){
    if (playerData.ready === false) {
        return false;
    } 
}
return true;
}

// players ready 

function PlayerReady(socketID,lobbyStateObj){
    const pathID = `/${lobbyStateObj.id}`;
    console.log(pathID);
    const Room = Rooms.get(pathID);
    console.log(Room);
    const playerData= Room.players.get(socketID);

    if(playerData.ready) {
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