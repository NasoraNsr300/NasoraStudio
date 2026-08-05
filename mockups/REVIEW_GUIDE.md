# Nasora Desktop Mockups — Review Guide

ชุดภาพร่างนี้สร้างด้วย built-in image generation เพื่อใช้ตรวจทิศทางหน้าตาและลำดับข้อมูลก่อนพัฒนาระบบจริง รูปผลงาน ราคา ชื่อลูกค้า วันที่ และข้อความบางส่วนเป็นข้อมูลตัวอย่าง

| หมายเลข | หน้าจอ | ไฟล์ |
|---|---|---|
| 01 | Home | `nasora-home-night-v1.png` |
| 02 | Queue | `nasora-queue-night-v1.png` |
| 03 | Portfolio | `nasora-portfolio-night-v1.png` |
| 04 | Commission Albums | `nasora-commission-albums-night-v1.png` |
| 05 | Illustration Album | `nasora-illustration-album-night-v1.png` |
| 06 | Service Details & Price | `nasora-service-details-night-v1.png` |
| 07 | Estimate Form | `nasora-estimate-form-night-v1.png` |
| 08 | Document Center | `nasora-document-center-night-v1.png` |
| 09 | Member Job | `nasora-member-job-night-v1.png` |
| 10 | Admin Dashboard | `nasora-admin-dashboard-night-v1.png` |

## Prompt direction

- High-fidelity 16:9 desktop UI mockup for Nasora
- Celestial night theme using `#090D1F`, amber `#F6C85F`, lavender `#C4B5FD`
- Shared floating navbar and bottom-right account button on public pages
- Independent page layouts for Home, Portfolio, Commission Albums, Member, and Admin
- Clear Thai-first information hierarchy with TH/EN controls
- No footer, no login control in navbar, no excessive glass effects
- Artwork and business data are placeholders and will be replaced during implementation

## Approved changes after mockup review

- `01 Home`: Hero selects one random enabled image on page open or refresh and stays stable for the visit; featured work advances automatically with accessible pause and manual controls
- `04 Commission Albums`: replace the tall information-heavy concept with image-led album tiles using a bottom gradient, bottom-left title, and bottom-right item-count pill
- `07 Estimate Form`: signed-in users see a prefilled Member module; signed-out users see Guest name and contact fields
- `09 Member/Profile`: member can edit nickname, manage multiple contact channels and default contact, and securely manage password

## วิธีส่งรายการแก้

อ้างอิงหมายเลขหน้าและส่วนที่ต้องการแก้ เช่น:

`04 — เปลี่ยนการ์ดอัลบั้มเป็น 3 คอลัมน์ และลดขนาดหัวข้อ`
