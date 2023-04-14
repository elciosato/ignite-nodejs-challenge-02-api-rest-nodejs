import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { knex } from "../database";
import { checkUserIdExist } from "../middlewares/check-userId-exist";
import { getMeal } from "../utils/getMeal";

export async function mealsRoutes(app: FastifyInstance) {
  app.post("/", async (request, reply) => {
    const createMealsBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      createdAt: z.string().datetime(),
      isDiet: z.boolean(),
    });
    const { name, description, createdAt, isDiet } =
      createMealsBodySchema.parse(request.body);

    let userId = request.cookies.userId;

    if (!userId) {
      userId = randomUUID();
      reply.cookie("userId", userId, {
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
    }

    const meal = {
      id: randomUUID(),
      userId,
      name,
      description,
      createdAt,
      isDiet,
    };

    await knex("meals").insert(meal);

    return reply.status(201).send({ meal });
  });

  app.get(
    "/",
    {
      preHandler: [checkUserIdExist],
    },
    async (request) => {
      const { userId } = request.cookies;
      const meals = await knex("meals")
        .select()
        .where({
          userId,
        })
        .orderBy("createdAt", "asc");
      return { meals };
    }
  );

  app.get(
    "/summary",
    {
      preHandler: [checkUserIdExist],
    },
    async (request) => {
      const { userId } = request.cookies;
      const meals = await knex("meals")
        .select()
        .where({
          userId,
        })
        .orderBy("createdAt", "asc");

      let totalMealsInDiet = 0;
      let totalMealsOutDiet = 0;

      let countMealsInDiet = 0;

      const dietSequence: number[] = [];

      meals.forEach((meal) => {
        if (meal.isDiet) {
          countMealsInDiet++;
          totalMealsInDiet++;
        } else {
          totalMealsOutDiet++;
          if (countMealsInDiet > 0) {
            dietSequence.push(countMealsInDiet);
            countMealsInDiet = 0;
          }
        }
      });

      dietSequence.push(countMealsInDiet);

      const bestSequence = dietSequence.reduce((g, s) => {
        if (s > g) {
          return s;
        } else {
          return g;
        }
      }, 0);

      const summary = {
        totalMeals: meals.length,
        totalMealsInDiet,
        totalMealsOutDiet,
        bestSequence,
      };

      return { summary };
    }
  );

  app.get(
    "/:id",
    {
      preHandler: [checkUserIdExist],
    },
    async (request, reply) => {
      const meal = await getMeal(request);

      if (!meal) {
        return reply.status(404).send({
          error: "Meal not found!",
        });
      }
      return { meal };
    }
  );

  app.delete(
    "/:id",
    {
      preHandler: [checkUserIdExist],
    },
    async (request, reply) => {
      const meal = await getMeal(request);

      if (!meal) {
        return reply.status(404).send({
          error: "Meal not found!",
        });
      }

      await knex("meals").delete().where({ id: meal.id, userId: meal.userId });

      return { meal };
    }
  );

  app.put(
    "/:id",
    {
      preHandler: [checkUserIdExist],
    },
    async (request, reply) => {
      const updateMealsBodySchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        createdAt: z.string().datetime().optional(),
        isDiet: z.boolean().optional(),
      });
      const { name, description, createdAt, isDiet } =
        updateMealsBodySchema.parse(request.body);

      const meal = await getMeal(request);

      if (!meal) {
        return reply.status(404).send({
          error: "Meal not found!",
        });
      }

      Object.assign(meal, { ...meal, name, description, createdAt, isDiet });

      await knex("meals")
        .update(meal)
        .where({ id: meal.id, userId: meal.userId });

      return { meal };
    }
  );
}
