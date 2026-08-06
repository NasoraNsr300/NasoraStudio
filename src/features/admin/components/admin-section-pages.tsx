import { Archive, Check, ChevronDown, CircleDollarSign, Clock3, Download, Eye, FileText, Filter, ImagePlus, Mail, MessageSquarePlus, MoreHorizontal, PackagePlus, PenLine, Plus, Search, Send, Settings2, ShieldCheck, SlidersHorizontal, Trash2, Upload, UserRound } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import styles from "./admin-section-pages.module.css";

function PageHeader({ action, description, icon, title }: { action: string; description: string; icon: ReactNode; title: string }) {
  return <header className={styles.pageHeader}><div><span>{icon}</span><div><h1>{title}</h1><p>{description}</p></div></div><button className={styles.primaryAction} type="button"><Plus size={18} />{action}</button></header>;
}

function Toolbar({ placeholder = "ค้นหา..." }: { placeholder?: string }) {
  return <div className={styles.toolbar}><label><Search size={18} /><input placeholder={placeholder} /></label><button type="button"><Filter size={17} />ตัวกรอง</button><button type="button">ล่าสุด<ChevronDown size={16} /></button></div>;
}

function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "violet" | "danger" | "neutral" }) {
  return <span className={styles.status} data-tone={tone}>● {children}</span>;
}

const clients = [
  ["Kirana", "Illustration / Full Body", "฿ 4,500", "รอประเมิน", "warning"],
  ["ShiroNeko", "Illustration / Half Body", "฿ 3,200", "ส่งราคาแล้ว", "violet"],
  ["Mildred", "Background", "฿ 6,800", "รอลูกค้าตอบ", "neutral"],
  ["Tanmayo", "Chibi / Full Body", "฿ 2,400", "ยืนยันแล้ว", "success"],
] as const;

export function AdminEstimatesPage() {
  return <section className={styles.sectionPage}>
    <PageHeader action="สร้างใบเสนอราคา" description="ตรวจแบบประเมิน กำหนดราคาจริง และส่งข้อเสนอให้ลูกค้า" icon={<FileText size={25} />} title="แบบประเมิน" />
    <div className={styles.metricRow}><article><small>รอประเมิน</small><strong>4</strong><span>ต้องตอบภายในวันนี้ 2 รายการ</span></article><article><small>ส่งราคาแล้ว</small><strong>7</strong><span>รอลูกค้าตอบรับ</span></article><article><small>ยืนยันเดือนนี้</small><strong>12</strong><span>มูลค่า ฿ 48,900</span></article></div>
    <section className={styles.dataPanel}><Toolbar placeholder="ค้นหาชื่อลูกค้า หรือเลขแบบประเมิน..." /><table><thead><tr><th>ลูกค้า</th><th>ประเภทงาน</th><th>งบที่แจ้ง</th><th>วันที่ส่ง</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{clients.map(([name, type, budget, status, tone]) => <tr key={name}><td><UserRound size={17} />{name}</td><td>{type}</td><td>{budget}</td><td>24 พ.ค. 2567</td><td><Status tone={tone}>{status}</Status></td><td><button className={styles.rowAction} type="button"><PenLine size={15} />ประเมิน</button></td></tr>)}</tbody></table></section>
  </section>;
}

export function AdminJobsPage() {
  return <section className={styles.sectionPage}>
    <PageHeader action="เพิ่มคิว Guest" description="จัดลำดับคิว อัปเดตขั้นตอนทำงาน เดดไลน์ และความคืบหน้า" icon={<Clock3 size={25} />} title="งานและคิว" />
    <div className={styles.jobBoard}>{[["รอเริ่มงาน", "2", ["Tanmayo — Chibi", "Lunaris — Skin Minecraft"]], ["กำลังทำ", "3", ["Kirana — Full Body", "ShiroNeko — Half Body", "Mildred — Background"]], ["รอตรวจ", "2", ["Ploy — Chibi", "Aster — VTuber"]], ["เสร็จสิ้น", "24", ["งานที่ส่งมอบแล้วในเดือนนี้"]]].map(([title, count, items]) => <section key={String(title)}><header><h2>{title}</h2><b>{count}</b></header>{(items as string[]).map((item, index) => <article key={item}><strong>{item}</strong><span>กำหนดส่ง {26 + index} พ.ค. 2567</span><div><i style={{ width: `${20 + index * 30}%` }} /></div></article>)}</section>)}</div>
  </section>;
}

export function AdminPaymentsPage() {
  return <section className={styles.sectionPage}>
    <PageHeader action="เพิ่มรายการชำระเงิน" description="ตรวจสลิป ติดตามยอดมัดจำ และยอดคงเหลือของแต่ละงาน" icon={<CircleDollarSign size={25} />} title="การชำระเงิน" />
    <div className={styles.metricRow}><article><small>รอตรวจสลิป</small><strong>2</strong><span>ยอดรวม ฿ 3,850</span></article><article><small>รับเงินเดือนนี้</small><strong>฿ 32,450</strong><span>11 รายการ</span></article><article><small>ยอดค้างชำระ</small><strong>฿ 18,200</strong><span>จาก 6 งาน</span></article></div>
    <section className={styles.dataPanel}><Toolbar placeholder="ค้นหา Invoice หรือลูกค้า..." /><table><thead><tr><th>Invoice</th><th>ลูกค้า</th><th>ประเภท</th><th>ยอดชำระ</th><th>สถานะ</th><th>สลิป</th><th>จัดการ</th></tr></thead><tbody>{[["INV-240524-001", "Kirana", "มัดจำ 50%", "฿ 2,250", "รอตรวจ"], ["INV-240523-003", "ShiroNeko", "มัดจำ 50%", "฿ 1,600", "รอตรวจ"], ["INV-240522-008", "Tanmayo", "ยอดคงเหลือ", "฿ 1,200", "ยืนยันแล้ว"]].map(([invoice, name, type, amount, status]) => <tr key={invoice}><td>{invoice}</td><td>{name}</td><td>{type}</td><td>{amount}</td><td><Status tone={status === "ยืนยันแล้ว" ? "success" : "warning"}>{status}</Status></td><td><button className={styles.iconAction} aria-label={`ดูสลิป ${invoice}`} type="button"><Eye size={17} /></button></td><td><button className={styles.rowAction} type="button"><Check size={15} />ตรวจสอบ</button></td></tr>)}</tbody></table></section>
  </section>;
}

export function AdminMessagesPage() {
  const threads = [["Kirana", "ส่งภาพร่างใหม่แล้วนะคะ", "15:42"], ["ShiroNeko", "ขอบคุณค่ะ รับทราบ", "14:08"], ["Mildred", "ขอเพิ่มรายละเอียดฉาก", "เมื่อวาน"], ["Tanmayo", "ดาวน์โหลดไฟล์แล้วค่ะ", "จ." ]];
  return <section className={styles.sectionPage}>
    <PageHeader action="ข้อความใหม่" description="พูดคุยกับสมาชิกและเก็บประวัติการติดต่อไว้กับงาน" icon={<Mail size={25} />} title="ข้อความ" />
    <div className={styles.inbox}><aside><label><Search size={17} /><input placeholder="ค้นหาข้อความ..." /></label>{threads.map(([name, preview, time], index) => <button aria-pressed={index === 0} key={name} type="button"><span>{name.slice(0,1)}</span><div><strong>{name}</strong><p>{preview}</p></div><time>{time}</time></button>)}</aside><section><header><div><strong>Kirana</strong><span>ออนไลน์ · Illustration / Full Body</span></div><button aria-label="ตัวเลือกข้อความ" type="button"><MoreHorizontal /></button></header><div className={styles.chatBody}><p data-side="customer">สวัสดีค่ะ อยากทราบว่าภาพร่างเป็นอย่างไรบ้างคะ</p><p data-side="admin">กำลังอัปเดตให้ค่ะ ภายในวันนี้จะส่งภาพร่างรอบใหม่ให้ตรวจนะคะ</p><p data-side="customer">ขอบคุณค่ะ รอตรวจนะคะ</p></div><footer><button aria-label="แนบไฟล์" type="button"><Upload size={18} /></button><input placeholder="พิมพ์ข้อความถึง Kirana..." /><button aria-label="ส่งข้อความ" type="button"><Send size={18} /></button></footer></section></div>
  </section>;
}

export function AdminCatalogPage() {
  const albums = [["Chibi", "2 รูปแบบ", "เปิดรับ"], ["Illustration", "4 รูปแบบ", "เปิดรับ"], ["VTuber", "1 รูปแบบ", "รับจำนวนจำกัด"], ["Skin Minecraft", "1 รูปแบบ", "เปิดรับ"]];
  return <section className={styles.sectionPage}>
    <PageHeader action="เพิ่มอัลบั้ม" description="จัดประเภทงาน รูปแบบย่อย เรทราคา และสถานะเปิดรับ" icon={<SlidersHorizontal size={25} />} title="อัลบั้มและราคา" />
    <Toolbar placeholder="ค้นหาอัลบั้มหรือรูปแบบงาน..." /><div className={styles.catalogGrid}>{albums.map(([name, count, state], index) => <article key={name}><div className={styles.catalogCover} data-cover={index}><span>{name}</span></div><header><div><h2>{name}</h2><small>{count}</small></div><Status tone={state === "เปิดรับ" ? "success" : "warning"}>{state}</Status></header><footer><button type="button"><PenLine size={16} />แก้ไขอัลบั้ม</button><button aria-label={`ตัวเลือก ${name}`} type="button"><MoreHorizontal size={17} /></button></footer></article>)}</div>
  </section>;
}

export function AdminPortfolioPage() {
  return <section className={styles.sectionPage}>
    <PageHeader action="เพิ่มผลงาน" description="อัปโหลดผลงาน จัดหมวดหมู่ และเลือกภาพที่แสดงบนหน้า Portfolio" icon={<ImagePlus size={25} />} title="ผลงาน" />
    <Toolbar placeholder="ค้นหาชื่อผลงานหรือหมวดหมู่..." /><div className={styles.portfolioGrid}>{["moonlit", "violet", "forest", "sky", "amber", "moonlit"].map((image, index) => <article key={`${image}-${index}`}><Image alt={`ผลงานตัวอย่าง ${index + 1}`} height={110} src={`/fixtures/derivatives/${image}-card.webp`} width={140} /><div><strong>{["Starlight Full Body", "Moon Garden", "Minecraft Cottage", "Blue Horizon", "Chibi Star", "Night Portrait"][index]}</strong><span>{index % 2 ? "Chibi" : "Illustration"}</span></div><button aria-label={`แก้ไขผลงาน ${index + 1}`} type="button"><PenLine size={16} /></button></article>)}</div>
  </section>;
}

export function AdminDocumentsPage() {
  return <section className={styles.sectionPage}>
    <PageHeader action="สร้างเอกสาร" description="เขียน ปักหมุด เผยแพร่ และจัดหมวดหมู่เอกสารสำหรับลูกค้า" icon={<FileText size={25} />} title="เอกสาร" />
    <section className={styles.dataPanel}><Toolbar placeholder="ค้นหาเอกสาร..." /><table><thead><tr><th>ชื่อเอกสาร</th><th>หมวดหมู่</th><th>ภาษา</th><th>อัปเดตล่าสุด</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{[["ข้อตกลงการว่าจ้างคอมมิชชัน", "ข้อตกลง", "TH / EN", "24 เม.ย. 2568", "เผยแพร่"], ["เงื่อนไขการใช้งานเชิงพาณิชย์", "ข้อตกลง", "TH / EN", "18 เม.ย. 2568", "เผยแพร่"], ["ขั้นตอนการชำระเงิน", "คู่มือ", "TH / EN", "10 เม.ย. 2568", "ฉบับร่าง"], ["การรับและส่งมอบงาน", "คู่มือ", "TH / EN", "12 เม.ย. 2568", "เผยแพร่"]].map(([title, category, language, updated, status]) => <tr key={title}><td><FileText size={17} />{title}</td><td>{category}</td><td>{language}</td><td>{updated}</td><td><Status tone={status === "เผยแพร่" ? "success" : "neutral"}>{status}</Status></td><td><button className={styles.rowAction} type="button"><PenLine size={15} />แก้ไข</button></td></tr>)}</tbody></table></section>
  </section>;
}

export function AdminSettingsPage() {
  return <section className={styles.sectionPage}>
    <PageHeader action="บันทึกการตั้งค่า" description="กำหนดข้อมูลร้าน การรับงาน การแจ้งเตือน และการเชื่อมต่อบริการ" icon={<Settings2 size={25} />} title="ตั้งค่า" />
    <div className={styles.settingsGrid}><section><header><UserRound size={20} /><div><h2>ข้อมูลร้านและโปรไฟล์</h2><p>ข้อมูลที่แสดงต่อสาธารณะและในอีเมล</p></div></header><label>ชื่อร้าน<input defaultValue="Nasora" /></label><label>Discord<input defaultValue="nasora.studio" /></label><label>เวลาทำการ<input defaultValue="11:00 – 22:00" /></label></section><section><header><PackagePlus size={20} /><div><h2>การรับคอมมิชชัน</h2><p>ค่าเริ่มต้นของคิวและการชำระเงิน</p></div></header><label>มัดจำมาตรฐาน<select defaultValue="50"><option value="50">50%</option><option value="40">40%</option></select></label><label>จำนวนแก้มาตรฐาน<input defaultValue="4" type="number" /></label><label className={styles.switchLine}>เปิดรับงาน<button aria-pressed="true" type="button"><i /></button></label></section><section><header><MessageSquarePlus size={20} /><div><h2>การแจ้งเตือน</h2><p>อีเมลแจ้งเตือนสำหรับผู้ดูแลระบบ</p></div></header><label className={styles.checkLine}><input defaultChecked type="checkbox" />มีแบบประเมินใหม่</label><label className={styles.checkLine}><input defaultChecked type="checkbox" />มีการอัปโหลดสลิป</label><label className={styles.checkLine}><input defaultChecked type="checkbox" />มีข้อความใหม่</label></section><section><header><ShieldCheck size={20} /><div><h2>บริการที่เชื่อมต่อ</h2><p>สถานะระบบภายนอกของเว็บไซต์</p></div></header><div className={styles.integration}><strong>Supabase</strong><Status tone="success">เชื่อมต่อแล้ว</Status></div><div className={styles.integration}><strong>Cloudflare R2</strong><Status tone="success">เชื่อมต่อแล้ว</Status></div><div className={styles.integration}><strong>Google OAuth</strong><Status tone="warning">รอตั้งค่า</Status></div></section></div>
  </section>;
}
