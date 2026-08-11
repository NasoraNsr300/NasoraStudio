"use client";

import {
  CalendarDays,
  Check,
  Info,
  Minus,
  Plus,
  Save,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { createCommissionRequestRepository, type CommissionRequestClient } from "@/features/commission/data/commission-request-repository";
import { parseEstimateRequest, toCommissionRequestRpcPayload } from "@/features/commission/domain/estimate-request";
import { useOptionalAuthSession } from "@/shared/auth/auth-session-provider";
import type { AuthIdentity, AuthStatus } from "@/shared/auth/auth-types";
import type { Locale } from "@/shared/i18n/locales";
import { createSupabaseBrowserClient } from "@/shared/supabase/client";
import type { ServiceType } from "@/shared/types/public-content";
import { useOptionalPublicSiteSettings } from "@/features/site-settings/components/public-site-settings-provider";

import { GuestEstimateIdentity, MemberEstimateIdentity } from "./estimate-request-identity";
import styles from "./commission.module.css";

type CustomerMode = "member" | "guest";
type UsageType = "personal" | "commercial";

type EstimateRequestDialogProps = {
  auth?: { status: AuthStatus; user: AuthIdentity | null };
  commissionsOpen?: boolean;
  locale: Locale;
  onClose(): void;
  repository?: ReturnType<typeof createCommissionRequestRepository>;
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
    guestNameHint: "เช่น Lunaris, StarWalker",
    contactHint: "เช่น @username",
    draftUnavailable: "ระบบบันทึกร่างจะเปิดให้ใช้ภายหลัง",
    sending: "กำลังส่ง...",
    sent: "ส่งแบบประเมินแล้ว เลขอ้างอิงของคุณคือ",
    identityLoading: "กำลังโหลดข้อมูลสมาชิก...",
    invalid: "กรุณาตรวจสอบข้อมูลที่กรอก",
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
    guestNameHint: "For example: Lunaris, StarWalker",
    contactHint: "For example: @username",
    draftUnavailable: "Draft saving will be available later",
    sending: "Submitting...",
    sent: "Your estimate request was sent. Reference:",
    identityLoading: "Loading member information...",
    invalid: "Please check the information you entered",
  },
} as const;

function Counter({ count, disabled, label, hint, onChange }: { count: number; disabled: boolean; hint: string; label: string; onChange(value: number): void }) {
  return <div className={styles.estimateCounter}>
    <span><strong>{label}</strong><small>{hint}</small></span>
    <div>
      <button aria-label={`Decrease ${label}`} disabled={disabled || count === 0} onClick={() => onChange(Math.max(0, count - 1))} type="button"><Minus size={15} /></button>
      <b>{count}</b>
      <button aria-label={`Increase ${label}`} disabled={disabled || count >= 20} onClick={() => onChange(Math.min(20, count + 1))} type="button"><Plus size={15} /></button>
    </div>
  </div>;
}

function localIsoDate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function titleCaseSlug(slug: string) {
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function newSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function EstimateRequestDialog({ auth, commissionsOpen: commissionsOpenOverride, locale, onClose, repository, service }: EstimateRequestDialogProps) {
  const labels = copy[locale];
  const publicSettings = useOptionalPublicSiteSettings();
  const commissionsOpen = commissionsOpenOverride ?? publicSettings?.commissionsOpen ?? true;
  const contextualAuth = useOptionalAuthSession();
  const session = auth ?? contextualAuth ?? { status: "signedOut" as const, user: null };
  const customerMode: CustomerMode = session.status === "signedIn" ? "member" : "guest";
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const repositoryRef = useRef(repository ?? null);
  const [identity, setIdentity] = useState({ contact: session.user?.email ?? "", nickname: session.user?.nickname ?? labels.memberName });
  const [loadedIdentityUserId, setLoadedIdentityUserId] = useState<string | null>(null);
  const [extraCharacterCount, setExtraCharacterCount] = useState(0);
  const [backgroundLevel, setBackgroundLevel] = useState(0);
  const [propCount, setPropCount] = useState(0);
  const [budgetKind, setBudgetKind] = useState<"open" | "range">("range");
  const [usageType, setUsageType] = useState<UsageType>("personal");
  const [description, setDescription] = useState("");
  const [moodAndStyle, setMoodAndStyle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestCode, setRequestCode] = useState<string | null>(null);
  const [submissionKey] = useState(newSubmissionKey);
  const identityLoading = session.status === "loading"
    || (session.status === "signedIn" && loadedIdentityUserId !== session.user?.id);
  const disabled = !commissionsOpen || session.status === "loading" || submitting || requestCode !== null;

  useEffect(() => {
    if (repository) repositoryRef.current = repository;
  }, [repository]);

  const getRepository = useCallback(() => {
    if (!repositoryRef.current) {
      repositoryRef.current = createCommissionRequestRepository(
        createSupabaseBrowserClient() as unknown as CommissionRequestClient,
      );
    }
    return repositoryRef.current;
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (session.status !== "signedIn" || !session.user) return;
    let active = true;
    void getRepository().loadMemberIdentity(session.user.id, session.user.email).then((result) => {
      if (!active) return;
      if (result.ok) setIdentity({ contact: result.data.contact.value, nickname: result.data.nickname });
      setLoadedIdentityUserId(session.user?.id ?? null);
    });
    return () => { active = false; };
  }, [getRepository, session.status, session.user]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commissionsOpen || submitting || requestCode) return;
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const minThb = Number(form.get("budgetMin"));
      const maxThb = Number(form.get("budgetMax"));
      const parsed = parseEstimateRequest({
        acceptedLegal: form.get("acceptedLegal") === "on",
        backgroundLevel,
        budget: budgetKind === "open" ? { kind: "open" } : { kind: "range", maxThb, minThb },
        description,
        extraCharacterCount,
        guest: customerMode === "guest" ? {
          contactKind: form.get("guestContactKind"),
          contactValue: form.get("guestContactValue"),
          displayName: form.get("guestDisplayName"),
        } : undefined,
        moodAndStyle,
        propCount,
        requestedDeadline: deadline,
        requesterMode: customerMode,
        submissionKey,
        usageType,
      }, localIsoDate());
      const categoryName = titleCaseSlug(service.categorySlug);
      const payload = toCommissionRequestRpcPayload(parsed, {
        categoryName: { en: categoryName, th: categoryName },
        categorySlug: service.categorySlug,
        serviceName: service.name,
        serviceTypeSlug: service.slug,
      });
      setSubmitting(true);
      const result = await getRepository().submit(payload);
      if (result.ok) setRequestCode(result.data.requestCode);
      else setError(result.message);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : labels.invalid);
    } finally {
      setSubmitting(false);
    }
  };

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

      <p className={styles.estimateNotice}><Info aria-hidden="true" size={16} />{labels.notice}</p>
      {!commissionsOpen ? <p className={styles.estimateFeedback} role="status">
        {locale === "th" ? "ขณะนี้ปิดรับแบบประเมินใหม่" : "New estimate requests are currently closed."}
      </p> : null}

      <form className={styles.estimateForm} onSubmit={submit}>
        <section className={styles.estimatePanel}>
          <h3><UserRound size={20} />{labels.customer}</h3>
          <p>{labels.modeLabel}</p>
          <div className={styles.customerMode}>
            <button aria-pressed={customerMode === "member"} disabled type="button"><UserRound size={17} />{labels.member}</button>
            <button aria-pressed={customerMode === "guest"} disabled type="button"><UserRound size={17} />{labels.guest}</button>
          </div>
          {customerMode === "member" ? <MemberEstimateIdentity contact={identity.contact} labels={labels} loading={identityLoading} nickname={identity.nickname} /> : <GuestEstimateIdentity disabled={disabled} labels={labels} />}
          <fieldset className={styles.usageFieldset} disabled={disabled}>
            <legend>{labels.usage}<span>*</span></legend>
            <div>
              <label data-selected={usageType === "personal"}>
                <input checked={usageType === "personal"} name="usage" onChange={() => setUsageType("personal")} type="radio" value="personal" />
                {labels.personal}<Sparkles size={15} />
              </label>
              <label data-selected={usageType === "commercial"}>
                <input checked={usageType === "commercial"} name="usage" onChange={() => setUsageType("commercial")} type="radio" value="commercial" />
                {labels.commercial}
              </label>
            </div>
          </fieldset>
          <label className={styles.formField}>{labels.budget}<span>*</span><div className={styles.budgetFields}><select disabled={disabled} name="budgetKind" onChange={(event) => setBudgetKind(event.target.value === "open" ? "open" : "range")} value={budgetKind}><option value="range">{labels.budgetType}</option><option value="open">Open budget</option></select><input disabled={disabled || budgetKind === "open"} inputMode="numeric" min="0" name="budgetMin" placeholder={labels.min} required={budgetKind === "range"} type="number" /><em>{locale === "th" ? "ถึง" : "to"}</em><input disabled={disabled || budgetKind === "open"} inputMode="numeric" min="0" name="budgetMax" placeholder={labels.max} required={budgetKind === "range"} type="number" /></div></label>
          <label className={styles.formField}>{labels.deadline}<span>*</span><div className={styles.dateField}><input aria-label={labels.deadline} disabled={disabled} min={localIsoDate()} onChange={(event) => setDeadline(event.target.value)} required type="date" value={deadline} /><span><CalendarDays size={18} />{deadline || labels.date}</span></div></label>
        </section>

        <section className={styles.estimatePanel}>
          <h3><UsersRound size={20} />{labels.work}</h3>
          <label className={styles.formField}>{labels.details}<span>*</span><textarea aria-label={labels.details} disabled={disabled} maxLength={1000} onChange={(event) => setDescription(event.target.value)} placeholder={labels.detailsHint} required value={description} /><small>{description.length}/1000</small></label>
          <label className={styles.formField}>{labels.mood}<textarea aria-label={labels.mood} disabled={disabled} maxLength={800} onChange={(event) => setMoodAndStyle(event.target.value)} placeholder={labels.moodHint} value={moodAndStyle} /><small>{moodAndStyle.length}/800</small></label>
          <fieldset className={styles.extrasFieldset}><legend>{labels.extras}</legend><div><Counter count={extraCharacterCount} disabled={disabled} hint={labels.extraPeopleHint} label={labels.extraPeople} onChange={setExtraCharacterCount} /><Counter count={backgroundLevel} disabled={disabled} hint={labels.backgroundHint} label={labels.background} onChange={setBackgroundLevel} /><Counter count={propCount} disabled={disabled} hint={labels.propsHint} label={labels.props} onChange={setPropCount} /></div></fieldset>
        </section>

        <div className={styles.estimateFooter}>
          {error ? <p className={styles.estimateFeedback} role="alert">{error}</p> : null}
          {requestCode ? <p className={styles.estimateFeedback} role="status">{labels.sent} <strong>{requestCode}</strong></p> : null}
          <label className={styles.legalCheck}><input disabled={disabled} name="acceptedLegal" type="checkbox" /><span>{labels.accept} <a href={`/${locale}/documents/privacy-policy`}>{labels.privacy}</a> {labels.and} <a href={`/${locale}/documents/commission-terms`}>{labels.terms}</a> {labels.legalSuffix}</span></label>
          <p><Info aria-hidden="true" size={15} />{labels.finalNotice}</p>
          <div><button className={styles.draftButton} disabled title={labels.draftUnavailable} type="button"><Save size={18} />{labels.draft}</button><button className={styles.reviewButton} disabled={disabled || identityLoading} type="submit"><Sparkles size={18} />{submitting ? labels.sending : labels.review}<Check size={18} /></button></div>
        </div>
      </form>
    </section>
  </div>;
}
