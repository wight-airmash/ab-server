# JSON API

## /

| Property       | Type   | Description                                                                                                                     |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| players        | number | The number of players (humans and bots) connected to the server                                                                 |
| bots           | number | The number of bots among players connected to the server                                                                        |
| spectators     | number | The number of players in spectate mode among connected                                                                          |
| ctf            | object | CTF mode only                                                                                                                   |
| ctf.start      | number | [Timestamp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now) of the active game start |
| ctf.score.blue | number | Blue team score. If it's `3`, then the game is over.                                                                            |
| ctf.score.red  | number | Red team score. If it's `3`, then the game is over.                                                                             |
| btr            | object | BTR mode only                                                                                                                   |
| btr.start      | number | Timestamp of the active game start                                                                                              |
| btr.alive      | number | Alive players. If it's <= `1`, then the game is over.                                                                           |

Example (FFA mode):

```json
{
  "players": 31,
  "bots": 5,
  "spectators": 7
}
```

Example (CTF mode):

```json
{
  "players": 15,
  "bots": 12,
  "spectators": 2,
  "ctf": {
    "start": 1589655901525,
    "score": {
      "blue": 1,
      "red": 0
    }
  }
}
```

Example (BTR mode):

```json
{
  "players": 18,
  "bots": 0,
  "spectators": 13,
  "ctf": {
    "start": 1589655901525,
    "alive": 5
  }
}
```

## /ping

| Property | Type   | Description     |
| -------- | ------ | --------------- |
| pong     | number | It's always `1` |

Example:

```json
{
  "pong": 1
}
```
