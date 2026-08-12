import { Search } from "lucide-react";
import Link from "next/link";

import styles from "@/features/admin/components/admin-section-pages.module.css";
import { searchAdminRecords } from "@/features/admin/search/data/admin-search-repository.server";

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim() ?? "";
  const results = await searchAdminRecords(query);
  return <section className={styles.sectionPage}>
    <header className={styles.pageHeader}><div><span><Search size={23} /></span><div><h1>ผลการค้นหา</h1><p>{query ? `ผลลัพธ์สำหรับ “${query}”` : "กรอกคำค้นหาจากแถบด้านบน"}</p></div></div></header>
    <section className={styles.dataPanel}>
      {results.length ? <table><thead><tr><th>รายการ</th><th>หมวด</th><th>รายละเอียด</th></tr></thead><tbody>{results.map((result) => <tr key={result.id}><td><Link href={result.href}>{result.title}</Link></td><td>{result.group}</td><td>{result.detail}</td></tr>)}</tbody></table> : <div className={styles.searchEmpty}>ไม่พบข้อมูลที่ตรงกับคำค้นหา</div>}
    </section>
  </section>;
}
