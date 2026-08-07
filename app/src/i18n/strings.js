// strings.js — CELESTUAL's canonical copy.
//
// The register is docs/VOICE.md: lowercase, quiet, adult, certain — the 2am
// message, never the carnival. Say less; trust the reader; let a state, a
// number or a chip carry what a sentence would only repeat. Every sentence
// shown to any user must be literally true, always
// (docs/ULTIMATE-PRODUCT-FRAMEWORK.md §6.2: truth is the entire legal and
// ethical margin).
//
// TWO RULES THIS FILE IS HELD TO, enforced by scripts/voice-lint.mjs:
//
//   1. NO DASHES. Not em, not en. A dash is a writer stalling: it welds two
//      thoughts together instead of choosing one. Use a full stop, or cut the
//      second half. (The comments in this repo may use them; the copy may not.)
//   2. NOTHING EXPLAINS THE UI. If a field needs a paragraph under it saying
//      what it does, the field is wrong. Every key removed in this pass was a
//      note under a control, and the control is clearer without it.
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
  'landing.head1': 'someone’s on your mind.',
  'landing.head2': 'are you on theirs?',
  // the promise under the headline, typed as two lines with a held breath
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
  'who.title1': 'who’s',
  'who.title2': 'on your mind?',
  'who.fromLabel': 'from',
  'who.placeholder': 'their instagram handle',
  'who.note': 'no alert. no trace. invisible until they enter you back.',
  'who.confirm1': 'placing a ping on',
  'who.confirm2': 'spelled right? tap again to place.',
  'who.cta': 'place it',
  'who.ctaConfirm': 'yes, place it',
  'who.errInvalid': 'not a real instagram handle yet. check the spelling.',
  'who.errSelf': 'that’s you. name the other person.',
  'who.errRate': 'too fast. give it a moment.',
  'who.errSuppressed': 'that person asked never to be entered. the door is closed.',
  'who.errGeneric': 'the night didn’t answer. give it a moment, then place it again.',
  'who.errUnverified': 'we couldn’t confirm the @ is yours. verify again and it’ll place.',
  'who.demoHint': 'sandbox: enter @demo and the match will find you.',

  // ── the card (docs/STAR-CARDS.md) ──────────────────────────────────────
  // The category tabs and the sixteen "why them" lines are gone. A ping carries
  // a card the person wrote, and the composer's own copy lives with it (it is
  // one surface and one locale, so it is written inline in card/Composer.jsx
  // and card/model.js; the voice lint reads those files too).

  // the slot line under the field — scarcity is the sincerity mechanism
  'slots.holding': 'holding {n} of {cap}',
  'slots.free': '{n} of {cap} open',

  // ── the identity step ──────────────────────────────────────────────────
  // ONE field, ONE button. The server decides what happens next (migration
  // 0015), so nothing here explains a choice and nothing is written in the
  // conditional. What used to live in this block and is now gone: a note about
  // what an instagram @ is for, a note about what an email is for, a note about
  // what the age tap does, a note explaining the difference between a sign-in
  // link and a dm, and a "check your email" that began with the word "if".
  'you.title1': 'now,',
  'you.title2': 'this is you.',
  'you.handle': 'your.handle',
  'you.continue': 'continue',
  'you.checking': 'checking…',
  'you.unknown': 'new here. set it up below.',
  'you.ageConfirm': 'i’m 18 or older',
  'you.ageConfirmed': 'confirmed, 18 or older',
  'you.emailLabel': 'your email',
  'you.email': 'you@school.edu',
  'you.loginTitle1': 'welcome',
  'you.loginTitle2': 'back.',
  'you.linkDm': 'use a dm instead',
  'you.linkSentTitle': 'check your email.',
  // the address is real and named, because the server told us it sent there
  'you.linkSentNote': 'a sign-in link is on its way to {to}. it lasts twenty minutes.',
  'you.linkResend': 'send again',

  // ── screen 3 · placed (the recruiter screen) ───────────────────────────
  // the growth-narrative copy for a joined community lives in growth.js,
  // deliberately out of this linted file. these are the quiet fallbacks and the
  // shared labels.
  'placed.standingTitle': 'your ping is live.',
  'placed.standingSub': 'the second they ping you back, you both know. until then, nothing shows.',
  'placed.waitingHead': 'isn’t on celestual yet.',
  'placed.waitingSub': 'your ping is held, unseen, until they arrive. they’ll never know it was you.',
  'placed.reachableHead': 'is already on celestual.',
  'placed.joinTitle': 'one more thing.',
  'placed.joinReachable': 'now pick your community, so your ping has a sky to light when the countdown ends.',
  'placed.joinWaiting': 'celestual works when your world is here. pick your community and bring it in.',
  'placed.findComm': 'find your community',
  'placed.share': 'share your invite link',
  'placed.shared': 'link copied',
  'placed.door': 'share the open sky',
  'placed.pings': 'your pings',

  // ── screen 4 · your pings (the status page) ────────────────────────────
  'pings.kicker': 'your pings',
  'pings.emptyTitle': 'no pings yet.',
  'pings.emptyBody': 'two slots, sixty days each.',
  'pings.emptyCta': 'place your first',
  'pings.standing': 'active',
  'pings.standingSub': '',
  'pings.waiting': 'not here yet',
  'pings.waitingSub': '',
  'pings.mutual': 'mutual',
  'pings.mutualSub': '',
  'pings.mutualKicker': 'mutual',
  // the sealed mutual slot, and the slot once it has been opened
  'pings.sealedTitle': 'it’s mutual.',
  'pings.sealedSub': 'you and @{them} entered each other. open it.',
  'pings.revealOpen': 'open the reveal with @{them}',
  'pings.revealAgain': 'see the two cards again',
  'pings.days': '{n} days left',
  'pings.today': 'lapses today',
  // every standing row prints the date it lapses, because that date is also the
  // date its slot comes back, and both facts were being kept from the reader
  'pings.standsUntil': 'stands until {date}',
  'pings.elsewhere': 'placed on another device',
  'pings.elsewhereNote': 'the names live only on the device that placed them.',
  // a slot the meter counts and this device cannot name yet. it is a real
  // standing ping under your @, held somewhere else.
  'pings.heldTitle': 'held on another device',
  'pings.heldSub': 'a ping standing under your @. it keeps its own sixty days.',
  'pings.heldRestore': 'bring my pings here',
  'pings.heldRestoring': 'reading your pings…',
  'pings.heldFailed': 'that read did not go through. try once more.',
  'pings.slotsUsed': '{used} of {cap} slots',
  'pings.slotEmpty': 'open slot',
  'pings.slotEmptySub': 'tap to place a ping',
  'pings.slotNext': 'a third slot',
  'pings.slotNextSub': 'from $2.99',
  'pings.expiringSoon': 'lapses in {n} days',
  // ── renewing, said plainly ────────────────────────────────────────────────
  // what it does, what it costs, and what it does not take. the whole confusion
  // was that a renew button sitting between a slot meter and a paywall reads as
  // something that might spend one of the two.
  'pings.renew': 'renew',
  'pings.renewSub': 'sixty more days',
  'pings.renewing': 'renewing…',
  'pings.renewed': 'renewed. stands until {date}.',
  'pings.renewNote': 'renewing is free, as often as you feel it. it restarts the sixty days and takes no slot.',
  // ── when the next slot opens ──────────────────────────────────────────────
  'pings.nextSlot': 'your next slot opens {date}',
  'pings.nextSlotDays': 'in {n} days, when the ping on @{handle} lapses.',
  'pings.nextSlotDaysAnon': 'in {n} days, when your soonest ping lapses.',
  'pings.nextSlotToday': 'today, when the ping on @{handle} lapses.',
  'pings.nextSlotTodayAnon': 'today, when your soonest ping lapses.',
  'pings.nextSlotOr': 'or let one go now.',
  'pings.letgo': 'let go',
  'pings.letgoConfirm': 'remove this ping? the slot opens back up.',
  'pings.letgoYes': 'remove',
  'pings.keep': 'keep',
  'pings.add': 'place another',
  'pings.door': 'share the open sky',
  'pings.open': 'message them',
  'pings.locate': 'see it in the sky',
  'pings.sim': 'sandbox: they add you back',

  // ── screen 5 · the open-sky share card ──────────────────────────────────
  'sky.kicker': 'your community',
  'sky.title1': 'share the',
  'sky.title2': 'open sky.',
  'sky.subOpen': 'this card is your community’s real sky, alive. everyone who joins from it brings the next match closer.',
  'sky.subGathering': 'when the countdown ends, {name}’s sky opens for everyone at once.',
  'sky.story': 'post it to your story',
  'sky.dm': 'send it in a dm',
  'sky.copy': 'copy the invite link',
  'sky.copied': 'copied',
  'sky.cardLine': '{name}’s sky',
  'sky.cardOpen': 'is open.',
  'sky.cardGathering': 'is gathering.',
  'sky.statInside': 'souls inside',
  'sky.statPings': 'secrets in orbit',
  'sky.statMatches': 'found each other',
  'sky.statOpens': 'until it opens',
  'sky.foot': 'the card names a place, never a person.',
  'sky.none': 'join your community first, then you can share its sky.',
  'sky.find': 'find your community',

  // the personal landing — celestual.us/@handle
  'open.reach': 'reachable on celestual',
  'open.line': 'if there’s something you never said to them, there’s a safe place to say it.',
  'open.mech': 'they only find out if they enter you too. then you both do, at once.',
  'open.cta': 'find out',
  'open.else': 'someone else on your mind?',

  // ── screen 8 · the match ────────────────────────────────────────────────
  'match.title': 'it’s mutual.',
  'match.sub': 'you entered @{them}. @{them} entered you.',

  // ── screen 9 · the third slot (route key stays 'fourth') ────────────────
  'fourth.title': 'your slots are full.',
  'fourth.body': 'each one costs something. let one go, and the slot’s yours again.',
  // the wall now carries its own clock. a slot you have to wait for is scarcity.
  // a slot you cannot see the date of is just a locked door.
  'fourth.opens': 'your next slot opens {date}.',
  'fourth.opensSoon': 'your next slot opens today.',
  'fourth.cta': 'let one go',
  'fourth.back': 'not now',

  // the slot checkout — SANDBOX ONLY. production keeps one door ("let one go")
  // until monetization wakes (docs/PRICING-REVENUE.md).
  'paywall.kicker': 'a third ping',
  'paywall.extendKicker': 'extend a ping',
  'paywall.title': 'hold a third.',
  'paywall.extendTitle': 'keep it standing.',
  'paywall.sub': 'when a third person is really on your mind, hold them too.',
  'paywall.extendSub': 'give it another sixty days.',
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
  'paywall.cardNumber': '1234 1234 1234 1234',
  'paywall.expiry': 'MM / YY',
  'paywall.cvc': 'CVC',
  'paywall.zip': 'ZIP',
  'paywall.pay': 'pay {price}',
  'paywall.paySub': 'subscribe, {price} a month',
  'paywall.paying': 'confirming…',
  'paywall.secure': 'secure checkout',
  'paywall.stripe': 'powered by stripe',
  'paywall.demoNote': 'sandbox. no card is read, nothing is charged.',
  'paywall.doneTitleOnce': 'one more, held.',
  'paywall.doneSubOnce': 'the slot is yours.',
  'paywall.doneTitleSub': 'you’re subscribed.',
  'paywall.doneSubSub': 'ten pings a month, each standing six months.',
  'paywall.doneTitleExtend': 'it’s standing.',
  'paywall.doneSubExtend': 'another sixty days, held.',
  'paywall.donePlace': 'place it',
  'paywall.doneBack': 'back to your pings',
  'paywall.letgo': 'or let one go, free, always',

  // ── the paid door · PRODUCTION (only with VITE_STRIPE_ENABLED=1) ─────────
  // Screen 9's second door. It sits BESIDE the free one ("let one go"), never in
  // front of it, and it only ever appears to someone already holding their free
  // two (docs/PRICING-REVENUE.md §3, runbook docs/STRIPE-SETUP.md). The two
  // amounts live at paywall.price / paywall.subPrice so the sandbox preview, the
  // real door and the Stripe dashboard have one number each to agree on.
  'hold.slot': 'or hold a third for {price}, once',
  'hold.plan': 'or ten a month, {price}',
  'hold.opening': 'opening a secure page…',
  'hold.note': 'stripe takes the payment. no card reaches us.',
  'hold.err': 'that didn’t open. nothing was charged.',
  'hold.errCap': 'you’re holding all ten already.',
  'hold.errPlan': 'the ten a month already covers this.',
  'hold.errVerify': 'prove your @ again, then this door opens.',

  // coming back from stripe — celestual.us/paid
  'paid.kicker': 'the slot',
  'paid.confirming': 'confirming…',
  'paid.title': 'one more, held.',
  'paid.sub': 'the slot is yours.',
  'paid.planTitle': 'ten, held.',
  'paid.planSub': 'each one stands six months.',
  'paid.place': 'place it',
  'paid.back': 'back to your pings',
  'paid.cancelTitle': 'nothing was charged.',
  'paid.cancelSub': 'you can let one go instead. free, always.',
  'paid.slowTitle': 'it’s still landing.',
  'paid.slowSub': 'if the payment went through, the slot arrives on its own. nothing to do.',

  // ── verify (instagram dm handle-ownership) ──────────────────────────────
  'verify.title': 'prove it’s your @',
  'verify.sub': 'dm this code to our instagram. no password, no oauth, nobody told.',
  'verify.code': 'your code',
  'verify.copyOpen': 'copy & open instagram',
  'verify.copied': 'copied. now send it',
  'verify.step1': 'tap above. we copy the code and open instagram.',
  'verify.step2': 'send it to {ig}.',
  'verify.step3': 'come back. it confirms on its own.',
  'verify.waiting': 'waiting for your dm…',
  'verify.stuckHint': 'sent it and nothing happened?',
  'verify.stuckAction': 'get a fresh code',
  'verify.verified': 'verified. it’s really you.',
  'verify.verifiedSub': 'carrying on…',
  'verify.expiredTitle': 'that code lapsed.',
  'verify.expiredBody': 'codes last about half an hour. take a fresh one.',
  'verify.regen': 'get a new code',
  'verify.confirmTitle': 'one quick check.',
  'verify.confirmBody': 'that code came from @{handle}. sign in as @{handle}?',
  'verify.confirmYes': 'yes, sign in as @{handle}',
  'verify.confirmNo': 'no, use another account',
  // the 20-second grace (migration 0017): the DM path failed us, so past the
  // window the person is let in as the @ they typed. the line stays honest.
  // "you're in", never "it's really you".
  'verify.assumed': 'you’re in.',
  // the ban (0018 named it; 0020 made a ban the ONLY thing that reaches here).
  // this used to render as "that code lapsed" twenty seconds in: a live code,
  // described as a dead one, with a button that minted another dead one. no
  // retry here, because a fresh code cannot open a closed door.
  'verify.errBlocked': 'this @ can’t be verified on celestual. if that’s a mistake, write to privacy@celestual.us and we’ll look at it.',
  'verify.errBlockedAction': 'close',
  'verify.errRate': 'too many tries. give it a minute, then start again.',
  'verify.errBusy': 'the line is busy. try again in a moment.',
  'verify.errGeneric': 'the verification couldn’t start. check your connection, then try once more.',
  'verify.cancel': 'cancel',
  'verify.demoNote': 'sandbox. no dm needed. this confirms on its own.',
  'verify.tosNote': 'we only read who sends the code. we never post, follow, or message.',
  'verify.inApp': 'inside instagram’s browser? send the dm, then return to this tab.',
  'verify.desktop': 'not signed in to instagram there? log in first, then tap again.',
  'verify.youDone': 'verified. this @ is yours.',
  'verify.continue': 'verify & continue',

  // ── account ──────────────────────────────────────────────────────────────
  'account.kicker': 'your account',
  'account.verified': 'verified by instagram dm',
  'account.localOnly': 'kept on this device',
  'account.handleLabel': 'your handle',
  'account.emailLabel': 'email',
  'account.emailOptional': 'optional',
  'account.pingsLine': '{n} active',
  'account.pingsNone': 'no pings yet.',
  'account.pingsOpen': 'view',
  'account.pingsElsewhere': '{n} held on another device',
  'account.pingsRestore': 'bring them here',
  'account.sandboxNote': 'sandbox. nothing here reaches a server.',
  'account.signOut': 'sign out',
  'account.delete': 'delete everything',
  // 0020 — this used to say "and blocks your handle", because it did: it called
  // the public opt-out on your own @, so tidying up your account barred it from
  // ever verifying again. two different decisions wearing one button. deleting
  // your data is housekeeping and says so; never being entered is its own
  // choice, on /privacy, made on purpose.
  'account.deleteConfirm': 'this erases every ping you’ve placed and every record of you. it can’t be undone.',
  'account.deleteKeep': 'your @ stays yours. you can come back and verify again any time.',
  'account.deleteOptOut': 'wanted the other thing? never let anyone enter your @ again.',
  'account.deleteOptOutLink': 'opt out instead',
  'account.deleteConfirmDemo': 'sandbox. this just starts the demo fresh.',
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
  // NOTE: the sandbox live-feed copy is intentionally literal and lives in
  // demoData.js, out of this linted file.
  'communities.kicker': 'communities',
  'communities.intro': 'everyone can ping from day one. when the countdown ends, every sky opens at once.',
  'communities.foot': 'curated by celestual. more schools soon.',
  'communities.open': 'open',
  'communities.gathering': 'gathering',
  'communities.skyOpen': 'the sky is open.',
  'communities.skyGathering': 'still gathering.',
  'communities.view': 'view the community',
  'communities.none': 'no community here.',
  'communities.thisWeek': 'this week',
  'communities.matchedLabel': 'matched this week',
  'communities.matchFloor': 'matches show at ten and up, so no match can be guessed at.',
  'communities.matchesSoon': 'matches show at ten',
  'communities.pings': '{n} pings placed',
  'communities.joinedWeek': '+{n} joined',
  'communities.join': 'join {name}',
  'communities.leave': 'leave',
  'communities.place': 'place a ping',
  'communities.matchedShort': 'matched',
  'communities.gatheringHero': 'a sky still forming.',
  'communities.gatheringBody2': 'everyone here can already ping. when the countdown ends, its stars come out.',
  'communities.demoWave': 'sandbox: send a wave of pings',
  'communities.demoGather': 'sandbox: bring people in',
  'communities.label': 'your communities',
  'communities.browse': 'browse',
  'communities.summaryNone': 'you haven’t joined one yet.',

  // the community finder
  'communities.searchPlaceholder': 'your school',
  'communities.searchNone': 'no match yet. more schools are on the way.',
  'communities.searchMore': 'switch',
  'communities.findYours': 'find your community',
  'communities.joinedTag': 'joined',
  'communities.yourCommunity': 'your community',

  // the reveal countdown
  'reveal.week': 'until this week lights',
  'reveal.opens': 'until the sky opens',
  'reveal.now': 'lighting up now',

  // your one community
  'home.badge': 'your community',
  'home.oneOnly': 'you can be in one community, the one you’re actually at.',
  'home.watch': 'join, and your pings light up in this sky.',
  'home.locate': 'find your star',

  // ── holding the sky (the community page's camera) ────────────────────────
  'sky.reset': 'pull back',

  // ── the dock ─────────────────────────────────────────────────────────────
  // TWO places, because this product has two. The old third station opened the
  // community list, which is a picker, not a destination: it now lives inside
  // the sky page where switching actually happens.
  'nav.sky': 'sky',
  'nav.pings': 'pings',

  // ── the public @ (announce yourself in your community's sky) ─────────────────
  'public.announce': 'announce your @',
  'public.on': 'your @ is public here',
  'public.title': 'show your @ in this sky?',
  'public.body': 'your handle will rest above your star in {name}’s sky. it says you’re here, nothing more.',
  'public.keeps': 'who you pinged stays sealed.',
  'public.confirm': 'show my @',
  'public.cancel': 'keep it anonymous',
  'public.note': 'you can turn this off anytime.',
  'public.meet': 'find them on instagram',

  // ── the .edu gate ────────────────────────────────────────────────────────
  'edu.title': 'prove you’re at {name}.',
  'edu.sub': 'a code goes to your {domain} address, so this sky only fills with people who are really here.',
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
  'edu.demoNote': 'sandbox. any address works, any four digits confirm.',

  // the old /recruit screen (comment → DM → agreement, migration 0016) is
  // gone: the program's front door is now the first light trial page, and its
  // copy lives under trial.* below. the counting RPCs live on unchanged.

  // ── privacy & the opt-out ───────────────────────────────────────────────
  'privacy.title': 'privacy, plainly',
  'privacy.h1': 'what we store',
  'privacy.p1': 'when you place a ping we store your handle, a salted one-way hash of theirs, and, if you leave one, your email. we cannot read who your pings point at, and neither can anyone who ever breaches us. we never post, message anyone, or alert the person you entered.',
  'privacy.h2': 'what anyone ever learns',
  'privacy.p2': 'one-sided pings are revealed to no one, ever. the only thing that surfaces is a mutual pair, shown to exactly those two people, at the same moment. there is no browsing, no profiles, no list.',
  'privacy.h3': 'the sixty days',
  'privacy.p3': 'a ping stands for sixty days. renewing restarts those sixty days, free and as often as you feel it, and it never uses a slot. let it lapse instead and the record is purged. the day a ping lapses is the day its slot opens back up, and your pings page says which day that is.',
  'privacy.h4': 'for adults',
  'privacy.p4': 'celestual is for people 18 and older.',
  'privacy.h5': 'the opt-out',
  'privacy.p5': 'any handle owner, on celestual or not, can make their handle un-pingable and erase everything referencing it. free, immediate, never behind a login.',
  // 0020 — the two doors, named. people were choosing one and getting the other.
  'privacy.p5b': 'this is not the same as deleting an account. it stops anyone entering your @, forever, whether or not you use celestual. it does not stop you signing up yourself, and we’ll lift it if you write to us.',
  'privacy.removePlaceholder': 'handle.to.remove',
  'privacy.removeCta': 'opt this handle out, permanently',
  'privacy.removing': 'closing the door…',
  'privacy.removed1': 'done.',
  'privacy.removed2': 'is now un-pingable, and everything referencing it is gone.',
  'privacy.removedLift': 'changed your mind? write to privacy@celestual.us and we’ll lift it.',
  'privacy.removeErr': 'that didn’t go through. email us and we’ll do it by hand.',
  'privacy.h6': 'always free',
  'privacy.p6': 'placing, matching, the reveal, renewing, letting go, the opt-out, verification, your door, your communities. all of it, forever.',
  'privacy.foot': 'questions:',
  'privacy.fullPolicy': 'full privacy policy',
  'privacy.tos': 'terms of service',
  'privacy.deleteData': 'how to delete your data',

  // ── the send-off ────────────────────────────────────────────────────────
  'sendoff.title': 'sending it into the dark.',
  'sendoff.sub': 'your ping is finding its place.',

  // ── /copy — where the verification email's copy button lands ────────────
  'copy.kicker': 'your code',
  'copy.note': 'copy it, then go back to celestual and paste it in.',
  'copy.cta': 'copy the code',
  'copy.copied': 'copied. now paste it in.',
  'copy.missing': 'this link is missing its code. open the email again and tap copy there.',

  // ── /signin — the sign-back-in magic link redeems here ──────────────────
  'signin.working': 'signing you back in…',
  'signin.errTitle': 'this link has lapsed.',
  'signin.errBody': 'a sign-in link lasts twenty minutes and works once. start again and we’ll send a fresh one.',
  'signin.errCta': 'sign back in',
  'signin.missing': 'this link is missing its token. open the email again and tap the button there.',

  // ── the first light trial (/trial, migration 0017) ──────────────────────
  // the page's chrome only. the brief itself is quoted from the official doc
  // and lives in trialContent.js, out of this linted file, like demoData.js.
  'trial.stepsLabel': 'how it works',
  'trial.closed': 'applications closed',
  'trial.docView': 'read the official doc',
  'trial.docPdf': 'pdf',
  'trial.docDocx': '.docx',
  'trial.docClose': 'close the doc',
  'trial.docDownload': 'download to sign (.docx)',
  'trial.registerKicker': 'register',
  'trial.enterKicker': 'enter the trial',
  'trial.enterTitle': 'claim your link.',
  'trial.nameLabel': 'your full name',
  'trial.namePlaceholder': 'your name',
  'trial.handleLabel': 'your instagram',
  'trial.emailLabel': 'your email',
  'trial.emailPlaceholder': 'you@example.com',
  'trial.choiceLabel': 'your four letters',
  // no note under this field. the link preview beside it IS the explanation.
  'trial.choiceFree': 'available',
  'trial.choiceTaken': 'taken. pick another.',
  'trial.choiceReserved': 'that one is ours. pick another.',
  'trial.choiceFormat': 'four letters, a to z.',
  'trial.agree': 'i agree to the content, ip and rights agreement in the official doc. signing records my name, my @, my email and the date.',
  'trial.register': 'verify my email',
  'trial.sending': 'sending…',
  'trial.codeTitle': 'check your email.',
  'trial.codeSent': 'a six-digit code went to {email}. it lasts fifteen minutes.',
  'trial.codeLabel': 'the six-digit code',
  'trial.confirm': 'confirm & claim my link',
  'trial.confirming': 'confirming…',
  'trial.resend': 'send a new code',
  'trial.back': 'change my details',
  'trial.errEmail': 'that doesn’t look like an email yet. check it.',
  'trial.errRate': 'too many tries. give it a minute, then start again.',
  'trial.errSend': 'the code didn’t go out. check the address, then try once more.',
  'trial.errCode': 'that code didn’t match. check it, or send a new one.',
  'trial.errExpired': 'that code lapsed. send a fresh one.',
  'trial.errName': 'we need your full name to record the signature.',
  'trial.errHandle': 'not a real instagram handle yet. check the spelling.',
  'trial.errHandleTaken': 'that @ already signed under another email.',
  'trial.errCodeTaken': 'those four letters are taken. pick another.',
  'trial.errBanned': 'that account can’t enter.',
  'trial.errAgree': 'the agreement needs your yes.',
  'trial.errUnknown': 'no entry under that email yet.',
  'trial.errGeneric': 'that didn’t go through. try once more.',
  'trial.welcomeBack': 'welcome back. your link stands.',
  'trial.accountKicker': 'your entry',
  'trial.accountTitle': 'your link is live.',
  'trial.linkLabel': 'your link',
  'trial.codeWord': 'your code',
  'trial.share': 'share it',
  'trial.copied': 'copied',
  'trial.statVisits': 'opens',
  'trial.statSignups': 'joined',
  'trial.week': 'the last seven days',
  'trial.sendReminder': 'send both videos to contact@celestual.app before the deadline.',
  'trial.signout': 'not you? switch account',
  'trial.loginKicker': 'already entered?',
  'trial.login': 'open my entry',
  'trial.toApp': 'go to celestual',

  // The landing's banner door to the trial (top right) carries the job ad's own
  // wording and its live countdown, both from trialContent.js. It is the doc's
  // voice, not the product's, so it is not keyed here.

  // the triage tool (0018). "their codes are correct and nothing works" was
  // unanswerable from this desk — a suppressed @ looked identical to a relay
  // outage from every surface we had.

  // ── demo (the sandbox) ────────────────────────────────────────────────────
  'demo.badge': 'sandbox',
  'demo.worlds': 'your communities',
}

export const DICTS = { en }
