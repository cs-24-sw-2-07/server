import { expect, it, describe } from "vitest";
import { CreateLobby, ChangeDeckState, JoinLobby, Rooms, CalculateMaxDeckSize } from "../Lobby";
import { PlayerRooms } from "..";
import { removeCardFromHand, MapToPlayerLives, checkWinner } from "../Battle";


describe("Battle functions", () => {

    it("Removes card from hand", () => {
        // create mock socket object
        const socketid = "ghu45DxGsxgy5VCls8Zs"
        const socket = {
            id: socketid, // id is 20 random chars.
            join: () => { }
        };
        //create mock room
        const lobby = CreateLobby(socket, "testuser");
        const roomID = `/${lobby.id}`

        Rooms.get(roomID).players.get(socketid).hand = [1, 2, 3, 4, 5];

        removeCardFromHand(socket.id, 1, roomID)
        expect(Rooms.get(roomID).players.get(socketid).hand).toStrictEqual([1, 3, 4, 5]);
    })

    it("map player lives", () => {
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
        JoinLobby({ name: "testuser2", id: roomID }, roomID, socket2)
        //give players lives
        Rooms.get(roomID).players.get(socket1.id).lives = 4;
        Rooms.get(roomID).players.get(socket2.id).lives = 6;

        const playerArr = MapToPlayerLives(Rooms.get(roomID).players);
        // Testing data on the array
        expect(playerArr[0].lives).toBe(4)
        expect(playerArr[1].lives).toBe(6)

        expect(playerArr[0].name).toBe("testuser")
        expect(playerArr[1].name).toBe("testuser2")

        expect(playerArr[0].id).toBe(socket1.id)
        expect(playerArr[1].id).toBe(socket2.id)
    })

    it("checks for winner", () => {
        // create mock socket objects
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => { },
            to: (socketid) => {
                return {
                    emit: (event, arg) => {
                    }
                };
            },
            emit: (event, arg) => {
            }
        };
        const socket2 = {
            id: "ghu45DxGsxgy5VCls8Zs", // id is 20 random chars.
            join: () => { },
            to: (socketid) => {
                return {
                    emit: (event, arg) => {
                    }
                };
            },
            emit: (event, arg) => {
                console.log(event, arg);
            }
        };

        //create mock socket event 
        const io = {
            to: (socketid) => {
                return {
                    emit: (event, arg) => {
                    }
                };
            }
        };

        //create mock lobby
        const lobby = CreateLobby(socket1, "testuser");
        const roomID = `/${lobby.id}`;
        JoinLobby({ name: "testuser2", id: roomID }, roomID, socket2)

        let roomData = Rooms.get(roomID);

        //give players lives
        roomData.players.get(socket1.id).lives = 4;
        roomData.players.get(socket2.id).lives = 6;

        roomData.startedGame = true;

        // Sets up the game data and tests it
        roomData.maxDeckSize = 7;
        roomData.players.get(socket1.id).usedCards = [1, 2, 3, 4, 5, 6, 7];
        roomData.players.get(socket2.id).usedCards = [1, 2, 3, 4, 5, 6, 7];
        roomData.players.get(socket1.id).hand = [];
        roomData.players.get(socket2.id).hand = [];

        let winnerValue = checkWinner(roomID, Rooms.get(roomID), socket1, io)
        expect(winnerValue).toBe(true)

        // Sets up the game data and tests it
        roomData.maxDeckSize = 7;
        roomData.players.get(socket1.id).usedCards = [1, 2, 3, 4, 5];
        roomData.players.get(socket2.id).usedCards = [1, 2, 3, 4, 5];
        roomData.players.get(socket1.id).hand = [6, 7];
        roomData.players.get(socket2.id).hand = [6, 7];

        winnerValue = checkWinner(roomID, Rooms.get(roomID), socket1, io)
        expect(winnerValue).toBe(false)

        // Sets up the game data and tests it
        roomData.maxDeckSize = 7;
        roomData.players.get(socket1.id).usedCards = [1, 2, 3, 4, 5];
        roomData.players.get(socket2.id).usedCards = [1, 2, 3, 4, 5];
        roomData.players.get(socket1.id).hand = [6, 7];
        roomData.players.get(socket2.id).hand = [6, 7];
        roomData.players.get(socket2.id).lives = 0;

        winnerValue = checkWinner(roomID, Rooms.get(roomID), socket1, io)
        expect(winnerValue).toBe(true)
    })
})