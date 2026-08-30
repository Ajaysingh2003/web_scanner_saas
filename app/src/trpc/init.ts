import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import axios from "axios";
export const createTRPCContext = async () => {};
const apiBase = () => {
  const base = (process.env.BASE_API || "http://localhost:8000/api").replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
};
const t = initTRPC.create({
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure.use(async ({ next }) => {
  return next({ ctx: {} });
});

export const getUserProcedure = baseProcedure.use(async ({ ctx, next }) => {
  try {
    const cookieStore = await cookies();

    const access_token = cookieStore.get("access_token")?.value;

    const res = await axios.get(`${apiBase()}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return next({
      ctx: {
        ...ctx,
        user: res.data,
      },
    });
  } catch {
    return next({
      ctx: {
        ...ctx,
        user: null,
      },
    });
  }
});

export const protectedProcedure = (requiredPermissions: string[]) =>
  getUserProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user || ("role" in ctx.user && !requiredPermissions.includes(String(ctx.user.role)))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }

    return next({ ctx });
  });
