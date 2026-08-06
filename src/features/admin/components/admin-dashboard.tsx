import { CalendarDays, ChevronDown, ChevronRight, CirclePause, ClipboardList, FileText, MessageSquare, PenLine, Plus, WalletCards } from "lucide-react";

import styles from "./admin-dashboard.module.css";

const estimates = [
  ["Kirana", "ภาพประกอบเดี่ยว (Full Render)", "฿ 4,500", "วันนี้ 10:24", "K"],
  ["ShiroNeko", "ภาพประกอบตัวละครครึ่งตัว (Half Body)", "฿ 3,200", "วันนี้ 09:52", "S"],
  ["Mildred", "ภาพพื้นหลัง (Background)", "฿ 6,800", "วันนี้ 08:31", "M"],
  ["Tanmayo", "ภาพประกอบเดี่ยว (Full Render)", "฿ 5,500", "เมื่อวาน 23:11", "T"],
] as const;

const queueRows = [
  ["Kirana", "ภาพประกอบเดี่ยว (Full Render)", "ขึ้นร่าง", "26 พ.ค. 2567", "30%", "K"],
  ["ShiroNeko", "ภาพประกอบตัวละครครึ่งตัว (Half Body)", "ลงสี", "27 พ.ค. 2567", "60%", "S"],
  ["Mildred", "ภาพพื้นหลัง (Background)", "เก็บรายละเอียด", "28 พ.ค. 2567", "80%", "M"],
  ["Tanmayo", "ภาพประกอบเดี่ยว (Full Render)", "รอเริ่มงาน", "31 พ.ค. 2567", "0%", "T"],
] as const;

const summaryCards = [
  ["รอประเมิน", "4", "+1 จากเมื่อวาน", ClipboardList, "violet"],
  ["สลิปรอตรวจสอบ", "2", "+2 จากเมื่อวาน", FileText, "gold"],
  ["งานที่กำลังดำเนินการ", "7", "คิววันนี้ 3 งาน", WalletCards, "green"],
  ["ข้อความยังไม่อ่าน", "5", "จาก 3 ลูกค้า", MessageSquare, "blue"],
] as const;

function Avatar({ initial }: { initial: string }) {
  return <span aria-hidden="true" className={styles.avatarMini}>{initial}</span>;
}

function SummaryCard({ item }: { item: (typeof summaryCards)[number] }) {
  const [label, value, note, Icon, tone] = item;
  return <article className={styles.summaryCard}>
    <span className={styles.summaryIcon} data-tone={tone}><Icon size={27} /></span>
    <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
  </article>;
}

export function AdminDashboard() {
  return (
    <>
      <section className={styles.primaryColumn}>
            <div className={styles.pageHeading}>
              <h1>ภาพรวมวันนี้</h1><CalendarDays size={19} /><span>24 พฤษภาคม 2567</span><ChevronDown size={16} />
            </div>
            <div className={styles.summaryGrid}>{summaryCards.map((item) => <SummaryCard item={item} key={item[0]} />)}</div>

            <div className={styles.middleGrid}>
              <section className={styles.panel}>
                <h2>แบบประเมินล่าสุด</h2>
                <table className={styles.estimatesTable}>
                  <thead><tr><th>ลูกค้า</th><th>ประเภทงาน</th><th>งบประมาณ</th><th>เวลาที่ส่ง</th><th>จัดการ</th></tr></thead>
                  <tbody>{estimates.map(([name, type, budget, time, initial]) => <tr key={name}>
                    <td><Avatar initial={initial} />{name}</td><td>{type}</td><td>{budget}</td><td>{time}</td><td><button type="button">ประเมิน</button></td>
                  </tr>)}</tbody>
                </table>
                <a className={styles.viewAll} href="#">ดูทั้งหมด (4) <ChevronRight size={16} /></a>
              </section>

              <section className={`${styles.panel} ${styles.slips}`}>
                <div className={styles.panelHeading}><h2>ตรวจสอบสลิป</h2><a href="#">ดูทั้งหมด (2)</a></div>
                {[["Kirana", "฿ 2,250.00", "Invoice #INV-240524-001", "K"], ["ShiroNeko", "฿ 1,600.00", "Invoice #INV-240523-003", "S"]].map(([name, amount, invoice, initial]) => <article key={name}>
                  <Avatar initial={initial} /><div><strong>{name}</strong><small>{invoice}</small><span>โอนเมื่อ 24 พ.ค. 2567 09:41</span></div>
                  <div className={styles.slipAmount}><strong>{amount}</strong><small>มัดจำ 50%</small></div>
                  <div className={styles.slipActions}><button data-action="approve" type="button">✓ อนุมัติ</button><button data-action="reject" type="button">× ปฏิเสธ</button></div>
                </article>)}
              </section>
            </div>

            <section className={`${styles.panel} ${styles.queuePanel}`}>
              <div className={styles.queueHeader}><h2>คิวงาน</h2><div><select aria-label="เรียงคิว"><option>เรียงตาม: กำหนดเสร็จ (เร็วสุด)</option></select><button type="button"><Plus size={19} />เพิ่มคิว Guest</button></div></div>
              <table aria-label="คิวงานปัจจุบัน" className={styles.queueTable}>
                <thead><tr><th aria-label="จัดลำดับ">⠿</th><th>ลูกค้า</th><th>ประเภทงาน</th><th>สถานะ</th><th>กำหนดเสร็จ</th><th>ความคืบหน้า</th><th>จัดการ</th></tr></thead>
                <tbody>{queueRows.map(([name, type, status, due, progress, initial]) => <tr key={name}>
                  <td>⠿</td><td><Avatar initial={initial} />{name}</td><td>{type}</td><td><button className={styles.statusButton} type="button">{status}<ChevronDown size={14} /></button></td><td>{due}</td>
                  <td><span className={styles.progressValue}>{progress}</span><span className={styles.progressTrack}><i style={{ width: progress }} /></span></td><td><button className={styles.editButton} type="button"><PenLine size={15} />แก้ไข</button></td>
                </tr>)}</tbody>
              </table>
            </section>
      </section>

      <aside className={styles.rightRail}>
            <section className={styles.railPanel}><h2>สถานะการรับงาน</h2><p className={styles.openState}>● เปิดรับงาน</p><button type="button"><CirclePause size={18} />ปิดรับงานชั่วคราว</button></section>
            <section className={styles.railPanel}><div className={styles.railTitle}><h2>คิวงานวันนี้</h2><b>3 งาน</b></div><ul className={styles.todayQueue}><li><time>10:00</time><span>Kirana</span><small>ขึ้นร่าง</small></li><li><time>14:00</time><span>ShiroNeko</span><small>ลงสี</small></li><li><time>18:00</time><span>Mildred</span><small>เก็บรายละเอียด</small></li></ul><a href="#">ดูคิวทั้งหมด <ChevronRight size={16} /></a></section>
            <section className={styles.railPanel}><h2>ภาระงาน (Workload)</h2><div className={styles.workload}><span className={styles.gauge}><strong>70%</strong></span><p>ของความสามารถ<br />(7 / 10 คิว)</p></div><ul className={styles.workloadLegend}><li><i data-tone="violet" />งานที่ดำเนินการ <b>7</b></li><li><i data-tone="gold" />รอเริ่มงาน <b>2</b></li><li><i data-tone="muted" />ว่างรับเพิ่ม <b>3</b></li></ul></section>
            <section className={styles.railPanel}><div className={styles.railTitle}><h2>โน้ตส่วนตัว</h2><PenLine size={18} /></div><p>เน้นคิวงานที่ส่งภายในสัปดาห์นี้เป็นพิเศษ</p><small>อัปเดตล่าสุด 24/05/67 09:30</small></section>
      </aside>
    </>
  );
}
