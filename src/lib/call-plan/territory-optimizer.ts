import { differenceInCalendarDays } from "date-fns";

const AVG_DRIVING_SPEED_MPH = 35;

export type TerritoryAccount = {
  id: string;
  customerId: string;
  customerName: string;
  territory: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  state?: string | null;
  lastOrderDate?: Date | null;
};

export type TerritoryBlockInfo = {
  id: string;
  territory: string;
  dayOfWeek: number;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type TerritorySuggestion = {
  territory: string;
  suggestedDayOfWeek: number;
  existingBlockId?: string;
  estimatedMinutesSaved: number;
  accountCount: number;
  accounts: Array<{
    id: string;
    customerId: string;
    name: string;
    city?: string | null;
    state?: string | null;
  }>;
  message: string;
  rationale: string[];
};

const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

type SuggestionInput = {
  accounts: TerritoryAccount[];
  blocks: TerritoryBlockInfo[];
  planningWindow?: number[];
};

export function generateTerritorySuggestions({
  accounts,
  blocks,
  planningWindow = [1, 2, 3, 4, 5],
}: SuggestionInput): TerritorySuggestion[] {
  const accountsByTerritory = groupAccountsByTerritory(accounts);
  const occupiedDaySlots = new Map<number, Set<string>>();
  blocks.forEach((block) => {
    if (!occupiedDaySlots.has(block.dayOfWeek)) {
      occupiedDaySlots.set(block.dayOfWeek, new Set());
    }
    occupiedDaySlots.get(block.dayOfWeek)?.add(block.territory);
  });

  const suggestions: TerritorySuggestion[] = [];

  for (const [territory, territoryAccounts] of accountsByTerritory.entries()) {
    if (territoryAccounts.length < 2) {
      continue;
    }

    const blockForTerritory = blocks.find(
      (block) => block.territory === territory,
    );

    const candidateDay =
      blockForTerritory?.dayOfWeek ??
      selectBestDay(territory, occupiedDaySlots, planningWindow);

    const estimatedMinutesSaved = estimateDriveTimeSavings(territoryAccounts);
    const rationale: string[] = [];

    rationale.push(
      `${territoryAccounts.length} accounts in territory ${territory}`,
    );

    const dormantAccounts = territoryAccounts.filter(
      (account) =>
        account.lastOrderDate &&
        differenceInCalendarDays(new Date(), account.lastOrderDate) > 45,
    );
    if (dormantAccounts.length > 0) {
      rationale.push(`${dormantAccounts.length} dormant accounts (no order in 45+ days)`);
    }

    const accountsPayload = territoryAccounts.map((account) => ({
      id: account.id,
      customerId: account.customerId,
      name: account.customerName,
      city: account.city,
      state: account.state,
    }));

    const message = `Scheduling all ${territory} accounts on ${DAY_NAMES[candidateDay]} could save approximately ${Math.round(
      estimatedMinutesSaved,
    )} minutes of drive time.`;

    suggestions.push({
      territory,
      suggestedDayOfWeek: candidateDay,
      existingBlockId: blockForTerritory?.id,
      estimatedMinutesSaved,
      accountCount: territoryAccounts.length,
      accounts: accountsPayload,
      message,
      rationale,
    });
  }

  return suggestions.sort((a, b) => b.estimatedMinutesSaved - a.estimatedMinutesSaved);
}

function groupAccountsByTerritory(accounts: TerritoryAccount[]) {
  const map = new Map<string, TerritoryAccount[]>();
  accounts.forEach((account) => {
    if (!account.territory) return;
    if (!map.has(account.territory)) {
      map.set(account.territory, []);
    }
    map.get(account.territory)?.push(account);
  });
  return map;
}

function selectBestDay(
  territory: string,
  occupiedDaySlots: Map<number, Set<string>>,
  planningWindow: number[],
): number {
  for (const day of planningWindow) {
    const territories = occupiedDaySlots.get(day);
    if (!territories || !territories.has(territory)) {
      return day;
    }
  }
  return planningWindow[0] ?? 1;
}

function estimateDriveTimeSavings(accounts: TerritoryAccount[]) {
  const coords = accounts
    .map((account) => ({
      latitude: account.latitude ?? undefined,
      longitude: account.longitude ?? undefined,
    }))
    .filter(
      (coord): coord is { latitude: number; longitude: number } =>
        typeof coord.latitude === "number" && typeof coord.longitude === "number",
    );

  if (coords.length < 2) {
    return 45; // fallback savings in minutes
  }

  let distanceSumMiles = 0;
  let pairCount = 0;

  for (let i = 0; i < coords.length; i += 1) {
    for (let j = i + 1; j < coords.length; j += 1) {
      distanceSumMiles += haversineMiles(coords[i], coords[j]);
      pairCount += 1;
    }
  }

  const averageDistance = distanceSumMiles / Math.max(pairCount, 1);

  // Convert distance to minutes saved assuming fewer cross-territory trips.
  const estimatedHours = averageDistance / AVG_DRIVING_SPEED_MPH;
  const baseSavings = estimatedHours * 60 * Math.max(coords.length - 1, 1);

  return Math.min(180, Math.max(30, baseSavings));
}

function haversineMiles(
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number },
) {
  const R = 3958.8; // Earth radius in miles
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const dLat = toRadians(pointB.latitude - pointA.latitude);
  const dLon = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
