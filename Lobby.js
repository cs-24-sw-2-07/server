import path from "path";
import { Rooms } from "./index.js";
export { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState, StartGame, PlayerReady };
import fs from "fs"; 
// ========================================= host lobby ===============================================================

// lobby page loaded
function CreateLobby(socket, io, displayName) {
    // Create map for rooms
    const id = CreateLobbyID(); 
    console.log(id);
    // Sets up room and pushes to room map 
    RoomSetUp(socket, id, displayName); 

    // Sends the default settings to the host
    SendSettingsAndId(socket, id);
}

function CreateLobbyID() {
    let numbers;
    do {
        numbers = "";
        for(let i=0; i<5; i++){
            numbers += Math.floor(Math.random()*10); 
        }
    } while (Rooms.get(numbers)); 
    const id = numbers; 
    return id; 
}

function RoomSetUp(socket, id, name){
    const pathID = `/${id}`; 

    // The lobby state is added to the rooms map as a value to the given room id 
    let settings = fs.readFileSync("./settings.json");
    let settingsJson = JSON.parse(settings);
    let lobbyStateObj = {
        "id": id, 
        "players": new Map(),
        "settings": settingsJson
    };
    let playerVal = {
        "name": name, 
        "deck": null,
        "ready": false
    };
    lobbyStateObj.players.set(socket.id, playerVal);

    socket.join(pathID);
    Rooms.set(id, lobbyStateObj);
}

function SendSettingsAndId(socket, id) {
    let LobbyJson = fs.readFileSync("./settings.json");
    const data = JSON.parse(LobbyJson);
    data.id = String(id);
    socket.emit("lobbyCreated", data);
}

//Choose Decks
function ChangeDeckState(deckJson, playerID) {
    // Get the Room
    const room = Rooms.get(deckJson.id);
    // Get the player
    const player = room.players.get(playerID); 
    // Assign the players deck
    player.deck = deckJson.deck;
}

//change Settings 
function changeSettings(changeJson) {
    const setting = changeJson.key;
    const room = Rooms.get(changeJson.id); 
    room.settings[setting] = changeJson[setting]; 
    console.log(room);
}
//! SLET SENERE
/*changeJson = {
  id: idnum,
  key: life
  life: newVal 
}*/

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