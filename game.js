/* global Phaser, HealthBar, _ */
/* eslint-disable comma-dangle */

const Constants = require('./constants')
const c = new Constants()

const VanishingText = require('./components/Text/VanishingText')
const StyledText = require('./components/Text/StyledText')

window.onload = () => {
  const MIN_TWITCH_WIDTH = 644
  const GAME_WIDTH = MIN_TWITCH_WIDTH
  const GAME_HEIGHT = 125

  const HERO_MOVEMENT_VELOCITY = 80
  const HERO_WIDTH = 55 // was 60 in version <= 0.1.5
  const HERO_HEIGHT = 60

  const DISTANCE_BETWEEN_HEROES = HERO_WIDTH + 12
  const COMBAT_DISTANCE = 28
  const ENEMY_BASE_X = GAME_WIDTH / 2 + (HERO_WIDTH / 2 + COMBAT_DISTANCE / 2)
  const MAX_ENEMIES_PER_ZONE = 5

  const game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, '', {
    preload,
    create,
    update,
    render
  })

  let lineCameraMiddle,
    coinEmitter,
    chest,
    effects,
    foreground

  let zone = 0

  // this = players OR enemies
  const onPlayerKilled = function () {
    if (this.sprites.countLiving() === 0) {
      // all players dead, game over
      console.info('all dead, game over')
    }
  }

  const onEnemyKilled = function (enemy) {
    dropCoins(enemy, 5)
    if (this.sprites.countLiving() === 0) {
      // last enemy killed
      // expand world to include another zone
      zone++
      console.log('advancing to zone', zone)
      const extraDistanceToNextFight = (5 / 7) * GAME_WIDTH // on top walking to the edge of the current zone
      game.world.resize(game.world.width + extraDistanceToNextFight, game.world.height)

      // rewards at zone 3, 6, 9, ... (every 3 zones)
      // reward appears at the end of the current zone

      // TEMP change
      if (false || (zone > 0) && (zone % 3 === 0)) {
        // spawn a reward chest at the end of the zone
        if (chest && chest.destroy) chest.destroy()
        chest = game.add.sprite(getCameraCenterX() + game.camera.width / 2 - 20, game.world.height / 2 - 4, 'chest_closed')
        chest.foundChest = _.once(foundChestSaga)
        chest.scale.setTo(0.9, 0.63)
        game.physics.arcade.enable(chest)
        // let the chest trigger
        const playerChestOverlap = () => {
          console.info('playerChestOverlap')
          players.state = c.states.openingChest
          chest.foundChest()
        }
        game.physics.arcade.overlap(players.sprites.getFirstAlive(), chest, playerChestOverlap)
      }
    }
  }

  const players = {
    initialHeroes: [
      c.classes.mage.key,
      c.classes.warrior.key,
    ],
    state: '',
    onHeroKilled: onPlayerKilled
  }

  const enemies = {
    initialHeroes: [
      c.classes.warrior.key,
      c.classes.warrior.key,
    ],
    state: '',
    onHeroKilled: onEnemyKilled
  }

  function preload () {
    // BACKGROUNDS
    this.game.load.image('background_1', 'images/backgrounds/grass.gif')

    // CHARACTERS
    
    this.game.load.image('player_warrior', `images/characters/${c.teams.player}_${c.classes.warrior.key}.png`)
    this.game.load.image('enemy_warrior', `images/characters/${c.teams.enemy}_${c.classes.warrior.key}.png`)
    this.game.load.image('player_warrior_active', `images/characters/${c.teams.player}_${c.classes.warrior.key}_active.png`)
    this.game.load.image('enemy_warrior_active', `images/characters/${c.teams.enemy}_${c.classes.warrior.key}_active.png`)
    // this.game.load.image('player_warrior_hurt', `images/characters/${c.teams.player}_${c.classes.warrior.key}_hurt.png`)
    // this.game.load.image('enemy_warrior_hurt', `images/characters/${c.teams.enemy}_${c.classes.warrior.key}_hurt.png`)

    this.game.load.image('player_mage', `images/characters/${c.teams.player}_${c.classes.mage.key}.png`)
    this.game.load.image('enemy_mage', `images/characters/${c.teams.enemy}_${c.classes.mage.key}.png`)
    // this.game.load.image(c.classes.archer.key, 'images/characters/archer_emote_60x80.png')
    // this.game.load.image(c.classes.priest.key, 'images/characters/mage.png')

    // PARTICLES
    // this.game.load.image('arrow', 'images/particles/arrow.png')
    this.game.load.image('collectible1', 'images/particles/gold_coin_v3.gif')
    this.game.load.spritesheet('flames', 'images/particles/animated/flames.png', 32, 40)
    this.game.load.atlas('firebreath', 'images/particles/animated/firebreath_sheet.png', 'images/particles/animated/firebreath_sheet_atlas.json')

    this.game.load.image('chest_closed', 'images/chest_closed.png')
    this.game.load.image('chest_open', 'images/chest_open.png')
    this.game.load.image('reward_coins', 'images/rewards/coins_25.png')

    // this.game.stage.disableVisibilityChange = true
  }


  function Fighter (teamObject, {team, fighterClass, x, y, combatLevel = 0, maxHealth, onHeroKilled}) {

    Phaser.Sprite.call(this, game, x, y, `${team}_${c.classes[fighterClass].key}`);

    this.updateInputEnabled = (z) => {
      const canClickToSwap = true ||z > 0

      this.input.useHandCursor = canClickToSwap
      this.inputEnabled = canClickToSwap
    }

    const hitDamage = () => {
      if (Math.random() < this.combat.critChance) {
        // we got a critical hit!
        return { value: Math.ceil(this.combat.maxHitDamage * 1.5), critical: true }
      }
      const randomDamage = Math.ceil(this.combat.minHitDamage + (this.combat.maxHitDamage - this.combat.minHitDamage) * Math.random())
      return { value: randomDamage, critical: false }
    }

    const baseClass = c.classes[fighterClass]
    const baseDefault = c.classes.default

    let xDirection
    let flipHorizontally = false

    if (team === c.teams.player) {
      xDirection = 1
      // flipHorizontally = true
    } else if (team === c.teams.enemy) {
      xDirection = -1
    }

    this.anchor.setTo(0.5, 0)
    if (flipHorizontally) {
      this.scale.x *= -1
    }

    this.abilities = baseClass.abilities
    this.abilitiesPerLevel = baseClass.abilitiesPerLevel

    this.info = {
      team,
      fighterClass,
      xDirection
    }

    // Physics
    game.physics.arcade.enable(this)
    this.body.collideWorldBounds = true
    this.body.gravity.y = baseClass.gravityModifier ? baseClass.gravityModifier * 700 : 700

    // health and healthRegen
    const extraHealthPerLevel = c.classes.default.extraPerLevel.health || 0
    const baseMaxHealth = baseClass.maxHealth || baseDefault.maxHealth
    const baseHealthRegen = baseClass.healthRegen || baseDefault.healthRegen
    const extraHealthRegenPerLevel = c.classes.default.extraPerLevel.healthRegen || 0
    this.maxHealth = Math.round(baseMaxHealth + (extraHealthPerLevel * combatLevel))
    this.health = this.maxHealth
    this.healthRegen = baseHealthRegen + (extraHealthRegenPerLevel * combatLevel)

    console.log(`${this.info.team} ${this.info.fighterClass}, ${this.health} hp`)

    if (team === c.teams.player) {
      const canClickToSwap = true
      // this.input.useHandCursor = canClickToSwap
      this.inputEnabled = canClickToSwap
    }

    const hpStyle = {
      bar: c.colors.healthBars[team].bar,
      bg: c.colors.healthBars[team].bg
    }

    const resourceBarStyle = {
      bar: c.colors.resourceBar.bar,
      bg: c.colors.resourceBar.bg
    }

    const barOptions = {
      x: 0,
      y: -20,
      width: 50,
      height: 10
    }
    this.healthBar = new HealthBar(game, {
      x: barOptions.x,
      y: barOptions.y,
      width: barOptions.width,
      height: barOptions.height,
      bar: hpStyle.bar,
      bg: hpStyle.bg,
    })
    this.addChild(this.healthBar.getBarSprite())

    if (team === c.teams.player) {
      this.energy = 0
      this.maxEnergy = 100 // value when ability is cast

      this.energyBar = new HealthBar(game, {
        x: barOptions.x,
        y: barOptions.y - 15,
        width: barOptions.width,
        height: barOptions.height,
        bar: resourceBarStyle.bar,
        bg: resourceBarStyle.bg,
        percent: this.energy
      })
      this.addChild(this.energyBar.getBarSprite())
    }

    // combat values and hit damage

    const baseCombatStats = _.assign({}, baseDefault.combat, baseClass.combat, {
      attackTimer: 0,
      level: combatLevel
    })

    const defaultExtraPerLevel = c.classes.default.combatPerLevel
    const classExtraPerLevel = c.classes[fighterClass].combatPerLevel
    const extraPerLevel = _.assign({}, defaultExtraPerLevel, classExtraPerLevel)

    const increasedCombatStats = _.mapValues(extraPerLevel, (statValue, stat) => baseCombatStats[stat] + statValue * combatLevel)

    const newCombatStats = _.assign({}, baseCombatStats, increasedCombatStats)
    this.combat = newCombatStats
    this.combat.hitDamage = hitDamage
    this.events.onKilled.add(onHeroKilled.bind(teamObject, this))
  }

  Fighter.prototype = Object.create(Phaser.Sprite.prototype);
  Fighter.prototype.constructor = Fighter;

  function create () {
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

      // this.game.world.bringToTop(coinsLabel)

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

    this.game.stage.backgroundColor = 'rgb(238, 238, 238)'

    // display order -- background first, foreground last
    enemies.sprites = this.game.add.group()
    players.sprites = this.game.add.group()
    effects = this.game.add.group()
    foreground = this.game.add.group()

    this.game.time.advancedTiming = true // so we can read fps to calculate attack delays in seconds

    if (chest) {
      this.game.physics.arcade.enable(chest)
    }

    this.game.coins = createCoinsScore()

    // TESTING PURPOSES
    window.suicide = () => {
      players.sprites.forEachAlive((player) => {
        player.damage(player.health)
      })
    }
    // this.game.time.slowMotion = 2.5
    lineCameraMiddle = new Phaser.Line(0, 0, 0, GAME_HEIGHT)
    // END OF TESTING CODE

    const playerBaseX = this.game.world.centerX - (HERO_WIDTH / 2 + COMBAT_DISTANCE / 2)

    _.forEach(enemies.initialHeroes, (fighterClass, index) => {
      const hero = new Fighter(enemies, {
        team: c.teams.enemy,
        fighterClass,
        x: ENEMY_BASE_X + DISTANCE_BETWEEN_HEROES * index,
        y: this.game.world.height - HERO_HEIGHT,
        onHeroKilled: enemies.onHeroKilled
      })
      enemies.sprites.add(hero)
    })

    _.forEach(players.initialHeroes, (fighterClass, index) => {
      const hero = new Fighter(players, {
        team: c.teams.player,
        fighterClass,
        x: playerBaseX - DISTANCE_BETWEEN_HEROES * index,
        y: this.game.world.height - HERO_HEIGHT,
        onHeroKilled: players.onHeroKilled,
        combatLevel: 2
      })
      players.sprites.add(hero)
      hero.events.onInputUp.add((player, pointer) => {
        const isOver = Phaser.Rectangle.containsPoint(player.getBounds(), pointer)
        if (isOver) {
          // this fixes a long standing bug
          // the first click on the game (clicking anywhere) will trigger this onInputUp event
          // so everytime we must ensure that the mouse is over the player  
          if (players.state !== c.states.swapping) {
            // not already swapping, we can initiate a swap
            swapPlayerToFront(player)
          }
        }
      })
      hero.updateInputEnabled(hero.z)
    })

    coinEmitter = this.game.add.emitter(0, 0, 100) // max 100 coins at once
    foreground.add(coinEmitter)

    coinEmitter.maxParticleScale = 0.3
    coinEmitter.minParticleScale = 0.3

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
  }

  function makeEndMenu () {
    const margin = 15
    const menuMargin = 11

    // menu bg
    const menu = game.make.graphics()
    const menuRect = {
      x: getCameraCenterX(),
      y: 0,
      width: 185,
      height: game.camera.height - menuMargin * 2
    }
    menuRect.y = menuMargin
    const fillColor = c.colors.menu.bg.fill
    const lineColor = c.colors.menu.bg.stroke
    menu.beginFill(fillColor, 1)
    menu.lineStyle(3, lineColor, 1)
    menu.drawRect(menuRect.x - menuRect.width / 2, menuRect.y, menuRect.width, menuRect.height)
    menu.anchor.y = 0.5

    const coinIconAndTextRect = {
      width: 50
    }
    const coinIcon = game.add.sprite(getCameraCenterX() - coinIconAndTextRect.width / 2, game.world.centerY - menuRect.height / 5.5, 'collectible1')
    coinIcon.scale.setTo(0.85)
    coinIcon.anchor.setTo(0.5)

    const coinsTextStyle = {
      font: '38px Arial',
      fontStyle: 'bold',
      fill: '#ffff0b',
    }

    const playAgainTextStyle = {
      fill: '#fafafa',
      font: '20px Arial'
    }
    const coinValue = game.coins.value + game.coins.bufferValue
    const coinText = game.make.text(coinIcon.width + margin / 3, 0, coinValue.toString(), coinsTextStyle)

    coinText.setScaleMinMax(1, 1)
    coinText.anchor.y = 0.42

    // play again button
    const playAgainButton = game.make.text(getCameraCenterX(), game.world.centerY + menuRect.height / 4, 'Play Again', _.assign({}, coinsTextStyle, playAgainTextStyle))
    playAgainButton.align = 'center'
    playAgainButton.anchor.setTo(0.5)

    coinIcon.addChild(coinText)
    menu.addChild(coinIcon)
    menu.addChild(playAgainButton)

    game.input.onDown.add(() => window.location.reload())

    return menu
  }

  function gameOver () {
    console.info('game over')
    const menu = makeEndMenu()
    menu.alpha = 0
    game.add.existing(menu)

    const delay = 600
    const duration = 1300
    const menuTween = game.add.tween(menu).to({alpha: 1}, duration, Phaser.Easing.Linear.None, true, delay)
    menuTween.onComplete.add(function () {
      game.paused = true
    }, game)
  }

  const gameOverOnce = _.once(gameOver)

  function createCoinsIncrementAnimation (coin, coinValue) {
    coin.alive = true
    coin.visible = true

    // tween the coin to the total score label
    const duration = 400

    const coinTween = game.add.tween(coin).to({
      x: game.coins.label.x,
      y: game.coins.label.y
    }, duration, Phaser.Easing.Exponential.In, true)

    game.add.tween(coin).to({
      alpha: 0.5
    }, duration * 0.85, Phaser.Easing.Exponential.In, true)

    // when animation finishes:
    // destroy score label
    // trigger the total score labels animation
    coinTween.onComplete.add(function () {
      coin.destroy()
      game.coins.labelTween.start()
      game.coins.bufferValue += coinValue
    }, game)
  }

  function updateHealthBar (hero, healthBar) {
    healthBar.setPercent(hero.health / hero.maxHealth * 100)
  }

  function renderHitNumberText (xPosition, numberValue, rgb = {r: 255, g: 255, b: 10}, gradient = true) {
    const textSplat = new VanishingText(game, numberValue.toString(), rgb, gradient)
    textSplat.x = xPosition
    textSplat.y -= 12

    const riseDistance = Math.min(63, (textSplat.top - game.camera.view.top))

    game.add.tween(textSplat).to({
      y: textSplat.y - riseDistance
    }, 900, Phaser.Easing.Quadratic.Out, true)

    textSplat.alphaTween.start()

    foreground.add(textSplat)
  }

  function dealDamage (attacker, victim, damageValue = null) {
    if (!_.get(victim, ['alive'])) {
      // the victim died as we tried to hit them :(
      return
    }
    const damage = attacker.combat.hitDamage()
    let damageDealt = damageValue || damage.value
    victim.damage(damageDealt)
    victim.combat.beginHealthRegenAt = game.time.now + (Phaser.Timer.SECOND * c.delays.HEALTH_REGEN)

    // DISABLED
    // renderHitNumberText(victim.x, damageDealt)

    updateHealthBar(victim, victim.healthBar)

    if (victim.info.team === c.teams.enemy) {
      // drop particles
      // dropCoins(victim, 2, null, false)
    }
  }

  const getCameraCenterX = () => {
    return game.camera.view.centerX
  }

  function swapPlayerToFront (playerToPush) {
    if (players.sprites.countLiving() === 1) {
      console.info('only 1 living, nothing to swap')
      return
    } else if (playerToPush.z === 0) {
      console.info('already at front, no need to swap')
      return
    }

    players.state = c.states.swapping

    const playerAtFront = players.sprites.getFirstAlive()

    const playerAtFrontX = playerAtFront.x

    const tweenOptions = [
      500, // duration
      Phaser.Easing.Quadratic.Out, // easing
      true, // auto start
    ]

    players.sprites.swap(playerToPush, playerAtFront)

    playerToPush.updateInputEnabled(playerToPush.z)
    playerAtFront.updateInputEnabled(playerAtFront.z)

    const tweenFrontPlayerBackwards = game.add.tween(playerAtFront).to({
      x: playerToPush.x,
    }, ...tweenOptions)

    const tweenPlayerToFront = game.add.tween(playerToPush).to({
      x: playerAtFrontX,
    }, ...tweenOptions)


    tweenPlayerToFront.onComplete.add(() => {
      players.state = ''
    })
    // the player being pushed to the front needs to wait to attack
    // this prevents a player from spam swapping their heroes to attack with each as often as possible
    playerToPush.combat.attackTimer = playerAtFront.combat.attackTimer
  }

  function spawnEnemy (placesFromFront = 0, combatLevel = 0, fighterClass = c.classes.warrior.key) {
    if (!fighterClass) {
      // pick a random class
      const classes = _.values(c.classes)
      const randomClass = classes[_.random(0, _.size(c.classes) - 1)]
      if (!randomClass.key) {
        fighterClass = c.classes.warrior.key
      } else {
        fighterClass = randomClass.key
      }
    }
    const x = getCameraCenterX() + (HERO_WIDTH / 2) + (COMBAT_DISTANCE / 2) + 1
    const newEnemy = new Fighter(enemies, {
      team: c.teams.enemy,
      combatLevel,
      fighterClass,
      x: x + DISTANCE_BETWEEN_HEROES * placesFromFront,
      y: game.world.height - HERO_HEIGHT,
      onHeroKilled: enemies.onHeroKilled
    })
    enemies.sprites.add(newEnemy)
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

  function foundChestSaga () {
    const rewards = game.add.group()

    // store players velocities
    const resumeVelocities = {}
    players.sprites.forEachAlive((player) => {
      const index = player.z
      // store velocity for later
      resumeVelocities[index] = _.cloneDeep(player.body.velocity)
      // set player velocity to zero (like pausing game, but tweens/animations are still played)
      player.body.velocity.setTo(0)
    })
    // tween chest to center of screen
    const tweenOptions = [
      1500, // duration
      Phaser.Easing.Exponential.Out, // easing
      true, // auto start
      35 // delay before start
    ]
    const centerChestTween = game.add.tween(chest).to({
      x: getCameraCenterX(),
      y: game.camera.centerY
    }, ...tweenOptions)
    game.add.tween(chest.anchor).to({
      x: 0.5,
      y: 0.4
    }, ...tweenOptions)
    game.add.tween(chest.scale).to({
      x: 1.1,
      y: 0.82
    }, ...tweenOptions)

    chest.inputEnabled = true
    chest.input.useHandCursor = true

    function openChest () {
      // open chest animation
      shakeXTween.stop()
      shakeYTween.stop()
      chest.loadTexture('chest_open')
      chest.anchor.x = 0.35
      chest.alpha = 0.8
      chest.input.useHandCursor = false
      chest.inputEnabled = false

      // spawn rewards
      rewards.add(rewardSprite(0))
      rewards.add(rewardSprite(1))
      // onComplete --> tween rewards to middle camera Y -- and calculated x positions (maybe I can use a group anchor 0.5,0.5 and the tween to will just work)

      rewards.setAll('inputEnabled', true)
      rewards.setAll('input.useHandCursor', true)
      rewards.forEach(reward => {
        reward.events.onInputDown.addOnce(reward.takeReward)
      })

      // kill the chest when the last reward is taken
      rewards.callAll('events.onDestroy.add', 'events.onDestroy', () => {
        if (rewards.countLiving() === 1) {
          // the last reward was being destroyed
          rewards.destroy()
          chest.destroy()
        }
      })

      // after showing the rewards for some time, take all the remaining rewards automatically
      game.time.events.add(Phaser.Timer.SECOND * 4, () => {
        // take all rewards not yet taken
        let i = 0
        rewards.forEachExists(reward => {
          // delay between taking each reward
          game.time.events.add(Phaser.Timer.SECOND * 0.5 * i, () => {
            reward.takeReward()
          })
          i++
        })

        // set player velocities back to stored values
        players.sprites.forEachAlive((player) => {
          const index = player.z
          player.body.velocity.setTo(resumeVelocities[index])
        })

        players.state = c.states.walking
      }, game).autoDestroy = true
    }

    const openChestOnce = _.once(openChest)

    game.time.events.add(tweenOptions[0] * 0.8, () => {
      // click to open chest
      chest.events.onInputDown.addOnce(openChestOnce)
    })

    centerChestTween.onComplete.add(() => {
      // auto open the chest after a delay
      game.time.events.add(c.delays.AUTO_CLICK * Phaser.Timer.SECOND, openChestOnce)
    })

    function wiggle (aProgress, freq1, freq2) {
      // return Math.sin(aProgress)
      const current1 = aProgress * Math.PI * 2 * freq1
      const current2 = aProgress * (Math.PI * 2 * freq2 + Math.PI / 2)

      return Math.sin(current1) * Math.cos(current2)
    }
    const frequency = 6.2
    const shakeXTween = game.add.tween(chest).to({ x: chest.x + 4 }, tweenOptions[0], (k) => wiggle(k, frequency, frequency), true, 0, -1)
    const shakeYTween = game.add.tween(chest).to({ y: chest.y + 3 }, tweenOptions[0], (k) => wiggle(k, frequency, frequency), true, 0, -1)

    function rewardSprite (index = 0) {
      const reward = game.add.sprite(0, 0, 'reward_coins')
      reward.x = getCameraCenterX() + index * (c.sizes.reward.width + 30) - c.sizes.reward.width / 2 - 15
      reward.y = game.camera.height / 2
      reward.anchor.setTo(0.5)

      reward.isCoins = true
      reward.rewardValue = 25 // number of coins

      reward.takeReward = function () {
        // destroy reward -- if coin reward, add to coin total
        const rewardClickTweens = []
        rewardClickTweens.push(game.add.tween(reward.scale).to({
          x: 0,
          y: 0
        }, 500))
        rewardClickTweens[0].onComplete.add(() => {
          reward.destroy()
        })

        if (reward.isCoins) {
          createCoinsIncrementAnimation(reward, reward.rewardValue)
        }
        _.forEach(rewardClickTweens, tween => tween.start())
      }
      return reward
    }
  }

  function update () {
    // background.width = this.game.world.width

    this.game.coins.label.x = getCameraCenterX()
    const coinBuffer = this.game.coins.bufferValue
    if (coinBuffer > 0) {
      if (coinBuffer > 50) {
        this.game.coins.value += 5
      } else {
        this.game.coins.value += 1
      }
      this.game.coins.label.setText(this.game.coins.value.toString())
      this.game.coins.bufferValue--
    }

    // debugging
    lineCameraMiddle.centerOn(getCameraCenterX(), this.game.world.height / 2)
    const cursors = this.game.input.keyboard.createCursorKeys()

    const distanceToNextFight = this.game.world.width - (this.game.camera.x + this.game.camera.width)

    const firstPlayer = players.sprites.getFirstAlive()
    const firstEnemy = enemies.sprites.getFirstAlive()

    const forEachAliveInTeam = (heroTeam, execute, frontToBack = false) => {
      let heroes
      if (heroTeam instanceof Array) {
        heroes = heroTeam
      } else if (heroTeam === c.teams.player) {
        heroes = players.sprites
      } else if (heroTeam === c.teams.enemy) {
        heroes = enemies.sprites
      }

      heroes.forEachAlive((hero) => {
        const index = heroes.getIndex(hero)
        execute(hero, index)
      })
    }

    const breatheFireAttack = (attacker, targetTeam = c.teams.enemy, fixedDamageValue) => {
      // place fire breathe on side towards other team
      const teamFlip = attacker.info.xDirection
      const flamesRect = {
        x: getCameraCenterX() - teamFlip * 12,
        y: game.world.height - attacker.height * 0.7
      }
      const flames = this.game.make.sprite(flamesRect.x, flamesRect.y, 'firebreath')
      effects.add(flames)
      // flames.fixedToCamera = true

      // positioning
      flames.angle = teamFlip * 92
      flames.scale.setTo(0.8, 1.5)
      flames.anchor.x = 0.5
      flames.anchor.y = 1

      // aesthetics
      flames.animations.add('flames')
      flames.animations.play('flames', 45, true)
      flames.alpha = 0.63

      flames.lifespan = Math.min((Phaser.Timer.SECOND / attacker.combat.attackSpeed) * 1.1, Phaser.Timer.SECOND * 1.0)
      flames.events.onKilled.add(() => flames.destroy())

      this.game.add.existing(flames)

      const damageValue = fixedDamageValue || attacker.combat.hitDamage().value

      forEachAliveInTeam(targetTeam, victim => {
        dealDamage(attacker, victim, damageValue)
      })
    }

    const burnTeamAbilityTick = (attacker, targetTeam = c.teams.enemy, fixedDamageValue, ability) => {
      const damageValue = fixedDamageValue || attacker.combat.hitDamage().value
      forEachAliveInTeam(targetTeam, victim => {
        const firePosition = {
          x: 0,
          y: victim.height / 2 - 6
        }
        const fireSprite = this.game.make.sprite(firePosition.x, firePosition.y, 'flames')
        fireSprite.scale.setTo(1.5, 1)
        fireSprite.anchor.setTo(0.5, 0)
        fireSprite.lifespan = Phaser.Timer.SECOND * ability.duration
        fireSprite.animations.add('flicker')
        fireSprite.animations.play('flicker', 15, true)
        fireSprite.events.onKilled.add(() => fireSprite.destroy())
        victim.addChild(fireSprite)
        dealDamage(attacker, victim, damageValue)
      })
    }

    const attackHero = (attacker, victim) => {
      if (!_.get(victim, ['alive'])) return
      // perform attack based on class
      switch (attacker.info.fighterClass) {
        case c.classes.warrior.key:
          // attack animation
          attacker.body.velocity.y = -125
          dealDamage(attacker, victim)
          break
        case c.classes.mage.key:
          attacker.body.velocity.y = -85
          breatheFireAttack(attacker, victim.info.team)
          break
      }

      attacker.combat.attackTimer = game.time.now + (1 / attacker.combat.attackSpeed) * 1000
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
      let healSplatText = '+'
      if (roundedHealValue > 3) {
        healSplatText += roundedHealValue
      }

      // TEMP need to render heal vanishing text
      updateHealthBar(hero, hero.healthBar)

      if (hero.health > hero.maxHealth) {
        hero.health = hero.maxHealth
      }
    }

    function castAbility (hero, ability, abilityPerLevel) {
      const originalCombatStats = _.clone(hero.combat)
      switch (ability.name) {
        case c.classes.mage.abilities.passive.name:
          hero.body.velocity.y = 1000
          hero.body.velocity.y = -100
          hero.abilities.passive.active = true
          
          const targetTeam = (hero.info.team === c.teams.player) ? c.teams.enemies : c.teams.player
          const tickDamageValue = ((hero.minHitDamage + hero.maxHitDamage) / 2) / ability.repeatCount

          function burnTick () {
            burnTeamAbilityTick(hero, targetTeam, tickDamageValue, ability)
            // update energy bar (to zero) after the first damage is applied
            hero.energyBar.setPercent(hero.energy)
          }

          const endTime = Phaser.Timer.SECOND * ability.duration * ability.repeatCount
          const burnTimer = game.time.create(true)

          burnTimer.repeat(Phaser.Timer.SECOND * ability.duration, ability.repeatCount, burnTick, hero)
          burnTimer.add(endTime, () => {
            hero.abilities.passive.active = false
            hero.combat = _.assign({}, hero.combat, originalCombatStats)
          })
          burnTimer.start()
          break

        case c.classes.warrior.abilities.passive.name:
          // put hero on the ground
          hero.body.velocity.y = 1000
          // go beserk
          hero.abilities.passive.active = true
          hero.loadTexture(`${hero.info.team}_${hero.info.fighterClass}_active`)
          hero.combat.attackTimer = game.time.now // start attacking immediately
          hero.combat.attackSpeed = 1.7
          hero.combat.maxHitDamage *= 1.2
          hero.combat.critChance = 1

          function stopBeserking () {
            hero.energyBar.setPercent(hero.energy)
            const warrior = this
            warrior.combat = _.assign(warrior.combat, originalCombatStats)
            // wait before attacking again
            warrior.combat.attackTimer = game.time.now + Math.min(Phaser.Timer.SECOND, Phaser.Timer.SECOND / warrior.combat.attackSpeed) 
            warrior.abilities.passive.active = false
            warrior.loadTexture(`${warrior.info.team}_${warrior.info.fighterClass}`)
          }
          // stop beserking when duration is up
          game.time.events.add(Phaser.Timer.SECOND * ability.duration, stopBeserking, hero).autoDestroy = true
          break
      }
    }

    function walkAll (team) {
      let defaultXDirection
      if (team === c.teams.player) {
        defaultXDirection = 1
      } else if (team === c.teams.enemy) {
        defaultXDirection = -1
      }

      const executeOnHero = hero => {
        const xDirection = (typeof hero.xDirection === 'number') ? hero.xDirection : defaultXDirection
        hero.body.velocity.x = HERO_MOVEMENT_VELOCITY * xDirection
      }

      forEachAliveInTeam(team, executeOnHero)
    }

    function distanceToMiddle (sprite) {
      const d1 = Math.abs(sprite.left - getCameraCenterX())
      const d2 = Math.abs(sprite.right - getCameraCenterX())
      return Math.min(d1,d2)
    }

    function updateHero (hero, heroGroup) {
      const index = hero.z
      if (game.time.now >= hero.combat.beginHealthRegenAt) {
        healHero(hero, hero.healthRegen)
        hero.healthBar.setPercent(hero.health / hero.maxHealth * 100)
      }

      const isAtFront = hero.z === heroGroup.getFirstAlive().z
      if (hero.energy && !isAtFront) {
        // lose energy points
        // hero.energy -= 0.2
        // hero.energyBar.setPercent(hero.energy)
      }

      hero.body.velocity.x = 0

      const passiveAbility = _.get(hero, ['abilities', 'passive'])
      if (passiveAbility) {
        if (hero.energy >= hero.maxEnergy) {
          // passive ability ready to use
          // set energy to zero, but let the castAbility function decide when to update the energyBar displayed
          hero.energy = 0
          const abilityPerLevel = _.get(hero, ['abilitiesPerLevel', 'passive'])
          castAbility(hero, passiveAbility, abilityPerLevel)
        }
      }
    }

    if (firstPlayer) {
      players.sprites.forEachAlive(updateHero, null, players.sprites)
    }

    if (firstEnemy) {
      enemies.sprites.forEachAlive(updateHero, null, enemies.sprites)
    }

    const playersPreviousState = players.state
    // heroes do not fight or move while players are swapping
    // if (players.state !== c.states.swapping) {
      // fighting, regrouping or walking
    if (firstPlayer && !firstEnemy) {
      // no enemies, continue moving through the level
      if (Math.abs(firstPlayer.bottom - this.game.world.height) < 2) {
        // first player is on ground
        players.state = c.states.walking
      }
    } else if (firstPlayer && firstEnemy) {

      const playerInCombatRange = distanceToMiddle(firstPlayer) <= COMBAT_DISTANCE / 2
      const enemyInCombatRange = distanceToMiddle(firstEnemy) <= COMBAT_DISTANCE / 2

      if (playerInCombatRange && enemyInCombatRange) {
        players.state = c.states.fighting
        enemies.state = c.states.fighting
      } else if (!playerInCombatRange) {
        players.state = c.states.regrouping
        enemies.state = c.states.waitingOnEnemy
      } else if (!enemyInCombatRange) {
        enemies.state = c.states.regrouping
        players.state = c.states.waitingOnEnemy
      }
    }
    if (playersPreviousState === c.states.swapping) {
      players.state = playersPreviousState
      enemies.state = c.states.waitingOnEnemy
    }

    // dead state overwrites any state previously set
    if (!firstPlayer) {
      players.state = c.states.dead
    }
    if (!firstEnemy) {
      enemies.state = c.states.dead
    }

    switch (enemies.state) {

      case c.states.regrouping:
        walkAll(c.teams.enemy)
        break

      case c.states.fighting:
        const hero = firstEnemy
        if (hero.combat.attackTimer <= game.time.now) {
          attackHero.call(this, hero, firstPlayer)
        }
        break

      case c.states.dead:
        if (distanceToNextFight === 0) {
          for (let count = 1; (count <= zone + 1) && (count <= MAX_ENEMIES_PER_ZONE); count++) {
            spawnEnemy(count - 1, zone)
          }
        }
        break
    }

    switch (players.state) {

      case c.states.walking:
        walkAll(c.teams.player)
        // focus camera on front player
        this.game.camera.focusOnXY(firstPlayer.x + (COMBAT_DISTANCE / 2 + HERO_WIDTH / 2), firstPlayer.y + 0)
        break

      case c.states.regrouping:
        walkAll(c.teams.player)
        break

      case c.states.fighting:
        const hero = firstPlayer
        if (hero.combat.attackTimer <= game.time.now) {
          attackHero.call(this, hero, firstEnemy)

          // gain energy every time hero attacks
          if (!_.get(hero, ['abilities', 'passive', 'active'])) {
            hero.energy += (hero.maxEnergy / 5)
            if (hero.energy > hero.maxEnergy) {
              hero.energy = hero.maxEnergy
            }
            hero.energyBar.setPercent(hero.energy / hero.maxEnergy * 100)
          }
        }
        break

      case c.states.dead:
        gameOverOnce()
        break
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
    if (window.location.href.indexOf('surge.sh') === -1) {
      // staging
      this.game.debug.geom(lineCameraMiddle, 'grey')
      this.game.debug.text(players.state, 5, 20, 'blue')
      this.game.debug.text(enemies.state, this.game.camera.view.width - 110, 20, 'orange')
    }

    /*let i = 0
    players.sprites.forEachAlive(player => {
      const childZ = player.z
      this.game.debug.text(childZ, (game.camera.width/2) - 40 - i * (HERO_WIDTH + 11), 30, 'black')
      this.game.debug.text(player.info.fighterClass, (game.camera.width/2) - 70 - i * (HERO_WIDTH + 10), 12, 'black', {align: 'center'})
      i++
    })*/
    // this.game.debug.spriteInputInfo(players.sprites.getFurthestFrom({x: game.camera.view.centerX, y: 0}), this.game.camera.width / 2 - 50, 20, 'yellow')
  }
}
