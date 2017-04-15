# gacha4good
Gacha game for the gamingforgood website. Players collect streamers to fight for them against the evil twitch emotes.

## TODO
- [x] remove splat text
- [x] some visual indication of damage taken

- [x] replace enemy sprites with emote pics like Kappa and PogChamp
- [x] kill a kapaa get a kappa
- [ ] list emotes up top
  - [x] KappaPride
  - [ ] other emotes
- [ ] level up buttons
  - [x] add and position rectangles and buttons for UI
  - [ ] display hero picture in rectangle
  - [x] cost: `<emoteAmount> [emoteSprite]`
  - [ ] button click -> increase combat level
    - [ ] check funds > cost - can afford it
    - [ ] decrease funds, increase combatLevel++
    - [ ] click does nothing if cant afford

- [ ] cooler effects based on combat level:
  - [ ] two flame sprites instead of one
  - [ ] jump higher on atk
  - [ ] increased (size) scale of sprite
  - [ ] at milestone levels: sunglasses or maybe a hat. -- how? hero.addChild(sunglassesSprite)
  - [ ] tint color of the hero -- how? heroSprite.tint

// Spend [K] to lvl up Warrior  
// Spend [P] to lvl up Mage

## Level up interface (on left)
| LVL UP | Warrior  
|  4 [K] | Lvl 1

| LVL UP | Mage  
| 10 [P] | Lvl 2
