import type { HydraCollection } from "./types.js";

interface CreateHydraCollectionOptions<T> {
  items: T[];
  totalItems: number;
  page: number;
  itemsPerPage: number;
  basePath: string;
  extraParams?: Record<string, string>;
}

function buildUrl(
  basePath: string,
  page: number,
  extraParams?: Record<string, string>,
): string {
  const params = new URLSearchParams();
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value);
    }
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function deriveContextName(basePath: string): string {
  const segment = basePath.split("/").filter(Boolean).pop() ?? "";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function createHydraCollection<T>(
  options: CreateHydraCollectionOptions<T>,
): HydraCollection<T> {
  const { items, totalItems, page, itemsPerPage, basePath, extraParams } =
    options;

  const collection: HydraCollection<T> = {
    "@context": `/contexts/${deriveContextName(basePath)}`,
    "@id": basePath,
    "@type": "Collection",
    totalItems,
    member: items,
  };

  if (totalItems > itemsPerPage) {
    const lastPage = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    const view: HydraCollection<T>["view"] = {
      "@id": buildUrl(basePath, page, extraParams),
      "@type": "PartialCollectionView",
      first: buildUrl(basePath, 1, extraParams),
      last: buildUrl(basePath, lastPage, extraParams),
    };

    if (page < lastPage) {
      view.next = buildUrl(basePath, page + 1, extraParams);
    }
    if (page > 1) {
      view.previous = buildUrl(basePath, page - 1, extraParams);
    }

    collection.view = view;
  }

  return collection;
}
