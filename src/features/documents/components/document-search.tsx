"use client";

import { useSearchParams } from "next/navigation";

import { DocumentCenterPage, type DocumentCenterPageProps } from "./document-center-page";

export function DocumentSearch(props: Omit<DocumentCenterPageProps, "initialQuery">) {
  const query = useSearchParams().get("q") ?? "";
  return <DocumentCenterPage {...props} initialQuery={query} key={query} />;
}
