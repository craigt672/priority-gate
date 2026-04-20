import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PriorityGate, createGate } from "../src/index.js";

interface Event {
  type: string;
  source: string;
  confidence?: number;
}

describe("PriorityGate", () => {
  it("returns the default action when no rule matches", () => {
    const gate = new PriorityGate<Event>().default("log");
    const verdict = gate.evaluate({ type: "sensor_read", source: "ble.01" });
    assert.equal(verdict.action, "log");
    assert.equal(verdict.rule, "default");
  });

  it("matches the first rule that applies", () => {
    const gate = new PriorityGate<Event>()
      .rule({
        name: "drop low confidence",
        when: (e) => (e.confidence ?? 1) < 0.3,
        then: "drop",
      })
      .rule({
        name: "escalate detections",
        when: (e) => e.type === "detection",
        then: "escalate",
      })
      .default("log");

    const low = gate.evaluate({ type: "detection", source: "yolo", confidence: 0.1 });
    assert.equal(low.action, "drop");
    assert.equal(low.rule, "drop low confidence");

    const high = gate.evaluate({ type: "detection", source: "yolo", confidence: 0.9 });
    assert.equal(high.action, "escalate");
    assert.equal(high.rule, "escalate detections");
  });

  it("evaluates rules in declaration order", () => {
    const gate = new PriorityGate<Event>()
      .rule({ name: "first", when: () => true, then: "direct" })
      .rule({ name: "second", when: () => true, then: "drop" })
      .default("log");

    const v = gate.evaluate({ type: "command", source: "user.cli" });
    assert.equal(v.rule, "first");
    assert.equal(v.action, "direct");
  });

  it("returns reason when provided", () => {
    const gate = new PriorityGate<Event>()
      .rule({
        name: "drop low confidence",
        when: (e) => (e.confidence ?? 1) < 0.3,
        then: "drop",
        reason: (e) => `confidence ${e.confidence} below 0.3`,
      })
      .default("log");

    const v = gate.evaluate({ type: "detection", source: "yolo", confidence: 0.12 });
    assert.equal(v.reason, "confidence 0.12 below 0.3");
  });

  it("buckets a batch via filter()", () => {
    const gate = createGate<Event>()
      .rule({ name: "drops", when: (e) => e.source === "noise", then: "drop" })
      .rule({ name: "esc", when: (e) => e.type === "fault", then: "escalate" })
      .rule({ name: "dir", when: (e) => e.type === "command", then: "direct" })
      .default("log");

    const events: Event[] = [
      { type: "sensor_read", source: "noise" },
      { type: "sensor_read", source: "ble.01" },
      { type: "fault", source: "puck.01" },
      { type: "command", source: "user.cli" },
      { type: "sensor_read", source: "ble.02" },
    ];

    const bucketed = gate.filter(events);
    assert.equal(bucketed.drop.length, 1);
    assert.equal(bucketed.log.length, 2);
    assert.equal(bucketed.escalate.length, 1);
    assert.equal(bucketed.direct.length, 1);
  });

  it("defaults to 'log' when no default is set", () => {
    const gate = new PriorityGate<Event>();
    const v = gate.evaluate({ type: "sensor_read", source: "ble.01" });
    assert.equal(v.action, "log");
  });
});
