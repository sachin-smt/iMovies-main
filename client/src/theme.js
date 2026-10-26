export const THEME_STORAGE_KEY = "imoviesTheme";

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}
