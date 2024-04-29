import { Rooms } from "./index.js";
export { updateLives, drawHand, updateHand, removeCardFromHand };


function updateLives(playerID, roomID){   
    const roomData = Rooms.get(roomID);
    for(let [, player] of roomData.players.entries()){
        if(roomData.players.has(playerID)){
            player.lives--;
            if(player.lives == 0){
                return "winner"
            }
            return player.lives
        }
    }
}

function updateHand(){
    //check if there are more cards left in the deck
}

function removeCardFromHand(playerID, usedIndex,roomID){
    let roomPlayers = Rooms.get(roomID).players;
    let updatedHand = [...roomPlayers.get(playerID).hand];
    roomPlayers.get(playerID).usedCards.push(updatedHand[usedIndex]);
    updatedHand.splice(usedIndex,1);
    roomPlayers.get(playerID).hand = [...updatedHand]
}

/*
//draw a new card
function drawCard(playerID, usedIndex, hand, usedCards){
    //if there is more cards in the deck => draw new card
    if(decks.playerID.cards.length >= usedCards.length + hand.size){
        let pickedCard = -1;
        do{
            pickedCard = Math.floor(Math.random()*decks.playerID.cards.length);
        }while(!usedCards.has(pickedCard))
        hand.add(pickedCard)
    }
    return hand;
}*/

//make a starting hand
function drawHand(deckSize, handSize){
    let hand = new Set();
    while(hand.size < handSize){
        let pickedCard = Math.floor(Math.random()*deckSize);
        hand.add(pickedCard);
    }
    return hand;
}