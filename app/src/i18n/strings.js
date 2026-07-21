// strings.js — CELESTUAL's canonical copy.
//
// The register is docs/VOICE.md: lowercase, quiet, adult, certain — the 2am
// message, never the carnival. Say less; trust the reader; let a pill or a state
// dot carry what a sentence would only repeat. Every sentence shown to any user
// must be literally true, always (docs/ULTIMATE-PRODUCT-FRAMEWORK.md §6.2: truth
// is the entire legal and ethical margin).
//
// English is the canonical, complete dictionary. The i18n plumbing still falls
// back key-by-key, so a future locale can land as a partial object.
//
// `{x}` tokens are interpolated at render time; keep them intact everywhere.

export const LANGS = {
  en: 'English',
}

const en = {
  // ── screen 1 · the cold landing ────────────────────────────────────────
  // the hero names the feeling; one quiet line beneath it names the promise,
  // typed once and held (§4.1).
  'landing.head1': 'someone’s on your mind.',
  'landing.head2': 'are you on theirs?',
  // the promise under the headline — typed as two lines with a held breath
  // between them (both line-boxes are reserved, so nothing ever shifts)
  'landing.hero1': 'enter their @.',
  'landing.hero2': 'if it’s not mutual, it never happened.',
  'landing.cta': 'find out',
  'landing.safety': 'no profiles. no browsing. nothing happens unless it’s mutual.',
  'landing.login': 'log in',
  'footer.privacy': 'privacy',
  'footer.terms': 'terms',
  'footer.optout': 'opt out',
  'landing.age': 'for adults. continuing means you’re 18+ and accept the',
  'landing.terms': 'terms',

  // ── screen 2 · the send ────────────────────────────────────────────────
  // the header now reads as a full serif headline (matching "now, this is you."),
  // its second line in rose — the "them" star — since this is the person you're
  // reaching toward.
  'who.title1': 'who’s',
  'who.title2': 'on your mind?',
  'who.fromLabel': 'this ping is from',
  'who.placeholder': 'their instagram handle',
  'who.note': 'no alert. no trace. invisible until they enter you back.',
  'who.confirm1': 'placing a ping on',
  'who.confirm2': 'spelled right? tap again to place.',
  'who.cta': 'place it',
  'who.ctaConfirm': 'yes, place it',
  'who.errInvalid': 'not a real instagram handle yet. check the spelling.',
  'who.errSelf': 'that’s you. name the other person.',
  'who.errRate': 'too fast. the pace is part of the design. give it a moment.',
  'who.errSuppressed': 'that person asked never to be entered. the door is closed.',
  'who.errGeneric': 'the night didn’t answer. give it a moment, then place it again.',
  'who.errUnverified': 'we couldn’t confirm the @ is yours. verify again and it’ll place.',
  'who.demoHint': 'sandbox: enter @demo and the match will find you.',

  // first, who they are to you — a category, so the "why them" lines that follow
  // fit the actual relationship instead of one flat list.
  'category.label': 'who are they to you?',
  'category.crush': 'crush',
  'category.ex': 'ex',
  'category.friend': 'friend',
  'category.complicated': 'complicated',
  // skipping is a visible act, not a pill that says "optional"
  'category.skip': 'skip this',
  'category.skipped': 'left unsaid. the ping seals just the same.',
  'category.unskip': 'say it after all',

  // the intent row — an optional line that travels with the ping, read only at a
  // mutual reveal. the options shown depend on the category above (screens.jsx
  // CATEGORIES). never free-text, never required. written in the first person, so
  // each reads under either "they said" or "you said".
  'intent.label': 'why them?',
  'intent.optional': 'optional',
  'intent.note': 'travels with the ping. read only if it’s mutual.',
  // crush
  'intent.crushHi': 'i’ve wanted to say hi',
  'intent.crushThink': 'i can’t stop thinking about you',
  'intent.crushCute': 'i think you’re cute',
  'intent.crushSee': 'let’s see where this goes',
  // ex
  'intent.exMiss': 'i miss you',
  'intent.exAgain': 'i want to try again',
  'intent.exUnsaid': 'i never got to say something',
  'intent.exUs': 'i still think about us',
  // friend
  'intent.friendTalk': 'we should talk',
  'intent.friendAround': 'i miss having you around',
  'intent.friendLeft': 'i hate how we left things',
  'intent.friendFix': 'let’s fix this',
  // complicated
  'intent.compRight': 'i want to make things right',
  'intent.compMind': 'it’s been on my mind',
  'intent.compAir': 'we need to clear the air',
  'intent.compWhat': 'i don’t know what we are',

  // the slot line under the field — scarcity is the sincerity mechanism
  'slots.holding': 'holding {n} of {cap}',
  'slots.free': '{n} of {cap} open',

  // ── the identity step (so the ping can resolve to you) ─────────────────
  'you.title1': 'now,',
  'you.title2': 'this is you.',
  'you.handle': 'your.handle',
  'you.handleNote': 'your instagram @, so the ping can resolve to you.',
  // the 18+ hard gate (§4.4). one tap; nothing about age is ever stored — we
  // keep whether, not when.
  'you.ageLabel': 'one thing first',
  'you.ageConfirm': 'i’m 18 or older',
  'you.ageConfirmed': 'confirmed, 18 or older',
  'you.ageNote': 'for adults. tap to confirm. nothing is stored.',
  'you.emailAdd': 'add an email',
  'you.emailLabel': 'email',
  'you.emailOptional': 'optional',
  'you.email': 'you@email.com',
  'you.note': 'one note if it’s mutual, one before a ping lapses. nothing else.',
  'you.continue': 'continue',
  'you.loginTitle1': 'welcome',
  'you.loginTitle2': 'back.',
  'you.loginNote': 'prove it’s yours and your pings come back.',
  'you.loginCta': 'sign back in',
  // the durable, dm-free return: a one-time link to the email you left when you
  // first verified brings you back on any device, no dm (Fix B).
  'you.linkNote': 'we email a one-time link to the address on file — no dm needed.',
  'you.linkCta': 'email me a sign-in link',
  'you.linkDm': 'verify by dm instead',
  'you.linkSentTitle': 'check your email.',
  'you.linkSentNote': 'if @{handle} has an email on file, a one-time sign-in link is on its way. it lasts twenty minutes.',
  'you.linkResend': 'send again',

  // ── screen 3 · placed (the recruiter screen) ───────────────────────────
  // the placed screen turns on your community: the growth-narrative copy (both
  // states, with the gamified countdown language) lives in growth.js,
  // deliberately out of this linted file. these keys are the quiet fallbacks (no
  // community joined, or your community already open) and the shared labels.
  'placed.standingTitle': 'your ping is live.',
  'placed.standingSub': '@{handle} is on celestual. the second they ping you back, you both know. until then, nothing shows.',
  'placed.waitingHead': 'isn’t on celestual yet.',
  'placed.waitingSub': 'your ping is held, unseen, until they arrive. they’ll never know it was you.',
  // the hero @ handle's status line when they're already reachable — the
  // one-line answer to "are they here yet?", paired with waitingHead above
  'placed.reachableHead': 'is already on celestual.',
  // the no-community nudge: the flow only opens once your world is here
  'placed.joinTitle': 'one more thing.',
  'placed.joinReachable': '@{handle} is already on celestual. now pick your community, so your ping has a sky to light when the countdown ends.',
  'placed.joinWaiting': 'celestual only works when your world is here. pick your community and bring it in.',
  'placed.findComm': 'find your community',
  'placed.share': 'share your invite link',
  'placed.shared': 'link copied',
  'placed.door': 'share the open sky',
  'placed.pings': 'your pings',

  // ── screen 4 · your pings (the status page) ────────────────────────────
  'pings.kicker': 'your pings',
  'pings.emptyTitle': 'no pings yet.',
  'pings.emptyBody': 'two slots, sixty days each. for the people who actually stayed on your mind.',
  'pings.emptyCta': 'place your first',
  // the three ping states, in plain words read at a glance
  'pings.standing': 'active',
  'pings.standingSub': '',
  'pings.waiting': 'not here yet',
  'pings.waitingSub': '',
  'pings.mutual': 'mutual',
  'pings.mutualSub': 'you both entered each other.',
  'pings.mutualKicker': 'mutual',
  'pings.days': '{n} days left',
  'pings.today': 'lapses today',
  'pings.elsewhere': 'placed on another device',
  'pings.elsewhereNote': 'we can’t see who these point at. the names live only on the device that placed them.',
  // the slot picture: used vs. open, and the empty-slot placeholder card
  'pings.slotsUsed': '{used} of {cap} slots',
  'pings.slotEmpty': 'open slot',
  'pings.slotEmptySub': 'tap to place a ping',
  // once every slot is held, the last card becomes the door to the next one
  'pings.slotNext': 'a third slot',
  'pings.slotNextSub': 'tap to hold one, from $2.99',
  // renew / let go — plain words, no jargon
  'pings.expiringSoon': 'lapses in {n} days',
  'pings.renew': 'renew',
  'pings.renewed': 'renewed. sixty more days.',
  'pings.letgo': 'let go',
  'pings.letgoConfirm': 'remove this ping? the slot opens back up, and nothing was ever shown.',
  'pings.letgoYes': 'remove',
  'pings.keep': 'keep',
  'pings.add': 'place another',
  'pings.door': 'share the open sky',
  'pings.open': 'message them',
  'pings.worlds': 'communities',
  'pings.locate': 'see it in the sky',
  'pings.locateShort': 'its star',
  // the held star view — the @ resting over its star, the hand free to orbit
  'starview.close': 'back to your pings',
  'starview.hint': 'drag to look around · pinch to pull closer',
  'starview.noIntent': 'placed without a word.',
  'pings.sim': 'sandbox: they add you back',

  // ── screen 5 · the open-sky share card ──────────────────────────────────
  // the shareable is about the PLACE, never the person: a card that says a
  // community's sky is open (or gathering), designed to recruit the rest of your
  // world — the thing that actually moves the meter. it names no one and never
  // reveals that you've entered anyone (§6.2 truth; §2.2 growth surface).
  'sky.kicker': 'your community',
  'sky.title1': 'share the',
  'sky.title2': 'open sky.',
  'sky.subOpen': 'this card is your community’s real sky, alive. post it — everyone who joins from it brings the next match closer.',
  'sky.subGathering': 'this card shows {name} gathering. when the countdown ends, its sky opens for everyone at once.',
  'sky.story': 'post it to your story',
  'sky.dm': 'send it in a dm',
  'sky.copy': 'copy the invite link',
  'sky.copied': 'copied',
  // the living card's face + its tappable numbers
  'sky.cardLine': '{name}’s sky',
  'sky.cardOpen': 'is open.',
  'sky.cardGathering': 'is gathering.',
  'sky.cardHint': 'the card is alive — tap the sky, tap a number',
  'sky.statInside': 'souls inside',
  'sky.statPings': 'secrets in orbit',
  'sky.statMatches': 'found each other',
  'sky.statOpens': 'until it opens',
  'sky.foot': 'the card names a place, never a person. nothing on it says who you’ve entered.',
  'sky.none': 'join your community first, then you can share its sky.',
  'sky.find': 'find your community',

  // the personal landing — celestual.us/@handle
  'open.reach': 'reachable on celestual',
  'open.line': 'if there’s something you never said to them, there’s a safe place to say it.',
  'open.mech': 'they only find out if they enter you too, then you both do, at once.',
  'open.cta': 'find out',
  'open.else': 'someone else on your mind? enter anyone.',

  // ── screen 8 · the match ────────────────────────────────────────────────
  'match.title': 'it’s mutual.',
  'match.sub': 'you entered @{them}. @{them} entered you.',
  'match.theySaid': 'they said',
  'match.youSaid': 'you said',
  'match.cta': 'go say it',
  'match.exit': 'the rest is yours. celestual’s part is done.',

  // ── screen 9 · the third slot (route key stays 'fourth' — old sessions may
  // still hold it in localStorage) ────────────────────────────────────────
  'fourth.title': 'your slots are full.',
  'fourth.body': 'each one costs something. let one go, and the slot’s yours again.',
  'fourth.cta': 'let one go',
  'fourth.back': 'not now',

  // the slot checkout — SANDBOX ONLY. production keeps one door ("let one go")
  // until monetization wakes (docs/PRICING-REVENUE.md); the sandbox previews the
  // real thing behind a real-looking checkout: a one-time add ($2.99, repeatable)
  // or a $12.99/mo subscription (ten pings, each standing six months). also
  // fronts the renew action on a near-lapse ping (mode="extend") — same checkout,
  // same fields, a one-time $2.99 to keep it standing. no banned paywall words.
  'paywall.kicker': 'a third ping',
  'paywall.extendKicker': 'extend a ping',
  'paywall.title': 'hold a third.',
  'paywall.extendTitle': 'keep it standing.',
  'paywall.sub': 'when a third person is really on your mind, hold them too. once, or settle in for good.',
  'paywall.extendSub': 'give it another sixty days. or settle in for good.',
  'paywall.onceLabel': 'one more ping',
  'paywall.onceExtendLabel': 'keep it standing',
  'paywall.onceDetail': 'one time, never a subscription.',
  'paywall.subLabel': 'go steady',
  'paywall.subDetail': 'ten pings a month. each stands six months.',
  'paywall.subBadge': 'the better deal',
  'paywall.subscribedNote': 'subscribed · ten a month',
  'paywall.price': '$2.99',
  'paywall.priceUnit': 'once',
  'paywall.subPrice': '$12.99',
  'paywall.subUnit': 'month',
  'paywall.cardLabel': 'card',
  'paywall.cardNumber': '1234 1234 1234 1234',
  'paywall.expiry': 'MM / YY',
  'paywall.cvc': 'CVC',
  'paywall.zip': 'ZIP',
  'paywall.pay': 'pay {price}',
  'paywall.paySub': 'subscribe, {price} a month',
  'paywall.paying': 'confirming…',
  'paywall.secure': 'secure checkout',
  'paywall.stripe': 'powered by stripe',
  'paywall.demoNote': 'sandbox. a mock checkout. no card is read, nothing is charged, nothing is saved.',
  'paywall.doneTitleOnce': 'one more, held.',
  'paywall.doneSubOnce': 'the slot is yours. place it whenever the feeling’s ready.',
  'paywall.doneTitleSub': 'you’re subscribed.',
  'paywall.doneSubSub': 'ten pings a month, each standing six months. place whenever you like.',
  'paywall.doneTitleExtend': 'it’s standing.',
  'paywall.doneSubExtend': 'another sixty days, held.',
  'paywall.donePlace': 'place it',
  'paywall.doneBack': 'back to your pings',
  'paywall.letgo': 'or let one go, free, always',
  'paywall.back': 'not now',

  // ── verify (instagram dm handle-ownership) ──────────────────────────────
  'verify.title': 'prove it’s your @',
  'verify.sub': 'dm a one-time code to our instagram; we confirm the @ is yours. no password, no oauth, nobody told.',
  'verify.code': 'your code',
  'verify.copyOpen': 'copy & open instagram',
  'verify.copied': 'copied. now send it',
  'verify.step1': 'tap below, and we copy the code and open instagram.',
  'verify.step2': 'send it to {ig} as a dm.',
  'verify.step3': 'come back here. it confirms on its own.',
  'verify.waiting': 'waiting for your dm…',
  'verify.stuckHint': 'sent it and nothing happened?',
  'verify.stuckAction': 'get a fresh code',
  'verify.verified': 'verified. it’s really you.',
  'verify.verifiedSub': 'carrying on…',
  'verify.expiredTitle': 'that code lapsed.',
  'verify.expiredBody': 'codes last a few minutes, for safety. take a fresh one.',
  'verify.regen': 'get a new code',
  'verify.errRate': 'too many tries. give it a minute, then start again.',
  'verify.errBusy': 'the line is busy. try again in a moment.',
  'verify.errGeneric': 'the verification couldn’t start. check your connection, then try once more.',
  'verify.cancel': 'cancel',
  'verify.demoNote': 'sandbox. no dm needed. this confirms on its own in a moment.',
  'verify.tosNote': 'we only read who sends the code. we never post, follow, message, or see your password.',
  'verify.inApp': 'inside instagram’s browser? send the dm, then return to this tab, or open celestual.us in safari or chrome.',
  'verify.desktop': 'not signed in to instagram there? log in inside that window first, then tap the button again.',
  'verify.youHint': 'next, a quick dm confirms it’s yours. nobody is told.',
  'verify.youDone': 'verified. this @ is yours.',
  'verify.continue': 'verify & continue',

  // ── account ──────────────────────────────────────────────────────────────
  'account.kicker': 'your account',
  'account.verified': 'verified by instagram dm',
  'account.localOnly': 'kept on this device',
  'account.handleLabel': 'your handle',
  'account.emailLabel': 'email',
  'account.emailOptional': 'optional',
  'account.emailNote': 'the mutual note and the lapse note go here. nothing else.',
  'account.reverifyNote': 'change it and you’ll re-confirm by dm next time you place.',
  'account.pingsLine': '{n} active',
  'account.pingsNone': 'no pings yet.',
  'account.pingsOpen': 'view',
  'account.sandboxNote': 'sandbox. nothing here is real, and nothing reaches a server.',
  'account.signOut': 'sign out',
  'account.delete': 'delete everything',
  'account.deleteConfirm': 'this erases every ping you’ve placed, closes your door, and blocks your own handle from being entered. it can’t be undone.',
  'account.deleteConfirmDemo': 'sandbox. this just clears the demo and starts it fresh. nothing here was ever saved.',
  'account.deleteYes': 'erase it all',
  'account.deleting': 'erasing…',
  'account.cancel': 'cancel',
  'account.close': 'close',

  // multi-account (your other @s)
  'accounts.add': 'add another account',
  'accounts.label': 'your other accounts',
  'accounts.optional': 'optional',
  'accounts.placeholder': 'your.other.handle',
  'accounts.addBtn': 'add',
  'accounts.remove': 'remove account',
  'accounts.note': 'entered on any of these counts as you.',

  // ── communities (official, curated launch spaces) ───────────────────────
  // communities are not user-created — the team curates them. placing a ping
  // never depends on one. there is no member threshold: every community's sky
  // opens together when the launch countdown ends (communities.js LAUNCH_AT).
  // NOTE: the sandbox live-feed copy is intentionally literal and lives in
  // demoData.js, out of this linted file.
  'communities.kicker': 'communities',
  'communities.intro': 'everyone can ping from day one. when the countdown ends, every sky opens at once.',
  'communities.foot': 'curated by celestual. more schools soon.',
  'communities.open': 'open',
  'communities.gathering': 'gathering',
  // how a community's state is spoken — a quiet line, never a badge or a dot
  'communities.skyOpen': 'the sky is open.',
  'communities.skyGathering': 'still gathering.',
  'communities.view': 'view the community',
  'communities.none': 'no community here.',
  'communities.thisWeek': 'this week',
  'communities.matchedLabel': 'matched this week',
  'communities.matchFloor': 'matches show at ten and up, so no match can be guessed at.',
  'communities.matchesSoon': 'matches show at ten',
  'communities.reasonLabel': 'most said',
  'communities.pings': '{n} pings placed',
  'communities.joinedWeek': '+{n} joined',
  'communities.join': 'join {name}',
  'communities.leave': 'leave this community',
  'communities.place': 'place a ping',
  'communities.matchedShort': 'matched',
  // the galaxy community page — a gathering community's sky is still forming
  'communities.gatheringHero': 'a sky still forming.',
  'communities.gatheringBody2': 'everyone here can already ping. when the countdown ends, its stars come out — and its matches begin to show.',
  'communities.demoWave': 'sandbox: send a wave of pings',
  'communities.demoGather': 'sandbox: bring people in',
  'communities.label': 'your communities',
  'communities.browse': 'browse',
  'communities.summaryNone': 'you haven’t joined one yet.',

  // the community finder — a search field that reveals the curated schools. used
  // on the onboarding step and on the pings page.
  'communities.searchLabel': 'search for your community',
  'communities.searchPlaceholder': 'your school',
  'communities.searchOptional': 'optional',
  'communities.searchOpen': 'tap to search your community.',
  'communities.searchNone': 'no match yet. more schools are on the way.',
  'communities.searchMore': 'search other communities',
  'communities.searchSkip': 'skip, you can join one anytime.',
  'communities.findYours': 'find your community',
  'communities.joinShort': 'join',
  'communities.joinedTag': 'joined',
  // the "are you actually part of it?" stop — you should only ever join the
  // community you're really in. membership decides whose sky your pings light
  // up, never who a ping can reach (pings are global — MASTER-GUIDE §2.6).
  'communities.confirmTitle': 'are you actually at {name}?',
  'communities.confirmBody': 'your community is whose sky your pings light up. join the one you’re really in, not one you hope someone’s in — a ping reaches its person either way.',
  'communities.confirmYes': 'yes, i’m at {name}',
  'communities.confirmNo': 'not really',
  // the pings-page gateway
  'communities.yourCommunity': 'your community',
  'communities.gatewayNone': 'not in a community yet.',
  'communities.open2': 'open',

  // the reveal countdown + what it means. a community's sky lights its week all at
  // once, on a cadence — a live clock that makes the place feel alive and adds a
  // gentle deadline. the info sign explains the countdown, the requirements, and
  // exactly what lights up, so nothing about the mechanic is hidden.
  'reveal.week': 'this week’s sky lights in',
  'reveal.opens': 'the sky opens in',
  'reveal.now': 'lighting up now',
  'reveal.infoTitle': 'the countdown',
  'reveal.infoWhat': 'every sunday night the week’s matches light up across the sky at once — so the reveal is a shared moment, not a lonely refresh.',
  'reveal.infoReq': 'the sky opens for everyone at the same moment, when the countdown ends. matches only ever show at ten and up, so no single match can be reverse-guessed.',
  'reveal.infoReveals': 'what lights up: mutual matches this week, the most-said reason, and every ping placed.',
  'reveal.close': 'got it',

  // your one community — made obvious and easy to reach. you can be in exactly one
  // (your ping only reaches people from it), and a .edu email is how you prove
  // you’re really there. everyone can watch; only members ping.
  'home.badge': 'your community',
  'home.in': 'you’re in {name}',
  'home.oneOnly': 'you can be in one community — the one you’re actually at.',
  'home.watch': 'you’re watching {name}. join, and your pings light up in this sky.',
  'home.locked': 'verify your school email to ping here.',
  'home.switchTitle': 'switch to {name}?',
  'home.switchBody': 'you’re in {current}. joining {name} leaves it — you can only be in the one you’re really at.',
  'home.switchYes': 'switch to {name}',
  'home.switchNo': 'stay in {current}',
  'home.locate': 'find your star',

  // ── holding the sky (the community page's camera) ────────────────────────────
  // the sky is handled, not watched: one whispered line of how, and the way home
  // from a held zoom. calm, mechanical — mono metadata voice.
  'sky.hint': 'drag to orbit · pinch to zoom · tap an @ to meet them',
  'sky.reset': 'pull back',

  // ── the dock (the app's three places, always one tap away) ──────────────────
  // quiet mono labels: the sky (your community's living galaxy), the communities
  // list, and your pings. the dock only shows on the resting hub screens.
  'nav.sky': 'sky',
  'nav.worlds': 'communities',
  'nav.pings': 'pings',

  // ── the public @ (announce yourself in your community's sky) ─────────────────
  // off by default: your star is anonymous. flipping it public rests your own @
  // above your own star — an announcement that you're here, never who you
  // pinged. the warning sheet is the one honest stop before it shows.
  'public.announce': 'announce your @',
  'public.on': 'your @ is public here',
  'public.title': 'show your @ in this sky?',
  'public.body': 'your handle will rest above your star in {name}’s sky, visible to anyone watching it. it says you’re here — nothing more.',
  'public.keeps': 'who you pinged stays sealed, exactly as before. going public never touches that.',
  'public.confirm': 'show my @',
  'public.cancel': 'keep it anonymous',
  'public.note': 'you can turn this off anytime, one tap, no questions.',
  'public.meet': 'find them on instagram',

  // ── the .edu gate (join a community by proving you’re at that school) ────────
  // membership is real — a code to your school address confirms you’re there —
  // because a community's sky should only be lit by people who are actually in
  // it. it never limits a ping's reach: pings are global (MASTER-GUIDE §2.6).
  // one community, one address. the sandbox auto-confirms so the shape is
  // playable.
  'edu.title': 'prove you’re at {name}.',
  'edu.sub': 'your {domain} address confirms you’re really here, so this sky only fills with people who are. your pings land in it as stars — and they still reach anyone, at {name} or not.',
  'edu.emailLabel': 'your school email',
  'edu.emailPlaceholder': 'you@{domain}',
  'edu.send': 'send my code',
  'edu.sending': 'sending…',
  'edu.codeLabel': 'the four-digit code',
  'edu.codeSent': 'sent to {email}. it lasts ten minutes.',
  'edu.verify': 'verify & join',
  'edu.verifying': 'verifying…',
  'edu.resend': 'send a new code',
  'edu.resent': 'a fresh code is on its way.',
  'edu.verified': 'verified. you’re in {name}.',
  'edu.change': 'use a different email',
  'edu.cancel': 'cancel',
  'edu.errDomain': 'use your {domain} address, so we can confirm you’re at {name}.',
  'edu.errEmail': 'that doesn’t look like a school email yet. check it.',
  'edu.errCode': 'that code didn’t match. check it, or send a new one.',
  'edu.errExpired': 'that code lapsed. send a fresh one.',
  'edu.errRate': 'too many tries. give it a minute, then start again.',
  'edu.errSend': 'the code didn’t go out. check the address, then try once more.',
  'edu.demoNote': 'sandbox. any address works, no real email is sent — enter any four digits and it confirms.',

  // ── affiliated schools (new-user onboarding step) ───────────────────────
  'schools.kicker': 'one more thing',
  'schools.title1': 'find your',
  'schools.title2': 'community.',
  'schools.sub': 'pick the one you’re actually at. your pings light up as stars in its sky — and they reach their person either way. don’t see yours? dm us and we add new ones by hand.',
  'schools.joined': 'joined',
  'schools.tapJoin': 'tap to join',
  'schools.cta': 'place your ping',
  'schools.ctaSkip': 'place my ping',
  'schools.foot': 'you can join or leave anytime.',

  // ── privacy & the opt-out (the public escape hatch) ─────────────────────
  'privacy.title': 'privacy, plainly',
  'privacy.h1': 'what we store',
  'privacy.p1': 'when you place a ping we store your handle, a salted one-way hash of theirs, and, if you leave one, your email. we cannot read who your pings point at, and neither can anyone who ever breaches us. we never post, message anyone, or alert the person you entered.',
  'privacy.h2': 'what anyone ever learns',
  'privacy.p2': 'one-sided pings are revealed to no one, ever. the only thing that ever surfaces is a mutual pair, shown to exactly those two people, at the same moment. there is no browsing, no profiles, no list.',
  'privacy.h3': 'the sixty days',
  'privacy.p3': 'a ping stands for sixty days. renew it free, as often as you feel it, or let it lapse, and the record is purged. unresolved feelings don’t accumulate here.',
  'privacy.h4': 'for adults',
  'privacy.p4': 'celestual is for people 18 and older.',
  'privacy.h5': 'the opt-out',
  'privacy.p5': 'any handle owner, on celestual or not, can make their handle permanently un-pingable and erase everything referencing it. this is free, immediate, and never behind a login.',
  'privacy.removePlaceholder': 'handle.to.remove',
  'privacy.removeCta': 'opt this handle out, permanently',
  'privacy.removing': 'closing the door…',
  'privacy.removed1': 'done.',
  'privacy.removed2': 'is now un-pingable, and everything referencing it is gone.',
  'privacy.removeErr': 'that didn’t go through. email us and we’ll do it by hand.',
  'privacy.h6': 'always free',
  'privacy.p6': 'placing, matching, the reveal, renewing, letting go, the opt-out, verification, the five lines, your door, your worlds, campus preregistration. all of it, forever. celestual holds nothing back for money.',
  'privacy.foot': 'this page stays current as the product grows. questions:',
  'privacy.fullPolicy': 'full privacy policy',
  'privacy.tos': 'terms of service',
  'privacy.deleteData': 'how to delete your data',

  // ── the send-off (the @ becomes a star and flies into the galaxy) ──────────
  'sendoff.title': 'sending it into the dark.',
  'sendoff.sub': 'your ping is finding its place.',

  // ── /copy — where the verification email's copy button lands ────────────
  'copy.kicker': 'your code',
  'copy.note': 'copy it, then go back to celestual and paste it in.',
  'copy.cta': 'copy the code',
  'copy.copied': 'copied. now paste it in.',
  'copy.missing': 'this link is missing its code. open the email again and tap copy there.',

  // ── /signin — the sign-back-in magic link redeems here (Fix B) ───────────
  'signin.working': 'signing you back in…',
  'signin.errTitle': 'this link has lapsed.',
  'signin.errBody': 'a sign-in link lasts twenty minutes and works once. start again and we’ll send a fresh one.',
  'signin.errCta': 'sign back in',
  'signin.missing': 'this link is missing its token. open the email again and tap the button there.',

  // ── demo (the sandbox) ────────────────────────────────────────────────────
  'demo.badge': 'sandbox',
  'demo.note': 'nothing here is real, and nothing reaches a server.',
  'demo.worlds': 'your communities',
}

export const DICTS = { en }
