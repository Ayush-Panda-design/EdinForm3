import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";
import { createContext } from "./context";

// ✅ Fix: Awaited<ReturnType<...>> gives tRPC the resolved object shape,
// not the function type. Without this, ctx.user has no known type and
// the null-guard cannot narrow it.
type Context = Awaited<ReturnType<typeof createContext>>;

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<Context>()
  .create({
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          domainCode: error.message,
          httpStatus: shape.data.httpStatus,
          stack:
            process.env.NODE_ENV === "development"
              ? shape.data.stack
              : undefined,
        },
      };
    },
  });

export const router = tRPCContext.router;

/** Public procedure — no auth required */
export const publicProcedure = tRPCContext.procedure;

/** Protected procedure — requires valid session token */
export const protectedProcedure = tRPCContext.procedure.use(
  tRPCContext.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be signed in to perform this action.",
      });
    }
    // ✅ Fix: spread ctx and re-declare user so TypeScript narrows the type
    // to non-null. Downstream procedures can safely access ctx.user.id etc.
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);

/** Admin procedure — requires role === 'admin' */
export const adminProcedure = protectedProcedure.use(
  tRPCContext.middleware(({ ctx, next }) => {
    // ctx.user is guaranteed non-null here because protectedProcedure runs first
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required.",
      });
    }
    return next({ ctx });
  })
);