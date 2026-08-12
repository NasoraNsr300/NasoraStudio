import type { Locale } from "@/shared/i18n/locales";
import type { PublicSiteSettings } from "@/features/site-settings/domain/site-settings";

import styles from "./about.module.css";

export type AboutPageProps = { locale: Locale; settings: PublicSiteSettings };

export const aboutFixture = {
  en: {
    biography: "Nasora is an independent illustrator creating character-led artwork, stories, and commission pieces with a warm, atmospheric finish.",
    contact: "For commission questions, availability, or a friendly hello, start with Discord.",
    eyebrow: "About Nasora",
    title: "Illustration with a little starlight",
  },
  th: {
    biography: "Nasora เป็นนักวาดอิสระที่สร้างสรรค์งานตัวละคร เรื่องราว และคอมมิชชันในบรรยากาศอบอุ่นนุ่มนวล",
    contact: "หากมีคำถามเกี่ยวกับคอมมิชชัน คิว หรืออยากทักทาย เริ่มต้นพูดคุยที่ Discord ได้เลย",
    eyebrow: "เกี่ยวกับ Nasora",
    title: "ภาพประกายดาวในงานภาพประกอบ",
  },
} as const;

export function AboutPage({ locale, settings }: AboutPageProps) {
  const content = { ...aboutFixture[locale], biography: settings.aboutBiography?.[locale] ?? aboutFixture[locale].biography, contact: settings.aboutContact?.[locale] ?? aboutFixture[locale].contact };
  const channels = [
    { label: "Discord", href: `https://discord.com/users/${encodeURIComponent(settings.discordContact)}` },
    settings.contactEmail ? { label: "Email", href: `mailto:${settings.contactEmail}` } : null,
    settings.instagramUrl ? { label: "Instagram", href: settings.instagramUrl } : null,
  ].filter((channel): channel is { label: string; href: string } => channel !== null);
  return <main className={styles.about}>
    <header className={styles.heading}><p>{content.eyebrow}</p><h1>{content.title}</h1><span>{content.biography}</span></header>
    <section aria-labelledby="contact-heading" className={styles.card}>
      <div><p>{locale === "th" ? "ติดต่อ" : "Contact"}</p><h2 id="contact-heading">{locale === "th" ? "มาคุยกัน" : "Let’s talk"}</h2><span>{content.contact}</span></div>
      <nav aria-label={locale === "th" ? "ช่องทางติดต่อ" : "Contact channels"}>
        <ul className={styles.tags}>
        {channels.map((channel) => <li key={channel.label}><a href={channel.href}>{channel.label}</a></li>)}
        </ul>
      </nav>
    </section>
  </main>;
}
