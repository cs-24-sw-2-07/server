import { Rooms } from "./index.js"; // TODO: Check om det er correct
export { CreateLobby, changeSettings };
import fs from "fs"; 
// ========================================= host lobby ===============================================================

// lobby page loaded
function CreateLobby(socket, io) {
    // Create map for rooms
    const id = CreateLobbyID(); 

    // Sets up room and pushes to room map 
    RoomSetUp(socket, io, id); 

    // Sends the default settings to the host
    SendSettingsAndId(socket, io, id);
}

function CreateLobbyID() {
    do {
        let numbers ="";
        for(let i=0; i<5; i++){
            numbers += Math.floor(Math.random()*10); 
        }
    } while (Rooms.get(numbers)); 
    const id = numbers; 
    return id; 
}

function RoomSetUp(socket, io, id){
    const pathID = "/" + id; 
    io.of(pathID).adapter.on("create-room", (room) => {
        console.log(`room ${room} was created`);
    });
    // Vi tildeler socket.id til socketconnection, som vi sætter ind i vores map
    // hvor vores rooms lå
    const socketconnection = new Set(); 
    socketconnection.add(socket.id);
    Rooms.set(id, socketconnection);
}

function SendSettingsAndId(socket, io, id) {
    const pathID = "/" + id; 
    let LobbyJson = fs.readFileSync("./settings.json");

    const data = JSON.stringify(LobbyJson);
    io.to(pathID).emit(data);
}


//Choose Decks
// function 

//change Settings 
function changeSettings(io, changeJson) {
    const setting = changeJson.key;
    const pathID = `/${changeJson.id}`; 
    let settingJson = fs.readFileSync("./settings.json");
    settingJson[setting] = changeJson[setting]; 
    io.to(pathID).emit(JSON.stringify(settingJson));
};
/* SLET SENERE
changeJson = {
  id: idnum,
  key: life
  life: newVal 
} 
*/

function DeleteLobby(id, io, Rooms){
    if (Rooms[idd]){
    io.in(id).socketsLeave(id);
    delete Rooms[id];
    return true;
    } else{
        console.error("Room dosen't exist");;
        return false
    }
}
// Start Game



// ========================================= joined lobby ============================================================== 