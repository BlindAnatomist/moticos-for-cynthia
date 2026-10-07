// Authored correspondence for the private campaign. Presentation only; no rewards or save writes.
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

export const LETTER_COPY = freeze({
  "garden-letter-1": {
    "title": "A river under one wing",
    "letter": "The bird has tucked a river under its wing. Send this small beginning; there is room for the rest to follow.",
    "goal": "Make and send Riverwing.",
    "sentCaption": "A small beginning, carried by a wing."
  },
  "garden-letter-2": {
    "title": "A cup with other plans",
    "letter": "A fern has moved into the teacup. It seems to have mistaken the handle for a garden gate.",
    "goal": "Make and send Fern Cup.",
    "sentCaption": "Tea was expected. A garden arrived."
  },
  "garden-letter-3": {
    "title": "The bird finds a key",
    "letter": "A key has slipped between the feathers. Perhaps the bird is a map. Perhaps the map is learning to fly.",
    "goal": "Make and send Wayfinder.",
    "sentCaption": "A feather, a key, a way through."
  },
  "garden-letter-4": {
    "title": "Two ways to carry water",
    "letter": "A river under a wing; a moon above a cup. Put these two small journeys in the same envelope.",
    "goal": "Make and send Riverwing and Nightgarden.",
    "sentCaption": "The river and the cup met by post."
  },
  "garden-letter-5": {
    "title": "The opening is the picture",
    "letter": "The bird has opened in the middle. Leave that little gap for whatever might arrive next.",
    "goal": "Make and send Aviary Gate.",
    "sentCaption": "A gate made from the space between wings."
  },
  "garden-letter-6": {
    "title": "A short note after dark",
    "letter": "The fern has leaned sideways to make room for the moon. A small night garden can travel in a very short letter.",
    "goal": "Make and send Nightgarden.",
    "sentCaption": "One cup was enough room for the night."
  },
  "garden-letter-7": {
    "title": "A way through the arbor",
    "letter": "The bird brings its key to the fern's open arch. Neither picture quite explains the other. They seem pleased to meet.",
    "goal": "Make and send Wayfinder and Moonlit Arbor.",
    "sentCaption": "A key visited a garden with no door."
  },
  "garden-letter-8": {
    "title": "Two openings, one address",
    "letter": "The wing leaves a gap. The fern makes an arch. Send the two openings together and let the paper between them be a path.",
    "goal": "Make and send Aviary Gate and Moonlit Arbor.",
    "sentCaption": "The space between two pictures became a path."
  },
  "garden-letter-9": {
    "title": "A garden, by air",
    "letter": "The feathers have become a field. A small leaf has found the key. Let the whole unlikely garden travel by air.",
    "goal": "Make and send Wandering Aviary.",
    "sentCaption": "A garden folded itself into a wing."
  },
  "moon-letter-1": {
    "title": "The key writes back",
    "letter": "Here is the key again, carrying a frond this time. Send it beside the river-winged bird, as if they have something to tell each other.",
    "goal": "Make and send Frond Key and Riverwing.",
    "sentCaption": "The key returned with a leaf."
  },
  "moon-letter-2": {
    "title": "A crossing after dark",
    "letter": "The key lifts a bridge toward the night garden. OVER is written on it. What is on the other side can wait.",
    "goal": "Make and send Drawbridge Key and Nightgarden.",
    "sentCaption": "A bridge crossed the edge of a cup."
  },
  "moon-letter-3": {
    "title": "A crescent, by bird",
    "letter": "The moon needed a lift. The bird offered its back. This seems as good a postal arrangement as any.",
    "goal": "Make and send Crescent Courier.",
    "sentCaption": "The bird agreed to carry the moon."
  },
  "moon-letter-4": {
    "title": "Up, by another route",
    "letter": "The key has become a staircase. Its little UP scrap points the other way. Send the question along with the steps.",
    "goal": "Make and send Stairway Key.",
    "sentCaption": "The staircase kept the question open."
  },
  "moon-letter-5": {
    "title": "A bridge meets a boat",
    "letter": "The moon has folded itself into a skiff. The key offers a bridge. Two ways across, with no agreement about the water.",
    "goal": "Make and send Lunar Skiff and Drawbridge Key.",
    "sentCaption": "The same crossing, answered twice."
  },
  "moon-letter-6": {
    "title": "A place to come down",
    "letter": "The balloon says DOWN; the garden leaves a space beneath its moon. Send them together. Perhaps one has found a place in the other.",
    "goal": "Make and send Crescent Balloon and Moonlit Arbor.",
    "sentCaption": "The sky found a gap in the garden."
  },
  "moon-letter-7": {
    "title": "Here, with room for elsewhere",
    "letter": "The key has made a route from HERE to ELSE. The balloon has brought its own direction. Leave room in the envelope for both.",
    "goal": "Make and send Elsewhere Key and Crescent Balloon.",
    "sentCaption": "Here and elsewhere fitted in one envelope."
  }
});

export const CHAPTER_COPY = freeze({
  "garden-correspondence": {
    "title": "Garden Correspondence",
    "opening": "A bird brings a river. A fern brings a cup. Leave them on the same table and see what travels between them.",
    "goal": "Make and send the nine garden letters. Bird and Fern supplies are always free.",
    "ending": "The garden has learned to travel. A key was hiding in its wings; now it has a letter of its own.",
    "optionalInvitation": "There is still room in the cup. Two Moonlit Arbors make the Lunar Conservatory, a picture you can keep as a postscript.",
    "nextPreview": "Keep your board and upgrades. The Key source opens when you enter Moonlit Correspondence; its first two letters open Moon."
  },
  "moonlit-correspondence": {
    "title": "Moonlit Correspondence",
    "opening": "The key grows a frond. The bird carries a moon. The same little shapes have found another way to write back.",
    "goal": "Make and send the seven moonlit letters. Earlier garden pieces still belong in this correspondence.",
    "ending": "Cynthia, the bird that began on your table is somewhere between here and elsewhere. The letters are sent. The table is still yours.",
    "optionalInvitation": "One more way to carry the moon: two Crescent Balloons make an Orbit Voyager. Its postcard returns to the bird that began this journey.",
    "scopeNotice": "All 16 authored letters are sent. You can explore the remaining pictures or practice a letter. Further chapters are not yet available."
  }
});

export const DISCOVERY_CAPTIONS = freeze({
  "b1": "A bird, with one scrap of river still folded away.",
  "b2": "The wing carries a river without getting wet.",
  "b3": "The key has found its way into the feathers.",
  "b4": "Sometimes the new part is the space left open.",
  "b5": "AIR above. FIELD below. A garden between them.",
  "f1": "A frond remembers how to unfurl.",
  "f2": "A cup has become a place to grow.",
  "f3": "The cup is holding a little night.",
  "f4": "The broken cup leaves room for an arbor.",
  "f5": "The cup lost its shape. The garden kept growing.",
  "k1": "An opening at one end, a question at the other.",
  "k2": "A key with a small botanical attachment.",
  "k3": "The key opens itself into a crossing.",
  "k4": "UP is taking a rather roundabout route.",
  "k5": "HERE has found a way into ELSE.",
  "m1": "A moon cut out of the middle of the night.",
  "m2": "The first bird has a much larger delivery.",
  "m3": "The crescent has become its own boat.",
  "m4": "A balloon carrying the word DOWN.",
  "m5": "The first bird is still here. The route has changed."
});

export const POSTCARD_POSTSCRIPTS = freeze([
  {
    "id": "garden-postscript",
    "title": "Room to grow",
    "pieceId": "f5",
    "companionPieceId": "f2",
    "goal": "Merge two Moonlit Arbors to discover Lunar Conservatory.",
    "caption": "The cup lost its shape. The garden kept growing.",
    "reverse": "A postscript to the garden letters: what began as a fern in a cup now makes room for a whole night."
  },
  {
    "id": "moon-postscript",
    "title": "The bird writes again",
    "pieceId": "m5",
    "companionPieceId": "b1",
    "goal": "Merge two Crescent Balloons to discover Orbit Voyager.",
    "caption": "The first bird is still here. The route has changed.",
    "reverse": "A postscript to the moonlit letters: the bird that carried a river is travelling with the moon. There is no hurry to bring it home."
  }
]);
