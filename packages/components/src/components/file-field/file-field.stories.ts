import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Tag } from "../tag/tag";
import type { FileField } from "./file-field";

const meta = preview.meta({
  title: "Components/File field",
  component: "u-file-field",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'The `u-file-field` component picks files for a form, with a native `<input type="file">`. Under it, the files chosen, each with a button that removes it. The form receives each file under `name`.',
      },
    },
  },
});

/** A PDF of `size` bytes. */
function pdf(name: string, size = 1200) {
  return new File(["%".repeat(size)], name, { type: "application/pdf" });
}

/**
 * Chooses `files` in the native input, as the system's picker does: its
 * `files`, then `input` and `change`. `userEvent.upload()` would replace
 * `files` with a getter, which the field can't set when a file is removed.
 */
function choose(input: HTMLInputElement, files: File[]) {
  const transfer = new DataTransfer();
  for (const file of files) {
    transfer.items.add(file);
  }
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/** The field of the story, once rendered, and its inner elements. */
async function fieldIn(canvasElement: HTMLElement) {
  const field = canvasElement.querySelector<FileField>("u-file-field")!;
  await field.updateComplete;
  return {
    field,
    input: field.shadowRoot!.querySelector<HTMLInputElement>('[part~="input"]')!,
    tags: () => [...field.shadowRoot!.querySelectorAll<Tag>('[part~="file"]')],
  };
}

export const Default = meta.story({
  render: () => html`
    <div lang="en">
      <u-file-field
        label="Supporting documents"
        hint="PDF, 10 MB at most per file."
        name="documents"
        accept=".pdf"
        multiple
      ></u-file-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const { field, input, tags } = await fieldIn(canvasElement);
    const onChange = fn();
    field.addEventListener("change", onChange);
    choose(input, [pdf("payslip.pdf"), pdf("tax-notice.pdf", 2_400_000)]);
    await waitFor(() => expect(tags()).toHaveLength(2));
    expect(field.files.map((file) => file.name)).toEqual(["payslip.pdf", "tax-notice.pdf"]);
    expect(tags()[1]!.textContent).toBe("tax-notice.pdf (2.4 MB)");
    expect(onChange).toHaveBeenCalledOnce();

    // Remove the first file: the second stays, and the input holds it.
    const first = tags()[0]!;
    await first.updateComplete;
    await userEvent.click(first.shadowRoot!.querySelector('[part~="remove-button"]')!);
    await waitFor(() => expect(tags()).toHaveLength(1));
    expect(field.files.map((file) => file.name)).toEqual(["tax-notice.pdf"]);
    expect(input.files?.length).toBe(1);
    expect(onChange).toHaveBeenCalledTimes(2);
    // The focus moves to the file left, then to the input.
    const last = tags()[0]!;
    await waitFor(() => expect(field.shadowRoot!.activeElement).toBe(last));
    await userEvent.click(last.shadowRoot!.querySelector('[part~="remove-button"]')!);
    await waitFor(() => expect(field.shadowRoot!.activeElement).toBe(input));
    expect(field.files).toEqual([]);
  },
});

export const InForm = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A required field: the form doesn't submit without a file. Then it receives each file under `name`.",
      },
    },
  },
  render: () => {
    const submit = (event: SubmitEvent) => {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const files = new FormData(form).getAll("proof") as File[];
      form.querySelector("output")!.value = files.map((file) => file.name).join(", ");
    };
    return html`
      <form @submit=${submit}>
        <u-file-field label="Proof of address" name="proof" accept=".pdf" required></u-file-field>
        <p><u-button type="submit">Send</u-button></p>
        <output></output>
      </form>
    `;
  },
  play: async ({ canvasElement }) => {
    const { field, input } = await fieldIn(canvasElement);
    const form = canvasElement.querySelector("form")!;
    expect(form.checkValidity()).toBe(false);
    expect(field.validity.valueMissing).toBe(true);
    choose(input, [pdf("electricity-bill.pdf")]);
    await waitFor(() => expect(field.validity.valid).toBe(true));
    form.requestSubmit();
    await waitFor(() =>
      expect(canvasElement.querySelector("output")!.value).toBe("electricity-bill.pdf"),
    );
  },
});
