export type PortfolioTileShape = "hero" | "portrait" | "square" | "wide";

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function portfolioTileShape(media: { height: number; id: string; width: number }): PortfolioTileShape {
  const ratio = media.width / media.height;
  const variation = stableHash(media.id) % 5;
  if (ratio >= 1.35) return variation === 0 ? "hero" : "wide";
  if (ratio <= 0.82) return "portrait";
  return variation === 0 ? "wide" : "square";
}
