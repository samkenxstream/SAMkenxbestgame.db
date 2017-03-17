/* global Phaser, HealthBar */
// Phaser version 2.6.2 - "Kore Springs"
window.onload = function () {
  const TwitchWidth = 847
  const gameWidth = TwitchWidth
  const gameHeight = 220

  const PERSON_MOVEMENT_VELOCITY = 80
  const PERSON_WIDTH = 61
  const PLAYER_MAX_HEALTH = 36
  const ENEMY_MAX_HEALTH = 22 // 17
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
    sprites: [],
    frontIndex: 0, // index of the player at the front, ready to attack
    state: 'idle', // 'idle', walking', 'fighting', swapping'
    count: 0,
    getAllAliveUnits,
    getFirstAliveUnit
  }

  let enemies = {
    sprites: [],
    frontIndex: 0, // index of the player at the front, ready to attack
    getAllAliveUnits,
    getFirstAliveUnit
  }

  let chest,
    playersStateText,
    gameStatusText

  function preload () {
    game.load.image('background', 'images/background1.png')
    game.load.image('person', 'images/stickman_small.png')
    game.load.image('chest_closed', 'images/chest_closed.png')
    game.load.image('chest_open', 'images/chest_open.png')
    game.load.image('chest_closed', 'images/chest_closed.png')
  }

  function createFighter (type, x, y, maxHealth, placesFromFront) {
    // numFromFront is the number
    const fighter = game.add.sprite(x, y, 'person')
    fighter.anchor.setTo(0.5, 0)

    game.physics.arcade.enable(fighter)
    fighter.body.collideWorldBounds = true
    fighter.body.gravity.y = 700
    fighter.maxHealth = maxHealth
    fighter.health = fighter.maxHealth

    fighter.placesFromFront = placesFromFront

    let bar = { color: '#ad4805' }
    if (type === 'player') {
      bar = { color: '#48ad05' }
      fighter.inputEnabled = true
      fighter.events.onInputDown.add(() => pushPlayerToFront(fighter.placesFromFront))
    }
    fighter.healthBar = new HealthBar(game, {x, y: y - 15, width: 60, height: 10, bar})
    // fighter.addChild(HealthBar(game, {x, y: y - 15, width: 60, height: 10}))

    fighter.combat = {
      attackSpeed: 1.0,
      minHitDamage: 5,
      averageHitDamage: 6,
      maxHitDamage: 10,
      attackTimer: 0,
      get hitDamage () {
        return Math.ceil(this.minHitDamage + (this.maxHitDamage - this.minHitDamage) * Math.random())
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

    const distBetweenFighters = 15
    players.sprites[0] = createFighter('player', game.world.centerX - game.width / 6, game.world.centerY, PLAYER_MAX_HEALTH, 0)
    players.sprites[1] = createFighter('player', game.world.centerX - game.width / 6 - (PERSON_WIDTH + distBetweenFighters), game.world.centerY, PLAYER_MAX_HEALTH, 1)
    players.sprites[2] = createFighter('player', game.world.centerX - game.width / 6 - 2 * (PERSON_WIDTH + distBetweenFighters), game.world.centerY, PLAYER_MAX_HEALTH, 2)
    players.count = 3

    enemies.sprites[0] = createFighter('enemy', game.world.centerX + COMBAT_DISTANCE, game.world.centerY, ENEMY_MAX_HEALTH, 0)
    enemies.sprites[1] = createFighter('enemy', game.world.centerX + COMBAT_DISTANCE + PERSON_WIDTH + distBetweenFighters, game.world.centerY, ENEMY_MAX_HEALTH, 1)
    enemies.sprites[2] = createFighter('enemy', game.world.centerX + COMBAT_DISTANCE + 2 * (PERSON_WIDTH + distBetweenFighters), game.world.centerY, ENEMY_MAX_HEALTH, 2)

    chest = game.add.sprite(game.world.right - 130, game.world.bottom - 95, 'chest_closed')
  }

  /* @PARAM {number} placesFromFront the number of places the unit clicked on is from the front of their team */
  function pushPlayerToFront (placesFromFront) {
    console.info('player at posi', placesFromFront)
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
      player.placesFromFront++
      return originalX
    }, playersToShift[0].x)

    playerToPush.x = playerAtFrontX // move the player to the front
    playerToPush.placesFromFront = 0 // move the player to the front
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

      const aliveArray = [
        persons[0].alive,
        persons[1].alive,
        persons[2].alive
      ]

      aliveArray.forEach((isAlive, index) => {
        if (isAlive) {
          execute(persons[index], index)
        }
      })
    }

    function distanceBetweenBounds (body1, body2) {
      const distBetweenCenters = game.physics.arcade.distanceBetween(body1, body2)
      return distBetweenCenters - (body1.width / 2) - (body2.width / 2)
    }

    function attackPerson (attacker, victim) {
      // attack animation
      attacker.body.velocity.y = -150

      // damage the victim
      const damage = attacker.combat.hitDamage
      victim.damage(damage)

      // render a hit splat
      const hitSplat = game.add.graphics()
      hitSplat.beginFill(0xba0c0c, 1)
      hitSplat.lineStyle(3, 0x6d0808, 0.8)
      const rect = {
        x: -26,
        y: 44,
        width: 50,
        height: 28
      }
      hitSplat.drawRect(rect.x, rect.y, rect.width, rect.height)
      const splatTextStyle = {
        fill: 'white',
        fontSize: '30px',
        boundsAlignH: 'center'
      }
      const hitText = game.make.text(-10, 41, damage.toString(), splatTextStyle)
      hitText.setTextBounds(-30, 0, 80, 30)

      hitSplat.addChild(hitText)
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
      person.healthBar.setPosition(person.x + 3, person.y - 14)
    }

    if (firstPlayer) {
      forEachAlivePerson('player', updatePerson)
    } else {
      gameStatusText.text = 'all heroes dead'
      game.paused = true
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
