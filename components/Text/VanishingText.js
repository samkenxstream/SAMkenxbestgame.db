const StyledText = require('./StyledText')

function VanishingText (game, textString, rgb = {r: 250, g: 245, b: 10}, gradient = false) {

  const styleOverwrite = {
    boundsAlignH: 'center',
    boundsAlignV: 'middle'
  }
  StyledText.call(this, game, textString, rgb, gradient, styleOverwrite)

  this.anchor.setTo(0.5)
  this.setTextBounds(0, 0, this.width, 30)

  const duration = 900
  this.alphaTween = game.add.tween(this).to({
    alpha: 0
  }, duration * 0.7, Phaser.Easing.Quadratic.In).delay(duration * 0.3)

  this.lifespan = duration
  this.events.onKilled.add(() => this.destroy(true), this)
}

VanishingText.prototype = Object.create(StyledText.prototype)
VanishingText.prototype.constructor = VanishingText

module.exports = VanishingText
