import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FileDropzone } from "@/shared/upload/file-dropzone";

afterEach(cleanup);

describe("FileDropzone", () => {
  it("accepts a dropped file and lets the user remove it", async () => {
    const changed = vi.fn();
    const file = new File(["image"], "moon.webp", { type: "image/webp" });
    render(<FileDropzone accept="image/png,image/jpeg,image/webp" label="รูปผลงาน" maxBytes={100} onFileChange={changed} />);

    fireEvent.drop(screen.getByTestId("file-dropzone"), { dataTransfer: { files: [file] } });

    expect(changed).toHaveBeenCalledWith(file);
    expect(screen.getByText("moon.webp")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "ตัวอย่าง moon.webp" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "ลบไฟล์ moon.webp" }));
    expect(changed).toHaveBeenLastCalledWith(null);
  });

  it("rejects an unsupported or oversized dropped file", () => {
    const changed = vi.fn();
    render(<FileDropzone accept="image/webp" label="รูป" maxBytes={3} onFileChange={changed} />);
    fireEvent.drop(screen.getByTestId("file-dropzone"), { dataTransfer: { files: [new File(["large"], "bad.png", { type: "image/png" })] } });
    expect(changed).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("ชนิดไฟล์ไม่รองรับ");
  });
});
