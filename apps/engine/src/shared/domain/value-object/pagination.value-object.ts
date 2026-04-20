export interface PaginationParams {
  page: number;
  itemsPerPage: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
}

export interface HydraCollectionView {
  "@id": string;
  "@type": "PartialCollectionView";
  first: string;
  last: string;
  next?: string;
  previous?: string;
}

export interface HydraCollection<T> {
  "@context": string;
  "@id": string;
  "@type": "Collection";
  totalItems: number;
  member: T[];
  view?: HydraCollectionView;
}
