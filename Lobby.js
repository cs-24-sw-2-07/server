import { Rooms } from "./index.js";
export { CreateLobby, changeSettings, joinLobby, leaveLobby, deleteLobby, ChangeDeckState };
import fs from "fs"; 
// ========================================= host lobby ===============================================================

// lobby page loaded
function CreateLobby(socket, io, data) {
    // Create map for rooms
    const id = CreateLobbyID(); 

    // Sets up room and pushes to room map 
    RoomSetUp(socket, io, id, data.name); 

    // Sends the default settings to the host
    SendSettingsAndId(socket, io, id);
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

function RoomSetUp(socket, io, id, name){
    const pathID = "/" + id; 
    io.of(pathID).adapter.on("create-room", (room) => {
        console.log(`room ${room} was created`);
    });
    // The lobby state is added to the rooms map as a value to the given room id 
    let settings = fs.readFileSync("./settings.json");
    let lobbyStateObj = {
        "id": id, 
        "players": new Map(),
        "settings": JSON.parse(settings)
    };
    let playerVal = { 
        "name": name, 
        "deck": null,
        "ready": false
    };
    lobbyStateObj.players.set(socket.id, playerVal); 
    Rooms.set(id, lobbyStateObj);
}

function SendSettingsAndId(io, id) {
    const pathID = "/" + id; 
    let LobbyJson = fs.readFileSync("./settings.json");

    const data = JSON.stringify(LobbyJson);
    io.to(pathID).emit(data);
}

//Choose Decks
function ChangeDeckState(deckJson, socket) {
    // Get the Room
    const room = Rooms.get(deckJson.id);
    // Get the player
    const player = room.players.get(socket.id); 
    // Assign the players deck
    player.deck = deckJson.deck;
}

//change Settings 
function changeSettings(changeJson) {
    const setting = changeJson.key;
    const room = Rooms.get(changeJson.id); 
    room.settings[setting] = changeJson[setting]; 
}
/* SLET SENERE
changeJson = {
  id: idnum,
  key: life
  life: newVal 
} 
*/

function joinLobby(id, io, rooms){
            socket.on(`joinlobby`, (roomcode) =>{
            if (isValidRoomcode(roomcode)){
                socket.join(roomcode);
                console.log(name + "has joined the lobby");
                io.to(roomcode).emit(name+"joined", socket.id);
            }else {
                socket.emit("invalid room code");
            }
        })
    }

    function leaveLobby(id, io, playerId){
        socket.emit (`leave lobby`, () =>{
                let name = Rooms.get(id).players.get(playerId).name;
                console.log(`A player has left the lobby`);
                Rooms.players.delete(socket.id, {
                    "name": name,
                    "decks": null,
                    "ready": false
                })
            }
        ) 
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



// ========================================= joined lobby ============================================================== 