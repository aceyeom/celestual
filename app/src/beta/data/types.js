// The adapter contract. Both the mock and the Supabase implementation satisfy
// exactly this, which is the whole point of writing it down: the screens import
// `repo` and never learn which one they got, so switching the beta from a
// zero-backend demo to a live wall is one environment variable and no diff in
// any screen.
//
// This project is JavaScript, not TypeScript — there is no tsconfig, no
// typecheck step and no TS anywhere in app/src — so the contract is JSDoc.
// Editors type-check it the same way; the build does not gain a toolchain it
// did not have before a beta asked for one.

/**
 * A letter, as the CLIENT is allowed to see it.
 *
 * Note what is NOT here, and note that it is not an oversight: `authorHandle`
 * and `sealedLine`. They are not fields on this type, they are not columns on
 * the view the client queries, and they are not omitted at render time. The
 * only way a sealed line reaches a browser is `unlockSeal`, which is a
 * server-side check that returns that one field and nothing else. The author's
 * handle has no path to a browser at all, ever, by any call in this interface.
 *
 * @typedef {Object} Letter
 * @property {string}  id
 * @property {string}  targetHandle  normalized: lowercase, no '@'
 * @property {string}  body          <= 280 chars, public
 * @property {boolean} hasSeal       whether a seal exists — never what it says
 * @property {string}  createdAt     ISO
 * @property {string}  expiresAt     ISO
 */

/**
 * @typedef {Object} NewLetter
 * @property {string}  targetHandle
 * @property {string}  body
 * @property {string} [sealedLine]
 * @property {string}  authorHandle
 * @property {string} [sourceCode]
 */

/**
 * @typedef {Object} WallRepo
 * @property {(sourceCode: string) => Promise<void>}                      logScan
 * @property {(handle: string) => Promise<Letter[]>}                      findByHandle
 * @property {(id: string) => Promise<Letter|null>}                       getLetter
 * @property {(input: NewLetter) => Promise<{id: string, status: 'pending'|'rejected', reason?: string}>} createLetter
 * @property {(handle: string, sourceCode?: string) => Promise<void>}     joinWaitlist
 * @property {(handle: string) => Promise<{challengeId: string}>}         startVerification
 * @property {(challengeId: string, code: string) => Promise<{ok: boolean}>} confirmVerification
 * @property {(letterId: string, handle: string) => Promise<void>}        claimLetter
 * @property {(letterId: string) => Promise<{status: 'pending'}>}         requestReveal
 * @property {(letterId: string) => Promise<{sealedLine: string}>}        unlockSeal
 * @property {(letterId: string, handle: string) => Promise<void>}        removeLetter
 * @property {() => Promise<number>}                                      liveCount
 */

export {}
