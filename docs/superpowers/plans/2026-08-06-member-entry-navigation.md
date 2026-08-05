# แผนพัฒนาทางเข้าสู่พื้นที่สมาชิกและระบบนำทาง

> **สำหรับ Agent ที่นำแผนไปทำ:** ต้องใช้ sub-skill `superpowers:executing-plans` และทำตามรายการทีละงาน โดยใช้ช่อง `- [ ]` ติดตามสถานะ

**เป้าหมาย:** ปรับปุ่ม Floating มุมขวาล่างให้เปิดเมนูแจ้งเตือนและพื้นที่สมาชิก พร้อมเปลี่ยนหน้าสมาชิกทั้งหมดไปใช้แท็บแนวนอน

**สถาปัตยกรรม:** แยก Account Popover ซึ่งอยู่ใน Public Shell ออกจาก Member Tabs ซึ่งใช้เฉพาะหน้าสมาชิก แต่ละหน้าสมาชิกยังเก็บเนื้อหาและ Layout ของตัวเองไว้ แบ่งปันเฉพาะระบบนำทางเพื่อไม่ให้การแก้ Layout หนึ่งหน้ากระทบอีกหน้า

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Lucide React, Vitest และ Testing Library

## ข้อจำกัดส่วนกลาง

- คง Sidebar หลักของเว็บไซต์ไว้ตามเดิม
- Floating Button มีเพียง “แจ้งเตือน” และ “พื้นที่สมาชิก”
- พื้นที่สมาชิกเปิดหน้า `/{locale}/member/requests`
- หน้าสมาชิกใช้แท็บ แบบประเมิน, ข้อความ, การชำระเงิน และโปรไฟล์
- งานรอบนี้ใช้ข้อมูลตัวอย่างและ Interaction ภายในหน้าเท่านั้น ยังไม่เชื่อม Backend
- ห้ามรวม Layout เนื้อหาของหน้าสมาชิกแต่ละหน้าเป็น Component เดียวกัน

---

## โครงสร้างไฟล์

- `src/shared/components/public-shell/account-button.tsx` — ควบคุมปุ่ม Floating และสถานะแผงที่เปิด
- `src/shared/components/public-shell/account-menu.tsx` — แสดงสองทางเลือกและรายการแจ้งเตือนตัวอย่าง
- `src/shared/components/public-shell/public-shell.module.css` — Style เฉพาะ Floating Button และ Popover
- `src/features/member/components/member-tabs.tsx` — แท็บนำทางร่วมของพื้นที่สมาชิก
- `src/features/member/components/member-tabs.module.css` — Style แท็บเท่านั้น
- `src/features/member/components/member-*-page.tsx` — เนื้อหาแต่ละหน้าซึ่งเพิ่ม Member Tabs ของตัวเอง
- `src/features/member/components/member-pages.module.css` และ `member.module.css` — ปรับพื้นที่เนื้อหาจากสองคอลัมน์เป็นคอลัมน์เดียว
- `tests/components/public-shell.test.tsx` — ตรวจพฤติกรรม Floating Button และ Popover
- `tests/components/member-navigation.test.tsx` — ตรวจลิงก์ แท็บที่ Active และ Badge ข้อความ

---

### งานที่ 1: Floating Account Popover

**ไฟล์:**
- สร้าง: `src/shared/components/public-shell/account-menu.tsx`
- แก้ไข: `src/shared/components/public-shell/account-button.tsx`
- แก้ไข: `src/shared/components/public-shell/public-shell.module.css`
- ทดสอบ: `tests/components/public-shell.test.tsx`

**Interfaces:**
- รับ: `locale: Locale`
- สร้าง: `AccountMenu({ locale, onClose, onShowNotifications })`
- สร้าง: `NotificationPanel({ locale, onBack, onClose })`

- [ ] **ขั้นที่ 1: เพิ่มการทดสอบพฤติกรรมเมนู Floating**

เพิ่มกรณีทดสอบที่กดปุ่ม Account แล้วพบลิงก์ `Member area` ซึ่งชี้ไป `/en/member/requests` และปุ่ม `Notifications` จากนั้นกด Notifications แล้วพบหัวข้อ `Notifications` และปุ่มย้อนกลับ

```tsx
it("opens the signed-in account menu and notification panel", async () => {
  const user = userEvent.setup();
  navigation.pathname = "/en";
  navigation.usePathname.mockImplementation(() => navigation.pathname);
  render(<PublicShell locale="en"><main>Page content</main></PublicShell>);

  await user.click(screen.getByRole("button", { name: "Account" }));
  expect(screen.getByRole("link", { name: "Member area" })).toHaveAttribute("href", "/en/member/requests");
  await user.click(screen.getByRole("button", { name: /Notifications/ }));
  expect(screen.getByRole("heading", { name: "Notifications" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Back to account menu" })).toBeVisible();
});
```

- [ ] **ขั้นที่ 2: รันเฉพาะการทดสอบ Public Shell เพื่อยืนยันว่าเคสใหม่ยังไม่ผ่าน**

รัน: `npm test -- tests/components/public-shell.test.tsx`

ผลที่คาดหวัง: FAIL เพราะยังไม่มีลิงก์ Member area และปุ่ม Notifications

- [ ] **ขั้นที่ 3: สร้าง Account Menu และ Notification Panel**

ใช้สถานะ `"menu" | "notifications" | null` ใน `AccountButton` และสร้าง Component ที่มีโครงหลักดังนี้:

```tsx
export function AccountMenu({ locale, onClose, onShowNotifications }: AccountMenuProps) {
  const th = locale === "th";
  return <section aria-label={th ? "เมนูบัญชี" : "Account menu"} className={styles.accountPanel}>
    <button onClick={onShowNotifications} type="button">
      <Bell size={18} />{th ? "แจ้งเตือน" : "Notifications"}<b aria-label={th ? "3 รายการที่ยังไม่ได้อ่าน" : "3 unread"}>3</b>
    </button>
    <Link href={`/${locale}/member/requests`} onClick={onClose}>
      <LayoutDashboard size={18} />{th ? "พื้นที่สมาชิก" : "Member area"}
    </Link>
  </section>;
}
```

Notification Panel ใช้ข้อมูลตัวอย่าง 3 รายการและมีปุ่มย้อนกลับ เมนูต้องปิดเมื่อกด Escape หรือกดพื้นที่นอก `.accountControl`

- [ ] **ขั้นที่ 4: ปรับ Style ให้ Popover อยู่เหนือ Floating Button และมีสองเมนูชัดเจน**

กำหนด `.accountPanel` ให้กว้างประมาณ `18rem` และเพิ่ม `.accountMenuItem`, `.notificationHeader`, `.notificationList` โดยใช้สีทองสำหรับ Active/Badge และพื้นหลังเดียวกับกล่องใน Mockup ปัจจุบัน

- [ ] **ขั้นที่ 5: รันการทดสอบเฉพาะไฟล์อีกครั้ง**

รัน: `npm test -- tests/components/public-shell.test.tsx`

ผลที่คาดหวัง: PASS ทุกกรณีในไฟล์

- [ ] **ขั้นที่ 6: Commit งาน Floating Popover**

```powershell
git add -- src/shared/components/public-shell/account-button.tsx src/shared/components/public-shell/account-menu.tsx src/shared/components/public-shell/public-shell.module.css tests/components/public-shell.test.tsx
git commit -m "feat: add member account popover"
```

---

### งานที่ 2: แท็บนำทางของพื้นที่สมาชิก

**ไฟล์:**
- สร้าง: `src/features/member/components/member-tabs.tsx`
- สร้าง: `src/features/member/components/member-tabs.module.css`
- สร้าง: `tests/components/member-navigation.test.tsx`

**Interfaces:**
- สร้าง type: `MemberTab = "requests" | "messages" | "payments" | "profile"`
- สร้าง Component: `MemberTabs({ active, locale }: { active: MemberTab; locale: Locale })`

- [ ] **ขั้นที่ 1: เขียนการทดสอบแท็บสมาชิก**

```tsx
it("renders direct member links and marks the current tab", () => {
  render(<MemberTabs active="messages" locale="en" />);
  expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("href", "/en/member/requests");
  expect(screen.getByRole("link", { name: /Messages/ })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute("href", "/en/member/payments");
  expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/en/member/profile");
});
```

- [ ] **ขั้นที่ 2: รันการทดสอบเพื่อยืนยันว่า Component ยังไม่มี**

รัน: `npm test -- tests/components/member-navigation.test.tsx`

ผลที่คาดหวัง: FAIL เพราะยัง import `MemberTabs` ไม่ได้

- [ ] **ขั้นที่ 3: สร้าง Member Tabs**

```tsx
export type MemberTab = "requests" | "messages" | "payments" | "profile";

export function MemberTabs({ active, locale }: { active: MemberTab; locale: Locale }) {
  return <nav aria-label={locale === "th" ? "เมนูพื้นที่สมาชิก" : "Member area"} className={styles.tabs}>
    {tabs.map(({ icon: Icon, id }) => <Link aria-current={active === id ? "page" : undefined} href={`/${locale}/member/${id}`} key={id}>
      <Icon size={18} />{labels[locale][id]}{id === "messages" ? <b aria-label={locale === "th" ? "3 ข้อความที่ยังไม่ได้อ่าน" : "3 unread messages"}>3</b> : null}
    </Link>)}
  </nav>;
}
```

- [ ] **ขั้นที่ 4: ทำ Style แถบแนวนอน**

ใช้ Grid 4 คอลัมน์ ความสูงประมาณ `3.25rem` ขอบสีเดียวกับ Surface และทำแท็บ Active เป็นพื้นหลังไล่สีม่วงพร้อมเส้นทองด้านล่าง โดยไม่กำหนด Layout ของเนื้อหาหน้าอื่นในไฟล์นี้

- [ ] **ขั้นที่ 5: รันการทดสอบแท็บ**

รัน: `npm test -- tests/components/member-navigation.test.tsx`

ผลที่คาดหวัง: PASS

- [ ] **ขั้นที่ 6: Commit แท็บสมาชิก**

```powershell
git add -- src/features/member/components/member-tabs.tsx src/features/member/components/member-tabs.module.css tests/components/member-navigation.test.tsx
git commit -m "feat: add member area tabs"
```

---

### งานที่ 3: นำแท็บไปใช้กับหน้าสมาชิกทั้งหมด

**ไฟล์:**
- แก้ไข: `src/features/member/components/member-requests-page.tsx`
- แก้ไข: `src/features/member/components/member-messages-page.tsx`
- แก้ไข: `src/features/member/components/member-payments-page.tsx`
- แก้ไข: `src/features/member/components/member-profile-page.tsx`
- แก้ไข: `src/features/member/components/member-job-page.tsx`
- แก้ไข: `src/features/member/components/member-pages.module.css`
- แก้ไข: `src/features/member/components/member.module.css`
- ลบ: `src/features/member/components/member-sidebar.tsx`
- ลบ: `src/features/member/components/member-sidebar.module.css`

**Interfaces:**
- ใช้: `MemberTabs({ active, locale })`
- คง Route เดิม: `/member/requests`, `/member/messages`, `/member/payments`, `/member/profile`, `/member/jobs/[jobId]`

- [ ] **ขั้นที่ 1: เปลี่ยนหน้าภาพรวมทั้ง 4 หน้าไปใช้ Member Tabs**

ในแต่ละหน้าให้ใช้โครงเดียวเฉพาะส่วนกรอบนอก โดยเนื้อหาภายในยังอยู่ใน Component เดิม:

```tsx
return <main className={styles.memberArea}>
  <MemberTabs active="requests" locale={locale} />
  <section className={styles.pagePanel}>{/* เนื้อหาเดิมของหน้านี้ */}</section>
</main>;
```

เปลี่ยนค่า `active` ให้ตรงกับ messages, payments และ profile ในแต่ละไฟล์

- [ ] **ขั้นที่ 2: ปรับหน้ารายละเอียดงานให้ใช้แท็บเดียวกัน**

ลบ `memberRail`, identity และ navigation ที่ประกาศซ้ำใน `member-job-page.tsx` จากนั้นวาง `<MemberTabs active="requests" locale={locale} />` เหนือ `<section className={styles.jobWorkspace}>`

- [ ] **ขั้นที่ 3: ปรับ Layout จากสองคอลัมน์เป็นคอลัมน์เดียว**

แก้ `.memberArea` และ `.memberPage` เป็น Grid หนึ่งคอลัมน์ ความกว้าง `var(--page-shell-width)` และให้แท็บอยู่เหนือ Panel โดยไม่แก้ Grid ภายในของ Messages, Payments, Profile หรือ Job Workspace

- [ ] **ขั้นที่ 4: ลบ Sidebar สมาชิกที่ไม่มีผู้ใช้งาน**

ลบ `member-sidebar.tsx` และ `member-sidebar.module.css` หลัง `rg -n "MemberSidebar|member-sidebar" src` ไม่พบ import ที่เหลือ

- [ ] **ขั้นที่ 5: ตรวจ TypeScript และ Diff**

รัน: `npm run typecheck`

ผลที่คาดหวัง: Exit code 0

รัน: `git diff --check`

ผลที่คาดหวัง: ไม่มี whitespace error

- [ ] **ขั้นที่ 6: ตรวจภาพ UI เฉพาะหน้าที่แก้**

เปิดที่ความกว้าง PC 1920×1080:

- `/th/member/requests`
- `/th/member/messages`
- `/th/member/payments`
- `/th/member/profile`
- `/th/member/jobs/demo`

ผลที่คาดหวัง: ทุกหน้ามีแท็บชุดเดียวกัน ไม่มี Sidebar สมาชิก เนื้อหากว้างเท่าหน้าอื่น และ Floating Button เปิดสองตัวเลือกได้

- [ ] **ขั้นที่ 7: Commit การเชื่อมหน้าสมาชิก**

```powershell
git add -- src/features/member/components
git commit -m "style: unify member area navigation"
```

---

## ตรวจทานแผน

- ทุกข้อในเอกสารออกแบบมีงานรองรับครบ
- ไม่มี Placeholder หรือขั้นตอนที่ต้องเดาเอง
- `MemberTab` และค่า `active` ใช้ชื่อเดียวกันทุกงาน
- ไม่แก้หรือนำ Layout เนื้อหาของหน้าสมาชิกมารวมกัน
- ไม่รวมไฟล์ `next-env.d.ts` และการแก้ `home.module.css` ที่มีอยู่ก่อนหน้าใน Commit
