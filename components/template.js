function StyledText (game, textString) {

  Phaser.Text.call(this, game, 0, 0, textString)

  console.info('created text:', this.text)

}

StyledText.prototype = Object.create(Phaser.Text.prototype)
StyledText.prototype.constructor = StyledText

module.exports = StyledText
