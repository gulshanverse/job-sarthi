/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CommandNavigation } from "./CommandNavigation";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView = () => undefined;

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/dashboard");
});

describe("CommandNavigation browser interaction", () => {
  it("receives focus, opens with Ctrl+K, exposes the admin destination, and closes after selection", async () => {
    const user = userEvent.setup();
    render(<CommandNavigation isAdmin />);
    const trigger = screen.getByRole("button", { name: /search workspace/i });
    expect(trigger.className).toContain("focus-visible:ring");
    await user.tab();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.matches(":focus")).toBe(true);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByPlaceholderText("Navigate Job Sarthi…");
    expect(document.activeElement).toBe(input);
    expect(screen.getByText("Manage jobs")).toBeTruthy();
    await user.click(screen.getByText("Manage jobs"));
    expect(screen.queryByPlaceholderText("Navigate Job Sarthi…")).toBeNull();
    expect(window.location.pathname).toBe("/admin/jobs");
  });
});
