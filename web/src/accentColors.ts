/**
 * All distinct accent colors observed in on-chain Heraldia palettes,
 * sorted by hue. Derived from probe data across 255 palettes.
 */
export const ACCENT_COLORS: readonly string[] = [
  "#cd3131", "#d24646", "#7f7f7f", "#8c8c8c", "#353535", "#803c3c",
  "#914444", "#424242", "#7c5454", "#8b5f5f", "#4f4f4f", "#de2d16",
  "#e93b24", "#ea3e26", "#a35f47", "#91553f", "#f4bda8", "#f2ac91",
  "#fc6124", "#fb4d08", "#fb5f21", "#ec8a63", "#7d5339", "#8f5f41",
  "#ce9363", "#d4a177", "#8c7963", "#7d6c58", "#e69e41", "#e3932a",
  "#a59d91", "#9a9183", "#9a968d", "#b49e64", "#ffbd0a", "#efaf00",
  "#8e8a7f", "#ac9452", "#d6bb5b", "#dbc470", "#f9e985", "#f8e56c",
  "#a9a264", "#b2ac74", "#d6df24", "#c4cd1d", "#b8bea1", "#c3c8b0",
  "#97c661", "#8abf4e", "#57a649", "#4d9441", "#588d7f", "#3a5e55",
  "#a9c0bb", "#9ab6b0", "#0a5b4c", "#084439", "#3ac4b6", "#34b0a4",
  "#3dd5d5", "#52dada", "#6e9fa4", "#609399", "#00b2d6", "#5d9db6",
  "#6ea7be", "#6c98b1", "#5b8ca8", "#5689ad", "#4c7c9e", "#0f3960",
  "#0c2c4a", "#134676", "#217ace", "#2060a0", "#11283f", "#297acb",
  "#3373b6", "#173453", "#042757", "#0c68e8", "#05316f", "#073c87",
  "#476ca3", "#5178b2", "#242ee9", "#1620de", "#7440c9", "#6834ba",
  "#7141a4", "#321d48", "#574464", "#654e73", "#9931cd", "#8a2cb8",
  "#f35af6", "#f572f7", "#f78af8", "#c43aa4", "#b03493", "#e32a68",
  "#d81c5b", "#cf2023", "#dd2b2e",
] as const;

export function extractColorsFromSvg(svg: string): string[] {
  const matches = svg.matchAll(/#([0-9a-fA-F]{6})\b/g);
  return [...new Set([...matches].map((m) => "#" + m[1].toLowerCase()))].sort();
}
