// Reviewed Stage C campaign. Append-only content; no new upgrades.
export default {
  "levels": [
    {
      "level": 51,
      "xp": 9095,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 52,
      "xp": 9185,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 53,
      "xp": 9300,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 54,
      "xp": 9375,
      "targetCeiling": 5,
      "slots": 2
    }
  ],
  "chapters": [
    {
      "id": "sideways-company",
      "number": 25,
      "title": "Sideways Company",
      "catalogEnvelopeId": "expansion-sideways-company",
      "entryXP": 8980,
      "minimumLevel": 51,
      "levelCap": 51,
      "storyIds": [
        "sideways-company-letter-1",
        "sideways-company-letter-2",
        "sideways-company-letter-3",
        "sideways-company-letter-4"
      ],
      "entrySources": [
        "paper-crab"
      ],
      "nextId": "a-little-tending",
      "nextTitle": "A Little Tending",
      "nextPreview": "A can and a trowel carry this small exchange back to the first garden. Nothing needs watering on a clock."
    },
    {
      "id": "a-little-tending",
      "number": 26,
      "title": "A Little Tending",
      "catalogEnvelopeId": "expansion-a-little-tending",
      "entryXP": 9095,
      "minimumLevel": 52,
      "levelCap": 52,
      "storyIds": [
        "a-little-tending-letter-1",
        "a-little-tending-letter-2",
        "a-little-tending-letter-3",
        "a-little-tending-letter-4",
        "a-little-tending-letter-5"
      ],
      "entrySources": [
        "garden-watering-can"
      ],
      "nextId": "warm-regards",
      "nextTitle": "Warm Regards",
      "nextPreview": "A rigid iron meets a soft mitten. Two replies take different amounts of paper, then the cuff turns out a brief goodbye."
    },
    {
      "id": "warm-regards",
      "number": 27,
      "title": "Warm Regards",
      "catalogEnvelopeId": "expansion-warm-regards",
      "entryXP": 9185,
      "minimumLevel": 53,
      "levelCap": 53,
      "storyIds": [
        "warm-regards-letter-1",
        "warm-regards-letter-2",
        "warm-regards-letter-3",
        "warm-regards-letter-4",
        "warm-regards-letter-5"
      ],
      "entrySources": [
        "paper-flatiron"
      ],
      "nextId": "next-move",
      "nextTitle": "Next Move",
      "nextPreview": "A knight notices its pedestal. A cogwheel writes to an old key, then returns for one moderate-sized closing reply."
    },
    {
      "id": "next-move",
      "number": 28,
      "title": "Next Move",
      "catalogEnvelopeId": "expansion-next-move",
      "entryXP": 9300,
      "minimumLevel": 54,
      "levelCap": 54,
      "storyIds": [
        "next-move-letter-1",
        "next-move-letter-2",
        "next-move-letter-3",
        "next-move-letter-4",
        "next-move-letter-5"
      ],
      "entrySources": [
        "paper-chess-knight"
      ],
      "nextId": null,
      "nextTitle": null,
      "nextPreview": null
    }
  ],
  "story": [
    {
      "id": "sideways-company-letter-1",
      "chapterId": "sideways-company",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "c280-cr1",
          "quantity": 1
        }
      ],
      "xp": 0,
      "coins": 0,
      "title": "A whole crab, to begin",
      "letter": "The crab arrives with both claws and all its sideways opinions. Send this first shape as it is. A moved claw has its own envelope.",
      "goal": "Make and send Paper Crab.",
      "sentCaption": "The whole crab has been sent."
    },
    {
      "id": "sideways-company-letter-2",
      "chapterId": "sideways-company",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "c280-cr2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "The claw writes from below",
      "letter": "One claw has moved beneath the shell. The smaller one stays high, as if the address and the reply were written on different lines.",
      "goal": "Make and send Claw Correspondence.",
      "sentCaption": "The lower claw found its line."
    },
    {
      "id": "sideways-company-letter-3",
      "chapterId": "sideways-company",
      "requiresMilestones": [
        "sideways-company-letter-1",
        "sideways-company-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "c280-cr3",
          "quantity": 1
        },
        {
          "pieceId": "c280-sn2",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "Beside the shoulder",
      "letter": "The crab has shifted part of its shell sideways. The snail offers a low shoulder. Put the two beside each other without asking either to straighten up.",
      "goal": "Make and send Sideways Neighbour and Snail Shoulder.",
      "sentCaption": "The shifted shell and small shoulder travelled together."
    },
    {
      "id": "sideways-company-letter-4",
      "chapterId": "sideways-company",
      "requiresMilestones": [
        "sideways-company-letter-1",
        "sideways-company-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "c280-cr2",
          "quantity": 1
        },
        {
          "pieceId": "c280-sn4",
          "quantity": 1
        }
      ],
      "xp": 70,
      "coins": 30,
      "title": "A visit with the coil undone",
      "letter": "The snail has opened its outer whorl behind its head. Send the low crab claw along for the visit. A little company can leave a large curve quite unclosed.",
      "goal": "Make and send Claw Correspondence and Uncoiled Visit.",
      "sentCaption": "The open whorl kept its own shape, with company beside it."
    },
    {
      "id": "a-little-tending-letter-1",
      "chapterId": "a-little-tending",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "c280-wc1",
          "quantity": 1
        }
      ],
      "xp": 0,
      "coins": 0,
      "title": "The handle end of the task",
      "letter": "Here is a can with somewhere to hold it and somewhere to pour. Send the whole small arrangement before either end changes its mind.",
      "goal": "Make and send Garden Watering Can.",
      "sentCaption": "Handle and spout arrived together."
    },
    {
      "id": "a-little-tending-letter-2",
      "chapterId": "a-little-tending",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "c280-wc2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "A rose brought low",
      "letter": "The rose has moved down beside the can. No water needs to fall; the lowered spout is already a small act of attention.",
      "goal": "Make and send Lowered Rose.",
      "sentCaption": "The rose took the lower place."
    },
    {
      "id": "a-little-tending-letter-3",
      "chapterId": "a-little-tending",
      "requiresMilestones": [
        "a-little-tending-letter-1",
        "a-little-tending-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "c280-wc2",
          "quantity": 1
        },
        {
          "pieceId": "c280-gt2",
          "quantity": 1
        }
      ],
      "xp": 20,
      "coins": 10,
      "title": "Tools at the edge",
      "letter": "The can lowers its rose while the trowel moves its scoop off to one side. They look ready to attend to the margin rather than the middle.",
      "goal": "Make and send Lowered Rose and Trowel Offset.",
      "sentCaption": "The two tools found the margin."
    },
    {
      "id": "a-little-tending-letter-4",
      "chapterId": "a-little-tending",
      "requiresMilestones": [
        "a-little-tending-letter-3"
      ],
      "requirements": [
        {
          "pieceId": "c280-wc3",
          "quantity": 1
        },
        {
          "pieceId": "c280-gt1",
          "quantity": 1
        }
      ],
      "xp": 25,
      "coins": 10,
      "title": "Where the hand would go",
      "letter": "The can has raised one shoulder but left its handle low. The trowel keeps its grip above its scoop. Two ordinary places for a hand have become rather different pictures.",
      "goal": "Make and send Can of Two Heights and Garden Trowel.",
      "sentCaption": "The raised can and the whole trowel have been sent."
    },
    {
      "id": "a-little-tending-letter-5",
      "chapterId": "a-little-tending",
      "requiresMilestones": [
        "a-little-tending-letter-4"
      ],
      "requirements": [
        {
          "pieceId": "c280-gt3",
          "quantity": 1
        },
        {
          "pieceId": "f2",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "A scoop visits the first garden",
      "letter": "The trowel opens its scoop toward the old Fern Cup. The garden has come in its own container. Perhaps tending begins by noticing what is already there.",
      "goal": "Make and send Opened Scoop and Fern Cup.",
      "sentCaption": "The opened scoop visited the Fern Cup. This little tending is complete."
    },
    {
      "id": "warm-regards-letter-1",
      "chapterId": "warm-regards",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "c280-fi1",
          "quantity": 1
        }
      ],
      "xp": 0,
      "coins": 0,
      "title": "A weight for the corner",
      "letter": "The flatiron has brought its broad sole and a handle raised above it. Send its whole weight on paper; the envelope will manage.",
      "goal": "Make and send Paper Flatiron.",
      "sentCaption": "The flatiron arrived without weighing down the envelope."
    },
    {
      "id": "warm-regards-letter-2",
      "chapterId": "warm-regards",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "c280-fi2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "Room at the heel",
      "letter": "A notch has divided the iron’s heel into two blunt ends. The pointed front stays together. Even a firm shape can leave something unsaid at the back.",
      "goal": "Make and send Flatiron Forked Heel.",
      "sentCaption": "The forked heel left its small omission."
    },
    {
      "id": "warm-regards-letter-3",
      "chapterId": "warm-regards",
      "requiresMilestones": [
        "warm-regards-letter-1",
        "warm-regards-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "c280-fi2",
          "quantity": 1
        },
        {
          "pieceId": "c280-mi3",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "Cloth takes a bend",
      "letter": "The mitten bends at its middle beside the iron’s forked heel. The soft piece has not been pressed straight. It may have a better use for its elbow.",
      "goal": "Make and send Flatiron Forked Heel and Mitten Elbow.",
      "sentCaption": "The cloth kept its bend beside the iron."
    },
    {
      "id": "warm-regards-letter-4",
      "chapterId": "warm-regards",
      "requiresMilestones": [
        "warm-regards-letter-1",
        "warm-regards-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "c280-fi4",
          "quantity": 1
        },
        {
          "pieceId": "c280-mi1",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Under the lifted seam",
      "letter": "The handled iron lifts away from its sole along one seam. The whole mitten waits beside that opening. Let the heavy picture make the larger gesture this time.",
      "goal": "Make and send Flatiron Lifted Seam and Paper Mitten.",
      "sentCaption": "The iron lifted its seam; the mitten stayed whole."
    },
    {
      "id": "warm-regards-letter-5",
      "chapterId": "warm-regards",
      "requiresMilestones": [
        "warm-regards-letter-3",
        "warm-regards-letter-4"
      ],
      "requirements": [
        {
          "pieceId": "c280-mi2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "The inside of the regards",
      "letter": "The mitten has turned its cuff down one side, showing the pale reverse. This last reply needs only the cloth. There is another side to a warm regard.",
      "goal": "Make and send Turned Mitten Cuff.",
      "sentCaption": "The turned cuff closed the letter with its reverse showing."
    },
    {
      "id": "next-move-letter-1",
      "chapterId": "next-move",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "c280-kn2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "The figure shifts its footing",
      "letter": "The knight’s base stays broad while the horse has moved to its edge. Send the offset figure. Its whole, unshifted relation to the base has a separate letter.",
      "goal": "Make and send Knight Side Step.",
      "sentCaption": "The knight arrived at the edge of its base."
    },
    {
      "id": "next-move-letter-2",
      "chapterId": "next-move",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "c280-kn1",
          "quantity": 1
        }
      ],
      "xp": 0,
      "coins": 0,
      "title": "What the figure stands on",
      "letter": "The horse and pedestal are still one solid picture here. Give the whole knight a reply too. The support has been present from the beginning.",
      "goal": "Make and send Paper Chess Knight.",
      "sentCaption": "The whole knight brought its pedestal."
    },
    {
      "id": "next-move-letter-3",
      "chapterId": "next-move",
      "requiresMilestones": [
        "next-move-letter-1",
        "next-move-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "c280-cg2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "One tooth writes separately",
      "letter": "One tooth has moved outward from the cogwheel, still attached by a paper tongue. The first answer from this wheel is a small departure.",
      "goal": "Make and send Cogwheel Missing Beat.",
      "sentCaption": "The displaced tooth sent the first answer."
    },
    {
      "id": "next-move-letter-4",
      "chapterId": "next-move",
      "requiresMilestones": [
        "next-move-letter-3"
      ],
      "requirements": [
        {
          "pieceId": "c280-cg2",
          "quantity": 1
        },
        {
          "pieceId": "k2",
          "quantity": 1
        }
      ],
      "xp": 20,
      "coins": 10,
      "title": "Teeth, with a leaf between",
      "letter": "Send that displaced cog tooth to the old Frond Key. The key has teeth too, and has somehow found room for a leaf. Their resemblance is a reason for a letter, not a lock to solve.",
      "goal": "Make and send Cogwheel Missing Beat and Frond Key.",
      "sentCaption": "The cogwheel found teeth and a leaf in its reply."
    },
    {
      "id": "next-move-letter-5",
      "chapterId": "next-move",
      "requiresMilestones": [
        "next-move-letter-4"
      ],
      "requirements": [
        {
          "pieceId": "c280-kn2",
          "quantity": 1
        },
        {
          "pieceId": "c280-cg3",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "Back to the supporting cast",
      "letter": "The cogwheel opens its two sectors into a broad angular jaw. Return the offset knight beside it: one picture opens, the other still has somewhere to stand. That is enough for this exchange.",
      "goal": "Make and send Knight Side Step and Cogwheel Half Turn.",
      "sentCaption": "The jaw and the offset knight closed these four correspondences."
    }
  ],
  "ordinary": [
    {
      "id": "sideways-company-optional-cr",
      "chapterId": "sideways-company",
      "requirements": [
        {
          "pieceId": "c280-cr4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another picture for the envelope",
      "letter": "Folded Carapace has a place here if you want to send another picture. This optional reply can wait.",
      "goal": "Make and send Folded Carapace.",
      "sentCaption": "The extra picture has been sent."
    },
    {
      "id": "sideways-company-optional-sn",
      "chapterId": "sideways-company",
      "requirements": [
        {
          "pieceId": "c280-sn4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another picture for the envelope",
      "letter": "Uncoiled Visit has a place here if you want to send another picture. This optional reply can wait.",
      "goal": "Make and send Uncoiled Visit.",
      "sentCaption": "The extra picture has been sent."
    },
    {
      "id": "a-little-tending-optional-wc",
      "chapterId": "a-little-tending",
      "requirements": [
        {
          "pieceId": "c280-wc4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another picture for the envelope",
      "letter": "Tending Elbow has a place here if you want to send another picture. This optional reply can wait.",
      "goal": "Make and send Tending Elbow.",
      "sentCaption": "The extra picture has been sent."
    },
    {
      "id": "a-little-tending-optional-gt",
      "chapterId": "a-little-tending",
      "requirements": [
        {
          "pieceId": "c280-gt4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another picture for the envelope",
      "letter": "Trowel Overlap has a place here if you want to send another picture. This optional reply can wait.",
      "goal": "Make and send Trowel Overlap.",
      "sentCaption": "The extra picture has been sent."
    },
    {
      "id": "warm-regards-optional-fi",
      "chapterId": "warm-regards",
      "requirements": [
        {
          "pieceId": "c280-fi4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another picture for the envelope",
      "letter": "Flatiron Lifted Seam has a place here if you want to send another picture. This optional reply can wait.",
      "goal": "Make and send Flatiron Lifted Seam.",
      "sentCaption": "The extra picture has been sent."
    },
    {
      "id": "warm-regards-optional-mi",
      "chapterId": "warm-regards",
      "requirements": [
        {
          "pieceId": "c280-mi4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another picture for the envelope",
      "letter": "Mitten Pocket Fold has a place here if you want to send another picture. This optional reply can wait.",
      "goal": "Make and send Mitten Pocket Fold.",
      "sentCaption": "The extra picture has been sent."
    },
    {
      "id": "next-move-optional-kn",
      "chapterId": "next-move",
      "requirements": [
        {
          "pieceId": "c280-kn4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another picture for the envelope",
      "letter": "Knight Cutback has a place here if you want to send another picture. This optional reply can wait.",
      "goal": "Make and send Knight Cutback.",
      "sentCaption": "The extra picture has been sent."
    },
    {
      "id": "next-move-optional-cg",
      "chapterId": "next-move",
      "requirements": [
        {
          "pieceId": "c280-cg4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another picture for the envelope",
      "letter": "Cogwheel Overprint has a place here if you want to send another picture. This optional reply can wait.",
      "goal": "Make and send Cogwheel Overprint.",
      "sentCaption": "The extra picture has been sent."
    }
  ],
  "sourceRules": [
    {
      "id": "paper-crab",
      "chapterId": "sideways-company",
      "milestones": []
    },
    {
      "id": "paper-snail",
      "chapterId": "sideways-company",
      "milestones": [
        "sideways-company-letter-1",
        "sideways-company-letter-2"
      ]
    },
    {
      "id": "garden-watering-can",
      "chapterId": "a-little-tending",
      "milestones": []
    },
    {
      "id": "garden-trowel",
      "chapterId": "a-little-tending",
      "milestones": [
        "a-little-tending-letter-1",
        "a-little-tending-letter-2"
      ]
    },
    {
      "id": "paper-flatiron",
      "chapterId": "warm-regards",
      "milestones": []
    },
    {
      "id": "paper-mitten",
      "chapterId": "warm-regards",
      "milestones": [
        "warm-regards-letter-1",
        "warm-regards-letter-2"
      ]
    },
    {
      "id": "paper-chess-knight",
      "chapterId": "next-move",
      "milestones": []
    },
    {
      "id": "paper-cogwheel",
      "chapterId": "next-move",
      "milestones": [
        "next-move-letter-1",
        "next-move-letter-2"
      ]
    }
  ],
  "upgrades": [],
  "chapterCopy": {
    "sideways-company": {
      "number": 25,
      "id": "sideways-company",
      "title": "Sideways Company",
      "familyIds": [
        "paper-crab",
        "paper-snail"
      ],
      "opening": "Two crab letters begin this envelope. Answer both to meet the snail; then two different visits wait together.",
      "ending": "The two visits have arrived. Neither animal had to become the other to share an envelope.",
      "goal": "Send every story letter in Sideways Company. Supplies are free; purchases and optional discoveries are not required.",
      "sourceNotice": "Both opening story letters unlock Paper Snail. A previously earned source remains selected alongside the first new source.",
      "optionalInvitation": "The larger pictures are optional discoveries. Find them when you want another postcard.",
      "pacingPattern": "paired single-family introductions; asymmetric concurrent visits; closure on either final delivery"
    },
    "a-little-tending": {
      "number": 26,
      "id": "a-little-tending",
      "title": "A Little Tending",
      "familyIds": [
        "garden-watering-can",
        "garden-trowel"
      ],
      "opening": "A can and a trowel carry this small exchange back to the first garden. Nothing needs watering on a clock.",
      "ending": "The opened scoop has reached the Fern Cup. The garden can stay exactly as it is while you put down the letter.",
      "goal": "Send every story letter in A Little Tending. Supplies are free; purchases and optional discoveries are not required.",
      "sourceNotice": "Both opening story letters unlock Garden Trowel. A previously earned source remains selected alongside the first new source.",
      "optionalInvitation": "The larger pictures are optional discoveries. Find them when you want another postcard.",
      "pacingPattern": "paired introductions; serial low/middle tool relations; old Fern callback closes"
    },
    "warm-regards": {
      "number": 27,
      "id": "warm-regards",
      "title": "Warm Regards",
      "familyIds": [
        "paper-flatiron",
        "paper-mitten"
      ],
      "opening": "A rigid iron meets a soft mitten. Two replies take different amounts of paper, then the cuff turns out a brief goodbye.",
      "ending": "The last word belongs to the turned cuff. The iron can rest, and the cloth keeps its bend.",
      "goal": "Send every story letter in Warm Regards. Supplies are free; purchases and optional discoveries are not required.",
      "sourceNotice": "Both opening story letters unlock Paper Mitten. A previously earned source remains selected alongside the first new source.",
      "optionalInvitation": "The larger pictures are optional discoveries. Find them when you want another postcard.",
      "pacingPattern": "paired introductions; unequal concurrent material relations; solo textile coda"
    },
    "next-move": {
      "number": 28,
      "id": "next-move",
      "title": "Next Move",
      "familyIds": [
        "paper-chess-knight",
        "paper-cogwheel"
      ],
      "opening": "A knight notices its pedestal. A cogwheel writes to an old key, then returns for one moderate-sized closing reply.",
      "ending": "These four correspondences are complete. There are now 280 pictures available across the opened collections; discovering them all is optional. The earlier endings remain yours. This is the 280-picture checkpoint on the way to 320.",
      "goal": "Send every story letter in Next Move. Supplies are free; purchases and optional discoveries are not required.",
      "sourceNotice": "Both opening story letters unlock Paper Cogwheel. A previously earned source remains selected alongside the first new source.",
      "optionalInvitation": "The larger pictures are optional discoveries. Find them when you want another postcard.",
      "pacingPattern": "paired introductions; cogwheel solo; old Key callback; return to new pair"
    }
  },
  "postscripts": [
    {
      "id": "postscript-paper-crab",
      "pieceId": "c280-cr5",
      "title": "Crab in Parentheses",
      "goal": "Merge two Folded Carapace pictures to discover Crab in Parentheses.",
      "caption": "The claws turn inward around a low, solid shell.",
      "reverse": "The claws turn around their own shell. This crab has found a boundary it can carry, with a gap left for company.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-snail",
      "pieceId": "c280-sn5",
      "title": "Snail Under Its Own Roof",
      "goal": "Merge two Uncoiled Visit pictures to discover Snail Under Its Own Roof.",
      "caption": "The shell opens a broad hood above the snail’s head.",
      "reverse": "The coil gives the snail a hood and leaves its face in the open. A roof need not close the visit.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-garden-watering-can",
      "pieceId": "c280-wc5",
      "title": "Watering Can Aside",
      "goal": "Merge two Tending Elbow pictures to discover Watering Can Aside.",
      "caption": "The rose-ended spout crosses back toward the handle side.",
      "reverse": "The spout turns back across the can toward the handle end. The thing that carries the tending has entered the picture too.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-garden-trowel",
      "pieceId": "c280-gt5",
      "title": "Trowel Cradle",
      "goal": "Merge two Trowel Overlap pictures to discover Trowel Cradle.",
      "caption": "The blade sections fold into a shallow, uneven cradle.",
      "reverse": "The scoop has folded into a shallow cradle. The handle remains at its side, as if the tool has made somewhere to set its own work.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-flatiron",
      "pieceId": "c280-fi5",
      "title": "Flatiron Footnote",
      "goal": "Merge two Flatiron Lifted Seam pictures to discover Flatiron Footnote.",
      "caption": "The broad sole makes a low zig beneath the rear handle.",
      "reverse": "The sole has become a low zig, and the handle belongs to the rear part. A firm statement has made room for a footnote.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-mitten",
      "pieceId": "c280-mi5",
      "title": "Mitten Long Goodbye",
      "goal": "Merge two Mitten Pocket Fold pictures to discover Mitten Long Goodbye.",
      "caption": "A broad cloth cuff connects the two pouch sections.",
      "reverse": "The cuff joins the two cloth parts across a longer interval. The thumb is still there, keeping the goodbye recognisably a mitten.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-chess-knight",
      "pieceId": "c280-kn5",
      "title": "Knight Bearing Up",
      "goal": "Merge two Knight Cutback pictures to discover Knight Bearing Up.",
      "caption": "The pedestal rises beneath the upright horse’s muzzle.",
      "reverse": "The pedestal rises toward the upright muzzle. The support has a gesture of its own now, without asking the horse to bow.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-cogwheel",
      "pieceId": "c280-cg5",
      "title": "Cogwheel Outward",
      "goal": "Merge two Cogwheel Overprint pictures to discover Cogwheel Outward.",
      "caption": "Three broad teeth face left and three face right.",
      "reverse": "Three teeth point one way and three the other. The old hub opens at both edges. This wheel can finish its picture without turning.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    }
  ],
  "discoveryCaptions": {}
};
