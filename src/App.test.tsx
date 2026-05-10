import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("filters visible candidates by minimum confidence", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Minimum confidence"), {
      target: { value: "80" },
    });

    expect(screen.getAllByText("Queen St W & Spadina Ave").length).toBeGreaterThan(0);
    expect(screen.queryByText("College St & Ossington Ave")).not.toBeInTheDocument();
  });

  it("selects a candidate and updates its local status", () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: /Dundas St W & Bathurst St/i })[0]);

    const detailPanel = screen.getByLabelText("Selected candidate details");
    expect(within(detailPanel).getByRole("heading", { name: "Dundas St W & Bathurst St" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Current status"), {
      target: { value: "verified" },
    });

    expect(screen.getByLabelText("Current status")).toHaveValue("verified");
  });
});
