function StyledText (game, textString, rgb, gradient, styleOverwite) {
  this.rgbObjToString = function () {

  }
  const textHeight = 34
  const th = textHeight

  const textStyle = Object.assign({
    font: `bold ${th}px Arial`,
    fill: this.rgbToColorString(rgb),
    stroke: 'rgb(10, 10, 10)',
    strokeThickness: th / 26,
  }, styleOverwite)

  Phaser.Text.call(this, game, 0, 100, textString, textStyle)

  if (gradient) {
    const rgbEnd = {
      r: Math.floor(rgb.r),
      g: Math.floor(rgb.g - Math.min(rgb.g * 0.55, 110)),
      b: Math.floor(rgb.b * 1.3),
    }

    const grd = this.context.createLinearGradient(0, 0, 0, this.height)

    //  Add in 2 color stops
    grd.addColorStop(0.05, this.rgbToColorString(rgb))   
    grd.addColorStop(1, this.rgbToColorString(rgbEnd))

    //  And apply to the Text
    this.fill = grd;
  }

}

StyledText.prototype = Object.create(Phaser.Text.prototype)
StyledText.prototype.constructor = StyledText
StyledText.prototype.rgbToColorString = function ({r, g, b}) {
  return `rgb(${r}, ${g}, ${b})`
}

module.exports = StyledText
