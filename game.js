/* global Phaser, HealthBar */
// Phaser version 2.6.2 - "Kore Springs"
window.onload = function () {
  const TwitchWidth = 847
  const gameWidth = TwitchWidth
  const gameHeight = 220

  const PERSON_MOVEMENT_VELOCITY = 60
  const PERSON_WIDTH = 61
  const PLAYER_MAX_HEALTH = 45
  const ENEMY_MAX_HEALTH = 17

  const game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update
  })

  let players = {
    1: {},
    2: {},
    3: {}
  }

  let enemies = {
    1: {},
    2: {},
    3: {}
  }

  function preload () {
    game.load.image('person', 'images/stickman_small.png')
    game.load.image('background', 'images/background1.png')
  }

  function createFighter (type, x, y, maxHealth) {
    const fighter = game.add.sprite(x, y, 'person')
    fighter.anchor.setTo(0.5, 0)

    game.physics.arcade.enable(fighter)
    fighter.body.collideWorldBounds = true
    fighter.body.gravity.y = 700
    fighter.maxHealth = maxHealth || ENEMY_MAX_HEALTH
    fighter.health = fighter.maxHealth

    let bar = {
      color: '#ad4805'
    }
    if (type === 'player') {
      bar = {
        color: '#48ad05'
      }
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

  function create () {
    game.time.advancedTiming = true
    game.add.sprite(0, 0, 'background')

    const distBetweenFighters = 15
    players[1] = createFighter('player', game.world.centerX - game.width / 6, game.world.centerY, PLAYER_MAX_HEALTH)
    players[2] = createFighter('player', game.world.centerX - game.width / 6 - (PERSON_WIDTH + distBetweenFighters), game.world.centerY, PLAYER_MAX_HEALTH)
    players[3] = createFighter('player', game.world.centerX - game.width / 6 - 2 * (PERSON_WIDTH + distBetweenFighters), game.world.centerY, PLAYER_MAX_HEALTH)

    enemies[1] = createFighter('enemy', game.world.centerX + game.width / 8, game.world.centerY)
    enemies[2] = createFighter('enemy', game.world.centerX + game.width / 8 + PERSON_WIDTH + distBetweenFighters, game.world.centerY)
    enemies[3] = createFighter('enemy', game.world.centerX + game.width / 8 + 2 * (PERSON_WIDTH + distBetweenFighters), game.world.centerY)
  }

  function update () {
    const cursors = game.input.keyboard.createCursorKeys()

    function forEachPerson (type, execute) {
      let persons
      if (type === 'player') persons = players
      if (type === 'enemy') persons = enemies

      const aliveArray = [
        persons[1].alive,
        persons[2].alive,
        persons[3].alive
      ]

      aliveArray.forEach((isAlive, index) => {
        if (isAlive) {
          const adjustedIndex = index + 1
          execute(persons[adjustedIndex], adjustedIndex)
        }
      })
    }

    function getFrontPerson (type) {
      let persons
      if (type === 'player') persons = players
      if (type === 'enemy') persons = enemies
      const aliveArray = [
        persons[1].alive,
        persons[2].alive,
        persons[3].alive
      ]
      return persons[aliveArray.findIndex(alive => alive) + 1]
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
      }
      if (type === 'enemy') {
        xDirection = -1
      }

      const executeOnPerson = person => {
        person.body.velocity.x = PERSON_MOVEMENT_VELOCITY * xDirection
      }

      forEachPerson(type, executeOnPerson)
    }

    const firstPlayer = getFrontPerson('player')
    const firstEnemy = getFrontPerson('enemy')
    //  Reset the players velocity (movement)

    if (!firstPlayer) {
      console.info('you lose')
      game.paused = true
    } else if (firstEnemy) {
      forEachPerson('player', player => {
        player.combat.attackTimer--
        player.body.velocity.x = 0
        player.healthBar.setPosition(player.x + 4, player.y - 14)
      })

      forEachPerson('enemy', enemy => {
        enemy.combat.attackTimer--
        enemy.body.velocity.x = 0
        enemy.healthBar.setPosition(enemy.x + 4, enemy.y - 14)
      })

      if (distanceBetweenBounds(firstPlayer, firstEnemy) > 22) {
        movePersons('player')
        movePersons('enemy')
      } else {
        // the first player and first enemy attack each other
        if (firstPlayer.combat.attackTimer <= 0) {
          attackPerson(firstPlayer, firstEnemy)
        }
        if (firstEnemy.combat.attackTimer <= 0) {
          attackPerson(firstEnemy, firstPlayer)
        }
      }
    } else {
      // no enemies are alive
      console.info('you win')
      setTimeout(() => {
        game.paused = true
      }, 600)
    }

    if (cursors.left.isDown) {
      //  Move to the left
      firstPlayer.body.velocity.x = -2 * PERSON_MOVEMENT_VELOCITY
    } else if (cursors.right.isDown) {
      //  Move to the right
      firstPlayer.body.velocity.x = 2 * PERSON_MOVEMENT_VELOCITY
    }
  }
}
