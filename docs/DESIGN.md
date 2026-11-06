# Design

here version 2 (November 2026). This page explains the thinking behind the app, not just the look: the job it does, the frameworks used to decide what goes where, and how each decision is checked. Check every change against it before it ships.

## The job

> When a session starts, I want to know who is here in seconds, so I can start teaching and know who to check on.

That sentence is a **Jobs to be Done** job statement. It decides what is core and what is extra:

| Core: on the main screens | Extra: one tap away, in Class tools or Settings |
| --- | --- |
| Taking the register | Points and a weekly goal |
| Who to check on (below 90%, absences with no reason) | Tasks |
| Every register for today | Name picker, random groups, timer |
| Reports to hand over | Music or a video |
| | Class settings, connected apps, help |

Nothing was deleted to make the app simpler. The extras moved one tap away (progressive disclosure, below).

Who it is for: people who run classes outside a school's own systems, such as supplementary and Saturday schools, faith classes, tuition centres, youth and community groups, and adult learning. They usually have paper or a spreadsheet, and no system that notices someone drifting away.

## The frameworks

| Framework | What it decides here | Where it shows |
| --- | --- | --- |
| Jobs to be Done | What is core and what is extra | Today opens on the next register; extras live in Class tools |
| Keystroke-Level Model | Whether the register is really fast | A speed budget enforced by a test (below) |
| Progressive disclosure | Simple without losing features | Four class tabs; one plain list of tools, each with one sentence saying what it does |
| Nielsen's 10 usability heuristics | The review checklist | The review table (below) |
| WCAG 2.2 AA | Access for everyone | Automatic axe checks on every main screen, light and dark |
| Guild UK Skeleton v2 | The look | Colours, type, shapes and motion (below) |

## Speed budget (Keystroke-Level Model)

The Keystroke-Level Model (Card, Moran and Newell, 1980) estimates how long a task takes from the steps it needs. With the usual touch values (point and tap about 1.3 seconds, a moment to decide about 1.35 seconds, a scroll about the same as a tap), taking a register of 12 with one late arrival from Today is:

| | Steps from Today | Estimate |
| --- | --- | --- |
| Version 1 | Scroll past the checklist and search, tap Take register, tap Late, tap Mark the others present | about 10.6 seconds |
| Version 2 | Tap Take the register (first thing on the screen), tap Late, tap Mark the others present | about 8 seconds |

These are model estimates, not timings of real people. The test `a register takes three taps from Today` fails if a change adds a tap, so the budget cannot slip without a decision.

## The first time, and help after that

- A four-step guide shows **once ever** for each account (stored in `user_flags`, so a new phone does not show it again). Skip, Back and Next; no tour arrows or spotlights.
- After that, help lives in **Settings > Help**: the same four steps and "Show the guide again". There are no permanent tip boxes or checklists on the working screens.

## No signal

Many halls and community centres have poor reception, so the register works offline:

- A service worker (Serwist) keeps the app, the pages and the three answers the register needs: classes, the day's marks and the overview. Nothing else from the API is stored.
- Marks taken with no signal wait on the phone (IndexedDB through `idb`), one per student per day, and are sent in order when the signal returns. If you tap twice offline, only your last tap is sent.
- A plain bar says what is happening: "No signal. 12 marks are saved on this phone and will be sent when you are back online", then "12 saved marks sent."
- Signing out, or ending the demo, deletes everything kept on the device.

## Usability review (Nielsen's 10 heuristics)

| Heuristic | Version 1 | Version 2 |
| --- | --- | --- |
| Visibility of system status | Every tap saved; no word on what happens offline | Saves as you tap; the no-signal bar counts what is waiting; the stamp says when a register is finished |
| Match with the real world | Paper register codes | Same codes, now in the guide |
| User control and freedom | Undo after marking the rest | Same, plus offline taps that can be changed before they are sent |
| Consistency and standards | Mixed outlined and filled boxes | One system: filled panels, flat buttons, underlined links |
| Error prevention | Days ahead cannot be marked | Same; failed offline sends are reported, not lost silently |
| Recognition rather than recall | Six class tabs | Four tabs; each tool says what it is for |
| Flexibility and efficiency | Keyboard shortcuts, search | Same, and a three-tap register |
| Aesthetic and minimalist design | Checklist, tip box, apps panel and music button on the working screens | Removed from the working screens; one main action per screen |
| Help users recover from errors | Plain error messages | Same, plus a no-signal page that says what still works |
| Help and documentation | A help page few found | A guide once, then Settings > Help |

This review is a judgement, made on 6 November 2026 against the screens in the pull request. Real users may disagree, and their feedback wins.

## The look (Guild UK Skeleton v2)

- **Colours** come from the Guild Design kit tokens: white ground, ink `#142019` text, forest `#174131` for headers and the main action, soft green `#E0F0E7` for panels and secondary buttons, amber `#8A5300` for absences and anything below 90%. Coral `#F39380` is rare: focus on forest, and the stamp. Dark mode uses the kit's agreed dark tokens, never colours chosen by eye.
- **Type:** DM Sans everywhere, served from the app itself. Headings weight 500 with tight tracking. Inputs 16px so phones do not zoom.
- **Shapes:** square corners, filled panels instead of outlined boxes, flat filled buttons, plain underlined links. Lines only for tables, form fields and the register's mark buttons.
- **The stamp:** the Guild UK octagon with a coral tick, shown only when a register is finished. It lands once (400ms) and is still under reduced motion.
- **Icon:** the Guild UK stamp's octagon with here's own symbol, the register slash and a coral dot (`app/icon.svg`; `scripts/make-images.mjs` renders the app icon and share image from it).
- **Absent, late and present** differ in lightness as well as colour, so they read in greyscale and in print.

### What the design avoids on purpose

Labels above headings, small spaced capitals, decorative numbering, arrows on links and buttons, outlined boxes, gradients, shadows, glows, fading hovers, rows of identical icon cards, invented reviews or numbers.

## Register codes

The marks from paper registers: `/` present, `L` late, and for absences `I` illness, `M` medical appointment, `H` holiday and `N` no reason yet.

## Writing

UK spelling, short sentences, everyday words. Buttons say what happens: "Take the register", "Mark the other 11 present", "Show the guide again". No long dashes, no exclamation marks, no buzzwords.

## Built on

here is built with, and owes a lot to, these open source projects: Next.js, React, Drizzle ORM, Neon's serverless driver, Kinde (sign-in), next-themes, Lucide icons, Sonner (messages), Serwist (the service worker), idb by Jake Archibald (IndexedDB), Playwright (end-to-end tests), axe-core by Deque (accessibility checks), and DM Sans (SIL Open Font Licence). The look comes from the Guild Design kit (github.com/guilduk/design).
