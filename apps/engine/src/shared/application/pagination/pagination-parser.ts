import type { PaginationParams } from "@/shared/domain/value-object/pagination.value-object.js";

const DEFAULT_PAGE = 1;
const DEFAULT_ITEMS_PER_PAGE = 30;
const MAX_ITEMS_PER_PAGE = 100;

export class PaginationParser {
  parse(query: Record<string, unknown>): PaginationParams {
    let page = Number(query["page"]) || DEFAULT_PAGE;
    if (page < 1) page = DEFAULT_PAGE;
    page = Math.floor(page);

    let itemsPerPage = Number(query["itemsPerPage"]) || DEFAULT_ITEMS_PER_PAGE;
    if (itemsPerPage < 1) itemsPerPage = DEFAULT_ITEMS_PER_PAGE;
    if (itemsPerPage > MAX_ITEMS_PER_PAGE) itemsPerPage = MAX_ITEMS_PER_PAGE;
    itemsPerPage = Math.floor(itemsPerPage);

    return { page, itemsPerPage };
  }
}
