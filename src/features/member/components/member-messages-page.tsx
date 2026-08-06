"use client";

import { ImagePlus, Search, Send, UserRound } from "lucide-react";
import { useState } from "react";

import type { Locale } from "@/shared/i18n/locales";

import { MemberSidebar, type MemberSection } from "./member-sidebar";
import styles from "./member-pages.module.css";

export function MemberMessagesContent({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(0);
  const th = locale === "th";
  const conversations = [
    ["Illustration — Full Body", th ? "อัปเดตร่าง — ภาพร่างขั้นต้น" : "Sketch update", "15:42"],
    ["Chibi — Full Body", th ? "ได้รับมัดจำแล้ว ขอบคุณค่ะ" : "Deposit received", "25 ก.พ."],
    ["VTuber — Reference", th ? "ปิดรายการเรียบร้อยแล้ว" : "Request closed", "10 มิ.ย."],
  ];

  return (
    <section className={styles.pagePanel}>
      <header className={styles.pageHeader}>
        <div>
          <h1>{th ? "ข้อความ" : "Messages"}</h1>
          <p>{th ? "พูดคุยเรื่องงานและส่งภาพอ้างอิงกับ Nasora" : "Discuss jobs and share image references with Nasora."}</p>
        </div>
      </header>
      <div className={styles.messagesLayout}>
        <section className={`${styles.surface} ${styles.conversationList}`}>
          <header>
            <input aria-label="Search conversations" placeholder={th ? "ค้นหาข้อความ..." : "Search messages..."} />
          </header>
          {conversations.map((item, index) => (
            <button
              aria-pressed={active === index}
              className={styles.conversation}
              key={item[0]}
              onClick={() => setActive(index)}
              type="button"
            >
              <span>
                <strong>{item[0]}</strong>
                <time>{item[2]}</time>
              </span>
              <span>
                <small>{item[1]}</small>
                {index === 0 ? <b>3</b> : null}
              </span>
            </button>
          ))}
        </section>
        <section className={`${styles.surface} ${styles.chat}`}>
          <header className={styles.chatHeader}>
            <span>
              <UserRound size={19} />
            </span>
            <div>
              <strong>Nasora</strong>
              <small>● {th ? "ออนไลน์" : "Online"}</small>
            </div>
            <Search size={18} />
          </header>
          <div className={styles.chatBody}>
            <div className={styles.bubble}>
              <p>
                {th
                  ? "สวัสดีค่ะ อัปเดตร่างขั้นต้นให้ตรวจสอบนะคะ ถ้ามีจุดที่อยากปรับแจ้งได้เลยค่ะ"
                  : "Here is the initial sketch. Let me know if you would like anything adjusted."}
              </p>
              <small>15:42</small>
            </div>
            <div className={`${styles.bubble} ${styles.mine}`}>
              <p>
                {th
                  ? "ขอบคุณค่ะ ขอปรับท่าให้ยาวขึ้นนิดนึง และเปลี่ยนรูปดาวด้านหลังเป็นพระจันทร์เต็มดวงได้ไหมคะ?"
                  : "Thank you! Could the pose be a little longer, and could the star be changed to a full moon?"}
              </p>
              <small>18:07 · ✓✓</small>
            </div>
            <div className={styles.bubble}>
              <p>
                {th
                  ? "ได้เลยค่ะ เดี๋ยวปรับให้ในรอบถัดไปนะคะ"
                  : "Absolutely, I will include those changes in the next update."}
              </p>
              <small>18:12</small>
            </div>
          </div>
          <footer className={styles.chatComposer}>
            <button aria-label="Add image" type="button">
              <ImagePlus size={18} />
            </button>
            <input placeholder={th ? "พิมพ์ข้อความ..." : "Write a message..."} />
            <button aria-label="Send" type="button">
              <Send size={18} />
            </button>
          </footer>
        </section>
      </div>
    </section>
  );
}

export function MemberMessagesPage({
  locale,
  onSelectSection,
}: {
  locale: Locale;
  onSelectSection?: (section: MemberSection) => void;
}) {
  return (
    <main className={styles.memberArea}>
      <MemberSidebar active="messages" locale={locale} onSelectSection={onSelectSection} />
      <MemberMessagesContent locale={locale} />
    </main>
  );
}
