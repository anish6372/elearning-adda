import { render, screen } from "@testing-library/react";
import RevenueChart from "./revenue-chart";

const month = (label, revenue, sales = 1) => ({ label, year: 2026, revenue, sales });

describe("RevenueChart", () => {
  it("shows an empty-state message when there were no sales", () => {
    render(<RevenueChart monthly={[month("Jan", 0, 0), month("Feb", 0, 0)]} />);
    expect(screen.getByText("No paid orders in the last 6 months")).toBeInTheDocument();
  });

  it("scales bars relative to the best month", () => {
    const { container } = render(<RevenueChart monthly={[month("Jan", 50), month("Feb", 100)]} />);
    const [jan, feb] = container.querySelectorAll("rect");
    expect(Number(feb.getAttribute("height"))).toBeCloseTo(Number(jan.getAttribute("height")) * 2);
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("gives every bar an accessible description", () => {
    const { container } = render(<RevenueChart monthly={[month("Mar", 42.5, 3)]} />);
    expect(container.querySelector("title")).toHaveTextContent("Mar 2026: $42.50 from 3 sales");
  });
});
