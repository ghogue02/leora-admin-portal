import { addWeeks, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";

interface SchedulerResult {
  created: number;
  skipped: number;
}

type Frequency = "weekly" | "biweekly" | "monthly";

function getWeeksToSchedule(
  frequency: Frequency,
  weekStart: Date,
  weeksAhead: number,
): Date[] {
  const weeks: Date[] = [];

  for (let i = 0; i <= weeksAhead; i += 1) {
    const targetWeek = addWeeks(weekStart, i);

    if (frequency === "weekly") {
      weeks.push(targetWeek);
    } else if (frequency === "biweekly") {
      if (i % 2 === 0) {
        weeks.push(targetWeek);
      }
    } else if (frequency === "monthly") {
      const beginningOfWeek = startOfWeek(targetWeek, { weekStartsOn: 1 });
      if (beginningOfWeek.getDate() <= 7) {
        weeks.push(targetWeek);
      }
    }
  }

  return weeks;
}

function getISOWeek(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { weekNumber, year: d.getUTCFullYear() };
}

export async function generateRecurringSchedules(
  tenantId: string,
  userId: string,
  callPlanId: string,
  weekStartDate: Date,
  weeksAhead: number = 2,
): Promise<SchedulerResult> {
  const baseCallPlan = await prisma.callPlan.findFirst({
    where: {
      id: callPlanId,
      tenantId,
      userId,
    },
  });

  if (!baseCallPlan) {
    throw new Error("Call plan not found for recurring generation");
  }

  const recurringSchedules = await prisma.recurringCallPlan.findMany({
    where: {
      tenantId,
      active: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const recurring of recurringSchedules) {
    const weeks = getWeeksToSchedule(recurring.frequency as Frequency, weekStartDate, weeksAhead);

    for (let index = 0; index < weeks.length; index += 1) {
      const targetWeek = weeks[index];
      const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
      const { weekNumber, year } = getISOWeek(weekStart);

      let weekCallPlan = index === 0 ? baseCallPlan : null;

      if (!weekCallPlan) {
        weekCallPlan = await prisma.callPlan.findFirst({
          where: {
            tenantId,
            userId,
            weekNumber,
            year,
          },
        });
      }

      if (!weekCallPlan) {
        skipped += 1;
        continue;
      }

      const dayOfWeek = recurring.dayOfWeek ?? 1; // Monday default
      const scheduledDate = new Date(weekStart);
      scheduledDate.setDate(weekStart.getDate() + dayOfWeek);

      const scheduledTime = recurring.preferredTime ?? "09:00";

      const existingSchedule = await prisma.callPlanSchedule.findFirst({
        where: {
          tenantId,
          callPlanId: weekCallPlan.id,
          customerId: recurring.customerId,
          scheduledDate,
          scheduledTime,
        },
      });

      if (existingSchedule) {
        skipped += 1;
        continue;
      }

      await prisma.callPlanSchedule.create({
        data: {
          tenantId,
          callPlanId: weekCallPlan.id,
          customerId: recurring.customerId,
          scheduledDate,
          scheduledTime,
          duration: 30,
        },
      });

      created += 1;
    }
  }

  return { created, skipped };
}
