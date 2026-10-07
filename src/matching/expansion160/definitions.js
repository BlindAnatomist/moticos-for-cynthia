// Exact reviewed forty-piece addition. Private candidate only.
const art = Object.freeze({
  rc1: new URL("./art/rc1.webp", import.meta.url).href,
  rc2: new URL("./art/rc2.webp", import.meta.url).href,
  rc3: new URL("./art/rc3.webp", import.meta.url).href,
  rc4: new URL("./art/rc4.webp", import.meta.url).href,
  rc5: new URL("./art/rc5.webp", import.meta.url).href,
  hp1: new URL("./art/hp1.webp", import.meta.url).href,
  hp2: new URL("./art/hp2.webp", import.meta.url).href,
  hp3: new URL("./art/hp3.webp", import.meta.url).href,
  hp4: new URL("./art/hp4.webp", import.meta.url).href,
  hp5: new URL("./art/hp5.webp", import.meta.url).href,
  bb1: new URL("./art/bb1.webp", import.meta.url).href,
  bb2: new URL("./art/bb2.webp", import.meta.url).href,
  bb3: new URL("./art/bb3.webp", import.meta.url).href,
  bb4: new URL("./art/bb4.webp", import.meta.url).href,
  bb5: new URL("./art/bb5.webp", import.meta.url).href,
  ds1: new URL("./art/ds1.webp", import.meta.url).href,
  ds2: new URL("./art/ds2.webp", import.meta.url).href,
  ds3: new URL("./art/ds3.webp", import.meta.url).href,
  ds4: new URL("./art/ds4.webp", import.meta.url).href,
  ds5: new URL("./art/ds5.webp", import.meta.url).href,
  ob1: new URL("./art/ob1.webp", import.meta.url).href,
  ob2: new URL("./art/ob2.webp", import.meta.url).href,
  ob3: new URL("./art/ob3.webp", import.meta.url).href,
  ob4: new URL("./art/ob4.webp", import.meta.url).href,
  ob5: new URL("./art/ob5.webp", import.meta.url).href,
  sm1: new URL("./art/sm1.webp", import.meta.url).href,
  sm2: new URL("./art/sm2.webp", import.meta.url).href,
  sm3: new URL("./art/sm3.webp", import.meta.url).href,
  sm4: new URL("./art/sm4.webp", import.meta.url).href,
  sm5: new URL("./art/sm5.webp", import.meta.url).href,
  bt1: new URL("./art/bt1.webp", import.meta.url).href,
  bt2: new URL("./art/bt2.webp", import.meta.url).href,
  bt3: new URL("./art/bt3.webp", import.meta.url).href,
  bt4: new URL("./art/bt4.webp", import.meta.url).href,
  bt5: new URL("./art/bt5.webp", import.meta.url).href,
  tw1: new URL("./art/tw1.webp", import.meta.url).href,
  tw2: new URL("./art/tw2.webp", import.meta.url).href,
  tw3: new URL("./art/tw3.webp", import.meta.url).href,
  tw4: new URL("./art/tw4.webp", import.meta.url).href,
  tw5: new URL("./art/tw5.webp", import.meta.url).href,
});
const definitions = [
  {
    "envelope": {
      "id": "expansion-fair-weather",
      "title": "Fair Weather",
      "description": "An umbrella and an anchor make a few adjustments to the forecast.",
      "subtitle": "Fair Weather",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-fair-weather.v1"
    },
    "catalog": {
      "id": "expansion-fair-weather",
      "rows": [
        [
          "rc1",
          "umbrella",
          1,
          "Umbrella",
          "Rain",
          "A broad black umbrella canopy carries thick ivory ribs above a hooked handle and a small blue paper band.",
          "rc1"
        ],
        [
          "rc2",
          "umbrella",
          2,
          "Furled",
          "Furl",
          "A tall folded umbrella narrows around its heavy hooked handle, with a blue band around the printed pleats.",
          "rc2"
        ],
        [
          "rc3",
          "umbrella",
          3,
          "Gust",
          "Gust",
          "An inside-out umbrella sweeps diagonally upward, keeping its ribs, hooked handle and blue tie.",
          "rc3"
        ],
        [
          "rc4",
          "umbrella",
          4,
          "Shelter",
          "Shade",
          "Two overlapping canopy halves form a low uneven roof over a sideways hooked handle and blue splice.",
          "rc4"
        ],
        [
          "rc5",
          "umbrella",
          5,
          "Fair Weather",
          "Fair",
          "Three ribbed umbrella-panel folds step diagonally upward to the right, with a broad hooked handle curling from the lower left.",
          "rc5"
        ],
        [
          "hp1",
          "anchor",
          1,
          "Anchor",
          "Anchor",
          "A black anchor has a broad cross-stock, two hooked flukes and an ivory ring above a red paper splice.",
          "hp1"
        ],
        [
          "hp2",
          "anchor",
          2,
          "Afloat",
          "Float",
          "An anchor tilts diagonally with one long fluke, a cropped short fluke, and the red band across its shaft.",
          "hp2"
        ],
        [
          "hp3",
          "anchor",
          3,
          "Moor",
          "Moor",
          "Two broad anchor flukes form a low crescent beneath a short stock and red center splice.",
          "hp3"
        ],
        [
          "hp4",
          "anchor",
          4,
          "Drift",
          "Drift",
          "An offset anchor stock forms an angular elbow above one descending fluke and its red joint.",
          "hp4"
        ],
        [
          "hp5",
          "anchor",
          5,
          "Hold Fast",
          "Fast",
          "Crossed black anchor stocks and heavy curved flukes form an asymmetric crest, with a ring at the left and a red paper splice at the center.",
          "hp5"
        ]
      ],
      "families": [
        {
          "id": "umbrella",
          "name": "Rain Check",
          "shortName": "Rain",
          "color": "#526d79",
          "pieceIds": [
            "rc1",
            "rc2",
            "rc3",
            "rc4",
            "rc5"
          ]
        },
        {
          "id": "anchor",
          "name": "Holding Pattern",
          "shortName": "Hold",
          "color": "#70765e",
          "pieceIds": [
            "hp1",
            "hp2",
            "hp3",
            "hp4",
            "hp5"
          ]
        }
      ]
    }
  },
  {
    "envelope": {
      "id": "expansion-double-meaning",
      "title": "Double Meaning",
      "description": "A bee and a domino find another way to read the same thing.",
      "subtitle": "Double Meaning",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-double-meaning.v1"
    },
    "catalog": {
      "id": "expansion-double-meaning",
      "rows": [
        [
          "bb1",
          "bee",
          1,
          "Bee",
          "Bee",
          "A stout striped bee spreads four broad ivory wings below two short antennae and a tiny ochre splice.",
          "bb1"
        ],
        [
          "bb2",
          "bee",
          2,
          "Be Still",
          "Still",
          "The bee rests sideways with its large striped abdomen and one tall folded wing above short antennae.",
          "bb2"
        ],
        [
          "bb3",
          "bee",
          3,
          "In Between",
          "Tween",
          "A diagonal striped bee body crosses two unequal broad wing fragments, joined by an ochre paper band.",
          "bb3"
        ],
        [
          "bb4",
          "bee",
          4,
          "Be Side",
          "Side",
          "Two striped body segments form a stepped upright bee with a broad sideways wing and visible antennae.",
          "bb4"
        ],
        [
          "bb5",
          "bee",
          5,
          "Becoming",
          "Become",
          "A broad asymmetric bee collage carries a zigzag striped body, uneven wing lobes and two bold antennae.",
          "bb5"
        ],
        [
          "ds1",
          "domino",
          1,
          "Domino",
          "Domino",
          "One tall ivory domino has a heavy black border, a center divider, oversized pips and a blue corner patch.",
          "ds1"
        ],
        [
          "ds2",
          "domino",
          2,
          "Double",
          "Double",
          "Two divided domino faces join in a low right angle, with oversized black pips and a blue paper elbow.",
          "ds2"
        ],
        [
          "ds3",
          "domino",
          3,
          "Tumble",
          "Tumble",
          "Three pip-bearing domino segments form a falling diagonal zigzag tied by a blue splice.",
          "ds3"
        ],
        [
          "ds4",
          "domino",
          4,
          "Pause Here",
          "Pause",
          "A tall divided domino carries two short sideways faces on its left, forming an open bracket with oversized pips and a blue join.",
          "ds4"
        ],
        [
          "ds5",
          "domino",
          5,
          "Again",
          "Again",
          "A solid rising staircase of divided domino faces carries huge pips and a blue corner splice.",
          "ds5"
        ]
      ],
      "families": [
        {
          "id": "bee",
          "name": "Bee / Be",
          "shortName": "Bee",
          "color": "#9d7e3b",
          "pieceIds": [
            "bb1",
            "bb2",
            "bb3",
            "bb4",
            "bb5"
          ]
        },
        {
          "id": "domino",
          "name": "Double Six",
          "shortName": "Double",
          "color": "#596b70",
          "pieceIds": [
            "ds1",
            "ds2",
            "ds3",
            "ds4",
            "ds5"
          ]
        }
      ]
    }
  },
  {
    "envelope": {
      "id": "expansion-fine-print",
      "title": "Fine Print",
      "description": "An open book and a matchbook compare notes.",
      "subtitle": "Fine Print",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-fine-print.v1"
    },
    "catalog": {
      "id": "expansion-fine-print",
      "rows": [
        [
          "ob1",
          "book",
          1,
          "Open Book",
          "Book",
          "A broad open book spreads two large ivory page fans around a black central spine and a short teal binding scrap.",
          "ob1"
        ],
        [
          "ob2",
          "book",
          2,
          "Turn",
          "Turn",
          "One tall turning page rises above a short left page fan, joined at the same black spine and teal binding.",
          "ob2"
        ],
        [
          "ob3",
          "book",
          3,
          "Fold",
          "Fold",
          "Book pages form a bold diagonal accordion with black cover edges and a teal spine splice.",
          "ob3"
        ],
        [
          "ob4",
          "book",
          4,
          "Passage",
          "Pass",
          "Two unequal page fans sweep from a low slanted black spine, retaining the teal binding.",
          "ob4"
        ],
        [
          "ob5",
          "book",
          5,
          "Afterword",
          "After",
          "A solid asymmetric staircase of book-page blocks ends in a broad page fan, held by the black spine and teal binding.",
          "ob5"
        ],
        [
          "sm1",
          "matchbook",
          1,
          "Matchbook",
          "Match",
          "A tall open matchbook lifts its black cover above four thick ivory matches and a red striking strip.",
          "sm1"
        ],
        [
          "sm2",
          "matchbook",
          2,
          "Fan",
          "Fan",
          "Three thick matches fan sideways from a low folded cover and the inherited red striking strip.",
          "sm2"
        ],
        [
          "sm3",
          "matchbook",
          3,
          "Strike",
          "Strike",
          "A bent matchbook cover forms a diagonal elbow beside one thick lit match, retaining its red striker.",
          "sm3"
        ],
        [
          "sm4",
          "matchbook",
          4,
          "Spent",
          "Spent",
          "Two blunt dark match heads rise above an offset folded pocket with one spent match crossing its red striker.",
          "sm4"
        ],
        [
          "sm5",
          "matchbook",
          5,
          "Spark",
          "Spark",
          "A broad angular matchbook cover carries three radiating match heads and one oversized flat flame, tied by its red striker.",
          "sm5"
        ]
      ],
      "families": [
        {
          "id": "book",
          "name": "Open Book",
          "shortName": "Book",
          "color": "#70604d",
          "pieceIds": [
            "ob1",
            "ob2",
            "ob3",
            "ob4",
            "ob5"
          ]
        },
        {
          "id": "matchbook",
          "name": "Strike a Match",
          "shortName": "Match",
          "color": "#a15137",
          "pieceIds": [
            "sm1",
            "sm2",
            "sm3",
            "sm4",
            "sm5"
          ]
        }
      ]
    }
  },
  {
    "envelope": {
      "id": "expansion-sound-advice",
      "title": "Sound Advice",
      "description": "A handbell and a typewriter have something to say.",
      "subtitle": "Sound Advice",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-sound-advice.v1"
    },
    "catalog": {
      "id": "expansion-sound-advice",
      "rows": [
        [
          "bt1",
          "handbell",
          1,
          "Handbell",
          "Bell",
          "A flared black handbell has a thick ivory handle, a red paper tab at the handle neck, and a round clapper hanging below its bold lip.",
          "bt1"
        ],
        [
          "bt2",
          "handbell",
          2,
          "Tilt",
          "Tilt",
          "A bell tips sideways with a wide open lip, visible clapper and short banded handle pointing left.",
          "bt2"
        ],
        [
          "bt3",
          "handbell",
          3,
          "Peal",
          "Peal",
          "Two uneven bell-body halves fan diagonally around the inherited banded handle, red neck tab and round clapper.",
          "bt3"
        ],
        [
          "bt4",
          "handbell",
          4,
          "Tell",
          "Tell",
          "A wide inverted bell lip forms a low bowl, with a round clapper hanging at the left and an offset ivory handle attached at the red joint on the right.",
          "bt4"
        ],
        [
          "bt5",
          "handbell",
          5,
          "Told",
          "Told",
          "Three overlapping bell bodies step diagonally downward from an ivory handle at the upper right to a round clapper at the lower left.",
          "bt5"
        ],
        [
          "tw1",
          "typewriter",
          1,
          "Typewriter",
          "Type",
          "A squat black typewriter carries six oversized round keys, a broad carriage and one short ivory paper sheet.",
          "tw1"
        ],
        [
          "tw2",
          "typewriter",
          2,
          "Paper",
          "Paper",
          "A tall printed paper sheet rises from a narrow carriage and short bank of large keys, with the blue base tab.",
          "tw2"
        ],
        [
          "tw3",
          "typewriter",
          3,
          "Return",
          "Return",
          "The typewriter carriage becomes a long diagonal arm above an offset key bank, carrying its roller knob and blue tab.",
          "tw3"
        ],
        [
          "tw4",
          "typewriter",
          4,
          "Space",
          "Space",
          "Two staggered three-key banks form a low zigzag with carriage rollers, round side knobs, a folded paper corner, and a blue center splice.",
          "tw4"
        ],
        [
          "tw5",
          "typewriter",
          5,
          "Written",
          "Write",
          "A six-key black typewriter base supports overlapping carriage rollers and stepped ivory paper strips, with a large right-hand knob and a blue splice.",
          "tw5"
        ]
      ],
      "families": [
        {
          "id": "handbell",
          "name": "Bell / Tell",
          "shortName": "Bell",
          "color": "#8a6c4f",
          "pieceIds": [
            "bt1",
            "bt2",
            "bt3",
            "bt4",
            "bt5"
          ]
        },
        {
          "id": "typewriter",
          "name": "Type / Write",
          "shortName": "Type",
          "color": "#62747b",
          "pieceIds": [
            "tw1",
            "tw2",
            "tw3",
            "tw4",
            "tw5"
          ]
        }
      ]
    }
  }
];
export const EXPANSION160_DEFINITIONS = Object.freeze(definitions.map(item => Object.freeze({ ...item, catalog: { ...item.catalog, artUrl: asset => art[asset] } })));
