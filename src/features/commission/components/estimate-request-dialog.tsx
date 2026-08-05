"use client";

import {
  CalendarDays,
  Check,
  ImagePlus,
  Minus,
  Plus,
  Save,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { ServiceType } from "@/shared/types/public-content";

import styles from "./commission.module.css";

type CustomerMode = "member" | "guest";

type EstimateRequestDialogProps = {
  locale: Locale;
  onClose(): void;
  service: ServiceType;
};

const copy = {
  th: {
    title: "ส่งแบบประเมินราคา",
    subtitle: "กรุณากรอกข้อมูลให้ครบถ้วน เพื่อให้ศิลปินประเมินราคาได้อย่างแม่นยำ",
    steps: ["ข้อมูลงาน", "รายละเอียด", "ตรวจสอบ"],
    notice: "นี่คือการส่งแบบประเมินราคาเท่านั้น ยังไม่ใช่การสั่งงานและไม่มีการชำระเงินในขั้นตอนนี้",
    customer: "ข้อมูลผู้ว่าจ้าง",
    work: "รายละเอียดงาน",
    modeLabel: "คุณกำลังใช้งานในฐานะ",
    member: "สมาชิก",
    guest: "Guest",
    nickname: "ชื่อที่ใช้ติดต่อ (Nickname)",
    contact: "ช่องทางการติดต่อที่สะดวก",
    usage: "ประเภทการใช้งาน",
    personal: "Personal (ส่วนบุคคล)",
    commercial: "Commercial (เชิงพาณิชย์)",
    budget: "งบประมาณโดยประมาณ (THB)",
    budgetType: "ระบุช่วงงบประมาณ",
    min: "ขั้นต่ำ",
    max: "สูงสุด",
    deadline: "กำหนดส่งงานโดยประมาณ",
    date: "เลือกวันที่",
    details: "รายละเอียดตัวละคร / สิ่งที่ต้องการให้ออก",
    detailsHint: "อธิบายตัวละคร ลักษณะท่าทาง องค์ประกอบหลัก หรือสิ่งที่ต้องการเน้นเป็นพิเศษ",
    mood: "อารมณ์ โทนสี และสไตล์ที่ต้องการ",
    moodHint: "เช่น ลึกลับ อบอุ่น แฟนตาซี น่ารัก สดใส โทนกลางคืน โทนทอง ฯลฯ",
    extras: "ตัวเลือกเพิ่มเติม",
    extraPeople: "ตัวละครเพิ่มเติม",
    extraPeopleHint: "เพิ่มตัวละครในภาพ",
    background: "พื้นหลัง",
    backgroundHint: "รายละเอียดฉาก / สถานที่",
    props: "พร็อพ / ไอเท็มพิเศษ",
    propsHint: "อาวุธ สัตว์เลี้ยง วัตถุ ฯลฯ",
    references: "อ้างอิงภาพ (Reference)",
    referencesHint: "แนบภาพอ้างอิงตัวละคร ท่า สี หรือสไตล์ที่ต้องการ (ไม่บังคับ)",
    referenceLimit: "สูงสุด 20 ภาพ",
    addReference: "อัปโหลดเพิ่ม",
    dropReference: "หรือ ลากไฟล์มาวางที่นี่",
    accept: "ฉันยอมรับ",
    privacy: "นโยบายความเป็นส่วนตัว",
    and: "และ",
    terms: "ข้อกำหนดการใช้งาน",
    legalSuffix: "ของแพลตฟอร์ม",
    finalNotice: "หลังจากส่งแบบประเมินแล้ว จะไม่สามารถแก้ไขข้อมูลได้ แต่สามารถยกเลิกได้ในขณะที่ยังอยู่ในสถานะรอตรวจสอบ",
    draft: "บันทึกร่าง",
    review: "ตรวจสอบและส่ง",
    locked: "แก้ไขไม่ได้",
    memberName: "Nasora Member",
    memberContact: "@nasora_member",
  },
  en: {
    title: "Request an estimate",
    subtitle: "Complete the brief so the artist can prepare an accurate estimate.",
    steps: ["Project", "Details", "Review"],
    notice: "This is an estimate request only. It is not an order and no payment is taken at this stage.",
    customer: "Customer information",
    work: "Project details",
    modeLabel: "You are continuing as",
    member: "Member",
    guest: "Guest",
    nickname: "Contact name (Nickname)",
    contact: "Preferred contact channel",
    usage: "Usage type",
    personal: "Personal",
    commercial: "Commercial",
    budget: "Estimated budget (THB)",
    budgetType: "Budget range",
    min: "Minimum",
    max: "Maximum",
    deadline: "Preferred deadline",
    date: "Select date",
    details: "Character / project description",
    detailsHint: "Describe the character, pose, key elements, and anything that should receive special attention.",
    mood: "Mood, palette, and style",
    moodHint: "For example: mysterious, cozy, fantasy, cute, bright, night palette, gold tones.",
    extras: "Additional options",
    extraPeople: "Extra characters",
    extraPeopleHint: "Additional characters in the artwork",
    background: "Background",
    backgroundHint: "Scene / location detail",
    props: "Props / special items",
    propsHint: "Weapons, pets, objects, etc.",
    references: "References",
    referencesHint: "Attach character, pose, palette, or style references (optional).",
    referenceLimit: "Up to 20 images",
    addReference: "Upload more",
    dropReference: "or drag files here",
    accept: "I accept the",
    privacy: "Privacy Policy",
    and: "and",
    terms: "Terms of Use",
    legalSuffix: "of this platform",
    finalNotice: "After submission, the brief cannot be edited. You may cancel it while it is still awaiting review.",
    draft: "Save draft",
    review: "Review and submit",
    locked: "Locked",
    memberName: "Nasora Member",
    memberContact: "@nasora_member",
  },
} as const;

function Counter({ label, hint }: { hint: string; label: string }) {
  const [count, setCount] = useState(0);
  return <div className={styles.estimateCounter}>
    <span><strong>{label}</strong><small>{hint}</small></span>
    <div>
      <button aria-label={`Decrease ${label}`} disabled={count === 0} onClick={() => setCount((value) => Math.max(0, value - 1))} type="button"><Minus size={15} /></button>
      <b>{count}</b>
      <button aria-label={`Increase ${label}`} onClick={() => setCount((value) => value + 1)} type="button"><Plus size={15} /></button>
    </div>
  </div>;
}

function MemberIdentity({ labels }: { labels: typeof copy.th | typeof copy.en }) {
  return <div className={styles.memberIdentity}>
    <div><UserRound size={18} /><span><small>{labels.nickname}</small><strong>{labels.memberName}</strong></span></div>
    <div><span className={styles.discordMark}>◉</span><span><small>{labels.contact}</small><strong>{labels.memberContact}</strong></span></div>
  </div>;
}

function GuestIdentity({ labels }: { labels: typeof copy.th | typeof copy.en }) {
  return <div className={styles.guestIdentity}>
    <label>{labels.nickname}<span>*</span><input placeholder="เช่น Lunaris, StarWalker" type="text" /></label>
    <label>{labels.contact}<span>*</span><div className={styles.contactFields}><select defaultValue="discord"><option value="discord">Discord</option><option value="email">Email</option><option value="facebook">Facebook</option><option value="x">X</option></select><input placeholder="เช่น @username" type="text" /></div></label>
  </div>;
}

export function EstimateRequestDialog({ locale, onClose, service }: EstimateRequestDialogProps) {
  const labels = copy[locale];
  const [customerMode, setCustomerMode] = useState<CustomerMode>("member");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div aria-label={labels.title} aria-modal="true" className={styles.estimateBackdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} ref={dialogRef} role="dialog">
    <section className={styles.estimateDialog}>
      <div className={styles.estimateSteps}>
        {labels.steps.map((step, index) => <div className={index === 0 ? styles.activeStep : undefined} key={step}><b>{index + 1}</b><span>{step}</span>{index < labels.steps.length - 1 ? <i /> : null}</div>)}
      </div>
      <button aria-label="Close" className={styles.estimateClose} onClick={onClose} ref={closeRef} type="button"><X /></button>

      <header className={styles.estimateHeader}>
        <div><h2>{labels.title} <Sparkles aria-hidden="true" size={23} /></h2><p>{labels.subtitle}</p></div>
        <div className={styles.lockedService}><UsersRound size={20} /><strong>{service.name[locale]}</strong><span>{labels.locked}</span></div>
      </header>

      <p className={styles.estimateNotice}><span>ⓘ</span>{labels.notice}</p>

      <form className={styles.estimateForm} onSubmit={(event) => event.preventDefault()}>
        <section className={styles.estimatePanel}>
          <h3><UserRound size={20} />{labels.customer}</h3>
          <p>{labels.modeLabel}</p>
          <div className={styles.customerMode}>
            <button aria-pressed={customerMode === "member"} onClick={() => setCustomerMode("member")} type="button"><UserRound size={17} />{labels.member}</button>
            <button aria-pressed={customerMode === "guest"} onClick={() => setCustomerMode("guest")} type="button"><UserRound size={17} />{labels.guest}</button>
          </div>
          {customerMode === "member" ? <MemberIdentity labels={labels} /> : <GuestIdentity labels={labels} />}
          <fieldset className={styles.usageFieldset}><legend>{labels.usage}<span>*</span></legend><div><label><input defaultChecked name="usage" type="radio" />{labels.personal}<Sparkles size={15} /></label><label><input name="usage" type="radio" />{labels.commercial}</label></div></fieldset>
          <label className={styles.formField}>{labels.budget}<span>*</span><div className={styles.budgetFields}><select defaultValue="range"><option value="range">{labels.budgetType}</option><option value="open">Open budget</option></select><input inputMode="numeric" placeholder={labels.min} /><em>{locale === "th" ? "ถึง" : "to"}</em><input inputMode="numeric" placeholder={labels.max} /></div></label>
          <label className={styles.formField}>{labels.deadline}<span>*</span><div className={styles.dateField}><input aria-label={labels.deadline} type="date" /><span><CalendarDays size={18} />{labels.date}</span></div></label>
        </section>

        <section className={styles.estimatePanel}>
          <h3><UsersRound size={20} />{labels.work}</h3>
          <label className={styles.formField}>{labels.details}<span>*</span><textarea maxLength={1000} placeholder={labels.detailsHint} /><small>0/1000</small></label>
          <label className={styles.formField}>{labels.mood}<textarea maxLength={800} placeholder={labels.moodHint} /><small>0/800</small></label>
          <fieldset className={styles.extrasFieldset}><legend>{labels.extras}</legend><div><Counter hint={labels.extraPeopleHint} label={labels.extraPeople} /><Counter hint={labels.backgroundHint} label={labels.background} /><Counter hint={labels.propsHint} label={labels.props} /></div></fieldset>
          <div className={styles.referenceField}>
            <div><strong>{labels.references}</strong><span>{labels.referenceLimit}</span></div>
            <small>{labels.referencesHint}</small>
            <label><ImagePlus size={25} /><strong>{labels.addReference}</strong><span>{labels.dropReference}</span><input accept="image/png,image/jpeg,image/webp" multiple type="file" /></label>
          </div>
        </section>

        <div className={styles.estimateFooter}>
          <label className={styles.legalCheck}><input type="checkbox" /><span>{labels.accept} <a href={`/${locale}/documents/privacy-policy`}>{labels.privacy}</a> {labels.and} <a href={`/${locale}/documents/commission-terms`}>{labels.terms}</a> {labels.legalSuffix}</span></label>
          <p><span>ⓘ</span>{labels.finalNotice}</p>
          <div><button className={styles.draftButton} type="button"><Save size={18} />{labels.draft}</button><button className={styles.reviewButton} type="submit"><Sparkles size={18} />{labels.review}<Check size={18} /></button></div>
        </div>
      </form>
    </section>
  </div>;
}
