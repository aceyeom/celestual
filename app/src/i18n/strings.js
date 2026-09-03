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
  // Short, because the line it sits on is now set at the size of the question
  // above it and "their instagram handle" ran off the end of a phone at that
  // size. The @ is already printed in front of the field, so the word instagram
  // was the field naming its own format twice.
  'who.placeholder': 'their handle',
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

  // ── the handle resolver (docs/HANDLE-RESOLVER.md) ──────────────────────
  // The line under every field where an @ is typed. Three states, three lines,
  // and the second one is the one that matters: NOT FOUND IS NOT A REFUSAL.
  // Our lookup is imperfect, Instagram refuses us often enough to matter, and
  // somebody who knows their friend's handle is right is right. So the copy is
  // a fact about our own looking, never a verdict on a person, and the act
  // goes through either way.
  'resolve.looking': 'looking',
  'resolve.missing': 'no instagram account under that name. you can still place it.',
  // The send screen's second tap, when we found nobody. It replaces the
  // spelling prompt rather than stacking under it: one line under a field, and
  // it says what pressing again will do.
  'who.confirmUnknown': 'we couldn’t find that account. tap again to place it anyway.',

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
  'placed.share': 'share your invite link',
  'placed.shared': 'link copied',
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
  // ── the clock ─────────────────────────────────────────────────────────────
  // Days left. That is the whole readout.
  //
  // A row used to carry the countdown AND the date it ran out on AND the word
  // "lapses", which is three ways of saying one number and a word nobody uses
  // about a person they are thinking about. The date came off; a countdown is
  // already a date, arrived at by the only arithmetic anybody does with one.
  'pings.days': '{n} days left',
  'pings.today': 'last day',
  // A ping the server counts and this device has not named yet. The restore
  // runs on its own now (App.jsx readLedger), so this is the half second before
  // the @ lands, and the pre-0010 rows whose target survives only as a hash.
  // It says what the row IS. It never names a device, because which phone typed
  // a ping is not a fact about the ping.
  'pings.unnamed': 'a ping under your @',
  'pings.heldRestoring': 'reading…',
  'pings.slotsUsed': '{used} of {cap}',
  'pings.slotEmpty': 'open slot',
  'pings.slotNext': 'a third slot',
  'pings.slotNextSub': 'from $2.99',
  'pings.expiringSoon': '{n} days left',
  // ── renewing ──────────────────────────────────────────────────────────────
  // What it does sits ON the action, in three words, and that is the whole of
  // it. The sentence that used to sit under the ledger saying renewing is free
  // and takes no slot is gone: it was a paragraph at the foot of the page
  // restating what the action already says, and everything below it — a match,
  // most of all — was pushed under the fold to make room for it.
  'pings.renew': 'renew',
  'pings.renewSub': 'sixty more days',
  'pings.renewing': 'renewing…',
  'pings.renewed': 'renewed. sixty more days.',
  // ── when the next slot opens ──────────────────────────────────────────────
  'pings.nextSlot': 'your next slot opens in {n} days',
  'pings.nextSlotToday': 'your next slot opens today',
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
  'fourth.opens': 'your next slot opens in {n} days.',
  'fourth.opensSoon': 'your next slot opens today.',
  'fourth.cta': 'let one go',
  'fourth.back': 'not now',

  // the slot checkout — SANDBOX ONLY. production keeps one door ("let one go")
  // until monetization wakes (docs/PRICING-REVENUE.md).
  'paywall.kicker': 'a third ping',
  'paywall.extendKicker': 'extend a ping',
  'paywall.title': 'hold a third.',
  'paywall.extendTitle': 'keep it going.',
  'paywall.sub': 'when a third person is really on your mind, hold them too.',
  'paywall.extendSub': 'give it another sixty days.',
  'paywall.onceLabel': 'one more ping',
  'paywall.onceExtendLabel': 'keep it going',
  'paywall.onceDetail': 'one time, never a subscription.',
  'paywall.subLabel': 'go steady',
  'paywall.subDetail': 'ten pings a month. six months each.',
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
  'paywall.doneSubSub': 'ten pings a month, six months each.',
  'paywall.doneTitleExtend': 'it’s going.',
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
  'paid.planSub': 'six months each.',
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
  // `verify.assumed` — "you're in." — stood here for the twenty-second grace
  // (0017), which admitted the typed @ with no DM when the relay was dropping
  // them. It was the one line in the product that had to hedge, because the
  // identity behind it was assumed rather than proven. The grace is gone (0026)
  // and so is the hedge: the only way through is now the real one, so the only
  // thing left to say is `verify.verified` — "it's really you."
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
  // The reconciliation line, and it no longer names a device. The restore runs
  // on its own; what this counts is what is still unnamed after it has.
  'account.pingsElsewhere': '{n} not named here yet',
  'account.pingsRestore': 'read again',
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

  // the community finder

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

  // ── the index ────────────────────────────────────────────────────────────
  // Four routes. It replaced a two-station dock, a profile chip in one corner, a
  // "log in" chip in the same corner on other screens, and a scattering of ghost
  // links — four navigations, none of them aligned to anything, which between
  // them still could not reach half the product.
  //
  // It is four LINES and nothing else: no numbers, no notes, no heading, no
  // colophon. A product with four places does not need them numbered, and every
  // word that used to sit around an entry was the index describing itself.
  'index.pings': 'pings',
  'index.account': 'account',
  'index.login': 'log in',
  'index.legal': 'terms & privacy',

  // ── the public @ (announce yourself in your community's sky) ─────────────────

  // ── the .edu gate ────────────────────────────────────────────────────────

  // ── privacy & the opt-out ───────────────────────────────────────────────
  'privacy.title': 'privacy, plainly',
  'privacy.h1': 'what we store',
  'privacy.p1': 'when you place a ping we store your handle, a salted one-way hash of theirs, and, if you leave one, your email. we cannot read who your pings point at, and neither can anyone who ever breaches us. we never post, message anyone, or alert the person you entered.',
  'privacy.h2': 'what anyone ever learns',
  'privacy.p2': 'one-sided pings are revealed to no one, ever. the only thing that surfaces is a mutual pair, shown to exactly those two people, at the same moment. there is no browsing, no profiles, no list.',
  'privacy.h3': 'the sixty days',
  'privacy.p3': 'a ping lasts sixty days. renewing restarts the sixty days, free, as often as you feel it, and it never uses a slot. leave it and the record is purged and the slot opens back up.',
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

  // the triage tool (0018). "their codes are correct and nothing works" was
  // unanswerable from this desk — a suppressed @ looked identical to a relay
  // outage from every surface we had.

  // ── demo (the sandbox) ────────────────────────────────────────────────────
}

export const DICTS = { en }
