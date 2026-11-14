import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Avatar, Button, Checkbox, Icon, Select, Switch, TextField } from "./index";
import { axeViolations } from "./test/axe";

describe("TextField action", () => {
  it("a compact button sits inside the field, next to the input", () => {
    render(<TextField label="Satıcı" helper="Adını tam yaz." action={<Button size="compact">Satıcıyı bul</Button>} />);
    const input = screen.getByLabelText("Satıcı");
    expect(input.parentElement?.contains(screen.getByRole("button", { name: "Satıcıyı bul" }))).toBe(true);
    expect(input.parentElement?.contains(screen.getByText("Adını tam yaz."))).toBe(false);
  });
});

describe("Button", () => {
  it("is a real button, type=button by default", () => {
    render(<Button>Takibi bitir</Button>);
    expect(screen.getByRole("button", { name: "Takibi bitir" })).toHaveProperty("type", "button");
  });

  it("while loading keeps its label for assistive technology and cannot be pressed again", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Kaydet
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Kaydet" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button).toHaveProperty("disabled", true);
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("compact button (components.button.compact): 36 px only from breakpoint.md with a mouse, 44 px hit area otherwise; same colours", () => {
    render(
      <>
        <Button size="compact">Ara</Button>
        <Button size="compact" variant="ghost" iconOnly icon={Trash2} label="Fotoğraf ekle" />
      </>,
    );
    const text = screen.getByRole("button", { name: "Ara" }).className.split(" ");
    expect(text).toEqual(expect.arrayContaining(["min-h-(--component-button-compact-height-touch)", "md:pointer-fine:min-h-(--component-button-compact-height)", "text-body-sm", "bg-primary"]));
    expect(text).not.toContain("min-h-(--component-button-primary-height)");
    const icon = screen.getByRole("button", { name: "Fotoğraf ekle" }).className.split(" ");
    expect(icon).toContain("md:pointer-fine:min-w-(--component-button-compact-height)");
  });

  it("ghost button is 44 px on touch and below breakpoint.md, 40 px only from breakpoint.md with a mouse", () => {
    render(<Button variant="ghost">Şimdi kontrol et</Button>);
    const classes = screen.getByRole("button").className.split(" ");
    expect(classes).toContain("min-h-(--component-button-ghost-height-touch)");
    expect(classes).toContain("md:pointer-fine:min-h-(--component-button-ghost-height)");
  });

  it("icon-only buttons carry their label as the accessible name", () => {
    render(<Button iconOnly icon={Trash2} label="Sil" variant="ghost" />);
    expect(screen.getByRole("button", { name: "Sil" })).toBeDefined();
  });
});

describe("Icon and Avatar", () => {
  it("are hidden from assistive technology unless labelled", () => {
    const { container } = render(
      <>
        <Icon icon={Trash2} />
        <Avatar initials="SB" />
        <Avatar initials="SB" label="Satıcı profili" />
      </>,
    );
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("img", { name: "Satıcı profili" })).toBeDefined();
  });
});

describe("TextField", () => {
  it("links the label, helper and error; error is announced by text, not colour only", () => {
    render(<TextField label="E-posta" helper="Yalnız bildirim için" error="Geçerli bir e-posta yaz" />);
    const input = screen.getByLabelText("E-posta");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(describedBy.map((id) => document.getElementById(id)?.textContent)).toEqual(["Geçerli bir e-posta yaz", "Yalnız bildirim için"]);
  });

  it("toggles password visibility", async () => {
    render(<TextField label="Şifre" type="password" showPasswordLabel="Şifreyi göster" hidePasswordLabel="Şifreyi gizle" />);
    const input = screen.getByLabelText("Şifre");
    expect(input.getAttribute("type")).toBe("password");
    await userEvent.click(screen.getByRole("button", { name: "Şifreyi göster" }));
    expect(input.getAttribute("type")).toBe("text");
    expect(screen.getByRole("button", { name: "Şifreyi gizle" }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Switch and Checkbox", () => {
  it("switch toggles immediately; a locked one is disabled with its reason", async () => {
    const onChange = vi.fn();
    render(
      <>
        <Switch label="Fırsat bildirimleri" checked={false} onCheckedChange={onChange} />
        <Switch label="Güvenlik" checked lockedReason="Kapatılamaz" onCheckedChange={onChange} />
      </>,
    );
    await userEvent.click(screen.getByRole("switch", { name: "Fırsat bildirimleri" }));
    expect(onChange).toHaveBeenCalledWith(true);
    const locked = screen.getByRole("switch", { name: "Güvenlik" });
    expect(locked).toHaveProperty("disabled", true);
    expect(locked.getAttribute("aria-describedby")?.split(" ").map((id) => document.getElementById(id)?.textContent)).toContain("Kapatılamaz");
  });

  it("checkbox is never pre-ticked by itself and supports indeterminate", () => {
    render(<Checkbox label="Tümünü seç" checked={false} indeterminate onCheckedChange={() => undefined} />);
    const box = screen.getByRole("checkbox", { name: "Tümünü seç" }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.indeterminate).toBe(true);
  });
});

function SortSelect() {
  const [value, setValue] = useState("smart");
  return (
    <Select
      label="Sırala"
      value={value}
      onValueChange={setValue}
      options={[
        { value: "smart", label: "Önce fırsatlar" },
        { value: "new", label: "En yeni" },
        { value: "saving", label: "En çok kazanç", count: 3 },
      ]}
    />
  );
}

describe("Select", () => {
  it("opens, moves and chooses with the keyboard; Escape closes", async () => {
    render(<SortSelect />);
    const combo = screen.getByRole("combobox", { name: /Sırala/ });
    combo.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(combo.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).toBeDefined();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(combo.textContent).toContain("En çok kazanç");
    expect(combo.getAttribute("aria-expanded")).toBe("false");
    await userEvent.keyboard("{ArrowDown}{Escape}");
    expect(combo.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(combo);
  });
});

describe("accessibility", () => {
  it("primitives have no axe violation", async () => {
    render(
      <main>
        <Button>Ürün ekle</Button>
        <Button variant="deal">Fırsatı gör</Button>
        <Button iconOnly icon={Trash2} label="Sil" variant="ghost" />
        <TextField label="E-posta" error="Geçerli bir e-posta yaz" />
        <Switch label="Fırsat bildirimleri" checked onCheckedChange={() => undefined} />
        <Checkbox label="Koşulları kabul ediyorum" checked={false} onCheckedChange={() => undefined} />
        <SortSelect />
        <Avatar initials="SB" label="Profil" />
      </main>,
    );
    expect(await axeViolations()).toEqual([]);
  });
});
