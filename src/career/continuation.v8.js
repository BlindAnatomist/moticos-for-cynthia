// Authored Stage D correspondence, reviewed against the selected artwork.
// Append-only recipes, gates and rewards from the bounded forty-picture plan.
export default {
  "levels": [
    {
      "level": 55,
      "xp": 9445,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 56,
      "xp": 9580,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 57,
      "xp": 9705,
      "targetCeiling": 5,
      "slots": 2
    },
    {
      "level": 58,
      "xp": 9830,
      "targetCeiling": 5,
      "slots": 2
    }
  ],
  "chapters": [
    {
      "id": "a-place-to-pause",
      "number": 29,
      "title": "A Place to Pause",
      "catalogEnvelopeId": "expansion-a-place-to-pause",
      "entryXP": 9375,
      "minimumLevel": 55,
      "levelCap": 55,
      "storyIds": [
        "a-place-to-pause-letter-1",
        "a-place-to-pause-letter-2",
        "a-place-to-pause-letter-3",
        "a-place-to-pause-letter-4"
      ],
      "entrySources": [
        "paper-rabbit"
      ],
      "nextId": "room-for-rhythm",
      "nextTitle": "Room for Rhythm",
      "nextPreview": "A violin and a drum exchange shapes at their own pace. Two replies wait side by side, then a familiar trumpet adds a short closing note."
    },
    {
      "id": "room-for-rhythm",
      "number": 30,
      "title": "Room for Rhythm",
      "catalogEnvelopeId": "expansion-room-for-rhythm",
      "entryXP": 9445,
      "minimumLevel": 56,
      "levelCap": 56,
      "storyIds": [
        "room-for-rhythm-letter-1",
        "room-for-rhythm-letter-2",
        "room-for-rhythm-letter-3",
        "room-for-rhythm-letter-4",
        "room-for-rhythm-letter-5"
      ],
      "entrySources": [
        "paper-violin"
      ],
      "nextId": "weight-and-breath",
      "nextTitle": "Weight and Breath",
      "nextPreview": "The anvil introduces its weight before the bellows open. Two unequal replies compare their outlines, followed by a brief return to the flatiron."
    },
    {
      "id": "weight-and-breath",
      "number": 31,
      "title": "Weight and Breath",
      "catalogEnvelopeId": "expansion-weight-and-breath",
      "entryXP": 9580,
      "minimumLevel": 57,
      "levelCap": 57,
      "storyIds": [
        "weight-and-breath-letter-1",
        "weight-and-breath-letter-2",
        "weight-and-breath-letter-3",
        "weight-and-breath-letter-4",
        "weight-and-breath-letter-5"
      ],
      "entrySources": [
        "paper-anvil"
      ],
      "nextId": "along-the-grain",
      "nextTitle": "Along the Grain",
      "nextPreview": "A saw and a wrench begin with familiar grips and unexpected turns. Their letters visit the old ruler, then return for one final exchange."
    },
    {
      "id": "along-the-grain",
      "number": 32,
      "title": "Along the Grain",
      "catalogEnvelopeId": "expansion-along-the-grain",
      "entryXP": 9705,
      "minimumLevel": 58,
      "levelCap": 58,
      "storyIds": [
        "along-the-grain-letter-1",
        "along-the-grain-letter-2",
        "along-the-grain-letter-3",
        "along-the-grain-letter-4",
        "along-the-grain-letter-5"
      ],
      "entrySources": [
        "paper-handsaw"
      ],
      "nextId": null,
      "nextTitle": null,
      "nextPreview": null
    }
  ],
  "story": [
    {
      "id": "a-place-to-pause-letter-1",
      "chapterId": "a-place-to-pause",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "d320-rb1",
          "quantity": 1
        }
      ],
      "xp": 0,
      "coins": 0,
      "title": "Whole company",
      "letter": "The rabbit is sitting with both ears upright and its paws together. Send this whole first picture as an introduction. The sideways ear has a letter of its own.",
      "goal": "Make and send Paper Rabbit.",
      "sentCaption": "The seated rabbit brought both upright ears."
    },
    {
      "id": "a-place-to-pause-letter-2",
      "chapterId": "a-place-to-pause",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "d320-rb2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "Listening to one side",
      "letter": "One ear stays tall while the other reaches across the rabbit’s back. A small change can give a familiar face another way to listen. Send this sideways greeting.",
      "goal": "Make and send Rabbit Listening Aside.",
      "sentCaption": "One ear has sent its greeting to the side."
    },
    {
      "id": "a-place-to-pause-letter-3",
      "chapterId": "a-place-to-pause",
      "requiresMilestones": [
        "a-place-to-pause-letter-1",
        "a-place-to-pause-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "d320-rb1",
          "quantity": 1
        },
        {
          "pieceId": "d320-mu3",
          "quantity": 1
        }
      ],
      "xp": 25,
      "coins": 10,
      "title": "A cap beside the ears",
      "letter": "The mushroom’s stalk takes a dogleg beneath its broad cap. Send it with the upright-eared rabbit: one picture stands straight, the other finds a bend on the way down.",
      "goal": "Make and send Paper Rabbit and Mushroom Side Root.",
      "sentCaption": "The straight ears and the bent stalk shared an envelope."
    },
    {
      "id": "a-place-to-pause-letter-4",
      "chapterId": "a-place-to-pause",
      "requiresMilestones": [
        "a-place-to-pause-letter-1",
        "a-place-to-pause-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "d320-rb3",
          "quantity": 1
        },
        {
          "pieceId": "d320-mu2",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "The longer visitor",
      "letter": "The rabbit stretches a forefoot into a longer rest, and the mushroom turns one edge of its cap upward. Send these two different ways of making a little room.",
      "goal": "Make and send Rabbit Longer Rest and Mushroom Turned Brim.",
      "sentCaption": "The long rest and the lifted brim have arrived."
    },
    {
      "id": "room-for-rhythm-letter-1",
      "chapterId": "room-for-rhythm",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "d320-vn1",
          "quantity": 1
        }
      ],
      "xp": 0,
      "coins": 0,
      "title": "The whole phrase",
      "letter": "The violin begins with its neck upright and its rounded body gathered around a narrow waist. Send the whole shape. The curl at its lower edge can answer separately.",
      "goal": "Make and send Paper Violin.",
      "sentCaption": "The whole violin has introduced its outline."
    },
    {
      "id": "room-for-rhythm-letter-2",
      "chapterId": "room-for-rhythm",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "d320-vn2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "A lifted note",
      "letter": "A lower edge of the violin curls out and up while the rest of the body stays upright. Send this small flourish. There is room to look at it for as long as you like.",
      "goal": "Make and send Violin Lifted Bout.",
      "sentCaption": "The lifted edge finished its little flourish."
    },
    {
      "id": "room-for-rhythm-letter-3",
      "chapterId": "room-for-rhythm",
      "requiresMilestones": [
        "room-for-rhythm-letter-1",
        "room-for-rhythm-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "d320-vn3",
          "quantity": 1
        },
        {
          "pieceId": "d320-dr2",
          "quantity": 2
        }
      ],
      "xp": 45,
      "coins": 20,
      "title": "Two small beats",
      "letter": "The violin’s neck leans off to one side. Give that long line two matching replies: two drums with their skins turned up. All three pictures belong in this envelope, with no beat to keep.",
      "goal": "Make and send Violin Side Note and two Drum Turned Skin pictures.",
      "sentCaption": "The sideways neck and two lifted drum skins arrived together."
    },
    {
      "id": "room-for-rhythm-letter-4",
      "chapterId": "room-for-rhythm",
      "requiresMilestones": [
        "room-for-rhythm-letter-1",
        "room-for-rhythm-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "d320-vn4",
          "quantity": 1
        },
        {
          "pieceId": "d320-dr1",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Room around the phrase",
      "letter": "The violin’s lower body shifts across a broad diagonal join. Send it with the whole drum, whose oval head keeps an unbroken outline. The unequal phrase has a round place to rest beside it.",
      "goal": "Make and send Violin Unequal Measure and Paper Drum.",
      "sentCaption": "The offset violin and the whole drum found their places."
    },
    {
      "id": "room-for-rhythm-letter-5",
      "chapterId": "room-for-rhythm",
      "requiresMilestones": [
        "room-for-rhythm-letter-3",
        "room-for-rhythm-letter-4"
      ],
      "requirements": [
        {
          "pieceId": "d320-dr2",
          "quantity": 1
        },
        {
          "pieceId": "b240-tr2",
          "quantity": 1
        }
      ],
      "xp": 20,
      "coins": 10,
      "title": "An older voice replies",
      "letter": "Upbeat Brass lifts its bell in the earlier collection. Send it a drum with one flap of skin raised. The old brass curve and the new paper curve can finish this exchange together.",
      "goal": "Make and send Drum Turned Skin and Upbeat Brass.",
      "sentCaption": "The raised bell answered the lifted drum skin."
    },
    {
      "id": "weight-and-breath-letter-1",
      "chapterId": "weight-and-breath",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "d320-av1",
          "quantity": 1
        }
      ],
      "xp": 0,
      "coins": 0,
      "title": "A place for the weight",
      "letter": "A long horn and a blunt heel sit above the anvil’s broad foot. Send the whole anvil as it stands. Its raised heel has another letter waiting.",
      "goal": "Make and send Paper Anvil.",
      "sentCaption": "The whole anvil arrived on its broad foot."
    },
    {
      "id": "weight-and-breath-letter-2",
      "chapterId": "weight-and-breath",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "d320-av2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "A heel turned upward",
      "letter": "The anvil’s square heel turns up at the end of the working surface. The horn still points low in the other direction. Send the picture with this new upright stop.",
      "goal": "Make and send Anvil Turned Heel.",
      "sentCaption": "The turned heel has made its upright reply."
    },
    {
      "id": "weight-and-breath-letter-3",
      "chapterId": "weight-and-breath",
      "requiresMilestones": [
        "weight-and-breath-letter-1",
        "weight-and-breath-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "d320-av3",
          "quantity": 1
        },
        {
          "pieceId": "d320-bl2",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "The foot and the breath",
      "letter": "One anvil foot reaches sideways and rises into a triangular edge. The bellows open a low wedge above their straight lower rail. Send the two pictures to compare a lifted foot with a spread of leather.",
      "goal": "Make and send Anvil Raised Foot and Bellows Taking Air.",
      "sentCaption": "The raised foot and the low leather wedge have arrived."
    },
    {
      "id": "weight-and-breath-letter-4",
      "chapterId": "weight-and-breath",
      "requiresMilestones": [
        "weight-and-breath-letter-1",
        "weight-and-breath-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "d320-av2",
          "quantity": 1
        },
        {
          "pieceId": "d320-bl4",
          "quantity": 1
        }
      ],
      "xp": 70,
      "coins": 30,
      "title": "A little weight, more air",
      "letter": "The anvil’s small upright heel meets a more uneven outline: bellows with a short high handle and a longer low one. Send both. The solid stop and the parted handles each keep their own shape.",
      "goal": "Make and send Anvil Turned Heel and Bellows Out of Line.",
      "sentCaption": "The square heel and the unequal handles shared the reply."
    },
    {
      "id": "weight-and-breath-letter-5",
      "chapterId": "weight-and-breath",
      "requiresMilestones": [
        "weight-and-breath-letter-3",
        "weight-and-breath-letter-4"
      ],
      "requirements": [
        {
          "pieceId": "d320-bl2",
          "quantity": 1
        },
        {
          "pieceId": "c280-fi1",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "A warm tool remembers",
      "letter": "The flatiron from Warm Regards still has its broad sole and open handle. Send it the low, opened bellows. These two old hearth shapes can share a final note about what supports them.",
      "goal": "Make and send Bellows Taking Air and Paper Flatiron.",
      "sentCaption": "The flatiron and the opened bellows closed the hearth exchange."
    },
    {
      "id": "along-the-grain-letter-1",
      "chapterId": "along-the-grain",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "d320-sa2",
          "quantity": 1
        }
      ],
      "xp": 10,
      "coins": 5,
      "title": "A handle raised",
      "letter": "The handsaw’s wooden handle lifts above its low row of teeth. Send the raised grip first if you like; the whole, level saw has an independent letter too.",
      "goal": "Make and send Handsaw Raised Handle.",
      "sentCaption": "The handle has sent its raised greeting."
    },
    {
      "id": "along-the-grain-letter-2",
      "chapterId": "along-the-grain",
      "requiresMilestones": [],
      "requirements": [
        {
          "pieceId": "d320-sa1",
          "quantity": 1
        }
      ],
      "xp": 0,
      "coins": 0,
      "title": "The whole blade",
      "letter": "Three broad teeth lead back to the handsaw’s open wooden grip. Give this first outline its own reply. The handle can rise in the other opening letter.",
      "goal": "Make and send Paper Handsaw.",
      "sentCaption": "The whole saw brought its three broad teeth."
    },
    {
      "id": "along-the-grain-letter-3",
      "chapterId": "along-the-grain",
      "requiresMilestones": [
        "along-the-grain-letter-1",
        "along-the-grain-letter-2"
      ],
      "requirements": [
        {
          "pieceId": "d320-sa3",
          "quantity": 1
        },
        {
          "pieceId": "d320-wj2",
          "quantity": 1
        }
      ],
      "xp": 35,
      "coins": 15,
      "title": "Two altered reaches",
      "letter": "The saw folds a triangular flap above its blunt front. The wrench turns its long tail through a square elbow. Send these two altered reaches, each still joined to the part you would hold.",
      "goal": "Make and send Handsaw Blunt Reply and Wrench Elbow Joint.",
      "sentCaption": "The folded blade and the square elbow met in one letter."
    },
    {
      "id": "along-the-grain-letter-4",
      "chapterId": "along-the-grain",
      "requiresMilestones": [
        "along-the-grain-letter-3"
      ],
      "requirements": [
        {
          "pieceId": "d320-wj2",
          "quantity": 1
        },
        {
          "pieceId": "ru2",
          "quantity": 1
        }
      ],
      "xp": 20,
      "coins": 10,
      "title": "The short rule returns",
      "letter": "The old Short Rule leaves a tall slot between its unequal strips. Send it the elbow-shaped wrench. Their corners make a quiet correspondence, with nothing that needs measuring.",
      "goal": "Make and send Wrench Elbow Joint and Short Rule.",
      "sentCaption": "The wrench’s elbow found the old rule’s open slot."
    },
    {
      "id": "along-the-grain-letter-5",
      "chapterId": "along-the-grain",
      "requiresMilestones": [
        "along-the-grain-letter-4"
      ],
      "requirements": [
        {
          "pieceId": "d320-sa1",
          "quantity": 1
        },
        {
          "pieceId": "d320-wj4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Room at the joint",
      "letter": "Return to the whole handsaw and the wrench whose tail folds back into a narrow fin. The teeth stay at one end; the returning tail leaves a notch at the other. Send this last pair, then let the tools rest.",
      "goal": "Make and send Paper Handsaw and Wrench Returning Tail.",
      "sentCaption": "The saw and the returning wrench brought the last correspondence home."
    }
  ],
  "ordinary": [
    {
      "id": "a-place-to-pause-optional-paper-rabbit",
      "chapterId": "a-place-to-pause",
      "requirements": [
        {
          "pieceId": "d320-rb4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "A backward glance",
      "letter": "The rabbit turns its head back while its paws stay facing forward. Send this extra glance if you want another reply; it can wait.",
      "goal": "Make and send Rabbit Looking Back.",
      "sentCaption": "The backward glance has been sent."
    },
    {
      "id": "a-place-to-pause-optional-paper-mushroom",
      "chapterId": "a-place-to-pause",
      "requirements": [
        {
          "pieceId": "d320-mu4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "A pleat for the envelope",
      "letter": "The mushroom gathers its cap into three rounded peaks. This optional reply has room for the whole pleated crown.",
      "goal": "Make and send Mushroom Pleated Crown.",
      "sentCaption": "The pleated crown found room in the envelope."
    },
    {
      "id": "room-for-rhythm-optional-paper-violin",
      "chapterId": "room-for-rhythm",
      "requirements": [
        {
          "pieceId": "d320-vn4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "Another unequal measure",
      "letter": "The violin’s broad diagonal join is worth a second look. You can send this optional reply whenever you want to return to that shifted outline.",
      "goal": "Make and send Violin Unequal Measure.",
      "sentCaption": "Another unequal measure has been sent."
    },
    {
      "id": "room-for-rhythm-optional-paper-drum",
      "chapterId": "room-for-rhythm",
      "requirements": [
        {
          "pieceId": "d320-dr4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "A little space at the side",
      "letter": "An open tuck interrupts the drum’s wooden side while its rims reach beyond it. Send this extra picture if the gap has caught your eye.",
      "goal": "Make and send Drum Tucked Side.",
      "sentCaption": "The open tuck has joined the correspondence."
    },
    {
      "id": "weight-and-breath-optional-paper-anvil",
      "chapterId": "weight-and-breath",
      "requirements": [
        {
          "pieceId": "d320-av4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "The horn takes the high line",
      "letter": "The anvil’s horn rises from its broad root into a high point. This optional reply can carry that long upward line.",
      "goal": "Make and send Anvil Cross Grain.",
      "sentCaption": "The raised horn has finished its extra note."
    },
    {
      "id": "weight-and-breath-optional-hearth-bellows",
      "chapterId": "weight-and-breath",
      "requirements": [
        {
          "pieceId": "d320-bl4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "An uneven afterthought",
      "letter": "The bellows’ two handles reach different distances. There is an optional envelope for this offset outline whenever you feel like sending it.",
      "goal": "Make and send Bellows Out of Line.",
      "sentCaption": "The unequal handles sent an afterthought."
    },
    {
      "id": "along-the-grain-optional-paper-handsaw",
      "chapterId": "along-the-grain",
      "requirements": [
        {
          "pieceId": "d320-sa4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "A tooth with another idea",
      "letter": "One saw tooth points up while two point down. Send this contrary little arrangement as an optional reply.",
      "goal": "Make and send Handsaw Contrary Teeth.",
      "sentCaption": "The upward tooth has had its say."
    },
    {
      "id": "along-the-grain-optional-open-jaw-wrench",
      "chapterId": "along-the-grain",
      "requirements": [
        {
          "pieceId": "d320-wj4",
          "quantity": 1
        }
      ],
      "xp": 60,
      "coins": 25,
      "title": "A return at the edge",
      "letter": "The wrench’s tail turns back into a narrow fin. You can give that returning edge an extra envelope, entirely at your own pace.",
      "goal": "Make and send Wrench Returning Tail.",
      "sentCaption": "The returning tail made one more visit."
    }
  ],
  "sourceRules": [
    {
      "id": "paper-rabbit",
      "chapterId": "a-place-to-pause",
      "milestones": []
    },
    {
      "id": "paper-mushroom",
      "chapterId": "a-place-to-pause",
      "milestones": [
        "a-place-to-pause-letter-1",
        "a-place-to-pause-letter-2"
      ]
    },
    {
      "id": "paper-violin",
      "chapterId": "room-for-rhythm",
      "milestones": []
    },
    {
      "id": "paper-drum",
      "chapterId": "room-for-rhythm",
      "milestones": [
        "room-for-rhythm-letter-1",
        "room-for-rhythm-letter-2"
      ]
    },
    {
      "id": "paper-anvil",
      "chapterId": "weight-and-breath",
      "milestones": []
    },
    {
      "id": "hearth-bellows",
      "chapterId": "weight-and-breath",
      "milestones": [
        "weight-and-breath-letter-1",
        "weight-and-breath-letter-2"
      ]
    },
    {
      "id": "paper-handsaw",
      "chapterId": "along-the-grain",
      "milestones": []
    },
    {
      "id": "open-jaw-wrench",
      "chapterId": "along-the-grain",
      "milestones": [
        "along-the-grain-letter-1",
        "along-the-grain-letter-2"
      ]
    }
  ],
  "upgrades": [],
  "chapterCopy": {
    "a-place-to-pause": {
      "number": 29,
      "id": "a-place-to-pause",
      "title": "A Place to Pause",
      "familyIds": [
        "paper-rabbit",
        "paper-mushroom"
      ],
      "opening": "Two rabbit letters open this envelope. Answer them in either order to meet the mushroom; then two different visits can arrive in either order too.",
      "ending": "Both visits have arrived. Upright ears, a bent stalk, a long rest and a lifted brim have each found a place to pause.",
      "goal": "Send every story letter in A Place to Pause. Supplies are free; purchases and optional replies are not required.",
      "sourceNotice": "Both opening story letters unlock Paper Mushroom. A previously earned source remains selected alongside the first new source.",
      "optionalInvitation": "Each family’s final picture has an optional postcard postscript. Discover it whenever you like.",
      "pacingPattern": "paired independent rabbit introductions; unequal concurrent rabbit/mushroom visits; closure on either final delivery"
    },
    "room-for-rhythm": {
      "number": 30,
      "id": "room-for-rhythm",
      "title": "Room for Rhythm",
      "familyIds": [
        "paper-violin",
        "paper-drum"
      ],
      "opening": "A violin and a drum exchange shapes at their own pace. Two replies wait side by side, then a familiar trumpet adds a short closing note.",
      "ending": "The old trumpet has answered. Every curve and interval can stay on the page; the music leaves you all the time you need.",
      "goal": "Send every story letter in Room for Rhythm. Supplies are free; purchases and optional replies are not required.",
      "sourceNotice": "Both opening story letters unlock Paper Drum. A previously earned source remains selected alongside the first new source.",
      "optionalInvitation": "Each family’s final picture has an optional postcard postscript. Discover it whenever you like.",
      "pacingPattern": "paired independent violin introductions; concurrent three-picture beat and unequal phrase replies; separate old Trumpet callback"
    },
    "weight-and-breath": {
      "number": 31,
      "id": "weight-and-breath",
      "title": "Weight and Breath",
      "familyIds": [
        "paper-anvil",
        "hearth-bellows"
      ],
      "opening": "The anvil introduces its weight before the bellows open. Two unequal replies compare their outlines, followed by a brief return to the flatiron.",
      "ending": "The flatiron has received its note. Solid feet, open handles and folded leather can all rest here together.",
      "goal": "Send every story letter in Weight and Breath. Supplies are free; purchases and optional replies are not required.",
      "sourceNotice": "Both opening story letters unlock Hearth Bellows. A previously earned source remains selected alongside the first new source.",
      "optionalInvitation": "Each family’s final picture has an optional postcard postscript. Discover it whenever you like.",
      "pacingPattern": "paired independent anvil introductions; unequal concurrent anvil/bellows replies; short old Flatiron callback"
    },
    "along-the-grain": {
      "number": 32,
      "id": "along-the-grain",
      "title": "Along the Grain",
      "familyIds": [
        "paper-handsaw",
        "open-jaw-wrench"
      ],
      "opening": "A saw and a wrench begin with familiar grips and unexpected turns. Their letters visit the old ruler, then return for one final exchange.",
      "ending": "The last correspondence is complete. There are now 320 pictures available across the opened collections; discovering every picture is optional. The earlier endings remain yours, and the pictures are here whenever you want to return.",
      "goal": "Send every story letter in Along the Grain. Supplies are free; purchases and optional replies are not required.",
      "sourceNotice": "Both opening story letters unlock Open Jaw Wrench. A previously earned source remains selected alongside the first new source.",
      "optionalInvitation": "Each family’s final picture has an optional postcard postscript. Discover it whenever you like.",
      "pacingPattern": "paired independent handsaw introductions; serial new-pair joint, old Ruler callback and new-pair return"
    }
  },
  "postscripts": [
    {
      "id": "postscript-paper-rabbit",
      "pieceId": "d320-rb5",
      "title": "Rabbit All Ears",
      "goal": "Merge two Rabbit Looking Back pictures to discover Rabbit All Ears.",
      "caption": "A low crouch leaves plenty of room for listening.",
      "reverse": "The rabbit settles its long back low to the ground. One ear keeps a steep line and the other opens sideways. A pause can still be full of attention.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-mushroom",
      "pieceId": "d320-mu5",
      "title": "Mushroom Open Saddle",
      "goal": "Merge two Mushroom Pleated Crown pictures to discover Mushroom Open Saddle.",
      "caption": "The long cap dips in the middle and lets its ends fall.",
      "reverse": "The cap rises at each end and dips between them. Its short stalk stands off to one side. This little roof has found a shape of its own.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-violin",
      "pieceId": "d320-vn5",
      "title": "Violin Folded Phrase",
      "goal": "Merge two Violin Unequal Measure pictures to discover Violin Folded Phrase.",
      "caption": "The rounded body opens low beneath a sideways phrase.",
      "reverse": "The neck runs sideways above two low, rounded body sections. The phrase has folded into its outline, and the scroll leaves the last small curl.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-drum",
      "pieceId": "d320-dr5",
      "title": "Drum Carrying the Beat",
      "goal": "Merge two Drum Tucked Side pictures to discover Drum Carrying the Beat.",
      "caption": "A rolled foot and a broad skirt carry the tilted drum.",
      "reverse": "The drum keeps a broad skirt on one side and a rolled foot on the other. Its tilted head and two mallets make a whole picture of a beat at rest.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-anvil",
      "pieceId": "d320-av5",
      "title": "Anvil Giving Ground",
      "goal": "Merge two Anvil Cross Grain pictures to discover Anvil Giving Ground.",
      "caption": "The low horn and raised heel meet over a shortened waist.",
      "reverse": "The waist has shortened beneath a rising heel and a low horn. Even this solid shape can make an adjustment and still have a foot to stand on.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-hearth-bellows",
      "pieceId": "d320-bl5",
      "title": "Bellows Holding a Breath",
      "goal": "Merge two Bellows Out of Line pictures to discover Bellows Holding a Breath.",
      "caption": "A dark leather diamond holds the centre of the bellows.",
      "reverse": "The leather opens into a tall diamond between its wooden edges. The handles stay apart. Here is a breath that can remain a picture for as long as you want.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-paper-handsaw",
      "pieceId": "d320-sa5",
      "title": "Handsaw End to End",
      "goal": "Merge two Handsaw Contrary Teeth pictures to discover Handsaw End to End.",
      "caption": "One grip joins a long raised blade and a low toothed one.",
      "reverse": "The upper blade reaches up while the lower blade keeps its teeth near the grip. Both belong to the same handle. An ending can leave room between its lines.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    },
    {
      "id": "postscript-open-jaw-wrench",
      "pieceId": "d320-wj5",
      "title": "Wrench Wide Courtesy",
      "goal": "Merge two Wrench Returning Tail pictures to discover Wrench Wide Courtesy.",
      "caption": "The lower jaw steps back and leaves the mouth wide open.",
      "reverse": "The lower jaw steps back from the long upper one. The open space becomes part of the wrench’s outline. A generous gap is a fine place to finish.",
      "rewardPolicy": "No reward; discovery only; do not consume or require delivery.",
      "presentationContract": "Show the reverse only after this exact piece is discovered. Use existing single-picture discovery/postcard surfaces. No combined layout, implied companion discovery, chapter completion or volume completion."
    }
  ],
  "discoveryCaptions": {
    "d320-rb1": "Two tall ears keep the seated rabbit company.",
    "d320-rb2": "One ear listens upright; the other listens aside.",
    "d320-rb3": "The ears stay up while the long forefoot settles down.",
    "d320-rb4": "The paws stay put while the rabbit looks back.",
    "d320-rb5": "A low crouch leaves plenty of room for listening.",
    "d320-mu1": "A low cap spreads over a sturdy little stalk.",
    "d320-mu2": "The cap lifts one brim and keeps the other rounded.",
    "d320-mu3": "The cap stays broad while the stalk takes a side step.",
    "d320-mu4": "Three soft peaks give the cap a pleated crown.",
    "d320-mu5": "The long cap dips in the middle and lets its ends fall.",
    "d320-vn1": "The whole violin holds its outline around a narrow waist.",
    "d320-vn2": "One lower edge curls up beside the violin’s body.",
    "d320-vn3": "The neck takes a sideways line while the body stays upright.",
    "d320-vn4": "An unequal body finds its join on a diagonal.",
    "d320-vn5": "The rounded body opens low beneath a sideways phrase.",
    "d320-dr1": "Two mallets wait behind one unbroken drumhead.",
    "d320-dr2": "One broad flap rises from the drum’s round head.",
    "d320-dr3": "The whole drum leans into an off-centre outline.",
    "d320-dr4": "The rims reach past an open tuck in the drum’s side.",
    "d320-dr5": "A rolled foot and a broad skirt carry the tilted drum.",
    "d320-av1": "The long horn balances a blunt heel over a broad foot.",
    "d320-av2": "The square heel rises while the horn keeps its low line.",
    "d320-av3": "One foot reaches sideways before turning upward.",
    "d320-av4": "The horn lifts from its broad root into a high point.",
    "d320-av5": "The low horn and raised heel meet over a shortened waist.",
    "d320-bl1": "Wooden cheeks hold the leather between two parted handles.",
    "d320-bl2": "A low wedge of leather opens above the straight lower rail.",
    "d320-bl3": "The nozzle turns up and the handles keep their distance.",
    "d320-bl4": "Two unequal handles give the bellows an offset reply.",
    "d320-bl5": "A dark leather diamond holds the centre of the bellows.",
    "d320-sa1": "Three broad teeth lead back to the open wooden grip.",
    "d320-sa2": "The handle rises while the toothed blade stays low.",
    "d320-sa3": "A blunt blade turns one triangular flap toward the top.",
    "d320-sa4": "One tooth points up across from the two that point down.",
    "d320-sa5": "One grip joins a long raised blade and a low toothed one.",
    "d320-wj1": "The flat jaws open at the end of a long straight lever.",
    "d320-wj2": "A square elbow gives the open jaw a sideways tail.",
    "d320-wj3": "The large jaw keeps only a short reach behind it.",
    "d320-wj4": "The returning tail leaves a narrow open notch in its turn.",
    "d320-wj5": "The lower jaw steps back and leaves the mouth wide open."
  }
};
