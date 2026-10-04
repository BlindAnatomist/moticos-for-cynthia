// Board-only display bounds. Master artwork, collection and postcards are unchanged.
// Crop includes every nonzero-alpha pixel plus four source pixels of safety.
// Ink bounds (alpha >=16) are retained for rendered-size verification.
export const BOARD_ART_BOUNDS = Object.freeze({
  "b1": {
    "source": [
      768,
      768
    ],
    "crop": [
      45,
      28,
      697,
      699
    ],
    "ink": [
      51,
      98,
      685,
      602
    ]
  },
  "b2": {
    "source": [
      768,
      768
    ],
    "crop": [
      44,
      91,
      706,
      665
    ],
    "ink": [
      50,
      97,
      685,
      604
    ]
  },
  "b3": {
    "source": [
      768,
      768
    ],
    "crop": [
      0,
      43,
      768,
      725
    ],
    "ink": [
      13,
      49,
      750,
      681
    ]
  },
  "b4": {
    "source": [
      768,
      768
    ],
    "crop": [
      60,
      73,
      648,
      621
    ],
    "ink": [
      76,
      79,
      622,
      609
    ]
  },
  "b5": {
    "source": [
      768,
      768
    ],
    "crop": [
      60,
      98,
      648,
      579
    ],
    "ink": [
      81,
      104,
      620,
      565
    ]
  },
  "f1": {
    "source": [
      768,
      768
    ],
    "crop": [
      38,
      26,
      707,
      717
    ],
    "ink": [
      117,
      32,
      583,
      705
    ]
  },
  "f2": {
    "source": [
      768,
      768
    ],
    "crop": [
      56,
      25,
      700,
      743
    ],
    "ink": [
      62,
      52,
      660,
      676
    ]
  },
  "f3": {
    "source": [
      768,
      768
    ],
    "crop": [
      10,
      28,
      742,
      740
    ],
    "ink": [
      77,
      64,
      666,
      665
    ]
  },
  "f4": {
    "source": [
      768,
      768
    ],
    "crop": [
      109,
      80,
      568,
      614
    ],
    "ink": [
      167,
      86,
      504,
      602
    ]
  },
  "f5": {
    "source": [
      768,
      768
    ],
    "crop": [
      93,
      81,
      604,
      612
    ],
    "ink": [
      186,
      87,
      465,
      599
    ]
  },
  "k1": {
    "source": [
      768,
      768
    ],
    "crop": [
      46,
      51,
      692,
      692
    ],
    "ink": [
      53,
      57,
      674,
      679
    ]
  },
  "k2": {
    "source": [
      768,
      768
    ],
    "crop": [
      0,
      45,
      762,
      668
    ],
    "ink": [
      26,
      67,
      727,
      637
    ]
  },
  "k3": {
    "source": [
      768,
      768
    ],
    "crop": [
      68,
      86,
      639,
      498
    ],
    "ink": [
      76,
      226,
      622,
      350
    ]
  },
  "k4": {
    "source": [
      768,
      768
    ],
    "crop": [
      90,
      82,
      587,
      606
    ],
    "ink": [
      236,
      88,
      258,
      594
    ]
  },
  "k5": {
    "source": [
      768,
      768
    ],
    "crop": [
      92,
      97,
      606,
      577
    ],
    "ink": [
      98,
      103,
      594,
      565
    ]
  },
  "m1": {
    "source": [
      768,
      768
    ],
    "crop": [
      50,
      53,
      699,
      715
    ],
    "ink": [
      106,
      75,
      561,
      626
    ]
  },
  "m2": {
    "source": [
      768,
      768
    ],
    "crop": [
      24,
      46,
      724,
      687
    ],
    "ink": [
      30,
      52,
      712,
      646
    ]
  },
  "m3": {
    "source": [
      768,
      768
    ],
    "crop": [
      104,
      86,
      568,
      526
    ],
    "ink": [
      110,
      203,
      556,
      403
    ]
  },
  "m4": {
    "source": [
      768,
      768
    ],
    "crop": [
      110,
      84,
      567,
      601
    ],
    "ink": [
      190,
      90,
      403,
      589
    ]
  },
  "m5": {
    "source": [
      768,
      768
    ],
    "crop": [
      74,
      117,
      620,
      532
    ],
    "ink": [
      80,
      123,
      608,
      520
    ]
  },
  "r1": {
    "source": [
      768,
      768
    ],
    "crop": [
      111,
      123,
      545,
      527
    ],
    "ink": [
      118,
      129,
      532,
      515
    ]
  },
  "r2": {
    "source": [
      768,
      768
    ],
    "crop": [
      82,
      90,
      605,
      559
    ],
    "ink": [
      88,
      117,
      592,
      526
    ]
  },
  "r3": {
    "source": [
      768,
      768
    ],
    "crop": [
      89,
      103,
      593,
      491
    ],
    "ink": [
      98,
      193,
      578,
      393
    ]
  },
  "r4": {
    "source": [
      768,
      768
    ],
    "crop": [
      106,
      136,
      558,
      531
    ],
    "ink": [
      113,
      143,
      545,
      486
    ]
  },
  "r5": {
    "source": [
      768,
      768
    ],
    "crop": [
      83,
      107,
      603,
      583
    ],
    "ink": [
      89,
      122,
      590,
      504
    ]
  },
  "t1": {
    "source": [
      768,
      768
    ],
    "crop": [
      91,
      116,
      597,
      550
    ],
    "ink": [
      98,
      235,
      584,
      337
    ]
  },
  "t2": {
    "source": [
      768,
      768
    ],
    "crop": [
      114,
      92,
      540,
      587
    ],
    "ink": [
      173,
      98,
      475,
      572
    ]
  },
  "t3": {
    "source": [
      768,
      768
    ],
    "crop": [
      65,
      93,
      621,
      580
    ],
    "ink": [
      105,
      99,
      572,
      568
    ]
  },
  "t4": {
    "source": [
      768,
      768
    ],
    "crop": [
      65,
      91,
      622,
      589
    ],
    "ink": [
      104,
      98,
      574,
      576
    ]
  },
  "t5": {
    "source": [
      768,
      768
    ],
    "crop": [
      78,
      89,
      579,
      590
    ],
    "ink": [
      127,
      95,
      524,
      576
    ]
  }
});

// Only compact board labels change; full names remain on selection and aria-label.
export const COMPACT_BOARD_LABELS = Object.freeze({
  "b2": "Wing",
  "b3": "Finder",
  "f3": "Garden",
  "f5": "House",
  "k2": "Frond",
  "k5": "Portal"
});
