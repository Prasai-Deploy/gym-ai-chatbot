import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  unread_only: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  limit: z
    .preprocess((val) => (val !== undefined ? Number(val) : 20), z.number().int().min(1).max(100))
    .default(20),
  offset: z
    .preprocess((val) => (val !== undefined ? Number(val) : 0), z.number().int().min(0))
    .default(0),
});

export const markReadParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>;
export type MarkReadParamsInput = z.infer<typeof markReadParamsSchema>;
