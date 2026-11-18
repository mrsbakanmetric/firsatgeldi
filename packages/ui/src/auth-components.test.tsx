import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Camera } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { EmailSentBlock, GuestProductCard, HeroBlock, PageTemplate, PasswordRules, ProviderButton } from "./index";
import { axeViolations } from "./test/axe";

describe("Sign-in components (pagedesign.md §5, 2026-11-18)", () => {
  it("GuestProductCard reads as a status with name and variant", async () => {
    const { container } = render(<GuestProductCard title="Seçtiğin ürün seni bekliyor" name="Insta360 Ace Pro 2" variant="Flash Print" imageSrc={null} fallbackIcon={Camera} />);
    expect(screen.getByRole("status").textContent).toContain("Insta360 Ace Pro 2 · Flash Print");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ProviderButton is named by its label; the mark is decorative; loading blocks a second press", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<ProviderButton label="Google ile devam et" mark={<span>G</span>} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Google ile devam et" }));
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<ProviderButton label="Google ile devam et" mark={<span>G</span>} onClick={onClick} loading />);
    const button = screen.getByRole("button", { name: "Google ile devam et" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("PasswordRules says met / missing in words, politely live", async () => {
    const { container } = render(
      <PasswordRules
        label="Şifre kuralları"
        metLabel="tamam"
        unmetLabel="eksik"
        rules={[
          { id: "length", text: "En az 8 karakter", met: true },
          { id: "digit", text: "En az bir rakam", met: false },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Şifre kuralları" });
    expect(list.getAttribute("aria-live")).toBe("polite");
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["En az 8 karaktertamam", "En az bir rakameksik"]);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("EmailSentBlock shows the masked address, the spam hint and both actions", async () => {
    const { container } = render(
      <EmailSentBlock title="E-postanı doğrula" text="Şu adrese gönderdik:" emailMasked="s***@o***.com" spamHint="Gelmediyse istenmeyen klasörüne bak." resend={<button type="button">Tekrar gönder · 0:58</button>} back={<button type="button">Girişe dön</button>} />,
    );
    expect(screen.getByRole("heading", { name: "E-postanı doğrula" })).toBeDefined();
    expect(screen.getByText("s***@o***.com")).toBeDefined();
    expect(screen.getByRole("button", { name: "Girişe dön" })).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("HeroBlock is a named region", () => {
    render(
      <HeroBlock label="FırsatGeldi nedir">
        <h1>Başlık</h1>
      </HeroBlock>,
    );
    expect(screen.getByRole("region", { name: "FırsatGeldi nedir" })).toBeDefined();
  });

  it("PageTemplate Flow for Sign-in: no title row, side first on phones, columns end together", () => {
    const { container } = render(
      <PageTemplate kind="flow" title="Giriş" titleInContent endTogether sideFirstOnPhone side={<form aria-label="Form" />} sideLabel="Giriş">
        <h1>Aldığın ürün ucuzlarsa haberin olsun.</h1>
      </PageTemplate>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const aside = screen.getByRole("complementary", { name: "Giriş" });
    expect(aside.className).toContain("order-first");
    expect(container.innerHTML).toContain("md:items-stretch");
  });
});
