import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the dashboard skeleton with candidate triage data", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Waywise Road Intelligence" })).toBeInTheDocument();
    expect(screen.getByText("Active candidates")).toBeInTheDocument();
    expect(screen.getByText("Avg. confidence")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimum confidence")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Queen St W & Spadina Ave/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("Candidate details")).toBeInTheDocument();
    expect(screen.getByText("Unique sources")).toBeInTheDocument();
  });
});
