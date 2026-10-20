import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import ConfirmDialog from "@/components/ConfirmDialog";
import Icon from "@/components/Icon";
import Banner from "@/components/Banner";
import ProductModal from "@/components/ProductModal";
import QuickSaleSheet from "@/components/QuickSaleSheet";
import { SyncBadge, SyncSidebarCard } from "@/components/SyncStatus";
import { defaultSettings, storageKeys } from "@/config/site";
import { accounts, allCategories, initialExpenses, initialProducts, initialSales, readAuth } from "@/data/demo";
import { mobileNavItems, navItems, tabFromHash } from "@/data/nav";
import { useI18n } from "@/i18n/useI18n";
import {
  cellValue,
  costFromUsd,
  currentMonthKey,
  excelDate,
  formatMonthLabel,
  isRentExpense,
  isStockPurchase,
  money,
  monthKey,
  saleCost,
  saleCostUsd,
  salePrice,
  shortDate,
  todayISO,
  usd,
} from "@/lib/format";
import { useCloudSync, type NoticeTone, type SyncStatus } from "@/hooks/useCloudSync";
import { isCloudEnabled, setApiToken } from "@/lib/api";
import type { CloudSale, CloudStore } from "@/lib/cloudStore";
import { createRecordId } from "@/lib/ids";
import { enableNotifications, disableNotifications, useNotificationState } from "@/lib/notifications";
import { applyUpdate, useUpdateAvailable } from "@/lib/pwa";
import { enqueue, pendingCount } from "@/lib/syncOutbox";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import SalesPage from "@/pages/SalesPage";
import ExpensesPage from "@/pages/ExpensesPage";
import ExchangePage from "@/pages/ExchangePage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import type {
  AuthUser,
  CartLine,
  Exchange,
  Expense,
  Product,
  Sale,
  StoreSettings,
  Tab,
} from "@/types/store";

export default function App() {
  const { t } = useI18n();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => readAuth());
  const isAuthenticated = Boolean(authUser);
  const [activeTab, setActiveTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    if (window.location.hash.replace("#", "") !== activeTab) window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const pageTitle = isAuthenticated
      ? t(`meta.titles.${activeTab}`)
      : t("meta.titles.login");
    document.title = `${pageTitle} · ${t("meta.siteTitle")}`;
  }, [activeTab, isAuthenticated, t]);

  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(storageKeys.products);
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
    const saved = localStorage.getItem(storageKeys.sales);
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
      const saved = localStorage.getItem(storageKeys.settings);
      return saved ? { ...defaultSettings, ...(JSON.parse(saved) as StoreSettings) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [reportMonth, setReportMonth] = useState(currentMonthKey);
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeys.expenses);
      return saved ? (JSON.parse(saved) as Expense[]) : initialExpenses;
    } catch {
      return initialExpenses;
    }
  });
  const [selectedSku, setSelectedSku] = useState(initialProducts[0].sku);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(initialProducts[0].price);
  const [saleDate, setSaleDate] = useState(todayISO);
  const [notice, setNotice] = useState<{ message: string; tone: NoticeTone } | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [emptyServerPrompt, setEmptyServerPrompt] = useState(false);
  // "Not now" holds for this session; the question comes back after the next app start.
  const emptyServerDismissed = useRef(false);
  const [loginMessage, setLoginMessage] = useState("");
  const notificationState = useNotificationState();
  const updateAvailable = useUpdateAvailable();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  // Product the user chose to sell (e.g. "Sell" on a product card); a plain new sale starts with an empty cart.
  const [quickSaleSku, setQuickSaleSku] = useState<string | undefined>(undefined);
  const [productModal, setProductModal] = useState<"add" | Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; label: string } | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeys.exchanges);
      return saved ? (JSON.parse(saved) as Exchange[]) : [];
    } catch {
      return [];
    }
  });
  const [expenseCategory, setExpenseCategory] = useState("إيجار المحل");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [expenseNote, setExpenseNote] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKeys.products, JSON.stringify(products));
      localStorage.setItem(storageKeys.sales, JSON.stringify(sales));
      localStorage.setItem(storageKeys.expenses, JSON.stringify(expenses));
      localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
      localStorage.setItem(storageKeys.exchanges, JSON.stringify(exchanges));
    } catch (error) {
      console.error("Local save failed", error);
    }
  }, [products, sales, expenses, settings, exchanges]);

  const showNotice = (message: string, tone: NoticeTone = "success") => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice({ message, tone });
    noticeTimer.current = window.setTimeout(() => setNotice(null), tone === "warning" ? 6000 : 3500);
  };

  // Queued edits stay on the device and are sent after the next sign-in.
  const logout = (message = "") => {
    localStorage.removeItem(storageKeys.auth);
    sessionStorage.removeItem(storageKeys.auth);
    setApiToken(null);
    setConfirmLogout(false);
    setLoginMessage(message);
    setAuthUser(null);
  };

  const requestLogout = () => {
    if (pendingCount() > 0) setConfirmLogout(true);
    else logout();
  };

  const productName = (sku: string) => products.find((item) => item.sku === sku)?.nameAr || sku;

  const sync = useCloudSync({
    enabled: isAuthenticated,
    applyCloud: (cloud: CloudStore) => {
      setProducts(cloud.products);
      setSales(cloud.sales);
      setExpenses(cloud.expenses);
      if (cloud.settings.usdRate > 0) setSettings(cloud.settings);
      setExchanges(cloud.exchanges ?? []);
      setSelectedSku((current) =>
        cloud.products.some((item) => item.sku === current) ? current : (cloud.products[0]?.sku ?? current),
      );
    },
    onEmptyServer: () => {
      if (products.length && !emptyServerDismissed.current) setEmptyServerPrompt(true);
    },
    // Server refused a sale (usually another device sold the last pieces first): undo it here too.
    onSaleRejected: (sale: CloudSale, reason, available) => {
      setSales((current) => current.filter((item) => item.id !== sale.id));
      const name = productName(sale.sku);
      showNotice(
        reason === "stock"
          ? t("notices.saleCancelledStock", { name, available: available ?? 0 })
          : t("notices.saleRejected", { name }),
        "warning",
      );
      return name;
    },
    onAuthExpired: () => logout(t("sync.sessionExpired", { count: pendingCount() })),
    onNotice: showNotice,
  });
  const syncStatus: SyncStatus = sync.status;

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

  if (!isAuthenticated || !authUser) {
    return (
      <LoginPage
        message={loginMessage}
        onSuccess={(user) => {
          setLoginMessage("");
          setAuthUser(user);
        }}
      />
    );
  }

  const recordSale = () => {
    if (!selectedProduct || quantity < 1 || quantity > selectedRemaining || unitPrice < 0) return false;
    const sale: Sale = {
      id: createRecordId(),
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
    showNotice(t("notices.saleAdded", { qty: quantity, name: selectedProduct.nameAr }));
    setQuantity(1);
    setUnitPrice(selectedProduct.price);
    enqueue({ type: "sale.upsert", sale });
    return true;
  };

  const checkoutCart = (lines: CartLine[]) => {
    if (!lines.length) return false;

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
        showNotice(t("notices.qtyUnavailable", { name: product.nameAr }), "warning");
        return false;
      }
      newSales.push({
        id: createRecordId(),
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
      : t("notices.saleItemsCount", { count: newSales.length });
    showNotice(t("notices.saleLogged", { items: itemsLabel }));
    setQuantity(1);
    enqueue(...newSales.map((sale) => ({ type: "sale.upsert" as const, sale })));
    return true;
  };

  const addSale = (event: FormEvent) => {
    event.preventDefault();
    recordSale();
  };

  const openQuickSale = (sku?: string) => {
    const requested = sku ? products.find((item) => item.sku === sku) : undefined;
    if (requested && requested.initialStock - (soldBySku[requested.sku] || 0) < 1) {
      showNotice(t("notices.stockEmpty", { name: requested.nameAr }), "warning");
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
    setQuickSaleSku(requested?.sku);
    setQuickSaleOpen(true);
  };

  const deleteSale = (id: number) => {
    setSales((current) => current.filter((sale) => sale.id !== id));
    setConfirmDelete(null);
    showNotice(t("notices.saleDeleted"));
    enqueue({ type: "sale.delete", id });
  };

  const requestDeleteSale = (id: number) => {
    const sale = sales.find((item) => item.id === id);
    const product = products.find((item) => item.sku === sale?.sku);
    setConfirmDelete({
      id,
      label: product ? `${product.nameAr} × ${sale?.quantity || 0}` : t("notices.thisSale"),
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
    enqueue(...frozenSales.map((sale) => ({ type: "sale.upsert" as const, sale })));
  };

  const bulkUpdateProducts = (updated: Product[]) => {
    if (!updated.length) return;
    freezeLegacySales(updated);
    const updatedBySku = new Map(updated.map((item) => [item.sku, item]));
    setProducts((current) => current.map((item) => updatedBySku.get(item.sku) ?? item));
    showNotice(t("notices.pricesUpdated", { count: updated.length }));
    enqueue(...updated.map((product) => ({ type: "product.upsert" as const, product })));
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
    enqueue({ type: "settings.save", settings: { ...settings, usdRate } });
    if (repriced.length) bulkUpdateProducts(repriced);
    else showNotice(t("notices.rateSaved"));
  };

  const saveProduct = (product: Product, mode: "add" | "edit") => {
    if (mode === "add") {
      if (products.some((item) => item.sku === product.sku)) {
        showNotice(t("notices.skuExists"), "warning");
        return;
      }
      setProducts((current) => [...current, product]);
      setSelectedSku(product.sku);
      showNotice(t("notices.productAdded", { name: product.nameAr }));
    } else {
      freezeLegacySales([product]);
      setProducts((current) => current.map((item) => (item.sku === product.sku ? product : item)));
      showNotice(t("notices.productUpdated", { name: product.nameAr }));
    }
    setProductModal(null);
    enqueue({ type: "product.upsert", product });
  };

  const toggleQuickSale = (sku: string) => {
    const current = products.find((item) => item.sku === sku);
    if (!current) return;
    const next = { ...current, quickSale: !current.quickSale };
    setProducts((list) => list.map((item) => (item.sku === sku ? next : item)));
    showNotice(
      next.quickSale
        ? t("notices.quickSaleAdded", { name: next.nameAr })
        : t("notices.quickSaleRemoved", { name: next.nameAr }),
    );
    enqueue({ type: "product.upsert", product: next });
  };

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseCategory("إيجار المحل");
    setExpenseAmount("");
    setExpenseDate(todayISO());
    setExpenseNote("");
  };

  const startEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseCategory(expense.categoryAr || expense.category);
    setExpenseAmount(String(expense.amount));
    setExpenseDate(expense.dueDate);
    setExpenseNote(expense.note || "");
    setActiveTab("expenses");
  };

  const saveExpense = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!amount || amount <= 0) return;
    const note = expenseNote.trim();
    const expense: Expense = {
      id: editingExpenseId ?? createRecordId(),
      category: expenseCategory,
      categoryAr: expenseCategory,
      amount,
      dueDate: expenseDate,
      note: note || undefined,
    };
    setExpenses((current) => {
      if (editingExpenseId != null) {
        return current.map((item) => (item.id === editingExpenseId ? expense : item));
      }
      return [...current, expense];
    });
    const wasEdit = editingExpenseId != null;
    resetExpenseForm();
    showNotice(wasEdit ? t("notices.expenseUpdated") : t("notices.expenseAdded"));
    enqueue({ type: "expense.upsert", expense });
  };

  const deleteExpense = (id: number) => {
    setExpenses((current) => current.filter((item) => item.id !== id));
    if (editingExpenseId === id) resetExpenseForm();
    showNotice(t("notices.expenseDeleted"));
    enqueue({ type: "expense.delete", id });
  };

  const addExchange = (exchange: Omit<Exchange, "id" | "doneBy" | "doneByName">) => {
    const record: Exchange = {
      ...exchange,
      id: createRecordId(),
      doneBy: authUser?.username,
      doneByName: authUser?.displayName,
    };
    setExchanges((current) => [record, ...current]);
    showNotice(t("notices.exchangeSaved"));
    enqueue({ type: "exchange.upsert", exchange: record });
  };

  const deleteExchange = (id: number) => {
    setExchanges((current) => current.filter((item) => item.id !== id));
    showNotice(t("notices.exchangeDeleted"));
    enqueue({ type: "exchange.delete", id });
  };

  const goToSale = (sku: string) => {
    openQuickSale(sku);
  };

  // A fresh device still holding the built-in sample catalogue, with nothing recorded on it.
  const isDemoData =
    !sales.length &&
    !expenses.length &&
    products.length === initialProducts.length &&
    products.every((product) => initialProducts.some((item) => item.sku === product.sku));

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
      "ملاحظة": expense.note || "",
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
    showNotice(t("notices.excelDownloaded"));
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
      "ملاحظة": expense.note || "",
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
    showNotice(t("notices.reportDownloaded", { month: formatMonthLabel(month) }));
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
        const importedSales: Sale[] = saleRows.map((row) => {
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
            id: createRecordId(),
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
        const importedExpenses: Expense[] = expenseRows.map((row) => {
          const note = String(cellValue(row, ["ملاحظة", "ملاحظات"]) || "").trim();
          return {
            id: createRecordId(),
            category: String(cellValue(row, ["بند المصروف"]) || "مصروف آخر"),
            categoryAr: String(cellValue(row, ["بند المصروف"]) || "مصروف آخر"),
            amount: Number(cellValue(row, ["المبلغ", "المبلغ المدفوع"]) || 0),
            dueDate: excelDate(cellValue(row, ["تاريخ الاستحقاق", "الشهر / التاريخ"])),
            note: note || undefined,
          };
        }).filter((expense) => expense.amount > 0);

        if (!importedProducts.length) throw new Error("empty products");
        setProducts(importedProducts);
        setSales(importedSales);
        setExpenses(importedExpenses);
        setSelectedSku(importedProducts[0].sku);
        // The workbook has no exchange sheet: keep the current log instead of wiping the server's.
        enqueue({
          type: "store.replace",
          store: { products: importedProducts, sales: importedSales, expenses: importedExpenses, settings, exchanges },
        });
        showNotice(isCloudEnabled ? t("notices.importCloudOk") : t("notices.importLocalOk"));
      } catch {
        showNotice(t("notices.importFailed"), "warning");
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
              <span className="block text-lg font-bold tracking-tight">{t("brand.name")}</span>
              <span className="block text-xs text-brand">{t("brand.tagline")}</span>
            </span>
          </button>
        </div>

        <nav className="mt-10 space-y-1.5">
          <p className="mb-3 px-4 text-[11px] font-bold tracking-[0.16em] text-brand">{t("common.workspace")}</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right transition ${activeTab === item.id ? "bg-white text-navy shadow-lg shadow-black/10" : "text-brand hover:bg-white/10 hover:text-white"}`}
            >
              <Icon name={item.icon} className="size-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t(item.labelKey)}</span>
                <span className={`block text-xs ${activeTab === item.id ? "text-slate-500" : "text-brand/80"}`} dir="rtl">{t(item.hintKey)}</span>
              </span>
            </button>
          ))}
        </nav>

        <SyncSidebarCard
          status={syncStatus}
          pending={sync.pending}
          lastSyncedAt={sync.lastSyncedAt}
          cloudEnabled={isCloudEnabled}
          onSyncNow={sync.syncNow}
        />
      </aside>

      <div className="lg:pr-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white lg:bg-white/95 lg:backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-2 px-4 md:h-20 md:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo className="size-10 shrink-0 rounded-xl object-cover lg:hidden" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900 md:text-lg">{t(pageInfo.labelKey)}</p>
                <p className="hidden text-xs text-slate-500 md:block" dir="rtl">{t(pageInfo.hintKey)}</p>
              </div>
              <SyncBadge status={syncStatus} pending={sync.pending} onSyncNow={sync.syncNow} />
            </div>
            <div className="flex items-center gap-1.5 md:gap-3">
              <button
                className={`grid size-11 place-items-center rounded-xl border lg:hidden ${activeTab === "exchange" ? "border-navy bg-soft-blue text-navy" : "border-slate-200 bg-white text-slate-600"}`}
                onClick={() => setActiveTab("exchange")}
                aria-label={t("nav.exchange")}
              >
                <Icon name="exchange" />
              </button>
              <button
                className={`grid size-11 place-items-center rounded-xl border lg:hidden ${activeTab === "settings" ? "border-navy bg-soft-blue text-navy" : "border-slate-200 bg-white text-slate-600"}`}
                onClick={() => setActiveTab("settings")}
                aria-label={t("nav.settings")}
              >
                <Icon name="settings" />
              </button>
              <button
                className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 md:hidden"
                onClick={() => setMobileSearchOpen((open) => !open)}
                aria-label={t("common.search")}
              >
                <Icon name="search" />
              </button>
              <div className="relative hidden md:block" ref={searchRef}>
                <label className="relative block">
                  <Icon name="search" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-10 text-sm outline-none transition focus:border-navy focus:bg-white focus:ring-4 focus:ring-[#fddfe0] lg:w-64"
                    placeholder={t("common.searchInventory")}
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
                aria-label={t("common.quickSale")}
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
                onClick={requestLogout}
                aria-label={t("common.logout")}
                title={t("common.logout")}
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
                  placeholder={t("products.searchPlaceholder")}
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
            <div
              role={notice.tone === "warning" ? "alert" : "status"}
              className={`fixed left-4 right-4 top-18 z-50 flex max-w-sm items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-xl shadow-slate-900/10 md:left-5 md:right-auto md:top-24 ${notice.tone === "warning" ? "border-coral-border" : "border-emerald-200"}`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full ${notice.tone === "warning" ? "bg-coral-pale text-coral-dark" : "bg-emerald-100 text-emerald-700"}`}
              >
                <Icon name={notice.tone === "warning" ? "warning" : "check"} className="size-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">{notice.message}</p>
            </div>
          )}

          {updateAvailable && (
            <Banner
              icon="sparkles"
              message={t("pwa.updateAvailable")}
              actionLabel={t("pwa.reload")}
              onAction={applyUpdate}
            />
          )}

          {isCloudEnabled && notificationState === "ask" && (
            <Banner
              icon="bell"
              message={t("sync.enableNotifications")}
              actionLabel={t("sync.allowNotifications")}
              onAction={() => void enableNotifications()}
              dismissLabel={t("common.notNow")}
              onDismiss={disableNotifications}
            />
          )}

          {activeTab === "dashboard" && (
            <DashboardPage
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
            <ProductsPage
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
              note={expenseNote}
              setNote={setExpenseNote}
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
            <SettingsPage
              settings={settings}
              products={products}
              onChangeUsdRate={changeUsdRate}
              sync={{
                status: syncStatus,
                pending: sync.pending,
                lastSyncedAt: sync.lastSyncedAt,
                cloudEnabled: isCloudEnabled,
                onSyncNow: sync.syncNow,
              }}
            />
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
              initialSku={quickSaleSku}
              onClose={() => setQuickSaleOpen(false)}
              onCheckout={(lines) => {
                if (checkoutCart(lines)) setQuickSaleOpen(false);
              }}
            />
          )}
          {emptyServerPrompt && (
            <ConfirmDialog
              title={t("sync.emptyServerTitle")}
              message={
                isDemoData
                  ? t("sync.emptyServerDemoMessage")
                  : t("sync.emptyServerMessage", { products: products.length, sales: sales.length })
              }
              confirmLabel={t("sync.emptyServerUpload")}
              cancelLabel={t("common.notNow")}
              confirmIcon="check"
              danger={false}
              onConfirm={() => {
                setEmptyServerPrompt(false);
                enqueue({ type: "store.replace", store: { products, sales, expenses, settings, exchanges } });
              }}
              onCancel={() => {
                emptyServerDismissed.current = true;
                setEmptyServerPrompt(false);
              }}
            />
          )}
          {confirmLogout && (
            <ConfirmDialog
              title={t("sync.logoutPendingTitle")}
              message={t("sync.logoutPendingMessage", { count: sync.pending })}
              confirmLabel={t("common.logout")}
              cancelLabel={t("common.cancel")}
              confirmIcon="logout"
              onConfirm={() => logout()}
              onCancel={() => setConfirmLogout(false)}
            />
          )}
          {confirmDelete && (
            <ConfirmDialog
              title={t("common.confirmDelete")}
              message={t("common.confirmDeleteSale", { label: confirmDelete.label })}
              confirmLabel={t("common.yesDelete")}
              cancelLabel={t("common.cancel")}
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
              <span className="max-w-full truncate">{t(item.shortKey)}</span>
            </button>
          ))}
          <div className="relative flex w-14 shrink-0 justify-center sm:w-16">
            <button
              onClick={() => openQuickSale()}
              className="-mt-5 grid size-12 place-items-center rounded-full bg-navy text-white shadow-lg shadow-navy/30 active:scale-95 sm:-mt-6 sm:size-14"
              aria-label={t("common.quickSale")}
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
              <span className="max-w-full truncate">{t(item.shortKey)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
