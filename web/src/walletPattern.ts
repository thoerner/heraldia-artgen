type Theme = "dark" | "light";

interface PatternParams {
  hue: number;
  hue2: number;
  type: number;
  tileSize: number;
  offset: number;
}

function parseAddress(address: string): PatternParams {
  const hex = address.replace(/^0x/i, "");
  const bytes = Array.from({ length: 20 }, (_, i) =>
    parseInt(hex.slice(i * 2, i * 2 + 2), 16),
  );

  const hue = ((bytes[0] << 8) | bytes[1]) % 360;
  const type = bytes[2] % 4;
  const tileSize = 30 + (bytes[3] % 31); // 30–60
  const offset = bytes[4] % tileSize;
  const hue2 = ((bytes[5] << 8) | bytes[6]) % 360;

  return { hue, hue2, type, tileSize, offset };
}

function dots(p: PatternParams, opacity: number): string {
  const { hue, hue2, tileSize, offset } = p;
  const r = Math.max(1.5, tileSize * 0.07);
  const cx = tileSize / 2;
  const cy = tileSize / 2;
  const ox = offset % (tileSize / 2);
  const oy = (offset * 3) % (tileSize / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${hue},55%,55%)" opacity="${opacity}"/>` +
    `<circle cx="${ox}" cy="${oy}" r="${r * 0.7}" fill="hsl(${hue2},45%,50%)" opacity="${opacity * 0.7}"/>` +
    `</svg>`;
}

function diagonals(p: PatternParams, opacity: number): string {
  const { hue, tileSize } = p;
  const sw = Math.max(0.8, tileSize * 0.04);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}">` +
    `<line x1="0" y1="${tileSize}" x2="${tileSize}" y2="0" ` +
    `stroke="hsl(${hue},50%,55%)" stroke-width="${sw}" opacity="${opacity}"/>` +
    `</svg>`;
}

function crosses(p: PatternParams, opacity: number): string {
  const { hue, hue2, tileSize } = p;
  const cx = tileSize / 2;
  const cy = tileSize / 2;
  const arm = Math.max(2, tileSize * 0.12);
  const sw = Math.max(0.8, tileSize * 0.04);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}">` +
    `<line x1="${cx - arm}" y1="${cy}" x2="${cx + arm}" y2="${cy}" ` +
    `stroke="hsl(${hue},50%,55%)" stroke-width="${sw}" opacity="${opacity}"/>` +
    `<line x1="${cx}" y1="${cy - arm}" x2="${cx}" y2="${cy + arm}" ` +
    `stroke="hsl(${hue2},45%,50%)" stroke-width="${sw}" opacity="${opacity * 0.8}"/>` +
    `</svg>`;
}

function diamonds(p: PatternParams, opacity: number): string {
  const { hue, tileSize, offset } = p;
  const cx = tileSize / 2;
  const cy = tileSize / 2;
  const s = Math.max(2.5, tileSize * 0.14);
  const rot = (offset * 7) % 45;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}">` +
    `<polygon points="${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}" ` +
    `fill="hsl(${hue},50%,55%)" opacity="${opacity}" ` +
    `transform="rotate(${rot},${cx},${cy})"/>` +
    `</svg>`;
}

const PATTERN_FNS = [dots, diagonals, crosses, diamonds];

export function generateWalletPattern(address: string, theme: Theme): string {
  const params = parseAddress(address);
  const opacity = theme === "dark" ? 0.045 : 0.055;
  const svgString = PATTERN_FNS[params.type](params, opacity);
  const encoded = encodeURIComponent(svgString);
  return `url("data:image/svg+xml,${encoded}")`;
}
