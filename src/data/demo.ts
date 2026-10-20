import type { AuthUser, Expense, Product, Sale } from "@/types/store";
import { storageKeys } from "@/config/site";

export const accounts = [
  {
    username: "NadiaAltarazi",
    displayName: "ناديا الترازي",
    shortName: "ن ت",
  },
  {
    username: "FarahFarah",
    displayName: "فرح فرح",
    shortName: "ف ف",
  },
] as const;

export const readAuth = (): AuthUser | null => {
  try {
    const saved = localStorage.getItem(storageKeys.auth) ?? sessionStorage.getItem(storageKeys.auth);
    if (!saved) return null;
    const user = JSON.parse(saved) as AuthUser;
    if (!localStorage.getItem(storageKeys.auth)) {
      localStorage.setItem(storageKeys.auth, saved);
      sessionStorage.removeItem(storageKeys.auth);
    }
    return user;
  } catch {
    return null;
  }
};

export const initialProducts: Product[] = [
  {
    sku: "SM-DRS-01",
    name: "Floral Summer Dress",
    nameAr: "فستان صيفي مزهر",
    category: "ملابس",
    cost: 15,
    price: 35,
    costUsd: 0,
    usdRate: 0,
    initialStock: 50,
    reorderLevel: 10,
    quickSale: true,
  },
  {
    sku: "SM-HD-02",
    name: "Classic Oversized Hoodie",
    nameAr: "هودي كلاسيكي واسع",
    category: "ملابس",
    cost: 18,
    price: 45,
    costUsd: 0,
    usdRate: 0,
    initialStock: 40,
    reorderLevel: 8,
    quickSale: true,
  },
  {
    sku: "SM-ACC-03",
    name: "Elegant Silver Necklace",
    nameAr: "قلادة فضية أنيقة",
    category: "إكسسوارات",
    cost: 5,
    price: 15,
    costUsd: 0,
    usdRate: 0,
    initialStock: 100,
    reorderLevel: 15,
    quickSale: true,
  },
  {
    sku: "SM-BAG-04",
    name: "Mini Leather Crossbody",
    nameAr: "حقيبة جلدية صغيرة",
    category: "حقائب",
    cost: 22,
    price: 52,
    costUsd: 0,
    usdRate: 0,
    initialStock: 18,
    reorderLevel: 5,
    quickSale: false,
  },
  {
    sku: "SM-SCR-05",
    name: "Soft Printed Scarf",
    nameAr: "وشاح ناعم منقوش",
    category: "إكسسوارات",
    cost: 4,
    price: 12,
    costUsd: 0,
    usdRate: 0,
    initialStock: 30,
    reorderLevel: 8,
    quickSale: false,
  },
];

export const initialSales: Sale[] = [
  { id: 1, date: "2026-10-03", sku: "SM-DRS-01", quantity: 35 },
  { id: 2, date: "2026-10-03", sku: "SM-HD-02", quantity: 8 },
  { id: 3, date: "2026-10-02", sku: "SM-ACC-03", quantity: 12 },
  { id: 4, date: "2026-10-02", sku: "SM-BAG-04", quantity: 4 },
  { id: 5, date: "2026-10-01", sku: "SM-SCR-05", quantity: 8 },
];

export const initialExpenses: Expense[] = [];

export const storeCategories = [
  "ملابس",
  "حقائب",
  "إكسسوارات",
  "ساعات",
  "عطور",
  "مكياج ومستحضرات",
  "ماسكارا",
  "أحمر شفاه",
  "ملمع وقلم شفاه",
  "آيلاينر",
  "كحل وقلم عيون",
  "ظلال عيون",
  "حواجب",
  "رموش صناعية",
  "كريم أساس",
  "كونسيلر",
  "بودرة",
  "أحمر خدود",
  "هايلايتر وكونتور",
  "مزيل مكياج",
  "أدوات وفرش مكياج",
  "العناية بالأظافر وطلاء الأظافر",
  "العناية بالبشرة والجسم",
  "العناية بالشعر",
  "أخرى",
];

export const allCategories = (products: Product[]) => [
  ...new Set([...storeCategories, ...products.map((item) => item.category)]),
];
