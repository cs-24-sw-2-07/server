import { Rooms } from "./index.js";
export { updateLives, drawHand, updateHand, removeCardFromHand, drawCard };


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

function updateHand(playerID, roomID){
    let player = Rooms.get(roomID).players.get(playerID);
    
    //if the player's hand is empty and have recieved notification from the other player => find winner
    if(player.hand.size === 0 && Rooms.get(roomID).outOfCardsNotify){
        let oppPlayer = Rooms.get(roomID).players.filter((player) => {player != playerID})
        console.log(oppPlayer)
        if(oppPlayer.lives < player.lives){
            return "winner"
        } else if(oppPlayer.lives > player.lives){
            return "lost"
        } else {
            return "draw"
        }
    } else if(player.hand.size === 0){
        Rooms.get(roomID).outOfCardsNotify=true;
        console.log(Rooms.get(roomID).outOfCardsNotify)
    }

    //if there are more cards left in the deck => draw new card
    if(player.deck.cards.length >= player.usedCards.length + player.hand.size){
        let pickedCard = drawCard(player.usedCards, player.deck.cards.length);
        player.hand.push(pickedCard);
    }
}

//draw a new card
function drawCard(usedCards, deckSize){
    let pickedCard = -1;
    do{
        pickedCard = Math.floor(Math.random()*deckSize);
    }while(!usedCards.includes(pickedCard))

    return pickedCard;
}

function removeCardFromHand(playerID, usedIndex,roomID){
    let roomPlayers = Rooms.get(roomID).players;
    let updatedHand = [...roomPlayers.get(playerID).hand];
    roomPlayers.get(playerID).usedCards.push(updatedHand[usedIndex]);
    updatedHand.splice(usedIndex,1);
    roomPlayers.get(playerID).hand = [...updatedHand]
}




//make a starting hand
function drawHand(deckSize, handSize){
    let hand = new Set();
    while(hand.size < handSize){
        let pickedCard = Math.floor(Math.random()*deckSize);
        hand.add(pickedCard);
    }
    return hand;
}