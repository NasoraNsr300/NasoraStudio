import type { HeroItem } from "@/shared/types/public-content";

/** Selects an enabled hero with its configured relative weight. */
export function selectHero(items: HeroItem[], randomValue: number): HeroItem {
  const enabledItems = items.filter((item) => item.enabled);
  if (enabledItems.length === 0) {
    throw new Error("selectHero requires at least one enabled hero");
  }

  const totalWeight = enabledItems.reduce(
    (total, item) => total + Math.max(0, item.selectionWeight),
    0,
  );
  if (totalWeight === 0) {
    return enabledItems[Math.min(enabledItems.length - 1, Math.floor(randomValue * enabledItems.length))];
  }

  const target = Math.min(Math.max(randomValue, 0), 0.999999999999) * totalWeight;
  let cumulativeWeight = 0;
  for (const item of enabledItems) {
    cumulativeWeight += Math.max(0, item.selectionWeight);
    if (target < cumulativeWeight) return item;
  }

  return enabledItems.at(-1)!;
}
