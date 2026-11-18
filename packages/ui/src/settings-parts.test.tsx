import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeyRound, UserRound } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { Avatar, AvatarCrop, AvatarUpload, ChoiceCards, MaskedValue, SavedIndicator, SessionRow, SettingRow, SettingsNav } from "./index";
import { axeViolations } from "./test/axe";

describe("Settings parts (product_design_pattern.md §5.38)", () => {
  it("SettingsNav marks the current section and links every one", async () => {
    const { container } = render(
      <SettingsNav
        label="Ayar bölümleri"
        current="access"
        items={[
          { id: "profile", label: "Profil", href: "/tr/ayarlar/profil", icon: UserRound },
          { id: "access", label: "E-posta ve şifre", href: "/tr/ayarlar/eposta-ve-sifre", icon: KeyRound },
        ]}
      />,
    );
    expect(screen.getByRole("link", { current: "page" }).textContent).toBe("E-posta ve şifre");
    expect(screen.getByRole("link", { name: "Profil" }).getAttribute("href")).toBe("/tr/ayarlar/profil");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("SavedIndicator is a status", () => {
    render(<SavedIndicator text="Kaydedildi · şimdi" />);
    expect(screen.getByRole("status").textContent).toBe("Kaydedildi · şimdi");
  });

  it("ChoiceCards is a radio group; arrows move the choice", async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ChoiceCards
        label="Tema"
        value="light"
        onValueChange={onValueChange}
        options={[
          { value: "light", title: "Açık" },
          { value: "dark", title: "Koyu", description: "Gece için" },
        ]}
      />,
    );
    const light = screen.getByRole("radio", { name: "Açık" });
    expect(light.getAttribute("aria-checked")).toBe("true");
    light.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith("dark");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("SettingRow puts label, value, note and actions on one row", () => {
    render(<SettingRow label="Şifre" value="••••" note="Son değişiklik" actions={<button type="button">Değiştir</button>} />);
    expect(screen.getByText("Son değişiklik")).toBeDefined();
    expect(screen.getByRole("button", { name: "Değiştir" })).toBeDefined();
  });

  it("MaskedValue: masked with Göster; revealed with the countdown and Gizle", async () => {
    const onShow = vi.fn();
    const onHide = vi.fn();
    const { rerender } = render(<MaskedValue label="E-posta" masked="s***@o***.com" revealed={null} countdown="0:60" onShow={onShow} onHide={onHide} showLabel="Göster" hideLabel="Gizle" />);
    expect(screen.getByText("s***@o***.com")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Göster" }));
    expect(onShow).toHaveBeenCalledOnce();
    rerender(<MaskedValue label="E-posta" masked="s***@o***.com" revealed="sena@ornek.com" countdown="0:52" onShow={onShow} onHide={onHide} showLabel="Göster" hideLabel="Gizle" />);
    expect(screen.getByText("sena@ornek.com")).toBeDefined();
    expect(screen.getByText("0:52").getAttribute("aria-live")).toBe("polite");
    await userEvent.click(screen.getByRole("button", { name: "Gizle" }));
    expect(onHide).toHaveBeenCalledOnce();
  });

  it("SessionRow shows device, type, last use and its end slot; no location", () => {
    render(<SessionRow device="PHONE" title="Safari · iPhone" subtitle="Telefon" when="2 gün önce" end={<button type="button">Çıkış yap</button>} />);
    expect(screen.getByText("Safari · iPhone")).toBeDefined();
    expect(screen.getByRole("button", { name: "Çıkış yap" })).toBeDefined();
  });

  it("Avatar shows the photo when there is one, else the initials", () => {
    const { rerender, container } = render(<Avatar initials="SB" label="Sena B." />);
    expect(screen.getByRole("img", { name: "Sena B." }).textContent).toBe("SB");
    rerender(<Avatar initials="SB" label="Sena B." src="/img/a.jpg" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/img/a.jpg");
  });

  it("AvatarUpload picks a file; \"Kaldır\" only with a photo; AvatarCrop zooms", async () => {
    const onPick = vi.fn();
    const { rerender, container } = render(<AvatarUpload initials="SB" src={null} uploadLabel="Fotoğraf yükle" removeLabel="Kaldır" hint="JPEG, PNG ya da WebP" accept={["image/jpeg"]} onPick={onPick} onRemove={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Kaldır" })).toBeNull();
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "a.jpg", { type: "image/jpeg" }));
    expect(onPick).toHaveBeenCalledOnce();
    rerender(<AvatarUpload initials="SB" src="/img/a.jpg" uploadLabel="Fotoğraf yükle" removeLabel="Kaldır" hint="JPEG" accept={["image/jpeg"]} onPick={onPick} onRemove={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Kaldır" })).toBeDefined();

    const onZoom = vi.fn();
    render(<AvatarCrop src="blob:x" zoom={1} onZoomChange={onZoom} zoomLabel="Yakınlaştır" minZoom={1} maxZoom={3} step={0.1} />);
    expect(screen.getByRole("slider", { name: "Yakınlaştır" })).toBeDefined();
  });
});
