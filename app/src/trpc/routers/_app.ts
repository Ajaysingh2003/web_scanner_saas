import { createTRPCRouter } from "../init";
import { userRouter } from "@/modules/user/server/procedures";
import { projectRouter } from "@/modules/project/server/procedures";
import { billingRouter } from "@/modules/billing/server/procedures";

export const appRouter = createTRPCRouter({
  user: userRouter,
  project: projectRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;

