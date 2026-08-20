// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn(), remove: vi.fn(), reminder: vi.fn(), cancel: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { applications: { detail: { useQuery: () => ({ data: { application: { id: 9, status: "interviewing" }, job: { id: 4, title: "Frontend Engineer", company: "Northstar", location: "Remote" }, notes: [{ id: 7, content: "Prepare system design.", updatedAt: new Date() }], reminder: null, timeline: [] }, isLoading: false, isError: false }) }, addNote: { useMutation: () => ({ isPending: false, mutate: calls.add }) }, updateNote: { useMutation: () => ({ isPending: false, mutate: calls.update }) }, deleteNote: { useMutation: () => ({ isPending: false, mutate: calls.remove }) }, saveReminder: { useMutation: () => ({ isPending: false, mutate: calls.reminder }) }, cancelReminder: { useMutation: () => ({ isPending: false, mutate: calls.cancel }) } }, jobs: { applications: { invalidate: vi.fn() } }, notifications: { list: { invalidate: vi.fn() } }, useUtils: () => ({ applications: { detail: { invalidate: vi.fn() } }, jobs: { applications: { invalidate: vi.fn() } }, notifications: { list: { invalidate: vi.fn() } } }) } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import ApplicationDetail from "./ApplicationDetail";

afterEach(() => { document.body.innerHTML = ""; Object.values(calls).forEach(mock => mock.mockReset()); window.history.pushState({}, "", "/applications/9"); });
describe("ApplicationDetail private organization", () => {
  it("supports editing a private note and scheduling an interview reminder", async () => {
    window.history.pushState({}, "", "/applications/9"); const user = userEvent.setup(); render(<ApplicationDetail />);
    expect(screen.getByRole("heading", { name: "Frontend Engineer" })).toBeTruthy(); await user.click(screen.getByRole("button", { name: "Edit private note" })); const editor = screen.getByDisplayValue("Prepare system design."); await user.clear(editor); await user.type(editor, "Review Node streams."); await user.click(screen.getByRole("button", { name: "Save edit" })); expect(calls.update).toHaveBeenCalledWith({ applicationId: 9, noteId: 7, content: "Review Node streams." });
    const date = new Date(Date.now() + 86_400_000); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); await user.type(screen.getByLabelText("Interview date and time"), local); await user.click(screen.getByRole("button", { name: "Save reminder" })); expect(calls.reminder).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 9, leadMinutes: 1440, title: "Interview reminder" }));
  });
});
