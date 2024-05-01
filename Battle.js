import { Rooms } from "./index.js";
export { updateLives, drawHand, updateHand, removeCardFromHand, drawCard };

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

function updateLives(playerID, roomID){   
    const roomData = Rooms.get(roomID);
    let oppPlayer;
    //Finds player that did not send socket event
    for (const key of Rooms.get(roomID).players.keys()) {
        if (playerID !== key) {
            oppPlayer = key;
            break;
        }
    } 
    roomData.players.get(oppPlayer).lives--;
    let oppPlayerLives = roomData.players.get(oppPlayer).lives;
    console.log(oppPlayerLives);
    if(oppPlayerLives == 0){
        return "winner"
    }
    return oppPlayerLives
}

function updateHand(playerID, roomID){
    let player = Rooms.get(roomID).players.get(playerID);
    //if the player's hand is empty and have recieved notification from the other player => find winner
    if(player.hand.length === 0 && Rooms.get(roomID).outOfCardsNotify){
        console.log("DONE")
        //Finds the other player, so we can calculate who won
        let oppPlayer;
        for (const key of Rooms.get(roomID).players.keys()) {
            if (playerID !== key) {
                oppPlayer = key;
              break;
            }
          }    

        let oppPlayerLives = Rooms.get(roomID).players.get(oppPlayer).lives
        console.log("lives for players: ", oppPlayerLives, " ", player.lives)
        if(oppPlayerLives < player.lives){
            return "winner"
        } else if(oppPlayerLives > player.lives){
            return "lost"
        } else {
            return "draw"
        }
    } else if(player.hand.length === 0){
        console.log("send notification")
        Rooms.get(roomID).outOfCardsNotify=true;
        console.log(Rooms.get(roomID).outOfCardsNotify)
    }

    //if there are more cards left in the deck => draw new card
    if(player.deck.cards.length > player.usedCards.length + player.hand.length){
        console.log("draw card")
        let pickedCard = drawCard(player.usedCards, player.deck.cards.length, player.hand);
        player.hand.push(pickedCard);
    }
}

//draw a new card
function drawCard(usedCards, deckSize, handCards){
    let pickedCard = -1;
    do{
        pickedCard = Math.floor(Math.random()*deckSize);
    }while(usedCards.includes(pickedCard) || handCards.includes(pickedCard))
    return pickedCard;
}



