import { FastifyRequest } from "fastify";
import { z } from "zod";
import { knex } from "../database";

export async function getMeal(request: FastifyRequest) {
  const { userId } = request.cookies;

  const getMealsParamsSchema = z.object({
    id: z.string().uuid(),
  });
  const { id } = getMealsParamsSchema.parse(request.params);

  const meal = await knex("meals")
    .select()
    .where({
      id,
      userId,
    })
    .first();

  return meal;
}
