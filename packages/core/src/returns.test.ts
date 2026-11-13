import { describe, expect, it } from "vitest";
import { addCalendarDays, returnDeadline, toCalendarDay } from "./returns";

describe("return-window maths", () => {
  it("uses the Istanbul calendar day", () => {
    // 22:30 UTC on 13 Nov is 14 Nov in Istanbul.
    expect(toCalendarDay(new Date("2026-11-13T22:30:00Z"))).toBe("2026-11-14");
  });

  it("adds calendar days across month ends", () => {
    expect(addCalendarDays("2026-11-28", 5)).toBe("2026-12-03");
  });

  it("estimates the delivery day for delivery-based rules (design: ordered 8 Nov → last day 24 Nov)", () => {
    expect(returnDeadline("2026-11-08", { days: 14, startType: "DELIVERY", avgDeliveryDays: 2 })).toEqual({ day: "2026-11-24", estimated: true });
  });

  it("counts from the real delivery day once known", () => {
    expect(returnDeadline("2026-11-08", { days: 14, startType: "DELIVERY", avgDeliveryDays: 2 }, "2026-11-11")).toEqual({ day: "2026-11-25", estimated: false });
  });

  it("counts from the order day for order-based rules", () => {
    expect(returnDeadline("2026-11-08", { days: 15, startType: "ORDER", avgDeliveryDays: null })).toEqual({ day: "2026-11-23", estimated: false });
  });
});
