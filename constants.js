/* eslint-disable */
// keep this file in json syntax so it is easier later when we need it as a json
module.exports = () => ({
  "teams": {
    "player": "player",
    "enemy": "enemy"
  },
  "classes": {
    "default": {
      "maxHealth": 45,
      "combat": {
        "range": 0,
        "attackSpeed": 0.25,
        "minHitDamage": 3,
        "maxHitDamage": 6,
        "critChance": 0.15,
      },
      "combatPerLevel": {
        "attackSpeed": 0.05,
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
        "attackSpeed": 0.32
      },
      "combatPerLevel": {
        "attackSpeed": 0.05
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
        "attackSpeed": 0.5,
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
})
