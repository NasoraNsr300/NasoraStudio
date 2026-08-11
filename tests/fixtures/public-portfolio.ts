import type { PublicPortfolioItem } from "@/features/portfolio/domain/portfolio";

export const publicPortfolioItems: PublicPortfolioItem[] = [{
  category: "illustration", categoryName: { en: "Illustration", th: "ภาพประกอบ" }, displayOrder: 1, featured: true, showInHero: false,
  id: "00000000-0000-4000-8000-000000000101",
  media: { alt: { en: "Moon artwork", th: "ภาพดวงจันทร์" }, cardSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000111", contentType: "image/webp", detailSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000111", height: 1600, id: "00000000-0000-4000-8000-000000000111", width: 1200 },
  title: { en: "Moon Garden", th: "สวนจันทร์" },
}, {
  category: "chibi", categoryName: { en: "Chibi", th: "ชิบิ" }, displayOrder: 2, featured: false, showInHero: false,
  id: "00000000-0000-4000-8000-000000000102",
  media: { alt: { en: "Star artwork", th: "ภาพดาว" }, cardSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000112", contentType: "image/png", detailSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000112", height: 900, id: "00000000-0000-4000-8000-000000000112", width: 1600 },
  title: { en: "Star Child", th: "เด็กดาว" },
}];
