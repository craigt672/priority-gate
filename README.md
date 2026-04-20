# priority-gate

Filter events before the expensive call. Four actions: `drop`, `log`, `escalate`, `direct`.

## Why

LLMs, vision models, and external APIs are slow and expensive. Most of the events flowing through your system don't need any of them. Route first, spend compute second.

## Install

```
npm install priority-gate
```

## Use

```ts
import { createGate } from "priority-gate";

const gate = createGate<Event>()
  .rule({
    name: "drop low-confidence detections",
    when: (e) => e.type === "detection" && (e.confidence ?? 1) < 0.3,
    then: "drop",
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

const verdict = gate.evaluate(event);
// { action: "direct", rule: "direct user commands" }
```

Batch mode:

```ts
const { drop, log, escalate, direct } = gate.filter(events);
```

## Actions

| Action | Use for |
|---|---|
| `drop` | Known noise. Discard entirely. |
| `log` | Normal activity. Record, move on. |
| `escalate` | Anomalies worth the expensive call (LLM, vision model, human review). |
| `direct` | User queries or explicit commands. Bypass filtering. |

## Rules

Rules evaluate in declaration order. First match wins. If no rule matches, the default action applies (`log` unless you change it).

```ts
interface Rule<E> {
  name: string;
  when: (event: E) => boolean;
  then: "drop" | "log" | "escalate" | "direct";
  reason?: (event: E) => string;
}
```

`reason` is optional and surfaces in the verdict for observability.

## Pairs well with

- [kade-protocol](https://github.com/craigt672/kade-protocol) for structured event envelopes.

## License

MIT.
