import { describe, it, expect } from "vitest";

import {
  createHydraCollection,
  parsePaginationParams,
} from "../../../src/shared/pagination/index.js";

describe("createHydraCollection", () => {
  it("should return a collection without view when all items fit on one page", () => {
    const result = createHydraCollection({
      items: [{ id: 1 }, { id: 2 }],
      totalItems: 2,
      page: 1,
      itemsPerPage: 30,
      basePath: "/projects",
    });

    expect(result).toEqual({
      "@context": "/contexts/Projects",
      "@id": "/projects",
      "@type": "Collection",
      totalItems: 2,
      member: [{ id: 1 }, { id: 2 }],
    });
    expect(result.view).toBeUndefined();
  });

  it("should include view with navigation links for multi-page results", () => {
    const result = createHydraCollection({
      items: [{ id: 1 }],
      totalItems: 50,
      page: 2,
      itemsPerPage: 10,
      basePath: "/projects",
    });

    expect(result["@type"]).toBe("Collection");
    expect(result.totalItems).toBe(50);
    expect(result.view).toBeDefined();
    expect(result.view?.["@type"]).toBe("PartialCollectionView");
    expect(result.view?.["@id"]).toBe("/projects?page=2");
    expect(result.view?.first).toBe("/projects?page=1");
    expect(result.view?.last).toBe("/projects?page=5");
    expect(result.view?.next).toBe("/projects?page=3");
    expect(result.view?.previous).toBe("/projects?page=1");
  });

  it("should not include previous on first page", () => {
    const result = createHydraCollection({
      items: [{ id: 1 }],
      totalItems: 50,
      page: 1,
      itemsPerPage: 10,
      basePath: "/tasks",
    });

    expect(result.view?.previous).toBeUndefined();
    expect(result.view?.next).toBe("/tasks?page=2");
  });

  it("should not include next on last page", () => {
    const result = createHydraCollection({
      items: [{ id: 1 }],
      totalItems: 50,
      page: 5,
      itemsPerPage: 10,
      basePath: "/tasks",
    });

    expect(result.view?.next).toBeUndefined();
    expect(result.view?.previous).toBe("/tasks?page=4");
  });

  it("should preserve extra query params in pagination URLs", () => {
    const result = createHydraCollection({
      items: [],
      totalItems: 100,
      page: 1,
      itemsPerPage: 10,
      basePath: "/tasks",
      extraParams: { status: "ready", agent: "/agents/some-uuid" },
    });

    expect(result.view?.["@id"]).toContain("status=pending");
    expect(result.view?.["@id"]).toContain(
      "agent=%2Fagents%2Fsome-uuid",
    );
    expect(result.view?.["@id"]).toContain("page=1");
    expect(result.view?.next).toContain("page=2");
    expect(result.view?.next).toContain("status=pending");
  });

  it("should handle empty collection", () => {
    const result = createHydraCollection({
      items: [],
      totalItems: 0,
      page: 1,
      itemsPerPage: 30,
      basePath: "/agents",
    });

    expect(result.totalItems).toBe(0);
    expect(result.member).toEqual([]);
    expect(result.view).toBeUndefined();
  });

  it("should derive context name from basePath", () => {
    const result = createHydraCollection({
      items: [],
      totalItems: 0,
      page: 1,
      itemsPerPage: 30,
      basePath: "/workers",
    });

    expect(result["@context"]).toBe("/contexts/Workers");
  });

  it("should derive context name from nested basePath", () => {
    const result = createHydraCollection({
      items: [],
      totalItems: 0,
      page: 1,
      itemsPerPage: 30,
      basePath: "/projects/some-uuid/tasks",
    });

    expect(result["@context"]).toBe("/contexts/Tasks");
  });
});

describe("parsePaginationParams", () => {
  it("should return defaults when no params provided", () => {
    const result = parsePaginationParams({});

    expect(result).toEqual({ page: 1, itemsPerPage: 30 });
  });

  it("should parse valid page and itemsPerPage", () => {
    const result = parsePaginationParams({ page: "3", itemsPerPage: "15" });

    expect(result).toEqual({ page: 3, itemsPerPage: 15 });
  });

  it("should clamp page to 1 when less than 1", () => {
    const result = parsePaginationParams({ page: "0" });

    expect(result.page).toBe(1);
  });

  it("should clamp page to 1 when negative", () => {
    const result = parsePaginationParams({ page: "-5" });

    expect(result.page).toBe(1);
  });

  it("should clamp itemsPerPage to 100 when exceeding max", () => {
    const result = parsePaginationParams({ itemsPerPage: "200" });

    expect(result.itemsPerPage).toBe(100);
  });

  it("should use default itemsPerPage when less than 1", () => {
    const result = parsePaginationParams({ itemsPerPage: "0" });

    expect(result.itemsPerPage).toBe(30);
  });

  it("should use defaults for non-numeric values", () => {
    const result = parsePaginationParams({
      page: "abc",
      itemsPerPage: "xyz",
    });

    expect(result).toEqual({ page: 1, itemsPerPage: 30 });
  });

  it("should floor fractional values", () => {
    const result = parsePaginationParams({
      page: "2.7",
      itemsPerPage: "10.5",
    });

    expect(result).toEqual({ page: 2, itemsPerPage: 10 });
  });
});
