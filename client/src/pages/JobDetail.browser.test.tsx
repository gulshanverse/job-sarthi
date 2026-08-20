/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const jobMocks = vi.hoisted(() => ({
  save: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    jobs: {
      get: {
        useQuery: () => ({
          data: {
            id: 42,
            title: "Frontend Engineer",
            company: "Example Co",
            location: "Bengaluru",
            workMode: "hybrid",
            employmentType: "full_time",
            experienceLevel: "entry",
            description: "Build accessible, reliable user interfaces with a thoughtful product team.",
            requirements: ["React", "TypeScript"],
            responsibilities: ["Build thoughtful product experiences"],
            niceToHave: ["GraphQL"],
            category: "Engineering",
            salaryRange: "₹12–16 LPA",
            requiredEducation: "Bachelor's degree or equivalent experience",
            deadline: null,
            status: "active",
            applicationUrl: "https://employer.example/apply",
            saved: false,
          },
          isError: false,
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      toggleSaved: { useMutation: () => ({ isPending: false, mutate: jobMocks.save }) },
      setApplicationStatus: { useMutation: () => ({ isPending: false, mutate: jobMocks.track }) },
    },
    useUtils: () => ({
      jobs: {
        applications: { invalidate: vi.fn() },
        get: { invalidate: vi.fn() },
        list: { invalidate: vi.fn() },
      },
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), message: vi.fn(), success: vi.fn() } }));

import JobDetail from "./JobDetail";

afterEach(() => {
  document.body.innerHTML = "";
  jobMocks.save.mockReset();
  jobMocks.track.mockReset();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/jobs/42");
});

describe("JobDetail browser interaction", () => {
  it("renders job metadata and requires opening the employer page before recording an external application", async () => {
    window.history.pushState({}, "", "/jobs/42");
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    render(<JobDetail />);

    expect(screen.getByRole("heading", { name: "Frontend Engineer" })).toBeTruthy();
    expect(screen.getByText("Example Co")).toBeTruthy();
    expect(screen.getByText("₹12–16 LPA")).toBeTruthy();
    expect(screen.getByText("Bachelor's degree or equivalent experience")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Track" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(jobMocks.track).toHaveBeenCalledWith({ jobId: 42, status: "saved" });
    expect(jobMocks.save).toHaveBeenCalledWith({ jobId: 42, saved: true });

    await user.click(screen.getByRole("button", { name: /open application/i }));
    expect(open).toHaveBeenCalledWith("https://employer.example/apply", "_blank", "noopener,noreferrer");
    const submitted = screen.getByRole("button", { name: "I submitted my application" });
    await user.click(submitted);
    expect(jobMocks.track).toHaveBeenLastCalledWith({ jobId: 42, status: "applied" });
  });
});
