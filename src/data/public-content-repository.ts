import type { Locale } from "@/shared/i18n/locales";
import type {
  DocumentSummary,
  FeaturedItem,
  HeroItem,
  PortfolioItem,
  PublicQueueItem,
  ServiceCategory,
  ServiceType,
} from "@/shared/types/public-content";

export interface PublicContentRepository {
  getHome(locale: Locale): Promise<{ hero: HeroItem[]; featured: FeaturedItem[] }>;
  getPortfolio(locale: Locale, query?: string, category?: string): Promise<PortfolioItem[]>;
  getServiceCategories(locale: Locale): Promise<ServiceCategory[]>;
  getServiceCategory(
    locale: Locale,
    slug: string,
  ): Promise<{ category: ServiceCategory; types: ServiceType[] } | null>;
  getQueue(locale: Locale, query?: string): Promise<PublicQueueItem[]>;
  getDocuments(locale: Locale, query?: string): Promise<DocumentSummary[]>;
  getDocument(locale: Locale, slug: string): Promise<DocumentSummary | null>;
}
