/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const notificationMocks = vi.hoisted(() => ({
  dismiss: vi.fn(),
  invalidate: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      list: {
        useQuery: () => ({
          data: {
            unreadCount: 1,
            items: [{
              id: 7,
              title: "A strong match is ready",
              body: "Your profile aligns with this role.",
              href: "/jobs/42",
              readAt: null,
              createdAt: new Date("2026-08-20T00:00:00Z"),
            }],
          },
          isLoading: false,
        }),
      },
      markRead: { useMutation: () => ({ isPending: false, mutate: notificationMocks.markRead }) },
      dismiss: { useMutation: () => ({ isPending: false, mutate: notificationMocks.dismiss }) },
    },
    useUtils: () => ({ notifications: { list: { invalidate: notificationMocks.invalidate } } }),
  },
}));

import { NotificationMenu } from "./NotificationMenu";

Element.prototype.scrollIntoView = () => undefined;

afterEach(() => {
  document.body.innerHTML = "";
  notificationMocks.dismiss.mockReset();
  notificationMocks.invalidate.mockReset();
  notificationMocks.markRead.mockReset();
});

describe("NotificationMenu browser interaction", () => {
  it("supports keyboard focus and exposes protected notification read and dismiss controls", async () => {
    const user = userEvent.setup();
    render(<NotificationMenu />);
    const trigger = screen.getByRole("button", { name: "1 unread notifications" });
    expect(trigger.className).toContain("focus-visible:ring");
    await user.tab();
    expect(document.activeElement).toBe(trigger);
    await user.keyboard("{Enter}");
    expect(await screen.findByText("A strong match is ready")).toBeTruthy();
    const markRead = screen.getByRole("button", { name: "Mark as read" });
    const dismiss = screen.getByRole("button", { name: "Dismiss notification" });
    markRead.focus();
    expect(document.activeElement).toBe(markRead);
    expect(markRead.matches(":focus")).toBe(true);
    expect(markRead.className).toContain("focus-visible:ring-2");
    expect(dismiss.className).toContain("focus-visible:ring-2");
    await user.click(markRead);
    await user.click(dismiss);
    expect(notificationMocks.markRead).toHaveBeenCalledWith({ notificationId: 7 });
    expect(notificationMocks.dismiss).toHaveBeenCalledWith({ notificationId: 7 });
  });
});
