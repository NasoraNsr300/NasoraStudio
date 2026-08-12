"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { catalogUpdatedStorageKey } from "./catalog-sync";

export function useCatalogSync() {
  const router = useRouter();

  useEffect(() => {
    function refreshCatalog(event: StorageEvent) {
      if (event.key === catalogUpdatedStorageKey) router.refresh();
    }
    window.addEventListener("storage", refreshCatalog);
    return () => window.removeEventListener("storage", refreshCatalog);
  }, [router]);
}
