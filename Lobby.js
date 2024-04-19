//import path from "path";
import { Rooms } from "./index.js";
export { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState, StartGame, PlayerReady };
import fs from "fs"; 
// ========================================= host lobby ===============================================================

// lobby page loaded
function CreateLobby(socket, displayName) {
    // Create map for rooms
    //TODO: When done reinstate this
    //const id = CreateLobbyID(); 
    const id = "12345";
    const pathID = `/${id}`;
    socket.join(pathID);

    // Sets up roomObj and pushes to room map 
    let settingsJson = JSON.parse(fs.readFileSync("./settings.json"));
    let roomObj = roomStateObj(socket, id, displayName, settingsJson); 
    Rooms.set(id, roomObj);

    // Sends the default settings and ID to the host
    settingsJson.id = id;
    socket.emit("lobbyCreated", settingsJson);
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
        "settings": settings
    };
    lobbyStateObj.players.set(socket.id, createPlayer(name));
    return lobbyStateObj; 
}

function createPlayer(name) {
    return {
        "name": name, 
        "deck": null,
        "ready": false
    };
} 

//Choose Decks
function ChangeDeckState(deckJson, playerID) {
    const room = Rooms.get(deckJson.id);
    const player = room.players.get(playerID); 
    player.deck = deckJson.deck;
}

//change Settings 
function changeSettings(changeJson) {
    const setting = changeJson.key;
    const room = Rooms.get(changeJson.id); 
    room.settings[setting] = changeJson[setting]; 
}

function joinLobby(playerJson, socket){
    let name = Rooms.get(playerJson).players.get(playerJson).name;
    socket.join(Rooms);
    console.log(name + "has joined the lobby");
    socket.to(Rooms).emit(name+"joined", socket.id);
    Rooms.get(`/${playerJson.id}`);
}
        

function leaveLobby(playerJson){
    playerJson = JSON.parse(playerJson)
    Rooms.get(`/${playerJson.id}`)
    let Room = Rooms.get(`/${playerJson.id}`)
    Room.players.delete(playerJson.id)
    
}

function deleteLobby(id, io, Rooms){
    if (Rooms[id]){
    io.in(id).socketsLeave(id);
    delete Rooms[id];
    return true;
    } else{
        console.error("Room dosen't exist");
        return false
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

    const playerData= lobbyStateObj.players.get(socketID)
    if(playerData.deck !== null){
        playerData.ready = true;
        return true;
    }
    else {return false;}


}

// funktion der kan genkende når en anden funktion bliver udført som så køre efterfølgende ( skal laves på client side) 


// ========================================= joined lobby ============================================================== 