import type { DateOnly } from "../contracts.js";

const DAY_MS = 86_400_000;

export function dateToEpochDay(value: DateOnly): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date-only value: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return Math.floor(date.getTime() / DAY_MS);
}

export function epochDayToDate(value: number): DateOnly {
  if (!Number.isInteger(value)) throw new Error("Epoch day must be an integer");
  return new Date(value * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(value: DateOnly, days: number): DateOnly {
  if (!Number.isInteger(days)) throw new Error("Day offset must be an integer");
  return epochDayToDate(dateToEpochDay(value) + days);
}

export function daysBetween(from: DateOnly, to: DateOnly): number {
  return dateToEpochDay(to) - dateToEpochDay(from);
}

export function maxDate(...values: DateOnly[]): DateOnly {
  if (values.length === 0) throw new Error("At least one date is required");
  return values.reduce((latest, value) => dateToEpochDay(value) > dateToEpochDay(latest) ? value : latest);
}

export function minDate(...values: DateOnly[]): DateOnly {
  if (values.length === 0) throw new Error("At least one date is required");
  return values.reduce((earliest, value) => dateToEpochDay(value) < dateToEpochDay(earliest) ? value : earliest);
}
