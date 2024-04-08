import {Rooms} from "index.js"; // TODO: Check om det er correct
export {}
import express from "express";
import http from "http";
import { Server } from "socket.io";
// ========================================= host lobby ===============================================================

// lobby page loaded

function CreateLobby(socket) {
    // Create map for rooms
    const id = CreateLobbyID(); 
    
    
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

function SendSettings(socket) {
    
}


//Choose Decks
// function 

//change Settings 

//Delete Lobby 

// Start Game





// ========================================= joined lobby ============================================================== 