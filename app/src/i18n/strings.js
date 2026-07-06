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
  // the hero names the feeling; the mechanic types out one beat at a time, the
  // first two lines held together before the payoff enters (§4.1).
  'landing.head1': 'you still think about them.',
  'landing.head2': 'what if they think about you?',
  // the hero beats: put their @ in → they’ll never know → unless they put you in
  'landing.type1': 'put their @ in.',
  'landing.type2': 'they’ll never know.',
  'landing.type3': 'unless they put you in too.',
  'landing.cta': 'find out',
  'landing.safety': 'no profiles. no browsing. nothing happens unless it’s mutual.',
  'landing.login': 'log in',
  'footer.privacy': 'privacy',
  'footer.terms': 'terms',
  'footer.optout': 'opt out',
  'landing.age': 'for adults. continuing means you’re 18+ and accept the',
  'landing.terms': 'terms',

  // ── screen 2 · the send ────────────────────────────────────────────────
  'who.kicker': 'who is it?',
  'who.from': 'you',
  'who.placeholder': 'their.handle',
  'who.note': 'no alert. no trace. invisible until they enter you back.',
  'who.confirm1': 'placing a ping on',
  'who.confirm2': '— spelled right? tap again to place.',
  'who.cta': 'place it',
  'who.ctaConfirm': 'yes — place it',
  'who.errInvalid': 'not a real instagram handle yet. check the spelling.',
  'who.errSelf': 'that’s you. name the other person.',
  'who.errRate': 'too fast. the pace is part of the design — give it a moment.',
  'who.errSuppressed': 'that person asked never to be entered. the door is closed.',
  'who.errGeneric': 'the night didn’t answer. give it a moment, then place it again.',
  'who.errUnverified': 'we couldn’t confirm the @ is yours. verify again and it’ll place.',
  'who.demoHint': 'sandbox: enter @demo and the match will find you.',

  // the intent row — an optional line that travels with the ping, read only at
  // a mutual reveal. the guide's exact five (§4.5); never free-text, never
  // required. addressed to "you" (the target), so each reads under either "they
  // said" or "you said".
  'intent.label': 'why them?',
  'intent.optional': 'optional',
  'intent.note': 'travels with the ping. read only if it’s mutual.',
  'intent.unsaid': 'i never got to say something',
  'intent.unsaid.r': 'i never got to say something',
  'intent.think': 'i think about you',
  'intent.think.r': 'i think about you',
  'intent.again': 'i want to try again',
  'intent.again.r': 'i want to try again',
  'intent.clear': 'i want to clear the air',
  'intent.clear.r': 'i want to clear the air',
  'intent.miss': 'i miss you',
  'intent.miss.r': 'i miss you',

  // the slot line under the field — scarcity is the sincerity mechanism
  'slots.holding': 'holding {n} of {cap}',
  'slots.free': '{n} of {cap} open',

  // ── the identity step (so the ping can resolve to you) ─────────────────
  'you.title1': 'now,',
  'you.title2': 'this is you.',
  'you.handle': 'your.handle',
  'you.handleNote': 'your instagram @ — so the ping can resolve to you.',
  // the 18+ hard gate (§4.4). one tap; nothing about age is ever stored — we
  // keep whether, not when.
  'you.ageLabel': 'one thing first',
  'you.ageConfirm': 'i’m 18 or older',
  'you.ageConfirmed': 'confirmed — 18 or older',
  'you.ageNote': 'for adults. tap to confirm — nothing is stored.',
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

  // ── screen 3 · placed (the recruiter screen) ───────────────────────────
  'placed.standingTitle': 'your ping is live.',
  'placed.standingSub': '@{handle} is on celestual. the second they add you back, you both know. until then, nothing shows.',
  'placed.waitingTitle': 'saved for when they join.',
  'placed.waitingSub': '@{handle} isn’t here yet. your ping waits until they arrive — and they’ll never know it was you.',
  'placed.howTitle': 'how people do it',
  'placed.how1': 'post your door — it says nothing but that you’re reachable',
  'placed.howWorld': 'grow your community: {name}',
  'placed.how3': 'or wait. this is spreading on its own.',
  'placed.door': 'post your door',
  'placed.pings': 'your pings',

  // ── screen 4 · your pings (the status page) ────────────────────────────
  'pings.kicker': 'your pings',
  'pings.emptyTitle': 'no pings yet.',
  'pings.emptyBody': 'three slots, sixty days each. for the people who actually stayed on your mind.',
  'pings.emptyCta': 'place your first',
  // the three ping states, in plain words read at a glance
  'pings.standing': 'active',
  'pings.standingSub': '',
  'pings.waiting': 'not here yet',
  'pings.waitingSub': 'waits, unseen, until they join.',
  'pings.mutual': 'mutual',
  'pings.mutualSub': 'you both entered each other.',
  'pings.mutualKicker': 'mutual',
  'pings.days': '{n} days left',
  'pings.today': 'lapses today',
  'pings.elsewhere': 'placed on another device',
  'pings.elsewhereNote': 'we can’t see who these point at — the names live only on the device that placed them.',
  // the slot picture: used vs. open, and the empty-slot placeholder card
  'pings.slotsUsed': '{used} of {cap} slots',
  'pings.slotEmpty': 'open slot',
  'pings.slotEmptySub': 'tap to place a ping',
  // renew / let go — plain words, no jargon
  'pings.expiringSoon': 'lapses in {n} days',
  'pings.renew': 'renew',
  'pings.renewed': 'renewed — sixty more days.',
  'pings.letgo': 'let go',
  'pings.letgoConfirm': 'remove this ping? the slot opens back up, and nothing was ever shown.',
  'pings.letgoYes': 'remove',
  'pings.keep': 'keep',
  'pings.add': 'place another',
  'pings.door': 'post your door',
  'pings.open': 'message them',
  'pings.worlds': 'communities',
  'pings.sim': 'sandbox: they add you back',

  // ── screen 5 · the open-door card ───────────────────────────────────────
  'door.kicker': 'your door',
  'door.line': 'if there’s something you never said to me, it’s safe here now.',
  'door.sub': 'it says only that you’re reachable — and puts whoever taps through two taps from telling you.',
  'door.save': 'save the card',
  'door.saved': 'saved — now post it',
  'door.copy': 'copy your link',
  'door.copied': 'copied',
  'door.step1': 'save the card to your camera roll.',
  'door.step2': 'add it to your story.',
  'door.step3': 'paste your link as the link sticker.',
  'door.foot': 'nothing on the card, or behind it, ever says who you’ve entered — or that you have.',

  // the personal landing — celestual.us/@handle
  'open.reach': 'reachable on celestual',
  'open.line': 'if there’s something you never said to them, there’s a safe place to say it.',
  'open.mech': 'they only find out if they enter you too — then you both do, at once.',
  'open.cta': 'find out',
  'open.else': 'someone else on your mind? enter anyone.',

  // ── screen 8 · the match ────────────────────────────────────────────────
  'match.title': 'it’s mutual.',
  'match.sub': 'you entered @{them}. @{them} entered you.',
  'match.theySaid': 'they said',
  'match.youSaid': 'you said',
  'match.cta': 'go say it',
  'match.exit': 'the rest is yours. celestual’s part is done.',

  // ── screen 9 · the fourth slot ──────────────────────────────────────────
  'fourth.title': 'your slots are full.',
  'fourth.body': 'three is the point — each one costs something. let one go and the slot’s yours again.',
  'fourth.cta': 'let one go',
  'fourth.back': 'not now',

  // the fourth-slot checkout — SANDBOX ONLY. production keeps one door ("let one
  // go") until monetization wakes (docs/PRICING-REVENUE.md); the sandbox previews
  // the one-time fourth slot behind a real-looking checkout so the shape is
  // visible. one-time, never a subscription. no banned paywall words.
  'paywall.kicker': 'a fourth slot',
  'paywall.title': 'hold a fourth.',
  'paywall.sub': 'when a fourth person is really on your mind, hold them too. one time — never a subscription.',
  'paywall.price': '$3.99',
  'paywall.priceUnit': 'once',
  'paywall.cardLabel': 'card',
  'paywall.cardNumber': '1234 1234 1234 1234',
  'paywall.expiry': 'MM / YY',
  'paywall.cvc': 'CVC',
  'paywall.zip': 'ZIP',
  'paywall.pay': 'pay {price}',
  'paywall.paying': 'confirming…',
  'paywall.secure': 'secure checkout',
  'paywall.stripe': 'powered by stripe',
  'paywall.demoNote': 'sandbox — a mock checkout. no card is read, nothing is charged, nothing is saved.',
  'paywall.doneTitle': 'you’re holding four.',
  'paywall.doneSub': 'the fourth slot is yours. place it whenever the feeling’s ready.',
  'paywall.donePlace': 'place the fourth',
  'paywall.letgo': 'or let one go — free, always',
  'paywall.back': 'not now',

  // ── verify (instagram dm handle-ownership) ──────────────────────────────
  'verify.title': 'prove it’s your @',
  'verify.sub': 'dm a one-time code to our instagram; we confirm the @ is yours. no password, no oauth, nobody told.',
  'verify.code': 'your code',
  'verify.copyOpen': 'copy & open instagram',
  'verify.copied': 'copied — now send it',
  'verify.step1': 'tap below — we copy the code and open instagram.',
  'verify.step2': 'send it to {ig} as a dm.',
  'verify.step3': 'come back here — it confirms on its own.',
  'verify.waiting': 'waiting for your dm…',
  'verify.verified': 'verified — it’s really you.',
  'verify.verifiedSub': 'carrying on…',
  'verify.expiredTitle': 'that code lapsed.',
  'verify.expiredBody': 'codes last a few minutes, for safety. take a fresh one.',
  'verify.regen': 'get a new code',
  'verify.errRate': 'too many tries. give it a minute, then start again.',
  'verify.errBusy': 'the line is busy — try again in a moment.',
  'verify.errGeneric': 'the verification couldn’t start. check your connection, then try once more.',
  'verify.cancel': 'cancel',
  'verify.demoNote': 'sandbox — no dm needed. this confirms on its own in a moment.',
  'verify.tosNote': 'we only read who sends the code. we never post, follow, message, or see your password.',
  'verify.inApp': 'inside instagram’s browser? send the dm, then return to this tab — or open celestual.us in safari or chrome.',
  'verify.desktop': 'not signed in to instagram there? log in inside that window first, then tap the button again.',
  'verify.youHint': 'next, a quick dm confirms it’s yours. nobody is told.',
  'verify.youDone': 'verified — this @ is yours.',
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
  'account.sandboxNote': 'sandbox — nothing here is real, and nothing reaches a server.',
  'account.signOut': 'sign out',
  'account.delete': 'delete everything',
  'account.deleteConfirm': 'this erases every ping you’ve placed, closes your door, and blocks your own handle from being entered. it can’t be undone.',
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
  // never depends on one. each climbs toward a team-set threshold (shown as a
  // ring); at the threshold it opens and its weekly readout goes live. NOTE: the
  // ring's own center label and the sandbox live-feed copy are intentionally
  // literal and live in communities.js / demoData.js, out of this linted file.
  'communities.kicker': 'communities',
  'communities.intro': 'official launch spaces, opening one campus at a time.',
  'communities.foot': 'curated by celestual. more schools soon.',
  'communities.open': 'open',
  'communities.gathering': 'gathering',
  'communities.none': 'no community here.',
  'communities.thisWeek': 'this week',
  'communities.matchedLabel': 'matched this week',
  'communities.matchFloor': 'matches show at ten and up — so no match can be guessed at.',
  'communities.reasonLabel': 'most said',
  'communities.pings': '{n} pings placed',
  'communities.joinedWeek': '+{n} joined',
  'communities.gatheringBody': 'the more people in, the sooner it opens. what opens:',
  'communities.lock1': 'mutual matches this week',
  'communities.lock2': 'the most common reason',
  'communities.lock3': 'pings placed',
  'communities.join': 'join {name}',
  'communities.leave': 'leave this community',
  'communities.place': 'place a ping',
  'communities.demoActivity': 'sandbox: new activity',
  'communities.label': 'your communities',
  'communities.browse': 'browse',
  'communities.summaryNone': 'you haven’t joined one yet.',

  // ── affiliated schools (new-user onboarding step) ───────────────────────
  'schools.kicker': 'one more thing',
  'schools.title1': 'your',
  'schools.title2': 'campus?',
  'schools.sub': 'join the ones you’re in — it makes the silence less lonely. optional.',
  'schools.joined': 'joined',
  'schools.tapJoin': 'tap to join',
  'schools.cta': 'place your ping',
  'schools.foot': 'you can join or leave anytime.',

  // ── privacy & the opt-out (the public escape hatch) ─────────────────────
  'privacy.title': 'privacy, plainly',
  'privacy.h1': 'what we store',
  'privacy.p1': 'when you place a ping we store your handle, a salted one-way hash of theirs, and — if you leave one — your email. we cannot read who your pings point at, and neither can anyone who ever breaches us. we never post, message anyone, or alert the person you entered.',
  'privacy.h2': 'what anyone ever learns',
  'privacy.p2': 'one-sided pings are revealed to no one, ever. the only thing that ever surfaces is a mutual pair — to exactly those two people, at the same moment. there is no browsing, no profiles, no list.',
  'privacy.h3': 'the sixty days',
  'privacy.p3': 'a ping stands for sixty days. renew it free, as often as you feel it — or let it lapse, and the record is purged. unresolved feelings don’t accumulate here.',
  'privacy.h4': 'for adults',
  'privacy.p4': 'celestual is for people 18 and older.',
  'privacy.h5': 'the opt-out',
  'privacy.p5': 'any handle owner — on celestual or not — can make their handle permanently un-pingable and erase everything referencing it. this is free, immediate, and never behind a login.',
  'privacy.removePlaceholder': 'handle.to.remove',
  'privacy.removeCta': 'opt this handle out, permanently',
  'privacy.removing': 'closing the door…',
  'privacy.removed1': 'done.',
  'privacy.removed2': 'is now un-pingable, and everything referencing it is gone.',
  'privacy.removeErr': 'that didn’t go through — email us and we’ll do it by hand.',
  'privacy.h6': 'always free',
  'privacy.p6': 'placing, matching, the reveal, renewing, letting go, the opt-out, verification, the five lines, your door, your worlds, campus preregistration. all of it, forever. celestual holds nothing back for money.',
  'privacy.foot': 'this page stays current as the product grows. questions:',
  'privacy.fullPolicy': 'full privacy policy',
  'privacy.tos': 'terms of service',
  'privacy.deleteData': 'how to delete your data',

  // ── the send-off (the @ becomes a star and flies into the galaxy) ──────────
  'sendoff.title': 'sending it into the dark.',
  'sendoff.sub': 'your ping is finding its place.',

  // ── demo (the sandbox) ────────────────────────────────────────────────────
  'demo.badge': 'sandbox',
  'demo.note': 'nothing here is real, and nothing reaches a server.',
  'demo.worlds': 'your communities',
}

export const DICTS = { en }
