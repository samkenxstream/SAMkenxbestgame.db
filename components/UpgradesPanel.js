/* global Phaser */
const StyledText = require('./Text/StyledText')

const Constants = require('../constants')
const c = new Constants()

function UpgradesPanel (game, parentGroup, buttonOnClicks) {
  if (!(buttonOnClicks instanceof Array)) {
    buttonOnClicks = [
      function() {
        return null;
      },
      function() {
        return null;
      }
    ]
  }
  // level up panel
  const gfx = game.make.graphics()

  const rect = new Phaser.Rectangle(0, 0, 140, 120)
  // container
  gfx.lineStyle(2, 0x593805, 1)
  gfx.beginFill(0x976109)
  gfx.drawRect(rect.x, rect.y, rect.width, rect.height)

  // inner panels
  gfx.beginFill(0xf1e29d)
  // top panel
  gfx.drawRect(rect.x + 5, rect.y + 5, rect.width - 10, (rect.height - 10) / 2)
  // bottom panel
  gfx.drawRect(rect.x + 5, rect.y + (rect.height + 5) / 2, rect.width - 10, (rect.height - 10) / 2)

  // buttons
  this.buttons = game.add.group()
  // button generator!
  const makeButton = (offsetY) => {
    const rect0 =  new Phaser.Rectangle(rect.x + 5 + 5, offsetY + rect.y + 5 + 5, (rect.width - 10 - 10) * 0.5, (rect.height - 10 - 20) / 2)
    const but0 = new Phaser.Button(game, rect0.x, rect0.y, 'button_default', buttonOnClicks[0], this, 1, 0, 2)
    but0.width = rect0.width
    but0.height = rect0.height
    // lvl up text
    const text0 = new StyledText(
      game,
      'LVL UP',
      { r: 0, g: 0, b: 0 }
    )
    text0.x = 5.5
    text0.y = 3.5
    text0.width = rect0.width + 5
    text0.fontSize = 22
    text0.height = text0.fontSize

    // amount number text
    const textCostAmount = new StyledText(
      game,
      '100',
      { r: 247, g: 247, b: 50 }, false, {
      stroke: '#3a5417',
      strokeThickness: 3,
      font: `bold ${rect0.height / 2 - 5}px Arial`,
    })
    textCostAmount.setTextBounds(4, rect0.height / 2 - 9, rect0.width * 0.55, rect0.height * 0.6)
    textCostAmount.boundsAlignH  = 'right'

    // curreny aka unit icon
    const unitIconWidth = rect0.width * 0.3
    const unitIcon = game.make.sprite(rect0.width - 6, rect0.height - 3, c.emotes.KappaPride.id)
    unitIcon.anchor.setTo(1, 1.35)
    unitIcon.width = unitIconWidth
    unitIcon.height = unitIconWidth
    
    but0.addChild(text0)
    but0.addChild(textCostAmount)
    but0.addChild(unitIcon)
    this.buttons.add(but0)
    return but0
  }
  const button0 = makeButton(0)
  const button1 = makeButton(rect.y + (rect.height - 5) / 2)


  parentGroup.add(gfx)
  parentGroup.add(this.buttons)
}

UpgradesPanel.prototype = Object.create(null);
UpgradesPanel.prototype.constructor = UpgradesPanel

UpgradesPanel.prototype.getButtons = function () {
  return this.buttons
}
UpgradesPanel.prototype.getButtonAt = function (index) {
  return this.buttons.getChildAt(index)
}

UpgradesPanel.prototype.setButtonEnabled = function (index, enabled) {
  this.getButtonAt(index).inputEnabled = enabled
}
UpgradesPanel.prototype.setButtonClick = function (index, onClickFunc) {
  this.getButtonAt(index).onInputDown = onClickFunc
}
UpgradesPanel.prototype.setCostText = function (index, newText) {
  const button = this.getButtonAt(index)
  if (button) button.getChildAt(1).text = newText
  else console.error(`Cannot set cost text as there is no button at index ${index}, newText: ${newText}`)
}


module.exports = UpgradesPanel
