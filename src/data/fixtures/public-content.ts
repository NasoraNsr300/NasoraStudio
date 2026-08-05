import type {
  DocumentSummary,
  FeaturedItem,
  HeroItem,
  LocalizedText,
  PortfolioItem,
  PublicMedia,
  ServiceCategory,
  ServiceType,
} from "@/shared/types/public-content";

const media = {
  moonlit: {
    id: "fixture-moonlit",
    kind: "image",
    alt: { th: "ตัวละครใต้แสงจันทร์", en: "Character under moonlight" },
    thumbnailSrc: "/fixtures/moonlit.svg",
    cardSrc: "/fixtures/moonlit.svg",
    detailSrc: "/fixtures/moonlit.svg",
    width: 1600,
    height: 1000,
  },
  amber: {
    id: "fixture-amber",
    kind: "image",
    alt: { th: "ตัวละครในแสงสีอำพัน", en: "Character in amber light" },
    thumbnailSrc: "/fixtures/amber.svg",
    cardSrc: "/fixtures/amber.svg",
    detailSrc: "/fixtures/amber.svg",
    width: 1600,
    height: 1000,
  },
  violet: {
    id: "fixture-violet",
    kind: "image",
    alt: { th: "ภาพประกอบโทนม่วง", en: "Violet illustration" },
    thumbnailSrc: "/fixtures/violet.svg",
    cardSrc: "/fixtures/violet.svg",
    detailSrc: "/fixtures/violet.svg",
    width: 1200,
    height: 1500,
  },
  forest: {
    id: "fixture-forest",
    kind: "image",
    alt: { th: "ภาพประกอบในป่า", en: "Forest illustration" },
    thumbnailSrc: "/fixtures/forest.svg",
    cardSrc: "/fixtures/forest.svg",
    detailSrc: "/fixtures/forest.svg",
    width: 1400,
    height: 1000,
  },
  sky: {
    id: "fixture-sky",
    kind: "image",
    alt: { th: "ตัวละครบนท้องฟ้ายามค่ำ", en: "Character in a night sky" },
    thumbnailSrc: "/fixtures/sky.svg",
    cardSrc: "/fixtures/sky.svg",
    detailSrc: "/fixtures/sky.svg",
    width: 1600,
    height: 1200,
  },
  reel: {
    id: "fixture-reel",
    kind: "video",
    alt: { th: "ตัวอย่างภาพเคลื่อนไหว", en: "Animated artwork sample" },
    thumbnailSrc: "/fixtures/amber.svg",
    cardSrc: "/fixtures/amber.svg",
    detailSrc: "/fixtures/fixture-reel.mp4",
    posterSrc: "/fixtures/amber.svg",
    width: 1600,
    height: 900,
  },
} satisfies Record<string, PublicMedia>;

export const heroItems: HeroItem[] = [
  {
    id: "hero-moonlit",
    title: { th: "งานวาดที่เล่าเรื่องของคุณ", en: "Artwork that tells your story" },
    description: { th: "คอมมิชชันและภาพประกอบโดย Nasora", en: "Commissions and illustrations by Nasora" },
    media: media.moonlit,
    crop: { aspectRatio: "16 / 9", objectPosition: "50% 42%" },
    enabled: true,
    selectionWeight: 2,
  },
  {
    id: "hero-amber",
    title: { th: "ยินดีต้อนรับสู่จักรวาลของ Nasora", en: "Welcome to Nasora's universe" },
    description: { th: "เลือกดูผลงานและบริการคอมมิชชัน", en: "Browse artwork and commission services" },
    media: media.amber,
    crop: { aspectRatio: "16 / 9", objectPosition: "50% 50%" },
    enabled: true,
    selectionWeight: 1,
  },
];

export const featuredItems: FeaturedItem[] = [
  {
    id: "featured-starlit",
    title: { th: "Starlit Traveler", en: "Starlit Traveler" },
    description: { th: "ภาพประกอบคาแรกเตอร์โทนกลางคืน", en: "A nocturnal character illustration" },
    media: media.violet,
    crop: { aspectRatio: "4 / 5", objectPosition: "50% 42%" },
    displayOrder: 1,
    destination: "/portfolio?work=starlit-traveler",
  },
  {
    id: "featured-forest",
    title: { th: "Forest Letter", en: "Forest Letter" },
    description: { th: "ฉากเล่าเรื่องที่อบอุ่น", en: "A warm narrative scene" },
    media: media.forest,
    crop: { aspectRatio: "4 / 5", objectPosition: "48% 50%" },
    displayOrder: 2,
    destination: "/portfolio?work=forest-letter",
  },
  {
    id: "featured-sky", title: { th: "Blue Hour", en: "Blue Hour" },
    description: { th: "แสงยามโพล้เพล้", en: "A quiet blue-hour study" },
    media: media.sky, crop: { aspectRatio: "4 / 5", objectPosition: "50% 45%" }, displayOrder: 3,
    destination: "/portfolio?work=blue-hour",
  },
];

export const portfolioItems: PortfolioItem[] = [
  {
    id: "portfolio-starlit-traveler", title: featuredItems[0].title, description: featuredItems[0].description,
    category: "illustration", media: media.violet,
    crop: { aspectRatio: "4 / 5", objectPosition: "50% 42%", gridSpan: "tall" }, displayOrder: 1, featured: true,
  },
  {
    id: "portfolio-forest-letter", title: featuredItems[1].title, description: featuredItems[1].description,
    category: "illustration", media: media.forest,
    crop: { aspectRatio: "4 / 3", objectPosition: "48% 50%", gridSpan: "wide" }, displayOrder: 2, featured: true,
  },
  {
    id: "portfolio-blue-hour", title: featuredItems[2].title, description: featuredItems[2].description,
    category: "character", media: media.sky,
    crop: { aspectRatio: "4 / 3", objectPosition: "50% 45%", gridSpan: "standard" }, displayOrder: 3, featured: false,
  },
  {
    id: "portfolio-amber-motion", title: { th: "Amber Motion", en: "Amber Motion" },
    description: { th: "ตัวอย่างงานวิดีโอสั้น", en: "Short motion artwork sample" }, category: "motion", media: media.reel,
    crop: { aspectRatio: "16 / 9", objectPosition: "50% 50%", gridSpan: "wide" }, displayOrder: 4, featured: false,
  },
];

export const serviceCategories: ServiceCategory[] = [
  { slug: "chibi", name: { th: "Chibi", en: "Chibi" }, description: { th: "ตัวละครน่ารักขนาดกะทัดรัด", en: "Compact, expressive characters" }, coverMedia: media.amber, coverCrop: { aspectRatio: "4 / 5", objectPosition: "50% 45%" }, displayOrder: 1, availability: "open", recommended: true, typeCount: 2 },
  { slug: "illustration", name: { th: "Illustration", en: "Illustration" }, description: { th: "ภาพประกอบที่เล่าเรื่อง", en: "Story-led illustrations" }, coverMedia: media.violet, coverCrop: { aspectRatio: "4 / 5", objectPosition: "50% 42%" }, displayOrder: 2, availability: "limited", recommended: true, typeCount: 2 },
  { slug: "vtuber", name: { th: "VTuber", en: "VTuber" }, description: { th: "งานออกแบบสำหรับสตรีมเมอร์", en: "Streamer-ready character art" }, coverMedia: media.sky, coverCrop: { aspectRatio: "4 / 5", objectPosition: "50% 45%" }, displayOrder: 3, availability: "limited", recommended: false, typeCount: 1 },
  { slug: "minecraft-skin", name: { th: "Skin Minecraft", en: "Minecraft Skin" }, description: { th: "สกิน Minecraft แบบปรับแต่ง", en: "Custom Minecraft skins" }, coverMedia: media.forest, coverCrop: { aspectRatio: "4 / 5", objectPosition: "45% 50%" }, displayOrder: 4, availability: "open", recommended: false, typeCount: 1 },
  { slug: "minecraft-3d-model", name: { th: "Model 3D Minecraft", en: "Minecraft 3D Model" }, description: { th: "โมเดลและพร็อพสำหรับ Minecraft", en: "Minecraft models and props" }, coverMedia: media.moonlit, coverCrop: { aspectRatio: "4 / 5", objectPosition: "50% 50%" }, displayOrder: 5, availability: "closed", recommended: false, typeCount: 1 },
];

const illustrationExample = { id: "example-forest", title: { th: "Forest Letter", en: "Forest Letter" }, media: media.forest, crop: { aspectRatio: "4 / 3", objectPosition: "48% 50%" } };

export const serviceTypes: ServiceType[] = [
  { slug: "chibi-bust", categorySlug: "chibi", name: { th: "Chibi Bust", en: "Chibi Bust" }, description: { th: "ตัวละครครึ่งตัว", en: "Half-body character" }, availability: "open", displayOrder: 1, timingGuidance: { th: "ประมาณ 7–10 วัน", en: "About 7–10 days" }, referencePrices: [{ label: { th: "ใช้งานส่วนตัว", en: "Personal" }, usage: "personal", amountThb: 900 }, { label: { th: "เชิงพาณิชย์", en: "Commercial" }, usage: "commercial", amountThb: 1800 }], modifiers: [], documentSlugs: ["commission-terms"], examples: [{ id: "example-chibi", title: { th: "Amber Chibi", en: "Amber Chibi" }, media: media.amber, crop: { aspectRatio: "1 / 1", objectPosition: "50% 50%" } }] },
  { slug: "chibi-fullbody", categorySlug: "chibi", name: { th: "Chibi Full Body", en: "Chibi Full Body" }, description: { th: "ตัวละครเต็มตัว", en: "Full-body character" }, availability: "open", displayOrder: 2, timingGuidance: { th: "ประมาณ 10–14 วัน", en: "About 10–14 days" }, referencePrices: [{ label: { th: "ใช้งานส่วนตัว", en: "Personal" }, usage: "personal", amountThb: 1400 }], modifiers: [], documentSlugs: ["commission-terms"], examples: [{ id: "example-chibi-full", title: { th: "Blue Chibi", en: "Blue Chibi" }, media: media.sky, crop: { aspectRatio: "1 / 1", objectPosition: "50% 50%" } }] },
  { slug: "illustration-halfbody", categorySlug: "illustration", name: { th: "Illustration Half Body", en: "Illustration Half Body" }, description: { th: "ภาพประกอบตัวละครครึ่งตัว", en: "Half-body illustration" }, availability: "limited", displayOrder: 1, timingGuidance: { th: "ประมาณ 2–3 สัปดาห์", en: "About 2–3 weeks" }, referencePrices: [{ label: { th: "ใช้งานส่วนตัว", en: "Personal" }, usage: "personal", amountThb: 2500 }, { label: { th: "เชิงพาณิชย์", en: "Commercial" }, usage: "commercial", amountThb: 5000 }], modifiers: [{ label: { th: "พื้นหลังแบบเต็ม", en: "Full background" }, kind: "fixed", value: 1200 }], documentSlugs: ["commission-terms", "revision-guide"], examples: [illustrationExample] },
  { slug: "illustration-fullscene", categorySlug: "illustration", name: { th: "Illustration Full Scene", en: "Illustration Full Scene" }, description: { th: "ภาพประกอบฉากเต็ม", en: "Full narrative scene" }, availability: "limited", displayOrder: 2, timingGuidance: { th: "ประมาณ 3–5 สัปดาห์", en: "About 3–5 weeks" }, referencePrices: [{ label: { th: "ใช้งานส่วนตัว", en: "Personal" }, usage: "personal", amountThb: 4500 }], modifiers: [{ label: { th: "ตัวละครเพิ่ม", en: "Additional character" }, kind: "fixed", value: 1600 }], documentSlugs: ["commission-terms"], examples: [illustrationExample] },
  { slug: "vtuber-reference", categorySlug: "vtuber", name: { th: "VTuber Reference", en: "VTuber Reference" }, description: { th: "ภาพอ้างอิงคาแรกเตอร์", en: "Character reference sheet" }, availability: "limited", displayOrder: 1, timingGuidance: { th: "ประมาณ 3–4 สัปดาห์", en: "About 3–4 weeks" }, referencePrices: [{ label: { th: "ใช้งานส่วนตัว", en: "Personal" }, usage: "personal", amountThb: 6000 }], modifiers: [{ label: { th: "สิทธิ์เชิงพาณิชย์", en: "Commercial usage" }, kind: "percentage", value: 100 }], documentSlugs: ["commission-terms"], examples: [{ id: "example-vtuber", title: { th: "Sky Reference", en: "Sky Reference" }, media: media.sky, crop: { aspectRatio: "4 / 3", objectPosition: "50% 50%" } }] },
  { slug: "minecraft-skin-custom", categorySlug: "minecraft-skin", name: { th: "Custom Skin", en: "Custom Skin" }, description: { th: "สกิน Minecraft แบบกำหนดเอง", en: "A custom Minecraft skin" }, availability: "open", displayOrder: 1, timingGuidance: { th: "ประมาณ 3–5 วัน", en: "About 3–5 days" }, referencePrices: [{ label: { th: "ใช้งานส่วนตัว", en: "Personal" }, usage: "personal", amountThb: 650 }], modifiers: [], documentSlugs: ["commission-terms"], examples: [{ id: "example-skin", title: { th: "Forest Skin", en: "Forest Skin" }, media: media.forest, crop: { aspectRatio: "1 / 1", objectPosition: "50% 50%" } }] },
  { slug: "minecraft-3d-model-prop", categorySlug: "minecraft-3d-model", name: { th: "3D Model Prop", en: "3D Model Prop" }, description: { th: "พร็อพโมเดล 3D", en: "A 3D model prop" }, availability: "closed", displayOrder: 1, timingGuidance: { th: "เปิดรับอีกครั้งเร็ว ๆ นี้", en: "Reopening soon" }, referencePrices: [{ label: { th: "ใช้งานส่วนตัว", en: "Personal" }, usage: "personal", amountThb: 1800 }], modifiers: [], documentSlugs: ["commission-terms"], examples: [{ id: "example-model", title: { th: "Moonlit Prop", en: "Moonlit Prop" }, media: media.moonlit, crop: { aspectRatio: "1 / 1", objectPosition: "50% 50%" } }] },
];

/** @internal Private-shaped fixture records must cross the repository projection boundary. */
export const privateQueueFixtureRecords: Array<{
  position: number;
  displayName: string;
  serviceName: LocalizedText;
  statusLabel: LocalizedText;
  deadlineLabel: string;
  quoteId: string;
  paymentId: string;
  messageId: string;
  contact: string;
  deliveryUrl: string;
}> = [
  { position: 1, displayName: "Mali", serviceName: { th: "Illustration Half Body", en: "Illustration Half Body" }, statusLabel: { th: "กำลังร่าง", en: "Sketching" }, deadlineLabel: "18 Aug 2026", quoteId: "quote-mali", paymentId: "payment-mali", messageId: "message-mali", contact: "mali@example.test", deliveryUrl: "https://private.example/delivery/mali" },
  { position: 2, displayName: "Nox", serviceName: { th: "Chibi Full Body", en: "Chibi Full Body" }, statusLabel: { th: "กำลังลงสี", en: "Coloring" }, deadlineLabel: "23 Aug 2026", quoteId: "quote-nox", paymentId: "payment-nox", messageId: "message-nox", contact: "nox@example.test", deliveryUrl: "https://private.example/delivery/nox" },
  { position: 3, displayName: "Guest Comet", serviceName: { th: "VTuber Reference", en: "VTuber Reference" }, statusLabel: { th: "รอคิว", en: "Queued" }, deadlineLabel: "2 Sep 2026", quoteId: "quote-comet", paymentId: "payment-comet", messageId: "message-comet", contact: "comet@example.test", deliveryUrl: "https://private.example/delivery/comet" },
];

export const documents: DocumentSummary[] = [
  { slug: "commission-terms", category: "terms", title: { th: "เงื่อนไขการคอมมิชชัน", en: "Commission Terms" }, summary: { th: "ข้อตกลงก่อนเริ่มงาน", en: "The agreement before work begins." }, content: { th: "กรุณาอ่านข้อตกลงก่อนยืนยันใบเสนอราคา", en: "Please read these terms before confirming a quote." }, tags: [{ th: "เงื่อนไข", en: "Terms" }], pinned: true, displayOrder: 1, published: true, coverMedia: media.amber },
  { slug: "revision-guide", category: "guide", title: { th: "คู่มือการแก้งาน", en: "Revision Guide" }, summary: { th: "วิธีส่งคำขอแก้ไขอย่างชัดเจน", en: "How to send a clear revision request." }, content: { th: "รวบรวมคำขอแก้ไขเป็นรายการเดียว", en: "Collect revision notes into one clear list." }, tags: [{ th: "แก้งาน", en: "Revisions" }], pinned: false, displayOrder: 2, published: true, coverMedia: media.violet },
  { slug: "privacy-policy", category: "privacy", title: { th: "นโยบายความเป็นส่วนตัว", en: "Privacy Policy" }, summary: { th: "วิธีดูแลข้อมูลของคุณ", en: "How your information is handled." }, content: { th: "ข้อมูลติดต่อใช้สำหรับการสื่อสารเรื่องงานเท่านั้น", en: "Contact information is used only to communicate about your commission." }, tags: [{ th: "ความเป็นส่วนตัว", en: "Privacy" }], pinned: false, displayOrder: 3, published: true },
  { slug: "draft-process", category: "guide", title: { th: "ขั้นตอนงานฉบับร่าง", en: "Draft Process" }, summary: { th: "เอกสารที่ยังไม่เผยแพร่", en: "An unpublished document." }, content: { th: "ฉบับร่าง", en: "Draft" }, tags: [{ th: "ร่าง", en: "Draft" }], pinned: false, displayOrder: 4, published: false },
];
