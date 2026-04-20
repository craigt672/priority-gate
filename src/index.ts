/**
 * priority-gate — filter events before expensive downstream calls.
 * Actions: drop, log, escalate, direct.
 */

export type Action = "drop" | "log" | "escalate" | "direct";

export interface Rule<E> {
  name: string;
  when: (event: E) => boolean;
  then: Action;
  reason?: (event: E) => string;
}

export interface Verdict {
  action: Action;
  rule: string;
  reason?: string;
}

export class PriorityGate<E = unknown> {
  private rules: Rule<E>[] = [];
  private defaultAction: Action = "log";
  private defaultRuleName = "default";

  rule(r: Rule<E>): this {
    this.rules.push(r);
    return this;
  }

  default(action: Action, name = "default"): this {
    this.defaultAction = action;
    this.defaultRuleName = name;
    return this;
  }

  evaluate(event: E): Verdict {
    for (const r of this.rules) {
      if (r.when(event)) {
        return {
          action: r.then,
          rule: r.name,
          reason: r.reason?.(event),
        };
      }
    }
    return { action: this.defaultAction, rule: this.defaultRuleName };
  }

  filter(events: E[]): Record<Action, E[]> {
    const out: Record<Action, E[]> = {
      drop: [],
      log: [],
      escalate: [],
      direct: [],
    };
    for (const e of events) {
      out[this.evaluate(e).action].push(e);
    }
    return out;
  }
}

export function createGate<E>(): PriorityGate<E> {
  return new PriorityGate<E>();
}
