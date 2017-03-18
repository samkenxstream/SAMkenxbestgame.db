(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
  "teams": {
    "player": "player",
    "enemy": "enemy"
  },
  "classes": {
    "default": {
      "maxHealth": 45,
      "combat": {
        "range": 0,
        "attackSpeed": 0.5,
        "minHitDamage": 3,
        "maxHitDamage": 6,
        "critChance": 0.15,
      },
      "combatPerLevel": {
        "attackSpeed": 0.13,
        "minHitDamage": 0.5,
        "maxHitDamage": 0.5,
        "critChance": 0.01,
      },
      "extraPerLevel": {
        "health": 4.7
      }
    },
    "warrior": {
      "key": "warrior",
      "combat": {
        "range": 0
      }
    },
    "archer": {
      "key": "archer",
      "combat": {
        "range": 2,
        "attackSpeed": 0.42
      },
      "combatPerLevel": {
        "attackSpeed": 0.11
      }
    },
    "mage": {
      "key": "mage",
      "maxHealth": 24,
      "gravityModifier": 0.3,
      "combat": {
        "range": 1,
        "attackSpeed": (0.5 / 2.4),
        "critChance": 0.1
      }
    },
    "priest": {
      "key": "priest",
      "maxHealth": 32,
      "combat": {
        "range": 0,
        "attackSpeed": 0.75,
        "minHitDamage": 4,
        "maxHitDamage": 6,
        "critChance": 0
      },
      "combatPerLevel": {
        "attackSpeed": 0.05,
        "minHitDamage": 0.2,
        "maxHitDamage": 0.2,
        "critChance": 0
      },
      "abilities": {
        "passive": {
          "name": "heal_team",
          "value": 4,
          "cooldown": 520,
          "timer": 520
        }
      },
      "abilitiesPerLevel": {
        "passive": {
          "value": 1
        }
      }
    }
  },
  "projectiles": {
    "arrow": {
      "key": "arrow"
    },
    "fireball": {
      "key": "fireball",
      "scale": 0.4
    }
  },
  "colors": {
    "hitSplat": {
      "warrior": {
        "fill": 0xba0c0c,
        "stroke": 0x740606
      },
      "archer": {
        "fill": 0x0c0ccb,
        "stroke": 0x0c0c94
      },
      "mage": {
        "fill": 0xdaba0c,
        "stroke": 0x747406
      },
      "priest": {
        "fill": 0xba0c0c,
        "stroke": 0x740606
      },
      "default": {
        "fillCritical": 0x111111,
        "strokeCritical": 0x000000
      }
    },
    "green": 0x0cc50c,
    "darkGreen": 0x0cac0c
  }
}

},{}],2:[function(require,module,exports){
/* global Phaser, HealthBar, _ */
/* eslint-disable comma-dangle */

const c = require('./constants.json')

window.onload = function () {
  const MIN_TWITCH_WIDTH = 644
  const GAME_WIDTH = MIN_TWITCH_WIDTH
  const GAME_HEIGHT = 125

  const HERO_MOVEMENT_VELOCITY = 80
  const HERO_WIDTH = 60
  const HERO_HEIGHT = 60

  const DISTANCE_BETWEEN_HEROES = HERO_WIDTH + 12
  const COMBAT_DISTANCE = 28
  const ENEMY_BASE_X = GAME_WIDTH / 2 + (HERO_WIDTH / 2 + COMBAT_DISTANCE / 2)
  const MAX_ENEMIES_PER_ZONE = 3

  const game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, '', {
    preload,
    create,
    update,
    render
  })
  let chest,
    projectiles,
    lineCameraMiddle,
    background,
    coinEmitter,
    displayGroup
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

  const onPlayerKilled = function () {
    if (this.getAllAliveUnits().length === 0) {
      // all players dead, game over
      console.info('game over')
    }
  }

  const onEnemyKilled = function (enemy) {
    particleBurst(enemy, 5)
    if (this.getAllAliveUnits().length === 0) {
      // last enemy killed
      // expand world to include another zone
      zone++
      console.info('zone', zone)
      const extraDistanceToNextFight = (5 / 7) * GAME_WIDTH // on top walking to the edge of the current zone
      game.world.resize(game.world.width + extraDistanceToNextFight, game.world.height)
    }
  }

  let players = {
    sprites: [
      c.classes.priest.key,
      c.classes.warrior.key,
      c.classes.archer.key,
      c.classes.mage.key,
    ],
    frontIndex: 0, // index of the player at the front, ready to attack
    state: 'idle', // 'idle', walking', 'fighting', swapping'
    getAllAliveUnits,
    getFirstAliveUnit,
    onHeroKilled: onPlayerKilled
  }

  let enemies = {
    sprites: [
      c.classes.priest.key,
      c.classes.priest.key,
      c.classes.priest.key,
      c.classes.priest.key,
    ],
    frontIndex: 0, // index of the player at the front, ready to attack
    state: 'idle', // 'idle', walking', 'fighting', swapping'
    getAllAliveUnits,
    getFirstAliveUnit,
    onHeroKilled: onEnemyKilled
  }

  function preload () {
    // BACKGROUNDS
    game.load.image('background_demo', 'images/background1.png')
    game.load.image('background_1', 'images/backgrounds/grass.gif')

    // CHARACTERS
    game.load.image('warrior_orange', 'images/characters/knight_orange_60x57.png')
    // game.load.image('warrior_blue', 'images/characters/knight_blue_60x57.png')
    game.load.image('warrior_blue', 'images/characters/warrior_kappa_60x.png')
    game.load.image('archer_blue', 'images/characters/archer_blue_60x60.png')
    game.load.image('archer_orange', 'images/characters/archer_orange_60x60.png')
    game.load.image('mage_orange', 'images/characters/Trihard.png')
    game.load.image('mage_blue', 'images/characters/Trihard.png')
    game.load.image('priest_blue', 'images/characters/priest_feelsgood_60x75.png')
    game.load.image('priest_orange', 'images/characters/priest_feelsgood_60x75.png')

    // PARTICLES
    game.load.image('arrow', 'images/particles/arrow.png')
    game.load.spritesheet('flames', 'images/particles/animated/flames.png', 32, 40)

    game.load.image('collectable1', 'images/particles/gold_coin.gif')
    game.load.image('collectable2', 'images/particles/gold_rock.png')

    game.load.image('chest_closed', 'images/chest_closed.png')
    game.load.image('chest_open', 'images/chest_open.png')
    game.load.image('chest_closed', 'images/chest_closed.png')
  }

  function createFighter (teamObject, {team, fighterClass, x, y, combatLevel = 0, maxHealth, placesFromFront, onKilled}) {
    const baseClass = c.classes[fighterClass]
    const baseDefault = c.classes.default
    // numFromFront is the number
    let fighter
    let spriteSuffix
    let xDirection
    let flipHorizontally = false

    if (team === c.teams.player) {
      spriteSuffix = '_blue'
      xDirection = 1
      flipHorizontally = true
    } else if (team === c.teams.enemy) {
      spriteSuffix = '_orange'
      xDirection = -1
    }

    fighter = game.add.sprite(x, y, c.classes[fighterClass].key + spriteSuffix)
    if (fighterClass === c.classes.priest.key) console.info(baseClass.abilities)
    fighter.abilities = baseClass.abilities
    fighter.abilitiesPerLevel = baseClass.abilitiesPerLevel

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
    fighter.body.gravity.y = baseClass.gravityModifier ? baseClass.gravityModifier * 700 : 700

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

    const extraHealthPerLevel = c.classes.default.extraPerLevel.health
    const baseMaxHealth = baseClass.maxHealth || baseDefault.maxHealth
    fighter.maxHealth = Math.round(baseMaxHealth + (extraHealthPerLevel * combatLevel))
    fighter.health = fighter.maxHealth
    console.info(`new ${fighter.info.team} with ${fighter.health} hp`)

    let bar = { color: '#e2b100' }
    if (team === c.teams.player) {
      bar = { color: '#48ad05' }
      fighter.inputEnabled = true
      fighter.events.onInputDown.add(() => pushPlayerToFront(fighter.placesFromFront))
    }
    fighter.healthBar = new HealthBar(game, {x: x - 4, y: y - 15, width: 50, height: 10, bar})

    const baseStats = _.assign({}, baseDefault.combat, baseClass.combat, {
      attackTimer: 0,
      level: combatLevel,
      range: baseClass.combat.range,
      hitDamage
    })

    const extraPerLevel = c.classes.default.combatPerLevel

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
    fighter.events.onKilled.add(onKilled.bind(teamObject, fighter))

    return fighter
  }

  function particleBurst (pointer, count = 3, lifespan = 750) {
    if (!_.isNumber(count)) count = 3
    //  Position the emitter where the mouse/touch event was
    coinEmitter.x = pointer.x
    coinEmitter.y = pointer.y

    //  The first parameter sets the effect to "explode" which means all particles are emitted at once
    //  The third argument is ignored when using burst/explode mode
    //  The final parameter (10) is how many particles will be emitted in this single burst
    coinEmitter.start(true, lifespan, null, count)
  }

  function create () {
    game.physics.startSystem(Phaser.Physics.ARCADE)
    game.time.advancedTiming = true // so we can read fps to calculate attack delays in seconds
    background = game.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'background_1')

    displayGroup = game.add.group()

    // draw middle line for testing
    lineCameraMiddle = new Phaser.Line(0, 0, 0, GAME_HEIGHT)

    const playerBaseX = game.world.centerX - (HERO_WIDTH / 2 + COMBAT_DISTANCE / 2)
    players.sprites = players.sprites.map((fighterClass, index) => createFighter(players, {
      team: c.teams.player,
      fighterClass,
      x: playerBaseX - DISTANCE_BETWEEN_HEROES * index,
      y: game.world.height - HERO_HEIGHT,
      placesFromFront: index,
      onKilled: players.onHeroKilled,
      combatLevel: 2
    }))

    enemies.sprites = enemies.sprites.map((fighterClass, index) => {
      const enemy = createFighter(enemies, {
        team: c.teams.enemy,
        fighterClass,
        x: ENEMY_BASE_X + DISTANCE_BETWEEN_HEROES * index,
        y: game.world.height - HERO_HEIGHT,
        placesFromFront: index,
        onKilled: enemies.onHeroKilled
      })
      displayGroup.add(enemy, true, displayGroup.length)
      return enemy
    })

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

    coinEmitter = game.add.emitter(0, 0, 100) // max 100 coins at once
    coinEmitter.maxParticleScale = 0.08
    coinEmitter.minParticleScale = 0.08

    // spriteKey, frame, quantity, collide?, collideWorldBounds?
    // i think that the quantity chosen here restricts the max quantity generated in one call
    coinEmitter.makeParticles('collectable1', 0, undefined, false, true)
    coinEmitter.gravity = 380
    displayGroup.add(coinEmitter, true)
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

  function spawnEnemy (placesFromFront = 0, combatLevel = 0, fighterClass = c.classes.warrior.key) {
    const x = getCameraCenterX() + (HERO_WIDTH / 2) + (COMBAT_DISTANCE / 2) + 1
    const enemy = createFighter(enemies, {
      team: c.teams.enemy,
      combatLevel,
      fighterClass,
      x: x + DISTANCE_BETWEEN_HEROES * placesFromFront,
      y: game.world.height - HERO_HEIGHT,
      placesFromFront,
      onKilled: enemies.onHeroKilled
    })
    displayGroup.add(enemy)
    enemies.sprites.push(enemy)
    return enemy
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

    function forEachAliveHero (heroTeam, execute, frontToBack = false) {
      let heroes
      if (heroTeam instanceof Array) {
        heroes = heroTeam
      } else if (heroTeam === c.teams.player) {
        heroes = players.sprites
      } else if (heroTeam === c.teams.enemy) {
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

    function distBetweenHeroes (hero1, hero2) {
      return Phaser.Math.difference(hero1.body.x, hero2.body.x) - HERO_WIDTH
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

    function shoot (shooter, xDirection, projectileType = c.projectiles.arrow.key) {
      const projectile = projectiles.getFirstDead()
      let projectileX = shooter.x + 18 * xDirection
      projectile.angle += 180
      if (xDirection < 0) {
        projectile.angle -= 180
        projectileX -= projectile.width
      }
      projectile.reset(projectileX, shooter.y + 22)
      projectile.body.velocity.x = 700 * xDirection
      projectile.body.gravity.y = 230
      projectile.body.acceleration.x = -340 * xDirection
      projectile.shooter = shooter
      projectile.info = {
        team: shooter.info.team,
        projectileType: projectileType
      }
      projectile.loadTexture(projectileType)
      if (projectileType !== c.projectiles.arrow.key) {
        console.info(shooter.info.fighterClass, projectileType)
        projectile.scale.setTo(0.4)
      }
    }

    function burnTeam (attacker, targetTeam) {
      forEachAliveHero(targetTeam, victim => {
        const point = {
          x: -HERO_WIDTH / 2.5,
          y: HERO_HEIGHT / 2 - 12
        }
        const fireSprite = game.make.sprite(point.x, point.y, 'flames')
        fireSprite.scale.setTo(1.5, 1)
        fireSprite.lifespan = (1000 / attacker.combat.attackSpeed) / 1.7
        fireSprite.animations.add('flicker')
        fireSprite.animations.play('flicker', 10, true)
        fireSprite.events.onKilled.add(() => fireSprite.destroy())
        victim.addChild(fireSprite)
        dealDamage(attacker, victim)
      })
    }

    function attackHero (attacker, victim) {
      switch (attacker.info.fighterClass) {
        case c.classes.warrior.key:
          // attack animation
          attacker.body.velocity.y = -110
          dealDamage(attacker, victim)
          break
        case c.classes.archer.key:
          attacker.body.velocity.y = -170
          shoot(attacker, attacker.info.xDirection)
          break
        case c.classes.mage.key:
          attacker.body.velocity.y = -80
          burnTeam(attacker, victim.info.team)
          break
        case c.classes.priest.key:
          attacker.body.velocity.y = -90
          dealDamage(attacker, victim)
          break
      }
      // damage the victim

      // delay until next attack
      const fps = game.time.fps === 1 ? 60 : game.time.fps
      attacker.combat.attackTimer = fps / attacker.combat.attackSpeed
    }

    function renderHitSplat (hero, text, style, lifespan) {
      // render a hit splat
      const hitSplat = game.add.graphics()

      const fillColor = style.fill
      const lineColor = style.stroke
      hitSplat.beginFill(fillColor, 1)
      hitSplat.lineStyle(3, lineColor, 1)

      const rect = {
        x: -20,
        y: 20,
        width: 36,
        height: 20
      }
      hitSplat.drawRect(rect.x, rect.y, rect.width, rect.height)

      const splatTextStyle = {
        fill: 'white',
        fontSize: '20px',
        boundsAlignH: 'center'
      }
      const hitText = game.make.text(-10, rect.y - 3, text.toString(), splatTextStyle)
      hitText.setTextBounds(-30, 3, 80, 30)

      hitSplat.addChild(hitText)
      if (hero.info.team === c.teams.player) {
        hitSplat.scale.x *= -1
      }
      hitSplat.lifespan = lifespan
      hitSplat.events.onKilled.add(() => hitSplat.destroy(true))
      hero.addChild(hitSplat)
    }

    function updateHealthBar (hero, healthBar) {
      healthBar.setPercent(hero.health / hero.maxHealth * 100)
    }

    function dealDamage (attacker, victim) {
      const damage = attacker.combat.hitDamage()
      let damageValue = damage.value
      if (attacker.info.fighterClass === c.classes.archer.key) {
        // archers deal more damage from further away
        damageValue = Math.round(damageValue + damageValue * (attacker.placesFromFront * 0.3))
      }
      const damageString = damage.critical ? damageValue.toString() + '!' : damageValue.toString()
      victim.damage(damageValue)
      victim.combat.framesSinceDamageTaken = 0

      // render a hit splat
      const hitSplat = game.add.graphics()

      const splatColors = c.colors.hitSplat[attacker.info.fighterClass]
      const defaultSplatColors = c.colors.hitSplat.default
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
      if (victim.info.team === c.teams.player) {
        hitSplat.scale.x *= -1
      }
      hitSplat.lifespan = (1000 / attacker.combat.attackSpeed) - 300
      hitSplat.events.onKilled.add(() => hitSplat.destroy(true))
      victim.addChild(hitSplat)

      // update healthbar
      updateHealthBar(victim, victim.healthBar)

      if (victim.info.team === c.teams.enemy) {
        // drop particles
        particleBurst(victim, 2)
      }
    }

    function healHero (hero, healValue) {
      hero.heal(healValue)
      if (hero.health > hero.maxHealth) {
        hero.health = hero.maxHealth
      }
      renderHitSplat(hero, '+' + healValue, {
        fill: c.colors.green,
        stroke: c.colors.darkGreen
      }, 850)
      updateHealthBar(hero, hero.healthBar)
    }

    function castAbility (caster, ability, abilityPerLevel) {
      switch (ability.name) {
        case 'heal_team':
          forEachAliveHero(caster.info.team, hero => {
            healHero(hero, ability.value + (abilityPerLevel.value * caster.combat.level))
          })
          break
      }
    }

    function walkAll (team) {
      let defaultXDirection
      if (team === c.teams.player) {
        defaultXDirection = 1
      } else if (team === c.teams.enemy) {
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
        Math.abs(sprite.left - getCameraCenterX()),
        Math.abs(sprite.right - getCameraCenterX())
      )
    }

    const updateHero = (hero, index) => {
      if (hero.combat.framesSinceDamageTaken > 320) {
        hero.health += 0.18
        hero.healthBar.setPercent(hero.health / hero.maxHealth * 100)
      }
      hero.combat.attackTimer--
      if (hero.abilities) {
        hero.abilities = _.mapValues(hero.abilities, ability => {
          ability.timer--
          return ability
        })
      }
      hero.combat.framesSinceDamageTaken++
      hero.body.velocity.x = 0
      hero.healthBar.setPosition(hero.x, hero.y - 14)
      hero.placesFromFront = index

      const passiveAbility = _.get(hero, ['abilities', 'passive'])
      if (passiveAbility && passiveAbility.timer <= 0) {
        // passive ability ready to use
        const abilityPerLevel = _.get(hero, ['abilitiesPerLevel', 'passive'])
        castAbility(hero, passiveAbility, abilityPerLevel)
        passiveAbility.timer = passiveAbility.cooldown
      }
      if (hero.health > hero.maxHealth) hero.health = hero.maxHealth
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
      forEachAliveHero(c.teams.enemy, updateHero, true)

      if (distBetweenHeroes(firstPlayer, firstEnemy) <= COMBAT_DISTANCE) {
        // heroes are in combat range
        players.state = 'fighting'
        enemies.state = 'fighting'
        // all heroes attack if they are in range
        forEachAliveHero(c.teams.player, (hero, index) => {
          if (hero.placesFromFront <= hero.combat.range) {
            // this hero can attack from a distance
            if (hero.combat.attackTimer <= 0) {
              attackHero(hero, firstEnemy)
            }
          }
        }, true)
        forEachAliveHero(c.teams.enemy, (hero, index) => {
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

      if (distanceToMiddle(firstPlayer) > COMBAT_DISTANCE / 2) {
        players.state = 'moving to fight'
        walkAll(c.teams.player)
      }
      if (distanceToMiddle(firstEnemy) > COMBAT_DISTANCE / 2) {
        enemies.state = 'moving to fight'
        walkAll(c.teams.enemy)
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
        walkAll(c.teams.player)
        // focus camera on front player
        game.camera.focusOnXY(firstPlayer.x + (COMBAT_DISTANCE / 2 + HERO_WIDTH / 2), firstPlayer.y + 0)
        break
    }

    switch (enemies.state) {
      case 'dead':
        if (distanceToNextFight === 0) {
          for (let count = 1; (count < zone + 1) && (count <= MAX_ENEMIES_PER_ZONE); count++) {
            spawnEnemy(count - 1, zone)
          }
        }
    }

    displayGroup.sort('z', Phaser.Group.SORT_DESCENDING)

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
    game.debug.geom(lineCameraMiddle, 'grey')
    game.debug.text(players.state, 5, 20, 'blue')
    game.debug.text(enemies.state, game.camera.width - 180, 20, 'orange')
  }
}


},{"./constants.json":1}]},{},[2]);
