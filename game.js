/* global Phaser, HealthBar, _ */
/* eslint-disable comma-dangle */
// Phaser version 2.6.2 - "Kore Springs"
const COLORS = {
  player: {
    hitSplat: {
      knight: {
        fill: 0xba0c0c,
        stroke: 0x740606
      },
      archer: {
        fill: 0x0c0ccb,
        stroke: 0x0c0c94
      },
      default: {
        fillCritical: 0x111111,
        strokeCritical: 0x000000
      }
    }
  },
  enemy: {
    hitSplat: {
      knight: {
        fill: 0xba0c0c,
        stroke: 0x740606
      },
      archer: {
        fill: 0x0c0ccb,
        stroke: 0x0c0c94
      },
      default: {
        fillCritical: 0x111111,
        strokeCritical: 0x000000
      }
    }
  }
}

window.onload = function () {
  const MIN_TWITCH_WIDTH = 644
  const GAME_WIDTH = MIN_TWITCH_WIDTH
  const GAME_HEIGHT = 125

  const HERO_MOVEMENT_VELOCITY = 80
  const HERO_WIDTH = 60
  const HERO_HEIGHT = 60

  /* HEALTH */
  const PLAYER_MAX_HEALTH = 100
  const ENEMY_MAX_HEALTH = 25

  const DISTANCE_BETWEEN_HEROES = HERO_WIDTH + 12
  const COMBAT_DISTANCE = 28
  const ENEMY_BASE_X = GAME_WIDTH / 2 + (HERO_WIDTH / 2 + COMBAT_DISTANCE / 2)

  const game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, '', {
    preload,
    create,
    update,
    render
  })

  let chest,
    projectiles,
    lineCameraMiddle,
    background
  let zone = 0

  const getAllAliveUnits = function () {
    return _.filter(this.sprites, sprite => sprite.alive)
  }

  const getFirstAliveUnit = function () {
    const aliveSprites = this.getAllAliveUnits()
    const frontAliveSprite = aliveSprites.reduce((mostFrontSprite, sprite) => {
      if (sprite.placesFromFront < mostFrontSprite.placesFromFront) {
        return sprite
      }
      return mostFrontSprite
    }, aliveSprites[0])
    return frontAliveSprite
  }

  const onHeroKilled = function () {
    if (this.getAllAliveUnits().length === 0) {
      // expand world to include another zone
      zone++
      console.info('zone', zone)
      const extraDistanceToNextFight = (5 / 7) * GAME_WIDTH // on top walking to the edge of the current zone
      game.world.resize(game.world.width + extraDistanceToNextFight, game.world.height)
    }
  }

  let players = {
    sprites: [
      'knight',
      'archer',
      'archer',
    ],
    frontIndex: 0, // index of the player at the front, ready to attack
    state: 'idle', // 'idle', walking', 'fighting', swapping'
    getAllAliveUnits,
    getFirstAliveUnit,
    onHeroKilled
  }

  let enemies = {
    sprites: [
      'knight',
    ],
    frontIndex: 0, // index of the player at the front, ready to attack
    state: 'idle', // 'idle', walking', 'fighting', swapping'
    getAllAliveUnits,
    getFirstAliveUnit,
    onHeroKilled
  }

  function preload () {
    game.load.image('background_demo', 'images/background1.png')
    game.load.image('background_1', 'images/backgrounds/grass.gif')

    game.load.image('knight_orange', 'images/characters/knight_orange_60x57.png')
    game.load.image('knight_blue', 'images/characters/knight_blue_60x57.png')
    game.load.image('archer_blue', 'images/characters/archer_blue_60x60.png')
    game.load.image('archer_orange', 'images/characters/archer_orange_60x60.png')

    game.load.image('arrow', 'images/particles/arrow.png')

    game.load.image('chest_closed', 'images/chest_closed.png')
    game.load.image('chest_open', 'images/chest_open.png')
    game.load.image('chest_closed', 'images/chest_closed.png')
  }

  function createFighter (teamObject, {team, fighterClass, x, y, combatLevel = 0, maxHealth, placesFromFront, onKilled}) {
    // numFromFront is the number
    let fighter
    let spriteSuffix
    let xDirection
    let flipHorizontally = false

    if (team === 'player') {
      spriteSuffix = '_blue'
      xDirection = 1
      flipHorizontally = true
    } else if (team === 'enemy') {
      spriteSuffix = '_orange'
      xDirection = -1
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
      team,
      fighterClass,
      xDirection
    }

    fighter.anchor.setTo(0.5, 0)
    fighter.inputEnabled = true
    fighter.input.useHandCursor = placesFromFront > 0

    // Physics
    game.physics.arcade.enable(fighter)
    fighter.body.collideWorldBounds = true
    fighter.body.gravity.y = 700

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

    const extraHealthPerLevel = 3

    fighter.maxHealth = maxHealth + (extraHealthPerLevel * combatLevel)
    fighter.health = fighter.maxHealth
    console.info('hp', fighter.health)

    let bar = { color: '#e2b100' }
    if (team === 'player') {
      bar = { color: '#48ad05' }
      fighter.inputEnabled = true
      fighter.events.onInputDown.add(() => pushPlayerToFront(fighter.placesFromFront))
    }
    fighter.healthBar = new HealthBar(game, {x: x - 4, y: y - 15, width: 50, height: 10, bar})

    const baseStats = {
      attackTimer: 0,
      level: combatLevel,
      range: (fighterClass === 'archer') ? 1 : 0,
      attackSpeed: 1.0,
      minHitDamage: 3,
      maxHitDamage: 6,
      critChance: 0.3,
      hitDamage
    }

    const extraPerLevel = {
      attackSpeed: 0.2,
      minHitDamage: 0.7,
      maxHitDamage: 0.7,
      critChance: 0.01,
    }

    const increasedStats = _.mapValues(extraPerLevel, (statValue, stat) => baseStats[stat] + statValue * combatLevel)

    function hitDamage () {
      if (Math.random() < increasedStats.critChance) {
        // we got a critical hit!
        return { value: Math.ceil(increasedStats.maxHitDamage * 1.5), critical: true }
      }
      const randomDamage = Math.ceil(increasedStats.minHitDamage + (increasedStats.maxHitDamage - increasedStats.minHitDamage) * Math.random())
      return { value: randomDamage, critical: false }
    }

    const newCombatStats = _.assign({}, baseStats, increasedStats)
    fighter.combat = newCombatStats
    fighter.events.onKilled.add(() => fighter.healthBar.kill())
    fighter.events.onKilled.add(onKilled.bind(teamObject))

    return fighter
  }

  function create () {
    game.physics.startSystem(Phaser.Physics.ARCADE)
    game.time.advancedTiming = true // so we can read fps to calculate attack delays in seconds
    background = game.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'background_1')

    // draw middle lines for testing
    lineCameraMiddle = new Phaser.Line(0, 0, 0, GAME_HEIGHT)

    const playerBaseX = game.world.centerX - (HERO_WIDTH / 2 + COMBAT_DISTANCE / 2)
    players.sprites = players.sprites.map((fighterClass, index) => createFighter(players, {
      team: 'player',
      fighterClass,
      x: playerBaseX - DISTANCE_BETWEEN_HEROES * index,
      y: game.world.height - HERO_HEIGHT,
      maxHealth: PLAYER_MAX_HEALTH,
      placesFromFront: index,
      onKilled: players.onHeroKilled,
      combatLevel: 2
    }))

    enemies.sprites = enemies.sprites.map((fighterClass, index) => createFighter(enemies, {
      team: 'enemy',
      fighterClass,
      x: ENEMY_BASE_X + DISTANCE_BETWEEN_HEROES * index,
      y: game.world.height - HERO_HEIGHT,
      maxHealth: ENEMY_MAX_HEALTH,
      placesFromFront: index,
      onKilled: enemies.onHeroKilled
    }))

    projectiles = game.add.group()
    projectiles.enableBody = true
    projectiles.physicsBodyType = Phaser.Physics.ARCADE

    projectiles.createMultiple(50, 'arrow')
    projectiles.setAll('checkWorldBounds', true)
    projectiles.setAll('scale.x', 0.5)
    projectiles.setAll('scale.y', 0.5)
    projectiles.setAll('scale.y', 0.5)
    projectiles.setAll('angle', -44)
    projectiles.setAll('anchor.x', 1)
    projectiles.setAll('anchor.y', 1)
    projectiles.setAll('outOfBoundsKill', true)

    // chest = game.add.sprite(game.world.width - 80, game.world.height - 60, 'chest_closed')
    // chest.scale.setTo(0.8, 0.65)
  }

  function getCameraCenterX () {
    return game.camera.width / 2 + game.camera.x
  }

  /* @PARAM {number} placesFromFront the number of places the unit clicked on is from the front of their team */
  function pushPlayerToFront (placesFromFront) {
    if (players.sprites.length === 1) {
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

  function spawnEnemy (placesFromFront = 0, combatLevel = 0, fighterClass = 'knight') {
    const x = getCameraCenterX() + (HERO_WIDTH / 2) + (COMBAT_DISTANCE / 2) + 1
    const spawnX = x + DISTANCE_BETWEEN_HEROES * placesFromFront
    console.info('spawning at X', spawnX)
    enemies.sprites.push(createFighter(enemies, {
      team: 'enemy',
      combatLevel,
      fighterClass,
      x: x + DISTANCE_BETWEEN_HEROES * placesFromFront,
      y: game.world.height - HERO_HEIGHT,
      maxHealth: ENEMY_MAX_HEALTH,
      placesFromFront,
      onKilled: enemies.onHeroKilled
    }))
  }
  window.spawn = function () {
    spawnEnemy(...arguments)
  }
  function update () {
    background.width = game.world.width
    // debugging
    lineCameraMiddle.centerOn(getCameraCenterX(), game.world.height / 2)
    const cursors = game.input.keyboard.createCursorKeys()

    const distanceToNextFight = game.world.width - (game.camera.x + game.camera.width)
    const firstPlayer = players.getFirstAliveUnit()
    const firstEnemy = enemies.getFirstAliveUnit()

    game.physics.arcade.overlap(enemies.sprites, projectiles, projectileHitsHero, null, this)
    game.physics.arcade.overlap(players.sprites, projectiles, projectileHitsHero, null, this)

    function forEachAliveHero (heroType, execute, frontToBack = false) {
      let heroes
      if (heroType instanceof Array) {
        heroes = heroType
      } else if (heroType === 'player') {
        heroes = players.sprites
      } else if (heroType === 'enemy') {
        heroes = enemies.sprites
      }

      const aliveHeroes = heroes.filter(hero => hero.alive)
      aliveHeroes.sort((playerA, playerB) => {
        return playerB.placesFromFront - playerA.placesFromFront
      })

      if (frontToBack) {
        aliveHeroes.reverse()
      }
      aliveHeroes.forEach((hero, index) => {
        execute(hero, index)
      })
    }

    function distanceBetweenBounds (body1, body2) {
      const distBetweenCenters = game.physics.arcade.distanceBetween(body1, body2)
      return Math.floor(distBetweenCenters - (Math.abs(body1.width) / 2) - (Math.abs(body2.width) / 2))
    }

    function projectileHitsHero (victim, projectile) {
      if (projectile.info.team !== victim.info.team) {
        // projectile hit a hero and it is not friendly fire
        // if (vic)
        if (Math.abs(projectile.body.overlapX) > 30) {
          dealDamage(projectile.shooter, victim)
          projectile.kill()
        }
      }
    }

    function shoot (shooter, xDirection, projectileType = 'arrow') {
      // if (shooter.info.type !== 'enemy') return
      // console.info(shooter.info.type, shooter.info.fighterClass, 'shoots', projectile, xDirection)
      const projectile = projectiles.getFirstDead()
      let projectileX = shooter.x + 18 * xDirection
      projectile.angle += 180
      if (xDirection < 0) {
        projectile.angle -= 180
        projectileX -= projectile.width
      }
      projectile.reset(projectileX, shooter.y + 22)
      projectile.body.velocity.x = 460 * xDirection
      projectile.body.gravity.y = 230
      projectile.body.acceleration.x = -140 * xDirection
      projectile.shooter = shooter
      projectile.info = {
        team: shooter.info.team,
        projectileType: projectileType
      }
    }

    function attackHero (attacker, victim) {
      switch (attacker.info.fighterClass) {
        case 'knight':
          // attack animation
          attacker.body.velocity.y = -120
          dealDamage(attacker, victim)
          break
        case 'archer':
          attacker.body.velocity.y = -180
          shoot(attacker, attacker.info.xDirection)
          break
      }
      // damage the victim

      // delay until next attack
      const fps = game.time.fps === 1 ? 60 : game.time.fps
      attacker.combat.attackTimer = fps / attacker.combat.attackSpeed
    }

    function dealDamage (attacker, victim) {
      const damage = attacker.combat.hitDamage()
      const damageValue = damage.value
      const damageString = damage.critical ? damageValue.toString() + '!' : damageValue.toString()
      victim.damage(damageValue)

      // render a hit splat
      const hitSplat = game.add.graphics()

      const splatColors = COLORS[attacker.info.team].hitSplat[attacker.info.fighterClass]
      const defaultSplatColors = COLORS[attacker.info.team].hitSplat.default
      const fillColor = damage.critical ? defaultSplatColors.fillCritical : splatColors.fill
      const lineColor = damage.critical ? defaultSplatColors.strokeCritical : splatColors.stroke
      hitSplat.beginFill(fillColor, 1)
      hitSplat.lineStyle(3, lineColor, 1)

      const rect = {
        x: -20,
        y: damage.critical ? 21 : 20,
        width: 36,
        height: 20
      }
      hitSplat.drawRect(rect.x, rect.y, rect.width, rect.height)

      const splatTextStyle = {
        fill: 'white',
        fontSize: damage.critical ? '24px' : '20px',
        boundsAlignH: 'center'
      }
      const hitText = game.make.text(-10, rect.y - 3, damageString, splatTextStyle)
      hitText.setTextBounds(-30, damage.critical ? 0 : 3, 80, 30)

      hitSplat.addChild(hitText)
      if (victim.info.team === 'player') {
        hitSplat.scale.x *= -1
      }
      victim.addChild(hitSplat)
      setTimeout(() => { hitSplat.destroy(true) }, (1000 / attacker.combat.attackSpeed) - 300)

      // update healthbar
      victim.healthBar.setPercent(victim.health / victim.maxHealth * 100)
    }

    function walkAll (team) {
      let defaultXDirection
      if (team === 'player') {
        defaultXDirection = 1
      } else if (team === 'enemy') {
        defaultXDirection = -1
      } else {
        console.error('unregonised team', team, 'in walkAll')
        return
      }

      const executeOnHero = hero => {
        const xDirection = (typeof hero.xDirection === 'number') ? hero.xDirection : defaultXDirection
        hero.body.velocity.x = HERO_MOVEMENT_VELOCITY * xDirection
      }

      forEachAliveHero(team, executeOnHero)
    }

    function distanceToMiddle (sprite) {
      return Math.min(
        Math.abs(sprite.body.left - getCameraCenterX()),
        Math.abs(sprite.body.right - getCameraCenterX())
      )
    }

    const updateHero = (hero, index) => {
      hero.combat.attackTimer--
      hero.body.velocity.x = 0
      hero.healthBar.setPosition(hero.x, hero.y - 14)
      hero.placesFromFront = index
    }


    if (firstPlayer) {
      forEachAliveHero(players.sprites, updateHero, true)
    } else {
      // game over
      players.state = 'dead'
      // game.paused = true
      return
    }

    if (firstEnemy) {
      forEachAliveHero('enemy', updateHero, true)

      if (distanceBetweenBounds(firstPlayer, firstEnemy) <= COMBAT_DISTANCE) {
        // heroes are in combat range
        players.state = 'fighting'
        enemies.state = 'fighting'
        // all heroes attack if they are in range
        forEachAliveHero('player', (hero, index) => {
          if (hero.placesFromFront <= hero.combat.range) {
            // this hero can attack from a distance
            if (hero.combat.attackTimer <= 0) {
              attackHero(hero, firstEnemy)
            }
          }
        }, true)
        forEachAliveHero('enemy', (hero, index) => {
          if (hero.placesFromFront <= hero.combat.range) {
            // this hero is in range to attack
            if (hero.combat.attackTimer <= 0) {
              attackHero(hero, firstPlayer)
            }
          }
        }, true)
      } else {
        players.state = 'waiting for enemy'
        enemies.state = 'waiting for enemy'
      }

      if (distanceToMiddle(firstEnemy) > COMBAT_DISTANCE / 2) {
        enemies.state = 'walking to fight'
        walkAll('enemy')
      }
      if (distanceToMiddle(firstPlayer) > COMBAT_DISTANCE / 2) {
        players.state = 'walking to fight'
        walkAll('player')
      }
    } else {
      enemies.state = 'dead'
      // no enemies, continue moving through the level
      if (Math.abs(firstPlayer.bottom - game.world.height) < 2) {
        // first player is on ground
        players.state = 'walking'

/*        const isOverlapping = (spriteA, spriteB) => {
          const boundsA = spriteA.getBounds()
          const boundsB = spriteB.getBounds()
          boundsA.width = boundsA.width + 35
          return Phaser.Rectangle.intersects(boundsA, boundsB)
        }
        if (isOverlapping(firstPlayer, chest)) {
          chest.loadTexture('chest_open')
          chest.anchor.setTo(0.1, 0.3)
          firstPlayer.moveUp()

          enemies.state = '$ $ $ $ $ $'
          // game.paused = true
        } else {
          // players.state = 'walking'
        }*/
      }
    }

    switch (players.state) {
      case 'walking':
        walkAll('player')
        // focus camera on front player
        game.camera.focusOnXY(firstPlayer.x + (COMBAT_DISTANCE / 2 + HERO_WIDTH / 2), firstPlayer.y + 0)
        break
    }

    switch (enemies.state) {
      case 'dead':
        if (distanceToNextFight === 0) {
          spawnEnemy(0, zone)
          spawnEnemy(1, zone)
          spawnEnemy(2, zone)
        }
    }

    // keyboard movement for testing purposes
    if (cursors.left.isDown) {
      //  Move to the left
      firstPlayer.body.velocity.x = -2 * HERO_MOVEMENT_VELOCITY
    } else if (cursors.right.isDown) {
      //  Move to the right
      firstPlayer.body.velocity.x = 2 * HERO_MOVEMENT_VELOCITY
    }
  }

  function render () {
    game.debug.geom(lineCameraMiddle, 'red')
    game.debug.text(players.state, 5, 20, 'blue')
    game.debug.text(enemies.state, game.camera.width - 180, 20, 'orange')
  }
}

