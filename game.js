/* global Phaser, HealthBar */
// Phaser version 2.6.2 - "Kore Springs"
window.onload = function () {
  const TwitchWidth = 847
  const gameWidth = TwitchWidth
  const gameHeight = 220

  const PERSON_MOVEMENT_VELOCITY = 80
  const PERSON_WIDTH = 61
  const PLAYER_MAX_HEALTH = 45
  const ENEMY_MAX_HEALTH = 1 // 17
  const COMBAT_DISTANCE = 28

  const game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update
  })

  let players = []

  let enemies = {
    1: {},
    2: {},
    3: {}
  }

  let chest

  function preload () {
    game.load.image('background', 'images/background1.png')
    game.load.image('person', 'images/stickman_small.png')
    game.load.image('chest_closed', 'images/chest_closed.png')
    game.load.image('chest_open', 'images/chest_open.png')
    game.load.image('chest_closed', 'images/chest_closed.png')
  }

  function createFighter (type, x, y, maxHealth) {
    const fighter = game.add.sprite(x, y, 'person')
    fighter.anchor.setTo(0.5, 0)

    game.physics.arcade.enable(fighter)
    fighter.body.collideWorldBounds = true
    fighter.body.gravity.y = 700
    fighter.maxHealth = maxHealth || ENEMY_MAX_HEALTH
    fighter.health = fighter.maxHealth

    let bar = { color: '#ad4805' }
    if (type === 'player') {
      bar = { color: '#48ad05' }
      fighter.inputEnabled = true
      fighter.events.onInputDown.add(pushPlayerToFront)
    }
    fighter.healthBar = new HealthBar(game, {x, y: y - 15, width: 60, height: 10, bar})
    // fighter.addChild(HealthBar(game, {x, y: y - 15, width: 60, height: 10}))

    fighter.combat = {
      attackSpeed: 1.5,
      attackDamage: 6,
      attackTimer: 0
    }
    fighter.events.onKilled.add(() => fighter.healthBar.kill(), game)

    return fighter
  }

  function pushPlayerToFront (player) {
    console.info('Moving player to the front', player)
    // move player backwards
    player.movementDirection = 1 // move forwards to the front
    // playersToLeft.movementDirection = 0 // stay still
    // playersToRight.movementDirection = -1 // move backwards to make space

    // add handling in the update loop, to use movementDirection
    // remember to set movementDirection to null, once the player is in position
  }

  function create () {
    game.time.advancedTiming = true
    game.add.sprite(0, 0, 'background')

    const distBetweenFighters = 15
    players[0] = createFighter('player', game.world.centerX - game.width / 6, game.world.centerY, PLAYER_MAX_HEALTH)
    players[1] = createFighter('player', game.world.centerX - game.width / 6 - (PERSON_WIDTH + distBetweenFighters), game.world.centerY, PLAYER_MAX_HEALTH)
    players[2] = createFighter('player', game.world.centerX - game.width / 6 - 2 * (PERSON_WIDTH + distBetweenFighters), game.world.centerY, PLAYER_MAX_HEALTH)

    enemies[0] = createFighter('enemy', game.world.centerX + COMBAT_DISTANCE, game.world.centerY)
    enemies[1] = createFighter('enemy', game.world.centerX + COMBAT_DISTANCE + PERSON_WIDTH + distBetweenFighters, game.world.centerY)
    enemies[2] = createFighter('enemy', game.world.centerX + COMBAT_DISTANCE + 2 * (PERSON_WIDTH + distBetweenFighters), game.world.centerY)

    chest = game.add.sprite(game.world.right - 130, game.world.bottom - 95, 'chest_closed')
  }

  function update () {
    const cursors = game.input.keyboard.createCursorKeys()

    function forEachPerson (type, execute) {
      let persons
      if (type === 'player') persons = players
      if (type === 'enemy') persons = enemies

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

    function getFrontPerson (type) {
      let persons
      if (type === 'player') persons = players
      if (type === 'enemy') persons = enemies
      const aliveArray = [
        persons[0].alive,
        persons[1].alive,
        persons[2].alive
      ]
      return persons[aliveArray.findIndex(alive => alive)]
    }

    function distanceBetweenBounds (body1, body2) {
      const distBetweenCenters = game.physics.arcade.distanceBetween(body1, body2)
      return distBetweenCenters - (body1.width / 2) - (body2.width / 2)
    }

    function attackPerson (attacker, victim) {
      attacker.body.velocity.y = -150
      victim.damage(attacker.combat.attackDamage)
      // update healthbar
      victim.healthBar.setPercent(victim.health / victim.maxHealth * 100)

      const fps = game.time.fps === 1 ? 60 : game.time.fps
      attacker.combat.attackTimer = fps / attacker.combat.attackSpeed
    }

    function movePersons (type) {
      let xDirection
      if (type === 'player') {
        xDirection = 1
      } else if (type === 'enemy') {
        xDirection = -1
      } else {
        console.error('unregonised type', type, 'in movePersons')
        return
      }

      const executeOnPerson = person => {
        person.body.velocity.x = PERSON_MOVEMENT_VELOCITY * xDirection
      }

      forEachPerson(type, executeOnPerson)
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

    const firstPlayer = getFrontPerson('player')
    const firstEnemy = getFrontPerson('enemy')

    if (firstPlayer) {
      forEachPerson('player', player => {
        player.combat.attackTimer--
        player.body.velocity.x = 0
        player.healthBar.setPosition(player.x + 4, player.y - 14)
      })
    } else {
      console.info('you lose')
      game.paused = true
    }

    if (firstEnemy) {
      forEachPerson('enemy', enemy => {
        enemy.combat.attackTimer--
        enemy.body.velocity.x = 0
        enemy.healthBar.setPosition(enemy.x + 4, enemy.y - 14)
      })

      if (distanceToMiddle(firstEnemy) > COMBAT_DISTANCE / 2) {
        movePersons('enemy')
      }
      if (distanceToMiddle(firstPlayer) > COMBAT_DISTANCE / 2) {
        movePersons('player')
      }

      if (distanceBetweenBounds(firstPlayer, firstEnemy) <= COMBAT_DISTANCE) {
        // players and enemies are close, so they attack
        // the first player and first enemy attack each other
        if (firstPlayer.combat.attackTimer <= 0) {
          attackPerson(firstPlayer, firstEnemy)
        }
        if (firstEnemy.combat.attackTimer <= 0) {
          attackPerson(firstEnemy, firstPlayer)
        }
      }
    } else {
      // no enemies, continue moving through the level
      if (Math.abs(firstPlayer.bottom - game.world.bottom) < 2) {
        if (isOverlapping(firstPlayer, chest)) {
          chest.loadTexture('chest_open')
          chest.anchor.setTo(0.1, 0.3)

          console.info('you win')
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
