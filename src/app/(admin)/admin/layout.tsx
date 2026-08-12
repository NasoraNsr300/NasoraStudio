import type { ReactNode } from "react";

export default function AdminRouteLayout({ children, modal }: { children: ReactNode; modal?: ReactNode }) {
  return <>{children}{modal}</>;
}
