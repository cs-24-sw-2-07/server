import { expect, it, describe } from "vitest";
import { CreateLobby, ChangeDeckState, JoinLobby, Rooms } from "../Lobby";
import { PlayerRooms } from "..";
import { removeCardFromHand } from "../Battle";


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

        //Give socket 1 a deck
        const deck1 = { name: "test deck", cards: [] };
        for (let i = 0; i < 20; i++) {
            deck1.cards.push({ name: `card${i}`, question: `question${i}`, answer: `answer${i}` });
        } 
        Rooms.get(roomID).players.get(socketid).hand = [1,2,3,4,5];
        ChangeDeckState(deck1, socket.id, Rooms.get(roomID));

        removeCardFromHand(socket.id, 1, roomID)
        expect(Rooms.get(roomID).players.get(socketid).hand).toStrictEqual([1,3,4,5]);
    })
})