const themeScript = `(() => {
  const storageKey = "nasora-theme";
  const storedTheme = window.localStorage.getItem(storageKey);
  const theme = storedTheme === "night" || storedTheme === "autumn"
    ? storedTheme
    : new Date().getHours() >= 7 && new Date().getHours() < 18 ? "autumn" : "night";
  document.documentElement.dataset.theme = theme;

  const updateVisibility = () => {
    document.documentElement.dataset.documentHidden = String(document.hidden);
  };
  updateVisibility();
  document.addEventListener("visibilitychange", updateVisibility);
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
