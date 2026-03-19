export interface CatalogItem {
  formId: number;
  name: string;
  description?: string;
  icon?: string;
  categoryId: number;
  techOnly: boolean;
}

export interface CatalogGroup {
  id: number;
  group: string;
  icon: string;
  items: CatalogItem[];
}
