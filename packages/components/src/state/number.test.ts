import { describe, expect, it } from "vitest";
import { editableNumber, formatNumber, parseNumber, stepNumber } from "./number.js";

const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };
const PERCENT: Intl.NumberFormatOptions = { style: "percent" };
/** Spaces of every kind as plain spaces: Intl writes narrow no-break ones in French. */
const plain = (text: string) => text.replace(/[  ]/g, " ");

describe("formatNumber", () => {
  it("shows a number as the options and the language say", () => {
    expect(plain(formatNumber("1250.5", "fr", EUR))).toBe("1 250,50 €");
    expect(formatNumber("1250.5", "en", EUR)).toBe("€1,250.50");
    expect(plain(formatNumber("0.25", "fr", PERCENT))).toBe("25 %");
  });

  it("leaves an empty value, or a text that isn't a number, as it is", () => {
    expect(formatNumber("", "fr", EUR)).toBe("");
    expect(formatNumber("abc", "fr", EUR)).toBe("abc");
  });
});

describe("editableNumber", () => {
  it("gives the number without groups nor symbols, in the language", () => {
    expect(editableNumber("1250.5", "fr", EUR)).toBe("1250,5");
    expect(editableNumber("1250.5", "en", EUR)).toBe("1250.5");
    expect(editableNumber("0.25", "fr", PERCENT)).toBe("25");
    expect(editableNumber("", "fr", EUR)).toBe("");
  });
});

describe("parseNumber", () => {
  it("reads what a user writes, in the language, in the format of HTML", () => {
    expect(parseNumber("1250,5", "fr", EUR)).toBe("1250.5");
    expect(parseNumber("1 250,50 €", "fr", EUR)).toBe("1250.5");
    expect(parseNumber("1 250,50 €", "fr", EUR)).toBe("1250.5");
    expect(parseNumber("€1,250.50", "en", EUR)).toBe("1250.5");
    expect(parseNumber("-3", "fr", undefined)).toBe("-3");
    expect(parseNumber("−3", "fr", undefined)).toBe("-3");
  });

  it("reads a percentage a hundred times smaller", () => {
    expect(parseNumber("25", "fr", PERCENT)).toBe("0.25");
    expect(parseNumber("12,5 %", "fr", PERCENT)).toBe("0.125");
  });

  it('gives "" for an empty text, undefined for a text that isn\'t a number', () => {
    expect(parseNumber("  ", "fr", EUR)).toBe("");
    expect(parseNumber("douze", "fr", EUR)).toBeUndefined();
    expect(parseNumber("1,2,3", "fr", EUR)).toBeUndefined();
    expect(parseNumber("1-2", "fr", EUR)).toBeUndefined();
  });
});

describe("stepNumber", () => {
  it("steps up and down by the step, within the bounds", () => {
    expect(stepNumber("10", 1, { step: "5" })).toBe("15");
    expect(stepNumber("10", -1, { step: "5" })).toBe("5");
    expect(stepNumber("98", 1, { max: "100", step: "5" })).toBe("100");
    expect(stepNumber("1", -1, { min: "0", step: "5" })).toBe("0");
  });

  it("goes onto the step first, from min", () => {
    expect(stepNumber("12", 1, { min: "0", step: "5" })).toBe("15");
    expect(stepNumber("12", -1, { min: "0", step: "5" })).toBe("10");
    expect(stepNumber("0.1", 1, { step: "0.1" })).toBe("0.2");
  });

  it("starts from min, or 0, without a value; steps by 1 with any", () => {
    expect(stepNumber("", 1, { min: "3" })).toBe("3");
    expect(stepNumber("", -1, {})).toBe("0");
    expect(stepNumber("2.5", 1, { step: "any" })).toBe("3.5");
  });
});
