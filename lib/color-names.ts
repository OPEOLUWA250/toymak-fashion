// Shades for colour names common in shapewear and lingerie that browsers
// don't know, or know as a different shade (CSS "tan" is far too pale for
// a skin-tone product, for example).
const fashionShades: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  nude: "#E8C9A0",
  tan: "#D4A574",
  caramel: "#C9956F",
  brown: "#6F4E37",
  grey: "#808080",
  gray: "#808080",
  navy: "#1B2A4A",
  red: "#C62828",
  pink: "#E8A0BF",
  beige: "#D9C2A3",
  cream: "#F3E9D2",
  ivory: "#F7F2E4",
  champagne: "#E9D3B4",
  latte: "#C8A27C",
  mocha: "#8A6A55",
  cocoa: "#6B4A3A",
  coffee: "#6F4E37",
  espresso: "#4B3329",
  cinnamon: "#A0633A",
  honey: "#C98E43",
  almond: "#E5CBA8",
  sand: "#D8C3A0",
  taupe: "#8B7765",
  mink: "#8A7568",
  skin: "#E0B896",
  blush: "#E7B5B0",
  "dusty pink": "#D4A1A1",
  "baby pink": "#F4C2C2",
  "hot pink": "#E0218A",
  rose: "#D9888F",
  "rose gold": "#B76E79",
  mauve: "#B784A7",
  lilac: "#C8A2C8",
  burgundy: "#800020",
  wine: "#722F37",
  maroon: "#7B1E2B",
  plum: "#6E2E5C",
  "emerald green": "#046307",
  emerald: "#046307",
  "olive green": "#556B2F",
  khaki: "#B5A57A",
  mint: "#A8D8B9",
  "sky blue": "#87CEEB",
  "baby blue": "#A7C7E7",
  "royal blue": "#2350A8",
  charcoal: "#36454F",
  silver: "#C0C0C0",
  gold: "#C9A227",
  leopard: "#B8860B",
};

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** Asks the browser whether it knows a CSS colour name; null if it doesn't. */
function cssShade(name: string): string | null {
  if (typeof document === "undefined") return null;
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return null;
  // Two different starting colours, so a name the browser rejects (which
  // leaves fillStyle unchanged) can't be mistaken for a real match.
  context.fillStyle = "#000001";
  context.fillStyle = name;
  const first = context.fillStyle;
  context.fillStyle = "#000002";
  context.fillStyle = name;
  if (context.fillStyle !== first || !/^#[0-9a-f]{6}$/i.test(first)) return null;
  return first.toUpperCase();
}

function lookup(name: string): string | null {
  if (!name) return null;
  if (fashionShades[name]) return fashionShades[name];
  // Only letters: CSS would also accept "#123" or "rgb(…)", which aren't names.
  if (!/^[a-z ]+$/.test(name)) return null;
  return cssShade(name.replace(/ /g, ""));
}

/**
 * Best-guess shade for a colour name, e.g. "Mocha" or "Dark Olive Green".
 * Tries the whole name, then shorter endings ("Chocolate Brown" → "Brown"),
 * since the last word is usually the base colour. Null when nothing matches.
 */
export function shadeForColorName(rawName: string): string | null {
  const words = normalize(rawName).split(" ").filter(Boolean);
  for (let start = 0; start < words.length; start++) {
    const shade = lookup(words.slice(start).join(" "));
    if (shade) return shade;
  }
  return null;
}
