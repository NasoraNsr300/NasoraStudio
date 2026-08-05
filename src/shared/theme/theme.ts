export type ThemeName = "night" | "autumn";

export function resolveAutomaticTheme(hour: number): ThemeName {
  return hour >= 7 && hour < 18 ? "autumn" : "night";
}
