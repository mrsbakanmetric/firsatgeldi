import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ActionCard, Avatar, AvatarCrop, AvatarUpload, ChannelMatrix, ChoiceCards, MaskedValue, PermissionGroup, RoleCard, SavedIndicator, SessionRow, SettingRow, SettingsNav, ToggleChips } from "./index";
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

  it("ToggleChips: the all chip is exclusive; clearing the others presses it", async () => {
    const onValueChange = vi.fn();
    const options = [
      { value: "ALWAYS", label: "Her zaman" },
      { value: "MORNING", label: "Sabah" },
      { value: "NOON", label: "Öğle" },
    ];
    const { rerender, container } = render(<ToggleChips label="Saat dilimleri" options={options} value={["ALWAYS"]} allValue="ALWAYS" onValueChange={onValueChange} />);
    expect(screen.getByRole("button", { name: "Her zaman" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Öğle" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["NOON"]);
    rerender(<ToggleChips label="Saat dilimleri" options={options} value={["NOON"]} allValue="ALWAYS" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Sabah" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["MORNING", "NOON"]);
    await userEvent.click(screen.getByRole("button", { name: "Öğle" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["ALWAYS"]);
    await userEvent.click(screen.getByRole("button", { name: "Her zaman" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["ALWAYS"]);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ChannelMatrix: a switch per cell, group headings, locked rows cannot change", async () => {
    const onToggle = vi.fn();
    const { container } = render(
      <ChannelMatrix
        label="Bildirim türleri"
        rowHeader="Bildirim"
        channels={[
          { id: "IN_APP", label: "Uygulama içi" },
          { id: "EMAIL", label: "E-posta" },
        ]}
        rows={[
          { id: "DEAL_FOUND", title: "Fırsat geldi", description: "Daha ucuzu çıkınca", heading: "Kendi takiplerin", values: { IN_APP: true, EMAIL: false } },
          { id: "ACCOUNT", title: "Hesap ve güvenlik", description: "Yeni cihaz", values: { IN_APP: true, EMAIL: true }, lockedLabel: "kapatılamaz" },
        ]}
        switchLabel={(row, channel) => [row.title, channel.label].join(" · ")}
        onToggle={onToggle}
      />,
    );
    expect(screen.getByRole("table", { name: "Bildirim türleri" })).toBeDefined();
    expect(screen.getByText("Kendi takiplerin")).toBeDefined();
    expect(screen.getByText("Hesap ve güvenlik · kapatılamaz")).toBeDefined();
    await userEvent.click(screen.getByRole("switch", { name: "Fırsat geldi · E-posta" }));
    expect(onToggle).toHaveBeenCalledWith("DEAL_FOUND", "EMAIL", true);
    const locked = screen.getByRole("switch", { name: "Hesap ve güvenlik · E-posta" }) as HTMLButtonElement;
    expect(locked.disabled).toBe(true);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ActionCard, RoleCard and PermissionGroup show their parts", async () => {
    const { container } = render(
      <div>
        <ActionCard icon={Download} title="Verilerimi indir" text="Tek dosyada" action={<button type="button">Dosya hazırla</button>} />
        <RoleCard icon={ShieldCheck} title="Uygulama Yöneticisi" text="Her şeyi görür" link={{ href: "/tr/admin/roller", label: "Roller ve Yetkiler" }} />
        <PermissionGroup title="Kendi hesabın" count="2 / 2 yetki" keys={["admin.self.activity.view", "admin.self.permissions.view"]} />
      </div>,
    );
    expect(screen.getByRole("heading", { name: "Verilerimi indir" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Dosya hazırla" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Roller ve Yetkiler" }).getAttribute("href")).toBe("/tr/admin/roller");
    expect(screen.getByText("admin.self.activity.view").tagName).toBe("CODE");
    expect(screen.getByText("2 / 2 yetki")).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });
});
