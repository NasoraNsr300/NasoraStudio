"use client";

import { useSearchParams } from "next/navigation";

import type { QueuePageProps } from "./queue-page";
import { QueuePage } from "./queue-page";

export function QueueSearch(props: Omit<QueuePageProps, "initialQuery">) {
  const query = useSearchParams().get("q") ?? "";
  return <QueuePage {...props} initialQuery={query} key={query} />;
}
