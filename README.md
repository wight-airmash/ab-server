# Experimental branch: fully invisible prowlers (by xplay)

Finished changes:

- Invisible players are not shown on the minimap/radar for other players outside the viewport (screen).
- Invisible prowlers see nobody on mimimap outside their viewports (screens).

## How originally minimap works

Every 5 seconds the server simultaneously sends to all players packets (named `SCORE_BOARD`) with the following (and identical for all players) data:

```js
{
  // Sorted by scores array.
  data: [
    {
      id: 1050, // Player id.
      score: 540, // Player score.
      level: 0, // Player account level.
    },
    {
      id: 48721,
      score: 315,
      level: 0,
    },
    {
      id: 15401,
      score: 25,
      level: 0,
    }
  ],

  // Sorted according to array `data`
  rankings: [
    {
      id: 1050, // Player id.
      x: 180, // Player low resolution x coord.
      y: 102, // Player low resolution y coord.
    },
    {
      id: 48721,
      x: 0,
      y: 0,
    },
    {
      id: 15401,
      x: 50,
      y: 97,
    }
  ]
}
```

`SCORE_BOARD` packets are the only way to find out the coordinates of players who are outside the player's screen.

The point with coordinates (0, 0) means that the player is in spectate mode.

## How StarMash radar works

Radar, like the minimap, uses data from the `SCORE_BOARD` packets (from the `rankings` array). From it features of work of radar follow, for example, it can be displayed with a delay to 5 seconds. It happens when an enemy prowler crosses border of a visible part of the player's screen right after reception of last `SCORE_BOARD` broadcasting. Therefore within the next 4-5 seconds the radar will not be drawn on the screen until the next `SCORE_BOARD` broadcasting occurs.

## How minimap works after changes

The server still sends `SCORE_BOARD` packets every 5 seconds, but now the data (`data` and `rankings` arrays) in the packets is different for each player. Now for each player the size of its viewport (visible part of the game on the screen) is taken into account. If the enemy prowler is invisible and is outside viewport, its real position will not be sent in the `rankings` array. Instead, the real one will be replaced by (0, 0), and the prowler will not show up on the minimap or by radar.

## Known bugs

Invisible prowlers are shown as spectating in StarMash.
