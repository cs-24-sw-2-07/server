import { Rooms } from "./index.js";
export { drawHand, removeCardFromHand, checkWinner, MapToPlayerLives, nextPlayer, switchRoles };

//make a starting hand
function drawHand(deckSize, handSize) {
    let hand = new Set();
    while (hand.size < handSize) {
        let pickedCard = Math.floor(Math.random() * deckSize);
        hand.add(pickedCard);
    }
    return hand;
}

function removeCardFromHand(playerID, usedIndex, roomID) {
    let roomPlayers = Rooms.get(roomID).players;
    let updatedHand = [...roomPlayers.get(playerID).hand];
    roomPlayers.get(playerID).usedCards.push(updatedHand[usedIndex]);
    updatedHand.splice(usedIndex, 1);
    roomPlayers.get(playerID).hand = [...updatedHand]
}

// draw a new card
function drawCard(usedCards, deckSize, handCards) {
    let pickedCard = -1;
    do {
        pickedCard = Math.floor(Math.random() * deckSize);
    } while (usedCards.includes(pickedCard) || handCards.includes(pickedCard))
    return pickedCard;
}

function MapToPlayerLives(map) {
    let array = [];
    for (const [key, value] of map.entries()) {
        array.push({
            name: value.name,
            id: key,
            lives: value.lives
        });
    }
    return array;
}

function checkWinner(roomID, roomData, socket, io) {

    const players = [...roomData.players.values()];

    // check if theres only one player left, declare that player as winner.
    if (players.filter(player => player.lives !== 0).length === 1) {
        socket.emit("foundWinner", "won");
        socket.to(roomID).emit("foundWinner", "lose");
        return true;
    }

    // Draw card for player if any is left.
    let player = Rooms.get(roomID).players.get(socket.id);
    if (player.deck.cards.length > player.usedCards.length + player.hand.length) {
        let pickedCard = drawCard(player.usedCards, player.deck.cards.length, player.hand);
        player.hand.push(pickedCard);
    }

    // If no cards left, give win to player with most lives, or end with draw for remaining players.
    if (!players.some((player) => player.lives > 0 && player.hand.length > 0)) {
        // Sort players descending by lives.
        const playersSorted = players.sort((a, b) => b.lives - a.lives);
        const winLivesAmount = playersSorted[0].lives;
        const multipleDraws = playersSorted[1].lives === winLivesAmount;
        playersSorted.forEach(player => {
            // Player Won / Draw
            if (player.lives === winLivesAmount) {
                if (multipleDraws) {
                    io.to(player.id).emit("foundWinner", "draw");
                } else {
                    io.to(player.id).emit("foundWinner", "won");
                }
                // Player lost
            } else {
                io.to(player.id).emit("foundWinner", "lose");
            }
        })
        return true;
    }

    return false;
}

function nextPlayer(room) {
    let playersLeft = MapToPlayerLives(room.players).filter(player => player.lives !== 0);
    let currentIndex = playersLeft.findIndex(player => room.turn.current === player.id);
    return playersLeft[(currentIndex + 1) % playersLeft.length].id;
}

function switchRoles(roomID, roomData, socket) {
    // Assign new player to select card and new player to answer.
    // Check if next player is alive, else they should be excluded.
    if(roomData.players.get(roomData.turn.next).lives === 0) {
        // Set next player to a player alive.
        roomData.turn.next = nextPlayer(roomData);
        // Shift players alive
        roomData.turn.current = roomData.turn.next;
        roomData.turn.next = nextPlayer(roomData);
    } else {
        roomData.turn.current = roomData.turn.next;
        roomData.turn.next = nextPlayer(roomData);
    }

    socket.to(roomID).emit("switchRoles", { turn: roomData.turn });
    socket.emit("switchRoles", { turn: roomData.turn, hand: roomData.players.get(socket.id).hand });
}