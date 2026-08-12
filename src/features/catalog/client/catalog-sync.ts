export const catalogUpdatedStorageKey = "nasora:catalog-updated";

export function notifyCatalogUpdated() {
  window.localStorage.setItem(catalogUpdatedStorageKey, String(Date.now()));
}
