import { describe, expect, it } from "vitest"
import {
  DEFAULT_TAX_PAYMENT_FREQUENCY,
  DEFAULT_TAX_RATE,
  parseTaxForecastData,
  parseTaxPaymentFrequency,
  parseTaxRate,
} from "../tax-forecast-utils"

describe("parseTaxRate", () => {
  it("defaults and clamps", () => {
    expect(parseTaxRate(undefined)).toBe(DEFAULT_TAX_RATE)
    expect(parseTaxRate(30)).toBe(30)
    expect(parseTaxRate(-5)).toBe(0)
    expect(parseTaxRate(150)).toBe(100)
  })
})

describe("parseTaxPaymentFrequency", () => {
  it("accepts known frequencies and defaults otherwise", () => {
    expect(parseTaxPaymentFrequency("monthly")).toBe("monthly")
    expect(parseTaxPaymentFrequency("quarterly")).toBe("quarterly")
    expect(parseTaxPaymentFrequency("semiannual")).toBe("semiannual")
    expect(parseTaxPaymentFrequency("annual")).toBe("annual")
    expect(parseTaxPaymentFrequency("weekly")).toBe(DEFAULT_TAX_PAYMENT_FREQUENCY)
    expect(parseTaxPaymentFrequency(null)).toBe(DEFAULT_TAX_PAYMENT_FREQUENCY)
  })
})

describe("parseTaxForecastData", () => {
  it("parses rate and payment frequency together", () => {
    expect(parseTaxForecastData({ taxRate: 28, taxPaymentFrequency: "quarterly" })).toEqual({
      taxRate: 28,
      taxPaymentFrequency: "quarterly",
    })
    expect(parseTaxForecastData({})).toEqual({
      taxRate: DEFAULT_TAX_RATE,
      taxPaymentFrequency: DEFAULT_TAX_PAYMENT_FREQUENCY,
    })
  })
})
