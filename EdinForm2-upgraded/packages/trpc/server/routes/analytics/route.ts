import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { analyticsService } from "@repo/services/analytics";
import { analyticsQuerySchema } from "@repo/validators/analytics";

const TAGS = ["Analytics"];
const getPath = generatePath("/analytics");

const dailyDataOutput = z.object({
  date: z.string(),
  views: z.number(),
  submissions: z.number(),
  uniqueVisitors: z.number(),
  conversionRate: z.number(),
  avgCompletionSeconds: z.number().nullable(),
});

const hourlyVelocityOutput = z.object({
  hour: z.string(),
  count: z.number(),
});

const dropoffFunnelOutput = z.object({
  fieldId: z.string(),
  label: z.string(),
  answeredCount: z.number(),
  dropoffRate: z.number(),
});

export const analyticsRouter = router({
  /** GET /analytics/form — get analytics for a specific form */
  getFormAnalytics: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/form"), tags: TAGS } })
    .input(analyticsQuerySchema)
    .output(z.object({
      formId: z.string(),
      totalViews: z.number(),
      totalSubmissions: z.number(),
      conversionRate: z.number(),
      avgCompletionSeconds: z.number().nullable(),
      dailyData: z.array(dailyDataOutput),
      hourlyVelocity: z.array(hourlyVelocityOutput),
      dropoffFunnel: z.array(dropoffFunnelOutput),
      healthScore: z.number().min(0).max(100),
      uniqueResponseRatio: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      return analyticsService.getFormAnalytics(input, ctx.user!.id);
    }),

  /** GET /analytics/dashboard — creator-wide overview */
  dashboard: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/dashboard"), tags: TAGS } })
    .input(z.undefined())
    .output(z.object({
      totalForms: z.number(),
      totalResponses: z.number(),
      totalViews: z.number(),
      avgConversionRate: z.number(),
    }))
    .query(async ({ ctx }) => {
      return analyticsService.getCreatorDashboard(ctx.user!.id);
    }),
});
