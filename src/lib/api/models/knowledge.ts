import type { IsoDateTimeString } from "@/lib/datetime/iso";

export interface KBCategory {
  id: number;
  name: string;
  completename: string;
  level: number;
  article_count: number;
}

export interface KBArticleSummary {
  id: number;
  name: string;
  category: string | null;
  category_id: number | null;
  author: string | null;
  date_creation: IsoDateTimeString | null;
  date_mod: IsoDateTimeString | null;
  is_faq: boolean;
  view_count: number;
}

export interface KBArticleAttachment {
  id: number;
  filename: string;
  mime_type: string;
  size: number | null;
  date_upload: IsoDateTimeString | null;
  url: string;
}

export interface KBArticleDetail extends KBArticleSummary {
  answer: string;
  attachments: KBArticleAttachment[];
}

export interface KBArticlePayload {
  name: string;
  answer: string;
  knowbaseitemcategories_id?: number | null;
  is_faq?: number;
}

export interface KBListResult {
  total: number;
  categories: KBCategory[];
  articles: KBArticleSummary[];
}
