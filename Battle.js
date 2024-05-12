import { Rooms } from "./index.js";
export { drawHand, removeCardFromHand, drawCard, MapToPlayerLives, nextPlayer };

//make a starting hand
function drawHand(deckSize, handSize){
    let hand = new Set();
    while(hand.size < handSize){
        let pickedCard = Math.floor(Math.random()*deckSize);
        hand.add(pickedCard);
    }
    return hand;
}

function removeCardFromHand(playerID, usedIndex,roomID){
    let roomPlayers = Rooms.get(roomID).players;
    let updatedHand = [...roomPlayers.get(playerID).hand];
    roomPlayers.get(playerID).usedCards.push(updatedHand[usedIndex]);
    updatedHand.splice(usedIndex,1);
    roomPlayers.get(playerID).hand = [...updatedHand]
}

//draw a new card
function drawCard(usedCards, deckSize, handCards){
    let pickedCard = -1;
    do{
        pickedCard = Math.floor(Math.random()*deckSize);
    }while(usedCards.includes(pickedCard) || handCards.includes(pickedCard))
    return pickedCard;
}

function MapToPlayerLives(map) {
    let array = [];
    for(const [key, value] of map.entries()) {
        array.push({
            name: value.name,
            id: key,
            lives: value.lives
        });
    }
    return array;
}

function nextPlayer(room) {
    let playersLeft = MapToPlayerLives(room.players).filter(player => player.lives !== 0);
    //console.log(playersLeft);
    let currentIndex = playersLeft.findIndex(player => room.turn.current === player.id);
    //console.log(currentIndex);
    //console.log("current (" + currentIndex + "): ", room.turn.current, "next (" + (currentIndex + 1) % playersLeft.length +"): ", playersLeft[(currentIndex + 1) % playersLeft.length].id)
    return playersLeft[(currentIndex + 1) % playersLeft.length].id;
}