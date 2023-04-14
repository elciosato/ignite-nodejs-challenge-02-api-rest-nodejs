import fastify from "fastify";
import cookie from "@fastify/cookie";
import { mealsRoutes } from "./routes/mealsRoutes";

export const app = fastify();

app.register(cookie);
app.register(mealsRoutes, {
  prefix: "/meals",
});

app.get("/hello", () => {
  return "Hello World!";
});
