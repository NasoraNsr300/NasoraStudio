"use client";

import { useId, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";

import styles from "./home.module.css";

type TabKey = "about" | "queue" | "terms" | "contact";

type QuickInfoPanelProps = { locale: Locale };

const copy: Record<Locale, Record<TabKey, { label: string; title: string; body: string }>> = {
  en: {
    about: { label: "About", title: "A studio for imagined worlds", body: "Nasora turns character, story, and game ideas into carefully composed illustrations." },
    queue: { label: "Queue", title: "Commission queue", body: "Current availability is visible in the navigation. Open requests are reviewed in order." },
    terms: { label: "Terms", title: "Clear terms before we begin", body: "Reference prices and scope are confirmed before work starts. Read the commission terms for the full process." },
    contact: { label: "Contact", title: "Let's make something luminous", body: "Discord is the first contact channel for new commission enquiries." },
  },
  th: {
    about: { label: "เกี่ยวกับ", title: "พื้นที่สำหรับโลกในจินตนาการ", body: "Nasora ถ่ายทอดตัวละคร เรื่องราว และไอเดียเกมให้กลายเป็นภาพประกอบที่ตั้งใจสร้างสรรค์" },
    queue: { label: "คิวงาน", title: "คิวคอมมิชชัน", body: "สถานะการเปิดรับงานแสดงอยู่ในแถบนำทาง และคำขอจะได้รับการพิจารณาตามลำดับ" },
    terms: { label: "ข้อตกลง", title: "ข้อตกลงที่ชัดเจนก่อนเริ่มงาน", body: "ราคาอ้างอิงและขอบเขตงานจะได้รับการยืนยันก่อนเริ่มงาน อ่านข้อตกลงเพื่อดูขั้นตอนทั้งหมด" },
    contact: { label: "ติดต่อ", title: "มาสร้างผลงานที่เปล่งประกายด้วยกัน", body: "Discord คือช่องทางแรกสำหรับสอบถามงานคอมมิชชัน" },
  },
};

const tabs: TabKey[] = ["about", "queue", "terms", "contact"];
const panelCopy = {
  en: { label: "Quick information", eyebrow: "QUICK INFO" },
  th: { label: "ข้อมูลฉบับย่อ", eyebrow: "ข้อมูลฉบับย่อ" },
} as const;

export function QuickInfoPanel({ locale }: QuickInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const baseId = useId();
  const activeCopy = copy[locale][activeTab];

  return (
    <section aria-labelledby={`${baseId}-title`} className={styles.quickInfo} id="quick-info">
      <div aria-label={panelCopy[locale].label} className={styles.tabList} role="tablist">
        {tabs.map((tab) => (
          <button
            aria-controls={`${baseId}-panel`}
            aria-selected={activeTab === tab}
            id={`${baseId}-${tab}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            type="button"
          >
            {copy[locale][tab].label}
          </button>
        ))}
      </div>
      <div aria-labelledby={`${baseId}-${activeTab}`} className={styles.infoContent} id={`${baseId}-panel`} role="tabpanel">
        <p className={styles.eyebrow}>{panelCopy[locale].eyebrow}</p>
        <h2 id={`${baseId}-title`}>{activeCopy.title}</h2>
        <p>{activeCopy.body}</p>
      </div>
    </section>
  );
}
