// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE LOOKS: what a letter's paper can be                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A letter chooses its paper (migration 0055). What the row keeps is three
// slugs, `{ theme, tint, face }`, or nothing for the plain paper; what a slug
// DRAWS is decided here and nowhere else. The schema's whole opinion is
// `wall_look_clean`: an object, three keys, each a short lower case slug. So
// a new look is a row in one of the three lists below and a rule or two in
// wall.css, never a migration, and a slug this build does not know draws the
// plain paper rather than nothing.
//
// ── the three axes, and why three ───────────────────────────────────────────
// The lock screen's own model: a gallery of complete looks, then two dials
// that tune the one chosen. The THEME is the big choice and it is whole: a
// ground, an ink, a face, a corner, a grain, and — since the eight papers —
// FURNITURE, which is the part of it that is not a fill.
//
// The panel calls the three by what a writer is actually choosing — TEXTURE,
// COLOR, TYPE (Look.jsx) — while the row keeps the three keys the schema
// admits, `theme`, `tint`, `face`. The words are the interface's and the
// keys are the column's, and neither has to move for the other.
//
// Forty-two papers, twenty-nine colours and twenty-four faces are thirty
// thousand letters that look different from each other, which is the
// freedom, and every one of them is a choice from a menu that every writer
// shares, which is what keeps a look from being a signature
// (docs/WALL-FEATURES.md, G3). Nothing here takes a colour a person typed,
// a picture, or a word.
//
// ── what a paper is, and what it was ────────────────────────────────────────
// It was eight, and eight was a set of MATERIALS: a cotton stock, a slate, a
// pile of velvet, a moulded shell. They were well made and they were all the
// same idea, which is that a paper is a surface with a grain on it. Half the
// menu was a cream rectangle at a different temperature.
//
// A paper is a PICTURE OF SOMETHING now, and there are forty-two of them in
// seven families, because the thing a writer is actually choosing is what
// their forty words are standing on: a neon sign at two in the morning, a
// blueprint, a strip of magnetic tape, a bar napkin, the back of an
// envelope. Each family is six, each is a different reason to pick one, and
// the panel draws them in these seven groups and in this order:
//
//   paper     the sheet, pressed and printed
//   post      carried by hand and handled
//   ether     light and air, and no hard edges in it
//   luxe      the expensive object
//   neon      lit from behind
//   cyber     the machine
//   object    a thing that is not a sheet at all
//
// What did NOT move is the shape of a letter. Every one of the forty-two is
// the same card at the same corner with the same four slots in it — the
// dateline across the top, the crest and the addressee, the words, and the
// reader's three marks at the foot — and the heart, the pen and the flag
// stand in exactly the same place on all forty-two (wall.css, the rule that
// sets the foot's margins off the card's edge and not the paper's inset).
// A writer chooses what the letter is MADE OF; nobody chooses where the
// controls are, what the card says, or how big it is.
//
// ── the five things a theme carries ─────────────────────────────────────────
//   grain      the surface, and the theme owns it. One layer, ever: the
//              plain paper's fibre is no longer laid over a theme that has
//              a texture of its own, and `none` is a real answer
//   chrome     the drawn parts that belong to this paper and no other: the
//              nokia's signal and battery, the synthwave's sun, the
//              receipt's barcode, the corkboard's pin. Drawn by parts.jsx
//              `Furniture` and ruled in wall.css, every one of them a
//              gradient or a border (docs/WALL-FEATURES.md, G7)
//   layout     the three papers that do not just dress the card but MOVE
//              it: the nokia wraps its head and body in a screen, the
//              polaroid puts the addressee on the chin under the picture,
//              the postcard divides the back. Everything else is the same
//              four slots in the same order — including the fifteen papers
//              that look like they have moved something, which have not:
//              an inner surface (the arcade's screen, the sticker's field,
//              the cassette's card) is FURNITURE with the padding opened
//              out around it, so it is one card wearing a shell and never
//              a second component
//   frame      what the card itself is when the letter is not written on
//              it: the nokia's plastic, the polaroid's border, the
//              sticker's die cut. The tint then recolours the SCREEN or the
//              PICTURE, which is the surface a writer means, and never the
//              shell around it
//   family     which of the seven groups the panel draws it in
//
// None of it is a column. The row still keeps three slugs, `wall_look_clean`
// still admits exactly three keys, and forty-two papers needed no migration.
//
// ── the ground, and what a chosen colour does to it ─────────────────────────
// Two kinds of ground, told apart by what they are written in, and the rule
// is worth stating because it is the whole of how a colour behaves:
//
//   written in TOKENS    `var(--lk-lift)`, `var(--lk-paper)`, `var(--lk-deep)`
//                        — a SHAPE and not a colour: where the light falls on
//                        this object. A chosen colour keeps it, and the
//                        velvet's bloom, the lacquer's specular and the
//                        mist's layers come out in the colour that was picked
//   written in HUES      `#5A2340` — the ground IS the colour, and that is
//                        the point of it: the synthwave's sky, the aurora's
//                        curtains, the nebula. A chosen colour replaces it,
//                        because a writer who picks rose on a synthwave is
//                        asking for the sky to be rose
//
// Nothing declares which it is. `tokenGround` reads the string for a `var(`
// and the answer falls out, so a theme cannot be written one way and
// declared the other.
//
// The same question comes back in the stylesheet for a paper whose FURNITURE
// is a literal hue — the aurora's greens, the gilt's foil, the airmail's red
// and blue barber stripe — and it is answered the same way: `data-tint` is on
// the card when a colour was chosen, so `:not([data-tint])` draws the paper's
// own hues and `[data-tint]` draws the same parts in the paper's ink. Nothing
// on a tinted card is a colour the writer did not pick.
//
// ── one set of tokens ───────────────────────────────────────────────────────
// A look is drawn as custom properties on the paper (`lookVars`): the ground,
// the ink and the four strengths of it that the paper's own rules already
// use for its rule, its stamp, its foot and its marks, the face and its
// weights, the corner, and the EDGE. The plain paper declares the same
// properties at the system's values (wall.css `.wl-paper`), so every rule on
// the card reads one token and a look changes the token. The disc on the wall
// reads the same tokens (`Face`), which is how the paper of a letter becomes
// the paper of its name on the field.
//
// Nothing here names a hue outside the two lists, and the derived strengths
// are arithmetic on the ink, so a tint's rule, stamp and foot come out at
// the same relative weights the plain paper's do.

// ── the faces ───────────────────────────────────────────────────────────────
// Twenty-four. The first three are the system's own (design/DESIGN.md
// section 4) at the letter's job, and they are free: a browser that has drawn
// any screen in this product already has them. The other twenty-one are
// fetched for the looks and used for nothing else in the build — never a
// headline, a label, a control or an identifier (scripts/fetch-faces.mjs).
//
// `size` scales the body's type and `title` the addressee's, because a hand
// at 16px is smaller than a serif at 16px, a pixel face at 16px is larger,
// and a copperplate at 16px is barely there. Every number below is the one
// that puts that face's LOWER CASE on the same optical line as the serif's.
//
// Twelve were added with the forty-two papers, and the reason is a paper like
// the circuit board or the neon tube: nine faces cut for a SHEET OF PAPER
// were being asked to dress a machine, a stone and a torn scrap, and a hand
// on a blueprint is a hand on the wrong drawing. Every one of the twelve is
// the face one family is actually set in, and the family it carries is named
// in scripts/fetch-faces.mjs beside the file it fetches.
export const FACES = [
  { slug: 'serif',      name: 'serif',      family: "'Newsreader', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif", weight: 400, titleWeight: 500, size: 1, title: 1 },
  { slug: 'sans',       name: 'sans',       family: "'Inter Tight', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", weight: 400, titleWeight: 600, size: 0.96, title: 0.94 },
  { slug: 'mono',       name: 'mono',       family: "'Geist Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace", weight: 400, titleWeight: 500, size: 0.88, title: 0.86 },
  { slug: 'pixel',      name: 'pixel',      family: "'Pixelify Sans', 'Geist Mono', ui-monospace, monospace", weight: 400, titleWeight: 500, size: 1.04, title: 1 },
  { slug: 'hand',       name: 'hand',       family: "'Caveat', 'Newsreader', 'Iowan Old Style', cursive", weight: 500, titleWeight: 600, size: 1.24, title: 1.2 },
  { slug: 'round',      name: 'round',      family: "'Comfortaa', 'Inter Tight', system-ui, sans-serif", weight: 500, titleWeight: 700, size: 0.92, title: 0.9 },
  // A struck key with the ink spread around it, and the one the menu most
  // obviously lacked: it is what an unsigned letter is actually written in.
  // One weight only, so the title takes the same 400 the body does.
  { slug: 'typewriter', name: 'typewriter', family: "'Special Elite', 'Geist Mono', ui-monospace, monospace", weight: 400, titleWeight: 400, size: 0.94, title: 0.92 },
  // Drawn ON a grid rather than rounded onto one, which is what keeps it
  // from being the pixel again. It sets very small, hence the scale.
  { slug: 'screen',     name: 'screen',     family: "'VT323', 'Geist Mono', ui-monospace, monospace", weight: 400, titleWeight: 400, size: 1.38, title: 1.3 },
  { slug: 'poster',     name: 'poster',     family: "'Oswald', 'Inter Tight', system-ui, sans-serif", weight: 400, titleWeight: 600, size: 1, title: 1.02 },
  { slug: 'display',    name: 'display',    family: "'Playfair Display', 'Newsreader', Georgia, serif", weight: 400, titleWeight: 600, size: 0.98, title: 1 },
  { slug: 'marker',     name: 'marker',     family: "'Permanent Marker', 'Caveat', cursive", weight: 400, titleWeight: 400, size: 0.98, title: 0.94 },
  // The only face in the menu with a real flourish in it. Its x height is
  // about half the serif's, so it is scaled further than anything else here.
  { slug: 'script',     name: 'script',     family: "'Pinyon Script', 'Caveat', cursive", weight: 400, titleWeight: 400, size: 1.45, title: 1.4 },
  // ── the twelve the forty-two papers needed ──
  // Square built, wide, drawn for a dashboard rather than a page: it carries
  // the synthwave, the hud and the hologram, which are the three papers that
  // are a readout of something.
  { slug: 'techno',     name: 'techno',     family: "'Orbitron', 'Inter Tight', system-ui, sans-serif", weight: 400, titleWeight: 600, size: 0.92, title: 0.9 },
  // A modern grotesque with the corners taken off its curves. The plain
  // voice of the machine papers, where the sans would be the product's: the
  // glitch and the cassette.
  { slug: 'grotesk',    name: 'grotesk',    family: "'Space Grotesk', 'Inter Tight', system-ui, sans-serif", weight: 400, titleWeight: 600, size: 0.96, title: 0.94 },
  // An old style cut small and at a high stroke contrast, and the one that
  // makes forty words look like a paragraph somebody set rather than typed.
  // Carries the mist.
  { slug: 'elegant',    name: 'elegant',    family: "'Cormorant Garamond', 'Newsreader', Georgia, serif", weight: 400, titleWeight: 600, size: 1.16, title: 1.12 },
  // Hairline capitals, wide, drawn for one word across a cover. It carries
  // the atelier and the silk, and it is the thinnest thing in the menu.
  { slug: 'fashion',    name: 'fashion',    family: "'Italiana', 'Playfair Display', Georgia, serif", weight: 400, titleWeight: 400, size: 1.14, title: 1.1 },
  // Inscriptional capitals: the letter cut into stone rather than laid on
  // paper. Its lower case is small capitals, so it sets larger than a serif
  // at the same size and comes down rather than up.
  { slug: 'roman',      name: 'roman',      family: "'Cinzel', 'Newsreader', Georgia, serif", weight: 400, titleWeight: 600, size: 0.9, title: 0.88 },
  // One weight, geometric, with the twenties in it. The lacquer, the dawn,
  // the aurora and the nebula, and the only face here whose capitals and
  // lower case are nearly the same drawing.
  { slug: 'deco',       name: 'deco',       family: "'Poiret One', 'Comfortaa', system-ui, sans-serif", weight: 400, titleWeight: 400, size: 1.06, title: 1.04 },
  // Square serifs, printed on a form with a total at the bottom of it: the
  // ledger and the ticket.
  { slug: 'slab',       name: 'slab',       family: "'Zilla Slab', 'Newsreader', Georgia, serif", weight: 400, titleWeight: 600, size: 0.94, title: 0.92 },
  // Cut through a plate with the bridges left in, which is what a stencil
  // is. The airmail, and nothing else would be right on it.
  { slug: 'stencil',    name: 'stencil',    family: "'Saira Stencil One', 'Oswald', system-ui, sans-serif", weight: 400, titleWeight: 400, size: 0.94, title: 0.92 },
  // A round fast hand, the one in the margin of a book, on the scrapbook and
  // the corkboard. Distinct from the hand above, which is a pen: this is a
  // pencil somebody is pressing.
  { slug: 'note',       name: 'note',       family: "'Gloria Hallelujah', 'Caveat', cursive", weight: 400, titleWeight: 400, size: 0.9, title: 0.88 },
  // The same hand pressed far too hard, with the paper catching under it.
  // The rawest thing in the menu and the widest, so it is scaled furthest
  // down of anything here.
  { slug: 'scratch',    name: 'scratch',    family: "'Rock Salt', 'Permanent Marker', cursive", weight: 400, titleWeight: 400, size: 0.8, title: 0.78 },
  // A casual signature script, which is the other kind of script the menu
  // had none of: the copperplate is an invitation and this is a name signed
  // fast at the end of one.
  { slug: 'brush',      name: 'brush',      family: "'Sacramento', 'Caveat', cursive", weight: 400, titleWeight: 400, size: 1.3, title: 1.26 },
  // Blackletter, played straight, the way the script is. On the parchment
  // it is the only face that is not a costume.
  { slug: 'gothic',     name: 'gothic',     family: "'UnifrakturMaguntia', 'Newsreader', Georgia, serif", weight: 400, titleWeight: 400, size: 1.18, title: 1.14 },
]

// ── the tints ───────────────────────────────────────────────────────────────
// Twenty-nine grounds with the ink that reads on each. The lit edge, the
// shadowed foot and the hairline of every one of them are derived, the way
// the plain paper's are declared: a colour here is two hex values and the
// arithmetic below does the rest.
//
// It was eleven, and eleven was one band — seven light pastels at almost the
// same chroma and four darks — so a writer choosing COLOR was choosing how
// much pink. The list is now five bands, in this order, which is also the
// order the panel's five rows of six draw them in:
//
//   near white   chalk, bone, oat, dust        the letter barely dressed
//   warm         blush → clay                  where seven of the eleven were
//   cool         sage → lilac                  four steps apart, not two
//   deep         graphite → ink                seven where there were four,
//                                              and a mid grey there was none of
//   lit          flare → steel                 a saturated band, for the six
//                                              papers that are lit from
//                                              behind rather than printed on
//
// The last band is the newest and it exists because of the neon family. A
// synthwave whose only colours were four pastels and seven near blacks was a
// paper with the one thing it is made of taken off it, and a hot magenta on
// a cream sheet is a perfectly good letter too. They are stronger than
// anything else on the list, which is the point: the ban list's rule about a
// second saturated colour reads the SYSTEM's accent, and a letter's paper
// has never been the system's (design/DESIGN.md 2.5).
//
// The rule that cut `mint` still stands and is the reason the list is spread
// rather than merely longer: a swatch nobody can tell from its neighbour is
// a swatch that makes the grid longer without making a letter more its own.
// Nothing here is within a step of the thing beside it.
//
// Twenty-nine and not thirty because the paper's own ground stands first in
// the grid as a choice ("as is"), which makes it thirty cells, five even
// rows of six and no ragged last line.
//
// A letter already written on `mint` — or on any slug a later build drops —
// keeps that slug in its row and draws its paper's own ground.
export const TINTS = [
  // near white
  { slug: 'chalk',    paper: '#F4F1EA', ink: '#17150F' },
  { slug: 'bone',     paper: '#EDE4D2', ink: '#2E2717' },
  { slug: 'oat',      paper: '#E2D6BC', ink: '#352B17' },
  { slug: 'dust',     paper: '#D9D5CD', ink: '#26241E' },
  // warm
  { slug: 'blush',    paper: '#F9E4E6', ink: '#4A2129' },
  { slug: 'rose',     paper: '#F5D5DD', ink: '#4A1B2B' },
  { slug: 'coral',    paper: '#F9C8B7', ink: '#57241A' },
  { slug: 'peach',    paper: '#F9D8C2', ink: '#4E2812' },
  { slug: 'amber',    paper: '#F3CA8C', ink: '#48310D' },
  { slug: 'butter',   paper: '#F6E7AE', ink: '#45380D' },
  { slug: 'clay',     paper: '#D9B9A4', ink: '#3B2317' },
  // cool
  { slug: 'sage',     paper: '#D5E1C6', ink: '#20311A' },
  { slug: 'sea',      paper: '#C2E0D8', ink: '#0F332B' },
  { slug: 'sky',      paper: '#D2E3F5', ink: '#122A47' },
  { slug: 'denim',    paper: '#ABC1DF', ink: '#17283F' },
  { slug: 'lilac',    paper: '#E2D7F4', ink: '#301F4D' },
  // deep
  { slug: 'graphite', paper: '#494952', ink: '#EFEFF4' },
  { slug: 'slate',    paper: '#2A2D37', ink: '#E9EAF0' },
  { slug: 'teal',     paper: '#17352F', ink: '#CFE7DF' },
  { slug: 'forest',   paper: '#1D3227', ink: '#DBEADE' },
  { slug: 'plum',     paper: '#3A1E3F', ink: '#F3DDF5' },
  { slug: 'wine',     paper: '#3C1620', ink: '#F3D6DC' },
  { slug: 'ink',      paper: '#17150F', ink: '#F4F1EA' },
  // lit
  { slug: 'flare',    paper: '#E8318E', ink: '#FFEAF6' },
  { slug: 'laser',    paper: '#22C7D9', ink: '#04282E' },
  { slug: 'acid',     paper: '#B6E02A', ink: '#1E2A05' },
  { slug: 'ultra',    paper: '#4426C4', ink: '#E7E0FF' },
  { slug: 'ember',    paper: '#E8541B', ink: '#FFEDE3' },
  { slug: 'steel',    paper: '#8E97A3', ink: '#12161C' },
]

// ── the families ────────────────────────────────────────────────────────────
// Seven groups of six. The panel draws the texture axis as a gallery with
// these captions down it (Look.jsx), which is the only way forty-two objects
// can be looked THROUGH rather than scrolled past: a writer who wants a
// machine goes to the machines, and the four papers they never want are
// never in the way. The word under each is what the six have in common and
// is drawn in the panel, so it is copy and holds the voice.
export const FAMILIES = [
  { key: 'paper',  name: 'paper',  note: 'pressed, ruled and printed' },
  { key: 'post',   name: 'post',   note: 'carried by hand, and handled' },
  { key: 'ether',  name: 'ether',  note: 'light, with no hard edge in it' },
  { key: 'luxe',   name: 'luxe',   note: 'the expensive object' },
  { key: 'neon',   name: 'neon',   note: 'lit from behind' },
  { key: 'cyber',  name: 'cyber',  note: 'the machine' },
  { key: 'object', name: 'object', note: 'a thing that is not a sheet' },
]

// ── the themes ──────────────────────────────────────────────────────────────
// Each is whole. `paper` and `ink` are its own tint — and on a theme with a
// `frame`, they are the SCREEN's or the PICTURE's, not the shell's, because
// the surface a writer means when they pick a colour is the one the words
// are on. `ink2` is the secondary ink where the derived one would be wrong.
//
// `radius` is the corner, and every paper takes the same one: `--r-card`,
// 18px, the system's own (design/DESIGN.md 5.2). A paper may be a pressed
// sheet, a slate, a neon sign or a strip of magnetic tape and it is still a
// LETTER on the wall, and the thing that says so is the shape it is cut to.
// Forty-two papers with forty-two corners read as forty-two components;
// forty-two papers with one corner read as one card wearing forty-two
// materials, which is what they are. The token stays, so a paper that one
// day has a reason can say a number — but it needs the reason, and being
// made of something is not one.
//
// A letter written on a theme this build no longer carries keeps its slug in
// the row and draws the plain paper here, which is what `cleanLook` keeping
// an unknown slug is for.
export const THEMES = [
  // ══ paper ══ the sheet, pressed, ruled and printed ═══════════════════════

  { slug: 'paper', name: 'paper', family: 'paper', paper: '#F4F1EA', ink: '#17150F',
    face: 'serif', radius: 18, grain: 'fibre' },

  // Cotton stock, pressed. The chrome is a blind deboss — a rule with a lit
  // line above it and a shadowed one below, which is what an unlinked plate
  // leaves in a heavy sheet. The grain is coarser and slower than the plain
  // paper's, because cotton has a tooth and wood pulp has a grain.
  { slug: 'letterpress', name: 'letterpress', family: 'paper', paper: '#F1ECE0', ink: '#211E18',
    face: 'serif', radius: 18, grain: 'tooth', chrome: 'deboss' },

  // Form stock, printed in a single pass: a double rule struck round the
  // sheet and a faint ruling under the words, both in the form's own brown.
  // The body is set upper case, which is the convention and is a DISPLAY
  // choice — the words in the row are the words the writer typed, and the
  // list at the keyboard and the classifier after it read exactly what they
  // read on any other paper.
  { slug: 'telegram', name: 'telegram', family: 'paper', paper: '#F3E3A4', ink: '#2E2410',
    face: 'typewriter', radius: 18, grain: 'fibre', chrome: 'form' },

  // The lightest sheet anybody posts, with the barber stripe round it. The
  // red and the blue are the two hues this paper IS, so they are literal and
  // they are keyed on `:not([data-tint])`: pick a colour and the stripe is
  // struck in that colour's ink instead, at two strengths.
  { slug: 'airmail', name: 'airmail', family: 'paper', paper: '#F7F3E8', ink: '#1E2740',
    face: 'stencil', radius: 18, grain: 'fibre', chrome: 'airmail' },

  // Accounting stock: the green bands that keep an eye on the right line, a
  // red margin rule down the left of them, and a double rule under the head
  // where the columns would be named.
  { slug: 'ledger', name: 'ledger', family: 'paper', paper: '#EDF1E4', ink: '#1F2A1C',
    face: 'slab', radius: 18, grain: 'fibre', chrome: 'ledger' },

  // Engineer's paper: a millimetre grid with every fifth line struck harder,
  // and a tick block in the corner. The one paper in the family with no
  // fibre on it at all, because a grid through a noise field is moiré.
  { slug: 'graph', name: 'graph', family: 'paper', paper: '#EFF3F0', ink: '#18321F',
    face: 'mono', radius: 18, grain: 'none', chrome: 'graph' },

  // ══ post ══ carried by hand, and handled ═════════════════════════════════

  // The divided back, which is the whole of what a postcard is: the message
  // on the left of a rule, the address on the right of it, and a stamp box
  // in the corner with the constellation where the sovereign's head goes.
  { slug: 'postcard', name: 'postcard', family: 'post', paper: '#F2EADA', ink: '#33291C',
    face: 'hand', radius: 18, grain: 'fibre', chrome: 'stamp', layout: 'divided' },

  // The picture and the chin under it. The frame is the white border and it
  // is not the paper: a chosen colour moves the EMULSION, so `ink` on a
  // polaroid is a dark photograph in a white frame rather than a black
  // rectangle with a black chin. The addressee is written on the chin, in
  // the hand, which is where a name goes on a print.
  { slug: 'polaroid', name: 'polaroid', family: 'post', paper: '#F3EBDC', ink: '#231F18',
    frame: 'linear-gradient(168deg, #FFFFFD 0%, #FAFAF7 46%, #EDECE6 100%)',
    face: 'hand', radius: 18, grain: 'none', chrome: 'chin', layout: 'framed' },

  // A page out of a book somebody keeps: the sheet stuck down under two
  // strips of tape at the top corners, ruled like an index card, and torn
  // along the foot rather than cut. The tape is translucent and it is the
  // only thing on the card that is not square to it.
  { slug: 'scrapbook', name: 'scrapbook', family: 'post', paper: '#F8F2E4', ink: '#2A2318',
    face: 'note', radius: 18, grain: 'tooth', chrome: 'tape' },

  // The same idea done tidily: one printed paper tape across the head, a
  // dotted grid under the words, and nothing torn. Where the scrapbook is a
  // page kept, this is a page being made.
  { slug: 'washi', name: 'washi', family: 'post', paper: '#F6F2ED', ink: '#2E2A32',
    face: 'round', radius: 18, grain: 'none', chrome: 'washi' },

  // Die cut: a coloured field with a white border round it and a gloss
  // across one corner. The frame is the white, so a chosen colour moves the
  // FIELD, which is the thing a sticker is.
  { slug: 'sticker', name: 'sticker', family: 'post', paper: '#FFD6E8', ink: '#3B0F2C',
    frame: 'linear-gradient(170deg, #FFFFFF 0%, #FBFBF9 52%, #F0EFEC 100%)',
    face: 'poster', radius: 18, grain: 'none', chrome: 'diecut' },

  // Kraft board with the tab cut into the top edge and a fastener under it.
  // The tab is inside the card and not standing off it, because a paper is
  // the shape of a letter before it is the shape of a folder.
  { slug: 'manila', name: 'manila', family: 'post', paper: '#E7D3A2', ink: '#3A2E12',
    face: 'typewriter', radius: 18, grain: 'tooth', chrome: 'folder' },

  // ══ ether ══ light, with no hard edge in it ══════════════════════════════

  // The curtain, off the top of the card, in two hues that are the whole of
  // what this paper is — so they are literal, and a chosen colour takes them
  // over and draws the same curtain in its own ink.
  { slug: 'aurora', name: 'aurora', family: 'ether', paper: '#0C1B2A', ink: '#DCE9F2', ink2: '#8FB6C6',
    ground: 'linear-gradient(168deg, #123146 0%, #0C1B2A 52%, #060F1A 100%)',
    face: 'deco', radius: 18, grain: 'none', chrome: 'veil' },

  // Weather, not colour: three layers of the paper's own tone drifting
  // across it, the top one lit and the bottom one heavy, and a rule that
  // fades out at both ends because nothing here has an end.
  { slug: 'mist', name: 'mist', family: 'ether', paper: '#DDE3E5', ink: '#20292E',
    ground: 'linear-gradient(172deg, var(--lk-lift) 0%, var(--lk-paper) 46%, var(--lk-paper-edge) 100%)',
    face: 'elegant', radius: 18, grain: 'haze', chrome: 'fog' },

  // Six in the morning: the sun still under the line, the glow off one
  // corner, and the sky going from warm to cool up the card.
  { slug: 'dawn', name: 'dawn', family: 'ether', paper: '#F8DCCB', ink: '#3B2431',
    ground: 'linear-gradient(172deg, #F3D2E4 0%, #F8DCCB 54%, #FAE8CE 100%)',
    face: 'deco', radius: 18, grain: 'none', chrome: 'sun' },

  // Woven, and lit across the weave: a fine diagonal sheen that catches at
  // one angle, with two hairline seams down the card where the panels meet.
  { slug: 'silk', name: 'silk', family: 'ether', paper: '#E8DDEA', ink: '#2D2233',
    ground: 'linear-gradient(150deg, var(--lk-lift) 0%, var(--lk-paper) 44%, var(--lk-paper-edge) 100%)',
    face: 'fashion', radius: 18, grain: 'sheen', chrome: 'seam' },

  // The softest paper in the menu: two blooms of light through it and one
  // wide ring low on the card, the way a flash reads through a petal.
  { slug: 'bloom', name: 'bloom', family: 'ether', paper: '#F8E7F1', ink: '#3E2034',
    ground: 'radial-gradient(116% 86% at 28% 8%, var(--lk-lift) 0%, var(--lk-paper) 52%, var(--lk-paper-edge) 100%)',
    face: 'script', radius: 18, grain: 'petal', chrome: 'halo' },

  // Deep sky with something in it. It is a COLOUR and not the void: the wall
  // behind every letter is near black with white dust on it, and a paper
  // that looks like the wall it is pinned to is a letter with no paper
  // (which is what took `night` off the menu). This one is violet going
  // teal, and it carries an orbit rather than a star field.
  { slug: 'nebula', name: 'nebula', family: 'ether', paper: '#161031', ink: '#E7DFFF', ink2: '#A99BD6',
    ground: 'radial-gradient(124% 92% at 74% 10%, #3A2070 0%, #1B1240 44%, #0D0920 100%)',
    face: 'deco', radius: 18, grain: 'star', chrome: 'orbit' },

  // ══ luxe ══ the expensive object ═════════════════════════════════════════

  // Deep pile with a bloom off the top left and a debossed border. Where
  // `gold` spent a second saturated colour on a hairline frame, this one is
  // a MATERIAL: the ink is the light the pile throws back, and the only
  // bright thing on the sheet is still the paper.
  { slug: 'velvet', name: 'velvet', family: 'luxe', paper: '#2B1220', ink: '#F2DEE4', ink2: '#C9A2B2',
    ground: 'radial-gradient(112% 88% at 24% 6%, var(--lk-lift) 0%, var(--lk-paper) 46%, var(--lk-deep) 100%)',
    face: 'display', radius: 18, grain: 'pile', chrome: 'deboss' },

  // Foil on near black, and the one place in the product a metal is drawn:
  // the ink is a gradient across the type rather than a colour under it,
  // which is what a foil is and what a yellow is not. `gold` came off the
  // menu in September for spending a saturated hue on a hairline frame, and
  // this is that idea done as a material instead of as a border.
  { slug: 'gilt', name: 'gilt', family: 'luxe', paper: '#14110C', ink: '#E9CB82', ink2: '#A98C4E',
    ground: 'linear-gradient(168deg, var(--lk-paper-hi) 0%, var(--lk-paper) 50%, var(--lk-deep) 100%)',
    face: 'roman', radius: 18, grain: 'none', chrome: 'gild' },

  // The cover of something quarterly: one hairline frame, a thin rule over a
  // thick one under the head, and the widest tracking on the wall. Nothing
  // on it is a texture. It is the only paper here whose whole design is the
  // arrangement of four rules.
  { slug: 'atelier', name: 'atelier', family: 'luxe', paper: '#F2F0EA', ink: '#141414',
    face: 'fashion', radius: 18, grain: 'none', chrome: 'masthead' },

  // Stone, and the letter cut into it: veins through the slab, and a rule
  // that is chiselled rather than printed — a dark line with a lit one under
  // it, which is the deboss turned over.
  { slug: 'marble', name: 'marble', family: 'luxe', paper: '#EDEAE4', ink: '#26241F',
    ground: 'linear-gradient(158deg, var(--lk-lift) 0%, var(--lk-paper) 50%, var(--lk-paper-edge) 100%)',
    face: 'roman', radius: 18, grain: 'vein', chrome: 'chisel' },

  // Black lacquer: one specular sweep across the card and a hairline of the
  // light it is under. The gloss is the whole object, so the grain is a
  // reflection rather than a surface.
  { slug: 'lacquer', name: 'lacquer', family: 'luxe', paper: '#131316', ink: '#EEEBE3', ink2: '#9E9C96',
    ground: 'radial-gradient(130% 100% at 22% 0%, var(--lk-lift) 0%, var(--lk-paper) 42%, var(--lk-deep) 100%)',
    face: 'deco', radius: 18, grain: 'gloss', chrome: 'sheen' },

  // Aged: the edges gone dark where it has been held, and a seal at the
  // foot. The seal is a disc of the paper's own ink with the constellation
  // pressed into it, which is the only mark in the product that is stamped
  // rather than drawn.
  { slug: 'parchment', name: 'parchment', family: 'luxe', paper: '#EDE0C4', ink: '#3A2B16',
    face: 'gothic', radius: 18, grain: 'tooth', chrome: 'seal' },

  // ══ neon ══ lit from behind ══════════════════════════════════════════════

  // The sun over the grid, and the two hues it is made of are literal for
  // the same reason the aurora's are. The grid runs to a vanishing point
  // below the card, the sun is slatted, and the horizon between them is the
  // brightest line on the paper.
  { slug: 'synthwave', name: 'synthwave', family: 'neon', paper: '#1A0B36', ink: '#FFD9F4', ink2: '#C77BD6',
    ground: 'linear-gradient(176deg, #2C0E5C 0%, #1A0B36 56%, #0B0520 100%)',
    face: 'techno', radius: 18, grain: 'none', chrome: 'horizon' },

  // A cabinet: the screen recessed into a moulded bezel, scanned, and bowed
  // at the corners the way a tube is. The shell is the FRAME and the screen
  // is the paper, so a chosen colour is the phosphor and never the plastic.
  { slug: 'arcade', name: 'arcade', family: 'neon', paper: '#0D1017', ink: '#79F3C6', ink2: '#3E9C81',
    frame: 'linear-gradient(168deg, #3A3D46 0%, #24262C 56%, #141519 100%)',
    ground: 'radial-gradient(120% 96% at 50% 40%, var(--lk-paper-hi) 0%, var(--lk-paper) 58%, var(--lk-deep) 100%)',
    face: 'screen', radius: 18, grain: 'none', chrome: 'bezel' },

  // Pastel and wrong on purpose: the gradient going pink to cyan across the
  // card, a checkerboard floor under it, and a halftone through the middle.
  { slug: 'vapor', name: 'vapor', family: 'neon', paper: '#ECD9F6', ink: '#2A1B4A', ink2: '#6B5490',
    ground: 'linear-gradient(152deg, #FBD7EC 0%, #ECD9F6 46%, #CDEAF2 100%)',
    face: 'poster', radius: 18, grain: 'halftone', chrome: 'checker' },

  // The sign itself: a tube bent round the card, lit, with the glow thrown
  // onto the wall behind it and the type lit the same way. The ink IS the
  // light, so the glow is the ink at four strengths and not a second colour.
  { slug: 'tube', name: 'tube', family: 'neon', paper: '#0C0A11', ink: '#FF6BD5', ink2: '#B24A96',
    ground: 'radial-gradient(120% 90% at 50% 46%, var(--lk-lift) 0%, var(--lk-paper) 50%, var(--lk-deep) 100%)',
    face: 'brush', radius: 18, grain: 'none', chrome: 'tube' },

  // Foil that is not gold: an iridescence that sweeps through the hues
  // rather than sitting on one, with a diffraction ruling across it. The
  // only conic gradient in the product.
  { slug: 'hologram', name: 'hologram', family: 'neon', paper: '#E0EAF2', ink: '#1B2430',
    face: 'techno', radius: 18, grain: 'prism', chrome: 'foil' },

  // Two channels a pixel apart, and three bands where the picture has
  // slipped. Everything on it is the paper's own ink displaced, which is
  // what a channel split is and is why it needs no second colour.
  { slug: 'glitch', name: 'glitch', family: 'neon', paper: '#111014', ink: '#EAEAF3', ink2: '#8F8FA0',
    ground: 'linear-gradient(168deg, var(--lk-paper-hi) 0%, var(--lk-paper) 54%, var(--lk-deep) 100%)',
    face: 'grotesk', radius: 18, grain: 'none', chrome: 'split' },

  // ══ cyber ══ the machine ═════════════════════════════════════════════════

  // The one that was already here, and the one that was only ever a lattice.
  // It is an object now: a moulded shell, a screen recessed into it, the
  // dateline standing as the status row with the signal and the battery on
  // it. The lattice is the only thing on the screen — the grain is off, so
  // nothing is multiplied over it.
  { slug: 'nokia', name: 'nokia', family: 'cyber', paper: '#C3CFA3', ink: '#1B2416',
    frame: 'linear-gradient(170deg, #3C4038 0%, #24261F 58%, #171812 100%)',
    face: 'pixel', radius: 18, grain: 'none', chrome: 'nokia', layout: 'screen' },

  // A window on a machine: a bar across the head with three dots in it, the
  // phosphor scanned under that, and a block cursor at the end of the words.
  // The bar is furniture with the padding opened out around it, which is how
  // fifteen of the forty-two get an inner surface without a second layout.
  { slug: 'terminal', name: 'terminal', family: 'cyber', paper: '#0A110C', ink: '#8BF08B', ink2: '#4E9C57',
    ground: 'linear-gradient(168deg, var(--lk-paper-hi) 0%, var(--lk-paper) 56%, var(--lk-deep) 100%)',
    face: 'screen', radius: 18, grain: 'scan', chrome: 'console' },

  // The board: traces running off the corners at forty five degrees, vias
  // where they turn, and a silkscreen rule round the edge. Copper is the
  // paper's ink here rather than a hue of its own, so a tinted circuit is
  // etched in whatever was picked.
  { slug: 'circuit', name: 'circuit', family: 'cyber', paper: '#0B1A14', ink: '#9FE8C0', ink2: '#559679',
    ground: 'linear-gradient(168deg, var(--lk-paper-hi) 0%, var(--lk-paper) 54%, var(--lk-deep) 100%)',
    face: 'mono', radius: 18, grain: 'none', chrome: 'traces' },

  // A readout with something in the middle of it: four corner brackets, a
  // tick scale down one edge, and a reticle in the corner. Nothing on it
  // measures anything, which is the joke and is also why it is drawn and
  // never typed.
  { slug: 'hud', name: 'hud', family: 'cyber', paper: '#091219', ink: '#8FD8FF', ink2: '#4C8BAC',
    ground: 'radial-gradient(124% 94% at 50% 26%, var(--lk-paper-hi) 0%, var(--lk-paper) 56%, var(--lk-deep) 100%)',
    face: 'techno', radius: 18, grain: 'none', chrome: 'reticle' },

  // Sixty minutes, recorded for somebody: the case is the frame, the card
  // inside it is the paper, and the spine runs down the left of it with the
  // two hubs in the corner.
  { slug: 'cassette', name: 'cassette', family: 'cyber', paper: '#EAE5D9', ink: '#22201B',
    frame: 'linear-gradient(168deg, #4A4D54 0%, #2E3036 58%, #1C1D21 100%)',
    face: 'grotesk', radius: 18, grain: 'none', chrome: 'jcard' },

  // Cyanotype: white on blue, a grid under it, and the title block in the
  // corner where a drawing is named and dated. The one paper whose ink is
  // lighter than its ground by design rather than by tint.
  { slug: 'blueprint', name: 'blueprint', family: 'cyber', paper: '#153A6B', ink: '#DEEAF8', ink2: '#93B2D4',
    ground: 'linear-gradient(168deg, var(--lk-paper-hi) 0%, var(--lk-paper) 52%, var(--lk-deep) 100%)',
    face: 'mono', radius: 18, grain: 'none', chrome: 'titleblock' },

  // ══ object ══ a thing that is not a sheet ════════════════════════════════

  // Slate, dust and a wooden rail along the bottom edge. The dark paper that
  // is not the void: `night` was the void with a serif on it, and a letter
  // that looks like the wall it is pinned to is a letter with no paper.
  { slug: 'chalkboard', name: 'chalkboard', family: 'object', paper: '#26342C', ink: '#EFEFE6',
    ground: 'linear-gradient(168deg, var(--lk-paper-hi) 0%, var(--lk-paper) 48%, var(--lk-paper-edge) 100%)',
    face: 'hand', radius: 18, grain: 'dust', chrome: 'rail' },

  // The back of the thing the letter came in: the flap folded down across
  // the head, the two side folds under it, and a seal where they meet. It is
  // the only paper in the menu that is a picture of the letter's own
  // container.
  { slug: 'envelope', name: 'envelope', family: 'object', paper: '#EFE6D4', ink: '#332A1C',
    face: 'script', radius: 18, grain: 'tooth', chrome: 'flap' },

  // Thermal roll: the till's own rules, a barcode at the foot, and the
  // bottom edge torn off the machine rather than cut. The tear is a mask on
  // the card, which is why this paper and the ticket are the only two whose
  // shadow is a filter rather than a box.
  { slug: 'receipt', name: 'receipt', family: 'object', paper: '#F8F6F0', ink: '#26241E', ink2: '#6E6C66',
    face: 'mono', radius: 18, grain: 'none', chrome: 'thermal' },

  // The stub: two notches bitten out of the sides, a perforation between
  // them, and a serial struck down the short end. Admits one.
  { slug: 'ticket', name: 'ticket', family: 'object', paper: '#E9DDC2', ink: '#2E2414',
    face: 'slab', radius: 18, grain: 'tooth', chrome: 'stub' },

  // Cork, and the letter pinned to it. The pin is a disc with a lit edge and
  // a shadow thrown down the card, which is the only shadow in the product
  // cast by an object ON the paper rather than by the paper itself.
  { slug: 'corkboard', name: 'corkboard', family: 'object', paper: '#C9A26B', ink: '#35250F',
    face: 'note', radius: 18, grain: 'cork', chrome: 'pin' },

  // Two in the morning, in a bar, in biro: soft stock, a scalloped edge, and
  // the ink bleeding a little where it sat. The one paper that is an accident
  // rather than a choice, which is what half the letters on the wall are.
  { slug: 'napkin', name: 'napkin', family: 'object', paper: '#F9F6F0', ink: '#2A3550', ink2: '#6A7591',
    face: 'scratch', radius: 18, grain: 'tissue', chrome: 'scallop' },
]

const SLUG = /^[a-z][a-z0-9-]{0,23}$/

const byThemeSlug = new Map(THEMES.map((t) => [t.slug, t]))
const byTintSlug = new Map(TINTS.map((t) => [t.slug, t]))
const byFaceSlug = new Map(FACES.map((f) => [f.slug, f]))
const byFamilyKey = new Set(FAMILIES.map((f) => f.key))

// The seven groups with their six papers in them, built once off THEMES so a
// paper is in the panel because it says which family it is in and never
// because it was also listed somewhere else. A theme with no family, or one
// naming a group that is not above, would be drawn nowhere — so it is put in
// the last group rather than lost.
export const FAMILY_THEMES = FAMILIES.map((f) => ({
  ...f,
  themes: THEMES.filter((t) => (byFamilyKey.has(t.family) ? t.family : FAMILIES[FAMILIES.length - 1].key) === f.key),
}))

// ── the shape ───────────────────────────────────────────────────────────────
// The same cleaning the server does (wall_look_clean): three keys, slugs,
// and nothing for the plain paper. Not the catalogue: a slug this build does
// not know is kept, so a letter written by a newer build keeps its look in
// the row and draws the plain paper here. `normalise` goes one step further
// for what THIS build writes: a tint or a face that is the theme's own is not
// worth storing.
export function cleanLook(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out = {}
  const pick = (k) => (typeof raw[k] === 'string' && SLUG.test(raw[k]) ? raw[k] : '')
  const theme = pick('theme')
  if (theme && theme !== 'paper') out.theme = theme
  const tint = pick('tint')
  if (tint) out.tint = tint
  const face = pick('face')
  if (face) out.face = face
  return Object.keys(out).length ? out : null
}

export function normaliseLook(raw) {
  const look = cleanLook(raw)
  if (!look) return null
  const theme = themeOf(look)
  const out = { ...look }
  if (out.tint && theme.paper && !theme.ground && byTintSlug.get(out.tint)?.paper === theme.paper) delete out.tint
  if (out.face && out.face === theme.face) delete out.face
  return Object.keys(out).length ? out : null
}

// One string per look, for a memo key and for React: two looks that draw the
// same are the same string.
export function lookKey(look) {
  const l = cleanLook(look)
  return l ? `${l.theme || ''}/${l.tint || ''}/${l.face || ''}` : ''
}

export function themeOf(look) {
  return (look && byThemeSlug.get(look.theme)) || THEMES[0]
}
export function tintOf(look) {
  return (look && look.tint && byTintSlug.get(look.tint)) || null
}
export function faceOf(look) {
  const theme = themeOf(look)
  return (look && look.face && byFaceSlug.get(look.face)) || byFaceSlug.get(theme.face) || FACES[0]
}

// What a look is called, in words, for the desk and for a label: the theme,
// then the tint and the face when they are not the theme's own.
export function lookLabel(look) {
  const l = cleanLook(look)
  if (!l) return ''
  const theme = themeOf(l)
  const parts = [theme.name]
  const tint = tintOf(l)
  if (tint) parts.push(tint.slug)
  if (l.face && l.face !== theme.face) parts.push(l.face)
  return parts.join(', ')
}

// ── the arithmetic ──────────────────────────────────────────────────────────
function rgb(hex) {
  const h = String(hex || '').replace('#', '')
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(s, 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
function toHex(r, g, b) {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}
export function mix(a, b, t) {
  const A = rgb(a)
  const B = rgb(b)
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}
export function alpha(hex, a) {
  const [r, g, b] = rgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
// Whether a ground is dark, off its luma: it decides which way the lit edge
// and the shadowed foot go, and which way the secondary ink leans.
export function isDark(hex) {
  const [r, g, b] = rgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 118
}

// A ground written in the paper's own tokens is a SHAPE — where the light
// falls on this object — and it survives a chosen colour, because the velvet
// wants its bloom and the lacquer its specular whatever they are made of. A
// ground written in hues IS the colour, and a chosen one replaces it. The
// string says which, so a theme cannot be written one way and declared the
// other.
const tokenGround = (g) => typeof g === 'string' && g.includes('var(--lk-')

// ── the tokens ──────────────────────────────────────────────────────────────
// What a look sets on a paper, a tile or a disc. Null for the plain paper:
// the stylesheet's own declarations stand. `tokensOf` is the same
// arithmetic with the plain paper included, for the panel's tiles and dots,
// which draw the plain paper as a choice beside the others.
export function lookVars(look) {
  const l = cleanLook(look)
  if (!l) return null
  return tokensOf(l)
}

export function tokensOf(look) {
  const l = cleanLook(look) || {}
  const theme = themeOf(l)
  const tint = tintOf(l)
  const face = faceOf(l)
  const paper = tint ? tint.paper : theme.paper
  const ink = tint ? tint.ink : theme.ink
  const dark = isDark(paper)
  const hi = mix(paper, '#FFFFFF', dark ? 0.06 : 0.45)
  const edge = mix(paper, '#000000', dark ? 0.32 : 0.07)
  // The two strong ones, and they are what let a ground be a shape. `hi` and
  // `edge` are a sheet's own highlight and shadow, a step either side of the
  // paper: laid across a whole card they read as a fill with a little depth,
  // which is all eight papers ever needed. A bloom on a pile of velvet, a
  // specular on lacquer and a phosphor in the middle of a tube are not a
  // step, they are the light itself, and they are these.
  const lift = mix(paper, '#FFFFFF', dark ? 0.26 : 0.62)
  const deep = mix(paper, '#000000', dark ? 0.55 : 0.2)
  const ground = theme.ground && (!tint || tokenGround(theme.ground))
    ? theme.ground
    : `linear-gradient(168deg, ${hi} 0%, ${paper} 34%, ${edge} 100%)`
  const ink2 = !tint && theme.ink2 ? theme.ink2 : mix(ink, paper, dark ? 0.42 : 0.4)
  return {
    '--lk-ground': ground,
    '--lk-paper': paper,
    '--lk-paper-hi': hi,
    '--lk-paper-edge': edge,
    '--lk-lift': lift,
    '--lk-deep': deep,
    '--lk-ink': ink,
    '--lk-ink-2': ink2,
    '--lk-rule': alpha(ink, 0.16),
    '--lk-ink-faint': alpha(ink, 0.05),
    '--lk-ink-soft': alpha(ink, 0.07),
    '--lk-ink-mid': alpha(ink, 0.3),
    '--lk-ink-strong': alpha(ink, 0.55),
    '--lk-face': face.family,
    '--lk-face-w': String(face.weight),
    '--lk-title-w': String(face.titleWeight),
    '--lk-size': String(face.size),
    '--lk-title-size': String(face.title),
    '--lk-radius': `${theme.radius}px`,
    // The hairline round the card, derived off the ink the way the rule and
    // the stamp above it are. It was `rgba(0,0,0,0.22)` declared once on
    // `.wl-paper` and never varied, which drew a hard line on a cream paper
    // and NOTHING at all on a near black one. A dark ground takes a lit
    // edge and a light ground a shadowed one, a little weaker, because a
    // dark line on a pale card reads heavier than a pale line on a dark one.
    '--lk-edge': alpha(ink, dark ? 0.2 : 0.26),
    // What the card itself is on a theme whose letter is written on
    // something INSIDE it: the nokia's shell, the polaroid's border, the
    // sticker's die cut. The tokens above stay the screen's and the
    // picture's, so a chosen colour moves the surface the words are on and
    // never the shell around it.
    '--lk-frame': theme.frame || ground,
  }
}

// The attributes a looked element carries beside its vars: the theme's slug,
// which the stylesheet keys its chrome on; whether the ground is dark, which
// decides which way the grain is laid on it; the grain itself, which is the
// theme's and not the plain paper's; and WHETHER A COLOUR WAS CHOSEN.
//
// `data-grain` is the fix for two layers multiplying over each other: the one
// grain layer on the card reads this attribute and draws that surface and no
// other, so a theme that brings a texture of its own says `none` and gets
// exactly its own texture.
//
// `data-tint` is the other half of the ground rule above, for the furniture.
// A handful of papers are drawn in hues that ARE the paper — the airmail's
// red and blue stripe, the aurora's curtain, the gilt's foil, the
// chalkboard's wooden rail — and a writer who picks rose has asked for those
// to go. Every such rule is written twice, once under `:not([data-tint])` in
// the paper's own hues and once under `[data-tint]` in the paper's ink, so
// nothing on a tinted card is a colour the writer did not choose.
export function lookAttrs(look) {
  const l = cleanLook(look) || {}
  const theme = themeOf(l)
  const tint = tintOf(l)
  return {
    'data-look': theme.slug,
    'data-lit': isDark(tint ? tint.paper : theme.paper) ? 'dark' : 'light',
    'data-grain': theme.grain || 'fibre',
    ...(tint ? { 'data-tint': tint.slug } : null),
  }
}

// The two hooks a themed card needs in JSX rather than in CSS: what it draws
// beside its type (parts.jsx `Furniture`) and whether it moves its own slots
// (`Paper`). Both are the theme's, never the tint's or the face's — picking
// a colour or a face can never change what a paper IS.
export function chromeOf(look) {
  return themeOf(look).chrome || ''
}
export function layoutOf(look) {
  return themeOf(look).layout || ''
}

// ── the wall's memo ─────────────────────────────────────────────────────────
// The look on the newest letter under a key, learned from wherever this
// browser last saw the key (the index, a search, a letter), the way a first
// name's spelling is learned (data.js `learnName`). It is what a disc on the
// field, a row in the search and a face in the dock draw when nobody hands
// them a letter's own look.
const LOOKS = new Map()
export function learnLook(key, look) {
  if (!key) return
  const l = cleanLook(look)
  if (l) LOOKS.set(key, l)
  else LOOKS.delete(key)
}
export function lookFor(key) {
  return (key && LOOKS.get(key)) || null
}

// ── the disc ────────────────────────────────────────────────────────────────
// How the name on a looked disc is set: the whole name when it is short
// enough to stand in the disc at a size that can be read, and the monogram
// otherwise. The size is what fits the disc's width at the face's average
// advance, capped so one letter is not a poster.
export function nameOnDisc(name, size) {
  const n = String(name || '').trim()
  if (!n || size < 44 || n.length > 9) return null
  const px = Math.min(size * 0.3, (size * 0.74) / (0.58 * n.length))
  if (px < size * 0.15) return null
  return { text: n, px: Math.round(px * 10) / 10 }
}
