import { z } from "zod";

export const requestStatusSchema = z.enum([
  "submitted",
  "reviewing",
  "quoted",
  "declined",
  "cancelled",
  "converted",
  "closed",
]);

export const quoteStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "closed",
  "superseded",
]);

export const jobTerminalStateSchema = z.enum(["completed", "cancelled"]);
export const moneySatangSchema = z.number().int().nonnegative().max(2_147_483_647);
export const depositPercentSchema = z.number().int().min(0).max(100);

export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;
export type JobTerminalState = z.infer<typeof jobTerminalStateSchema>;
