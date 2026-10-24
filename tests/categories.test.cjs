const assert = require("node:assert/strict");
const { test } = require("node:test");
const { load } = require("./helpers.cjs");

const { categorySlug, categoryLabel, DEFAULT_CATEGORIES } = load("lib/categories.ts");

test("category names become URL-safe slugs", () => {
  assert.equal(categorySlug("Waist Trainers"), "waist-trainers");
  assert.equal(categorySlug("  Swim & Beach  "), "swim-and-beach");
  assert.equal(categorySlug("Crème Bodysuits!"), "creme-bodysuits");
  assert.equal(categorySlug("---"), "");
});

test("every slug matches the database's category id rule", () => {
  const rule = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  for (const name of ["Tops", "Bras 2.0", "A -- B", "Post-Surgery Garments"]) {
    assert.match(categorySlug(name), rule);
  }
});

test("labels come from the managed list, with a readable fallback", () => {
  assert.equal(categoryLabel(DEFAULT_CATEGORIES, "waist-trainer"), "Waist Trainers");
  assert.equal(categoryLabel([], "post-surgery-garments"), "Post Surgery Garments");
});
