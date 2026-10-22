export const MODULE_CONTENT = {
  reading: {
    title: 'Rhythm Reading',
    subtitle: 'Interactive notation reader with scroll, loop, and sight-reading challenges.',
    items: [
      { title: 'Basic Rhythms', details: 'Quarter/eighth/sixteenth patterns with loop sections.' },
      { title: 'Syncopation', details: 'Off-beat displacement in progressive difficulty.' },
      { title: 'Triplets and Odd Groupings', details: 'Triplets, quintuplets, sextuplets, septuplets.' },
      { title: 'Linear Phrases', details: 'Snare-kick-hat linear reading patterns.' },
      { title: 'Read and Play', details: 'Auto-scroll notation at selected tempo.' },
      { title: 'Challenge Mode', details: 'One-pass, no-restart sight reading mode.' },
    ],
  },
  dictation: {
    title: 'Rhythm Dictation',
    subtitle: 'Ear-training engine: identify notation, subdivision, and count.',
    items: [
      { title: 'Multiple Choice', details: 'Choose the correct rhythm after playback.' },
      { title: 'Interactive Notation', details: 'Tap the heard rhythm on the grid.' },
      { title: 'Subdivision Tests', details: 'Differentiate 8ths, triplets, and 16ths.' },
      { title: 'Beginner to Expert', details: 'Difficulty-aware rhythm generation.' },
    ],
  },
  independence: {
    title: 'Independence Trainer',
    subtitle: '4-limb coordination matrix for rock, jazz, latin, fusion, and gospel.',
    items: [
      { title: 'RH: 8ths', details: 'Consistent ride/hat pulse control.' },
      { title: 'LH: Offbeats', details: 'Snare coordination and comping layer.' },
      { title: 'RF: Quarter Notes', details: 'Anchor pulse and timing stability.' },
      { title: 'LF: Clave', details: 'Clave and ostinato independence training.' },
      { title: 'Matrix Builder', details: 'Assign independent patterns per limb.' },
    ],
  },
  'groove-library': {
    title: 'Groove Library',
    subtitle: 'Curated grooves: rock, funk, jazz, latin, afro-cuban, metal, and progressive.',
    items: [
      { title: 'Rock', details: 'Basic, shuffle, half-time, and double-time grooves.' },
      { title: 'Funk', details: 'Pocket, ghost notes, linear grooves.' },
      { title: 'Jazz', details: 'Ride patterns and comping systems.' },
      { title: 'Latin', details: 'Bossa, samba, songo, cascara.' },
      { title: 'Metal', details: 'Double bass and blast-beat vocab.' },
      { title: 'Progressive', details: 'Odd meters and polymetric grooves.' },
    ],
  },
  fills: {
    title: 'Fill Generator',
    subtitle: 'Unlimited fill generation by style, length, complexity, and skill level.',
    items: [
      { title: 'Style Engine', details: 'Rock, funk, fusion, metal, gospel, progressive.' },
      { title: 'Length + Complexity', details: '1/2 bar, 1 bar, 2 bar with complexity controls.' },
      { title: 'Notation + Sticking', details: 'Generated notation with sticking display.' },
    ],
  },
  polyrhythm: {
    title: 'Polyrhythm Trainer',
    subtitle: '2:3 through 9:4 with circle, grid, pulse, and timeline visualization.',
    items: [
      { title: '2:3 / 3:4', details: 'Core cross-rhythm foundations.' },
      { title: '4:5 / 5:7', details: 'Intermediate metric tension drills.' },
      { title: '7:8 / 9:4', details: 'Advanced odd overlays and phrasing.' },
      { title: 'Interactive Playback', details: 'Independent channel solo/mute.' },
    ],
  },
  'odd-time': {
    title: 'Odd Time Trainer',
    subtitle: '5/4, 7/8, 9/8, 11/8, 13/16, 15/16 groove and reading system.',
    items: [
      { title: 'Groove Library', details: 'Odd meter groove catalog and click tracks.' },
      { title: 'Fill Library', details: 'Phrase-conserving odd-time fills.' },
      { title: 'Reading Exercises', details: 'Notation-first odd meter workouts.' },
    ],
  },
  dynamics: {
    title: 'Dynamics Trainer',
    subtitle: 'PPP to FFF control with live volume meter and target-range challenge.',
    items: [
      { title: 'Dynamic Ladder', details: 'PPP, PP, P, MP, MF, F, FF, FFF.' },
      { title: 'Live Meter', details: 'Target-band challenge with accuracy score.' },
      { title: 'Ghost Note Analysis', details: 'Soft-note consistency and control tracking.' },
    ],
  },
  speed: {
    title: 'Speed Trainer',
    subtitle: 'Singles, doubles, paradiddles, and double-bass speed development.',
    items: [
      { title: 'Sprint Mode', details: 'Short max-effort bursts.' },
      { title: 'Endurance Mode', details: 'Sustained tempo control.' },
      { title: 'Pyramid Builder', details: 'Ascending/descending BPM ladders.' },
      { title: 'BPM Ladder', details: 'Incremental progression with checkpoints.' },
    ],
  },
  'practice-pad': {
    title: 'Practice Pad Mode',
    subtitle: 'Minimal interface with large visual feedback for pure technique sessions.',
    items: [
      { title: 'Technique Focus', details: 'Stroke quality and rebound control.' },
      { title: 'Rudiment Focus', details: 'High repetition with tempo increments.' },
      { title: 'Speed + Control', details: 'Balance fast hands with dynamic consistency.' },
    ],
  },
  'song-practice': {
    title: 'Song Practice',
    subtitle: 'Upload tracks, preserve pitch while changing tempo, and loop sections.',
    items: [
      { title: 'Audio Upload', details: 'Import local tracks for practice.' },
      { title: 'Loop + Count-in', details: 'Section loop and adjustable count-in.' },
      { title: 'Playlists + Setlists', details: 'Build session-ready song sequences.' },
      { title: 'Drumless Tracks', details: 'Focused play-along practice content.' },
    ],
  },
  community: {
    title: 'Community',
    subtitle: 'Friends, groups, global rankings, competitions, and groove sharing.',
    items: [
      { title: 'Friend System', details: 'Follow and compare progress with peers.' },
      { title: 'Practice Groups', details: 'Shared goals and accountability rooms.' },
      { title: 'Global Rankings', details: 'Accuracy, speed, and consistency leaderboards.' },
      { title: 'Rudiment Competitions', details: 'Time-bound skill events and challenges.' },
    ],
  },
} as const
