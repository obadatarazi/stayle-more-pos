import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { apiLogin, isCloudEnabled, setApiToken } from "./lib/api";
import {
  deleteCloudSale,
  fetchCloudStore,
  insertCloudExpense,
  deleteCloudExpense,
  insertCloudSale,
  replaceCloudStore,
  subscribeCloudStore,
  upsertCloudProduct,
  saveCloudSettings,
  insertCloudExchange,
  deleteCloudExchange,
} from "./lib/cloudStore";

type Tab = "dashboard" | "products" | "sales" | "expenses" | "exchange" | "reports" | "settings";

type Product = {
  sku: string;
  name: string;
  nameAr: string;
  category: string;
  cost: number;
  price: number;
  costUsd: number;
  usdRate: number;
  initialStock: number;
  reorderLevel: number;
  quickSale: boolean;
};

type Sale = {
  id: number;
  date: string;
  sku: string;
  quantity: number;
  unitPrice?: number;
  unitCost?: number;
  unitCostUsd?: number;
  soldBy?: string;
  soldByName?: string;
};

type Expense = {
  id: number;
  category: string;
  categoryAr: string;
  amount: number;
  dueDate: string;
};

// Currency exchange log (SYP <-> USD); kept out of all reports.
type Exchange = {
  id: number;
  date: string;
  direction: "sypToUsd" | "usdToSyp";
  sypAmount: number;
  usdAmount: number;
  note?: string;
  doneBy?: string;
  doneByName?: string;
};

type IconName =
  | "grid"
  | "box"
  | "receipt"
  | "wallet"
  | "search"
  | "bell"
  | "arrowUp"
  | "arrowDown"
  | "profit"
  | "plus"
  | "chevron"
  | "calendar"
  | "menu"
  | "close"
  | "check"
  | "warning"
  | "sparkles"
  | "lock"
  | "user"
  | "logout"
  | "edit"
  | "trash"
  | "minus"
  | "cart"
  | "cash"
  | "chart"
  | "settings"
  | "exchange";

type StoreSettings = {
  usdRate: number;
};

type CartLine = {
  sku: string;
  quantity: number;
  unitPrice: number;
};

const AUTH_KEY = "style-more-auth";

const accounts = [
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

type AuthUser = {
  username: string;
  displayName: string;
  shortName: string;
  at: number;
};

const readAuth = (): AuthUser | null => {
  try {
    const saved = localStorage.getItem(AUTH_KEY) ?? sessionStorage.getItem(AUTH_KEY);
    if (!saved) return null;
    const user = JSON.parse(saved) as AuthUser;
    if (!localStorage.getItem(AUTH_KEY)) {
      localStorage.setItem(AUTH_KEY, saved);
      sessionStorage.removeItem(AUTH_KEY);
    }
    return user;
  } catch {
    return null;
  }
};

const initialProducts: Product[] = [
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

const initialSales: Sale[] = [
  { id: 1, date: "2026-10-03", sku: "SM-DRS-01", quantity: 35 },
  { id: 2, date: "2026-10-03", sku: "SM-HD-02", quantity: 8 },
  { id: 3, date: "2026-10-02", sku: "SM-ACC-03", quantity: 12 },
  { id: 4, date: "2026-10-02", sku: "SM-BAG-04", quantity: 4 },
  { id: 5, date: "2026-10-01", sku: "SM-SCR-05", quantity: 8 },
];

const initialExpenses: Expense[] = [];

const iconPaths: Record<IconName, ReactNode> = {
  exchange: <><path d="M4 8h14l-4-4" /><path d="M20 16H6l4 4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  box: <><path d="m21 8-9 5-9-5" /><path d="M3 8l9-5 9 5v8l-9 5-9-5Z" /><path d="M12 13v8" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12" /><path d="M16 11h6v4h-6a2 2 0 0 1 0-4Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  arrowUp: <><path d="m6 15 6-6 6 6" /></>,
  arrowDown: <><path d="m6 9 6 6 6-6" /></>,
  profit: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  warning: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /></>,
  sparkles: <><path d="m12 3-1.2 3.8L7 8l3.8 1.2L12 13l1.2-3.8L17 8l-3.8-1.2ZM5 15l-.7 2.3L2 18l2.3.7L5 21l.7-2.3L8 18l-2.3-.7ZM19 13l-.7 2.3L16 16l2.3.7L19 19l.7-2.3L22 16l-2.3-.7Z" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></>,
  minus: <><path d="M5 12h14" /></>,
  cart: <><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.5L21 8H7" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M7 12h.01M17 12h.01" /></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /><path d="m14 10 3-3 3 2" /></>,
};

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-navy text-white shadow-sm hover:bg-navy-light",
    secondary: "border border-coral-border bg-white text-slate-700 hover:bg-brand",
    ghost: "text-slate-600 hover:bg-brand",
  };
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#fddfe0] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const money = (amount: number) =>
  new Intl.NumberFormat("ar-SY-u-nu-latn", {
    style: "currency",
    currency: "SYP",
    maximumFractionDigits: 0,
  }).format(amount);

const usd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);

const salePrice = (sale: Sale, product?: Product) =>
  sale.unitPrice ?? product?.price ?? 0;

// Cost is frozen on the sale so later product cost changes don't rewrite past profit.
const saleCost = (sale: Sale, product?: Product) =>
  sale.unitCost ?? product?.cost ?? 0;

const defaultSettings: StoreSettings = { usdRate: 0 };

const saleCostUsd = (sale: Sale, product?: Product) =>
  sale.unitCostUsd ?? product?.costUsd ?? 0;

const shortDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
};

const monthKey = (date: string) => String(date || "").slice(0, 7);

const formatMonthLabel = (ym: string) => {
  const parsed = new Date(`${ym}-01T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return ym;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

const isRentExpense = (expense: Expense) =>
  /إيجار|ايجار|rent/i.test(`${expense.category} ${expense.categoryAr}`);

// Buying stock is not deducted from net profit: its cost is already counted when each item sells.
const isStockPurchase = (expense: Pick<Expense, "category" | "categoryAr">) =>
  /بضاعة/.test(`${expense.category} ${expense.categoryAr}`);

const excelDate = (value: string | number) => {
  if (typeof value === "number") {
    const parsed = new Date(Math.round((value - 25569) * 86400 * 1000));
    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
  }
  return String(value || "");
};

const cellValue = (row: Record<string, string | number>, keys: string[]) => {
  const key = keys.find((candidate) => row[candidate] !== undefined);
  return key ? row[key] : "";
};

const navItems: { id: Tab; label: string; short: string; arabic: string; icon: IconName }[] = [
  { id: "dashboard", label: "لوحة التحكم", short: "رئيسية", arabic: "ملخص أداء المتجر", icon: "grid" },
  { id: "products", label: "المنتجات والمخزون", short: "منتجات", arabic: "دليل المنتجات", icon: "box" },
  { id: "sales", label: "المبيعات اليومية", short: "مبيعات", arabic: "سجل عمليات البيع", icon: "receipt" },
  { id: "expenses", label: "المصاريف الثابتة", short: "مصاريف", arabic: "التكاليف التشغيلية", icon: "wallet" },
  { id: "exchange", label: "الصرافة", short: "صرافة", arabic: "تحويل ليرة ↔ دولار", icon: "exchange" },
  { id: "reports", label: "التقارير الشهرية", short: "تقارير", arabic: "مبيعات ومصاريف حسب الشهر", icon: "chart" },
  { id: "settings", label: "الإعدادات", short: "إعدادات", arabic: "سعر صرف الدولار", icon: "settings" },
];

// The open page lives in the URL hash so a refresh (or back button) keeps it.
const tabFromHash = (): Tab => {
  const hash = window.location.hash.replace("#", "");
  return navItems.some((item) => item.id === hash) ? (hash as Tab) : "dashboard";
};

// Bottom bar on mobile has room for five tabs; settings and exchange are reached from the header there.
const mobileNavItems = navItems.filter((item) => item.id !== "settings" && item.id !== "exchange");

// SYP cost derived from the product's USD cost; products without a USD cost keep a manual SYP cost.
const costFromUsd = (costUsd: number, usdRate: number) => Math.round(costUsd * usdRate);

const storeCategories = [
  "ملابس",
  "حقائب",
  "إكسسوارات",
  "ساعات",
  "عطور",
  // Makeup
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
  // Care
  "العناية بالأظافر وطلاء الأظافر",
  "العناية بالبشرة والجسم",
  "العناية بالشعر",
  "أخرى",
];

// Built-in categories first, then any extra ones already used by products (e.g. from an Excel import).
const allCategories = (products: Product[]) => [...new Set([...storeCategories, ...products.map((item) => item.category)])];

const DEFAULT_REORDER_LEVEL = 5;

const todayISO = () => new Date().toISOString().slice(0, 10);

function FieldLabel({ children, arabic }: { children: ReactNode; arabic?: string }) {
  return <span className="mb-2 block text-xs font-bold text-slate-600">{children} {arabic && <span className="font-medium text-slate-400" dir="rtl">· {arabic}</span>}</span>;
}

const inputClass = "w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-800 outline-none transition focus:border-navy focus:ring-4 focus:ring-[#fddfe0] md:text-sm";

function BrandLogo({ className = "h-14 w-auto object-contain", rounded = true }: { className?: string; rounded?: boolean }) {
  return (
    <img
      src="/logo.jpg"
      alt="Stayle & More"
      className={`${rounded ? "rounded-2xl" : ""} ${className}`}
    />
  );
}

function Stepper({
  value,
  min = 1,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div dir="ltr" className="inline-flex w-full min-w-0 max-w-full items-center overflow-hidden rounded-2xl border-2 border-navy/20 bg-white shadow-sm">
      <button
        type="button"
        className="grid size-11 shrink-0 place-items-center border-r-2 border-navy/10 bg-slate-50 text-slate-700 transition active:bg-brand disabled:opacity-35 sm:size-12"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="تقليل الكمية"
      >
        <Icon name="minus" className="size-5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2.5 text-center text-base font-bold tabular-nums text-slate-900 outline-none focus:bg-brand/40 sm:py-3 sm:text-lg"
        value={String(value)}
        aria-label="الكمية"
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (digits === "") {
            onChange(min);
            return;
          }
          const next = Number(digits);
          if (Number.isNaN(next)) return;
          onChange(Math.min(max, Math.max(min, next)));
        }}
      />
      <button
        type="button"
        className="grid size-11 shrink-0 place-items-center border-l-2 border-navy/10 bg-navy text-white transition active:bg-navy-light disabled:opacity-35 sm:size-12"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="زيادة الكمية"
      >
        <Icon name="plus" className="size-5" />
      </button>
    </div>
  );
}

function LoginPage({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    // Passwords are checked by the server only; without an API, login is allowed in local development only.
    if (!isCloudEnabled && !import.meta.env.DEV) {
      setError("الخادم غير مُعدّ. لا يمكن تسجيل الدخول.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      let profile: { username: string; displayName: string; shortName: string } | undefined;
      if (isCloudEnabled) {
        try {
          profile = await apiLogin(username.trim(), password);
        } catch (err) {
          if (err instanceof Error && /credentials|required/i.test(err.message)) {
            setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
            return;
          }
          throw err;
        }
      } else {
        setApiToken(null);
        profile = accounts.find((item) => item.username === username.trim());
        if (!profile) {
          setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
          return;
        }
      }

      const user: AuthUser = {
        username: profile.username,
        displayName: profile.displayName,
        shortName: profile.shortName,
        at: Date.now(),
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      sessionStorage.removeItem(AUTH_KEY);
      onSuccess(user);
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand px-4" dir="rtl" lang="ar">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#ffffff_0%,transparent_45%),radial-gradient(circle_at_80%_80%,#f6e8ea_0%,transparent_40%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto mb-4 h-28 w-auto rounded-3xl object-contain shadow-xl shadow-[#8b5560]/15" />
          <h1 className="text-2xl font-bold tracking-tight text-navy">Stayle & More</h1>
          <p className="mt-2 text-sm text-slate-500">سجّل الدخول للوصول إلى نظام إدارة المتجر</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-coral-border bg-white p-6 shadow-xl shadow-[#8b5560]/10 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy">
              <Icon name="lock" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">تسجيل الدخول</h2>
              <p className="text-xs text-slate-500">حساب الإدارة المحمي</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <FieldLabel>اسم المستخدم</FieldLabel>
              <div className="relative">
                <Icon name="user" className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputClass} pr-10`}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError("");
                  }}
                  placeholder="أدخل اسم المستخدم"
                  autoComplete="username"
                  required
                />
              </div>
            </label>
            <label className="block">
              <FieldLabel>كلمة المرور</FieldLabel>
              <div className="relative">
                <Icon name="lock" className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${inputClass} pr-10 pl-16`}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-navy"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "إخفاء" : "إظهار"}
                </button>
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-coral-border bg-coral-soft px-3.5 py-3 text-sm font-medium text-coral-dark">
              <Icon name="warning" className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            <Icon name="lock" className="size-4" />
            {loading ? "جاري التحقق..." : "دخول إلى النظام"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => readAuth());
  const isAuthenticated = Boolean(authUser);
  const [activeTab, setActiveTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    if (window.location.hash.replace("#", "") !== activeTab) window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem("style-more-products");
    if (!saved) return initialProducts;
    try {
      const parsed = JSON.parse(saved) as Product[];
      return parsed.map((product) => ({
        ...product,
        quickSale: Boolean(product.quickSale),
        costUsd: Number(product.costUsd || 0),
        usdRate: Number(product.usdRate || 0),
      }));
    } catch {
      return initialProducts;
    }
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem("style-more-sales");
    if (!saved) return initialSales;
    try {
      const parsed = JSON.parse(saved) as Sale[];
      return parsed.map((sale) => ({
        ...sale,
        soldBy: sale.soldBy || undefined,
        soldByName: sale.soldByName || undefined,
      }));
    } catch {
      return initialSales;
    }
  });
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem("style-more-settings");
      return saved ? { ...defaultSettings, ...(JSON.parse(saved) as StoreSettings) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [reportMonth, setReportMonth] = useState(currentMonthKey);
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    // Start empty; cloud sync is the source of truth after login.
    try {
      localStorage.removeItem("style-more-expenses");
    } catch {
      // ignore
    }
    return initialExpenses;
  });
  const [selectedSku, setSelectedSku] = useState(initialProducts[0].sku);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(initialProducts[0].price);
  const [saleDate, setSaleDate] = useState(todayISO);
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [productModal, setProductModal] = useState<"add" | Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; label: string } | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>(() => {
    try {
      const saved = localStorage.getItem("style-more-exchanges");
      return saved ? (JSON.parse(saved) as Exchange[]) : [];
    } catch {
      return [];
    }
  });
  const [syncStatus, setSyncStatus] = useState<"local" | "loading" | "online" | "saving" | "error">(
    isCloudEnabled ? "loading" : "local",
  );
  const [expenseCategory, setExpenseCategory] = useState("إيجار المحل");
  const cloudReady = useRef(false);
  const reloadTimer = useRef<number | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("style-more-products", JSON.stringify(products));
    localStorage.setItem("style-more-sales", JSON.stringify(sales));
    localStorage.setItem("style-more-expenses", JSON.stringify(expenses));
    localStorage.setItem("style-more-settings", JSON.stringify(settings));
    localStorage.setItem("style-more-exchanges", JSON.stringify(exchanges));
  }, [products, sales, expenses, settings, exchanges]);

  useEffect(() => {
    if (!isAuthenticated || !isCloudEnabled) {
      setSyncStatus(isCloudEnabled ? "loading" : "local");
      return;
    }

    let cancelled = false;

    const loadCloud = async () => {
      try {
        setSyncStatus("loading");
        const cloud = await fetchCloudStore();
        if (cancelled) return;

        if (!cloud.products.length && !cloud.sales.length && !cloud.expenses.length) {
          const localProducts = products.length ? products : initialProducts;
          const localSales = sales;
          const localExpenses = expenses;
          await replaceCloudStore({
            products: localProducts,
            sales: localSales,
            expenses: localExpenses,
            settings,
            exchanges,
          });
          if (cancelled) return;
          setProducts(localProducts);
          setSales(localSales);
          setExpenses(localExpenses);
          if (localProducts[0]) setSelectedSku(localProducts[0].sku);
        } else {
          setProducts(cloud.products);
          setSales(cloud.sales);
          setExpenses(cloud.expenses);
          if (cloud.settings.usdRate > 0) setSettings(cloud.settings);
          setExchanges(cloud.exchanges ?? []);
          if (cloud.products[0]) setSelectedSku(cloud.products[0].sku);
        }
        cloudReady.current = true;
        setSyncStatus("online");
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSyncStatus("error");
          setNotice("تعذر الاتصال بالخادم. يتم العمل مؤقتاً من بيانات الجهاز.");
          window.setTimeout(() => setNotice(""), 4000);
        }
      }
    };

    void loadCloud();

    const unsubscribe = subscribeCloudStore(() => {
      if (!cloudReady.current) return;
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(async () => {
        try {
          const cloud = await fetchCloudStore();
          setProducts(cloud.products);
          setSales(cloud.sales);
          setExpenses(cloud.expenses);
          if (cloud.settings.usdRate > 0) setSettings(cloud.settings);
          setExchanges(cloud.exchanges ?? []);
          setSyncStatus("online");
        } catch (error) {
          console.error(error);
          setSyncStatus("error");
        }
      }, 400);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    const product = products.find((item) => item.sku === selectedSku) || products[0];
    if (product) setUnitPrice(product.price);
  }, [selectedSku]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const soldBySku = useMemo(
    () =>
      sales.reduce<Record<string, number>>((acc, sale) => {
        acc[sale.sku] = (acc[sale.sku] || 0) + sale.quantity;
        return acc;
      }, {}),
    [sales],
  );

  const selectedProduct = products.find((product) => product.sku === selectedSku) || products[0];
  const selectedRemaining = selectedProduct
    ? selectedProduct.initialStock - (soldBySku[selectedProduct.sku] || 0)
    : 0;

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return products.filter((product) =>
      [product.nameAr, product.name, product.category, product.sku]
        .join(" ")
        .toLowerCase()
        .includes(query),
    ).slice(0, 6);
  }, [products, searchQuery]);

  const metrics = useMemo(() => {
    const revenue = sales.reduce((total, sale) => {
      const product = products.find((item) => item.sku === sale.sku);
      return total + salePrice(sale, product) * sale.quantity;
    }, 0);
    const grossProfit = sales.reduce((total, sale) => {
      const product = products.find((item) => item.sku === sale.sku);
      return total + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
    }, 0);
    const fixedExpenses = expenses
      .filter((expense) => !isStockPurchase(expense))
      .reduce((total, expense) => total + expense.amount, 0);
    return { revenue, grossProfit, fixedExpenses, netProfit: grossProfit - fixedExpenses };
  }, [sales, expenses, products]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    setApiToken(null);
    setAuthUser(null);
  };

  if (!isAuthenticated || !authUser) {
    return <LoginPage onSuccess={setAuthUser} />;
  }

  const recordSale = () => {
    if (!selectedProduct || quantity < 1 || quantity > selectedRemaining || unitPrice < 0) return false;
    const sale: Sale = {
      id: Date.now(),
      date: saleDate,
      sku: selectedSku,
      quantity,
      unitPrice,
      unitCost: selectedProduct.cost,
      unitCostUsd: selectedProduct.costUsd,
      soldBy: authUser.username,
      soldByName: authUser.displayName,
    };
    setSales((current) => [sale, ...current]);
    showNotice(`تمت إضافة ${quantity} × ${selectedProduct.nameAr} إلى مبيعات اليوم.`);
    setQuantity(1);
    setUnitPrice(selectedProduct.price);
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void insertCloudSale(sale)
        .then(() => setSyncStatus("online"))
        .catch((error) => rollbackSales([sale], error));
    }
    return true;
  };

  const checkoutCart = (lines: CartLine[]) => {
    if (!lines.length) return false;

    const stamped = Date.now();
    const newSales: Sale[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const product = products.find((item) => item.sku === line.sku);
      if (!product) continue;
      const remaining = product.initialStock - (soldBySku[product.sku] || 0);
      const alreadyInCart = lines
        .slice(0, index)
        .filter((item) => item.sku === line.sku)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (line.quantity < 1 || line.quantity > remaining - alreadyInCart || line.unitPrice < 0) {
        showNotice(`الكمية غير متاحة للمنتج «${product.nameAr}».`);
        return false;
      }
      newSales.push({
        id: stamped + index,
        date: saleDate || todayISO(),
        sku: line.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitCost: product.cost,
        unitCostUsd: product.costUsd,
        soldBy: authUser.username,
        soldByName: authUser.displayName,
      });
    }

    if (!newSales.length) return false;

    setSales((current) => [...newSales, ...current]);
    const itemsLabel = newSales.length === 1
      ? `${newSales[0].quantity} × ${products.find((p) => p.sku === newSales[0].sku)?.nameAr || ""}`
      : `${newSales.length} أصناف`;
    showNotice(`تم تسجيل البيع: ${itemsLabel}.`);
    setQuantity(1);

    if (isCloudEnabled) {
      setSyncStatus("saving");
      void Promise.all(
        newSales.map((sale) => insertCloudSale(sale).then(() => null, (error: unknown) => ({ sale, error }))),
      ).then((results) => {
        const failed = results.filter((result): result is { sale: Sale; error: unknown } => result !== null);
        if (!failed.length) {
          setSyncStatus("online");
          return;
        }
        rollbackSales(failed.map((result) => result.sale), failed[0].error);
      });
    }
    return true;
  };

  const addSale = (event: FormEvent) => {
    event.preventDefault();
    recordSale();
  };

  const openQuickSale = (sku?: string) => {
    const requested = sku ? products.find((item) => item.sku === sku) : undefined;
    if (requested && requested.initialStock - (soldBySku[requested.sku] || 0) < 1) {
      showNotice(`نفدت كمية «${requested.nameAr}». لا يمكن البيع حتى يتم تحديث المخزون.`);
      return;
    }
    const preferred =
      products.find((item) => item.sku === sku) ||
      products.find((item) => item.quickSale && item.initialStock - (soldBySku[item.sku] || 0) > 0) ||
      products.find((item) => item.quickSale) ||
      products.find((item) => item.sku === selectedSku) ||
      products[0];
    if (preferred) {
      setSelectedSku(preferred.sku);
      setUnitPrice(preferred.price);
    }
    setSaleDate(todayISO());
    setQuantity(1);
    setQuickSaleOpen(true);
  };

  const deleteSale = (id: number) => {
    setSales((current) => current.filter((sale) => sale.id !== id));
    setConfirmDelete(null);
    showNotice("تم حذف عملية البيع بنجاح.");
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void deleteCloudSale(id)
        .then(() => setSyncStatus("online"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("error");
          showNotice("تم الحذف محلياً لكن فشل التحديث على الخادم.");
        });
    }
  };

  const requestDeleteSale = (id: number) => {
    const sale = sales.find((item) => item.id === id);
    const product = products.find((item) => item.sku === sale?.sku);
    setConfirmDelete({
      id,
      label: product ? `${product.nameAr} × ${sale?.quantity || 0}` : "هذه العملية",
    });
  };

  // Older sales recorded before prices were stored on the sale: lock them to the old values.
  const freezeLegacySales = (updated: Product[]) => {
    const previousBySku = new Map(products.map((item) => [item.sku, item]));
    const changed = new Map<string, Product>();
    for (const product of updated) {
      const previous = previousBySku.get(product.sku);
      if (
        previous &&
        (previous.cost !== product.cost || previous.price !== product.price || previous.costUsd !== product.costUsd)
      ) {
        changed.set(product.sku, previous);
      }
    }
    const frozenSales = sales
      .filter(
        (sale) =>
          changed.has(sale.sku) &&
          (sale.unitCost === undefined || sale.unitPrice === undefined || sale.unitCostUsd === undefined),
      )
      .map((sale) => {
        const previous = changed.get(sale.sku) as Product;
        return {
          ...sale,
          unitPrice: sale.unitPrice ?? previous.price,
          unitCost: sale.unitCost ?? previous.cost,
          unitCostUsd: sale.unitCostUsd ?? previous.costUsd,
        };
      });
    if (!frozenSales.length) return;
    const frozenById = new Map(frozenSales.map((sale) => [sale.id, sale]));
    setSales((current) => current.map((sale) => frozenById.get(sale.id) ?? sale));
    if (isCloudEnabled) {
      void Promise.all(frozenSales.map((sale) => insertCloudSale(sale))).catch((error) => console.error(error));
    }
  };

  const bulkUpdateProducts = (updated: Product[]) => {
    if (!updated.length) return;
    freezeLegacySales(updated);
    const updatedBySku = new Map(updated.map((item) => [item.sku, item]));
    setProducts((current) => current.map((item) => updatedBySku.get(item.sku) ?? item));
    showNotice(`تم تحديث أسعار ${updated.length} منتج بنجاح.`);
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void Promise.all(updated.map((product) => upsertCloudProduct(product)))
        .then(() => setSyncStatus("online"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("error");
          showNotice("تم التحديث محلياً لكن فشل الرفع للخادم.");
        });
    }
  };

  const changeUsdRate = (usdRate: number) => {
    const repriced = products
      .filter((product) => product.costUsd > 0)
      .map((product) => {
        const cost = costFromUsd(product.costUsd, usdRate);
        // Selling price moves with the cost so the profit percentage stays the same.
        const price = product.cost > 0 ? Math.round((product.price * cost) / product.cost) : product.price;
        return { ...product, usdRate, cost, price };
      });
    setSettings((current) => ({ ...current, usdRate }));
    if (repriced.length) bulkUpdateProducts(repriced);
    else showNotice("تم حفظ سعر الصرف الجديد.");
    if (isCloudEnabled) {
      void saveCloudSettings({ ...settings, usdRate }).catch((error) => {
        console.error(error);
        setSyncStatus("error");
        showNotice("تم الحفظ محلياً لكن فشل رفع سعر الصرف للخادم.");
      });
    }
  };

  const saveProduct = (product: Product, mode: "add" | "edit") => {
    if (mode === "add") {
      if (products.some((item) => item.sku === product.sku)) {
        showNotice("رمز المنتج موجود مسبقاً. حاول مرة أخرى.");
        return;
      }
      setProducts((current) => [...current, product]);
      setSelectedSku(product.sku);
      showNotice(`تمت إضافة المنتج «${product.nameAr}» بنجاح.`);
    } else {
      freezeLegacySales([product]);
      setProducts((current) => current.map((item) => (item.sku === product.sku ? product : item)));
      showNotice(`تم تحديث المنتج «${product.nameAr}» بنجاح.`);
    }
    setProductModal(null);
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void upsertCloudProduct(product)
        .then(() => setSyncStatus("online"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("error");
          showNotice("تم الحفظ محلياً لكن فشل الرفع للخادم.");
        });
    }
  };

  const toggleQuickSale = (sku: string) => {
    const current = products.find((item) => item.sku === sku);
    if (!current) return;
    const next = { ...current, quickSale: !current.quickSale };
    setProducts((list) => list.map((item) => (item.sku === sku ? next : item)));
    showNotice(
      next.quickSale
        ? `تمت إضافة «${next.nameAr}» إلى البيع السريع.`
        : `تمت إزالة «${next.nameAr}» من البيع السريع.`,
    );
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void upsertCloudProduct(next)
        .then(() => setSyncStatus("online"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("error");
          showNotice("تم التحديث محلياً لكن فشل الرفع للخادم.");
        });
    }
  };

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseCategory("إيجار المحل");
    setExpenseAmount("");
    setExpenseDate(todayISO());
  };

  const startEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseCategory(expense.categoryAr || expense.category);
    setExpenseAmount(String(expense.amount));
    setExpenseDate(expense.dueDate);
    setActiveTab("expenses");
  };

  const saveExpense = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!amount || amount <= 0) return;
    const expense: Expense = {
      id: editingExpenseId ?? Date.now(),
      category: expenseCategory,
      categoryAr: expenseCategory,
      amount,
      dueDate: expenseDate,
    };
    setExpenses((current) => {
      if (editingExpenseId != null) {
        return current.map((item) => (item.id === editingExpenseId ? expense : item));
      }
      return [...current, expense];
    });
    const wasEdit = editingExpenseId != null;
    resetExpenseForm();
    showNotice(wasEdit ? "تم تحديث المصروف بنجاح." : "تمت إضافة المصروف بنجاح.");
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void insertCloudExpense(expense)
        .then(() => setSyncStatus("online"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("error");
          showNotice("تم الحفظ محلياً لكن فشل الرفع للخادم.");
        });
    }
  };

  const deleteExpense = (id: number) => {
    setExpenses((current) => current.filter((item) => item.id !== id));
    if (editingExpenseId === id) resetExpenseForm();
    showNotice("تم حذف المصروف بنجاح.");
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void deleteCloudExpense(id)
        .then(() => setSyncStatus("online"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("error");
          showNotice("تم الحذف محلياً لكن فشل التحديث على الخادم.");
        });
    }
  };

  const addExchange = (exchange: Omit<Exchange, "id" | "doneBy" | "doneByName">) => {
    const record: Exchange = {
      ...exchange,
      id: Date.now(),
      doneBy: authUser?.username,
      doneByName: authUser?.displayName,
    };
    setExchanges((current) => [record, ...current]);
    showNotice("تم تسجيل عملية الصرافة.");
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void insertCloudExchange(record)
        .then(() => setSyncStatus("online"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("error");
          showNotice("تم الحفظ محلياً لكن فشل الرفع للخادم.");
        });
    }
  };

  const deleteExchange = (id: number) => {
    setExchanges((current) => current.filter((item) => item.id !== id));
    showNotice("تم حذف عملية الصرافة.");
    if (isCloudEnabled) {
      setSyncStatus("saving");
      void deleteCloudExchange(id)
        .then(() => setSyncStatus("online"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("error");
          showNotice("تم الحذف محلياً لكن فشل التحديث على الخادم.");
        });
    }
  };

  // Server refused a sale because another device sold the last pieces first: undo it here too.
  const rollbackSales = (rejected: Sale[], error: unknown) => {
    console.error(error);
    if (error instanceof Error && /out of stock/i.test(error.message)) {
      const ids = new Set(rejected.map((sale) => sale.id));
      setSales((current) => current.filter((sale) => !ids.has(sale.id)));
      setSyncStatus("online");
      showNotice("تم إلغاء البيع: الكمية نفدت (ربما بيعت من جهاز آخر).");
      return;
    }
    setSyncStatus("error");
    showNotice("تم الحفظ على الجهاز لكن فشل الرفع للخادم.");
  };

  const goToSale = (sku: string) => {
    openQuickSale(sku);
  };

  const pageInfo = navItems.find((item) => item.id === activeTab)!;

  const exportWorkbook = async (seller: string = "all") => {
    const XLSX = await import("xlsx");
    const salesForExport =
      seller === "all"
        ? sales
        : seller === "unknown"
          ? sales.filter((sale) => !sale.soldBy)
          : sales.filter((sale) => sale.soldBy === seller);
    const productRows = products.map((product) => {
      const sold = soldBySku[product.sku] || 0;
      const current = product.initialStock - sold;
      return {
        "رمز المنتج": product.sku,
        "اسم المادة": product.nameAr,
        "الفئة": product.category,
        "سعر التكلفة": product.cost,
        "سعر البيع": product.price,
        "سعر التكلفة بالدولار": product.costUsd,
        "سعر الصرف": product.usdRate,
        "ربح القطعة": product.price - product.cost,
        "المخزون الافتتاحي": product.initialStock,
        "الكمية المباعة": sold,
        "المخزون الحالي": current,
        "حد إعادة الطلب": product.reorderLevel,
        "بيع سريع": product.quickSale ? "نعم" : "لا",
        "الحالة": current <= product.reorderLevel ? "بحاجة لطلب" : "متوفر",
      };
    });
    const saleRows = salesForExport.map((sale) => {
      const product = products.find((item) => item.sku === sale.sku);
      const price = salePrice(sale, product);
      return {
        "التاريخ": sale.date,
        "رمز المنتج": sale.sku,
        "اسم المادة": product?.nameAr || "",
        "الكمية المباعة": sale.quantity,
        "سعر القطعة": price,
        "سعر التكلفة": saleCost(sale, product),
        "التكلفة بالدولار": saleCostUsd(sale, product),
        "إجمالي الإيراد": price * sale.quantity,
        "صافي ربح العملية": (price - saleCost(sale, product)) * sale.quantity,
        "البائع": sale.soldByName || sale.soldBy || "غير محدد",
        "اسم المستخدم": sale.soldBy || "",
      };
    });
    const sellerSummaryRows: Record<string, string | number>[] = accounts.map((account) => {
      const userSales = sales.filter((sale) => sale.soldBy === account.username);
      const revenue = userSales.reduce((total, sale) => {
        const product = products.find((item) => item.sku === sale.sku);
        return total + salePrice(sale, product) * sale.quantity;
      }, 0);
      const profit = userSales.reduce((total, sale) => {
        const product = products.find((item) => item.sku === sale.sku);
        return total + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
      }, 0);
      const qty = userSales.reduce((total, sale) => total + sale.quantity, 0);
      return {
        "البائع": account.displayName,
        "اسم المستخدم": account.username,
        "عدد العمليات": userSales.length,
        "إجمالي القطع": qty,
        "إجمالي المبيعات": revenue,
        "صافي الربح": profit,
      };
    });
    const unknownSales = sales.filter((sale) => !sale.soldBy);
    if (unknownSales.length) {
      const revenue = unknownSales.reduce((total, sale) => {
        const product = products.find((item) => item.sku === sale.sku);
        return total + salePrice(sale, product) * sale.quantity;
      }, 0);
      const profit = unknownSales.reduce((total, sale) => {
        const product = products.find((item) => item.sku === sale.sku);
        return total + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
      }, 0);
      sellerSummaryRows.push({
        "البائع": "غير محدد",
        "اسم المستخدم": "",
        "عدد العمليات": unknownSales.length,
        "إجمالي القطع": unknownSales.reduce((total, sale) => total + sale.quantity, 0),
        "إجمالي المبيعات": revenue,
        "صافي الربح": profit,
      });
    }
    const expenseRows = expenses.map((expense) => ({
      "بند المصروف": expense.categoryAr,
      "المبلغ": expense.amount,
      "تاريخ الاستحقاق": expense.dueDate,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows), "دليل المنتجات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(saleRows), "سجل المبيعات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sellerSummaryRows), "تقرير البائعين");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expenseRows), "المصاريف الثابتة");
    workbook.Workbook = {
      Views: [{ RTL: true }],
      Sheets: [
        { name: "دليل المنتجات", Hidden: 0 },
        { name: "سجل المبيعات", Hidden: 0 },
        { name: "تقرير البائعين", Hidden: 0 },
        { name: "المصاريف الثابتة", Hidden: 0 },
      ],
    };
    const suffix =
      seller === "all"
        ? "الكل"
        : seller === "unknown"
          ? "غير_محدد"
          : accounts.find((account) => account.username === seller)?.username || seller;
    XLSX.writeFile(workbook, `Stayle_More_مبيعات_${suffix}.xlsx`);
    setNotice("تم تنزيل ملف Excel بنجاح.");
  };

  const exportMonthReport = async (month: string, usdRate?: number) => {
    const XLSX = await import("xlsx");
    // Optional USD view: every amount is divided by the rate the user entered on the report page.
    const conv = (amount: number) => (usdRate ? Math.round((amount / usdRate) * 100) / 100 : amount);
    const monthSales = sales.filter((sale) => monthKey(sale.date) === month);
    const monthExpenses = expenses.filter((expense) => monthKey(expense.dueDate) === month);

    const saleRows = monthSales.map((sale) => {
      const product = products.find((item) => item.sku === sale.sku);
      const price = salePrice(sale, product);
      return {
        "التاريخ": sale.date,
        "اسم المادة": product?.nameAr || sale.sku,
        "الكمية": sale.quantity,
        "سعر القطعة": conv(price),
        "الإيراد": conv(price * sale.quantity),
        "الربح": conv((price - saleCost(sale, product)) * sale.quantity),
        "البائع": sale.soldByName || sale.soldBy || "غير محدد",
      };
    });

    const productMap = new Map<string, { nameAr: string; qty: number; revenue: number; profit: number }>();
    for (const sale of monthSales) {
      const product = products.find((item) => item.sku === sale.sku);
      const price = salePrice(sale, product);
      const current = productMap.get(sale.sku) || {
        nameAr: product?.nameAr || sale.sku,
        qty: 0,
        revenue: 0,
        profit: 0,
      };
      current.qty += sale.quantity;
      current.revenue += price * sale.quantity;
      current.profit += (price - saleCost(sale, product)) * sale.quantity;
      productMap.set(sale.sku, current);
    }
    const topProducts = [...productMap.entries()]
      .map(([sku, data]) => ({ sku, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .map((row, index) => ({
        "الترتيب": index + 1,
        "اسم المادة": row.nameAr,
        "رمز المنتج": row.sku,
        "الكمية المباعة": row.qty,
        "الإيراد": conv(row.revenue),
        "الربح": conv(row.profit),
      }));

    const sellerRows = accounts.map((account) => {
      const userSales = monthSales.filter((sale) => sale.soldBy === account.username);
      const revenue = userSales.reduce((sum, sale) => {
        const product = products.find((item) => item.sku === sale.sku);
        return sum + salePrice(sale, product) * sale.quantity;
      }, 0);
      const profit = userSales.reduce((sum, sale) => {
        const product = products.find((item) => item.sku === sale.sku);
        return sum + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
      }, 0);
      return {
        "البائع": account.displayName,
        "اسم المستخدم": account.username,
        "عدد العمليات": userSales.length,
        "القطع": userSales.reduce((sum, sale) => sum + sale.quantity, 0),
        "المبيعات": conv(revenue),
        "الربح": conv(profit),
      };
    }).sort((a, b) => b["المبيعات"] - a["المبيعات"]);

    const expenseRows = monthExpenses.map((expense) => ({
      "البند": expense.categoryAr,
      "المبلغ": conv(expense.amount),
      "التاريخ": expense.dueDate,
      "نوع": isRentExpense(expense) ? "إيجار" : isStockPurchase(expense) ? "شراء بضاعة (لا يُخصم من الربح)" : "مصروف",
    }));

    const revenue = saleRows.reduce((sum, row) => sum + Number(row["الإيراد"]), 0);
    const profit = saleRows.reduce((sum, row) => sum + Number(row["الربح"]), 0);
    const expenseTotal = conv(
      monthExpenses.filter((expense) => !isStockPurchase(expense)).reduce((sum, expense) => sum + expense.amount, 0),
    );
    const stockTotal = conv(monthExpenses.filter(isStockPurchase).reduce((sum, expense) => sum + expense.amount, 0));
    const rentTotal = conv(monthExpenses.filter(isRentExpense).reduce((sum, expense) => sum + expense.amount, 0));
    const summaryRows = [
      { "البند": "الشهر", "القيمة": formatMonthLabel(month) },
      { "البند": "العملة", "القيمة": usdRate ? `دولار (سعر الصرف ${usdRate})` : "ليرة" },
      { "البند": "إجمالي المبيعات", "القيمة": revenue },
      { "البند": "أرباح البضاعة", "القيمة": profit },
      { "البند": "إجمالي المصاريف", "القيمة": expenseTotal },
      { "البند": "شراء بضاعة (لا يُخصم من الربح)", "القيمة": stockTotal },
      { "البند": "الإيجار", "القيمة": rentTotal },
      { "البند": "صافي الربح", "القيمة": Math.round((profit - expenseTotal) * 100) / 100 },
      { "البند": "الأكثر مبيعاً", "القيمة": topProducts[0]?.["اسم المادة"] || "-" },
      { "البند": "الأعلى مبيعاً من البائعين", "القيمة": sellerRows[0]?.["البائع"] || "-" },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "ملخص الشهر");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topProducts), "الأكثر مبيعاً");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sellerRows), "البائعون");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(saleRows), "المبيعات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expenseRows), "المصاريف");
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.writeFile(workbook, `Stayle_More_تقرير_${month}${usdRate ? "_USD" : ""}.xlsx`);
    setNotice(`تم تنزيل تقرير ${formatMonthLabel(month)}.`);
  };

  const importWorkbook = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(loadEvent.target?.result, { type: "array" });
        const productSheet = workbook.Sheets["دليل المنتجات"];
        const salesSheet = workbook.Sheets["سجل المبيعات"];
        const expensesSheet = workbook.Sheets["المصاريف الثابتة"];
        if (!productSheet || !salesSheet || !expensesSheet) throw new Error("missing sheets");

        const productRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(productSheet);
        const saleRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(salesSheet);
        const expenseRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(expensesSheet);
        const importedProducts: Product[] = productRows.map((row) => ({
          sku: String(cellValue(row, ["رمز المنتج", "رمز المنتج (SKU)"]) || ""),
          name: String(cellValue(row, ["اسم المادة"]) || ""),
          nameAr: String(cellValue(row, ["اسم المادة"]) || ""),
          category: String(cellValue(row, ["الفئة"]) || "أخرى"),
          cost: Number(cellValue(row, ["سعر التكلفة", "سعر الجملة (Cost)"]) || 0),
          price: Number(cellValue(row, ["سعر البيع", "سعر البيع (Price)"]) || 0),
          costUsd: Number(cellValue(row, ["سعر التكلفة بالدولار"]) || 0),
          usdRate: Number(cellValue(row, ["سعر الصرف"]) || 0),
          initialStock: Number(cellValue(row, ["المخزون الافتتاحي"]) || 0),
          reorderLevel: Number(cellValue(row, ["حد إعادة الطلب"]) || 0),
          quickSale: ["نعم", "yes", "1", "true"].includes(
            String(cellValue(row, ["بيع سريع"]) || "").trim().toLowerCase(),
          ),
        })).filter((product) => product.sku);
        const importedSales: Sale[] = saleRows.map((row, index) => {
          const qty = Number(cellValue(row, ["الكمية المباعة"]) || 0);
          const priceRaw = cellValue(row, ["سعر القطعة"]);
          const costRaw = cellValue(row, ["سعر التكلفة"]);
          const costUsdRaw = cellValue(row, ["التكلفة بالدولار"]);
          const soldBy = String(cellValue(row, ["اسم المستخدم"]) || "").trim();
          const soldByName = String(cellValue(row, ["البائع"]) || "").trim();
          const matched = accounts.find(
            (account) =>
              account.username === soldBy ||
              account.displayName === soldByName ||
              account.username === soldByName,
          );
          return {
            id: Date.now() + index,
            date: excelDate(cellValue(row, ["التاريخ"])),
            sku: String(cellValue(row, ["رمز المنتج", "رمز المنتج (SKU)"]) || ""),
            quantity: qty,
            unitPrice: priceRaw === "" ? undefined : Number(priceRaw),
            unitCost: costRaw === "" ? undefined : Number(costRaw),
            unitCostUsd: costUsdRaw === "" ? undefined : Number(costUsdRaw),
            soldBy: matched?.username || soldBy || undefined,
            soldByName: matched?.displayName || soldByName || undefined,
          };
        }).filter((sale) => sale.sku && sale.quantity > 0);
        const importedExpenses: Expense[] = expenseRows.map((row, index) => ({
          id: Date.now() + index,
          category: String(cellValue(row, ["بند المصروف"]) || "مصروف آخر"),
          categoryAr: String(cellValue(row, ["بند المصروف"]) || "مصروف آخر"),
          amount: Number(cellValue(row, ["المبلغ", "المبلغ المدفوع"]) || 0),
          dueDate: excelDate(cellValue(row, ["تاريخ الاستحقاق", "الشهر / التاريخ"])),
        })).filter((expense) => expense.amount > 0);

        if (!importedProducts.length) throw new Error("empty products");
        setProducts(importedProducts);
        setSales(importedSales);
        setExpenses(importedExpenses);
        setSelectedSku(importedProducts[0].sku);
        if (isCloudEnabled) {
          setSyncStatus("saving");
          await replaceCloudStore({
            products: importedProducts,
            sales: importedSales,
            expenses: importedExpenses,
            settings,
          });
          setSyncStatus("online");
          setNotice("تم استيراد Excel ورفعه إلى الخادم بنجاح.");
        } else {
          setNotice("تم استيراد بيانات ملف Excel وحفظها بنجاح.");
        }
      } catch {
        setNotice("تعذر الاستيراد. استخدم ملفاً تم تنزيله من النظام وبأسماء الأوراق العربية نفسها.");
        if (isCloudEnabled) setSyncStatus("error");
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-app text-slate-900" dir="rtl" lang="ar">
      <aside className="fixed inset-y-0 right-0 z-50 hidden w-72 flex-col bg-navy px-4 py-6 text-white lg:flex">
        <div className="flex items-center justify-between px-3">
          <button className="flex items-center gap-3 text-right" onClick={() => setActiveTab("dashboard")}>
            <BrandLogo className="size-12 rounded-2xl object-cover shadow-lg shadow-black/10" />
            <span>
              <span className="block text-lg font-bold tracking-tight">Stayle & More</span>
              <span className="block text-xs text-brand">نظام إدارة المتجر</span>
            </span>
          </button>
        </div>

        <nav className="mt-10 space-y-1.5">
          <p className="mb-3 px-4 text-[11px] font-bold tracking-[0.16em] text-brand">مساحة العمل</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right transition ${activeTab === item.id ? "bg-white text-navy shadow-lg shadow-black/10" : "text-brand hover:bg-white/10 hover:text-white"}`}
            >
              <Icon name={item.icon} className="size-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className={`block text-xs ${activeTab === item.id ? "text-slate-500" : "text-brand/80"}`} dir="rtl">{item.arabic}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/8 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className={`size-2 rounded-full ring-4 ${syncStatus === "online" ? "bg-emerald-400 ring-emerald-400/15" : syncStatus === "error" ? "bg-coral ring-coral/20" : syncStatus === "saving" || syncStatus === "loading" ? "bg-amber-300 ring-amber-300/20" : "bg-slate-300 ring-slate-300/20"}`} />
            {syncStatus === "online"
              ? "متصل بالخادم أونلاين"
              : syncStatus === "saving"
                ? "جاري الحفظ على الخادم..."
                : syncStatus === "loading"
                  ? "جاري التحميل من الخادم..."
                  : syncStatus === "error"
                    ? "مشكلة في الاتصال بالخادم"
                    : "وضع محلي فقط"}
          </div>
          <p className="mt-2 text-xs leading-5 text-brand">
            {isCloudEnabled
              ? "ناديا وفرح يشاهدان نفس البيانات على الجهازين."
              : "أضف مفاتيح Supabase في ملف .env لتفعيل المزامنة الأونلاين."}
          </p>
        </div>
      </aside>

      <div className="lg:pr-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white lg:bg-white/95 lg:backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-2 px-4 md:h-20 md:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo className="size-10 shrink-0 rounded-xl object-cover lg:hidden" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900 md:text-lg">{pageInfo.label}</p>
                <p className="hidden text-xs text-slate-500 md:block" dir="rtl">{pageInfo.arabic}</p>
              </div>
              <span
                className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline ${
                  syncStatus === "online"
                    ? "bg-emerald-100 text-emerald-700"
                    : syncStatus === "error"
                      ? "bg-coral-pale text-coral-dark"
                      : syncStatus === "local"
                        ? "bg-slate-100 text-slate-500"
                        : "bg-amber-50 text-amber-700"
                }`}
              >
                {syncStatus === "online"
                  ? "أونلاين"
                  : syncStatus === "saving"
                    ? "حفظ..."
                    : syncStatus === "loading"
                      ? "تحميل..."
                      : syncStatus === "error"
                        ? "غير متصل"
                        : "محلي"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3">
              <button
                className={`grid size-11 place-items-center rounded-xl border lg:hidden ${activeTab === "exchange" ? "border-navy bg-soft-blue text-navy" : "border-slate-200 bg-white text-slate-600"}`}
                onClick={() => setActiveTab("exchange")}
                aria-label="الصرافة"
              >
                <Icon name="exchange" />
              </button>
              <button
                className={`grid size-11 place-items-center rounded-xl border lg:hidden ${activeTab === "settings" ? "border-navy bg-soft-blue text-navy" : "border-slate-200 bg-white text-slate-600"}`}
                onClick={() => setActiveTab("settings")}
                aria-label="الإعدادات"
              >
                <Icon name="settings" />
              </button>
              <button
                className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 md:hidden"
                onClick={() => setMobileSearchOpen((open) => !open)}
                aria-label="بحث"
              >
                <Icon name="search" />
              </button>
              <div className="relative hidden md:block" ref={searchRef}>
                <label className="relative block">
                  <Icon name="search" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-10 text-sm outline-none transition focus:border-navy focus:bg-white focus:ring-4 focus:ring-[#fddfe0] lg:w-64"
                    placeholder="البحث في المخزون..."
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                  />
                </label>
                {searchOpen && searchQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                    {searchResults.length ? searchResults.map((product) => (
                      <button
                        key={product.sku}
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-right last:border-b-0 hover:bg-slate-50"
                        onClick={() => {
                          setActiveTab("products");
                          setSearchQuery(product.nameAr);
                          setSearchOpen(false);
                        }}
                      >
                        <span>
                          <span className="block text-sm font-bold text-slate-800">{product.nameAr}</span>
                          <span className="block text-xs text-slate-400">{product.category}</span>
                        </span>
                        <span className="text-xs font-semibold text-navy">{money(product.price)}</span>
                      </button>
                    )) : (
                      <p className="px-4 py-3 text-sm text-slate-500">لا توجد نتائج مطابقة</p>
                    )}
                  </div>
                )}
              </div>
              <button
                className="hidden size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 md:grid"
                onClick={() => openQuickSale()}
                aria-label="بيع سريع"
                title="بيع سريع"
              >
                <Icon name="plus" />
              </button>
              <div className="flex items-center gap-2 rounded-xl border border-coral-border bg-brand/60 px-2.5 py-1.5">
                <span className="grid size-8 place-items-center rounded-lg bg-navy text-[11px] font-bold text-white">
                  {authUser.shortName}
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block text-xs font-bold text-slate-800">{authUser.displayName}</span>
                  <span className="block text-[10px] text-slate-500">{authUser.username}</span>
                </span>
              </div>
              <button
                className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-coral-soft hover:text-coral-dark"
                onClick={logout}
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
              >
                <Icon name="logout" />
              </button>
            </div>
          </div>
          {mobileSearchOpen && (
            <div className="border-t border-slate-100 px-4 py-3 md:hidden">
              <div className="relative">
                <Icon name="search" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-3 pr-10 text-base outline-none focus:border-navy focus:bg-white focus:ring-4 focus:ring-[#fddfe0]"
                  placeholder="ابحث عن منتج..."
                  value={searchQuery}
                  autoFocus
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setActiveTab("products");
                  }}
                />
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-[1600px] p-4 pb-mobile-nav md:p-8">
          {notice && (
            <div className="fixed left-4 right-4 top-[4.5rem] z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-xl shadow-slate-900/10 md:left-5 md:right-auto md:top-24">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" className="size-5" /></span>
              <p className="text-sm font-medium text-slate-700">{notice}</p>
            </div>
          )}

          {activeTab === "dashboard" && (
            <Dashboard
              metrics={metrics}
              sales={sales}
              soldBySku={soldBySku}
              onNewSale={() => openQuickSale()}
              onAddProduct={() => setProductModal("add")}
              onProducts={() => setActiveTab("products")}
              onSales={() => setActiveTab("sales")}
              onExpenses={() => setActiveTab("expenses")}
              onReports={() => setActiveTab("reports")}
              onSale={goToSale}
              onDeleteSale={requestDeleteSale}
              products={products}
              onExport={() => void exportWorkbook()}
              onImport={() => fileInputRef.current?.click()}
            />
          )}
          {activeTab === "products" && (
            <ProductsTable
              products={products}
              soldBySku={soldBySku}
              onSale={goToSale}
              onAdd={() => setProductModal("add")}
              onEdit={(product) => setProductModal(product)}
              onToggleQuickSale={toggleQuickSale}
              onBulkUpdate={bulkUpdateProducts}
              usdRate={settings.usdRate}
              initialSearch={searchQuery}
            />
          )}
          {activeTab === "sales" && selectedProduct && (
            <SalesPage
              sales={sales}
              selectedSku={selectedSku}
              setSelectedSku={setSelectedSku}
              quantity={quantity}
              setQuantity={setQuantity}
              unitPrice={unitPrice}
              setUnitPrice={setUnitPrice}
              saleDate={saleDate}
              setSaleDate={setSaleDate}
              selectedProduct={selectedProduct}
              selectedRemaining={selectedRemaining}
              onSubmit={addSale}
              onDeleteSale={requestDeleteSale}
              onQuickSale={() => openQuickSale()}
              products={products}
              sellerFilter={sellerFilter}
              setSellerFilter={setSellerFilter}
              onExport={() => void exportWorkbook(sellerFilter)}
            />
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importWorkbook} />
          {activeTab === "expenses" && (
            <ExpensesPage
              expenses={expenses}
              category={expenseCategory}
              setCategory={setExpenseCategory}
              amount={expenseAmount}
              setAmount={setExpenseAmount}
              date={expenseDate}
              setDate={setExpenseDate}
              editingId={editingExpenseId}
              onSubmit={saveExpense}
              onEdit={startEditExpense}
              onCancelEdit={resetExpenseForm}
              onDelete={deleteExpense}
            />
          )}
          {activeTab === "reports" && (
            <ReportsPage
              month={reportMonth}
              setMonth={setReportMonth}
              sales={sales}
              expenses={expenses}
              products={products}
              defaultUsdRate={settings.usdRate}
              onExport={(usdRate) => void exportMonthReport(reportMonth, usdRate)}
            />
          )}
          {activeTab === "exchange" && (
            <ExchangePage
              exchanges={exchanges}
              defaultUsdRate={settings.usdRate}
              onAdd={addExchange}
              onDelete={deleteExchange}
            />
          )}
          {activeTab === "settings" && (
            <SettingsPage settings={settings} products={products} onChangeUsdRate={changeUsdRate} />
          )}
          {productModal && (
            <ProductModal
              mode={productModal === "add" ? "add" : "edit"}
              product={productModal === "add" ? null : productModal}
              usdRate={settings.usdRate}
              categories={allCategories(products)}
              onClose={() => setProductModal(null)}
              onSave={saveProduct}
            />
          )}
          {quickSaleOpen && (
            <QuickSaleSheet
              products={products}
              soldBySku={soldBySku}
              initialSku={selectedSku}
              onClose={() => setQuickSaleOpen(false)}
              onCheckout={(lines) => {
                if (checkoutCart(lines)) setQuickSaleOpen(false);
              }}
            />
          )}
          {confirmDelete && (
            <ConfirmDialog
              title="تأكيد الحذف"
              message={`هل أنت متأكد من حذف عملية البيع «${confirmDelete.label}»؟ لا يمكن التراجع عن هذا الإجراء.`}
              confirmLabel="نعم، احذف"
              cancelLabel="إلغاء"
              onConfirm={() => deleteSale(confirmDelete.id)}
              onCancel={() => setConfirmDelete(null)}
            />
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-[0_-8px_30px_rgb(15_23_42/0.08)] lg:hidden safe-bottom">
        <div className="mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1 pt-1">
          {mobileNavItems.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-[9px] font-bold leading-tight transition sm:text-[10px] ${activeTab === item.id ? "text-navy" : "text-slate-400"}`}
            >
              <span className={`grid size-8 place-items-center rounded-xl sm:size-9 ${activeTab === item.id ? "bg-soft-blue text-navy" : ""}`}>
                <Icon name={item.icon} className="size-4" />
              </span>
              <span className="max-w-full truncate">{item.short}</span>
            </button>
          ))}
          <div className="relative flex w-14 shrink-0 justify-center sm:w-16">
            <button
              onClick={() => openQuickSale()}
              className="-mt-5 grid size-12 place-items-center rounded-full bg-navy text-white shadow-lg shadow-navy/30 active:scale-95 sm:-mt-6 sm:size-14"
              aria-label="بيع سريع"
            >
              <Icon name="plus" className="size-6 sm:size-7" />
            </button>
          </div>
          {mobileNavItems.slice(2).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-[9px] font-bold leading-tight transition sm:text-[10px] ${activeTab === item.id ? "text-navy" : "text-slate-400"}`}
            >
              <span className={`grid size-8 place-items-center rounded-xl sm:size-9 ${activeTab === item.id ? "bg-soft-blue text-navy" : ""}`}>
                <Icon name={item.icon} className="size-4" />
              </span>
              <span className="max-w-full truncate">{item.short}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 md:mb-7 md:gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-xs font-semibold text-navy md:text-sm">{eyebrow}</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-3xl">{title}</h1>
        <p className="mt-1.5 hidden max-w-2xl text-sm leading-6 text-slate-500 md:mt-2 md:block">{description}</p>
      </div>
      {action && <div className="flex w-full flex-wrap gap-2 sm:w-auto">{action}</div>}
    </div>
  );
}

function Dashboard({
  metrics,
  sales,
  soldBySku,
  onNewSale,
  onAddProduct,
  onProducts,
  onSales,
  onExpenses,
  onReports,
  onSale,
  onDeleteSale,
  products,
  onExport,
  onImport,
}: {
  metrics: { revenue: number; grossProfit: number; fixedExpenses: number; netProfit: number };
  sales: Sale[];
  soldBySku: Record<string, number>;
  onNewSale: () => void;
  onAddProduct: () => void;
  onProducts: () => void;
  onSales: () => void;
  onExpenses: () => void;
  onReports: () => void;
  onSale: (sku: string) => void;
  onDeleteSale: (id: number) => void;
  products: Product[];
  onExport: () => void;
  onImport: () => void;
}) {
  const lowStock = products
    .map((product) => ({ ...product, remaining: product.initialStock - (soldBySku[product.sku] || 0) }))
    .filter((product) => product.remaining <= product.reorderLevel);

  const quickProducts = products
    .map((product) => ({ ...product, remaining: product.initialStock - (soldBySku[product.sku] || 0) }))
    .filter((product) => product.quickSale && product.remaining > 0);

  const shortcuts = [
    { label: "بيع جديد", hint: "الأكثر استخداماً", icon: "plus" as IconName, onClick: onNewSale, primary: true },
    { label: "منتج جديد", hint: "إضافة للمخزون", icon: "box" as IconName, onClick: onAddProduct, primary: false },
    { label: "التقارير", hint: "شهري + الأكثر مبيعاً", icon: "chart" as IconName, onClick: onReports, primary: false },
    { label: "مصروف", hint: "تكاليف التشغيل", icon: "wallet" as IconName, onClick: onExpenses, primary: false },
  ];

  return (
    <>
      <div className="mb-4 md:mb-6">
        <p className="text-xs font-semibold text-navy">مرحباً بك في Stayle & More</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">ماذا تريد أن تفعل؟</h1>
      </div>

      <button
        onClick={onNewSale}
        className="mb-4 flex w-full items-center gap-4 rounded-3xl bg-navy p-4 text-right text-white shadow-xl shadow-navy/25 active:scale-[0.99] md:mb-5 md:p-5"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15">
          <Icon name="plus" className="size-8" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold md:text-xl">إضافة بيع جديد</span>
          <span className="mt-1 block text-sm text-brand">اضغط هنا لتسجيل عملية بيع بسرعة</span>
        </span>
        <Icon name="chevron" className="size-6 rotate-180 opacity-70" />
      </button>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {shortcuts.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`rounded-2xl border p-4 text-right active:scale-[0.98] ${item.primary ? "border-navy bg-navy text-white" : "border-coral-border bg-white text-slate-800"}`}
          >
            <span className={`grid size-11 place-items-center rounded-xl ${item.primary ? "bg-white/15 text-white" : "bg-brand text-navy"}`}>
              <Icon name={item.icon} />
            </span>
            <span className="mt-3 block text-sm font-bold">{item.label}</span>
            <span className={`mt-1 block text-xs ${item.primary ? "text-brand" : "text-slate-400"}`}>{item.hint}</span>
          </button>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4 md:mt-5 md:gap-4">
        {[
          { label: "المبيعات", value: metrics.revenue, tone: "blue" as const, icon: "wallet" as IconName },
          { label: "أرباح البضاعة", value: metrics.grossProfit, tone: "indigo" as const, icon: "profit" as IconName },
          { label: "المصاريف", value: metrics.fixedExpenses, tone: "orange" as const, icon: "receipt" as IconName },
          { label: "صافي الربح", value: metrics.netProfit, tone: "green" as const, icon: "arrowUp" as IconName },
        ].map((card) => (
          <div key={card.label} className={`metric-card rounded-2xl border p-3.5 md:p-4 ${card.tone === "green" ? "border-emerald-200 bg-emerald-50/80" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-2">
              <span className={`grid size-9 place-items-center rounded-xl icon-${card.tone}`}><Icon name={card.icon} className="size-4" /></span>
              <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            </div>
            <p className="mt-2 text-lg font-bold tracking-tight text-slate-950 md:text-xl">{money(card.value)}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-coral-border bg-white p-4 md:mt-5 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">بيع سريع من المنتجات</h2>
            <p className="mt-1 text-xs text-slate-500">المنتجات المفعّل عليها «بيع سريع» — أدِرها من صفحة المنتجات</p>
          </div>
          <button onClick={onProducts} className="min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold text-navy">كل المنتجات</button>
        </div>
        {quickProducts.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {quickProducts.map((product) => (
              <button
                key={product.sku}
                onClick={() => onSale(product.sku)}
                className="rounded-2xl border border-slate-200 bg-brand/40 p-3 text-right active:scale-[0.98] active:border-navy"
              >
                <p className="truncate text-sm font-bold text-slate-900">{product.nameAr}</p>
                <p className="mt-1 text-[11px] text-slate-500">{product.category}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-navy">{money(product.price)}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600">متبقي {product.remaining}</span>
                </div>
                <span className="mt-2 flex items-center justify-center gap-1 rounded-xl bg-navy py-2 text-xs font-bold text-white">
                  <Icon name="plus" className="size-3.5" /> بيع
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-brand/50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">لا توجد منتجات في البيع السريع</p>
            <p className="mt-1 text-xs text-slate-500">فعّل خيار «بيع سريع» من صفحة المنتجات</p>
            <Button className="mt-3" onClick={onProducts}><Icon name="box" className="size-4" /> إدارة المنتجات</Button>
          </div>
        )}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-5 md:gap-4">
        <button onClick={onAddProduct} className="flex items-center gap-3 rounded-2xl border border-dashed border-navy/30 bg-brand/50 p-4 text-right active:scale-[0.99]">
          <span className="grid size-12 place-items-center rounded-2xl bg-navy text-white"><Icon name="box" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">إضافة منتج جديد</span>
            <span className="mt-1 block text-xs text-slate-500">اسم، فئة، سعر، ومخزون</span>
          </span>
          <Icon name="chevron" className="size-5 rotate-180 text-navy" />
        </button>
        <button onClick={onExpenses} className="flex items-center gap-3 rounded-2xl border border-dashed border-navy/30 bg-white p-4 text-right active:scale-[0.99]">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand text-navy"><Icon name="wallet" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">إضافة مصروف</span>
            <span className="mt-1 block text-xs text-slate-500">إيجار، رواتب، كهرباء...</span>
          </span>
          <Icon name="chevron" className="size-5 rotate-180 text-navy" />
        </button>
      </section>

      <div className="mt-4 flex gap-2 md:mt-5">
        <Button variant="secondary" className="flex-1" onClick={onExport}><Icon name="receipt" className="size-4" /> تنزيل Excel</Button>
        <Button variant="secondary" className="flex-1" onClick={onImport}><Icon name="box" className="size-4" /> استيراد Excel</Button>
      </div>

      {lowStock.length > 0 && (
        <section className="mt-4 rounded-2xl border border-coral-border bg-coral-soft p-4 md:mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-coral-dark">تنبيه مخزون منخفض</h2>
              <p className="mt-1 text-xs text-coral-dark/80">اضغط للبيع أو راجع المنتجات</p>
            </div>
            <button onClick={onProducts} className="min-h-10 px-2 text-xs font-bold text-coral-dark">عرض</button>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 4).map((product) => (
              <button key={product.sku} onClick={() => onSale(product.sku)} disabled={product.remaining < 1} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-right active:scale-[0.99] disabled:cursor-not-allowed">
                <span className="grid size-10 place-items-center rounded-lg bg-coral-pale text-coral-dark"><Icon name="warning" className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{product.nameAr}</span>
                  <span className="block text-xs text-slate-500">متبقي {product.remaining}</span>
                </span>
                <span className={`rounded-xl px-3 py-2 text-xs font-bold ${product.remaining < 1 ? "bg-coral-pale text-coral-dark" : "bg-navy text-white"}`}>{product.remaining < 1 ? "نفد" : "بيع"}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white md:mt-5">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 md:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">آخر المبيعات</h2>
            <p className="mt-1 text-xs text-slate-500">يمكنك حذف أي عملية من هنا</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" className="min-h-10 px-2" onClick={onSales}>الكل</Button>
            <Button className="min-h-10 px-3" onClick={onNewSale}><Icon name="plus" className="size-4" /> بيع</Button>
          </div>
        </div>
        <SalesList sales={sales.slice(0, 5)} products={products} onDelete={onDeleteSale} />
      </section>
    </>
  );
}

function ProductsTable({
  products,
  soldBySku,
  onSale,
  onAdd,
  onEdit,
  onToggleQuickSale,
  onBulkUpdate,
  usdRate,
  initialSearch = "",
}: {
  products: Product[];
  soldBySku: Record<string, number>;
  onSale: (sku: string) => void;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onToggleQuickSale: (sku: string) => void;
  onBulkUpdate: (updated: Product[]) => void;
  usdRate: number;
  initialSearch?: string;
}) {
  const [query, setQuery] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const categories = useMemo(() => allCategories(products), [products]);

  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (product) =>
        (categoryFilter === "all" || product.category === categoryFilter) &&
        (!q ||
          [product.nameAr, product.name, product.category, product.sku]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [products, query, categoryFilter]);

  const allShownSelected = filtered.length > 0 && filtered.every((product) => selected.has(product.sku));

  const toggleSelected = (sku: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const toggleAllShown = () => {
    setSelected((current) => {
      const next = new Set(current);
      for (const product of filtered) {
        if (allShownSelected) next.delete(product.sku);
        else next.add(product.sku);
      }
      return next;
    });
  };

  return (
    <>
      <PageIntro
        eyebrow="إدارة المخزون"
        title="المنتجات"
        description="أضف المنتجات وعدّلها، وفعّل «بيع سريع» للمنتجات الأكثر مبيعاً."
        action={
          <>
            <Button className="flex-1 sm:flex-none" onClick={onAdd}><Icon name="plus" className="size-4" /> إضافة</Button>
            <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => setPriceModalOpen(true)}><Icon name="edit" className="size-4" /> تعديل الأسعار</Button>
            <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => products[0] && onSale(products[0].sku)}>بيع</Button>
          </>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 md:flex-row md:items-center md:justify-between md:p-4">
          <div className="relative w-full md:w-auto">
            <Icon name="search" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-3 pr-10 text-base outline-none focus:border-navy focus:bg-white focus:ring-4 focus:ring-[#fddfe0] md:w-72 md:py-2.5 md:text-sm"
              placeholder="بحث بالاسم أو الفئة..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base outline-none focus:border-navy focus:bg-white md:w-48 md:py-2.5 md:text-sm"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="تصفية حسب الفئة"
          >
            <option value="all">كل الفئات</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <div className="flex items-center justify-between gap-3 md:mr-auto">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" className="size-4 accent-navy" checked={allShownSelected} onChange={toggleAllShown} disabled={!filtered.length} />
              تحديد الظاهر
            </label>
            <p className="text-sm text-slate-500">
              <strong className="text-slate-800">{filtered.length}</strong> منتجات
            </p>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-coral-border bg-coral-soft px-3 py-2.5 md:px-4">
            <p className="text-sm font-semibold text-navy">تم تحديد {selected.size} منتج</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="min-h-10 px-3 text-xs" onClick={() => setSelected(new Set())}>إلغاء التحديد</Button>
              <Button className="min-h-10 px-3 text-xs" onClick={() => setPriceModalOpen(true)}>تعديل أسعار المحدد</Button>
            </div>
          </div>
        )}

        <div className="space-y-3 p-3 md:hidden">
          {filtered.length ? filtered.map((product) => {
            const sold = soldBySku[product.sku] || 0;
            const remaining = product.initialStock - sold;
            const needsReorder = remaining <= product.reorderLevel;
            return (
              <div key={product.sku} className={`rounded-2xl border p-3.5 ${needsReorder ? "border-coral-border bg-coral-soft" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 shrink-0 accent-navy"
                      checked={selected.has(product.sku)}
                      onChange={() => toggleSelected(product.sku)}
                      aria-label={`تحديد ${product.nameAr}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{product.nameAr}</span>
                      <span className="mt-1 block text-xs text-slate-500">{product.category}</span>
                    </span>
                  </label>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${needsReorder ? "bg-coral-pale text-coral-dark" : "bg-emerald-100 text-emerald-700"}`}>
                      {needsReorder ? "طلب" : "متوفر"}
                    </span>
                    {product.quickSale && (
                      <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-bold text-white">بيع سريع</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">السعر</p>
                    <p className="text-sm font-bold text-slate-800">{money(product.price)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">المتبقي</p>
                    <p className={`text-sm font-bold ${needsReorder ? "text-coral-dark" : "text-slate-800"}`}>{remaining}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">الربح</p>
                    <p className="text-sm font-bold text-emerald-700">{money(product.price - product.cost)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button
                    variant={product.quickSale ? "primary" : "secondary"}
                    className="min-h-12 px-2 text-xs"
                    onClick={() => onToggleQuickSale(product.sku)}
                  >
                    {product.quickSale ? "سريع ✓" : "بيع سريع"}
                  </Button>
                  <Button variant="secondary" className="min-h-12" onClick={() => onEdit(product)}><Icon name="edit" className="size-4" /> تعديل</Button>
                  <Button className="min-h-12" onClick={() => onSale(product.sku)} disabled={remaining < 1}><Icon name="plus" className="size-4" /> {remaining < 1 ? "نفد" : "بيع"}</Button>
                </div>
              </div>
            );
          }) : (
            <p className="py-10 text-center text-sm text-slate-500">لا توجد منتجات مطابقة.</p>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1140px] text-left">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3.5">
                  <input type="checkbox" className="size-4 accent-navy" checked={allShownSelected} onChange={toggleAllShown} disabled={!filtered.length} aria-label="تحديد الكل" />
                </th>
                {["اسم المادة", "التكلفة بالدولار", "التكلفة", "سعر البيع", "ربح القطعة", "الافتتاحي", "المباع", "الحالي", "الحالة", "بيع سريع", "إجراءات"].map((header) => (
                  <th key={header} className="px-4 py-3.5">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length ? filtered.map((product) => {
                const sold = soldBySku[product.sku] || 0;
                const remaining = product.initialStock - sold;
                const needsReorder = remaining <= product.reorderLevel;
                return (
                  <tr key={product.sku} className={`${needsReorder ? "bg-coral-soft/60" : "hover:bg-slate-50/70"} transition`}>
                    <td className="px-4 py-4">
                      <input type="checkbox" className="size-4 accent-navy" checked={selected.has(product.sku)} onChange={() => toggleSelected(product.sku)} aria-label={`تحديد ${product.nameAr}`} />
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => onSale(product.sku)} className="text-right">
                        <p className="whitespace-nowrap text-sm font-bold text-slate-800 hover:text-navy">{product.nameAr}</p>
                        <p className="mt-1 text-xs text-slate-400">{product.category}</p>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600" dir="ltr">{product.costUsd > 0 ? usd(product.costUsd) : "—"}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{money(product.cost)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-800">{money(product.price)}</td>
                    <td className="px-4 py-4 text-sm font-bold text-emerald-700">{money(product.price - product.cost)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{product.initialStock}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{sold}</td>
                    <td className={`px-4 py-4 text-sm font-bold ${needsReorder ? "text-coral-dark" : "text-slate-800"}`}>{remaining}</td>
                    <td className="px-4 py-4">
                      {needsReorder ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-coral-pale px-3 py-1.5 text-xs font-bold text-coral-dark"><Icon name="warning" className="size-3.5" /> بحاجة لإعادة الطلب</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> متوفر</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => onToggleQuickSale(product.sku)}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          product.quickSale
                            ? "bg-navy text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-navy hover:text-navy"
                        }`}
                        title={product.quickSale ? "إزالة من البيع السريع" : "إضافة للبيع السريع"}
                      >
                        <Icon name="sparkles" className="size-3.5" />
                        {product.quickSale ? "مفعّل" : "تفعيل"}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" onClick={() => onEdit(product)} aria-label={`تعديل ${product.nameAr}`} title="تعديل">
                          <Icon name="edit" className="size-4" />
                        </button>
                        <button className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-brand hover:text-navy disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onSale(product.sku)} disabled={remaining < 1} aria-label={`بيع ${product.nameAr}`} title={remaining < 1 ? "نفدت الكمية" : "بيع"}>
                          <Icon name="receipt" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-sm text-slate-500">لا توجد منتجات مطابقة لبحثك.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {priceModalOpen && (
        <PriceAdjustModal
          products={products}
          selectedSkus={selected}
          categories={categories}
          defaultCategory={categoryFilter}
          onClose={() => setPriceModalOpen(false)}
          onApply={(updated) => {
            onBulkUpdate(updated);
            setPriceModalOpen(false);
            setSelected(new Set());
          }}
        />
      )}
    </>
  );
}

type PriceScope = "selected" | "category" | "all";

function PriceAdjustModal({
  products,
  selectedSkus,
  categories,
  defaultCategory,
  onClose,
  onApply,
}: {
  products: Product[];
  selectedSkus: Set<string>;
  categories: string[];
  defaultCategory: string;
  onClose: () => void;
  onApply: (updated: Product[]) => void;
}) {
  const [scope, setScope] = useState<PriceScope>(
    selectedSkus.size ? "selected" : defaultCategory !== "all" ? "category" : "all",
  );
  const [category, setCategory] = useState(defaultCategory !== "all" ? defaultCategory : categories[0] || "");
  const [mode, setMode] = useState<"amount" | "percent">("percent");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [value, setValue] = useState("");

  const amount = Number(value);
  const targets = products.filter((product) =>
    scope === "selected" ? selectedSkus.has(product.sku) : scope === "category" ? product.category === category : true,
  );

  const adjust = (base: number) => {
    const delta = mode === "percent" ? (base * amount) / 100 : amount;
    const next = Math.max(0, base + direction * delta);
    return Math.round(next);
  };
  const valid = targets.length > 0 && amount > 0 && !Number.isNaN(amount);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onApply(targets.map((product) => ({ ...product, price: adjust(product.price) })));
  };

  const segment = (active: boolean) =>
    `min-h-11 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-navy"}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm md:items-center md:p-4">
      <button className="absolute inset-0" onClick={onClose} aria-label="إغلاق" />
      <form onSubmit={handleSubmit} className="sheet-enter relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl safe-bottom md:max-h-[90vh] md:max-w-lg md:rounded-3xl md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy">
              <Icon name="edit" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">تعديل أسعار البيع</h2>
              <p className="text-xs text-slate-500">زيادة أو تخفيض السعر لعدة منتجات دفعة واحدة</p>
            </div>
          </div>
          <button type="button" className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <FieldLabel>المنتجات</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className={segment(scope === "selected")} onClick={() => setScope("selected")} disabled={!selectedSkus.size}>
                المحدد ({selectedSkus.size})
              </button>
              <button type="button" className={segment(scope === "category")} onClick={() => setScope("category")}>فئة</button>
              <button type="button" className={segment(scope === "all")} onClick={() => setScope("all")}>الكل</button>
            </div>
            {scope === "category" && (
              <select className={`${inputClass} mt-2`} value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>العملية</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={segment(direction === 1)} onClick={() => setDirection(1)}>+ زيادة</button>
                <button type="button" className={segment(direction === -1)} onClick={() => setDirection(-1)}>− تخفيض</button>
              </div>
            </div>
            <div>
              <FieldLabel>النوع</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={segment(mode === "percent")} onClick={() => setMode("percent")}>%</button>
                <button type="button" className={segment(mode === "amount")} onClick={() => setMode("amount")}>مبلغ</button>
              </div>
            </div>
          </div>

          <label className="block">
            <FieldLabel>{mode === "percent" ? "النسبة %" : "المبلغ"}</FieldLabel>
            <input type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} value={value} onChange={(event) => setValue(event.target.value)} required />
          </label>

          <div className="rounded-2xl border border-slate-200">
            <p className="border-b border-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-500">
              معاينة · {targets.length} منتج
            </p>
            <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
              {targets.length ? targets.map((product) => {
                const next = valid ? adjust(product.price) : product.price;
                const losing = next < product.cost;
                return (
                  <div key={product.sku} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <span className="min-w-0 truncate font-semibold text-slate-700">{product.nameAr}</span>
                    <span className="shrink-0 tabular-nums" dir="ltr">
                      <span className="text-slate-400">{money(product.price)}</span>
                      {" → "}
                      <span className={`font-bold ${losing ? "text-coral-dark" : "text-slate-900"}`}>{money(next)}</span>
                    </span>
                  </div>
                );
              }) : (
                <p className="px-3.5 py-6 text-center text-sm text-slate-500">لا توجد منتجات.</p>
              )}
            </div>
          </div>
          {valid && targets.some((product) => adjust(product.price) < product.cost) && (
            <p className="flex items-center gap-2 text-xs font-semibold text-coral-dark">
              <Icon name="warning" className="size-4" /> بعض الأسعار الجديدة أقل من سعر التكلفة.
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="min-h-12" onClick={onClose}>إلغاء</Button>
          <Button type="submit" className="min-h-12" disabled={!valid}>تطبيق على {targets.length}</Button>
        </div>
      </form>
    </div>
  );
}

function SettingsPage({
  settings,
  products,
  onChangeUsdRate,
}: {
  settings: StoreSettings;
  products: Product[];
  onChangeUsdRate: (usdRate: number) => void;
}) {
  const [rate, setRate] = useState(settings.usdRate ? String(settings.usdRate) : "");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setRate(settings.usdRate ? String(settings.usdRate) : "");
  }, [settings.usdRate]);

  const parsed = Number(rate);
  const usdProducts = products.filter((product) => product.costUsd > 0);
  const valid = parsed > 0 && parsed !== settings.usdRate;

  return (
    <>
      <PageIntro eyebrow="إعدادات المتجر" title="الإعدادات" description="سعر صرف الدولار المستخدم لحساب أسعار البيع بالليرة." />
      <form
        className="max-w-lg rounded-2xl border border-slate-200 bg-white p-4 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) setConfirming(true);
        }}
      >
        <label className="block">
          <FieldLabel>سعر صرف الدولار</FieldLabel>
          <input type="number" min="0" step="0.01" dir="ltr" inputMode="decimal" className={inputClass} value={rate} onChange={(event) => setRate(event.target.value)} required />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          الحالي: <strong className="text-slate-700" dir="ltr">{settings.usdRate || "غير محدد"}</strong>
          {" · "}
          {usdProducts.length} منتج بتكلفة بالدولار
        </p>
        <Button type="submit" className="mt-4 w-full min-h-12" disabled={!valid}>حفظ سعر الصرف</Button>
      </form>
      {confirming && (
        <ConfirmDialog
          title="تأكيد تغيير سعر الصرف"
          message={`سيتم تغيير سعر الصرف إلى ${parsed}، وسيتم تحديث سعر التكلفة لـ ${usdProducts.length} منتج بتكلفة بالدولار بناءً على القيمة الجديدة، مع تعديل سعر البيع بنفس نسبة الربح. المبيعات السابقة لن تتأثر. هل تريد المتابعة؟`}
          confirmLabel="نعم، حدّث الأسعار"
          cancelLabel="إلغاء"
          confirmIcon="check"
          danger={false}
          onConfirm={() => {
            setConfirming(false);
            onChangeUsdRate(parsed);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

function ProductModal({
  mode,
  product,
  categories,
  onClose,
  onSave,
  usdRate,
}: {
  mode: "add" | "edit";
  product: Product | null;
  categories: string[];
  onClose: () => void;
  onSave: (product: Product, mode: "add" | "edit") => void;
  usdRate: number;
}) {
  const [nameAr, setNameAr] = useState(product?.nameAr || "");
  const [category, setCategory] = useState(product?.category || categories[0] || "أخرى");
  const [cost, setCost] = useState(String(product?.cost ?? ""));
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [costUsd, setCostUsd] = useState(product?.costUsd ? String(product.costUsd) : "");
  const [rate, setRate] = useState(String(product?.usdRate || usdRate || ""));
  const usdCosted = Number(costUsd) > 0;
  const derivedCost = costFromUsd(Number(costUsd), Number(rate) || 0);
  const [initialStock, setInitialStock] = useState(String(product?.initialStock ?? ""));
  const [quickSale, setQuickSale] = useState(Boolean(product?.quickSale));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsedCost = Number(cost);
    const parsedPrice = Number(price);
    const parsedCostUsd = Number(costUsd || 0);
    const parsedRate = Number(rate || 0);
    if (parsedCostUsd > 0 && !(parsedRate > 0)) return;
    const parsedStock = Number(initialStock);
    if (!nameAr.trim() || (!usdCosted && Number.isNaN(parsedCost)) || Number.isNaN(parsedPrice) || Number.isNaN(parsedCostUsd) || Number.isNaN(parsedStock)) return;
    const sku = product?.sku || `SM-${Date.now().toString().slice(-6)}`;
    onSave(
      {
        sku,
        name: nameAr.trim(),
        nameAr: nameAr.trim(),
        category,
        cost: parsedCostUsd > 0 ? costFromUsd(parsedCostUsd, parsedRate) : parsedCost,
        price: parsedPrice,
        costUsd: parsedCostUsd,
        usdRate: parsedCostUsd > 0 ? parsedRate : 0,
        initialStock: parsedStock,
        reorderLevel: product?.reorderLevel ?? DEFAULT_REORDER_LEVEL,
        quickSale,
      },
      mode,
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm md:items-center md:p-4">
      <button className="absolute inset-0" onClick={onClose} aria-label="إغلاق" />
      <form onSubmit={handleSubmit} className="sheet-enter relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl safe-bottom md:max-h-[90vh] md:max-w-lg md:rounded-3xl md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy">
              <Icon name={mode === "add" ? "plus" : "edit"} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">{mode === "add" ? "إضافة منتج جديد" : "تعديل المنتج"}</h2>
              <p className="text-xs text-slate-500">{mode === "add" ? "أدخل بيانات المنتج" : product?.nameAr}</p>
            </div>
          </div>
          <button type="button" className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <FieldLabel>اسم المادة</FieldLabel>
            <input className={inputClass} value={nameAr} onChange={(event) => setNameAr(event.target.value)} required />
          </label>
          <label>
            <FieldLabel>الفئة</FieldLabel>
            <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <FieldLabel>المخزون الافتتاحي</FieldLabel>
            <input type="number" min="0" className={inputClass} value={initialStock} onChange={(event) => setInitialStock(event.target.value)} required />
          </label>
          <label>
            <FieldLabel>سعر التكلفة بالدولار</FieldLabel>
            <input type="number" min="0" step="0.01" dir="ltr" className={inputClass} value={costUsd} onChange={(event) => setCostUsd(event.target.value)} placeholder="اختياري" />
          </label>
          {usdCosted && (
            <label>
              <FieldLabel>سعر الصرف</FieldLabel>
              <input type="number" min="0" step="0.01" dir="ltr" className={inputClass} value={rate} onChange={(event) => setRate(event.target.value)} required />
            </label>
          )}
          <label>
            <FieldLabel>سعر التكلفة</FieldLabel>
            {usdCosted ? (
              <div className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
                <span className="font-bold text-slate-900">{money(derivedCost)}</span>
                <span className="text-xs text-slate-500" dir="ltr">{usd(Number(costUsd))} × {Number(rate) || 0}</span>
              </div>
            ) : (
              <input type="number" min="0" step="0.01" className={inputClass} value={cost} onChange={(event) => setCost(event.target.value)} required />
            )}
          </label>
          <label>
            <FieldLabel>سعر البيع</FieldLabel>
            <input type="number" min="0" step="0.01" className={inputClass} value={price} onChange={(event) => setPrice(event.target.value)} required />
          </label>
          <button
            type="button"
            onClick={() => setQuickSale((current) => !current)}
            className={`sm:col-span-2 flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-right transition ${
              quickSale ? "border-navy bg-soft-blue" : "border-slate-200 bg-white"
            }`}
          >
            <span>
              <span className="block text-sm font-bold text-slate-900">بيع سريع</span>
              <span className="mt-0.5 block text-xs text-slate-500">يظهر في قسم البيع السريع بالرئيسية</span>
            </span>
            <span className={`grid size-10 place-items-center rounded-xl ${quickSale ? "bg-navy text-white" : "bg-slate-100 text-slate-500"}`}>
              <Icon name={quickSale ? "check" : "sparkles"} className="size-4" />
            </span>
          </button>
        </div>
        <div className="mt-6 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button type="submit" className="flex-1">{mode === "add" ? "حفظ المنتج" : "حفظ التعديلات"}</Button>
        </div>
      </form>
    </div>
  );
}

function SalesPage({
  sales,
  products,
  selectedSku,
  setSelectedSku,
  quantity,
  setQuantity,
  unitPrice,
  setUnitPrice,
  saleDate,
  setSaleDate,
  selectedProduct,
  selectedRemaining,
  onSubmit,
  onDeleteSale,
  onQuickSale,
  sellerFilter,
  setSellerFilter,
  onExport,
}: {
  sales: Sale[];
  products: Product[];
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  unitPrice: number;
  setUnitPrice: (price: number) => void;
  saleDate: string;
  setSaleDate: (date: string) => void;
  selectedProduct: Product;
  selectedRemaining: number;
  onSubmit: (event: FormEvent) => void;
  onDeleteSale: (id: number) => void;
  onQuickSale: () => void;
  sellerFilter: string;
  setSellerFilter: (value: string) => void;
  onExport: () => void;
}) {
  const total = quantity * unitPrice;
  const profit = quantity * (unitPrice - selectedProduct.cost);
  const priceChanged = unitPrice !== selectedProduct.price;

  const filteredSales = useMemo(() => {
    if (sellerFilter === "all") return sales;
    if (sellerFilter === "unknown") return sales.filter((sale) => !sale.soldBy);
    return sales.filter((sale) => sale.soldBy === sellerFilter);
  }, [sales, sellerFilter]);

  const sellerStats = useMemo(() => {
    const revenue = filteredSales.reduce((sum, sale) => {
      const product = products.find((item) => item.sku === sale.sku);
      return sum + salePrice(sale, product) * sale.quantity;
    }, 0);
    const net = filteredSales.reduce((sum, sale) => {
      const product = products.find((item) => item.sku === sale.sku);
      return sum + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
    }, 0);
    const qty = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    return { revenue, net, qty, count: filteredSales.length };
  }, [filteredSales, products]);

  const hasUnknown = sales.some((sale) => !sale.soldBy);

  return (
    <>
      <PageIntro
        eyebrow="نقطة البيع"
        title="المبيعات"
        description="سجّل البيع، صفّ حسب البائع، وصدّر التقرير إلى Excel."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button className="w-full sm:w-auto" variant="secondary" onClick={onExport}>
              <Icon name="receipt" className="size-4" /> تصدير Excel
            </Button>
            <Button className="w-full sm:w-auto" onClick={onQuickSale}>
              <Icon name="plus" className="size-4" /> بيع سريع
            </Button>
          </div>
        }
      />

      <section className="mb-4 rounded-2xl border border-coral-border bg-white p-4 md:mb-5 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">تقرير حسب البائع</h2>
            <p className="mt-1 text-xs text-slate-500">اعرف مبيعات كل مستخدم ثم صدّرها</p>
          </div>
          <label className="w-full md:w-72">
            <FieldLabel>تصفية حسب البائع</FieldLabel>
            <select
              className={inputClass}
              value={sellerFilter}
              onChange={(event) => setSellerFilter(event.target.value)}
            >
              <option value="all">كل البائعين</option>
              {accounts.map((account) => (
                <option key={account.username} value={account.username}>
                  {account.displayName} ({account.username})
                </option>
              ))}
              {hasUnknown && <option value="unknown">غير محدد (قديمة)</option>}
            </select>
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">العمليات</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">{sellerStats.count}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">القطع</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">{sellerStats.qty}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">المبيعات</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-navy">{money(sellerStats.revenue)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">صافي الربح</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">{money(sellerStats.net)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] md:gap-5">
        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy"><Icon name="receipt" /></span>
            <div><h2 className="font-bold text-slate-900">عملية بيع جديدة</h2><p className="text-xs text-slate-500">أو استخدم زر + بالأسفل</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
            <label>
              <FieldLabel>التاريخ</FieldLabel>
              <input type="date" className={inputClass} value={saleDate} onChange={(event) => setSaleDate(event.target.value)} required />
            </label>
            <label>
              <FieldLabel>اسم المادة</FieldLabel>
              <select className={inputClass} value={selectedSku} onChange={(event) => setSelectedSku(event.target.value)}>
                {products.map((product) => (
                  <option key={product.sku} value={product.sku}>{product.nameAr}</option>
                ))}
              </select>
            </label>
            <div>
              <FieldLabel>الكمية المباعة</FieldLabel>
              <Stepper value={quantity} min={1} max={Math.max(1, selectedRemaining)} onChange={setQuantity} />
              <span className="mt-2 block text-xs text-slate-400">متوفر: {selectedRemaining} قطعة</span>
            </div>
            <label>
              <FieldLabel>سعر القطعة</FieldLabel>
              <input type="number" min="0" step="0.01" className={inputClass} value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} required />
              <span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span>الافتراضي: {money(selectedProduct.price)}</span>
                {priceChanged && (
                  <button type="button" className="font-bold text-navy" onClick={() => setUnitPrice(selectedProduct.price)}>استعادة</button>
                )}
              </span>
            </label>
          </div>
          <div className="my-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">الإيراد</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{money(total)}</p>
            </div>
            <div className="border-r border-slate-200 pr-4">
              <p className="text-xs font-semibold text-slate-500">الربح</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{money(profit)}</p>
            </div>
          </div>
          <div className="mb-4">
            <ChangeCalculator total={total} />
          </div>
          <Button className="w-full min-h-12" type="submit" disabled={selectedRemaining < 1 || quantity > selectedRemaining || unitPrice < 0}>
            <Icon name="plus" className="size-4" /> تأكيد البيع
          </Button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 md:px-6 md:py-5">
            <div>
              <h2 className="font-bold text-slate-900">سجل العمليات</h2>
              <p className="mt-1 text-xs text-slate-500">
                {sellerFilter === "all"
                  ? "كل البائعين"
                  : sellerFilter === "unknown"
                    ? "غير محدد"
                    : accounts.find((account) => account.username === sellerFilter)?.displayName || sellerFilter}
                {" · "}
                {filteredSales.length} عملية
              </p>
            </div>
            <Button variant="ghost" className="min-h-10 px-2" onClick={onExport}>Excel</Button>
          </div>
          <SalesList sales={filteredSales} products={products} onDelete={onDeleteSale} />
        </div>
      </div>
    </>
  );
}

function ChangeCalculator({ total }: { total: number }) {
  const [paid, setPaid] = useState("");
  const [open, setOpen] = useState(false);
  const paidAmount = Number(paid);
  const hasPaid = paid.trim() !== "" && !Number.isNaN(paidAmount);
  const change = hasPaid ? paidAmount - total : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-coral-border bg-brand/50 px-3.5 py-3 text-right"
      >
        <span className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-navy text-white">
            <Icon name="cash" className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">حاسبة الباقي</span>
            <span className="block text-[11px] text-slate-500">اختياري — اضغط للحساب</span>
          </span>
        </span>
        <Icon name="chevron" className="size-4 text-slate-400" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-coral-border bg-brand/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-navy text-white">
            <Icon name="cash" className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">حاسبة الباقي</p>
            <p className="text-[11px] text-slate-500">أدخل ما دفعه الزبون</p>
          </div>
        </div>
        <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setOpen(false)}>
          إخفاء
        </button>
      </div>
      <label className="block">
        <FieldLabel>المبلغ المستلم</FieldLabel>
        <input
          type="text"
          inputMode="decimal"
          className={inputClass}
          placeholder="مثال: 500"
          value={paid}
          onChange={(event) => setPaid(event.target.value.replace(/[^\d.]/g, ""))}
        />
      </label>
      {hasPaid && (
        <div className={`mt-3 rounded-xl px-3.5 py-3 ${change !== null && change >= 0 ? "bg-emerald-100" : "bg-coral-pale"}`}>
          <p className="text-xs font-semibold text-slate-600">
            {change !== null && change >= 0 ? "الباقي للزبون" : "المبلغ أقل من الإجمالي"}
          </p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${change !== null && change >= 0 ? "text-emerald-700" : "text-coral-dark"}`}>
            {money(Math.abs(change || 0))}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            الإجمالي {money(total)} · المستلم {money(paidAmount)}
          </p>
        </div>
      )}
    </div>
  );
}

function QuickSaleSheet({
  products,
  soldBySku,
  initialSku,
  onClose,
  onCheckout,
}: {
  products: Product[];
  soldBySku: Record<string, number>;
  initialSku?: string;
  onClose: () => void;
  onCheckout: (lines: CartLine[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [draftTotals, setDraftTotals] = useState<Record<string, string>>({});
  const [draftCartTotal, setDraftCartTotal] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>(() => {
    const product = products.find((item) => item.sku === initialSku) || products.find((item) => item.quickSale) || products[0];
    if (!product) return [];
    const remaining = product.initialStock - (soldBySku[product.sku] || 0);
    if (remaining < 1) return [];
    return [{ sku: product.sku, quantity: 1, unitPrice: product.price }];
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter((product) =>
          [product.nameAr, product.category].join(" ").toLowerCase().includes(q),
        )
      : products.filter((product) => product.quickSale);
    return [...list].sort((a, b) => Number(b.quickSale) - Number(a.quickSale));
  }, [products, query]);

  const cartQtyBySku = useMemo(
    () =>
      cart.reduce<Record<string, number>>((acc, line) => {
        acc[line.sku] = (acc[line.sku] || 0) + line.quantity;
        return acc;
      }, {}),
    [cart],
  );

  const total = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const addToCart = (sku: string) => {
    const product = products.find((item) => item.sku === sku);
    if (!product) return;
    const remaining = product.initialStock - (soldBySku[sku] || 0);
    const inCart = cartQtyBySku[sku] || 0;
    if (inCart >= remaining) return;

    setCart((current) => {
      const existing = current.find((line) => line.sku === sku);
      if (existing) {
        return current.map((line) =>
          line.sku === sku ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { sku, quantity: 1, unitPrice: product.price }];
    });
  };

  const updateLineQty = (sku: string, quantity: number) => {
    const product = products.find((item) => item.sku === sku);
    if (!product) return;
    const max = product.initialStock - (soldBySku[sku] || 0);
    const nextQty = Math.min(max, Math.max(0, quantity));
    setCart((current) => {
      if (nextQty < 1) return current.filter((line) => line.sku !== sku);
      return current.map((line) => (line.sku === sku ? { ...line, quantity: nextQty } : line));
    });
    setDraftTotals((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftCartTotal(null);
  };

  const updateLinePrice = (sku: string, unitPrice: number) => {
    setCart((current) =>
      current.map((line) => (line.sku === sku ? { ...line, unitPrice: Math.max(0, unitPrice) } : line)),
    );
    setDraftPrices((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftTotals((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftCartTotal(null);
  };

  const updateLineTotal = (sku: string, lineTotal: number) => {
    setCart((current) =>
      current.map((line) => {
        if (line.sku !== sku) return line;
        const qty = Math.max(1, line.quantity);
        return { ...line, unitPrice: Math.max(0, Number(lineTotal) / qty) };
      }),
    );
    setDraftPrices((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftTotals((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftCartTotal(null);
  };

  const updateCartTotal = (nextTotal: number) => {
    setCart((current) => {
      if (!current.length) return current;
      const currentTotal = current.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      if (currentTotal <= 0) {
        const first = current[0];
        return current.map((line, index) =>
          index === 0
            ? { ...line, unitPrice: Math.max(0, nextTotal) / Math.max(1, first.quantity) }
            : line,
        );
      }
      const factor = Math.max(0, nextTotal) / currentTotal;
      return current.map((line) => ({
        ...line,
        unitPrice: Math.max(0, line.unitPrice * factor),
      }));
    });
    setDraftPrices({});
    setDraftTotals({});
    setDraftCartTotal(null);
  };

  const removeLine = (sku: string) => {
    setCart((current) => current.filter((line) => line.sku !== sku));
    setDraftPrices((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftTotals((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftCartTotal(null);
  };

  const parseMoneyInput = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    if (cleaned === "" || cleaned === ".") return 0;
    const next = Number(cleaned);
    return Number.isFinite(next) ? Math.max(0, next) : 0;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden bg-slate-950/50 backdrop-blur-sm">
      <button className="absolute inset-0" onClick={onClose} aria-label="إغلاق" />
      <div className="sheet-enter relative z-10 flex h-[min(94dvh,100%)] max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl safe-bottom">
        <div className="shrink-0">
          <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-navy sm:size-11">
                <Icon name="cart" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">بيع سريع</h2>
                <p className="truncate text-[11px] text-slate-500 sm:text-xs">أضف للسلة ثم احسب الباقي</p>
              </div>
            </div>
            <button className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 sm:size-11" onClick={onClose} aria-label="إغلاق">
              <Icon name="close" />
            </button>
          </div>

          <div className="px-3 sm:px-4">
            <div className="relative">
              <Icon name="search" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-10 text-base outline-none focus:border-navy focus:bg-white focus:ring-4 focus:ring-[#fddfe0]"
                placeholder="ابحث عن منتج لإضافته..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-2.5 min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-3 sm:mt-3 sm:space-y-4 sm:px-4">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-bold text-slate-500">اضغط منتجاً لإضافته للسلة</p>
              {itemCount > 0 && (
                <span className="shrink-0 rounded-full bg-navy px-2.5 py-1 text-[11px] font-bold text-white">
                  السلة · {itemCount}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {filtered.length ? filtered.map((product) => {
                const stockLeft = product.initialStock - (soldBySku[product.sku] || 0);
                const inCart = cartQtyBySku[product.sku] || 0;
                const selected = inCart > 0;
                const canAdd = inCart < stockLeft;
                return (
                  <button
                    key={product.sku}
                    type="button"
                    disabled={!canAdd}
                    onClick={() => addToCart(product.sku)}
                    aria-pressed={selected}
                    className={`flex w-full min-w-0 items-center gap-3 rounded-2xl border p-3.5 text-right transition active:scale-[0.99] disabled:opacity-40 ${
                      selected
                        ? "border-navy bg-soft-blue ring-2 ring-navy/20 shadow-sm shadow-navy/10"
                        : "border-slate-200 bg-white hover:border-navy/30 hover:bg-brand/30"
                    }`}
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${selected ? "bg-navy text-white" : "bg-brand text-navy"}`}>
                      <Icon name={selected ? "check" : "plus"} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="block min-w-0 truncate text-sm font-bold text-slate-900">{product.nameAr}</span>
                        {selected && (
                          <span className="shrink-0 rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">
                            مختار ×{inCart}
                          </span>
                        )}
                        {!selected && product.quickSale && (
                          <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-navy">سريع</span>
                        )}
                      </span>
                      <span className={`block truncate text-xs ${selected ? "font-semibold text-navy" : "text-slate-500"}`}>
                        متبقي {stockLeft}{selected ? ` · في السلة ${inCart}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-navy">{money(product.price)}</span>
                  </button>
                );
              }) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    {query.trim() ? "لا نتائج لهذا البحث" : "لا توجد منتجات مفعّلة للبيع السريع"}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="cart" className="size-4 text-navy" />
                <h3 className="text-sm font-bold text-slate-900">سلة البيع</h3>
              </div>
              {itemCount > 0 && (
                <span className="text-[11px] font-semibold text-slate-500">{cart.length} صنف</span>
              )}
            </div>
            {cart.length ? (
              <div className="space-y-3">
                {cart.map((line) => {
                  const product = products.find((item) => item.sku === line.sku);
                  if (!product) return null;
                  const max = product.initialStock - (soldBySku[line.sku] || 0);
                  const lineTotal = line.quantity * line.unitPrice;
                  return (
                    <div key={line.sku} className="min-w-0 rounded-2xl border border-navy/25 bg-soft-blue p-3 ring-1 ring-navy/10">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{product.nameAr}</p>
                          <p className="text-[11px] text-slate-500">مختار في السلة</p>
                        </div>
                        <button
                          type="button"
                          className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500"
                          onClick={() => removeLine(line.sku)}
                          aria-label="حذف من السلة"
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </div>
                      <div className="mb-2">
                        <p className="mb-1 text-[11px] font-bold text-slate-500">الكمية</p>
                        <Stepper
                          value={line.quantity}
                          min={1}
                          max={Math.max(1, max)}
                          onChange={(value) => updateLineQty(line.sku, value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="min-w-0 block">
                          <span className="mb-1 block text-[11px] font-bold text-slate-500">سعر القطعة</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`${inputClass} min-h-11 px-2 py-2 text-center text-base font-bold`}
                            value={draftPrices[line.sku] ?? String(Math.round(line.unitPrice) || 0)}
                            onFocus={() =>
                              setDraftPrices((current) => ({
                                ...current,
                                [line.sku]: String(Math.round(line.unitPrice) || 0),
                              }))
                            }
                            onChange={(event) => {
                              const raw = event.target.value.replace(/[^\d.]/g, "");
                              setDraftPrices((current) => ({ ...current, [line.sku]: raw }));
                            }}
                            onBlur={(event) => {
                              updateLinePrice(line.sku, parseMoneyInput(event.target.value));
                            }}
                            aria-label="سعر القطعة"
                          />
                        </label>
                        <label className="min-w-0 block">
                          <span className="mb-1 block text-[11px] font-bold text-navy">السعر النهائي</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`${inputClass} min-h-11 border-navy/40 bg-white px-2 py-2 text-center text-base font-bold text-navy ring-1 ring-navy/15`}
                            value={draftTotals[line.sku] ?? String(Math.round(lineTotal) || 0)}
                            onFocus={() =>
                              setDraftTotals((current) => ({
                                ...current,
                                [line.sku]: String(Math.round(lineTotal) || 0),
                              }))
                            }
                            onChange={(event) => {
                              const raw = event.target.value.replace(/[^\d.]/g, "");
                              setDraftTotals((current) => ({ ...current, [line.sku]: raw }));
                            }}
                            onBlur={(event) => {
                              updateLineTotal(line.sku, parseMoneyInput(event.target.value));
                            }}
                            aria-label="السعر النهائي للسطر"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">السلة فارغة — اضغط منتجاً لإضافته</p>
            )}
          </section>

          {cart.length > 0 && <ChangeCalculator total={total} />}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-3 pb-3 pt-2.5 sm:px-4 sm:py-3">
          <div className="mb-2 flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[11px] font-bold text-slate-500">إجمالي الفاتورة</span>
              <input
                type="text"
                inputMode="decimal"
                className={`${inputClass} min-h-11 px-2 py-2 text-center text-base font-bold text-navy sm:text-lg`}
                value={draftCartTotal ?? String(Math.round(total) || 0)}
                onFocus={() => setDraftCartTotal(String(Math.round(total) || 0))}
                onChange={(event) => setDraftCartTotal(event.target.value.replace(/[^\d.]/g, ""))}
                onBlur={(event) => updateCartTotal(parseMoneyInput(event.target.value))}
                aria-label="إجمالي الفاتورة"
              />
            </label>
            <p className="mb-2.5 shrink-0 text-[11px] tabular-nums text-slate-500">
              {itemCount} قطعة
            </p>
          </div>
          <Button
            className="w-full min-h-11 text-sm sm:min-h-12 sm:text-base"
            onClick={() => onCheckout(cart)}
            disabled={!cart.length}
          >
            <Icon name="check" className="size-5" /> تأكيد البيع · {money(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmIcon = "trash",
  danger = true,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmIcon?: IconName;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm md:items-center md:p-4">
      <button className="absolute inset-0" onClick={onCancel} aria-label="إغلاق" />
      <div className="sheet-enter relative z-10 w-full max-w-md rounded-t-3xl border border-coral-border bg-white p-5 shadow-2xl safe-bottom md:rounded-3xl md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-coral-soft text-coral-dark">
            <Icon name="warning" className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="min-h-12" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={`min-h-12 ${danger ? "bg-coral-dark hover:bg-[#744650]" : ""}`}
            onClick={onConfirm}
          >
            <Icon name={confirmIcon} className="size-4" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SalesList({ sales, products, onDelete }: { sales: Sale[]; products: Product[]; onDelete?: (id: number) => void }) {
  if (!sales.length) {
    return <p className="px-5 py-10 text-center text-sm text-slate-500">لا توجد عمليات بيع بعد.</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {sales.map((sale) => {
        const product = products.find((item) => item.sku === sale.sku);
        if (!product) return null;
        const price = salePrice(sale, product);
        return (
          <div key={sale.id} className="flex items-center gap-2.5 px-3 py-3.5 md:gap-3 md:px-6 md:py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-navy"><Icon name="receipt" className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{product.nameAr}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {shortDate(sale.date)} · ×{sale.quantity}
                {" · "}
                {sale.soldByName || sale.soldBy || "غير محدد"}
              </p>
            </div>
            <div className="shrink-0 text-left">
              <p className="text-sm font-bold text-slate-900">{money(price * sale.quantity)}</p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-600">+{money((price - saleCost(sale, product)) * sale.quantity)}</p>
            </div>
            {onDelete && (
              <button
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 active:bg-coral-soft active:text-coral-dark"
                onClick={() => onDelete(sale.id)}
                aria-label="حذف عملية البيع"
                title="حذف"
              >
                <Icon name="trash" className="size-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReportsPage({
  month,
  setMonth,
  sales,
  expenses,
  products,
  defaultUsdRate,
  onExport,
}: {
  month: string;
  setMonth: (month: string) => void;
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  defaultUsdRate: number;
  onExport: (usdRate?: number) => void;
}) {
  const [rateInput, setRateInput] = useState(defaultUsdRate ? String(defaultUsdRate) : "");
  const [usdView, setUsdView] = useState<number | null>(null);
  const fmt = (amount: number) => (usdView ? usd(amount / usdView) : money(amount));
  const parsedRate = Number(rateInput);

  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    sales.forEach((sale) => {
      const key = monthKey(sale.date);
      if (key.length === 7) keys.add(key);
    });
    expenses.forEach((expense) => {
      const key = monthKey(expense.dueDate);
      if (key.length === 7) keys.add(key);
    });
    keys.add(currentMonthKey());
    keys.add(month);
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [sales, expenses, month]);

  const monthSales = useMemo(
    () => sales.filter((sale) => monthKey(sale.date) === month),
    [sales, month],
  );
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => monthKey(expense.dueDate) === month),
    [expenses, month],
  );

  const revenue = monthSales.reduce((sum, sale) => {
    const product = products.find((item) => item.sku === sale.sku);
    return sum + salePrice(sale, product) * sale.quantity;
  }, 0);
  const grossProfit = monthSales.reduce((sum, sale) => {
    const product = products.find((item) => item.sku === sale.sku);
    return sum + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
  }, 0);
  const expenseTotal = monthExpenses
    .filter((expense) => !isStockPurchase(expense))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const stockTotal = monthExpenses.filter(isStockPurchase).reduce((sum, expense) => sum + expense.amount, 0);
  const rentTotal = monthExpenses.filter(isRentExpense).reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = grossProfit - expenseTotal;
  const pieces = monthSales.reduce((sum, sale) => sum + sale.quantity, 0);

  const sellerRanking = useMemo(() => {
    return accounts
      .map((account) => {
        const userSales = monthSales.filter((sale) => sale.soldBy === account.username);
        const userRevenue = userSales.reduce((sum, sale) => {
          const product = products.find((item) => item.sku === sale.sku);
          return sum + salePrice(sale, product) * sale.quantity;
        }, 0);
        const userProfit = userSales.reduce((sum, sale) => {
          const product = products.find((item) => item.sku === sale.sku);
          return sum + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
        }, 0);
        const qty = userSales.reduce((sum, sale) => sum + sale.quantity, 0);
        return {
          username: account.username,
          displayName: account.displayName,
          shortName: account.shortName,
          count: userSales.length,
          qty,
          revenue: userRevenue,
          profit: userProfit,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [monthSales, products]);

  const topSeller = sellerRanking.find((row) => row.revenue > 0) || sellerRanking[0];

  const topProducts = useMemo(() => {
    const map = new Map<string, { sku: string; nameAr: string; category: string; qty: number; revenue: number; profit: number }>();
    for (const sale of monthSales) {
      const product = products.find((item) => item.sku === sale.sku);
      const price = salePrice(sale, product);
      const current = map.get(sale.sku) || {
        sku: sale.sku,
        nameAr: product?.nameAr || sale.sku,
        category: product?.category || "أخرى",
        qty: 0,
        revenue: 0,
        profit: 0,
      };
      current.qty += sale.quantity;
      current.revenue += price * sale.quantity;
      current.profit += (price - saleCost(sale, product)) * sale.quantity;
      map.set(sale.sku, current);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 8);
  }, [monthSales, products]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of monthExpenses) {
      const label = expense.categoryAr || expense.category;
      map.set(label, (map.get(label) || 0) + expense.amount);
    }
    return [...map.entries()]
      .map(([label, amount]) => ({
        label,
        amount,
        isRent: /إيجار|ايجار|rent/i.test(label),
        isStock: isStockPurchase({ category: label, categoryAr: label }),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  const maxProductQty = topProducts[0]?.qty || 1;
  const maxExpense = expenseBreakdown[0]?.amount || 1;
  const maxSellerRevenue = Math.max(...sellerRanking.map((row) => row.revenue), 1);

  return (
    <>
      <PageIntro
        eyebrow="التحليل الشهري"
        title="التقارير"
        description="مبيعات الشهر، المصاريف، الإيجار، الأكثر مبيعاً، ومن باع أكثر."
        action={
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => onExport(usdView ?? undefined)}>
            <Icon name="receipt" className="size-4" /> {usdView ? "تصدير التقرير بالدولار" : "تصدير تقرير الشهر"}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-coral-border bg-white p-4 md:mb-5 md:flex-row md:items-end md:justify-between md:p-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">{formatMonthLabel(month)}</h2>
          <p className="mt-1 text-xs text-slate-500">اختر الشهر لعرض الملخص الكامل</p>
        </div>
        <label className="w-full md:w-72">
          <FieldLabel>الشهر</FieldLabel>
          <select className={inputClass} value={month} onChange={(event) => setMonth(event.target.value)}>
            {availableMonths.map((item) => (
              <option key={item} value={item}>{formatMonthLabel(item)}</option>
            ))}
          </select>
        </label>
      </div>

      <form
        className={`mb-4 flex flex-col gap-3 rounded-2xl border p-4 md:mb-5 md:flex-row md:items-end md:justify-between md:p-5 ${usdView ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"}`}
        onSubmit={(event) => {
          event.preventDefault();
          if (parsedRate > 0) setUsdView(parsedRate);
        }}
      >
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">عرض التقرير بالدولار</h2>
          <p className="mt-1 text-xs text-slate-500">
            {usdView
              ? `كل المبالغ محوّلة بسعر صرف ${usdView} ليرة للدولار.`
              : "أدخل سعر الصرف لتحويل كل مبالغ التقرير إلى الدولار."}
          </p>
        </div>
        <div className="flex w-full items-end gap-2 md:w-auto">
          <label className="min-w-0 flex-1 md:w-44 md:flex-none">
            <FieldLabel>سعر الصرف</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              inputMode="decimal"
              className={inputClass}
              value={rateInput}
              onChange={(event) => setRateInput(event.target.value)}
              placeholder="مثال: 13000"
            />
          </label>
          <Button type="submit" className="min-h-12" disabled={!(parsedRate > 0) || parsedRate === usdView}>
            {usdView ? "تحديث" : "عرض بالدولار"}
          </Button>
          {usdView && (
            <Button type="button" variant="secondary" className="min-h-12" onClick={() => setUsdView(null)}>
              <Icon name="close" className="size-4" /> العودة
            </Button>
          )}
        </div>
      </form>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 md:gap-4">
        {[
          { label: "مبيعات الشهر", value: fmt(revenue), hint: `${pieces} قطعة`, tone: "navy" },
          { label: "أرباح البضاعة", value: fmt(grossProfit), hint: `${monthSales.length} عملية`, tone: "blue" },
          { label: "المصاريف", value: fmt(expenseTotal), hint: stockTotal > 0 ? `إيجار ${fmt(rentTotal)} · بضاعة ${fmt(stockTotal)} خارج الربح` : `إيجار ${fmt(rentTotal)}`, tone: "orange" },
          { label: "صافي الربح", value: fmt(netProfit), hint: netProfit >= 0 ? "إيجابي" : "سالب", tone: "green" },
        ].map((card) => (
          <div key={card.label} className={`min-w-0 rounded-2xl border p-3 md:p-4 ${card.tone === "green" ? "border-emerald-200 bg-emerald-50/80" : card.tone === "orange" ? "border-coral-border bg-coral-soft/50" : "border-slate-200 bg-white"}`}>
            <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{card.label}</p>
            <p className="mt-2 break-words text-base font-bold tabular-nums text-slate-950 sm:text-lg md:text-xl">{card.value}</p>
            <p className="mt-1 truncate text-[11px] text-slate-400">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2 md:mt-5">
        <div className="rounded-2xl border border-navy/15 bg-navy p-4 text-white md:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
              <Icon name="user" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold text-brand">الأكثر مبيعاً هذا الشهر</p>
              <h3 className="mt-1 text-xl font-bold">{topSeller?.displayName || "لا بيانات"}</h3>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="min-w-0 rounded-xl bg-white/10 p-2 sm:p-3">
              <p className="text-[10px] text-brand">المبيعات</p>
              <p className="mt-1 truncate text-xs font-bold tabular-nums sm:text-sm">{fmt(topSeller?.revenue || 0)}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-white/10 p-2 sm:p-3">
              <p className="text-[10px] text-brand">القطع</p>
              <p className="mt-1 truncate text-xs font-bold tabular-nums sm:text-sm">{topSeller?.qty || 0}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-white/10 p-2 sm:p-3">
              <p className="text-[10px] text-brand">الربح</p>
              <p className="mt-1 truncate text-xs font-bold tabular-nums sm:text-sm">{fmt(topSeller?.profit || 0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-coral-border bg-brand/40 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-navy text-white">
              <Icon name="wallet" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">إيجار المحل هذا الشهر</p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">{fmt(rentTotal)}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {rentTotal > 0 ? `${((rentTotal / Math.max(expenseTotal, 1)) * 100).toFixed(0)}% من المصاريف` : "لا يوجد بند إيجار مسجّل"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 md:mt-5 md:p-5">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">الأكثر مبيعاً من المنتجات</h2>
            <p className="mt-1 text-xs text-slate-500">أعلى المنتجات حسب الكمية في هذا الشهر</p>
          </div>
          {topProducts[0] && (
            <span className="max-w-[45%] shrink-0 truncate rounded-full bg-navy px-2.5 py-1.5 text-[10px] font-bold text-white sm:max-w-none sm:px-3 sm:text-[11px]">
              الأول: {topProducts[0].nameAr}
            </span>
          )}
        </div>
        {topProducts.length ? (
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.sku} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${index === 0 ? "bg-navy text-white" : "bg-white text-slate-600"}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{product.nameAr}</p>
                    <p className="text-[11px] text-slate-500">{product.category} · {product.qty} قطعة</p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-sm font-bold tabular-nums text-navy">{fmt(product.revenue)}</p>
                    <p className="text-[11px] font-semibold text-emerald-600">+{fmt(product.profit)}</p>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-navy"
                    style={{ width: `${Math.max(8, (product.qty / maxProductQty) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">لا توجد مبيعات في هذا الشهر بعد.</p>
        )}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2 md:mt-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <h2 className="text-base font-bold text-slate-900">ترتيب البائعين</h2>
          <p className="mt-1 text-xs text-slate-500">من باع أكثر خلال الشهر</p>
          <div className="mt-4 space-y-3">
            {sellerRanking.map((seller, index) => (
              <div key={seller.username} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl text-xs font-bold ${index === 0 && seller.revenue > 0 ? "bg-navy text-white" : "bg-brand text-navy"}`}>
                    {seller.shortName}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{seller.displayName}</p>
                    <p className="text-[11px] text-slate-500">{seller.count} عملية · {seller.qty} قطعة</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-navy">{fmt(seller.revenue)}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-navy/80"
                    style={{ width: `${Math.max(seller.revenue > 0 ? 8 : 0, (seller.revenue / maxSellerRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <h2 className="text-base font-bold text-slate-900">تفصيل المصاريف</h2>
          <p className="mt-1 text-xs text-slate-500">الإيجار والرواتب وباقي البنود</p>
          {expenseBreakdown.length ? (
            <div className="mt-4 space-y-3">
              {expenseBreakdown.map((item) => (
                <div key={item.label} className={`rounded-2xl border p-3 ${item.isRent ? "border-coral-border bg-coral-soft/60" : "border-slate-100"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{item.label}</p>
                      {item.isRent && <p className="text-[11px] font-semibold text-coral-dark">إيجار</p>}
                      {item.isStock && <p className="text-[11px] font-semibold text-slate-500">لا يُخصم من صافي الربح</p>}
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{fmt(item.amount)}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${item.isRent ? "bg-coral-dark" : "bg-slate-400"}`}
                      style={{ width: `${Math.max(8, (item.amount / maxExpense) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 py-4 text-center text-sm text-slate-500">لا مصاريف مسجّلة لهذا الشهر.</p>
          )}
        </div>
      </section>
    </>
  );
}

function ExpensesPage({
  expenses,
  category,
  setCategory,
  amount,
  setAmount,
  date,
  setDate,
  editingId,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  expenses: Expense[];
  category: string;
  setCategory: (category: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  date: string;
  setDate: (date: string) => void;
  editingId: number | null;
  onSubmit: (event: FormEvent) => void;
  onEdit: (expense: Expense) => void;
  onCancelEdit: () => void;
  onDelete: (id: number) => void;
}) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const isEditing = editingId != null;
  const confirmTarget = expenses.find((item) => item.id === confirmId);
  const categories = ["إيجار المحل", "رواتب الموظفين", "الكهرباء والإنترنت", "شراء بضاعة جديدة", "مصروف آخر"];

  return (
    <>
      <PageIntro eyebrow="التكاليف" title="المصاريف" description="نظّم تكاليف التشغيل الشهرية لتظهر مباشرة ضمن حساب صافي الربح الحقيقي." />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr] md:gap-5">
        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className={`grid size-11 place-items-center rounded-xl ${isEditing ? "bg-brand text-navy" : "bg-orange-50 text-orange-700"}`}>
              <Icon name={isEditing ? "edit" : "wallet"} />
            </span>
            <div>
              <h2 className="font-bold">{isEditing ? "تعديل مصروف" : "إضافة مصروف"}</h2>
              <p className="text-xs text-slate-500">{isEditing ? "حدّث البند أو المبلغ أو التاريخ" : "تكلفة تشغيلية جديدة"}</p>
            </div>
          </div>
          <div className="space-y-4">
            <label className="block">
              <FieldLabel>بند المصروف</FieldLabel>
              <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
                {!categories.includes(category) && category ? <option value={category}>{category}</option> : null}
              </select>
            </label>
            <label className="block">
              <FieldLabel>المبلغ</FieldLabel>
              <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ل.س</span><input type="number" min="0.01" step="1" className={`${inputClass} pl-12`} placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div>
            </label>
            <label className="block">
              <FieldLabel>تاريخ الاستحقاق</FieldLabel>
              <input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} required />
            </label>
            <div className={`grid gap-2 ${isEditing ? "grid-cols-2" : ""}`}>
              {isEditing && (
                <Button type="button" variant="secondary" className="min-h-12" onClick={onCancelEdit}>
                  إلغاء
                </Button>
              )}
              <Button type="submit" className="w-full min-h-12">
                <Icon name={isEditing ? "check" : "plus"} className="size-4" />
                {isEditing ? "حفظ التعديل" : "إضافة المصروف"}
              </Button>
            </div>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 md:px-6 md:py-5">
            <div><h2 className="font-bold">المصاريف المسجلة</h2><p className="mt-1 text-xs text-slate-500">الإجمالي الشهري</p></div>
            <div className="text-left"><p className="text-xs text-slate-400">الإجمالي</p><p className="text-lg font-bold text-slate-950">{money(total)}</p></div>
          </div>
          <div className="divide-y divide-slate-100">
            {expenses.length ? expenses.map((expense) => (
              <div
                key={expense.id}
                className={`flex items-center gap-2.5 px-3 py-3.5 md:gap-3 md:px-6 md:py-4 ${editingId === expense.id ? "bg-brand/40" : ""}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon
                    name={expense.category.includes("بضاعة") ? "box" : expense.category.includes("التسويق") ? "sparkles" : expense.category.includes("الكهرباء") ? "profit" : "wallet"}
                    className="size-4"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{expense.categoryAr}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {shortDate(expense.dueDate)}
                    {isRentExpense(expense) && " · إيجار"}
                    {isStockPurchase(expense) && " · لا يُخصم من صافي الربح"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-900">{money(expense.amount)}</p>
                <button
                  type="button"
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 active:bg-brand active:text-navy"
                  onClick={() => onEdit(expense)}
                  aria-label="تعديل المصروف"
                  title="تعديل"
                >
                  <Icon name="edit" className="size-4" />
                </button>
                <button
                  type="button"
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 active:bg-coral-soft active:text-coral-dark"
                  onClick={() => setConfirmId(expense.id)}
                  aria-label="حذف المصروف"
                  title="حذف"
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </div>
            )) : (
              <p className="px-5 py-10 text-center text-sm text-slate-500">لا توجد مصاريف مسجّلة بعد. أضف أول بند من النموذج.</p>
            )}
          </div>
        </div>
      </div>
      {confirmTarget && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف المصروف «${confirmTarget.categoryAr}» بمبلغ ${money(confirmTarget.amount)}؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="نعم، احذف"
          cancelLabel="إلغاء"
          onConfirm={() => {
            onDelete(confirmTarget.id);
            setConfirmId(null);
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}

function ExchangePage({
  exchanges,
  defaultUsdRate,
  onAdd,
  onDelete,
}: {
  exchanges: Exchange[];
  defaultUsdRate: number;
  onAdd: (exchange: Omit<Exchange, "id" | "doneBy" | "doneByName">) => void;
  onDelete: (id: number) => void;
}) {
  const [direction, setDirection] = useState<Exchange["direction"]>("sypToUsd");
  const [given, setGiven] = useState("");
  const [received, setReceived] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [month, setMonth] = useState("all");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const sypToUsd = direction === "sypToUsd";
  const sypAmount = Number(sypToUsd ? given : received);
  const usdAmount = Number(sypToUsd ? received : given);
  const rate = sypAmount > 0 && usdAmount > 0 ? sypAmount / usdAmount : 0;
  const rateLabel = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

  const months = useMemo(
    () => [...new Set(exchanges.map((item) => monthKey(item.date)).filter((key) => key.length === 7))].sort((a, b) => b.localeCompare(a)),
    [exchanges],
  );
  const shown = useMemo(
    () =>
      exchanges
        .filter((item) => month === "all" || monthKey(item.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [exchanges, month],
  );
  const bought = shown.filter((item) => item.direction === "sypToUsd");
  const sold = shown.filter((item) => item.direction === "usdToSyp");
  const sum = (list: Exchange[], key: "sypAmount" | "usdAmount") => list.reduce((total, item) => total + item[key], 0);
  const boughtUsd = sum(bought, "usdAmount");
  const boughtSyp = sum(bought, "sypAmount");
  const soldUsd = sum(sold, "usdAmount");
  const soldSyp = sum(sold, "sypAmount");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!(sypAmount > 0) || !(usdAmount > 0) || !date) return;
    onAdd({ date, direction, sypAmount, usdAmount, note: note.trim() || undefined });
    setGiven("");
    setReceived("");
    setNote("");
  };

  const suggest = () => {
    if (!(defaultUsdRate > 0) || !(Number(given) > 0)) return;
    const value = sypToUsd ? Number(given) / defaultUsdRate : Number(given) * defaultUsdRate;
    setReceived(String(sypToUsd ? Math.round(value * 100) / 100 : Math.round(value)));
  };

  const segment = (active: boolean) =>
    `min-h-11 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-navy"}`;
  const currency = (isUsd: boolean) => (isUsd ? "$" : "ل.س");
  const confirmTarget = exchanges.find((item) => item.id === confirmId);

  return (
    <>
      <PageIntro eyebrow="الصرافة" title="تحويل العملة" description="سجّل تحويل المبالغ بين الليرة والدولار. هذه العمليات لا تدخل في التقارير أو الأرباح." />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr] md:gap-5">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy"><Icon name="exchange" /></span>
            <div><h2 className="font-bold">عملية صرافة جديدة</h2><p className="text-xs text-slate-500">ما دفعته وما استلمته</p></div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={segment(sypToUsd)} onClick={() => setDirection("sypToUsd")}>ليرة ← دولار</button>
              <button type="button" className={segment(!sypToUsd)} onClick={() => setDirection("usdToSyp")}>دولار ← ليرة</button>
            </div>
            <label className="block">
              <FieldLabel>المبلغ المدفوع ({sypToUsd ? "ليرة" : "دولار"})</FieldLabel>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency(!sypToUsd)}</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" className={`${inputClass} pl-12`} placeholder="0" value={given} onChange={(event) => setGiven(event.target.value)} required />
              </div>
            </label>
            <label className="block">
              <FieldLabel>المبلغ المستلم ({sypToUsd ? "دولار" : "ليرة"})</FieldLabel>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency(sypToUsd)}</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" className={`${inputClass} pl-12`} placeholder="0" value={received} onChange={(event) => setReceived(event.target.value)} required />
              </div>
              {defaultUsdRate > 0 && Number(given) > 0 && (
                <button type="button" className="mt-1.5 text-xs font-bold text-navy" onClick={suggest}>
                  حساب حسب سعر الصرف في الإعدادات ({rateLabel(defaultUsdRate)})
                </button>
              )}
            </label>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3 text-sm">
              <span className="text-slate-500">سعر الصرف الفعلي</span>
              <span className="font-bold tabular-nums text-slate-900" dir="ltr">{rate ? `${rateLabel(rate)} ل.س / $` : "—"}</span>
            </div>
            <label className="block">
              <FieldLabel>التاريخ</FieldLabel>
              <input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} required />
            </label>
            <label className="block">
              <FieldLabel>ملاحظة</FieldLabel>
              <input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder="اختياري" maxLength={255} />
            </label>
            <Button type="submit" className="w-full min-h-12" disabled={!rate}><Icon name="plus" className="size-4" /> تسجيل العملية</Button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
              <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">دولار مشترى</p>
              <p className="mt-2 text-base font-bold tabular-nums text-slate-950 sm:text-lg" dir="ltr">{usd(boughtUsd)}</p>
              <p className="mt-1 truncate text-[11px] text-slate-400">مقابل {money(boughtSyp)}{boughtUsd > 0 && ` · متوسط ${rateLabel(boughtSyp / boughtUsd)}`}</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
              <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">دولار مباع</p>
              <p className="mt-2 text-base font-bold tabular-nums text-slate-950 sm:text-lg" dir="ltr">{usd(soldUsd)}</p>
              <p className="mt-1 truncate text-[11px] text-slate-400">مقابل {money(soldSyp)}{soldUsd > 0 && ` · متوسط ${rateLabel(soldSyp / soldUsd)}`}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div><h2 className="font-bold">سجل الصرافة</h2><p className="mt-1 text-xs text-slate-500">{shown.length} عملية</p></div>
              <select className={`${inputClass} sm:w-48`} value={month} onChange={(event) => setMonth(event.target.value)} aria-label="الشهر">
                <option value="all">كل الأشهر</option>
                {months.map((item) => <option key={item} value={item}>{formatMonthLabel(item)}</option>)}
              </select>
            </div>
            <div className="divide-y divide-slate-100">
              {shown.length ? shown.map((item) => {
                const toUsd = item.direction === "sypToUsd";
                return (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-3.5 md:gap-4 md:px-6 md:py-4">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toUsd ? "bg-emerald-50 text-emerald-700" : "bg-brand text-navy"}`}>
                      <Icon name="exchange" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold tabular-nums text-slate-800" dir="ltr">
                        {toUsd ? `${money(item.sypAmount)} → ${usd(item.usdAmount)}` : `${usd(item.usdAmount)} → ${money(item.sypAmount)}`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {shortDate(item.date)} · {rateLabel(item.sypAmount / item.usdAmount)} ل.س/$ · {item.doneByName || item.doneBy || "غير محدد"}
                        {item.note && ` · ${item.note}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-coral-soft hover:text-coral-dark"
                      onClick={() => setConfirmId(item.id)}
                      aria-label="حذف"
                    >
                      <Icon name="trash" className="size-4" />
                    </button>
                  </div>
                );
              }) : (
                <p className="py-10 text-center text-sm text-slate-500">لا توجد عمليات صرافة بعد.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {confirmTarget && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message={`هل تريد حذف عملية الصرافة (${usd(confirmTarget.usdAmount)} / ${money(confirmTarget.sypAmount)}) بتاريخ ${shortDate(confirmTarget.date)}؟`}
          confirmLabel="نعم، احذف"
          cancelLabel="إلغاء"
          onConfirm={() => {
            onDelete(confirmTarget.id);
            setConfirmId(null);
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}

export default App;
