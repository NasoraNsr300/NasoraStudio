"use client";

import { MessageSquarePlus, PackagePlus, Save, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";

import type { AdminSiteSettings, SaveAdminSiteSettingsInput } from "@/features/site-settings/domain/site-settings";
import adminStyles from "@/features/admin/components/admin-section-pages.module.css";

import styles from "./admin-site-settings-form.module.css";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<{
  json(): Promise<{ error?: string; settings?: AdminSiteSettings }>;
  ok: boolean;
}>;

function toEditableSettings(settings: AdminSiteSettings): SaveAdminSiteSettingsInput {
  return {
    adminNote: settings.adminNote,
    businessHours: settings.businessHours,
    commissionsOpen: settings.commissionsOpen,
    discordContact: settings.discordContact,
    homeDescription: settings.homeDescription,
    homeHeading: settings.homeHeading,
    particlesEnabled: settings.particlesEnabled,
    queueCapacity: settings.queueCapacity,
    shootingStarsEnabled: settings.shootingStarsEnabled,
  };
}

export function AdminSiteSettingsForm({
  fetcher = fetch,
  initialSettings,
}: {
  fetcher?: Fetcher;
  initialSettings: AdminSiteSettings;
}) {
  const [settings, setSettings] = useState<SaveAdminSiteSettingsInput>(() => toEditableSettings(initialSettings));
  const [savedSettings, setSavedSettings] = useState<SaveAdminSiteSettingsInput>(() => toEditableSettings(initialSettings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function update<K extends keyof SaveAdminSiteSettingsInput>(key: K, value: SaveAdminSiteSettingsInput[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetcher("/api/admin/site-settings", {
        body: JSON.stringify(settings),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok || !body.settings) throw new Error(body.error ?? "บันทึกการตั้งค่าไม่สำเร็จ");
      const nextSettings = toEditableSettings(body.settings);
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setNotice("บันทึกแล้ว");
    } catch (cause) {
      setSettings(savedSettings);
      setError(cause instanceof Error ? cause.message : "บันทึกการตั้งค่าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return <form className={adminStyles.sectionPage} onSubmit={save}>
    <header className={adminStyles.pageHeader}>
      <div><span><Settings2 size={25} /></span><div><h1>ตั้งค่า</h1><p>กำหนดข้อมูลร้าน การรับงาน ช่องทางติดต่อ และลูกเล่นของเว็บไซต์</p></div></div>
      <button className={adminStyles.primaryAction} disabled={saving} type="submit"><Save size={18} />{saving ? "กำลังบันทึก" : "บันทึกการตั้งค่า"}</button>
    </header>
    {notice ? <p className={styles.feedback} role="status">{notice}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <div className={adminStyles.settingsGrid}>
      <section>
        <header><UserRound size={20} /><div><h2>ข้อมูลหน้าแรก</h2><p>ข้อความที่แสดงต่อสาธารณะทั้งไทยและอังกฤษ</p></div></header>
        <label>หัวข้อภาษาไทย<input maxLength={160} onChange={(event) => update("homeHeading", { ...settings.homeHeading, th: event.target.value })} required value={settings.homeHeading.th} /></label>
        <label>หัวข้อภาษาอังกฤษ<input maxLength={160} onChange={(event) => update("homeHeading", { ...settings.homeHeading, en: event.target.value })} required value={settings.homeHeading.en} /></label>
        <label>คำอธิบายภาษาไทย<textarea className={styles.textarea} maxLength={1000} onChange={(event) => update("homeDescription", { ...settings.homeDescription, th: event.target.value })} required value={settings.homeDescription.th} /></label>
        <label>คำอธิบายภาษาอังกฤษ<textarea className={styles.textarea} maxLength={1000} onChange={(event) => update("homeDescription", { ...settings.homeDescription, en: event.target.value })} required value={settings.homeDescription.en} /></label>
      </section>
      <section>
        <header><PackagePlus size={20} /><div><h2>การรับคอมมิชชัน</h2><p>สถานะรับงานและจำนวนคิวสูงสุด</p></div></header>
        <label>จำนวนคิวสูงสุด<input max={100} min={1} onChange={(event) => update("queueCapacity", Number(event.target.value))} required type="number" value={settings.queueCapacity} /></label>
        <label className={adminStyles.switchLine}>เปิดรับงาน<button aria-checked={settings.commissionsOpen} aria-label="เปิดรับงาน" className={styles.switch} onClick={() => update("commissionsOpen", !settings.commissionsOpen)} role="switch" type="button"><i /></button></label>
      </section>
      <section>
        <header><MessageSquarePlus size={20} /><div><h2>ช่องทางติดต่อ</h2><p>ข้อมูลที่แสดงในหน้า Home และเกี่ยวกับ</p></div></header>
        <label>Discord<input maxLength={200} onChange={(event) => update("discordContact", event.target.value)} required value={settings.discordContact} /></label>
        <label>เวลาทำการ<input maxLength={120} onChange={(event) => update("businessHours", event.target.value)} required value={settings.businessHours} /></label>
      </section>
      <section>
        <header><ShieldCheck size={20} /><div><h2>ลูกเล่นพื้นหลัง</h2><p>เปิดหรือปิดเอฟเฟกต์สำหรับผู้ใช้ทั่วไป</p></div></header>
        <div className={styles.visualChecks}>
          <label className={adminStyles.checkLine}><input checked={settings.particlesEnabled} onChange={(event) => update("particlesEnabled", event.target.checked)} type="checkbox" />Particle interaction</label>
          <label className={adminStyles.checkLine}><input checked={settings.shootingStarsEnabled} onChange={(event) => update("shootingStarsEnabled", event.target.checked)} type="checkbox" />ดาวตกเป็นช่วง</label>
        </div>
      </section>
    </div>
  </form>;
}
