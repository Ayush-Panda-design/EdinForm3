import { eq, and, gte, lte, sql, desc, inArray } from "@repo/database";
import db, {
  formsTable,
  formViewsTable,
  formResponsesTable,
  analyticsTable,
  formFieldsTable,
  responseAnswersTable,
} from "@repo/database";
import type { AnalyticsQueryInput } from "@repo/validators/analytics";
import type { FormAnalyticsSummary, DailyAnalytics } from "@repo/types/analytics";

// Redis cache helper (graceful fallback)
let redisClient: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: any) => Promise<void>; del: (k: string) => Promise<void> } | null = null;

async function getCached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  if (redisClient) {
    try {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch {}
  }
  const result = await fn();
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(result), { ex: ttlSeconds });
    } catch {}
  }
  return result;
}

export function setRedisClient(client: typeof redisClient) {
  redisClient = client;
}

export class AnalyticsService {
  /**
   * Get analytics summary for a form
   */
  async getFormAnalytics(
    input: AnalyticsQueryInput,
    creatorId: string
  ): Promise<FormAnalyticsSummary & {
    hourlyVelocity: Array<{ hour: string; count: number }>;
    dropoffFunnel: Array<{ fieldId: string; label: string; answeredCount: number; dropoffRate: number }>;
    healthScore: number;
    uniqueResponseRatio: number;
  }> {
    // Verify ownership
    const [form] = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(
        and(
          eq(formsTable.id, input.formId),
          eq(formsTable.creatorId, creatorId)
        )
      )
      .limit(1);

    if (!form) throw new Error("FORM_NOT_FOUND_OR_UNAUTHORIZED");

    const fromDate = input.from ? new Date(input.from) : this.defaultFromDate();
    const toDate = input.to ? new Date(input.to) : new Date();

    const cacheKey = `analytics:${input.formId}:${fromDate.toISOString()}:${toDate.toISOString()}`;

    return getCached(cacheKey, 120, async () => {
      // Total views in range
      const [viewsResult] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(formViewsTable)
        .where(
          and(
            eq(formViewsTable.formId, input.formId),
            gte(formViewsTable.viewedAt, fromDate),
            lte(formViewsTable.viewedAt, toDate)
          )
        );

      // Total submissions in range
      const [subResult] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(formResponsesTable)
        .where(
          and(
            eq(formResponsesTable.formId, input.formId),
            gte(formResponsesTable.submittedAt, fromDate),
            lte(formResponsesTable.submittedAt, toDate),
            eq(formResponsesTable.status, "completed")
          )
        );

      // Unique IP count (for unique ratio)
      const [uniqueResult] = await db
        .select({ total: sql<number>`count(distinct ${formResponsesTable.ipAddress})::int` })
        .from(formResponsesTable)
        .where(
          and(
            eq(formResponsesTable.formId, input.formId),
            gte(formResponsesTable.submittedAt, fromDate),
            lte(formResponsesTable.submittedAt, toDate),
            eq(formResponsesTable.status, "completed")
          )
        );

      // Avg completion time
      const [avgResult] = await db
        .select({
          avg: sql<number>`avg(${formResponsesTable.completionTimeSeconds})::int`,
        })
        .from(formResponsesTable)
        .where(
          and(
            eq(formResponsesTable.formId, input.formId),
            gte(formResponsesTable.submittedAt, fromDate),
            lte(formResponsesTable.submittedAt, toDate)
          )
        );

      const totalViews = viewsResult?.total ?? 0;
      const totalSubmissions = subResult?.total ?? 0;
      const uniqueResponseCount = uniqueResult?.total ?? 0;
      const uniqueResponseRatio = totalSubmissions > 0
        ? Math.round((uniqueResponseCount / totalSubmissions) * 1000) / 10
        : 0;

      const conversionRate =
        totalViews > 0
          ? Math.round((totalSubmissions / totalViews) * 1000) / 10
          : 0;

      // Daily aggregates
      const dailyData = await this.getDailyBreakdown(
        input.formId,
        fromDate,
        toDate,
        input.groupBy
      );

      // Hourly velocity (last 48 hours bucketed by hour)
      const hourlyVelocity = await this.getHourlyVelocity(input.formId, fromDate, toDate);

      // Per-question drop-off funnel
      const dropoffFunnel = await this.getDropoffFunnel(input.formId);

      // Health score computation (0-100)
      const healthScore = this.computeHealthScore({
        conversionRate,
        uniqueResponseRatio,
        totalSubmissions,
        hourlyVelocity,
      });

      return {
        formId: input.formId,
        totalViews,
        totalSubmissions,
        conversionRate,
        avgCompletionSeconds: avgResult?.avg ?? null,
        dailyData,
        hourlyVelocity,
        dropoffFunnel,
        healthScore,
        uniqueResponseRatio,
      };
    });
  }

  /**
   * Hourly bucketed response velocity
   */
  private async getHourlyVelocity(
    formId: string,
    from: Date,
    to: Date
  ): Promise<Array<{ hour: string; count: number }>> {
    const rows = await db
      .select({
        hour: sql<string>`date_trunc('hour', ${formResponsesTable.submittedAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(formResponsesTable)
      .where(
        and(
          eq(formResponsesTable.formId, formId),
          gte(formResponsesTable.submittedAt, from),
          lte(formResponsesTable.submittedAt, to),
          eq(formResponsesTable.status, "completed")
        )
      )
      .groupBy(sql`date_trunc('hour', ${formResponsesTable.submittedAt})`)
      .orderBy(sql`date_trunc('hour', ${formResponsesTable.submittedAt})`);

    return rows.map((r) => ({ hour: r.hour, count: r.count }));
  }

  /**
   * Per-question drop-off funnel: for each field, how many responses answered it
   */
  private async getDropoffFunnel(
    formId: string
  ): Promise<Array<{ fieldId: string; label: string; answeredCount: number; dropoffRate: number }>> {
    const fields = await db
      .select({ id: formFieldsTable.id, label: formFieldsTable.label, order: formFieldsTable.order })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(formFieldsTable.order);

    if (fields.length === 0) return [];

    const fieldIds = fields.map((f) => f.id);

    const answerCounts = await db
      .select({
        fieldId: responseAnswersTable.fieldId,
        count: sql<number>`count(distinct ${responseAnswersTable.responseId})::int`,
      })
      .from(responseAnswersTable)
      .where(
        and(
          eq(responseAnswersTable.formId, formId),
          inArray(responseAnswersTable.fieldId, fieldIds)
        )
      )
      .groupBy(responseAnswersTable.fieldId);

    const countMap = new Map(answerCounts.map((r) => [r.fieldId, r.count]));
    const maxCount = Math.max(...Array.from(countMap.values()), 1);

    return fields.map((f) => {
      const answered = countMap.get(f.id) ?? 0;
      const dropoffRate = maxCount > 0 ? Math.round(((maxCount - answered) / maxCount) * 1000) / 10 : 0;
      return { fieldId: f.id, label: f.label, answeredCount: answered, dropoffRate };
    });
  }

  /**
   * Compute health score (0–100) based on completion rate, unique ratio, velocity
   */
  private computeHealthScore(opts: {
    conversionRate: number;
    uniqueResponseRatio: number;
    totalSubmissions: number;
    hourlyVelocity: Array<{ hour: string; count: number }>;
  }): number {
    // Weighted score:
    // 40% completion (conversion) rate
    // 30% unique submission ratio
    // 30% velocity health (non-zero recent activity)
    const completionScore = Math.min(opts.conversionRate / 100, 1) * 40;
    const uniqueScore = Math.min(opts.uniqueResponseRatio / 100, 1) * 30;
    const velocityScore = opts.hourlyVelocity.length > 0 ? 30 : 0;
    return Math.round(completionScore + uniqueScore + velocityScore);
  }

  /**
   * Get daily view/submission breakdown
   */
  private async getDailyBreakdown(
    formId: string,
    from: Date,
    to: Date,
    groupBy: "day" | "week" | "month"
  ): Promise<DailyAnalytics[]> {
    const truncUnit = groupBy === "day" ? "day" : groupBy === "week" ? "week" : "month";

    // Use parameterized approach via sql template to avoid injection
    const truncExprViews = sql`date_trunc(${truncUnit}, ${formViewsTable.viewedAt})::date`;
    const truncExprSubs = sql`date_trunc(${truncUnit}, ${formResponsesTable.submittedAt})::date`;

    // Views per period
    const viewRows = await db
      .select({
        period: truncExprViews,
        count: sql<number>`count(*)::int`,
        uniqueIps: sql<number>`count(distinct ${formViewsTable.ipAddress})::int`,
      })
      .from(formViewsTable)
      .where(
        and(
          eq(formViewsTable.formId, formId),
          gte(formViewsTable.viewedAt, from),
          lte(formViewsTable.viewedAt, to)
        )
      )
      .groupBy(truncExprViews)
      .orderBy(truncExprViews);

    // Submissions per period
    const subRows = await db
      .select({
        period: truncExprSubs,
        count: sql<number>`count(*)::int`,
        avgCompletion: sql<number>`avg(${formResponsesTable.completionTimeSeconds})::int`,
      })
      .from(formResponsesTable)
      .where(
        and(
          eq(formResponsesTable.formId, formId),
          gte(formResponsesTable.submittedAt, from),
          lte(formResponsesTable.submittedAt, to)
        )
      )
      .groupBy(truncExprSubs)
      .orderBy(truncExprSubs);

    // Merge by date
    const periodMap = new Map<
      string,
      { views: number; submissions: number; uniqueVisitors: number; avgCompletion: number | null }
    >();

    for (const row of viewRows) {
      periodMap.set(String(row.period), {
        views: row.count,
        submissions: 0,
        uniqueVisitors: row.uniqueIps ?? 0,
        avgCompletion: null,
      });
    }

    for (const row of subRows) {
      const key = String(row.period);
      const existing = periodMap.get(key) ?? {
        views: 0,
        submissions: 0,
        uniqueVisitors: 0,
        avgCompletion: null,
      };
      periodMap.set(key, {
        ...existing,
        submissions: row.count,
        avgCompletion: row.avgCompletion ?? null,
      });
    }

    return Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        views: data.views,
        submissions: data.submissions,
        uniqueVisitors: data.uniqueVisitors,
        conversionRate:
          data.views > 0
            ? Math.round((data.submissions / data.views) * 1000) / 10
            : 0,
        avgCompletionSeconds: data.avgCompletion,
      }));
  }

  /**
   * Upsert daily analytics aggregate (called after each submission/view)
   */
  async upsertDailyAnalytics(formId: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0]!;

    const [viewCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formViewsTable)
      .where(
        and(
          eq(formViewsTable.formId, formId),
          sql`${formViewsTable.viewedAt}::date = ${today}`
        )
      );

    const [subCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formResponsesTable)
      .where(
        and(
          eq(formResponsesTable.formId, formId),
          sql`${formResponsesTable.submittedAt}::date = ${today}`
        )
      );

    const views = viewCount?.count ?? 0;
    const submissions = subCount?.count ?? 0;
    const conversionRate =
      views > 0 ? `${((submissions / views) * 100).toFixed(1)}%` : "0%";

    await db
      .insert(analyticsTable)
      .values({
        formId,
        date: today,
        views,
        submissions,
        conversionRate,
        uniqueVisitors: views,
      })
      .onConflictDoUpdate({
        target: [analyticsTable.formId, analyticsTable.date],
        set: { views, submissions, conversionRate, updatedAt: new Date() },
      });

    // Invalidate cache
    if (redisClient) {
      try { await redisClient.del(`analytics:${formId}:*`); } catch {}
    }
  }

  /**
   * Dashboard overview for a creator — FIXED: uses proper parameterized Drizzle inArray
   */
  async getCreatorDashboard(creatorId: string): Promise<{
    totalForms: number;
    totalResponses: number;
    totalViews: number;
    avgConversionRate: number;
  }> {
    const forms = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(
        and(
          eq(formsTable.creatorId, creatorId),
          eq(formsTable.isArchived, false)
        )
      );

    if (forms.length === 0) {
      return { totalForms: 0, totalResponses: 0, totalViews: 0, avgConversionRate: 0 };
    }

    const formIds = forms.map((f) => f.id);

    // FIXED: use inArray instead of string-interpolated ANY(ARRAY[...])
    const [respResult] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(formResponsesTable)
      .where(inArray(formResponsesTable.formId, formIds));

    const [viewResult] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(formViewsTable)
      .where(inArray(formViewsTable.formId, formIds));

    const totalViews = viewResult?.total ?? 0;
    const totalResponses = respResult?.total ?? 0;
    const avgConversionRate =
      totalViews > 0
        ? Math.round((totalResponses / totalViews) * 1000) / 10
        : 0;

    return { totalForms: forms.length, totalResponses, totalViews, avgConversionRate };
  }

  private defaultFromDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }
}

export const analyticsService = new AnalyticsService();
