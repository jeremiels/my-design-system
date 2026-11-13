// A live region announces what is added to it, not what it held when it
// appeared: the alert must be in the page, empty, before its message shows.
import { expect, it, vi } from "vitest";
import "../../define.js";
import type { Alert } from "./alert.js";

it("reveals its message in a live region that already exists", async () => {
  const alert = document.createElement("u-alert") as Alert;
  alert.innerHTML = "<p>Saved</p>";
  document.body.append(alert);
  await alert.updateComplete;

  const region = alert.shadowRoot!.querySelector('[part~="alert"]')!;
  const message = alert.querySelector("p")!;
  expect(region.getAttribute("role")).toBe("status");
  // Present for layout, absent from the accessibility tree.
  expect(getComputedStyle(message).visibility).toBe("hidden");
  expect(message.getBoundingClientRect().height).toBeGreaterThan(0);

  await vi.waitFor(() => expect(getComputedStyle(message).visibility).toBe("visible"));
  expect(getComputedStyle(region).opacity).toBe("1");
  alert.remove();
});
