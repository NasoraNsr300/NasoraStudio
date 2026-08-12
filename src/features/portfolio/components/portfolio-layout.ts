export type PortfolioTileWidth = "single" | "double";

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function portfolioTileWidth(media: { height: number; id: string; width: number }): PortfolioTileWidth {
  const ratio = media.width / media.height;
  if (ratio < 1.35) return "single";
  return stableHash(media.id) % 5 === 0 ? "single" : "double";
}
