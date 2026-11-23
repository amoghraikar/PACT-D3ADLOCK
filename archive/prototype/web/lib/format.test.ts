import { test } from "node:test";
import assert from "node:assert";
import { formatPaise, formatDate, formatTime, formatRelativeDays } from "./format.ts";

test("formatPaise formats zero correctly", () => {
  assert.strictEqual(formatPaise(0), "₹0");
  assert.strictEqual(formatPaise(BigInt(0)), "₹0");
});

test("formatPaise drops .00 for whole rupee amounts", () => {
  assert.strictEqual(formatPaise(72000), "₹720");
  assert.strictEqual(formatPaise(30000), "₹300");
  assert.strictEqual(formatPaise(250000), "₹2,500");
});

test("formatPaise retains paise when non-zero", () => {
  assert.strictEqual(formatPaise(71667), "₹716.67");
  assert.strictEqual(formatPaise(53750), "₹537.50");
  assert.strictEqual(formatPaise(35833), "₹358.33");
  assert.strictEqual(formatPaise(105), "₹1.05");
});

test("formatPaise formats large numbers with Indian grouping", () => {
  assert.strictEqual(formatPaise(12345650), "₹1,23,456.50");
  assert.strictEqual(formatPaise(10000000), "₹1,00,000");
  assert.strictEqual(formatPaise(1000000000), "₹1,00,00,000"); // 1 Crore
});

test("formatPaise supports approx option", () => {
  assert.strictEqual(formatPaise(30000, { approx: true }), "About ₹300");
  assert.strictEqual(formatPaise(71667, { approx: true }), "About ₹716.67");
});

test("formatDate formats in Asia/Kolkata timezone", () => {
  const d = new Date("2026-11-24T18:29:59.000Z"); // 23:59:59 in IST (UTC+5:30)
  assert.strictEqual(formatDate(d), "24 Nov");
});

test("formatTime formats in Asia/Kolkata timezone with lowercase am/pm", () => {
  const d = new Date("2026-11-24T18:29:00.000Z"); // 11:59 pm in IST
  assert.strictEqual(formatTime(d), "11:59 pm");
});

test("formatRelativeDays returns correct status", () => {
  const future = new Date(Date.now() + 6 * 24 * 3600 * 1000);
  assert.strictEqual(formatRelativeDays(future), "closes in 6 days");

  const past = new Date(Date.now() - 24 * 3600 * 1000);
  assert.strictEqual(formatRelativeDays(past), "closed");
});
