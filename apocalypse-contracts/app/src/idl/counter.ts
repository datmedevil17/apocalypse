/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/counter.json`.
 */
export type Counter = {
  "address": "DcYYaAGLiY8BUMHeV9dziCdmJGgQCx3nUtiUyDG4jce4",
  "metadata": {
    "name": "counter",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "commitBattle",
      "docs": [
        "Step 2: Commit the battle account state back to the base layer and undelegate.",
        "IMPORTANT: does NOT write to `battle` — state was already updated by `end_battle`.",
        "Keeping write and commit separate avoids the ER ownership-transfer conflict."
      ],
      "discriminator": [
        219,
        116,
        150,
        30,
        121,
        105,
        195,
        23
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "battle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  116,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "battle.room_id",
                "account": "battle"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createBattleAccount",
      "docs": [
        "Create a shared battle account on the base layer.",
        "The `room_id` seed allows multiple concurrent rooms."
      ],
      "discriminator": [
        29,
        254,
        59,
        89,
        53,
        129,
        167,
        44
      ],
      "accounts": [
        {
          "name": "battle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  116,
                  108,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "host",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "u64"
        },
        {
          "name": "maxPlayers",
          "type": "u8"
        }
      ]
    },
    {
      "name": "delegateBattleAccount",
      "docs": [
        "Delegate the battle account to the Ephemeral Rollup.",
        "Must be called by the host after `create_battle_account`."
      ],
      "discriminator": [
        172,
        136,
        46,
        55,
        179,
        238,
        55,
        246
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "bufferPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                187,
                103,
                61,
                29,
                151,
                161,
                244,
                66,
                118,
                66,
                136,
                166,
                18,
                49,
                51,
                54,
                20,
                117,
                78,
                237,
                155,
                171,
                77,
                255,
                150,
                247,
                97,
                188,
                109,
                50,
                218,
                113
              ]
            }
          }
        },
        {
          "name": "delegationRecordPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "pda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  116,
                  108,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "DcYYaAGLiY8BUMHeV9dziCdmJGgQCx3nUtiUyDG4jce4"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "delegateGame",
      "docs": [
        "Delegate the player profile to the Ephemeral Rollup.",
        "Must be called on the base layer before `start_game`."
      ],
      "discriminator": [
        116,
        183,
        70,
        107,
        112,
        223,
        122,
        210
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "bufferPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                187,
                103,
                61,
                29,
                151,
                161,
                244,
                66,
                118,
                66,
                136,
                166,
                18,
                49,
                51,
                54,
                20,
                117,
                78,
                237,
                155,
                171,
                77,
                255,
                150,
                247,
                97,
                188,
                109,
                50,
                218,
                113
              ]
            }
          }
        },
        {
          "name": "delegationRecordPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "pda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "DcYYaAGLiY8BUMHeV9dziCdmJGgQCx3nUtiUyDG4jce4"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "endBattle",
      "docs": [
        "Step 1: End the multiplayer battle — sets active=false.",
        "Called by the host on the ER. Uses BattleAction so session key is supported.",
        "Must be called BEFORE `commit_battle`."
      ],
      "discriminator": [
        80,
        145,
        208,
        48,
        183,
        92,
        168,
        112
      ],
      "accounts": [
        {
          "name": "battle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  116,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "battle.room_id",
                "account": "battle"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "docs": [
            "Host's session token — authority must match battle.host."
          ],
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "endGame",
      "docs": [
        "End a single-player game session.",
        "Marks the game inactive. The player can then call `undelegate_game` to settle."
      ],
      "discriminator": [
        224,
        135,
        245,
        99,
        67,
        175,
        121,
        252
      ],
      "accounts": [
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "profile.authority",
                "account": "profile"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "initializeProfile",
      "docs": [
        "Initialize a player profile.",
        "Called once per wallet on the base layer. Sets points to 0."
      ],
      "discriminator": [
        32,
        145,
        77,
        213,
        58,
        39,
        251,
        234
      ],
      "accounts": [
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "joinBattle",
      "docs": [
        "Join an active battle room.",
        "Any player can join as long as max_players is not reached.",
        "Uses PlayerBattleAction so each player can use their OWN session key."
      ],
      "discriminator": [
        126,
        0,
        69,
        130,
        127,
        145,
        54,
        100
      ],
      "accounts": [
        {
          "name": "battle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  116,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "battle.room_id",
                "account": "battle"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "docs": [
            "The player's own wallet — used as the session token authority."
          ]
        },
        {
          "name": "sessionToken",
          "docs": [
            "Player's session token (authority = player's wallet, not battle.host)."
          ],
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "killZombie",
      "docs": [
        "Kill a zombie in single-player mode — awards `reward` points.",
        "Runs in the Ephemeral Rollup with session-key support for low-latency, no-popup gameplay."
      ],
      "discriminator": [
        89,
        133,
        147,
        246,
        240,
        31,
        223,
        243
      ],
      "accounts": [
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "profile.authority",
                "account": "profile"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "reward",
          "type": "u64"
        }
      ]
    },
    {
      "name": "killZombieBattle",
      "docs": [
        "Kill a zombie in multiplayer mode.",
        "Any player in the room calls this via socket-coordinated transactions on the ER.",
        "Uses PlayerBattleAction so each player can use their OWN session key."
      ],
      "discriminator": [
        71,
        95,
        204,
        15,
        82,
        246,
        217,
        73
      ],
      "accounts": [
        {
          "name": "battle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  116,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "battle.room_id",
                "account": "battle"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "docs": [
            "The player's own wallet — used as the session token authority."
          ]
        },
        {
          "name": "sessionToken",
          "docs": [
            "Player's session token (authority = player's wallet, not battle.host)."
          ],
          "optional": true
        }
      ],
      "args": [
        {
          "name": "reward",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "startGame",
      "docs": [
        "Mark the game as active. Called on the Ephemeral Rollup after delegation."
      ],
      "discriminator": [
        249,
        47,
        252,
        172,
        184,
        162,
        245,
        14
      ],
      "accounts": [
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "profile.authority",
                "account": "profile"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "startMultiplayerBattle",
      "docs": [
        "Start the multiplayer battle. Called by the host on the Ephemeral Rollup.",
        "Players can join via socket subscriptions and kill zombies afterward."
      ],
      "discriminator": [
        86,
        102,
        78,
        50,
        51,
        134,
        90,
        215
      ],
      "accounts": [
        {
          "name": "battle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  116,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "battle.room_id",
                "account": "battle"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "docs": [
            "Host's session token — authority must match battle.host."
          ],
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "undelegateGame",
      "docs": [
        "Commit & undelegate the player profile back to the base layer.",
        "Settles all earned points on-chain permanently."
      ],
      "discriminator": [
        40,
        145,
        154,
        66,
        48,
        111,
        127,
        1
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "battle",
      "discriminator": [
        81,
        148,
        121,
        71,
        63,
        166,
        116,
        24
      ]
    },
    {
      "name": "profile",
      "discriminator": [
        184,
        101,
        165,
        188,
        95,
        63,
        127,
        188
      ]
    },
    {
      "name": "sessionToken",
      "discriminator": [
        233,
        4,
        115,
        14,
        46,
        21,
        1,
        15
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAuth",
      "msg": "Invalid authentication"
    },
    {
      "code": 6001,
      "name": "gameAlreadyActive",
      "msg": "A game session is already active"
    },
    {
      "code": 6002,
      "name": "gameNotActive",
      "msg": "No game session is currently active"
    },
    {
      "code": 6003,
      "name": "battleRoomFull",
      "msg": "The battle room is full"
    }
  ],
  "types": [
    {
      "name": "battle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "host",
            "docs": [
              "The host who created and delegates this room"
            ],
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "docs": [
              "Unique identifier for this battle room"
            ],
            "type": "u64"
          },
          {
            "name": "maxPlayers",
            "docs": [
              "Max number of players allowed"
            ],
            "type": "u8"
          },
          {
            "name": "playerCount",
            "docs": [
              "Current number of joined players"
            ],
            "type": "u8"
          },
          {
            "name": "totalZombieKills",
            "docs": [
              "Total zombies killed across all players"
            ],
            "type": "u64"
          },
          {
            "name": "totalPoints",
            "docs": [
              "Total points accumulated by all players"
            ],
            "type": "u64"
          },
          {
            "name": "active",
            "docs": [
              "Whether the battle is currently active"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "profile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "The wallet that owns this profile"
            ],
            "type": "pubkey"
          },
          {
            "name": "points",
            "docs": [
              "Accumulated zombie-kill points"
            ],
            "type": "u64"
          },
          {
            "name": "gameActive",
            "docs": [
              "Whether a game session is currently in progress"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "sessionToken",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "sessionSigner",
            "type": "pubkey"
          },
          {
            "name": "validUntil",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
