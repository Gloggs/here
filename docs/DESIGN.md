# Design guide

Here. follows the structure of the Guild UK brand guide: a black and white skeleton first, with a small palette and two typefaces on top. Check every screen against this page before it ships.

## Brand

- **Name:** Here. It is what a pupil says when their name is called. Always written with the full stop.
- **Mark:** the present mark from a paper register (/) in an ink square, with a small clay square for the full stop.
- **Files:** `public/brand/here-logo.svg` (for light backgrounds), `here-logo-light.svg` (for dark backgrounds), `here-mark.svg`, `here-mark-light.svg` and `here-wordmark.svg`. In the app, always use the `Logo` or `LogoMark` component from `app/_brand/Logo.jsx`, which draws the same artwork.
- **On dark grounds** the square turns paper and the slash turns ink.
- The mark is never stretched, outlined, rotated or recoloured, apart from the faint copy behind the landing page hero.

## Colours (Vête palette)

| Name | Hex | Use |
| --- | --- | --- |
| Ink | `#262220` | Text, header bands, present marks |
| Paper | `#F7F1F0` | Page background |
| White | `#FFFFFF` | Panels and tables |
| Rose | `#C3A6A0` | Late marks, quiet text on ink |
| Clay | `#A15C38` | Absent marks, flags, anything under 90%, the full stop in the logo |
| Stone | `#6B5F5B` | Dates, labels, captions |
| Line | `#E6DAD7` | Dividers and borders |

Clay is never used for words on a light background. It marks things instead. Present, late and absent differ in lightness as well as colour (dark, light, mid), so they still read in greyscale or when printed.

## Type

One typeface everywhere: **Inter**.

- Headings and big numbers: Inter Bold with slightly tight letter spacing.
- Everything else: Inter Regular to Semibold. Numbers in tables and totals use tabular figures so columns line up.
- Form inputs are 16px so phones do not zoom in.
- The wordmark in the logo is Inter Display Bold turned into outlines, so it looks the same everywhere.

## Layout

- Sharp corners. No pill buttons.
- Thin 1px lines. No coloured stripes down the side of cards.
- No shadows, glows or gradients.
- No badges or labels sitting above a heading.
- Tap targets are at least 44px.
- Phones get four tabs: Today, Classes, Reports and More.

## Motion

Motion is allowed only when it tells you something happened.

| Where | What | Time |
| --- | --- | --- |
| Buttons and marks | Shrink slightly when pressed | 120ms |
| Register row | Reasons panel drops in | 180ms |
| Dialogs | Rise in, or slide up as a sheet on phones | 220 to 280ms |
| Progress bars | Grow to the new value | 400ms |
| Landing hero | The faint brand mark drifts | 26s loop |

Hover changes are instant, with no fades, and only apply to a mouse or trackpad. Everything stops when the device asks for reduced motion.

## Register codes

The app uses the marks from paper registers in English schools: `/` present, `L` late, and for absences `I` illness, `M` medical appointment, `H` holiday and `N` no reason yet.

## Behaviour that stays the same everywhere

- Adding students always opens the same "Add students" dialog, which takes a pasted list.
- Every student list uses the same row: initials, name, class, and an arrow to the profile.
- Anything that deletes data asks first in the app's own dialog, never a browser pop-up.
- Every page title shows in the browser tab as "Page | Here.".
- On phones, pages reached from More have a "← More" link back.

## First-time users

- A getting-started list on Today ticks itself off as people use the app, and always shows the next step.
- Finishing a register shows how long it took and offers the next class still to mark.
- Today shows a streak once registers have been taken two school days in a row.
- The landing page demo times the visitor, to back up the promise in the headline.

## Writing

- UK spelling.
- Short sentences and everyday words. Buttons say what happens: "Mark the other 10 present", "Download summary (CSV)".
- No long dashes, no exclamation marks, no buzzwords such as seamless, effortless or powerful.

## Things the design avoids on purpose

These are the marks of templated interfaces, so none of them appear: coloured accent lines under headings or numbers, thick coloured left or top borders on cards, count badges beside headings, underline bars on active tabs and navigation, pill buttons, gradients, shadows and fading hovers. The active page is shown by weight and a filled background instead.
