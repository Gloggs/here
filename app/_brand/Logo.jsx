// The Here. logo. The wordmark is Inter Display Bold converted to outlines, so it
// looks identical everywhere without depending on a loaded font. The same artwork
// lives in public/brand/*.svg for use outside the app.

const INK = "#262220";
const PAPER = "#F7F1F0";
const CLAY = "#A15C38";
const WORD = "M111 1490H419V862H1052V1490H1359V0H1052V598H419V0H111Z M2057 1514C2313 1514 2517 1368 2556 1158H2287C2260 1240 2181 1293 2066 1293C1911 1293 1821 1192 1816 1036H2567V957C2567 635 2358 410 2047 410C1744 410 1529 641 1529 963C1529 1284 1737 1514 2057 1514ZM1818 848C1834 716 1921 634 2053 634C2186 634 2274 716 2289 848Z M2725 1490H3020V918C3020 759 3109 675 3230 675C3280 675 3335 679 3357 680V429C3333 428 3304 427 3270 427C3131 427 3051 487 3012 614H3009V434H2725Z M3971 1514C4227 1514 4431 1368 4470 1158H4201C4174 1240 4095 1293 3980 1293C3825 1293 3735 1192 3730 1036H4481V957C4481 635 4272 410 3961 410C3658 410 3443 641 3443 963C3443 1284 3651 1514 3971 1514ZM3732 848C3748 716 3835 634 3967 634C4100 634 4188 716 4203 848Z";

function Mark({ onDark }) {
  return (
    <>
      <rect width="64" height="64" fill={onDark ? PAPER : INK} />
      <path d="M38 12 L24 52" stroke={onDark ? INK : PAPER} strokeWidth="7" strokeLinecap="square" fill="none" />
      <rect x="44" y="45" width="8" height="8" fill={CLAY} />
    </>
  );
}

/** The square mark on its own: app icons, small spaces, the hero background. */
export function LogoMark({ size = 32, onDark = false, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : "true"} focusable="false">
      <Mark onDark={onDark} />
    </svg>
  );
}

/** Mark and wordmark together. `height` sets the size; the width follows. */
export default function Logo({ height = 32, onDark = false, title = "Here." }) {
  return (
    <svg className="b-logo" height={height} viewBox="0 0 192.84 64" role="img" aria-label={title} focusable="false">
      <Mark onDark={onDark} />
      <g transform="translate(80 15) scale(0.022819)"><path fill={onDark ? PAPER : INK} d={WORD} /></g>
      <rect x="185.99" y="42.15" width="6.85" height="6.85" fill={CLAY} />
    </svg>
  );
}
