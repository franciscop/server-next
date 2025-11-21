import type { Context, EventCallback } from "../types";

export default function createEvents() {
  // Private
  const events: Context["events"] = {};
  events.on = (name: string, callback: EventCallback) => {
    events[name] = events[name] || [];
    events[name].push(callback);
  };
  events.trigger = (name: string, data?: any) => {
    if (!events[name]) return;
    for (const cb of events[name]) {
      cb(data);
    }
  };

  return events;
}
