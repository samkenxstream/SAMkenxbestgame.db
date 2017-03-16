/* global Phaser */
// Phaser version 2.6.2 - "Kore Springs"
window.onload = function () {
  const TwitchWidth = 847
  const GameHeight = 220
  const game = new Phaser.Game(TwitchWidth, GameHeight, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update
  })

  function preload () {
    game.load.image('logo', 'images/stickman_small.png')
    game.load.image('background', 'images/background1.png')
  }

  function create () {
    game.add.sprite(0, 0, 'background')
    const logo = game.add.sprite(game.world.centerX, game.world.centerY, 'logo')
    logo.anchor.setTo(0.5, 0)
  }

  function update () {
  }
}
