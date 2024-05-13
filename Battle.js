import { PlayerRooms, Rooms } from "./index.js";
export { drawHand, removeCardFromHand, checkWinner, MapToPlayerLives, nextPlayer, switchRoles };

//make a starting hand
function drawHand(deck, handSize) {
    const avgDeckRating = deck.cards.reduce((ratingSum, card) => ratingSum + card.rating, 0) / deck.cards.length;
    //randomize the rating so that it can vary between 1 and -1 from original value
    let randomRating = (avgDeckRating + (Math.random() * 2) - 1)
    //make sure rating does not become bigger than 5 or smaller than 1
    randomRating = Math.min(Math.max(randomRating, 1), 5);     

    const cards = deck.cards.map((card,index) => ({...card, index: index}))

    //find cards that best match
    const sortFunc = (a, b) => Math.abs(randomRating - b.rating) - Math.abs(randomRating - a.rating);
    console.log("random Rating", randomRating);

    const cardsSorted = cards.sort(sortFunc);
    console.log(cardsSorted);
    
    let hand = [];
    for(let i = 0; i < handSize; i++){
        hand.push(cardsSorted.pop().index); 
    }
    console.log(hand);
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
function drawCard(oppPerformance, deck, usedCards, handCards, maxLives) {
    let newCardRating;
    const lifeVariance = maxLives - 1;

    if(oppPerformance > 0) {
        const avgLives = Math.ceil((lifeVariance) / 2); 
        if(oppPerformance > avgLives){
            newCardRating = lifeVariance - oppPerformance;
        }
        else{
            newCardRating = avgLives - oppPerformance;
        }
    }
    else if (oppPerformance < 0) {
        const avgLives = -1 * Math.ceil((lifeVariance) / 2); 
        if (oppPerformance >= avgLives) {
            newCardRating = avgLives - oppPerformance;
        } else {
            newCardRating = lifeVariance - oppPerformance;
        }
    }
    else {
        newCardRating = 3; 
    }

    const unusedCards = deck.filter(card => !(handCards.includes(card) || usedCards.includes(card))); 
    const candidates = unusedCards.filter(card => card.rating === Math.ceil(newCardRating) || card.rating === Math.floor(newCardRating));
    
    if(candidates.length === 0) { //TODO: Evt. add logik her
       return unusedCards[Math.floor(Math.random()*unusedCards.length)];
    }

    return candidates[Math.floor(Math.random()*candidates.length)];    
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
        const oppPerformance = computeOppPerformance(roomData);
        let pickedCard = drawCard(oppPerformance, player.deck, player.usedCards, player.hand, roomData.settings.life);
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

    // Check if current next player is alive, else they should be skipped.
    if(roomData.players.get(roomData.turn.next).lives === 0) {
        // Set next player to a player alive.
        roomData.turn.next = nextPlayer(roomData);
    }
    // Shift players alive
    roomData.turn.current = roomData.turn.next;
    roomData.turn.next = nextPlayer(roomData);

    socket.to(roomID).emit("switchRoles", { turn: roomData.turn });
    socket.emit("switchRoles", { turn: roomData.turn, hand: roomData.players.get(socket.id).hand });
}

function computeOppPerformance(roomData) {
    const opponentID = roomData.turn.next; 
    const players = Rooms.get(PlayerRooms.get(opponentID)).players; 
    const opponent = players.get(opponentID);

    const playerArr = MapToPlayerLives(players);
    const avgPerformance = playerArr.reduce((sum, player) => sum + player.lives, 0) / playerArr.length; 
    return opponent.lives - avgPerformance;
}