/* eslint-disable quotes, comma-dangle */

/*
 * All constants for the game are stored here
 *
 * Time values for delays, cooldowns, etc are in seconds
 *
 */
function Constants (staging = false) {
  this.teams = {
    "player": "player",
    "enemy": "enemy"
  }

  this.states = {
    "walking": "walking",
    "fighting": "fighting",
    "swapping": "--swapping--",
    "regrouping": "regrouping",
    "waitingOnEnemy": "waiting on enemy",
    "openingChest": "opening a chest!",
    "dead": "dead"
  }

  this.classes = {
    "default": {
      "maxHealth": 130,
      // "maxHealth": 3000,
      "healthRegen": 0.5,
      "combat": {
        "range": 0,
        "attackSpeed": 0.45,
        // "attackSpeed": 1.7,
        "minHitDamage": 40.0,
        "maxHitDamage": 50.0,
        "critChance": 0.10,
        attackTimer: null
      },
      "combatPerLevel": {
        "attackSpeed": 0.015,
        "minHitDamage": 3.0,
        "maxHitDamage": 3.0,
        "critChance": 0.01,
      },
      "extraPerLevel": {
        "health": 47
      }
    }
  }
  const def = this.classes.default
  this.classes = Object.assign({}, this.classes, {
    "warrior": {
      "key": "warrior",
      "combatPerLevel": {
        "minHitDamage": def.combatPerLevel.minHitDamage * 1.7,
        "maxHitDamage": def.combatPerLevel.maxHitDamage * 1.7,
        "critChance": 0.03
      },
      abilities: {
        passive: {
          name: 'beserk',
          duration: 2.3,
          active: false
        }
      },
    },
    "mage": {
      "key": "mage",
      "maxHealth": def.maxHealth * (2 / 3),
      "gravityModifier": 0.4,
      "combat": {
        "minHitDamage": def.combat.minHitDamage * (2 / 3),
        "maxHitDamage": def.combat.maxHitDamage * (2 / 3),
        "critChance": 0.07
      },
      abilities: {
        passive: {
          name: 'apply_burn',
          duration: 0.8,
          repeatCount: 3
        }
      },
    },
    "archer": {
      "key": "archer",
      "combat": {
        "attackSpeed": (def.combat.attackSpeed / 1.3)
      },
    },
    "priest": {
      "key": "priest",
      "maxHealth": Math.ceil(def.maxHealth * (18 / 30)),
      "gravityModifier": 0.6,
      "combat": {
        "range": 0,
        "attackSpeed": def.combat.attackSpeed * 1.5,
        "minHitDamage": def.combat.minHitDamage / 2,
        "maxHitDamage": def.combat.maxHitDamage / 2,
        "critChance": 0
      },
      "combatPerLevel": {
        "attackSpeed": def.combatPerLevel.attackSpeed * 1.5,
        "critChance": 0
      },
      abilities: {
        passive: {
          "name": "heal_team",
          "value": def.maxHealth / 9,
          "cooldown": 6.0,
          "timer": null
        }
      },
      abilitiesPerLevel: {
        passive: {
          "value": 12.0,
          "cooldownMultiplier": 0.9
        }
      }
    }
  })

  this.emotes = {
    default: {
      id: null,
      sentiment: 0, // from -1.00 to +1.00
      funny: 0 // from serious (-1.0) to hilarious (+1.0)
    },
    KappaPride: {
      id: "KappaPride",
      sentiment: 0.5,
      funny: 0.4
    },
    EleGiggle: {
      id: "EleGiggle",
      sentiment: 0.3,
      funny: 0.8
    },
    FeelsBadMan: {
      id: "FeelsBadMan",
      sentiment: -0.6,
      funny: -0.7
    }
  }
  this.emoteExists = (emoteId) => (
    !!_.get(this.emotes, [emoteId, 'id'])
  )

  this.projectiles = {
    "arrow": {
      "key": "arrow"
    },
    "fireball": {
      "key": "fireball",
      "scale": 0.4
    }
  }

  this.colors = {
    healthBars: {
      player: {
        bg: {
          color: 'transparent'
        },
        bar: {
          color: '#48ad05'
        }
      },
      enemy: {
        bg: {
          color: 'transparent'
        },
        bar: {
          color: '#48ad05'
          // color: '#e2b100'
        }
      }
    },
    resourceBar: {
      bg: {
        color: 'transparent',
        strokeColor: 'red'
      },
      bar: {
        color: 'red',
        strokeColor: 'red'
      }
    },
    "hitSplat": {
      "default": {
        "fill": 0xba0c0c,
        "stroke": 0x740606,
        "fillCritical": 0xba0c0c,
        "strokeCritical": 0xba0c0c
      }
    },
    "menu": {
      "bg": {
        "fill": 0x222222,
        "stroke": 0xbbbbbb
      }
    },
    "green": 0x0cc50c,
    "darkGreen": 0x0cac0c
  }

  this.sizes = {
    "reward": {
      "width": 104
    }
  }

  this.delays = {
    "AUTO_CLICK": 3.8,
    "HEALTH_REGEN": 5.5,
  }
}

Constants.prototype.constructor = Constants

module.exports = Constants
