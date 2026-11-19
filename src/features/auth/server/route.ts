import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

const app = new Hono()
  .post("/login", zValidator("json", z.object({
        email: z.email(),
        password: z.string(),
      })),(c) => {
      const { email, password } = c.req.valid("json");

      return c.json({
        success: "ok",
      });
    }
  );

export default app;