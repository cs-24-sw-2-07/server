import { Rooms } from "./index.js";
export { /*updateLives, drawCard, */drawHand };


/*function updateLives(){
    lives.playerID--;
    if(lives.playerID == 0){
        return "winner"
    }
    return lives.playerID
}

//draw a new card
function drawCard(playerID, usedIndex, hand, usedCards){
    usedCards.add(hand[usedIndex]);
    hand.splice(usedIndex,1)

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