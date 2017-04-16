/* global Phaser */
const StyledText = require('./Text/StyledText')

const Constants = require('../constants')
const c = new Constants()

function UpgradesPanel (game, parentGroup, buttonOnClicks) {
  if (!(buttonOnClicks instanceof Array)) {
    buttonOnClicks = [
      function() {
        console.info('not set. index:', 0, '\nuse .setButtonClick(0, onClickFunc) to set')
      },
      function() {
        console.info('not set. index:', 1, '\nuse .setButtonClick(1, onClickFunc) to set')
      }
    ]
  }

  const gfx = game.make.graphics()
  this.gfx = gfx

  const rect = new Phaser.Rectangle(0, 0, 140, 120)
  // container
  gfx.lineStyle(2, 0x593805, 1)
  gfx.beginFill(0x976109)
  gfx.drawRect(rect.x, rect.y, rect.width, rect.height)

  /* EACH LEVEL UP PANEL */
  gfx.beginFill(0xf1e29d)
  // top panel
  gfx.drawRect(rect.x + 5, rect.y + 5, rect.width - 10, (rect.height - 10) / 2)
  // bottom panel
  gfx.drawRect(rect.x + 5, rect.y + (rect.height + 5) / 2, rect.width - 10, (rect.height - 10) / 2)

  /* BUTTON - LVL UP */
  this.buttons = game.add.group()
  // button generator!
  const makeButton = (index, offsetY = 0) => {
    const rect0 =  new Phaser.Rectangle(rect.x + 5 + 5, offsetY + rect.y + 5 + 5, (rect.width - 10 - 10) * 0.5, (rect.height - 10 - 20) / 2)
    const but0 = new Phaser.Button(game, rect0.x, rect0.y, 'button_default', buttonOnClicks[index], this, 1, 0, 2)
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
  const button0 = makeButton(0, 0)
  const button1 = makeButton(1, rect.y + (rect.height - 5) / 2)

  /* HERO IMAGE */
  const image0 = game.make.image(button0.right + 5, button0.top + 6, c.emotes.EleGiggle.id)
  image0.height = button0.height - 8
  image0.top = button0.top
  image0.width = rect.width - button0.width - 10 - 25
  const image1 = game.make.image(button1.right + 5, button1.top + 6, c.emotes.EleGiggle.id)
  image1.height = button1.height - 6
  image1.top = button1.top
  image1.width = rect.width - button1.width - 10 - 25

  this.images = [
    image0,
    image1
  ]

  gfx.addChild(image0)
  gfx.addChild(image1)

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

UpgradesPanel.prototype.setCostDisplay = function (index, amountText, unitIconImageKey) {
  console.info(arguments)
  const button = this.getButtonAt(index)
  if (button) {
    button.getChildAt(1).text = amountText
    button.getChildAt(2).setTexture(unitIconImageKey, true)
  } else {
    console.error(`Cannot set cost text as there is no button at index ${index}, amountText: ${amountText}`)
  }
}

UpgradesPanel.prototype.setHeroImage = function (index, imageKey, frame = null) {
  this.images[index].loadTexture(imageKey, frame)
}


module.exports = UpgradesPanel
