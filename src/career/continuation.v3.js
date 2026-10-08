// Exact recipes, gates, rewards and correspondence from verified proposal
// 7cabf1d5af6ce315f59f588132caaa936cc8f41e26be5d8a41eb10d2fd133677.
export default {
  "levels": [
    {
      "level": 7,
      "xp": 1160,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 8,
      "xp": 1510,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 9,
      "xp": 1580,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 10,
      "xp": 1860,
      "targetCeiling": 5,
      "slots": 2
    }
  ],
  "chapters": [
    {
      "id": "riverside-correspondence",
      "number": 3,
      "title": "Riverside Reverie",
      "catalogEnvelopeId": "riverside-reverie",
      "entryXP": 1000,
      "minimumLevel": 8,
      "levelCap": 8,
      "storyIds": [
        "riverside-letter-1",
        "riverside-letter-2",
        "riverside-letter-3",
        "riverside-letter-4",
        "riverside-letter-5",
        "riverside-letter-6",
        "riverside-letter-7"
      ],
      "entrySources": [
        "map"
      ],
      "nextId": "lantern-correspondence",
      "nextTitle": "Lantern Studio",
      "nextPreview": "A lantern answers the folds in the map. Keep your stock and upgrades; the first two Lantern letters open Spool."
    },
    {
      "id": "lantern-correspondence",
      "number": 4,
      "title": "Lantern Studio",
      "catalogEnvelopeId": "lantern-studio",
      "entryXP": 1510,
      "minimumLevel": 10,
      "levelCap": 10,
      "storyIds": [
        "lantern-letter-1",
        "lantern-letter-2",
        "lantern-letter-3",
        "lantern-letter-4",
        "lantern-letter-5",
        "lantern-letter-6",
        "lantern-letter-7"
      ],
      "entrySources": [
        "lantern"
      ],
      "nextId": null,
      "nextTitle": "Your collection",
      "nextPreview": "This four-chapter checkpoint is part of the sixteen-chapter campaign in development."
    }
  ],
  "story": [
    {
      "id": "riverside-letter-1",
      "chapterId": "riverside-correspondence",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "r2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "The higher low point",
      "letter": "The river has folded a hill into the map. LOW sits at the higher summit. Let the small disagreement travel.",
      "goal": "Make and send River Ridge.",
      "sentCaption": "The map sent a hill and kept its question."
    },
    {
      "id": "riverside-letter-2",
      "chapterId": "riverside-correspondence",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "r3",
          "quantity": 1
        },
        {
          "pieceId": "m3",
          "quantity": 1
        }
      ],
      "xp": 50,
      "coins": 20,
      "title": "A crossing with a passenger",
      "letter": "The map leaves a gap where the river crosses. The moon has brought its skiff. Send two answers to the same water.",
      "goal": "Make and send River Crossing and Lunar Skiff.",
      "sentCaption": "A gap in the map met a boat from the sky."
    },
    {
      "id": "riverside-letter-3",
      "chapterId": "riverside-correspondence",
      "requiresMilestones": [
        "riverside-letter-1",
        "riverside-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "t2",
          "quantity": 1
        },
        {
          "pieceId": "b2",
          "quantity": 1
        }
      ],
      "xp": 20,
      "coins": 10,
      "title": "A small sip by air",
      "letter": "The cup lets one ribbon rise. The bird carries one strip of river. Both have found a small way out.",
      "goal": "Make and send Ribbon Sip and Riverwing.",
      "sentCaption": "A sip and a river travelled lightly."
    },
    {
      "id": "riverside-letter-4",
      "chapterId": "riverside-correspondence",
      "requiresMilestones": [
        "riverside-letter-1",
        "riverside-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "r4",
          "quantity": 1
        },
        {
          "pieceId": "t3",
          "quantity": 1
        }
      ],
      "xp": 85,
      "coins": 35,
      "title": "Still water, quiet steam",
      "letter": "The river says STILL while falling down the paper. The divided cup says HUSH. Send the two conversations together.",
      "goal": "Make and send River Cascade and Tea Chorus.",
      "sentCaption": "The water moved. The steam kept its own counsel."
    },
    {
      "id": "riverside-letter-5",
      "chapterId": "riverside-correspondence",
      "requiresMilestones": [
        "riverside-letter-1",
        "riverside-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "t3",
          "quantity": 1
        },
        {
          "pieceId": "f4",
          "quantity": 1
        }
      ],
      "xp": 85,
      "coins": 35,
      "title": "The cup visits its garden",
      "letter": "The cup has split into two voices. The old garden remembers its handle. Let the familiar shape arrive by another route.",
      "goal": "Make and send Tea Chorus and Moonlit Arbor.",
      "sentCaption": "The cup found its handle in an older letter."
    },
    {
      "id": "riverside-letter-6",
      "chapterId": "riverside-correspondence",
      "requiresMilestones": [
        "riverside-letter-1",
        "riverside-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "t4",
          "quantity": 1
        },
        {
          "pieceId": "r4",
          "quantity": 1
        }
      ],
      "xp": 120,
      "coins": 50,
      "title": "Two ways to fold a river",
      "letter": "One picture opens upward. The other steps down. Send the fan of steam beside the river, with room between their directions.",
      "goal": "Make and send Pleated Steam and River Cascade.",
      "sentCaption": "The folds disagreed about which way was up."
    },
    {
      "id": "riverside-letter-7",
      "chapterId": "riverside-correspondence",
      "requiresMilestones": [
        "riverside-letter-1",
        "riverside-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "r5",
          "quantity": 1
        }
      ],
      "xp": 140,
      "coins": 60,
      "title": "Inland, with a way out",
      "letter": "The map has gathered three small towers. INLAND and OUT share the river. There is room for both addresses on this picture.",
      "goal": "Make and send River Citadel.",
      "sentCaption": "The river reached a place with more than one address."
    },
    {
      "id": "lantern-letter-1",
      "chapterId": "lantern-correspondence",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "l2",
          "quantity": 1
        },
        {
          "pieceId": "r2",
          "quantity": 1
        }
      ],
      "xp": 20,
      "coins": 10,
      "title": "A fold answers a fold",
      "letter": "The lantern has opened like a small accordion. The map has kept its two peaks. Send one fold to visit another.",
      "goal": "Make and send Folded Glow and River Ridge.",
      "sentCaption": "Two folded papers found different ways to stand."
    },
    {
      "id": "lantern-letter-2",
      "chapterId": "lantern-correspondence",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "l3",
          "quantity": 1
        },
        {
          "pieceId": "m2",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "A visitor at the window",
      "letter": "The roof has slipped sideways. INSIDE sits outside. The bird arrives carrying its crescent, without asking which side is home.",
      "goal": "Make and send Lantern House and Crescent Courier.",
      "sentCaption": "A moon-bearing bird found a window."
    },
    {
      "id": "lantern-letter-3",
      "chapterId": "lantern-correspondence",
      "requiresMilestones": [
        "lantern-letter-1",
        "lantern-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "l3",
          "quantity": 2
        }
      ],
      "xp": 50,
      "coins": 20,
      "title": "Two houses, one envelope",
      "letter": "Keep the two houses side by side for this letter. Their roofs need not become a tower to have something to say.",
      "goal": "Make and send 2 copies of Lantern House.",
      "sentCaption": "Two houses travelled without becoming one."
    },
    {
      "id": "lantern-letter-4",
      "chapterId": "lantern-correspondence",
      "requiresMilestones": [
        "lantern-letter-1",
        "lantern-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "l4",
          "quantity": 1
        },
        {
          "pieceId": "s2",
          "quantity": 1
        }
      ],
      "xp": 70,
      "coins": 30,
      "title": "A tower with a loose end",
      "letter": "The windows have become a tower. The ribbon loops back toward its spool. ABOVE and AGAIN can share the same envelope.",
      "goal": "Make and send Lantern Tower and Ribbon Spool.",
      "sentCaption": "One shape rose; the other came round again."
    },
    {
      "id": "lantern-letter-5",
      "chapterId": "lantern-correspondence",
      "requiresMilestones": [
        "lantern-letter-1",
        "lantern-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "t2",
          "quantity": 1
        },
        {
          "pieceId": "k2",
          "quantity": 1
        }
      ],
      "xp": 20,
      "coins": 10,
      "title": "A short note through the door",
      "letter": "A sip of steam and a leafy key make a small reply. The larger pictures can stay on the table a little longer.",
      "goal": "Make and send Ribbon Sip and Frond Key.",
      "sentCaption": "The cup and the key made a brief visit."
    },
    {
      "id": "lantern-letter-6",
      "chapterId": "lantern-correspondence",
      "requiresMilestones": [
        "lantern-letter-1",
        "lantern-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "s3",
          "quantity": 1
        },
        {
          "pieceId": "l2",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "Three loops and a fold",
      "letter": "The ribbon has opened into three loops. The lantern spreads its paper windows. Send these two ways of opening together.",
      "goal": "Make and send Ribbon Bloom and Folded Glow.",
      "sentCaption": "A loop became a bloom beside a fold."
    },
    {
      "id": "lantern-letter-7",
      "chapterId": "lantern-correspondence",
      "requiresMilestones": [
        "lantern-letter-1",
        "lantern-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "l4",
          "quantity": 1
        },
        {
          "pieceId": "s4",
          "quantity": 1
        }
      ],
      "xp": 120,
      "coins": 50,
      "title": "A window beside a weave",
      "letter": "The tower has windows. The loom has crossings. Let the light and the ribbon take turns filling the spaces between them.",
      "goal": "Make and send Lantern Tower and Ribbon Loom.",
      "sentCaption": "The window and the weave left room for the paper."
    }
  ],
  "sourceRules": [
    {
      "id": "map",
      "chapterId": "riverside-correspondence",
      "milestones": []
    },
    {
      "id": "teacup",
      "chapterId": "riverside-correspondence",
      "milestones": [
        "riverside-letter-1",
        "riverside-letter-2"
      ]
    },
    {
      "id": "lantern",
      "chapterId": "lantern-correspondence",
      "milestones": []
    },
    {
      "id": "spool",
      "chapterId": "lantern-correspondence",
      "milestones": [
        "lantern-letter-1",
        "lantern-letter-2"
      ]
    }
  ],
  "upgrades": [
    {
      "id": "map-sorter",
      "familyId": "map",
      "chapterId": "riverside-correspondence",
      "name": "Map sorter I",
      "level": 6,
      "price": 90,
      "description": "Map draws repeat level 1, level 1, level 2. Every third draw makes a larger piece; basic scraps stay free."
    },
    {
      "id": "teacup-sorter",
      "familyId": "teacup",
      "chapterId": "riverside-correspondence",
      "name": "Teacup sorter I",
      "level": 7,
      "price": 90,
      "description": "Teacup draws repeat level 1, level 1, level 2. Every third draw makes a larger piece; basic scraps stay free."
    },
    {
      "id": "lantern-sorter",
      "familyId": "lantern",
      "chapterId": "lantern-correspondence",
      "name": "Lantern sorter I",
      "level": 8,
      "price": 95,
      "description": "Lantern draws repeat level 1, level 1, level 2. Every third draw makes a larger piece; basic scraps stay free."
    },
    {
      "id": "spool-sorter",
      "familyId": "spool",
      "chapterId": "lantern-correspondence",
      "name": "Spool sorter I",
      "level": 9,
      "price": 95,
      "description": "Spool draws repeat level 1, level 1, level 2. Every third draw makes a larger piece; basic scraps stay free."
    }
  ],
  "chapterCopy": {
    "riverside-correspondence": {
      "title": "Riverside Reverie",
      "opening": "The river leaves the bird and finds a map. The cup leaves the garden and sends a little steam. Familiar shapes have their own addresses now.",
      "goal": "Send the seven Riverside letters. Map opens on entry. The first two letters open Teacup. Your older stock stays on the table.",
      "ending": "The river has travelled through a wing, a map and a cup. These seven letters are sent; the shapes still have places to go."
    },
    "lantern-correspondence": {
      "title": "Lantern Studio",
      "opening": "The folds have found a window. A ribbon has found a loop. Some pictures can stay side by side; some are ready to become something else.",
      "goal": "Send the seven Lantern letters. Lantern opens on entry. The first two letters open Spool. This chapter does not require either level-5 picture.",
      "ending": "Two houses, a tower, a window and a weave have answered one another. These letters are sent. Leave the table as it is, or keep following a picture."
    }
  },
  "postscripts": [
    {
      "id": "riverside-reverie-postscript",
      "title": "The cup stays awake",
      "pieceId": "t5",
      "companionPieceId": "f2",
      "goal": "Merge two Pleated Steam pieces to discover Ribbon Reverie. No Send is needed.",
      "caption": "DREAM has left the cup. AWAKE keeps the handle.",
      "reverse": "A cup once held the fern. Its ribbons now have somewhere else to go."
    },
    {
      "id": "lantern-palace-postscript",
      "title": "Room for another room",
      "pieceId": "l5",
      "companionPieceId": "l3",
      "goal": "Merge two Lantern Towers to discover Lantern Palace. No Send is needed.",
      "caption": "Two ROOM scraps. Three places to look.",
      "reverse": "Follow the window into a wider picture if you want to see where it goes."
    },
    {
      "id": "lantern-pavilion-postscript",
      "title": "Over, under, open",
      "pieceId": "s5",
      "companionPieceId": "s2",
      "goal": "Merge two Ribbon Looms to discover Ribbon Pavilion. No Send is needed.",
      "caption": "The loop has become a roof with open sides.",
      "reverse": "The first loop can become a place to sit beneath. Nothing needs to be sent."
    }
  ]
};
