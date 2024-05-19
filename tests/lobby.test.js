import { expect, it, describe } from "vitest";
import { CreateLobbyID, checkValue, CreateLobby, DeleteLobby, JoinLobby, ShouldStartGame, Rooms, PlayerReady, ChangeDeckState, isUsernameValid, LeaveLobby } from "../Lobby";
import { PlayerRooms } from "..";


describe("lobby functions", () => {

    it("generate unique lobby id", () => {
        const lobby1id = CreateLobbyID();
        const lobby2id = CreateLobbyID();
        expect(lobby1id).not.toBe(lobby2id)
    });

    it("create lobby", () => {
        const socketid = "ojIckSD2jqNzOqIrAGzL";

        // create mock socket object
        const socket = {
            id: socketid, // id is 20 random chars.
            join: () => { }
        };
        const lobby = CreateLobby(socket, "testuser");

        // Default setting values
        expect(lobby.deckSize).toBe(15);
        expect(lobby.handSize).toBe(5);
        expect(lobby.life).toBe(3);
        expect(lobby.lobbySize).toBe(2);

        // Check if player joined the lobby
        expect(lobby.players.length).toBe(1);
        const playerIndex = lobby.players.findIndex(player => player.playerid === socketid);
        // Player should be found
        expect(playerIndex).not.toBe(-1);
        // Check playerdata
        expect(lobby.players[playerIndex].name).toBe("testuser");
        expect(lobby.players[playerIndex].host).toBe(true);
        expect(lobby.players[playerIndex].playerid).toBe(socketid);
        expect(lobby.players[playerIndex].ready).toBe(false);
    });

    it("change settings validation", () => {
        const socketid = "ojIckSD2jqNzOqIrAGzL";

        // create mock socket object
        const socket = {
            id: socketid, // id is 20 random chars.
            join: () => { }
        };
        const lobby = CreateLobby(socket, "testuser");

        const Room = Rooms.get(`/${lobby.id}`);
        
        // Check settings validation
        expect(checkValue({ key: "deckSize", deckSize: 5 }, Room).value).toBe("");
        expect(checkValue({ key: "deckSize", deckSize: 20 }, Room).value).toBe("")
        expect(checkValue({ key: "deckSize", deckSize: 3 }, Room).value).not.toBe("")

        expect(checkValue({ key: "handSize", handSize: 5 }, Room).value).toBe("")
        expect(checkValue({ key: "handSize", handSize: 10 }, Room).value).toBe("")
        expect(checkValue({ key: "handSize", handSize: 21 }, Room).value).not.toBe("")

        expect(checkValue({ key: "life", life: 1 }, Room).value).toBe("")
        expect(checkValue({ key: "life", life: 5 }, Room).value).toBe("")
        expect(checkValue({ key: "life", life: 10 }, Room).value).toBe("")
        expect(checkValue({ key: "life", life: 11 }, Room).value).not.toBe("")

        expect(checkValue({ key: "lobbySize", lobbySize: 1 }, Room).value).not.toBe("")
        expect(checkValue({ key: "lobbySize", lobbySize: 2 }, Room).value).toBe("")
        expect(checkValue({ key: "lobbySize", lobbySize: 3 }, Room).value).toBe("")
        expect(checkValue({ key: "lobbySize", lobbySize: 30 }, Room).value).toBe("")
        expect(checkValue({ key: "lobbySize", lobbySize: 31 }, Room).value).not.toBe("")
    });

    it("delete lobby", () => {
        const socketid = "ojIckSD2jqNzOqIrAGzL";

        // create mock socket object
        const socket = {
            id: socketid, // id is 20 random chars.
            join: () => { }
        };
        const lobby = CreateLobby(socket, "testuser");

        expect(Rooms.get(`/${lobby.id}`)).not.undefined;

        // create mock io object
        const io = {
            socketsLeave: () => { }
        }

        DeleteLobby(`/${lobby.id}`, io);
        expect(Rooms.get(`/${lobby.id}`)).undefined;
    });

    it("should start game + deck + readyup", () => {
        // create mock socket objects
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => { }
        };
        const socket2 = {
            id: "ghu45DxGsxgy5VCls8Zs", // id is 20 random chars.
            join: () => { }
        };
        const lobby = CreateLobby(socket1, "testuser");

        const roomID = `/${lobby.id}`;

        expect(ShouldStartGame(roomID)).toBe(false);

        JoinLobby({ name: "testuser2", id: roomID }, roomID, socket2)

        expect(ShouldStartGame(roomID)).toBe(false);

        const deck = { name: "test deck", cards: [] };

        // Test for too small deck size first
        for (let i = 0; i < 5; i++) {
            deck.cards.push({ name: `card${i}`, question: `question${i}`, answer: `answer${i}` });
        }

        ChangeDeckState(deck, socket1.id, Rooms.get(roomID));
        ChangeDeckState(deck, socket2.id, Rooms.get(roomID));
        PlayerReady(socket2.id, roomID);
        expect(ShouldStartGame(roomID)).toBe(false);

        // Test for bigger deck size
        for (let i = 4; i < 20; i++) {
            deck.cards.push({ name: `card${i}`, question: `question${i}`, answer: `answer${i}` });
        }

        ChangeDeckState(deck, socket1.id, Rooms.get(roomID));
        ChangeDeckState(deck, socket2.id, Rooms.get(roomID));
        PlayerReady(socket2.id, roomID);

        expect(ShouldStartGame(roomID)).toBe(true);
    });

    it("username validation", () => {
        // Less than two chars
        expect(isUsernameValid("a")).toBe(false);
        // Greater than or equal to two chars
        expect(isUsernameValid("ab")).toBe(true);
        // Bigger usernames
        expect(isUsernameValid("testuser")).toBe(true);
    });

    it("leave lobby", () => {
        // create mock socket objects
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => { }
        };
        const socket2 = {
            id: "ghu45DxGsxgy5VCls8Zs", // id is 20 random chars.
            join: () => { },
            leave: () => { } // Add leave mock function
        };
        const lobby = CreateLobby(socket1, "testuser");
        const roomID = `/${lobby.id}`;

        expect(Rooms.get(roomID)).not.undefined;
        expect(PlayerRooms.get(socket2.id)).toBeUndefined;

        JoinLobby({ name: "testuser2", id: roomID }, roomID, socket2)
        expect(PlayerRooms.get(socket2.id)).toBe(roomID);

        expect(Rooms.get(roomID).players.size).toBe(2);

        LeaveLobby(socket2, roomID);

        expect(Rooms.get(roomID).players.size).toBe(1);
        expect(PlayerRooms.get(socket2.id)).toBeUndefined;
    });

    it("Check player decks length in comparison with settings", () => {
        const socketid = "ojIckSD2jqNzOqIrAGzL"; // socket id of user1
    
        // create mock socket2 object
        const socket = {
            id: socketid, // id is 20 random chars.
            join: () => {}
        };

        const lobby = CreateLobby(socket, "testuser");
        const roomID = `/${lobby.id}`;
        JoinLobby({name: "test"}, roomID, socket); 

        const deck = { name: "test deck", cards: [] };
        for(let i = 0; i < 5; i++) {
            deck.cards.push({name: `card${i}`, question: `question${i}`, answer: `answer${i}`});
        }
        const player = Rooms.get(roomID).players.get(socket.id);
        player.deck = deck; 

        const setting = "deckSize"; 
        const settings = {
            deckSize:10
        };
        
        let playerArr=CheckPlayerDecks(roomID, settings, setting);

        expect(player.ready).toBe(false);
        expect(player.deck).toBe(null);
        expect(playerArr[0]).toBe(socket.id);


        // the deck is bigger than the settings 
        const socketid2 =  "ghu45DxGsxgy5VCls8Zs";// socket id of user2 
        
        const socket2 = {
            id: socketid2, // id is 20 random chars.
            join: () => {}
        };

   

        const lobby2 = CreateLobby(socket2, "testuser2");



        const roomID2 = `/${lobby2.id}`;
        JoinLobby({name: "test2"}, roomID2, socket2); 
      

        const deck2 = { name: "test deck2", cards: [] };
        for(let i = 0; i < 12; i++) {
            deck.cards.push({name: `card${i}`, question: `question${i}`, answer: `answer${i}`});
        }


        const player2 = Rooms.get(roomID2).players.get(socket2.id);
        player2.ready = true 
        player2.deck = deck2; 

        let playerArr2=CheckPlayerDecks(roomID, settings, setting);

        expect(player2.ready).toBe(true);
        expect(player2.deck).not.toBe(null);
        expect(playerArr2.length).toBe(0);

    });

    it("Change deck setting", () => {
        
        // create mock socket object
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => {}
        };
        const socket2 = {
            id: "ojIckSD2jqNzOqIrAGzZ",
            join: () => {}
        }

        const lobby = CreateLobby(socket1, "testuser");
        const roomID = `/${lobby.id}`;
        JoinLobby({name: "test2"}, roomID, socket2); 

        const deck = { name: "test deck", cards: [] };
        for(let i = 0; i < 5; i++) {
            deck.cards.push({name: `card${i}`, question: `question${i}`, answer: `answer${i}`});
        }
          
        const Room = Rooms.get(roomID);
        const player1 = Room.players.get(socket1.id);
        const player2 = Room.players.get(socket2.id);

        Room.settings.deckSize = 15;
        let changedSetting1 = ChangeDeckState(deck, socket1.id, Room);
        expect(changedSetting1).toBe(false); 
        expect(player1.ready).toBe(false);

        Room.settings.deckSize = 4; 
        changedSetting1 = ChangeDeckState(deck, socket1.id, Room);         
        expect(changedSetting1).toBe(true); 
        expect(player1.ready).toBe(true);

        let changedSetting2 = ChangeDeckState(deck, socket2.id, Room);
        expect(changedSetting2).toBe(true);
        expect(player2.ready).toBe(false);
        
    });

    it("find min. deck size", () => {
        // create mock roomData
        const roomData = {
            players: new Map(),
            maxDeckSize:NaN
        };
        
        //Give socket 1 a deck
        const deck1 = { name: "test deck", cards: [] };
        for (let i = 0; i < 15; i++) {
            deck1.cards.push({ name: `card${i}`, question: `question${i}`, answer: `answer${i}` });
        }
        roomData.players.set("ojIckSD2jqNzOqIrAGzL",{deck:deck1})
        
        //Give socket 2 a deck
        const deck2 = { name: "test deck", cards: [] };
        for (let i = 0; i < 20; i++) {
            deck2.cards.push({ name: `card${i}`, question: `question${i}`, answer: `answer${i}` });
        }
        roomData.players.set("ghu45DxGsxgy5VCls8Zs",{deck:deck2})

        roomData.maxDeckSize = CalculateMaxDeckSize(roomData);
        expect(roomData.maxDeckSize).toBe(15)
        
    });
}); 