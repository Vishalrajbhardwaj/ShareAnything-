# Character Avatar Images

App me har character ke liye ek image chahiye. Niche **exact file path** diya hai
jahan aapko image file rakhni hai. Image download karo (Pinterest/Google se, PNG/JPG/WebP/SVG)
aur us file ko is path par save karo — **file ka naam bilkul wahi hona chahiye** jo niche likha hai.

> **Ash TIPS:**
> - Image 256x256 (ya square) ho to best dikhegi.
> - Extension `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp` sab chalenge.
> - Agar aap `.webp` ya `.png` use karte ho to bas niche file ka `.svg` hissa badal kar
>   apne extension se replace kar dena. Code dono ko samjhta hai.
> - Currently har path `.svg` par point karta hai. Agar aap `.png` daalte ho to us
>   1 file ka path bhi `.png` karna hoga (server/lib/avatars.js + client/src/lib/avatars.js dono me).

---

## Marvel (Avengers) — folder: `client/public/avatars/marvel/`

| # | Character Name | File Path |
|---|----------------|-----------|
| 1 | Iron Man | `avatars/marvel/iron-man.svg` |
| 2 | Captain America | `avatars/marvel/captain-america.svg` |
| 3 | Thor | `avatars/marvel/thor.svg` |
| 4 | Hulk | `avatars/marvel/hulk.svg` |
| 5 | Black Widow | `avatars/marvel/black-widow.svg` |
| 6 | Hawkeye | `avatars/marvel/hawkeye.svg` |
| 7 | Spider-Man | `avatars/marvel/spider-man.svg` |
| 8 | Doctor Strange | `avatars/marvel/doctor-strange.svg` |
| 9 | Black Panther | `avatars/marvel/black-panther.svg` |
| 10 | Scarlet Witch | `avatars/marvel/scarlet-witch.svg` |
| 11 | Vision | `avatars/marvel/vision.svg` |
| 12 | Falcon | `avatars/marvel/falcon.svg` |
| 13 | Winter Soldier | `avatars/marvel/winter-soldier.svg` |
| 14 | War Machine | `avatars/marvel/war-machine.svg` |
| 15 | Ant-Man | `avatars/marvel/ant-man.svg` |
| 16 | Wasp | `avatars/marvel/wasp.svg` |
| 17 | Captain Marvel | `avatars/marvel/captain-marvel.svg` |
| 18 | Star-Lord | `avatars/marvel/star-lord.svg` |
| 19 | Loki | `avatars/marvel/loki.svg` |
| 20 | Deadpool | `avatars/marvel/deadpool.svg` |

## Harry Potter — folder: `client/public/avatars/harry-potter/`

| # | Character Name | File Path |
|---|----------------|-----------|
| 1 | Harry Potter | `avatars/harry-potter/harry-potter.svg` |
| 2 | Ron Weasley | `avatars/harry-potter/ron-weasley.svg` |
| 3 | Hermione Granger | `avatars/harry-potter/hermione-granger.svg` |
| 4 | Albus Dumbledore | `avatars/harry-potter/albus-dumbledore.svg` |
| 5 | Severus Snape | `avatars/harry-potter/severus-snape.svg` |
| 6 | Draco Malfoy | `avatars/harry-potter/draco-malfoy.svg` |
| 7 | Sirius Black | `avatars/harry-potter/sirius-black.svg` |
| 8 | Ginny Weasley | `avatars/harry-potter/ginny-weasley.svg` |
| 9 | Rubeus Hagrid | `avatars/harry-potter/rubeus-hagrid.svg` |
| 10 | Dobby | `avatars/harry-potter/dobby.svg` |

## Money Heist — folder: `client/public/avatars/money-heist/`

| # | Character Name | File Path |
|---|----------------|-----------|
| 1 | Professor | `avatars/money-heist/professor.svg` |
| 2 | Tokyo | `avatars/money-heist/tokyo.svg` |
| 3 | Berlin | `avatars/money-heist/berlin.svg` |
| 4 | Rio | `avatars/money-heist/rio.svg` |
| 5 | Nairobi | `avatars/money-heist/nairobi.svg` |
| 6 | Denver | `avatars/money-heist/denver.svg` |
| 7 | Helsinki | `avatars/money-heist/helsinki.svg` |
| 8 | Oslo | `avatars/money-heist/oslo.svg` |
| 9 | Lisbon | `avatars/money-heist/lisbon.svg` |
| 10 | Palermo | `avatars/money-heist/palermo.svg` |
| 11 | Bogotá | `avatars/money-heist/bogota.svg` |
| 12 | Stockholm | `avatars/money-heist/stockholm.svg` |

## Anime — folder: `client/public/avatars/anime/`

| # | Character Name | File Path |
|---|----------------|-----------|
| 1 | Naruto Uzumaki | `avatars/anime/naruto.svg` |
| 2 | Sasuke Uchiha | `avatars/anime/sasuke.svg` |
| 3 | Kakashi Hatake | `avatars/anime/kakashi.svg` |
| 4 | Itachi Uchiha | `avatars/anime/itachi.svg` |
| 5 | Monkey D. Luffy | `avatars/anime/luffy.svg` |
| 6 | Roronoa Zoro | `avatars/anime/zoro.svg` |
| 7 | Sanji | `avatars/anime/sanji.svg` |
| 8 | Levi Ackerman | `avatars/anime/levi.svg` |
| 9 | Eren Yeager | `avatars/anime/eren.svg` |
| 10 | Goku | `avatars/anime/goku.svg` |

---

## Kaise use karein (agar extension change karna ho)

Agar aap `.png` image daalte ho to 3 jagah path update karna hoga:

1. **File:** `client/public/avatars/marvel/iron-man.png` (image yahan save karo)
2. **`server/lib/avatars.js`** me `"Iron Man": "/avatars/marvel/iron-man.png"`
3. **`client/src/lib/avatars.js`** me `"Iron Man": "/avatars/marvel/iron-man.png"`

**Agar aapko kisi bhi image ko auto-copy karna ho to batao — main ek script bana dunga jo
aapke `Downloads` se sahi naam/position par copy kar de.**
