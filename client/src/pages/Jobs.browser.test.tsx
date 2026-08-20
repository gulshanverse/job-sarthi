/** @vitest-environment jsdom */
import React, { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const queryCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("@/lib/trpc", () => ({
  trpc: {
    jobs: {
      list: {
        useQuery: (params: Record<string, unknown>) => {
          queryCalls.push(params);
          return {
            data: { items: [{ id: 1 }], page: params.page, pageSize: 9, total: 27 },
            isError: false,
            isLoading: false,
            refetch: vi.fn(),
          };
        },
      },
    },
  },
}));

vi.mock("@/components/JobCard", () => ({ JobCard: () => null }));

import Jobs from "./Jobs";

function nextPageButton() {
  const button = Array.from(document.querySelectorAll("button")).find(element => element.querySelector("svg.lucide-chevron-right"));
  if (!button) throw new Error("Next-page control was not rendered");
  return button;
}

afterEach(() => {
  document.body.innerHTML = "";
  queryCalls.length = 0;
  vi.useRealTimers();
});

describe("Jobs browser query behavior", () => {
  it("reaches the pagination control through keyboard navigation with a visible focus state", async () => {
    const user = userEvent.setup();
    render(<Jobs />);
    const next = nextPageButton();
    for (let index = 0; index < 20 && document.activeElement !== next; index += 1) await user.tab();
    expect(document.activeElement).toBe(next);
    expect(next.matches(":focus-visible")).toBe(true);
    expect(next.className).toContain("focus-visible:ring");
  });

  it("debounces keyword queries and resets pagination when searches or filters change", () => {
    vi.useFakeTimers();
    render(<Jobs />);
    expect(nextPageButton().className).toContain("focus-visible:ring");
    fireEvent.click(nextPageButton());
    expect(queryCalls.at(-1)).toMatchObject({ page: 2, query: undefined });

    fireEvent.change(screen.getByPlaceholderText("Search title, company, location, or a required skill"), { target: { value: "Frontend" } });
    expect(queryCalls.at(-1)).toMatchObject({ page: 1, query: undefined });
    act(() => vi.advanceTimersByTime(320));
    expect(queryCalls.at(-1)).toMatchObject({ page: 1, query: "Frontend" });

    fireEvent.click(nextPageButton());
    expect(queryCalls.at(-1)).toMatchObject({ page: 2, role: undefined });
    fireEvent.change(screen.getByPlaceholderText("Role title"), { target: { value: "Frontend Engineer" } });
    expect(queryCalls.at(-1)).toMatchObject({ page: 1, role: "Frontend Engineer" });
    fireEvent.click(nextPageButton());
    expect(queryCalls.at(-1)).toMatchObject({ page: 2, query: "Frontend", role: "Frontend Engineer" });
  });
});
