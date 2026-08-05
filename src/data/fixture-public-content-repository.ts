import type { Locale } from "@/shared/i18n/locales";
import type { PublicContentRepository } from "@/data/public-content-repository";
import type { LocalizedText, PublicQueueItem } from "@/shared/types/public-content";
import {
  documents,
  featuredItems,
  heroItems,
  portfolioItems,
  privateQueueFixtureRecords,
  serviceCategories,
  serviceTypes,
} from "@/data/fixtures/public-content";

type QueueProjectionSource = {
  position: number;
  displayName: string;
  serviceName: LocalizedText;
  statusLabel: LocalizedText;
  deadlineLabel: string;
};

export function projectPublicQueueItem(
  source: QueueProjectionSource,
  locale: Locale,
): PublicQueueItem {
  return {
    position: source.position,
    displayName: source.displayName,
    serviceName: source.serviceName[locale],
    statusLabel: source.statusLabel[locale],
    deadlineLabel: source.deadlineLabel,
  };
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function includesQuery(values: string[], query?: string) {
  const term = normalized(query ?? "");
  return !term || values.some((value) => normalized(value).includes(term));
}

export const fixturePublicContentRepository: PublicContentRepository = {
  async getHome(_locale: Locale) {
    return {
      hero: heroItems.filter((item) => item.enabled),
      featured: [...featuredItems].sort((a, b) => a.displayOrder - b.displayOrder),
    };
  },

  async getPortfolio(locale: Locale, query?: string, category?: string) {
    const selectedCategory = normalized(category ?? "");
    return portfolioItems.filter((item) =>
      (!selectedCategory || normalized(item.category) === selectedCategory) &&
      includesQuery([item.title[locale], item.description[locale], item.category], query),
    );
  },

  async getServiceCategories(_locale: Locale) {
    return serviceCategories.filter((item) => item.published).sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async getServiceCategory(_locale: Locale, slug: string) {
    const category = serviceCategories.find((item) => item.slug === slug && item.published);
    if (!category) return null;
    return {
      category,
      types: serviceTypes
        .filter((item) => item.categorySlug === slug && item.published)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    };
  },

  async getQueue(locale: Locale, query?: string) {
    return privateQueueFixtureRecords
      .map((item) => projectPublicQueueItem(item, locale))
      .filter((item) =>
        includesQuery([item.displayName, item.serviceName, item.statusLabel, item.deadlineLabel], query),
      );
  },

  async getDocuments(locale: Locale, query?: string) {
    return documents
      .filter((item) => item.published)
      .filter((item) => includesQuery([item.title[locale], item.summary[locale], item.content[locale]], query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.displayOrder - b.displayOrder);
  },

  async getDocument(_locale: Locale, slug: string) {
    return documents.find((item) => item.slug === slug && item.published) ?? null;
  },
};

export function getPublicContentRepository(): PublicContentRepository {
  return fixturePublicContentRepository;
}
