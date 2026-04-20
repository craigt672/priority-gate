import { createGate } from "../src/index.js";

interface Event {
  source: string;
  type: string;
  label: string;
  confidence?: number;
}

const gate = createGate<Event>()
  .rule({
    name: "drop low-confidence detections",
    when: (e) => e.type === "detection" && (e.confidence ?? 1) < 0.3,
    then: "drop",
    reason: (e) => `confidence ${e.confidence} below threshold`,
  })
  .rule({
    name: "direct user commands",
    when: (e) => e.type === "command" && e.source.startsWith("user."),
    then: "direct",
  })
  .rule({
    name: "escalate faults",
    when: (e) => e.type === "fault",
    then: "escalate",
  })
  .default("log");

const events: Event[] = [
  { source: "yolo.cam01", type: "detection", label: "person", confidence: 0.92 },
  { source: "yolo.cam01", type: "detection", label: "cat", confidence: 0.18 },
  { source: "user.cli", type: "command", label: "status_check" },
  { source: "device.puck.kitchen", type: "fault", label: "heartbeat_loss" },
  { source: "ble.motion.hallway", type: "sensor_read", label: "motion" },
];

for (const e of events) {
  const v = gate.evaluate(e);
  console.log(`${v.action.toUpperCase()}  ${e.source}  (${v.rule}${v.reason ? ": " + v.reason : ""})`);
}

// LOG        yolo.cam01              (default)
// DROP       yolo.cam01              (drop low-confidence detections: confidence 0.18 below threshold)
// DIRECT     user.cli                (direct user commands)
// ESCALATE   device.puck.kitchen     (escalate faults)
// LOG        ble.motion.hallway      (default)
