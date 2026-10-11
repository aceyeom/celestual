# the third reel: the photographs

The film draws its photographs into the panel's cells from
`app/src/studio/assets/reel3/` on the studio branch (added by
`studio.patch`). They are never shown as photographs. Each is sampled once
per LCD cell, quantised to eight levels and lit by the panel
(`parts/reel3-photo.js`), so a swap is a file drop and a render.

| file | where | what it needs to be |
| --- | --- | --- |
| `dance.jpg` | the cover of Owen's playlist in the group chat (22 by 22 cells), then the player's whole art at the end (140 by 140) | two people against a bright sky, their raised hands joined, a light source (the sun) between them; strong silhouettes survive the cells best. The square crop is set in `reel3-time.js` `PHOTOS.dance`, chosen so the sun lands on the cell where the lockup's star appears |
| `roses.jpg` | the limbo at nine, in grey cells, a hand reaching and roses held out; the bouquet's cells turn rose first when it is mutual | two hands, or a hand and a held thing, reaching and not touching; the bouquet mask is made from its colour (`PHOTOS.roses.bouquet`) |
| `sea.jpg` | not used in this cut (dropped in review: full-frame it read as a photograph of the two of them) | |

The photographs now are about 1,050 to 1,200 px wide. Larger originals
(2,000 px and up) would give the 140-cell art a finer tone.

They were supplied for the brief. Unless they were taken for the campaign,
the film needs their photographers' permission before it is posted.
