import { z } from "zod";

export const adminEstimateRequestIdSchema = z.string().uuid();
