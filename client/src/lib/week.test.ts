import { describe, expect, it } from "vitest";
import { addDays, combineDateTime, dayKey, parseDayKey, startOfWeek, weekRangeLabel } from "./week";

// Run with TZ set to check other zones, e.g. TZ=America/New_York (DST) and TZ=Asia/Kolkata.
describe("startOfWeek", () => {
  it("Sunday 23:30 belongs to the week that started the previous Monday", () => {
    expect(dayKey(startOfWeek(new Date(2026, 10, 15, 23, 30)))).toBe("2026-11-09");
  });

  it("Monday 00:00 starts a new week", () => {
    const s = startOfWeek(new Date(2026, 10, 16, 0, 0));
    expect(dayKey(s)).toBe("2026-11-16");
    expect(s.getHours()).toBe(0);
  });

  it("always returns a local Monday midnight at most 7 days back, for every day of two years", () => {
    for (let d = new Date(2025, 0, 1, 12); d.getFullYear() < 2027; d = addDays(d, 1)) {
      const s = startOfWeek(d);
      expect(s.getDay()).toBe(1);
      expect([s.getHours(), s.getMinutes()]).toEqual([0, 0]);
      expect(s <= d && d < addDays(s, 7)).toBe(true);
    }
  });

  it("handles the week the clocks change (US DST ends 2026-11-01)", () => {
    // Sunday of the change still belongs to the week starting Monday 26 Oct.
    expect(dayKey(startOfWeek(new Date(2026, 10, 1, 12)))).toBe("2026-10-26");
    expect(dayKey(addDays(new Date(2026, 9, 26), 7))).toBe("2026-11-02");
  });
});

describe("day keys and labels", () => {
  it("round trips a day key and rejects bad ones", () => {
    expect(dayKey(parseDayKey("2026-02-28")!)).toBe("2026-02-28");
    expect(parseDayKey("2026-02-30")).toBeNull();
    expect(parseDayKey("nope")).toBeNull();
    expect(parseDayKey(null)).toBeNull();
  });

  it("combines date and time as local time", () => {
    const d = combineDateTime("2026-11-12", "09:30");
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([12, 9, 30]);
  });

  it("formats week ranges within and across months", () => {
    expect(weekRangeLabel(new Date(2026, 10, 9))).toBe("9 to 15 Nov");
    expect(weekRangeLabel(new Date(2026, 9, 26))).toBe("26 Oct to 1 Nov");
  });
});
