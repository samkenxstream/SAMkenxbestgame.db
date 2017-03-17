/* global Phaser, HealthBar */
// Phaser version 2.6.2 - "Kore Springs"
window.onload = function () {
  const TwitchWidth = 847
  const gameWidth = TwitchWidth
  const gameHeight = 220

  const PERSON_MOVEMENT_VELOCITY = 80
  const PERSON_WIDTH = 60

  const NUM_ENEMIES = 3
  const PLAYER_MAX_HEALTH = 38
  const ENEMY_MAX_HEALTH = 22 // 17

  const DISTANCE_BETWEEN_FIGHTERS = PERSON_WIDTH + 12
  const COMBAT_DISTANCE = 28

  const game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update
  })

  const getFirstAliveUnit = function () {
/*    const frontSprite = this.sprites[this.frontIndex]
    if (frontSprite.alive && frontSprite.placesFromFront === 0) {
      return frontSprite
    }*/
    const aliveSprites = this.getAllAliveUnits()
    const frontAliveSprite = aliveSprites.reduce((mostFrontSprite, sprite) => {
      if (sprite.placesFromFront < mostFrontSprite.placesFromFront) {
        return sprite
      }
      return mostFrontSprite
    }, aliveSprites[0])
    return frontAliveSprite
  }

  const getAllAliveUnits = function () {
    return this.sprites.filter(sprite => sprite.alive)
  }

  let players = {
    sprites: [
      'knight',
      'archer',
      'knight'
    ],
    frontIndex: 0, // index of the player at the front, ready to attack
    state: 'idle', // 'idle', walking', 'fighting', swapping'
    count: 0,
    getAllAliveUnits,
    getFirstAliveUnit
  }

  let enemies = {
    sprites: new Array(NUM_ENEMIES).fill('knight'),
    frontIndex: 0, // index of the player at the front, ready to attack
    getAllAliveUnits,
    getFirstAliveUnit
  }

  let chest,
    playersStateText,
    gameStatusText

  function preload () {
    game.load.image('background', 'images/background1.png')

    game.load.image('knight_orange', 'images/characters/knight_orange_60x57.png')
    game.load.image('knight_blue', 'images/characters/knight_blue_60x57.png')
    game.load.image('archer_blue', 'images/characters/archer_blue_60x60.png')
    game.load.image('archer_orange', 'images/characters/archer_orange_60x60.png')

    game.load.image('chest_closed', 'images/chest_closed.png')
    game.load.image('chest_open', 'images/chest_open.png')
    game.load.image('chest_closed', 'images/chest_closed.png')
  }

  function createFighter ({type, fighterClass, x, y, maxHealth, placesFromFront}) {
    // numFromFront is the number
    let fighter
    let spriteSuffix
    let flipHorizontally = false

    if (type === 'player') {
      spriteSuffix = '_blue'
      flipHorizontally = true
    } else if (type === 'enemy') {
      spriteSuffix = '_orange'
    }
    switch (fighterClass) {
      case 'knight':
        fighter = game.add.sprite(x, y, 'knight' + spriteSuffix)
        break
      case 'archer':
        fighter = game.add.sprite(x, y, 'archer' + spriteSuffix)
        break
    }

    if (flipHorizontally) {
      fighter.scale.x *= -1
    }

    fighter.info = {
      type,
      fighterClass
    }

    fighter.anchor.setTo(0.5, 0)
    fighter.inputEnabled = true
    fighter.input.useHandCursor = placesFromFront > 0

    game.physics.arcade.enable(fighter)
    fighter.body.collideWorldBounds = true
    fighter.body.gravity.y = 700
    fighter.maxHealth = maxHealth
    fighter.health = fighter.maxHealth

    fighter.placesFromFront = placesFromFront
    fighter.shiftBackwards = (places = 1) => {
      fighter.placesFromFront += places
      fighter.input.useHandCursor = fighter.placesFromFront > 0
    }
    fighter.shiftToFront = () => {
      fighter.placesFromFront = 0
      fighter.input.useHandCursor = fighter.placesFromFront > 0
    }
    fighter.shiftForwards = (places = 1) => {
      fighter.placesFromFront -= places
      fighter.input.useHandCursor = fighter.placesFromFront > 0
    }

    let bar = { color: '#e2b100' }
    if (type === 'player') {
      bar = { color: '#48ad05' }
      fighter.inputEnabled = true
      fighter.events.onInputDown.add(() => pushPlayerToFront(fighter.placesFromFront))
    }
    fighter.healthBar = new HealthBar(game, {x: x - 4, y: y - 15, width: 50, height: 10, bar})
    // fighter.addChild(HealthBar(game, {x, y: y - 15, width: 60, height: 10}))

    fighter.combat = {
      attackTimer: 0,
      attackSpeed: 1.0,
      minHitDamage: 3,
      maxHitDamage: 6,
      critChance: 0.3,
      get hitDamage () {
        const randomDamage = Math.ceil(this.minHitDamage + (this.maxHitDamage - this.minHitDamage) * Math.random())
        if (Math.random() < this.critChance) {
          // we got a critical hit!
          return { value: Math.ceil(this.maxHitDamage * 1.5), critical: true }
        }
        return { value: randomDamage, critical: false }
      }
    }
    fighter.events.onKilled.add(() => fighter.healthBar.kill())

    return fighter
  }

  function create () {
    game.time.advancedTiming = true
    game.add.sprite(0, 0, 'background')
    playersStateText = game.add.text(0, 0, 'playersStateText')
    gameStatusText = game.add.text(game.world.right - 220, 0, 'gameStatusText')

    const UNIT_HEIGHT = 60

    const playerBaseX = game.world.centerX - (PERSON_WIDTH / 2 + COMBAT_DISTANCE / 2)
    players.sprites = players.sprites.map((fighterClass, index) => createFighter({
      type: 'player',
      fighterClass,
      x: playerBaseX - DISTANCE_BETWEEN_FIGHTERS * index,
      y: game.world.bottom - UNIT_HEIGHT,
      maxHealth: PLAYER_MAX_HEALTH,
      placesFromFront: index
    }))

    players.count = players.sprites.filter(player => player)

    const enemyBaseX = game.world.centerX + (PERSON_WIDTH / 2 + COMBAT_DISTANCE / 2)
    enemies.sprites = enemies.sprites.map((fighterClass, index) => createFighter({
      type: 'enemy',
      fighterClass,
      x: enemyBaseX + DISTANCE_BETWEEN_FIGHTERS * index,
      y: game.world.bottom - UNIT_HEIGHT,
      maxHealth: ENEMY_MAX_HEALTH,
      placesFromFront: index
    }))

    chest = game.add.sprite(game.world.right - 130, game.world.bottom - 95, 'chest_closed')
  }

  /* @PARAM {number} placesFromFront the number of places the unit clicked on is from the front of their team */
  function pushPlayerToFront (placesFromFront) {
    if (players.count === 1) {
      console.info('one player, no need to swap')
      return
    } else if (placesFromFront === 0) {
      console.info('already at front, no need to swap')
      return
    }
    const playerToPushIndex = players.sprites.findIndex(player => player.placesFromFront === placesFromFront)
    const playerToPush = players.sprites[playerToPushIndex]
    if (!playerToPush) {
      console.error('BIG PROBLEM - placesFromFront')
      return
    }

    players.state = 'swapping'

    const playerAtFront = players.getFirstAliveUnit()
    const playerAtFrontX = playerAtFront.x

    let playersToShift = players.getAllAliveUnits().filter(player => player.placesFromFront <= placesFromFront)
    playersToShift.sort((playerA, playerB) => {
      return playerB.placesFromFront - playerA.placesFromFront
    })

    playersToShift.reduce((previousPlayerX, player) => {
      const originalX = player.x
      player.x = previousPlayerX
      player.shiftBackwards()
      return originalX
    }, playersToShift[0].x)

    playerToPush.x = playerAtFrontX // move the player to the front
    playerToPush.shiftToFront() // move the player to the front
    // the player being pushed to the front needs to wait to attack
    // this prevents a player from spam swapping their heroes to attack with each as often as possible
    playerToPush.combat.attackTimer = playerAtFront.combat.attackTimer

    players.frontIndex = playerToPushIndex
  }

  function update () {
    const cursors = game.input.keyboard.createCursorKeys()
    playersStateText.text = players.state
    function forEachAlivePerson (type, execute) {
      let persons
      if (type === 'player') persons = players.sprites
      if (type === 'enemy') persons = enemies.sprites

      const alivePersons = persons.filter(person => person.alive)

      alivePersons.forEach((person, index) => {
        execute(person, index)
      })
    }

    function distanceBetweenBounds (body1, body2) {
      const distBetweenCenters = game.physics.arcade.distanceBetween(body1, body2)
      return distBetweenCenters - (Math.abs(body1.width) / 2) - (Math.abs(body2.width) / 2)
    }

    function attackPerson (attacker, victim) {
      // attack animation
      attacker.body.velocity.y = -150

      // damage the victim
      const damage = attacker.combat.hitDamage
      const damageValue = damage.value
      const damageString = damage.critical ? damageValue.toString() + '!' : damageValue.toString()
      victim.damage(damageValue)

      // render a hit splat
      const hitSplat = game.add.graphics()
      hitSplat.beginFill(0xba0c0c, 1)
      hitSplat.lineStyle(3, 0x6d0808, 0.8)
      const rect = {
        x: -20,
        y: 20,
        width: 36,
        height: 20
      }
      hitSplat.drawRect(rect.x, rect.y, rect.width, rect.height)
      const splatTextStyle = {
        fill: damage.critical ? 'white' : '#ddd',
        fontSize: damage.critical ? '24px' : '20px',
        boundsAlignH: 'center'
      }
      const hitText = game.make.text(-10, rect.y - 3, damageString, splatTextStyle)
      hitText.setTextBounds(-30, damage.critical ? 0 : 3, 80, 30)

      hitSplat.addChild(hitText)
      if (victim.info.type === 'player') {
        hitSplat.scale.x *= -1
      }
      victim.addChild(hitSplat)
      setTimeout(() => { hitSplat.destroy(true) }, (1000 / attacker.combat.attackSpeed) - 300)

      // update healthbar
      victim.healthBar.setPercent(victim.health / victim.maxHealth * 100)

      const fps = game.time.fps === 1 ? 60 : game.time.fps
      attacker.combat.attackTimer = fps / attacker.combat.attackSpeed
    }

    function movePersons (type) {
      let defaultXDirection
      if (type === 'player') {
        defaultXDirection = 1
      } else if (type === 'enemy') {
        defaultXDirection = -1
      } else {
        console.error('unregonised type', type, 'in movePersons')
        return
      }

      const executeOnPerson = person => {
        const xDirection = (typeof person.xDirection === 'number') ? person.xDirection : defaultXDirection
        person.body.velocity.x = PERSON_MOVEMENT_VELOCITY * xDirection
      }

      forEachAlivePerson(type, executeOnPerson)
    }

    function isOverlapping (spriteA, spriteB) {
      const boundsA = spriteA.getBounds()
      const boundsB = spriteB.getBounds()
      boundsA.width = boundsA.width + 35
      return Phaser.Rectangle.intersects(boundsA, boundsB)
    }

    function distanceToMiddle (sprite) {
      return Math.min(
        Math.abs(sprite.body.left - game.world.centerX),
        Math.abs(sprite.body.right - game.world.centerX)
      )
    }

    const firstPlayer = players.getFirstAliveUnit()
    const firstEnemy = enemies.getFirstAliveUnit()

    const updatePerson = person => {
      person.combat.attackTimer--
      person.body.velocity.x = 0
      person.healthBar.setPosition(person.x, person.y - 14)
    }

    if (firstPlayer) {
      forEachAlivePerson('player', updatePerson)
    } else {
      gameStatusText.text = 'all heroes dead'
      game.paused = true
      return
    }

    if (firstEnemy) {
      gameStatusText.text = '1+ enemies alive'
      forEachAlivePerson('enemy', updatePerson)

      if (distanceToMiddle(firstEnemy) > COMBAT_DISTANCE / 2) {
        gameStatusText.text = 'enemies walking'
        movePersons('enemy')
      }
      if (distanceToMiddle(firstPlayer) > COMBAT_DISTANCE / 2) {
        players.state = 'walking'
        movePersons('player')
      }

      if (distanceBetweenBounds(firstPlayer, firstEnemy) <= COMBAT_DISTANCE) {
        // players.sprites and enemies.sprites are close, so they attack
        // the first player and first enemy attack each other
        players.state = 'fighting'
        if (firstPlayer.combat.attackTimer <= 0) {
          attackPerson(firstPlayer, firstEnemy)
        }
        if (firstEnemy.combat.attackTimer <= 0) {
          attackPerson(firstEnemy, firstPlayer)
        }
      }
    } else {
      gameStatusText.text = 'no enemies'
      // no enemies, continue moving through the level
      if (Math.abs(firstPlayer.bottom - game.world.bottom) < 2) {
        // first player is on ground
        if (isOverlapping(firstPlayer, chest)) {
          chest.loadTexture('chest_open')
          chest.anchor.setTo(0.1, 0.3)

          gameStatusText.text = 'chest reached'
          game.paused = true
        } else {
          players.state = 'walking'
          movePersons('player')
        }
      }
    }

    // keyboard movement for testing purposes
    if (cursors.left.isDown) {
      //  Move to the left
      firstPlayer.body.velocity.x = -2 * PERSON_MOVEMENT_VELOCITY
    } else if (cursors.right.isDown) {
      //  Move to the right
      firstPlayer.body.velocity.x = 2 * PERSON_MOVEMENT_VELOCITY
    }
  }
}
