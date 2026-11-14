import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Package } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { AttributeChip, FactTile, FactTiles, HiddenOfferCard, ImagePrivacyNote, MultiImageUpload, ProductImage, SearchField } from "./index";
import { axeViolations } from "./test/axe";

const chipTexts = { typeLabel: "Listede yoksa yaz", sourceNote: "Seçenekler kategori şablonundan gelir." };

describe("AttributeChip (design v3)", () => {
  it("a small grey chip opens a menu overlay; one click applies the value; no apply or close button, no warning", async () => {
    const onPick = vi.fn();
    const { container } = render(<AttributeChip label="Model" value="Ace Pro 2" options={["Ace Pro 2", "Ace Pro"]} onPick={onPick} texts={chipTexts} />);
    const chip = screen.getByRole("button", { name: /Model/ });
    expect(chip.className).toContain("h-(--component-chip-height)");
    expect(chip.className).not.toContain("border-primary");
    expect(chip.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(chip);
    // The menu renders in a portal: the chip's own container (the page) does not grow.
    expect(container.querySelector("[role='listbox']")).toBeNull();
    expect(screen.getByRole("option", { name: "Ace Pro 2" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("option", { name: "Ace Pro 2" }));
    expect(screen.queryByRole("button", { name: "Uygula" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Kapat" })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "Ace Pro" }));
    expect(onPick).toHaveBeenCalledWith("Ace Pro");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("“Listede yoksa yaz” at the bottom of the menu applies on Enter", async () => {
    const onPick = vi.fn();
    render(<AttributeChip label="Renk" value="Siyah" options={["Siyah"]} onPick={onPick} texts={chipTexts} />);
    await userEvent.click(screen.getByRole("button", { name: /Renk/ }));
    await userEvent.type(screen.getByLabelText(chipTexts.typeLabel), "Gri{Enter}");
    expect(onPick).toHaveBeenCalledWith("Gri");
  });

  it("closes on Esc (focus back on the chip) and on a click outside, without picking", async () => {
    const onPick = vi.fn();
    render(
      <main>
        <p>dışarısı</p>
        <AttributeChip label="Model" value="Ace Pro 2" options={["Ace Pro 2", "Ace Pro"]} onPick={onPick} texts={chipTexts} />
      </main>,
    );
    const chip = screen.getByRole("button", { name: /Model/ });
    await userEvent.click(chip);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(chip);
    await userEvent.click(chip);
    await userEvent.click(screen.getByText("dışarısı"));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
  });
});

describe("FactTile", () => {
  it("says good or bad in words, never by colour alone", () => {
    render(
      <FactTiles label="Aldığın ilanın özellikleri">
        <FactTile label="Satıcı puanı" value="4,7 / 5" verdict="good" verdictLabel="iyi" />
        <FactTile label="Stok" value="Tükendi" verdict="bad" verdictLabel="dikkat" />
        <FactTile label="Garanti" value="Garanti bilinmiyor" verdict="neutral" verdictLabel="veri yok" />
      </FactTiles>,
    );
    expect(screen.getByRole("img", { name: "iyi" })).toBeDefined();
    expect(screen.getByRole("img", { name: "dikkat" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Aldığın ilanın özellikleri" })).toBeDefined();
  });
});

describe("HiddenOfferCard", () => {
  it("before Göster shows the rank only; after it the seller, the platform, go and hide", async () => {
    const onReveal = vi.fn();
    const { rerender } = render(<HiddenOfferCard hiddenLabel="En ucuz satıcı · satıcı gizli" price="25.997 TL" revealLabel="Göster" onReveal={onReveal} />);
    expect(screen.getByText("En ucuz satıcı · satıcı gizli")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Göster" }));
    expect(onReveal).toHaveBeenCalled();
    const onGo = vi.fn();
    rerender(
      <HiddenOfferCard
        hiddenLabel="En ucuz satıcı · satıcı gizli"
        price="25.997 TL"
        revealLabel="Göster"
        onReveal={onReveal}
        revealed={{ sellerName: "Satıcı A", rating: "Satıcı puanı 4,8 / 5", platformName: "Platform B", goLabel: "Mağazaya git", onGo, hideLabel: "Gizle", onHide: vi.fn() }}
      />,
    );
    expect(screen.queryByText("En ucuz satıcı · satıcı gizli")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Mağazaya git" }));
    expect(onGo).toHaveBeenCalled();
  });
});

describe("MultiImageUpload", () => {
  it("each file has its own status; a rejected file shows its reason; files are removed one by one", async () => {
    const onRemove = vi.fn();
    const { container } = render(
      <MultiImageUpload
        title="Fotoğraflar"
        countLabel="2 / 5"
        limits="JPEG, PNG · dosya başına en çok 10 MB"
        files={[
          { id: "1", name: "kutu.jpg", previewUrl: null, state: "uploading", status: "Yükleniyor", progress: 60 },
          { id: "2", name: "buyuk.jpg", previewUrl: null, state: "rejected", status: "Çok büyük · en çok 10 MB" },
        ]}
        addLabel="Fotoğraf ekle"
        removeLabel={(name) => `${name} kaldır`}
        progressLabel="Yükleniyor"
        canAdd
        accept="image/jpeg"
        onAdd={vi.fn()}
        onRemove={onRemove}
        note={<ImagePrivacyNote>Görselin 24 saat sonra silinir.</ImagePrivacyNote>}
      />,
    );
    expect(screen.getByRole("progressbar", { name: "Yükleniyor" }).getAttribute("aria-valuenow")).toBe("60");
    expect(screen.getByText("Çok büyük · en çok 10 MB")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "buyuk.jpg kaldır" }));
    expect(onRemove).toHaveBeenCalledWith("2");
    expect(await axeViolations(container)).toEqual([]);
  });

  it.each(["panel", "inline"] as const)("%s: a rejected file never shows its preview (no broken image), a ready file does", (layout) => {
    const files = [
      { id: "1", name: "kutu.png", previewUrl: "blob:kutu", state: "ready" as const, status: "Hazır" },
      { id: "2", name: "video.mov", previewUrl: "blob:video", state: "rejected" as const, status: "Desteklenmeyen dosya" },
    ];
    const common = { title: "Fotoğraflar", limits: "JPEG, PNG", files, removeLabel: (name: string) => `${name} kaldır`, progressLabel: "Yükleniyor", onRemove: vi.fn(), note: null };
    render(
      layout === "inline" ? (
        <MultiImageUpload {...common} layout="inline" />
      ) : (
        <MultiImageUpload {...common} countLabel="1 / 5" addLabel="Fotoğraf ekle" canAdd accept="image/png" onAdd={vi.fn()} />
      ),
    );
    const [ready, rejected] = screen.getAllByTestId("file-thumb");
    expect(ready?.querySelector("img")?.getAttribute("src")).toBe("blob:kutu");
    expect(rejected?.querySelector("img")).toBeNull();
    expect(rejected?.className).toContain("border-danger");
  });

  it("inline (design v2): file chips, one limits line and the one-line privacy note; no add control or file input of its own", async () => {
    const onRemove = vi.fn();
    const { container } = render(
      <MultiImageUpload
        layout="inline"
        title="Fotoğraflar"
        limits="2 / 5 fotoğraf · ürün, etiket ya da sipariş ekranı · JPEG, PNG · dosya başına en çok 10 MB"
        files={[
          { id: "1", name: "kutu.jpg", previewUrl: null, state: "ready", status: "Hazır" },
          { id: "2", name: "urun-videosu.mov", previewUrl: null, state: "rejected", status: "Desteklenmeyen dosya" },
        ]}
        removeLabel={(name) => `${name} kaldır`}
        progressLabel="Yükleniyor"
        onRemove={onRemove}
        note={<ImagePrivacyNote variant="line">Görselin 24 saat sonra silinir.</ImagePrivacyNote>}
      />,
    );
    const section = screen.getByRole("region", { name: "Fotoğraflar" });
    expect(section.querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByText(/^2 \/ 5 fotoğraf · /)).toBeDefined();
    expect(screen.getByText("Görselin 24 saat sonra silinir.").parentElement?.className).not.toContain("bg-info-subtle");
    expect(screen.queryByRole("button", { name: "Fotoğraf ekle" })).toBeNull();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "urun-videosu.mov kaldır" }));
    expect(onRemove).toHaveBeenCalledWith("2");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("SearchField and ProductImage", () => {
  it("the large search box uses the 48 px search-box height; × only while there is text", () => {
    const { rerender } = render(<SearchField label="Ürün adı" value="" onChange={vi.fn()} clearLabel="Aramayı temizle" onClear={vi.fn()} />);
    expect(screen.getByLabelText("Ürün adı").closest("div.border")?.className).toContain("min-h-(--component-search-box-min-height)");
    expect(screen.queryByRole("button", { name: "Aramayı temizle" })).toBeNull();
    rerender(<SearchField label="Ürün adı" value="ace" onChange={vi.fn()} clearLabel="Aramayı temizle" onClear={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Aramayı temizle" })).toBeDefined();
  });

  it("the compact preview image is size.thumb-lg", () => {
    const { container } = render(<ProductImage src={null} size="lg" fallbackIcon={Package} />);
    expect(container.firstElementChild?.className).toContain("size-(--size-thumb-lg)");
  });

  it("the search box has a label and a clear control once there is text", async () => {
    const onClear = vi.fn();
    render(<SearchField label="Ürün adı" value="ace" onChange={vi.fn()} clearLabel="Aramayı temizle" onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: "Aramayı temizle" }));
    expect(onClear).toHaveBeenCalled();
    expect(screen.getByLabelText("Ürün adı")).toBeDefined();
  });

  it("a product without an image shows the category illustration in the same slot", () => {
    render(<ProductImage src={null} alt="Insta360 Ace Pro 2" fallbackIcon={Package} />);
    expect(screen.getByRole("img", { name: "Insta360 Ace Pro 2" })).toBeDefined();
  });
});
