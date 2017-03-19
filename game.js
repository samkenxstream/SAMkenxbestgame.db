/* global Phaser, HealthBar, _ */
/* eslint-disable comma-dangle */

const c = require('./constants.js')()

window.onload = () => {
  const MIN_TWITCH_WIDTH = 644
  const GAME_WIDTH = MIN_TWITCH_WIDTH
  const GAME_HEIGHT = 125

  const HERO_MOVEMENT_VELOCITY = 75
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
  const Menu = require('./Menu.js')(game)
  let projectiles,
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
      // all players dead, this.game over
      console.log('game over')
    }
  }

  const onEnemyKilled = function (enemy) {
    dropCoins(enemy, 5)
    if (this.getAllAliveUnits().length === 0) {
      // last enemy killed
      // expand world to include another zone
      console.log('zone complete')
      zone++
      console.log('advancing to zone', zone)
      const extraDistanceToNextFight = (5 / 7) * GAME_WIDTH // on top walking to the edge of the current zone
      game.world.resize(game.world.width + extraDistanceToNextFight, game.world.height)
    }
  }

  let players = {
    sprites: [
      c.classes.warrior.key,
      c.classes.mage.key,
      c.classes.priest.key,
    ],
    frontIndex: 0, // index of the player at the front, ready to attack
    state: 'idle', // 'idle', walking', 'fighting', swapping'
    getAllAliveUnits,
    getFirstAliveUnit,
    onHeroKilled: onPlayerKilled
  }

  let enemies = {
    sprites: [
      c.classes.mage.key,
      c.classes.warrior.key,
    ],
    frontIndex: 0, // index of the player at the front, ready to attack
    state: 'idle', // 'idle', walking', 'fighting', swapping'
    getAllAliveUnits,
    getFirstAliveUnit,
    onHeroKilled: onEnemyKilled
  }

  function preload () {
    // BACKGROUNDS
    this.game.load.image('background_1', 'images/backgrounds/grass.gif')

    // CHARACTERS
    this.game.load.image(c.classes.warrior.key, 'images/characters/warrior_kappa_60x.png')
    this.game.load.image(c.classes.archer.key, 'images/characters/archer_emote_60x80.png')
    this.game.load.image(c.classes.mage.key, 'images/characters/Trihard.png')
    this.game.load.image(c.classes.priest.key, 'images/characters/priest_feelsgood_60x75.png')

    // PARTICLES
    this.game.load.image('arrow', 'images/particles/arrow.png')
    this.game.load.spritesheet('flames', 'images/particles/animated/flames.png', 32, 40)

    this.game.load.image('collectible1', 'images/particles/gold_coin_v3.gif')

    this.game.load.image('chest_closed', 'images/chest_closed.png')
    this.game.load.image('chest_open', 'images/chest_open.png')
  }

  function createFighter (teamObject, {team, fighterClass, x, y, combatLevel = 0, maxHealth, placesFromFront, onKilled}) {
    const baseClass = c.classes[fighterClass]
    const baseDefault = c.classes.default
    // numFromFront is the number
    let fighter
    let xDirection
    let flipHorizontally = false

    if (team === c.teams.player) {
      xDirection = 1
      flipHorizontally = true
    } else if (team === c.teams.enemy) {
      xDirection = -1
    }

    fighter = game.add.sprite(x, y, c.classes[fighterClass].key)

    fighter.anchor.setTo(0.5, 0)
    if (flipHorizontally) {
      fighter.scale.x *= -1
    }

    fighter.abilities = baseClass.abilities
    fighter.abilitiesPerLevel = baseClass.abilitiesPerLevel

    fighter.info = {
      team,
      fighterClass,
      xDirection
    }

    if (team === c.teams.player) {
      fighter.inputEnabled = true
      fighter.input.useHandCursor = placesFromFront > 0
    }

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

    // health and healthRegen
    const extraHealthPerLevel = c.classes.default.extraPerLevel.health || 0
    const baseMaxHealth = baseClass.maxHealth || baseDefault.maxHealth
    const baseHealthRegen = baseClass.healthRegen || baseDefault.healthRegen
    const extraHealthRegenPerLevel = c.classes.default.extraPerLevel.healthRegen || 0
    fighter.maxHealth = Math.round(baseMaxHealth + (extraHealthPerLevel * combatLevel))
    fighter.health = fighter.maxHealth
    fighter.healthRegen = baseHealthRegen + (extraHealthRegenPerLevel * combatLevel)
    console.log(`new ${fighter.info.team} ${fighter.info.fighterClass}, ${fighter.health} hp`)

    let bar = { color: '#e2b100' }
    if (team === c.teams.player) {
      bar = { color: '#48ad05' }
      fighter.inputEnabled = true
      fighter.events.onInputDown.add(() => pushPlayerToFront(fighter.placesFromFront))
    }
    fighter.healthBar = new HealthBar(game, {x: x - 3, y: y - 15, width: 50, height: 8, bar})

    // combat values and hit damage
    function hitDamage () {
      if (Math.random() < newCombatStats.critChance) {
        // we got a critical hit!
        return { value: Math.ceil(newCombatStats.maxHitDamage * 1.5), critical: true }
      }
      const randomDamage = Math.ceil(newCombatStats.minHitDamage + (newCombatStats.maxHitDamage - newCombatStats.minHitDamage) * Math.random())
      return { value: randomDamage, critical: false }
    }

    const baseCombatStats = _.assign({}, baseDefault.combat, baseClass.combat, {
      attackTimer: 0,
      level: combatLevel,
      hitDamage
    })

    const defaultExtraPerLevel = c.classes.default.combatPerLevel
    const classExtraPerLevel = c.classes[fighterClass].combatPerLevel
    const extraPerLevel = _.assign({}, defaultExtraPerLevel, classExtraPerLevel)

    const increasedCombatStats = _.mapValues(extraPerLevel, (statValue, stat) => baseCombatStats[stat] + statValue * combatLevel)

    const newCombatStats = _.assign({}, baseCombatStats, increasedCombatStats)
    fighter.combat = newCombatStats
    fighter.events.onKilled.add(() => fighter.healthBar.kill())
    fighter.events.onKilled.add(onKilled.bind(teamObject, fighter))

    return fighter
  }

  function create () {
    game.state.add('Menu', Menu)

    const createCoinsScore = () => {
      const coinsLabelStyle = {
        font: '28px Arial',
        fill: '#ffff2b',
        stroke: 'black',
        strokeThickness: 2.3
      }

      // create the coins label
      const coinsLabel = this.game.add.text(this.game.world.centerX, 0, '0', coinsLabelStyle)
      const coinsLabelIcon = this.game.add.sprite(0, 0, 'collectible1')
      coinsLabelIcon.scale.setTo(0.4)
      coinsLabelIcon.anchor.setTo(1, 0)
      coinsLabelIcon.x = -4
      coinsLabelIcon.y = coinsLabel.height / 4

      coinsLabel.anchor.setTo(0, 0)
      coinsLabel.align = 'center'

      coinsLabel.addChild(coinsLabelIcon)

      this.game.world.bringToTop(coinsLabel)

      // Create a tween to grow / shrink the coins label
      const coinsLabelTween = this.game.add.tween(coinsLabel.scale).to({
        x: 1.3,
        y: 1.3
      }, 120, Phaser.Easing.Linear.In).to({x: 1, y: 1}, 90, Phaser.Easing.Linear.In)
      return {
        value: 0,
        bufferValue: 0,
        label: coinsLabel,
        labelIcon: coinsLabelIcon,
        labelTween: coinsLabelTween,
      }
    }
    background = this.game.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'background_1')

    this.game.time.advancedTiming = true // so we can read fps to calculate attack delays in seconds
    this.game.physics.startSystem(Phaser.Physics.ARCADE)

    this.game.coins = createCoinsScore()
    console.info(this.game.coins)

    // debugging purposes
    // this.game.time.slowMotion = 2.5
    lineCameraMiddle = new Phaser.Line(0, 0, 0, GAME_HEIGHT)

    displayGroup = this.game.add.group()

    const playerBaseX = this.game.world.centerX - (HERO_WIDTH / 2 + COMBAT_DISTANCE / 2)
    players.sprites = players.sprites.map((fighterClass, index) => createFighter.call(this, players, {
      team: c.teams.player,
      fighterClass,
      x: playerBaseX - DISTANCE_BETWEEN_HEROES * index,
      y: this.game.world.height - HERO_HEIGHT,
      placesFromFront: index,
      onKilled: players.onHeroKilled,
      combatLevel: 0
    }))

    enemies.sprites = enemies.sprites.map((fighterClass, index) => {
      const enemy = createFighter.call(this, enemies, {
        team: c.teams.enemy,
        fighterClass,
        x: ENEMY_BASE_X + DISTANCE_BETWEEN_HEROES * index,
        y: this.game.world.height - HERO_HEIGHT,
        placesFromFront: index,
        onKilled: enemies.onHeroKilled
      })
      displayGroup.add(enemy, true, displayGroup.length)
      return enemy
    })

    projectiles = this.game.add.group()
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

    coinEmitter = this.game.add.emitter(0, 0, 100) // max 100 coins at once
    coinEmitter.maxParticleScale = 0.5
    coinEmitter.minParticleScale = 0.5

    // spriteKey, frame, quantity, collide?, collideWorldBounds?
    // i think that the quantity chosen here restricts the max quantity generated in one call
    coinEmitter.makeParticles('collectible1', 0, undefined, false, true)
    coinEmitter.gravity = 600
    const animateAddCoins = (coin) => {
      if (!coin.alive) {
        createCoinsIncrementAnimation(coin, 1)
      }
    }
    coinEmitter.callAll('events.onKilled.add', 'events.onKilled', animateAddCoins)
    this.game.world.bringToTop(coinEmitter)
  }

  function createCoinsIncrementAnimation (coin, coinValue) {
    coin.alive = true
    coin.visible = true

    // tween the coin to the total score label
    const duration = 400

    const coinTween = game.add.tween(coin).to({
      x: game.coins.label.x,
      y: game.coins.label.y
    }, duration, Phaser.Easing.Exponential.In, true)

    game.add.tween(coin).to({alpha: 0.3}, duration * 0.85, Phaser.Easing.Exponential.In, true)

    // when animation finishes:
    // destroy score label
    // trigger the total score labels animation
    coinTween.onComplete.add(function () {
      coin.destroy()
      game.coins.labelTween.start()
      game.coins.bufferValue += coinValue
    }, game)
  }

  const getCameraCenterX = () => {
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
    playerToPush.combat.attackTimer = playerAtFront.combat.attackTimer
    playerToPush.shiftToFront() // move the player to the front
    // the player being pushed to the front needs to wait to attack
    // this prevents a player from spam swapping their heroes to attack with each as often as possible

    players.frontIndex = playerToPushIndex
  }

  function spawnEnemy (placesFromFront = 0, combatLevel = 0, fighterClass = c.classes.warrior.key) {
    const x = getCameraCenterX() + (HERO_WIDTH / 2) + (COMBAT_DISTANCE / 2) + 1
    const enemy = createFighter.call(game, enemies, {
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
    spawnEnemy.apply(game, arguments)
  }

  function dropCoins (pointer, count = 3, lifespan = 750, explode = true) {
    if (!_.isNumber(count)) count = 3
    if (lifespan == null || !_.isNumber(lifespan)) lifespan = 750
    coinEmitter.x = pointer.x
    coinEmitter.y = pointer.y

    //  The first parameter sets the effect to "explode" which means all particles are emitted at once
    //  The third argument is ignored when using burst/explode mode
    //  The final parameter (10) is how many particles will be emitted in this single burst
    coinEmitter.start(explode, lifespan, 180, count)
  }

  function update () {
    background.width = this.game.world.width

    this.game.coins.label.x = getCameraCenterX()
    const coinBuffer = this.game.coins.bufferValue
    if (coinBuffer > 0) {
      if (coinBuffer > 50) {
        this.game.coins.value += 5
      } else {
        this.game.coins.value += 1
      }
      this.game.coins.label.text = this.game.coins.value.toString()
      this.game.coins.bufferValue--
    }

    // debugging
    lineCameraMiddle.centerOn(getCameraCenterX.call(this), this.game.world.height / 2)
    const cursors = this.game.input.keyboard.createCursorKeys()

    const distanceToNextFight = this.game.world.width - (this.game.camera.x + this.game.camera.width)
    const firstPlayer = players.getFirstAliveUnit()
    const firstEnemy = enemies.getFirstAliveUnit()

    this.game.physics.arcade.overlap(enemies.sprites, projectiles, projectileHitsHero, null, this)
    this.game.physics.arcade.overlap(players.sprites, projectiles, projectileHitsHero, null, this)

    const forEachAliveHero = (heroTeam, execute, frontToBack = false) => {
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

    const burnTeam = (attacker, targetTeam) => {
      forEachAliveHero(targetTeam, victim => {
        const firePosition = {
          x: 0,
          y: victim.height / 2
        }
        const fireSprite = this.game.make.sprite(firePosition.x, firePosition.y, 'flames')
        fireSprite.scale.setTo(1.5, 1)
        fireSprite.anchor.setTo(0.5, 0)
        fireSprite.lifespan = Math.min((1000 / attacker.combat.attackSpeed) / 1.7, 1200)
        fireSprite.animations.add('flicker')
        fireSprite.animations.play('flicker', 10, true)
        fireSprite.events.onKilled.add(() => fireSprite.destroy())
        victim.addChild(fireSprite)
        dealDamage(attacker, victim)
      })
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
      // begin health regeneration some time after damage was taken
      victim.combat.beginRegenAt = game.time.now + (Phaser.Timer.SECOND * c.HEALTH_REGEN_DELAY)

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
        y: victim.height / 2.5,
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
      hitSplat.lifespan = Math.max(300, Math.min(1200, (1000 / attacker.combat.attackSpeed) - 300))
      hitSplat.events.onKilled.add(() => hitSplat.destroy(true))
      victim.addChild(hitSplat)

      // update healthbar
      updateHealthBar(victim, victim.healthBar)

      if (victim.info.team === c.teams.enemy) {
        // drop particles
        dropCoins(victim, 2, null, false)
      }
    }

    const attackHero = (attacker, victim) => {
      // perform attack based on class
      switch (attacker.info.fighterClass) {
        case c.classes.warrior.key:
          // attack animation
          attacker.body.velocity.y = -125
          dealDamage.call(this, attacker, victim)
          break
        case c.classes.archer.key:
          attacker.body.velocity.y = -170
          shoot(attacker, attacker.info.xDirection)
          break
        case c.classes.mage.key:
          attacker.body.velocity.y = -85
          burnTeam(attacker, victim.info.team)
          break
        case c.classes.priest.key:
          attacker.body.velocity.y = -105
          dealDamage.call(this, attacker, victim)
          break
      }

      attacker.combat.attackTimer = game.time.now + (1 / attacker.combat.attackSpeed) * 1000
    }

    const renderHitSplat = (hero, text, style, lifespan) => {
      // render a hit splat
      const hitSplat = this.game.add.graphics()

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
      const hitText = this.game.make.text(-10, rect.y - 3, text.toString(), splatTextStyle)
      hitText.setTextBounds(-30, 3, 80, 30)

      hitSplat.addChild(hitText)
      if (hero.info.team === c.teams.player) {
        hitSplat.scale.x *= -1
      }
      hitSplat.lifespan = lifespan
      hitSplat.events.onKilled.add(() => hitSplat.destroy(true))
      hero.addChild(hitSplat)
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

    function updateHealthBar (hero, healthBar) {
      healthBar.setPercent(hero.health / hero.maxHealth * 100)
    }

    function healHero (hero, healValue) {
      if (hero.health === hero.maxHealth) {
        // already max health
        return
      }
      const roundedHealValue = Math.round(healValue)
      hero.heal(healValue)
      if (hero.health > hero.maxHealth) {
        hero.health = hero.maxHealth
      }
      renderHitSplat(hero, '+' + roundedHealValue, {
        fill: c.colors.green,
        stroke: c.colors.darkGreen
      }, 850)
      updateHealthBar(hero, hero.healthBar)
    }

    function castAbility (caster, ability, abilityPerLevel) {
      switch (ability.name) {
        case 'heal_team':
          caster.body.velocity.y = -80
          forEachAliveHero(caster.info.team, hero => {
            healHero(hero, ability.value + (abilityPerLevel.value * caster.combat.level))
          })
          break
      }
      ability.timer = game.time.now + (ability.cooldown * Phaser.Timer.SECOND) * Math.pow(abilityPerLevel.cooldownMultiplier, caster.combat.level)
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

    const distanceToMiddle = (sprite) => {
      return Math.min(
        Math.abs(sprite.left - getCameraCenterX()),
        Math.abs(sprite.right - getCameraCenterX())
      )
    }

    const updateHero = (hero, index) => {
      if (this.game.time.now >= hero.combat.beginRegenAt) {
        // console.info('regeny', hero.healthRegen)
        healHero(hero, hero.healthRegen)
        hero.healthBar.setPercent(hero.health / hero.maxHealth * 100)
      }
      // hero.combat.attackTimer--
      if (hero.abilities) {
        hero.abilities = _.mapValues(hero.abilities, ability => {
          ability.timer--
          return ability
        })
      }

      hero.body.velocity.x = 0
      hero.healthBar.setPosition(hero.x, hero.y - 14)
      hero.placesFromFront = index

      const passiveAbility = _.get(hero, ['abilities', 'passive'])
      if (passiveAbility) {
        if (passiveAbility.timer <= this.game.time.now) {
          // passive ability ready to use
          const abilityPerLevel = _.get(hero, ['abilitiesPerLevel', 'passive'])
          castAbility(hero, passiveAbility, abilityPerLevel)
        }
      }
      if (hero.health > hero.maxHealth) hero.health = hero.maxHealth
    }

    if (firstPlayer) {
      forEachAliveHero(players.sprites, updateHero, true)
    } else {
      // this.game over
      players.state = 'dead'
      // this.game.paused = true
      return
    }

    if (firstEnemy) {
      forEachAliveHero(c.teams.enemy, updateHero, true)

      if (distBetweenHeroes(firstPlayer, firstEnemy) <= COMBAT_DISTANCE) {
        // heroes are in combat range
        players.state = 'fighting'

        forEachAliveHero(c.teams.player, (hero, index) => {
          if (hero.placesFromFront <= hero.combat.range) {
            // this hero can attack from a distance
            if (hero.combat.attackTimer <= game.time.now) {
              attackHero.call(this, hero, firstEnemy)
            }
          }
        }, true)

        enemies.state = 'fighting'

        forEachAliveHero(c.teams.enemy, (hero, index) => {
          if (hero.placesFromFront <= hero.combat.range) {
            // this hero is in range to attack
            // console.info('atk del', hero.combat.attackTimer)
            if (hero.combat.attackTimer <= game.time.now) {
              attackHero.call(this, hero, firstPlayer)
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
      if (Math.abs(firstPlayer.bottom - this.game.world.height) < 2) {
        // first player is on ground
        players.state = 'walking'
      }
    }

    switch (players.state) {
      case 'walking':
        walkAll(c.teams.player)
        // focus camera on front player
        this.game.camera.focusOnXY(firstPlayer.x + (COMBAT_DISTANCE / 2 + HERO_WIDTH / 2), firstPlayer.y + 0)
        break
      case 'dead':
        gameOver()
        return
    }

    switch (enemies.state) {
      case 'dead':
        if (distanceToNextFight === 0) {
          for (let count = 1; (count < zone + 1) && (count <= MAX_ENEMIES_PER_ZONE); count++) {
            spawnEnemy(count - 1, zone)
          }
        }
    }

    // displayGroup.sort('z', Phaser.Group.SORT_DESCENDING)

    // keyboard movement for testing purposes
    if (cursors.left.isDown) {
      //  Move to the left
      firstPlayer.body.velocity.x = -2 * HERO_MOVEMENT_VELOCITY
    } else if (cursors.right.isDown) {
      //  Move to the right
      firstPlayer.body.velocity.x = 2 * HERO_MOVEMENT_VELOCITY
    }
  }

  function gameOver () {
    console.info('game over')
    game.state.start('Menu')
  }

  function render () {
    // this.game.debug.geom(lineCameraMiddle, 'grey')
    this.game.debug.text(players.state, 5, 20, 'blue')
    // this.game.debug.text(enemies.state, this.game.camera.width - 180, 20, 'orange')
    // this.game.debug.text(this.game.coins.bufferValue, this.game.camera.width / 2 - 50, 20, 'yellow')
  }
}

