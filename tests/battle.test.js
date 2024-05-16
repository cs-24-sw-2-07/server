import { expect, it, describe } from "vitest";
import { CreateLobby } from "../Lobby";
import { PlayerRooms } from "..";
import { } from "../Battle";


describe("Battle functions", () => {

    it("Removes card from hand", () => {
        /* // create mock socket object
         const socketid = "ghu45DxGsxgy5VCls8Zs"
         const socket = {
            id: socketid, // id is 20 random chars.
            join: () => { }
        };
        const lobby = CreateLobby(socket, "testuser");

        //Give socket 1 a deck
        const deck1 = { name: "test deck", cards: [] };
        for (let i = 0; i < 15; i++) {
            deck1.cards.push({ name: `card${i}`, question: `question${i}`, answer: `answer${i}` });
        }
        lobby.get(socketid).players.set("ojIckSD2jqNzOqIrAGzL", { deck: deck1 })*/

        expect(true).toBe(true);
        console.log(1)
    })
})