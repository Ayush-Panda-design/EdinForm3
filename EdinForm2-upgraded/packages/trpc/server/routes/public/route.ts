import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { formsService } from "@repo/services/forms";
import { analyticsService } from "@repo/services/analytics";

const TAGS = ["Public"];
const getPath = generatePath("/public");

const formFieldOutput = z.object({
  id: z.string(),
  formId: z.string(),
  pageId: z.string().nullable(),
  type: z.string(),
  label: z.string(),
  placeholder: z.string().nullable(),
  helpText: z.string().nullable(),
  required: z.boolean(),
  order: z.number(),
  options: z.any().nullable(),
  validationRules: z.any().nullable(),
  conditionalLogic: z.any().nullable(),
  isLocked: z.boolean().optional(),
});

export const publicRouter = router({
  /**
   * GET /public/forms/:slug
   * Respondents fetch a form by its URL slug to render it.
   * Works for 'public' and 'unlisted' visibility only.
   */
  getFormBySlug: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/forms/{slug}"), tags: TAGS } })
    .input(z.object({ slug: z.string() }))
    .output(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      slug: z.string(),
      visibility: z.string(),
      showProgressBar: z.boolean(),
      allowMultipleResponses: z.boolean(),
      submitButtonText: z.string().nullable(),
      successMessage: z.string().nullable(),
      themeId: z.string().nullable(),
      maxResponses: z.number().nullable(),
      closeAfterDate: z.date().nullable(),
      isClosed: z.boolean(),
      fields: z.array(formFieldOutput),
    }))
    .query(async ({ input, ctx }) => {
      const form = await formsService.getFormBySlug(input.slug);

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found." });
      }

      if (form.visibility === "unpublished") {
        throw new TRPCError({ code: "FORBIDDEN", message: "This form is not currently available." });
      }

      // Check expiry date
      if (form.closeAfterDate && new Date(form.closeAfterDate) < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This form has expired and is no longer accepting responses." });
      }

      // Check response limit
      if (form.maxResponses && form.maxResponses > 0) {
        const responseCount = await formsService.getResponseCount(form.id);
        if (responseCount >= form.maxResponses) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This form has reached its maximum number of responses." });
        }
      }

      // Record the view event (fire and forget)
      const ipAddress =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        ctx.req.socket.remoteAddress;
      const userAgent = ctx.req.headers["user-agent"];
      const referrer = ctx.req.headers.referer;

      Promise.all([
        formsService.recordView(form.id, { ipAddress, userAgent, referrer }),
        analyticsService.upsertDailyAnalytics(form.id),
      ]).catch(() => {});

      return {
        ...form,
        maxResponses: form.maxResponses ?? null,
        closeAfterDate: form.closeAfterDate ?? null,
        isClosed: false,
      };
    }),

  /**
   * GET /public/explore
   * Browse publicly listed forms
   */
  exploreForms: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/explore"), tags: TAGS } })
    .input(z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(12),
      search: z.string().optional(),
    }))
    .output(z.object({
      data: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        slug: z.string(),
        publishedAt: z.date().nullable(),
        createdAt: z.date().nullable(),
      })),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await formsService.listPublicForms(input);
      return {
        ...result,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(result.total / input.limit),
      };
    }),
});
