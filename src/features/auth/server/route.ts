import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

const app = new Hono()
  .post("/login", zValidator("json", z.object({
        email: z.string().email(),
        password: z.string(),
      })),(c) => {
      c.req.valid("json"); // TODO: use email + password once auth is wired up

      return c.json({
        success: "ok",
      });
    }
  );

export default app;
