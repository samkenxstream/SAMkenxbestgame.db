module.exports = function (game) {
  const Menu = function () {}

  Menu.prototype = {
    preload: function () {
      // this.loadImages() etc
      const margin = 15
      const coinIcon = game.add.sprite(game.world.centerX, game.world.centerY, 'collectible1')
      coinIcon.scale.setTo(0.4)
      coinIcon.anchor.setTo(0.5)

      const coinsTextStyle = {
        font: '28px Arial',
        fill: '#ffff2b',
        stroke: 'black',
        strokeThickness: 2.3
      }
      const coinText = game.make.text(coinIcon.width + margin, 0, game.coins.value.toString(), coinsTextStyle)
      coinText.anchor.y = 0.4

      coinIcon.addChild(coinText)
      coinText.setScaleMinMax(1, 1)

      game.add.text(100, 0, 'Play Again')
    }
  }

  return Menu
}
