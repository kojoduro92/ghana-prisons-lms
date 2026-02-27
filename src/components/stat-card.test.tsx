import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "@/components/stat-card";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Active Learners" value="785" helper="Current session" />);

    expect(screen.getByText("Active Learners")).toBeInTheDocument();
    expect(screen.getByText("785")).toBeInTheDocument();
    expect(screen.getByText("Current session")).toBeInTheDocument();
  });
});
