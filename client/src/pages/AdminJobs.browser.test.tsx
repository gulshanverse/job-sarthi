/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ role: "user" as "user" | "admin" }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    loading: false,
    user: { id: 1, name: "Workspace user", email: "user@example.com", role: authState.role },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    adminJobs: {
      list: { useQuery: () => ({ data: [], isLoading: false }) },
      create: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      setStatus: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
    },
    useUtils: () => ({
      adminJobs: { list: { invalidate: vi.fn() } },
      jobs: { list: { invalidate: vi.fn() } },
      recommendations: { list: { invalidate: vi.fn() } },
    }),
  },
}));

import AdminJobs from "./AdminJobs";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AdminJobs browser role access", () => {
  it("shows the candidate-private access boundary to non-admin users", () => {
    authState.role = "user";
    render(<AdminJobs />);
    expect(screen.getByText("Admin access required.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Publish active job" })).toBeNull();
  });

  it("renders authorized publishing controls for administrators with a visible keyboard focus state", async () => {
    authState.role = "admin";
    const user = userEvent.setup();
    render(<AdminJobs />);
    const publish = screen.getByRole("button", { name: "Publish active job" });
    const title = screen.getByPlaceholderText("Product analyst");
    await user.tab();
    expect(document.activeElement).toBe(title);
    expect(title.matches(":focus-visible")).toBe(true);
    expect(title.className).toContain("focus-visible:ring");
    expect(publish).toBeTruthy();
    expect(screen.getByText("Manage active opportunities.")).toBeTruthy();
  });
});
