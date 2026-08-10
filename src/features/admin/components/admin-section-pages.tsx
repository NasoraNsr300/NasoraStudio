import { Archive, Check, ChevronDown, CircleDollarSign, Clock3, Download, Eye, FileText, Filter, Mail, MessageSquarePlus, MoreHorizontal, PackagePlus, Plus, Search, Send, Settings2, ShieldCheck, Trash2, Upload, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { AdminEstimateInbox } from "@/features/admin/estimates/components/admin-estimate-inbox";
import { AdminEstimateDetail } from "@/features/admin/estimates/components/admin-estimate-detail";
import type { AdminEstimateDetail as AdminEstimateDetailModel, AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";
import type { AdminJobSummary } from "@/features/admin/jobs/data/admin-job-repository.server";
import { AdminJobsManager } from "@/features/admin/jobs/components/admin-jobs-manager";

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

export function AdminEstimatesPage({ detail, requests = [] }: { detail?: AdminEstimateDetailModel | null; requests?: AdminEstimateSummary[] }) {
  const submittedCount = requests.filter((request) => request.status === "submitted").length;
  const quotedCount = requests.filter((request) => request.status === "quoted").length;
  const convertedCount = requests.filter((request) => request.status === "converted").length;

  return <section className={styles.sectionPage}>
    <PageHeader action="สร้างใบเสนอราคา" description="ตรวจแบบประเมิน กำหนดราคาจริง และส่งข้อเสนอให้ลูกค้า" icon={<FileText size={25} />} title="แบบประเมิน" />
    <div className={styles.metricRow}><article><small>รอประเมิน</small><strong>{submittedCount}</strong><span>จากแบบประเมินทั้งหมด {requests.length} รายการ</span></article><article><small>ส่งราคาแล้ว</small><strong>{quotedCount}</strong><span>รอลูกค้าตอบรับ</span></article><article><small>ยืนยันแล้ว</small><strong>{convertedCount}</strong><span>รายการที่เปลี่ยนเป็นงานแล้ว</span></article></div>
    <AdminEstimateInbox requests={requests} />
    {detail && <AdminEstimateDetail request={detail} />}
  </section>;
}

export function AdminJobsPage({ jobs = [] }: { jobs?: AdminJobSummary[] }) {
  return <AdminJobsManager jobs={jobs} />;
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

export function AdminSettingsPage() {
  return <section className={styles.sectionPage}>
    <PageHeader action="บันทึกการตั้งค่า" description="กำหนดข้อมูลร้าน การรับงาน การแจ้งเตือน และการเชื่อมต่อบริการ" icon={<Settings2 size={25} />} title="ตั้งค่า" />
    <div className={styles.settingsGrid}><section><header><UserRound size={20} /><div><h2>ข้อมูลร้านและโปรไฟล์</h2><p>ข้อมูลที่แสดงต่อสาธารณะและในอีเมล</p></div></header><label>ชื่อร้าน<input defaultValue="Nasora" /></label><label>Discord<input defaultValue="nasora.studio" /></label><label>เวลาทำการ<input defaultValue="11:00 – 22:00" /></label></section><section><header><PackagePlus size={20} /><div><h2>การรับคอมมิชชัน</h2><p>ค่าเริ่มต้นของคิวและการชำระเงิน</p></div></header><label>มัดจำมาตรฐาน<select defaultValue="50"><option value="50">50%</option><option value="40">40%</option></select></label><label>จำนวนแก้มาตรฐาน<input defaultValue="4" type="number" /></label><label className={styles.switchLine}>เปิดรับงาน<button aria-pressed="true" type="button"><i /></button></label></section><section><header><MessageSquarePlus size={20} /><div><h2>การแจ้งเตือน</h2><p>อีเมลแจ้งเตือนสำหรับผู้ดูแลระบบ</p></div></header><label className={styles.checkLine}><input defaultChecked type="checkbox" />มีแบบประเมินใหม่</label><label className={styles.checkLine}><input defaultChecked type="checkbox" />มีการอัปโหลดสลิป</label><label className={styles.checkLine}><input defaultChecked type="checkbox" />มีข้อความใหม่</label></section><section><header><ShieldCheck size={20} /><div><h2>บริการที่เชื่อมต่อ</h2><p>สถานะระบบภายนอกของเว็บไซต์</p></div></header><div className={styles.integration}><strong>Supabase</strong><Status tone="success">เชื่อมต่อแล้ว</Status></div><div className={styles.integration}><strong>Cloudflare R2</strong><Status tone="success">เชื่อมต่อแล้ว</Status></div><div className={styles.integration}><strong>Google OAuth</strong><Status tone="warning">รอตั้งค่า</Status></div></section></div>
  </section>;
}
