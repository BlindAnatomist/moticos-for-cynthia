// Exact independently accepted forty-piece addition. Private candidate only.
const art = Object.freeze({
  hs1: new URL("./art/hs1.webp", import.meta.url).href,
  hs2: new URL("./art/hs2.webp", import.meta.url).href,
  hs3: new URL("./art/hs3.webp", import.meta.url).href,
  hs4: new URL("./art/hs4.webp", import.meta.url).href,
  hs5: new URL("./art/hs5.webp", import.meta.url).href,
  fv1: new URL("./art/fv1.webp", import.meta.url).href,
  fv2: new URL("./art/fv2.webp", import.meta.url).href,
  fv3: new URL("./art/fv3.webp", import.meta.url).href,
  fv4: new URL("./art/fv4.webp", import.meta.url).href,
  fv5: new URL("./art/fv5.webp", import.meta.url).href,
  la1: new URL("./art/la1.webp", import.meta.url).href,
  la2: new URL("./art/la2.webp", import.meta.url).href,
  la3: new URL("./art/la3.webp", import.meta.url).href,
  la4: new URL("./art/la4.webp", import.meta.url).href,
  la5: new URL("./art/la5.webp", import.meta.url).href,
  ht1: new URL("./art/ht1.webp", import.meta.url).href,
  ht2: new URL("./art/ht2.webp", import.meta.url).href,
  ht3: new URL("./art/ht3.webp", import.meta.url).href,
  ht4: new URL("./art/ht4.webp", import.meta.url).href,
  ht5: new URL("./art/ht5.webp", import.meta.url).href,
  ft1: new URL("./art/ft1.webp", import.meta.url).href,
  ft2: new URL("./art/ft2.webp", import.meta.url).href,
  ft3: new URL("./art/ft3.webp", import.meta.url).href,
  ft4: new URL("./art/ft4.webp", import.meta.url).href,
  ft5: new URL("./art/ft5.webp", import.meta.url).href,
  ct1: new URL("./art/ct1.webp", import.meta.url).href,
  ct2: new URL("./art/ct2.webp", import.meta.url).href,
  ct3: new URL("./art/ct3.webp", import.meta.url).href,
  ct4: new URL("./art/ct4.webp", import.meta.url).href,
  ct5: new URL("./art/ct5.webp", import.meta.url).href,
  rp1: new URL("./art/rp1.webp", import.meta.url).href,
  rp2: new URL("./art/rp2.webp", import.meta.url).href,
  rp3: new URL("./art/rp3.webp", import.meta.url).href,
  rp4: new URL("./art/rp4.webp", import.meta.url).href,
  rp5: new URL("./art/rp5.webp", import.meta.url).href,
  sh1: new URL("./art/sh1.webp", import.meta.url).href,
  sh2: new URL("./art/sh2.webp", import.meta.url).href,
  sh3: new URL("./art/sh3.webp", import.meta.url).href,
  sh4: new URL("./art/sh4.webp", import.meta.url).href,
  sh5: new URL("./art/sh5.webp", import.meta.url).href,
});
const definitions = [
  {
    "envelope": {
      "id": "expansion-small-talk",
      "title": "Small Talk",
      "description": "A gesture and a face exchange a few wordless introductions.",
      "subtitle": "Small Talk",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-small-talk.v1"
    },
    "catalog": {
      "id": "expansion-small-talk",
      "rows": [
        [
          "hs1",
          "hand",
          1,
          "Point",
          "Point",
          "A vintage printer's right-pointing manicule with three folded fingers, a rectangular cuff and a red cuff strip.",
          "hs1"
        ],
        [
          "hs2",
          "hand",
          2,
          "Wave",
          "Wave",
          "An upright open palm fans five short bold fingers above the inherited cuff and red strip.",
          "hs2"
        ],
        [
          "hs3",
          "hand",
          3,
          "Meet",
          "Meet",
          "Two unequal printed hands lock thumbs across a low horizontal greeting, with cuffs at opposite ends.",
          "hs3"
        ],
        [
          "hs4",
          "hand",
          4,
          "Between",
          "Between",
          "A right-pointing finger and an upright palm form a large open right angle, connected by a red cuff.",
          "hs4"
        ],
        [
          "hs5",
          "hand",
          5,
          "Handwritten",
          "Written",
          "Five broad finger fragments radiate around a large palm-shaped absence, tied by the red cuff.",
          "hs5"
        ],
        [
          "fv1",
          "profile",
          1,
          "Profile",
          "Face",
          "A small right-facing black paper portrait with a long nose and a cropped collar, interrupted by a blue type slip.",
          "fv1"
        ],
        [
          "fv2",
          "profile",
          2,
          "Introduction",
          "Intro",
          "Unequal inward-facing portrait profiles meet at a narrow vertical light gap above a blue collar.",
          "fv2"
        ],
        [
          "fv3",
          "profile",
          3,
          "Inside",
          "Inside",
          "An oval printed face opens around one large eye-shaped gap above a narrow rectangular collar.",
          "fv3"
        ],
        [
          "fv4",
          "profile",
          4,
          "Aside",
          "Aside",
          "A stepped nose fragment and a slanted jaw form an open corner with a blue strip across the chin.",
          "fv4"
        ],
        [
          "fv5",
          "profile",
          5,
          "Someone",
          "Someone",
          "A broad double-profile paper shape holds a face-shaped empty center beneath a printed brow.",
          "fv5"
        ]
      ],
      "families": [
        {
          "id": "hand",
          "name": "Hand Signals",
          "shortName": "Hand",
          "color": "#a24732",
          "pieceIds": [
            "hs1",
            "hs2",
            "hs3",
            "hs4",
            "hs5"
          ]
        },
        {
          "id": "profile",
          "name": "Face Value",
          "shortName": "Face",
          "color": "#52645f",
          "pieceIds": [
            "fv1",
            "fv2",
            "fv3",
            "fv4",
            "fv5"
          ]
        }
      ]
    }
  },
  {
    "envelope": {
      "id": "expansion-hello-again",
      "title": "Hello Again",
      "description": "A telephone and a hat try several ways of saying hello.",
      "subtitle": "Hello Again",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-hello-again.v1"
    },
    "catalog": {
      "id": "expansion-hello-again",
      "rows": [
        [
          "la1",
          "telephone",
          1,
          "Telephone",
          "Phone",
          "A squat rotary telephone print holds a broad receiver above a large ivory dial and red base tab.",
          "la1"
        ],
        [
          "la2",
          "telephone",
          2,
          "Off Hook",
          "Hook",
          "An upright bent receiver rises from a short printed cord and the inherited red tab.",
          "la2"
        ],
        [
          "la3",
          "telephone",
          3,
          "Busy",
          "Busy",
          "An enlarged dial becomes a low open wheel crossed by a broad red receiver fragment.",
          "la3"
        ],
        [
          "la4",
          "telephone",
          4,
          "Listening",
          "Listen",
          "Two unequal receiver ends face across an open diamond, joined below by a bent blue cord.",
          "la4"
        ],
        [
          "la5",
          "telephone",
          5,
          "Call Again",
          "Again",
          "A receiver and looping printed cord form a bold open question mark above a red dial-stop square.",
          "la5"
        ],
        [
          "ht1",
          "hat",
          1,
          "Bowler",
          "Hat",
          "A black bowler has a broad curled brim, ivory engraving and one red paper hatband.",
          "ht1"
        ],
        [
          "ht2",
          "hat",
          2,
          "Tip",
          "Tip",
          "A steeply tipped crown opens above a short slanting brim and inherited red band.",
          "ht2"
        ],
        [
          "ht3",
          "hat",
          3,
          "Salute",
          "Salute",
          "Two unequal brim fragments form a wide open wing-like greeting under a central crown notch.",
          "ht3"
        ],
        [
          "ht4",
          "hat",
          4,
          "Overhead",
          "Over",
          "A long diagonal crown strip stands above an open angular brim bracket, linked by the red band.",
          "ht4"
        ],
        [
          "ht5",
          "hat",
          5,
          "Hats Off",
          "Off",
          "A tall black printed top hat holds a large bowler-shaped transparent absence above the inherited red hatband.",
          "ht5"
        ]
      ],
      "families": [
        {
          "id": "telephone",
          "name": "Line Again",
          "shortName": "Line",
          "color": "#5e647a",
          "pieceIds": [
            "la1",
            "la2",
            "la3",
            "la4",
            "la5"
          ]
        },
        {
          "id": "hat",
          "name": "Hat Trick",
          "shortName": "Hat",
          "color": "#90643d",
          "pieceIds": [
            "ht1",
            "ht2",
            "ht3",
            "ht4",
            "ht5"
          ]
        }
      ]
    }
  },
  {
    "envelope": {
      "id": "expansion-off-beat",
      "title": "Off Beat",
      "description": "Teeth and ticks fall into rhythm, then slip delightfully out of line.",
      "subtitle": "Off Beat",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-off-beat.v1"
    },
    "catalog": {
      "id": "expansion-off-beat",
      "rows": [
        [
          "ft1",
          "comb",
          1,
          "Comb",
          "Comb",
          "A short black pocket comb has seven broad teeth, an ivory spine and a red end patch.",
          "ft1"
        ],
        [
          "ft2",
          "comb",
          2,
          "Part",
          "Part",
          "A comb splits into two unequal upright tooth banks with a narrow red hinge.",
          "ft2"
        ],
        [
          "ft3",
          "comb",
          3,
          "Rhythm",
          "Rhythm",
          "The comb spine bends into a stepped diagonal with broad alternating teeth and a blue splice.",
          "ft3"
        ],
        [
          "ft4",
          "comb",
          4,
          "Pause",
          "Pause",
          "A low curved comb arch encloses a wide gap above a red underline and one offset tooth.",
          "ft4"
        ],
        [
          "ft5",
          "comb",
          5,
          "Untangle",
          "Untie",
          "A thick continuous comb spine curls into an open angular hook, with six long blunt outward teeth and a red corner splice.",
          "ft5"
        ],
        [
          "ct1",
          "watch",
          1,
          "Watch",
          "Watch",
          "A round pocket-watch print has a heavy loop, two bold hands and a red paper minute strip.",
          "ct1"
        ],
        [
          "ct2",
          "watch",
          2,
          "Tick",
          "Tick",
          "The watch opens into two unequal face arcs on a tall stem, retaining its heavy winding loop.",
          "ct2"
        ],
        [
          "ct3",
          "watch",
          3,
          "Interval",
          "Interval",
          "Two dial halves sit far apart in a low hourglass shape, joined by a red minute hand.",
          "ct3"
        ],
        [
          "ct4",
          "watch",
          4,
          "After",
          "After",
          "A broken clock face bends into an asymmetrical stair with an open semicircle and a downward hand.",
          "ct4"
        ],
        [
          "ct5",
          "watch",
          5,
          "Noon Elsewhere",
          "Noon",
          "An open square of dial arcs holds a diagonal black hand across a large missing clock face.",
          "ct5"
        ]
      ],
      "families": [
        {
          "id": "comb",
          "name": "Fine Teeth",
          "shortName": "Comb",
          "color": "#a16529",
          "pieceIds": [
            "ft1",
            "ft2",
            "ft3",
            "ft4",
            "ft5"
          ]
        },
        {
          "id": "watch",
          "name": "Cut Time",
          "shortName": "Time",
          "color": "#647b6d",
          "pieceIds": [
            "ct1",
            "ct2",
            "ct3",
            "ct4",
            "ct5"
          ]
        }
      ]
    }
  },
  {
    "envelope": {
      "id": "expansion-return-mail",
      "title": "Return Mail",
      "description": "A folded letter and a listening shell carry a message back.",
      "subtitle": "Return Mail",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-return-mail.v1"
    },
    "catalog": {
      "id": "expansion-return-mail",
      "rows": [
        [
          "rp1",
          "letter",
          1,
          "Letter",
          "Letter",
          "A sealed low envelope has a large black triangular flap and an offset red stamp square.",
          "rp1"
        ],
        [
          "rp2",
          "letter",
          2,
          "Open Letter",
          "Open",
          "The envelope unfolds into a tall diamond with a wide open middle and the red stamp at one tip.",
          "rp2"
        ],
        [
          "rp3",
          "letter",
          3,
          "Forward",
          "Forward",
          "The flaps become a broad zigzag arrow with a red stamp anchoring its central fold.",
          "rp3"
        ],
        [
          "rp4",
          "letter",
          4,
          "Reply",
          "Reply",
          "Two unequal triangular letter flaps face across a low open bracket, joined by the inherited red stamp.",
          "rp4"
        ],
        [
          "rp5",
          "letter",
          5,
          "Returned",
          "Return",
          "A curled chain of broad postal folds loops around a large envelope-shaped absence.",
          "rp5"
        ],
        [
          "sh1",
          "shell",
          1,
          "Shell",
          "Shell",
          "A broad scallop shell print opens its bold ribs above a short blue paper hinge.",
          "sh1"
        ],
        [
          "sh2",
          "shell",
          2,
          "Ear",
          "Ear",
          "The shell closes into an upright ear-like curl with one large listening gap and a blue hinge.",
          "sh2"
        ],
        [
          "sh3",
          "shell",
          3,
          "Sound",
          "Sound",
          "Unequal ribbed shell halves face across a shallow wave-shaped opening held by a blue strip.",
          "sh3"
        ],
        [
          "sh4",
          "shell",
          4,
          "Whisper",
          "Whisper",
          "One narrow shell fan rises above a broad horizontal rib, forming an open right-angle listening shape.",
          "sh4"
        ],
        [
          "sh5",
          "shell",
          5,
          "Resonance",
          "Resound",
          "A rising scalloped crest of shell ribs has a deep open bite beneath its tall right edge, joined by the blue hinge.",
          "sh5"
        ]
      ],
      "families": [
        {
          "id": "letter",
          "name": "Return Post",
          "shortName": "Post",
          "color": "#5e7183",
          "pieceIds": [
            "rp1",
            "rp2",
            "rp3",
            "rp4",
            "rp5"
          ]
        },
        {
          "id": "shell",
          "name": "Shell Mail",
          "shortName": "Shell",
          "color": "#9b674e",
          "pieceIds": [
            "sh1",
            "sh2",
            "sh3",
            "sh4",
            "sh5"
          ]
        }
      ]
    }
  }
];
export const EXPANSION_DEFINITIONS = Object.freeze(definitions.map(item => Object.freeze({ ...item, catalog: { ...item.catalog, artUrl: asset => art[asset] } })));
