import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the dashboard identity", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Waywise" })).toBeInTheDocument();
    expect(screen.getByText("Passive road inspection dashboard")).toBeInTheDocument();
  });
});
