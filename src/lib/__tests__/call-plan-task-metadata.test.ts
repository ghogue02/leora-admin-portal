import { describe, expect, it } from "vitest";
import {
  composeTaskDescription,
  parseTaskMetadata,
  resolveActivityTypeMeta,
} from "../call-plan/task-metadata";

describe("call-plan task metadata helpers", () => {
  it("extracts activity type id and notes from task description", () => {
    const result = parseTaskMetadata("[activityType:abc-123] Meet with buyer");

    expect(result.activityTypeId).toBe("abc-123");
    expect(result.notes).toBe("Meet with buyer");
    expect(result.outcomeType).toBeNull();
  });

  it("extracts outcome metadata and strips tags", () => {
    const description =
      "[activityType:xyz][outcome:contacted:2024-10-20T18:00:00.000Z] Left voicemail";
    const result = parseTaskMetadata(description);

    expect(result.activityTypeId).toBe("xyz");
    expect(result.outcomeType).toBe("contacted");
    expect(result.outcomeTimestamp).toBe("2024-10-20T18:00:00.000Z");
    expect(result.notes).toBe("Left voicemail");
  });

  it("rebuilds description while preserving existing metadata", () => {
    const rebuilt = composeTaskDescription({
      activityTypeId: "type-1",
      outcomeType: "visited",
      outcomeTimestamp: "2024-10-21T15:30:00.000Z",
      notes: "Met with the wine director",
    });

    expect(rebuilt).toBe(
      "[activityType:type-1] [outcome:visited:2024-10-21T15:30:00.000Z] Met with the wine director"
    );
  });

  it("resolves activity type meta using code fallbacks", () => {
    const meta = resolveActivityTypeMeta({ code: "tasting" });
    expect(meta.key).toBe("tasting");
    expect(meta.label.toLowerCase()).toContain("tasting");

    const fallbackMeta = resolveActivityTypeMeta({ name: "Follow-up Email" });
    expect(fallbackMeta.key).toBe("email");
    expect(fallbackMeta.label).toBe("Follow-up Email");
  });
});
