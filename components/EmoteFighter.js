/* global c */
const defaultClass = 'warrior'

function Emote ({emoteId, x, y, combatLevel = 0, maxHealth = null, onKilled}) {
  if (c.emotes.hasOwnProperty(emoteId)) {
    console.error(`Cannot make emote sprite with invalid emoteId '${emoteId}' at xy (${x}, ${y})`)
    return
  }
  Phaser.Sprite.call(this, game, x, y, emoteId)

  const baseClass = c.classes[defaultClass]
  const baseDefault = c.classes.default

  this.anchor.setTo(0.5, 0)

  this.info = {
    team: c.teams.enemy,
    defaultClass,
    xDirection: -1
  }

  // Physics
  game.physics.arcade.enable(this)
  this.body.collideWorldBounds = true
  this.body.gravity.y = baseClass.gravityModifier ? baseClass.gravityModifier * 700 : 700

  // health and healthRegen
  const extraHealthPerLevel = c.classes.default.extraPerLevel.health || 0
  const baseMaxHealth = baseClass.maxHealth || baseDefault.maxHealth
  const baseHealthRegen = 0
  const extraHealthRegenPerLevel = 0
  this.maxHealth = Math.round(baseMaxHealth + (extraHealthPerLevel * combatLevel)) * 0.8 // 80% because its emote
  this.health = this.maxHealth
  this.healthRegen = 0

  console.log(`${emoteId} ${this.info.defaultClass}, ${this.health} hp`)

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
    width: 40,
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

  // COMBAT and HIT DAMAGE

  const baseCombatStats = _.assign({}, baseDefault.combat, baseClass.combat, {
    attackTimer: 0,
    level: combatLevel
  })

  const defaultExtraPerLevel = c.classes.default.combatPerLevel
  const classExtraPerLevel = c.classes[defaultClass].combatPerLevel
  const extraPerLevel = _.assign({}, defaultExtraPerLevel, classExtraPerLevel)

  const increasedCombatStats = _.mapValues(extraPerLevel, (statValue, stat) => baseCombatStats[stat] + statValue * combatLevel)

  const actualCombatStats = _.assign({}, baseCombatStats, increasedCombatStats)
  this.combat = actualCombatStats
  this.combat.hitDamage = () => {
    if (Math.random() < this.combat.critChance) {
      // we got a critical hit!
      return { value: Math.ceil(this.combat.maxHitDamage * 1.5), critical: true }
    }
    const randomDamage = Math.ceil(this.combat.minHitDamage + (this.combat.maxHitDamage - this.combat.minHitDamage) * Math.random())
    return { value: randomDamage, critical: false }
  }
  this.events.onKilled.add(onHeroKilled.bind(teamObject, this))
}

Fighter.prototype = Object.create(Phaser.Sprite.prototype);
Fighter.prototype.constructor = Fighter;