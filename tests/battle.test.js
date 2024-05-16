import { expect, it, describe } from "vitest";
import { CreateLobby, JoinLobby, Rooms } from "../Lobby";
import { removeCardFromHand, MapToPlayerLives, checkWinner, nextPlayer, switchRoles, drawHand, computeOppPerformance, drawCard } from "../Battle";


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
            }
        };

        //create mock socket io event 
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
        roomData.players.get(socket2.id).lives = 4;

        roomData.startedGame = true;

        // Sets up the game data and tests it
        roomData.maxDeckSize = 7;
        roomData.players.get(socket1.id).usedCards = [1, 2, 3, 4, 5, 6, 7];
        roomData.players.get(socket2.id).usedCards = [1, 2, 3, 4, 5, 6, 7];
        roomData.players.get(socket1.id).hand = [];
        roomData.players.get(socket2.id).hand = [];

        let winnerValue = checkWinner(roomID, Rooms.get(roomID), socket1, io)
        expect(winnerValue).toBe(true)

        //give players lives
        roomData.players.get(socket1.id).lives = 6;
        roomData.players.get(socket2.id).lives = 4;

        roomData.startedGame = true;

        // Sets up the game data and tests it
        roomData.maxDeckSize = 7;
        roomData.players.get(socket1.id).usedCards = [1, 2, 3, 4, 5, 6, 7];
        roomData.players.get(socket2.id).usedCards = [1, 2, 3, 4, 5, 6, 7];
        roomData.players.get(socket1.id).hand = [];
        roomData.players.get(socket2.id).hand = [];

        winnerValue = checkWinner(roomID, Rooms.get(roomID), socket1, io)
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

    it("find next player", () => {
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => {},
        };
        const socket2 = {
            id: "ghu45DxGsxgy5VCls8Zs", // id is 20 random chars.
            join: () => {},
        };
        const socket3 = {
            id: "ghu45DxGsxgy5VCls8Zg", // id is 20 random chars.
            join: () => {},
        };

        //create mock lobby
        const lobby = CreateLobby(socket1, "testuser");
        const roomID = `/${lobby.id}`;
        JoinLobby({ name: "testuser2", id: roomID }, roomID, socket2)
        JoinLobby({ name: "testuser3", id: roomID }, roomID, socket3)
        let roomData = Rooms.get(roomID);
        //give players lives
        roomData.players.get(socket1.id).lives = 1;
        roomData.players.get(socket2.id).lives = 1;
        roomData.players.get(socket3.id).lives = 1;
        roomData.turn = {current: null, next: null}

        roomData.turn.current = socket1.id;
        roomData.turn.next = nextPlayer(roomData);
        expect(roomData.turn.next).toBe(socket2.id)

        roomData.turn.current =  roomData.turn.next;
        roomData.turn.next = nextPlayer(roomData);
        expect(roomData.turn.next).toBe(socket3.id)

        roomData.turn.current =  roomData.turn.next;
        roomData.turn.next = nextPlayer(roomData);
        expect(roomData.turn.next).toBe(socket1.id)
    })

    it("switch roles", () => {
         // create mock socket objects
         const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL",
            join: () => { },
            to: (socketid) => {
                return {
                    emit: (event, arg) => {}
                };
            },
            emit: (event, arg) => {}
        };
        const socket2 = {
            id: "ghu45DxGsxgy5VCls8Zs", // id is 20 random chars.
            join: () => { },
            to: (socketid) => {
                return {
                    emit: (event, arg) => {}
                };
            },
            emit: (event, arg) => {}
        };
        const socket3 = {
            id: "ghu45DxGsxgy5VCls8Zg", // id is 20 random chars.
            join: () => { },
            to: (socketid) => {
                return {
                    emit: (event, arg) => {}
                };
            },
            emit: (event, arg) => {}
        };

        //create mock lobby
        const lobby = CreateLobby(socket1, "testuser");
        const roomID = `/${lobby.id}`;
        JoinLobby({ name: "testuser2", id: roomID }, roomID, socket2)
        JoinLobby({ name: "testuser3", id: roomID }, roomID, socket3)
        let roomData = Rooms.get(roomID);

        roomData.players.get(socket1.id).lives = 1;
        roomData.players.get(socket2.id).lives = 1;
        roomData.players.get(socket3.id).lives = 1;
        roomData.turn = {current: null, next: null}

        roomData.turn.current = socket1.id;
        roomData.turn.next = socket2.id;
        switchRoles(roomID, roomData, socket1);
              
        expect(roomData.turn.current).toBe(socket2.id)
        expect(roomData.turn.next).toBe(socket3.id)

        roomData.players.get(socket1.id).lives = 1;
        roomData.players.get(socket2.id).lives = 0;
        roomData.players.get(socket3.id).lives = 1;
        roomData.turn = {current: null, next: null}

        roomData.turn.current = socket1.id;
        roomData.turn.next = socket2.id;
        switchRoles(roomID, roomData, socket1);
              
        expect(roomData.turn.current).toBe(socket3.id)
        expect(roomData.turn.next).toBe(socket1.id)
    });

    it("Draw a hand", () => {
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => {},
        };

        //create mock lobby
        const lobby = CreateLobby(socket1, "testuser");
        const roomID = `/${lobby.id}`;
        const roomData = Rooms.get(roomID);
        const player1 = roomData.players.get(socket1.id);

        //assign a deck to the player
        player1.deck = {
            cards: [
                { rating: 1 },
                { rating: 2 },
                { rating: 3 },
                { rating: 4 },
                { rating: 5 },
            ] //Average: (1+2+3+4+5) / 5 = 3 
        }
        //3 +- 1 = between 2 and 4 
        //Draw hand function call here
        let hand = drawHand(player1.deck, 3);
        expect(hand.length).toBe(3); 
        expect(hand).not.toContain(6);

        hand = drawHand(player1.deck, 4);
        expect(hand.length).toBe(4);
        expect(hand).not.toContain(6);
        
    });

    it("Draw a card", () => {
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => {},
        };
        const lobby = CreateLobby(socket1, "testuser");
        const roomID = `/${lobby.id}`;
        const roomData = Rooms.get(roomID);
        const player1 = roomData.players.get(socket1.id);
        player1.deck = {
            cards: [
                { rating: 1 }, //Index 0
                { rating: 1 }, //Index 1
                { rating: 1 }, //Index 2
                { rating: 1 }, //...
                { rating: 1 },
                { rating: 1 },
                { rating: 1 },
                { rating: 1 },
                { rating: 4 }, //index 8
                { rating: 1 }  //Index 9
            ]
        };
        player1.usedCards = [4];
        player1.hand = [1, 2, 3];

        //The opponent has the average rating
        let opponentPerformance = 0; 
        let maxLives = 5; 
        let newCard = drawCard(opponentPerformance, player1.deck, 
            player1.usedCards, player1.hand, maxLives);
        
        expect(player1.usedCards).not.toContain(newCard);
        expect(player1.hand).not.toContain(newCard);

        opponentPerformance = 5; 
        newCard = drawCard(opponentPerformance, player1.deck, 
            player1.usedCards, player1.hand, maxLives);
        expect(newCard).toBe(8);

        opponentPerformance = -5; 
        newCard = drawCard(opponentPerformance, player1.deck, 
            player1.usedCards, player1.hand, maxLives);
        expect(newCard).not.toBe(8);
    });

    it("Calculate opponent performance", () => {
        const socket1 = {
            id: "ojIckSD2jqNzOqIrAGzL", // id is 20 random chars.
            join: () => {},
        };
        const socket2 = {
            id: "ghu45DxGsxgy5VCls8Zs", // id is 20 random chars.
            join: () => {},
        };
        const socket3 = {
            id: "ghu45DxGsxgy5VCls8Zg", // id is 20 random chars.
            join: () => {},
        };

        const lobby = CreateLobby(socket1, "testuser");
        const roomID = `/${lobby.id}`;
        JoinLobby({ name: "testuser2", id: roomID }, roomID, socket2)
        JoinLobby({ name: "testuser3", id: roomID }, roomID, socket3)
        const roomData = Rooms.get(roomID);

        roomData.players.get(socket1.id).lives = 5;
        roomData.players.get(socket2.id).lives = 5;
        roomData.players.get(socket3.id).lives = 5;        

        roomData.turn = {next: "ghu45DxGsxgy5VCls8Zs"}; //Socket 2
        let performance1 = computeOppPerformance(roomData, socket1.id);
        roomData.turn = {next: "ghu45DxGsxgy5VCls8Zg"}; //Socket 3
        let performance2 = computeOppPerformance(roomData, socket2.id);
        roomData.turn = {next: "ojIckSD2jqNzOqIrAGzL"}; //Socket 1
        let performance3 = computeOppPerformance(roomData, socket3.id);
        expect(performance1).toBe(0); 
        expect(performance2).toBe(0); 
        expect(performance3).toBe(0); 


        roomData.players.get(socket1.id).lives = 1;
        roomData.players.get(socket2.id).lives = 2;
        roomData.players.get(socket3.id).lives = 6;
        //Average = (1+2+6) / 3 = 3

        roomData.turn = {next: "ghu45DxGsxgy5VCls8Zs"}; //Socket 2
        performance1 = computeOppPerformance(roomData, socket1.id);
        roomData.turn = {next: "ghu45DxGsxgy5VCls8Zg"}; //Socket 3
        performance2 = computeOppPerformance(roomData, socket2.id);
        roomData.turn = {next: "ojIckSD2jqNzOqIrAGzL"}; //Socket 1
        performance3 = computeOppPerformance(roomData, socket3.id);
        expect(performance1).toBe(0); // (2 - 1) + (2 - 3) = 0 
        expect(performance2).toBe(7); // (6 - 2) + (6 - 3) = 7
        expect(performance3).toBe(-7); // (1 - 6) + (1 - 3) = -7


    });
});