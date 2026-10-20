import { FormEvent, useMemo, useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import PageIntro from "@/components/PageIntro";
import { useI18n } from "@/i18n/useI18n";
import { isRentExpense, isStockPurchase, money, shortDate } from "@/lib/format";
import type { Expense } from "@/types/store";

const EXPENSE_CATEGORY_AR = {
  rent: "إيجار المحل",
  salaries: "رواتب الموظفين",
  utilities: "الكهرباء والإنترنت",
  stock: "شراء بضاعة جديدة",
  other: "مصروف آخر",
} as const;

type ExpenseCategoryKey = keyof typeof EXPENSE_CATEGORY_AR;

const EXPENSE_CATEGORY_KEYS: ExpenseCategoryKey[] = ["rent", "salaries", "utilities", "stock", "other"];

export default function ExpensesPage({
  expenses,
  category,
  setCategory,
  amount,
  setAmount,
  date,
  setDate,
  note,
  setNote,
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
  note: string;
  setNote: (note: string) => void;
  editingId: number | null;
  onSubmit: (event: FormEvent) => void;
  onEdit: (expense: Expense) => void;
  onCancelEdit: () => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useI18n();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const isEditing = editingId != null;
  const confirmTarget = expenses.find((item) => item.id === confirmId);

  const categoryPresets = useMemo(
    () =>
      EXPENSE_CATEGORY_KEYS.map((key) => ({
        value: EXPENSE_CATEGORY_AR[key],
        label: t(`expenses.categories.${key}`),
      })),
    [t],
  );
  const isPresetCategory = (value: string) => categoryPresets.some((item) => item.value === value);

  return (
    <>
      <PageIntro
        eyebrow={t("expenses.eyebrow")}
        title={t("expenses.title")}
        description={t("expenses.description")}
      />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr] md:gap-5">
        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className={`grid size-11 place-items-center rounded-xl ${isEditing ? "bg-brand text-navy" : "bg-orange-50 text-orange-700"}`}>
              <Icon name={isEditing ? "edit" : "wallet"} />
            </span>
            <div>
              <h2 className="font-bold">{isEditing ? t("expenses.editTitle") : t("dashboard.addExpense")}</h2>
              <p className="text-xs text-slate-500">{isEditing ? t("expenses.editHint") : t("expenses.addHint")}</p>
            </div>
          </div>
          <div className="space-y-4">
            <label className="block">
              <FieldLabel>{t("export.expenseItem")}</FieldLabel>
              <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                {categoryPresets.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
                {!isPresetCategory(category) && category ? <option value={category}>{category}</option> : null}
              </select>
            </label>
            <label className="block">
              <FieldLabel>{t("export.amount")}</FieldLabel>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ل.س</span>
                <input type="number" min="0.01" step="any" className={`${inputClass} pl-12`} placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </div>
            </label>
            <label className="block">
              <FieldLabel>{t("export.dueDate")}</FieldLabel>
              <input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} required />
            </label>
            <label className="block">
              <FieldLabel>{t("export.note")}</FieldLabel>
              <input
                className={inputClass}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("expenses.notePlaceholder")}
                maxLength={255}
              />
            </label>
            <div className={`grid gap-2 ${isEditing ? "grid-cols-2" : ""}`}>
              {isEditing && (
                <Button type="button" variant="secondary" className="min-h-12" onClick={onCancelEdit}>
                  {t("common.cancel")}
                </Button>
              )}
              <Button type="submit" className="w-full min-h-12">
                <Icon name={isEditing ? "check" : "plus"} className="size-4" />
                {isEditing ? t("productModal.saveEdits") : t("expenses.addSubmit")}
              </Button>
            </div>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 md:px-6 md:py-5">
            <div>
              <h2 className="font-bold">{t("expenses.listTitle")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("expenses.listSubtitle")}</p>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400">{t("expenses.totalLabel")}</p>
              <p className="text-lg font-bold text-slate-950">{money(total)}</p>
            </div>
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
                    {isRentExpense(expense) && ` · ${t("export.rent")}`}
                    {isStockPurchase(expense) && ` · ${t("export.stockBuy")}`}
                    {expense.note ? ` · ${expense.note}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-900">{money(expense.amount)}</p>
                <button
                  type="button"
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 active:bg-brand active:text-navy"
                  onClick={() => onEdit(expense)}
                  aria-label={t("expenses.editAria")}
                  title={t("common.edit")}
                >
                  <Icon name="edit" className="size-4" />
                </button>
                <button
                  type="button"
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 active:bg-coral-soft active:text-coral-dark"
                  onClick={() => setConfirmId(expense.id)}
                  aria-label={t("expenses.deleteAria")}
                  title={t("common.delete")}
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </div>
            )) : (
              <p className="px-5 py-10 text-center text-sm text-slate-500">{t("expenses.empty")}</p>
            )}
          </div>
        </div>
      </div>
      {confirmTarget && (
        <ConfirmDialog
          title={t("common.confirmDelete")}
          message={t("expenses.confirmDeleteMessage", {
            label: confirmTarget.categoryAr,
            amount: money(confirmTarget.amount),
          })}
          confirmLabel={t("common.yesDelete")}
          cancelLabel={t("common.cancel")}
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
