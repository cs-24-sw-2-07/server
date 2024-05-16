import { expect, it, describe } from "vitest";
import { CreateLobbyID, CreateLobby, ChangeSettings, DeleteLobby, JoinLobby, ShouldStartGame, Rooms, PlayerReady, ChangeDeckState, isUsernameValid, LeaveLobby } from "../Lobby";
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
            join: () => {}
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
            join: () => {}
        };
        const lobby = CreateLobby(socket, "testuser");
        
        // Check settings validation
        expect(ChangeSettings({ key: "deckSize", deckSize: 5 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "deckSize", deckSize: 20 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "deckSize", deckSize: 3 }, `/${lobby.id}`)).toBe(false)

        expect(ChangeSettings({ key: "handSize", handSize: 5 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "handSize", handSize: 10 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "handSize", handSize: 21 }, `/${lobby.id}`)).toBe(false)

        expect(ChangeSettings({ key: "life", life: 1 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "life", life: 5 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "life", life: 10 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "life", life: 11 }, `/${lobby.id}`)).toBe(false)

        expect(ChangeSettings({ key: "lobbySize", lobbySize: 1 }, `/${lobby.id}`)).toBe(false)
        expect(ChangeSettings({ key: "lobbySize", lobbySize: 2 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "lobbySize", lobbySize: 3 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "lobbySize", lobbySize: 30 }, `/${lobby.id}`)).toBe(true)
        expect(ChangeSettings({ key: "lobbySize", lobbySize: 31 }, `/${lobby.id}`)).toBe(false)

        // Unknown setting
        expect(ChangeSettings({ key: "test", test: 5 }, `/${lobby.id}`)).toBe(false)
    });

    it("delete lobby", () => {
        const socketid = "ojIckSD2jqNzOqIrAGzL";

        // create mock socket object
        const socket = {
            id: socketid, // id is 20 random chars.
            join: () => {}
        };
        const lobby = CreateLobby(socket, "testuser");

        expect(Rooms.get(`/${lobby.id}`)).not.undefined;
        
        // create mock io object
        const io = {
            socketsLeave: () => {}
        }

        DeleteLobby(`/${lobby.id}`, io);
        expect(Rooms.get(`/${lobby.id}`)).undefined;
    });

    it("should start game + deck + readyup", () => {
        // create mock socket objects
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => {}
        };
        const socket2 = {
            id: "ghu45DxGsxgy5VCls8Zs", // id is 20 random chars.
            join: () => {}
        };
        const lobby = CreateLobby(socket1, "testuser");

        const roomID = `/${lobby.id}`;

        expect(ShouldStartGame(roomID)).toBe(false);

        JoinLobby({ name: "testuser2", id: roomID }, roomID, socket2)

        expect(ShouldStartGame(roomID)).toBe(false);

        const deck = { name: "test deck", cards: [] };

        // Test for too small deck size first
        for(let i = 0; i < 5; i++) {
            deck.cards.push({name: `card${i}`, question: `question${i}`, answer: `answer${i}`});
        }

        ChangeDeckState(deck, socket1.id, Rooms.get(roomID));
        ChangeDeckState(deck, socket2.id, Rooms.get(roomID));
        PlayerReady(socket2.id, roomID);
        expect(ShouldStartGame(roomID)).toBe(false);

        // Test for bigger deck size
        for(let i = 4; i < 20; i++) {
            deck.cards.push({name: `card${i}`, question: `question${i}`, answer: `answer${i}`});
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
            join: () => {}
        };
        const socket2 = {
            id: "ghu45DxGsxgy5VCls8Zs", // id is 20 random chars.
            join: () => {},
            leave: () => {} // Add leave mock function
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

    it("Check if player has a made decks", () => {
        // hvad der skal tjekket 
        // hvilken værdi cconst players får 
        // en der tjekker at 
        // konstanter der skal bruges i functionen: socket, displayName, settingsJson);
        //      roomID = et lobby id med "/" foran og 5 tal så /78489
        //      settings = 
        //      setting = 
    expect(CheckPlayerDecks.playerData.ready).toBe(false);
    }

    )

}); 