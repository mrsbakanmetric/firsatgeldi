import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, Menu, Sheet } from "./index";
import { axeViolations } from "./test/axe";

function DialogHarness({ kind }: { kind: "dialog" | "sheet" }) {
  const [open, setOpen] = useState(false);
  return (
    <main>
      <button type="button" onClick={() => setOpen(true)}>
        Ürün ekle
      </button>
      {kind === "dialog" ? (
        <Dialog open={open} onClose={() => setOpen(false)} title="Ürün ekle" description="Ürünü bul" closeLabel="Kapat" aside={<button type="button">Evet, bunu aldım</button>}>
          <input aria-label="Ara" />
        </Dialog>
      ) : (
        <Sheet open={open} onClose={() => setOpen(false)} title="Emin ol, sonra onayla" closeLabel="Paneli kapat">
          <input aria-label="Fiyat" />
        </Sheet>
      )}
    </main>
  );
}

describe.each(["dialog", "sheet"] as const)("%s", (kind) => {
  it("moves focus in, traps Tab, closes on Escape and returns focus to the opener", async () => {
    render(<DialogHarness kind={kind} />);
    const opener = screen.getByRole("button", { name: "Ürün ekle" });
    await userEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);
    for (let index = 0; index < 6; index += 1) await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("is labelled by its title and has no axe violation", async () => {
    render(<DialogHarness kind={kind} />);
    await userEvent.click(screen.getByRole("button", { name: "Ürün ekle" }));
    expect(screen.getByRole("dialog", { name: kind === "dialog" ? "Ürün ekle" : "Emin ol, sonra onayla" })).toBeDefined();
    expect(screen.getByRole("button", { name: kind === "dialog" ? "Kapat" : "Paneli kapat" })).toBeDefined();
    expect(await axeViolations()).toEqual([]);
  });
});

describe("Menu", () => {
  it("opens from its button, moves with arrow keys, closes with Escape back to the opener", async () => {
    const onSignOut = vi.fn();
    render(
      <main>
        <Menu
          label="Profil menüsü"
          trigger={<button type="button">Profil</button>}
          items={[
            { id: "settings", label: "Ayarlar", icon: Settings, href: "/tr/ayarlar/bildirimler", current: true },
            { id: "sign-out", label: "Çıkış", icon: LogOut, onSelect: onSignOut },
          ]}
        />
      </main>,
    );
    const trigger = screen.getByRole("button", { name: "Profil" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu", { name: "Profil menüsü" })).toBeDefined();
    expect(document.activeElement?.textContent).toBe("Ayarlar");
    expect(screen.getByRole("menuitem", { name: "Ayarlar" }).getAttribute("aria-current")).toBe("page");
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Çıkış");
    expect(await axeViolations()).toEqual([]);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("menuitem", { name: "Çıkış" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
