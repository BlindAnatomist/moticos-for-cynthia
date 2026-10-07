// Forty selected, independently reviewed artworks. Private candidate only.
const art = Object.freeze({
  im1: new URL("./art/im1.webp", import.meta.url).href,
  im2: new URL("./art/im2.webp", import.meta.url).href,
  im3: new URL("./art/im3.webp", import.meta.url).href,
  im4: new URL("./art/im4.webp", import.meta.url).href,
  im5: new URL("./art/im5.webp", import.meta.url).href,
  pn1: new URL("./art/pn1.webp", import.meta.url).href,
  pn2: new URL("./art/pn2.webp", import.meta.url).href,
  pn3: new URL("./art/pn3.webp", import.meta.url).href,
  pn4: new URL("./art/pn4.webp", import.meta.url).href,
  pn5: new URL("./art/pn5.webp", import.meta.url).href,
  sg1: new URL("./art/sg1.webp", import.meta.url).href,
  sg2: new URL("./art/sg2.webp", import.meta.url).href,
  sg3: new URL("./art/sg3.webp", import.meta.url).href,
  sg4: new URL("./art/sg4.webp", import.meta.url).href,
  sg5: new URL("./art/sg5.webp", import.meta.url).href,
  cm1: new URL("./art/cm1.webp", import.meta.url).href,
  cm2: new URL("./art/cm2.webp", import.meta.url).href,
  cm3: new URL("./art/cm3.webp", import.meta.url).href,
  cm4: new URL("./art/cm4.webp", import.meta.url).href,
  cm5: new URL("./art/cm5.webp", import.meta.url).href,
  sp1: new URL("./art/sp1.webp", import.meta.url).href,
  sp2: new URL("./art/sp2.webp", import.meta.url).href,
  sp3: new URL("./art/sp3.webp", import.meta.url).href,
  sp4: new URL("./art/sp4.webp", import.meta.url).href,
  sp5: new URL("./art/sp5.webp", import.meta.url).href,
  zp1: new URL("./art/zp1.webp", import.meta.url).href,
  zp2: new URL("./art/zp2.webp", import.meta.url).href,
  zp3: new URL("./art/zp3.webp", import.meta.url).href,
  zp4: new URL("./art/zp4.webp", import.meta.url).href,
  zp5: new URL("./art/zp5.webp", import.meta.url).href,
  ru1: new URL("./art/ru1.webp", import.meta.url).href,
  ru2: new URL("./art/ru2.webp", import.meta.url).href,
  ru3: new URL("./art/ru3.webp", import.meta.url).href,
  ru4: new URL("./art/ru4.webp", import.meta.url).href,
  ru5: new URL("./art/ru5.webp", import.meta.url).href,
  th1: new URL("./art/th1.webp", import.meta.url).href,
  th2: new URL("./art/th2.webp", import.meta.url).href,
  th3: new URL("./art/th3.webp", import.meta.url).href,
  th4: new URL("./art/th4.webp", import.meta.url).href,
  th5: new URL("./art/th5.webp", import.meta.url).href,
});
const definitions = [
  {
    "envelope": {
      "id": "expansion-small-impressions",
      "title": "Small Impressions",
      "subtitle": "Small Impressions",
      "description": "A rubber stamp and a fountain pen leave something behind.",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-small-impressions.v1"
    },
    "catalog": {
      "id": "expansion-small-impressions",
      "rows": [
        [
          "im1",
          "rubber-stamp",
          1,
          "Rubber Stamp",
          "Stamp",
          "A tall printed rubber stamp has a bulbous ivory-and-black handle, a red band around its neck and a broad black rectangular printing block.",
          "im1"
        ],
        [
          "im2",
          "rubber-stamp",
          2,
          "Sideways",
          "Sideways",
          "A sideways rubber-stamp handle spreads left of its broad upright printing block, joined at the neck by a red paper splice.",
          "im2"
        ],
        [
          "im3",
          "rubber-stamp",
          3,
          "Offset",
          "Offset",
          "A tall slanted stamp handle sits over two offset rectangular printing-block fragments, with red paper joining the stepped base.",
          "im3"
        ],
        [
          "im4",
          "rubber-stamp",
          4,
          "Countermark",
          "Counter",
          "Two long stamp-block strips extend to the right from a bulbous red-banded handle, leaving a large open rectangular gap between them.",
          "im4"
        ],
        [
          "im5",
          "rubber-stamp",
          5,
          "Lasting Impression",
          "Impress",
          "A broad rising staircase of three printing-block fragments carries a large red-banded handle left of center and a short handle remnant at the right.",
          "im5"
        ],
        [
          "pn1",
          "fountain-pen",
          1,
          "Fountain Pen",
          "Pen",
          "A broad ivory fountain-pen nib with a black slit and round breather mark rises from a stout black barrel joined by a blue paper band.",
          "pn1"
        ],
        [
          "pn2",
          "fountain-pen",
          2,
          "Inkling",
          "Inkling",
          "A left-pointing nib splits into two broad tines above and below a clear wedge, while its blue-banded barrel bends down at the right.",
          "pn2"
        ],
        [
          "pn3",
          "fountain-pen",
          3,
          "Underline",
          "Underline",
          "An ivory pen nib rises diagonally at the left from a thick horizontal black barrel, with a blue paper band across the bent join.",
          "pn3"
        ],
        [
          "pn4",
          "fountain-pen",
          4,
          "Written Through",
          "Through",
          "A split nib surrounds a large open oval, with two pointed tips above, a black barrel descending at the left and a blue tab at the right.",
          "pn4"
        ],
        [
          "pn5",
          "fountain-pen",
          5,
          "Pen Again",
          "Again",
          "A large nib points upper left while a smaller nib extends to the right, both joined by blue paper to a black barrel slanting down left.",
          "pn5"
        ]
      ],
      "families": [
        {
          "id": "rubber-stamp",
          "name": "Lasting Impression",
          "shortName": "Stamp",
          "color": "#a14a35",
          "pieceIds": [
            "im1",
            "im2",
            "im3",
            "im4",
            "im5"
          ],
          "material": 16
        },
        {
          "id": "fountain-pen",
          "name": "Pen / Again",
          "shortName": "Pen",
          "color": "#546a78",
          "pieceIds": [
            "pn1",
            "pn2",
            "pn3",
            "pn4",
            "pn5"
          ],
          "material": 16
        }
      ]
    },
    "postcardPieceIds": [
      "im3",
      "im4",
      "im5",
      "pn3",
      "pn4",
      "pn5"
    ]
  },
  {
    "envelope": {
      "id": "expansion-second-look",
      "title": "Second Look",
      "subtitle": "Second Look",
      "description": "A pair of spectacles and a camera rearrange what counts as a picture.",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-second-look.v1"
    },
    "catalog": {
      "id": "expansion-second-look",
      "rows": [
        [
          "sg1",
          "spectacles",
          1,
          "Spectacles",
          "Glasses",
          "Two unequal open round spectacle lenses join at an ochre bridge, with a bent black temple projecting at the right.",
          "sg1"
        ],
        [
          "sg2",
          "spectacles",
          2,
          "Side Glance",
          "Glance",
          "Two open spectacle lenses fold into a tall offset pair, with an ochre hinge and a bent temple at the lower right.",
          "sg2"
        ],
        [
          "sg3",
          "spectacles",
          3,
          "Overlook",
          "Overlook",
          "A large closed lens ring at lower left joins a smaller open rim at upper right through an ochre diagonal bridge.",
          "sg3"
        ],
        [
          "sg4",
          "spectacles",
          4,
          "Through",
          "Through",
          "Two thick unequal lens rims hang open at the bottom beneath a broad horizontal temple bar and ochre bridge.",
          "sg4"
        ],
        [
          "sg5",
          "spectacles",
          5,
          "Look Again",
          "Again",
          "A small round lens joins a much larger open oval rim while two unequal temple arms fan upward from the ochre splice.",
          "sg5"
        ],
        [
          "cm1",
          "camera",
          1,
          "Camera",
          "Camera",
          "A squat black camera body has an ivory circular lens, a square viewfinder above the left shoulder and a teal lower-right splice.",
          "cm1"
        ],
        [
          "cm2",
          "camera",
          2,
          "Exposure",
          "Expose",
          "A black camera back at the left narrows through broad accordion bellows to a round lens at the right, with a teal lower band.",
          "cm2"
        ],
        [
          "cm3",
          "camera",
          3,
          "Shutter",
          "Shutter",
          "Two camera-body blocks form a tall offset step, with a viewfinder on top, a large ivory lens below and a teal waist.",
          "cm3"
        ],
        [
          "cm4",
          "camera",
          4,
          "Viewfinder",
          "Finder",
          "A broad black camera frame surrounds an open rectangular window, with a solid ivory lens at lower left and a viewfinder above.",
          "cm4"
        ],
        [
          "cm5",
          "camera",
          5,
          "Still Life",
          "Still",
          "Three overlapping black camera-body slabs rise toward the right, with one ivory lens at lower left and a teal diagonal join.",
          "cm5"
        ]
      ],
      "families": [
        {
          "id": "spectacles",
          "name": "Look / Again",
          "shortName": "Glasses",
          "color": "#9b762f",
          "pieceIds": [
            "sg1",
            "sg2",
            "sg3",
            "sg4",
            "sg5"
          ],
          "material": 16
        },
        {
          "id": "camera",
          "name": "Still / Life",
          "shortName": "Camera",
          "color": "#5a8179",
          "pieceIds": [
            "cm1",
            "cm2",
            "cm3",
            "cm4",
            "cm5"
          ],
          "material": 16
        }
      ]
    },
    "postcardPieceIds": [
      "sg3",
      "sg4",
      "sg5",
      "cm3",
      "cm4",
      "cm5"
    ]
  },
  {
    "envelope": {
      "id": "expansion-loose-ends",
      "title": "Loose Ends",
      "subtitle": "Loose Ends",
      "description": "A safety pin and a zipper find new ways to hold a thought together.",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-loose-ends.v1"
    },
    "catalog": {
      "id": "expansion-loose-ends",
      "rows": [
        [
          "sp1",
          "safety-pin",
          1,
          "Safety Pin",
          "Pin",
          "A closed safety pin has broad engraved black arms around a long open center, one circular spring coil, a hooded clasp and red paper band.",
          "sp1"
        ],
        [
          "sp2",
          "safety-pin",
          2,
          "Unfasten",
          "Unfasten",
          "An open safety pin forms a wide V above a round spring coil, with a hooded clasp on the left arm and a pointed right arm.",
          "sp2"
        ],
        [
          "sp3",
          "safety-pin",
          3,
          "Crooked Point",
          "Crooked",
          "A continuous safety-pin arm bends into an S between a round coil at lower left and a hooded clasp at upper right, with a red band at the kink.",
          "sp3"
        ],
        [
          "sp4",
          "safety-pin",
          4,
          "Loopback",
          "Loop",
          "A large open coil sits above a low bent pin arm ending in a hooded clasp at the right, joined with red paper.",
          "sp4"
        ],
        [
          "sp5",
          "safety-pin",
          5,
          "Pinned Down",
          "Pinned",
          "A low pin collage links an open coil at the left to a hooded clasp at the right through broad angular arms and a red central join.",
          "sp5"
        ],
        [
          "zp1",
          "zipper",
          1,
          "Zipper",
          "Zipper",
          "A stout vertical zipper carries broad black tapes, large ivory teeth and a teardrop pull with an open round hole above a green splice.",
          "zp1"
        ],
        [
          "zp2",
          "zipper",
          2,
          "Parted",
          "Part",
          "Two broad zipper tapes open into a wide Y above a short stem, with large inward-facing teeth and a pull hanging to the left.",
          "zp2"
        ],
        [
          "zp3",
          "zipper",
          3,
          "Zigzag",
          "Zigzag",
          "Three zipper-tape sections form a bent diagonal step, with large ivory teeth, a teardrop pull near the top and a green paper joint.",
          "zp3"
        ],
        [
          "zp4",
          "zipper",
          4,
          "Interleave",
          "Weave",
          "Short zipper tapes cross in a broad uneven plus shape, with big interlocking teeth, a green central join and a pull at the right.",
          "zp4"
        ],
        [
          "zp5",
          "zipper",
          5,
          "Zip Through",
          "Through",
          "A broad zipper tape curls into an open C, with large ivory teeth along its inner edge and a teardrop pull hanging into the opening.",
          "zp5"
        ]
      ],
      "families": [
        {
          "id": "safety-pin",
          "name": "Pin / Point",
          "shortName": "Pin",
          "color": "#9a5040",
          "pieceIds": [
            "sp1",
            "sp2",
            "sp3",
            "sp4",
            "sp5"
          ],
          "material": 16
        },
        {
          "id": "zipper",
          "name": "Zip / Through",
          "shortName": "Zipper",
          "color": "#657867",
          "pieceIds": [
            "zp1",
            "zp2",
            "zp3",
            "zp4",
            "zp5"
          ],
          "material": 16
        }
      ]
    },
    "postcardPieceIds": [
      "sp3",
      "sp4",
      "sp5",
      "zp3",
      "zp4",
      "zp5"
    ]
  },
  {
    "envelope": {
      "id": "expansion-short-measure",
      "title": "Short Measure",
      "subtitle": "Short Measure",
      "description": "A ruler and a thimble take the measure of ordinary things.",
      "contentRevision": 1,
      "saveSchemaVersion": 1,
      "storageKey": "moticos.matching.expansion-short-measure.v1"
    },
    "catalog": {
      "id": "expansion-short-measure",
      "rows": [
        [
          "ru1",
          "ruler",
          1,
          "Ruler",
          "Ruler",
          "A short stout ivory ruler has a heavy black border, a large open hanging hole, three broad measurement marks and an ochre end splice.",
          "ru1"
        ],
        [
          "ru2",
          "ruler",
          2,
          "Short Rule",
          "Short",
          "Two unequal upright ruler strips join at an ochre bottom hinge around a tall open slot, with a hanging hole in the longer strip.",
          "ru2"
        ],
        [
          "ru3",
          "ruler",
          3,
          "Right Angle",
          "Angle",
          "Two thick ruler strips form a right-angle L, retaining a hanging hole, large black ticks and an ochre elbow.",
          "ru3"
        ],
        [
          "ru4",
          "ruler",
          4,
          "Out of Line",
          "Out",
          "Broad measuring strips form an open triangular frame, with a round hanging hole at lower left and a gap near the top.",
          "ru4"
        ],
        [
          "ru5",
          "ruler",
          5,
          "Rule Out",
          "Rule",
          "Three stout ruler strips fan upward and rightward from an ochre hinge, with large open wedges between their marked ivory faces.",
          "ru5"
        ],
        [
          "th1",
          "thimble",
          1,
          "Thimble",
          "Thimble",
          "An ivory thimble dome carries oversized black punch dots above a thick double rim band interrupted by a dusty-rose splice.",
          "th1"
        ],
        [
          "th2",
          "thimble",
          2,
          "Tilted",
          "Tilted",
          "Two unequal dotted thimble panels sit low and side by side, joined by a rose splice across their dark rim bands.",
          "th2"
        ],
        [
          "th3",
          "thimble",
          3,
          "Measure",
          "Measure",
          "A tall dotted thimble wall joins a large open oval rim on its lower right, with a dusty-rose paper splice between them.",
          "th3"
        ],
        [
          "th4",
          "thimble",
          4,
          "Open Top",
          "Open",
          "A broad thimble rim supports two short dotted sidewalls around an open U-shaped gap, with a displaced half-dome above the right joint.",
          "th4"
        ],
        [
          "th5",
          "thimble",
          5,
          "Little Measure",
          "Little",
          "Unequal dotted thimble shell pieces spread above a slanting double-rim strip, joined by rose paper around large open gaps.",
          "th5"
        ]
      ],
      "families": [
        {
          "id": "ruler",
          "name": "Rule / Out",
          "shortName": "Ruler",
          "color": "#9d7938",
          "pieceIds": [
            "ru1",
            "ru2",
            "ru3",
            "ru4",
            "ru5"
          ],
          "material": 16
        },
        {
          "id": "thimble",
          "name": "Little Measure",
          "shortName": "Thimble",
          "color": "#9b6256",
          "pieceIds": [
            "th1",
            "th2",
            "th3",
            "th4",
            "th5"
          ],
          "material": 16
        }
      ]
    },
    "postcardPieceIds": [
      "ru3",
      "ru4",
      "ru5",
      "th3",
      "th4",
      "th5"
    ]
  }
];
export const EXPANSION200_DEFINITIONS = Object.freeze(definitions.map(item => Object.freeze({ ...item, catalog: { ...item.catalog, artUrl: asset => art[asset] } })));
