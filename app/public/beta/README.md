# `app/public/beta/`

Drop a file named **`demo.jpg`** here and `/beta` will use it as the ground of
the first seeded card.

It goes through the same path a photograph a person takes goes through
(`app/src/beta/photo.js`): square-cropped from the center, resampled to 1024,
stopped down, EXIF stripped, and measured for tone. Any aspect ratio and any
size works; a low-light frame suits the sky best.

If the file is not here, that card falls back to a colour plate and nothing
breaks. Clear the sky to reseed: open `/beta`, then in the console

```js
localStorage.clear(); indexedDB.deleteDatabase('celestual-beta'); location.reload()
```
