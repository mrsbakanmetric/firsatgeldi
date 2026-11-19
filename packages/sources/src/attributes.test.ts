import { describe, expect, it } from "vitest";
import { readAttributes } from "./attributes.ts";
import { readLinkText } from "./link-text.ts";
import { normaliseWords } from "./vocabulary.ts";

function attributesOf(link: string) {
  const result = readLinkText(link);
  if (!result.ok) throw new Error(`${link}: ${result.reason}`);
  return result.reading.attributes;
}

const fromTitle = (title: string, brand: readonly string[] = []) => readAttributes(normaliseWords(title), brand);

describe("readAttributes — rules layer", () => {
  it("reads storage, screen, size and power in one unit each", () => {
    expect(fromTitle("iPhone 17 Pro 1 TB")).toMatchObject({ storageGb: 1024 });
    expect(fromTitle("Watch SE 3 44 mm")).toMatchObject({ sizeMm: 44 });
    expect(fromTitle("TV 65 inç")).toMatchObject({ screenInch: 65 });
    expect(fromTitle("tv 75 190 ekran")).toMatchObject({ screenInch: 75 });
    expect(fromTitle("Güç Adaptörü 35 W")).toMatchObject({ powerW: 35 });
  });

  it("reads colours in Turkish and English as language-neutral keys", () => {
    expect(fromTitle("Yıldız Işığı Alüminyum Kasa ve Kum Beji Kordon").colours).toEqual(["STARLIGHT", "SAND_BEIGE"]);
    expect(fromTitle("iPhone 18 Pro Max Burgundy").colours).toEqual(["BURGUNDY"]);
    expect(fromTitle("iPhone 18 Pro Max Burgonya").colours).toEqual(["BURGUNDY"]);
    expect(fromTitle("Gece Yarısı · Midnight").colours).toEqual(["MIDNIGHT"]);
    expect(fromTitle("Space Gray").colours).toEqual(["SPACE_GRAY"]);
  });

  it("reads the model line and generation, never the brand", () => {
    expect(fromTitle("Apple iPhone 18 Pro", ["apple"]).generation).toEqual({ line: "iphone", number: "18" });
    expect(fromTitle("Onvo 40 102 ekran", ["onvo"]).generation).toBeNull();
  });

  it("keeps series words between the line and the number in the model (AirPods Pro 3)", () => {
    expect(fromTitle("AirPods Pro 3", ["apple"])).toMatchObject({ generation: { line: "airpods", number: "3" }, model: "airpods pro 3", series: ["pro"] });
    expect(fromTitle("iPhone 18 Pro Max 512 GB", ["apple"])).toMatchObject({ generation: { line: "iphone", number: "18" }, model: "iphone 18 pro max" });
  });

  it("does not read 'Ultra HD' or 'Full HD' as a series", () => {
    expect(fromTitle("4K Ultra HD Smart QLED TV").series).toEqual([]);
    expect(fromTitle("Full HD WhaleOS QLED TV").series).toEqual([]);
    expect(fromTitle("Galaxy S25 Ultra").series).toEqual(["ultra"]);
  });

  it("reads gender and pack size", () => {
    expect(fromTitle("Kadın Koşu Ayakkabısı").gender).toBe("WOMEN");
    expect(fromTitle("Erkek Çocuk Mont").gender).toBe("KIDS");
    expect(fromTitle("Tapo C211 2'li Paket").packCount).toBe(2);
    expect(fromTitle("Tapo C211 2-Pack").packCount).toBe(2);
    expect(fromTitle("Tapo C211").packCount).toBeNull();
  });
});

// Real links of the data test (2026-11-19) and the user's link of the same day.
describe("readLinkText — attributes from real links", () => {
  it.each([
    [
      "https://www.trendyol.com/apple/iphone-18-pro-max-512gb-burgundy-p-1198082362?boutiqueId=691662&merchantId=968",
      { generation: { line: "iphone", number: "18" }, series: ["pro", "max"], storageGb: 512, colours: ["BURGUNDY"] },
    ],
    [
      "https://www.trendyol.com/tcl/75t8c-75-190-ekran-uydu-alicili-4k-ultra-hd-smart-qled-google-tv-p-940343537",
      { generation: null, series: [], screenInch: 75, colours: [] },
    ],
    [
      "https://www.trendyol.com/apple/watch-se-3-gps-40mm-yildiz-isigi-aluminyum-kasa-ve-kum-beji-spor-kordon-s-m-p-1198475514",
      { generation: { line: "se", number: "3" }, sizeMm: 40, colours: ["STARLIGHT", "SAND_BEIGE"] },
    ],
    ["https://www.hepsiburada.com/roborock-s8-pro-akilli-robot-supurge-beyaz-p-HBCV00008MAIV2", { series: ["pro"], colours: ["WHITE"] }],
    [
      "https://www.hepsiburada.com/onvo-40vq80f3fa-40-102-ekran-uydu-alicili-full-hd-whaleos-qled-tv-pm-HBC0000GM15FD",
      { generation: null, series: [], screenInch: 40 },
    ],
    [
      "https://www.hepsiburada.com/apple-iphone-15-128-gb-siyah-p-HBCV00004X9ZCH",
      { generation: { line: "iphone", number: "15" }, storageGb: 128, colours: ["BLACK"] },
    ],
    [
      "https://www.hepsiburada.com/apple-watch-se-3-gps-44-mm-gece-yarisi-aluminyum-kasa-ve-gece-yarisi-spor-kordon-m-l-p-HBCV0000A11MSB",
      { generation: { line: "se", number: "3" }, sizeMm: 44, colours: ["MIDNIGHT"] },
    ],
    ["https://www.teknosa.com/roborock-saros-20-akilli-robot-supurge-siyah-p-787133731", { generation: { line: "saros", number: "20" }, colours: ["BLACK"] }],
    ["https://www.teknosa.com/apple-iphone-17-pro-1tb-abis-akilli-telefon-p-100000058788", { generation: { line: "iphone", number: "17" }, series: ["pro"], storageGb: 1024 }],
    [
      "https://www.mediamarkt.com.tr/tr/product/_apple-mjrr4tua-iphone-18-pro-256-gb-akilli-telefon-bordo-1256758.html",
      { generation: { line: "iphone", number: "18" }, series: ["pro"], storageGb: 256, colours: ["BURGUNDY"] },
    ],
    [
      "https://www.teknosa.com/apple-iphone-18-pro-max-512gb-burgonya-akilli-telefon-p-100000065177",
      { generation: { line: "iphone", number: "18" }, model: "iphone 18 pro max", storageGb: 512, colours: ["BURGUNDY"] },
    ],
    [
      "https://www.mediamarkt.com.tr/tr/product/_apple-mjxv4tua-iphone-18-pro-max-512-gb-akilli-telefon-bordo-1256778.html",
      { generation: { line: "iphone", number: "18" }, model: "iphone 18 pro max", storageGb: 512, colours: ["BURGUNDY"] },
    ],
    ["https://www.mediamarkt.com.tr/tr/product/_apple-35-w-cift-usb-c-baglanti-noktali-guc-adaptoru-1236495.html", { powerW: 35 }],
    [
      "https://www.trendyol.com/asics/gel-dedicate-8-kadin-tenis-ayakkabisi-1042a237-101-p-754059415",
      { generation: { line: "dedicate", number: "8" }, gender: "WOMEN" },
    ],
    ["https://www.trendyol.com/apple/airpods-pro-3-p-987974460", { generation: { line: "airpods", number: "3" }, model: "airpods pro 3", series: ["pro"] }],
  ] as const)("%s", (link, expected) => {
    expect(attributesOf(link)).toMatchObject(expected);
  });
});
