/* eslint-disable */
// keep this file in json syntax so it is easier later when we need it as a json
module.exports = () => ({
  "HEALTH_REGEN_DELAY": 6.0,
  "teams": {
    "player": "player",
    "enemy": "enemy"
  },
  "states": {
    "walking": "walking",
    "fighting": "fighting",
    "swapping": "swapping - shouldnt stay on this state",
    "regrouping": "moving to fight",
    "waitingOnEnemy": "waiting for enemy",
    "openingChest": "opening a chest!",
    "dead": "dead"
  },
  "classes": {
    "default": {
      "maxHealth": 300,
      "healthRegen": 1,
      "combat": {
        "range": 0,
        "attackSpeed": .35,
        "minHitDamage": 30.0,
        "maxHitDamage": 60.0,
        "critChance": .12,
      },
      "combatPerLevel": {
        "attackSpeed": .05,
        "minHitDamage": 5.0,
        "maxHitDamage": 5.0,
        "critChance": .01,
      },
      "extraPerLevel": {
        "health": 47
      }
    },
    "warrior": {
      "key": "warrior",
      "combat": {
        "range": 0
      },
      "combatPerLevel": {
        "minHitDamage": 9.0,
        "maxHitDamage": 9.0,
        "critChance": .03
      }
    },
    "archer": {
      "key": "archer",
      "combat": {
        "range": 2,
        "attackSpeed": (.35 / 1.3)
      },
      "combatPerLevel": {
        "attackSpeed": .04
      }
    },
    "mage": {
      "key": "mage",
      "maxHealth": 180,
      "gravityModifier": .24,
      "combat": {
        "range": 1,
        "attackSpeed": (.35 / 1.8),
        "critChance": .1
      }
    },
    "priest": {
      "key": "priest",
      "maxHealth": 240,
      "gravityModifier": .6,
      "combat": {
        "range": 0,
        "attackSpeed": 0.6,
        "minHitDamage": 30.0,
        "maxHitDamage": 45.0,
        "critChance": 0
      },
      "combatPerLevel": {
        "attackSpeed": .05,
        "minHitDamage": 2.0,
        "maxHitDamage": 2.0,
        "critChance": 0
      },
      "abilities": {
        "passive": {
          "name": "heal_team",
          "value": 40.0,
          "cooldown": 6.0,
          "timer": null
        }
      },
      "abilitiesPerLevel": {
        "passive": {
          "value": 12.0,
          "cooldownMultiplier": 0.9
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
    "menu": {
      "bg": {
        "fill": 0x222222,
        "stroke": 0xbbbbbb
      }
    },
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
  },
  "sizes": {
    "reward": {
      "width": 104
    }
  },
  "delays": {
    "autoClick": 3800
  }
})
