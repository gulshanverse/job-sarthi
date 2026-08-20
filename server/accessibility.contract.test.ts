import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("protected workspace accessibility contracts", () => {
  it("keeps keyboard command navigation and a labeled dialog entry point", () => {
    const command = source("../client/src/components/CommandNavigation.tsx");
    expect(command).toContain("event.key.toLowerCase() === \"k\"");
    expect(command).toContain("CommandDialog");
    expect(command).toContain("Search workspace");
  });

  it("keeps notification actions keyboard-focusable and explicitly labeled", () => {
    const notifications = source("../client/src/components/NotificationMenu.tsx");
    expect(notifications).toContain("aria-label={unread");
    expect(notifications).toContain('aria-label="Mark as read"');
    expect(notifications).toContain('aria-label="Dismiss notification"');
  });
});
