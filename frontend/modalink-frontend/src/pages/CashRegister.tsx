import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Banknote, CalendarClock, CheckCircle, CircleDollarSign, ClipboardList, LoaderCircle, LockKeyhole, Plus, Receipt, Wallet } from "lucide-react";
import { cashRegisterService, type CashRegisterData } from "../services/cashRegisterService";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

export default function CashRegister() {
  const [register, setRegister] = useState<CashRegisterData | null>(null);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [closingAmount, setClosingAmount] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRegister = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await cashRegisterService.getCurrent();
      setRegister(current);
      if (current) setClosingAmount(current.expectedCash.toFixed(2));
    } catch {
      setError("Não foi possível carregar o caixa. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRegister();
  }, [loadRegister]);

  async function handleOpen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await cashRegisterService.open(Number(openingAmount.replace(",", ".")));
      setNotice("Caixa aberto. As vendas e movimentações serão vinculadas a esta sessão.");
      await loadRegister();
    } catch {
      setError("Não foi possível abrir o caixa. Atualize e verifique se já existe uma sessão aberta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await cashRegisterService.addExpense(
        Number(expenseAmount.replace(",", ".")),
        expenseDescription.trim()
      );
      setExpenseAmount("");
      setExpenseDescription("");
      setNotice("Despesa registrada no caixa.");
      await loadRegister();
    } catch {
      setError("Não foi possível registrar a despesa.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Confirma o fechamento deste caixa?")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await cashRegisterService.close(Number(closingAmount.replace(",", ".")));
      setRegister(null);
      setNotice(
        `Caixa fechado. Esperado ${formatCurrency(result.expectedCash)}; diferença ${formatCurrency(result.difference)}.`
      );
      setClosingAmount("");
    } catch {
      setError("Não foi possível fechar o caixa.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="animate-spin text-indigo-700" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Operação diária</p>
        <h1 className="text-2xl font-bold text-gray-900">Caixa</h1>
        <p className="mt-1 text-sm text-gray-500">Abra seu turno, registre despesas e confira os valores antes de fechar.</p>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle size={18} className="mt-0.5 shrink-0" />{notice}</div>}

      {!register ? (
        <section className="max-w-xl rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-indigo-700"><Wallet size={23} /></span>
            <div><h2 className="font-semibold text-slate-900">Abrir caixa</h2><p className="text-sm text-slate-500">Informe o valor inicial disponível em dinheiro.</p></div>
          </div>
          <form onSubmit={handleOpen} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700" htmlFor="opening-amount">Fundo de abertura (R$)</label>
            <input id="opening-amount" type="number" min="0" step="0.01" required value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} className="w-full border border-purple-100 px-3 py-3 text-lg" />
            <button type="submit" disabled={saving} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
              <Banknote size={18} />{saving ? "Abrindo..." : "Abrir caixa"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle size={20} /></span>
              <div><p className="font-semibold text-slate-900">Caixa aberto</p><p className="text-xs text-slate-500">Iniciado {formatDate(register.openedAt)}</p></div>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Sessão #{register.id}</span>
          </div>

          <section aria-label="Resumo do caixa" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Fundo inicial", amount: register.openingAmount, icon: Wallet, tone: "text-violet-700 bg-violet-100" },
              { label: "Recebido em dinheiro", amount: register.cashReceived, icon: Banknote, tone: "text-emerald-700 bg-emerald-100" },
              { label: "Despesas", amount: register.totalExpenses, icon: Receipt, tone: "text-rose-700 bg-rose-100" },
              { label: "Dinheiro esperado", amount: register.expectedCash, icon: CircleDollarSign, tone: "text-indigo-700 bg-purple-100" },
            ].map((card) => (
              <article key={card.label} className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(card.amount)}</p></div><span className={`rounded-xl p-2.5 ${card.tone}`}><card.icon size={20} /></span></div>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-indigo-700" /><h2 className="font-semibold text-slate-900">Vendas por forma de pagamento</h2></div>
                {register.paymentsByMethod.length === 0 ? <p className="text-sm text-slate-500">Nenhum recebimento registrado neste caixa.</p> : (
                  <div className="space-y-3">{register.paymentsByMethod.map((item) => <div key={item.method} className="flex justify-between gap-3 border-b border-purple-50 pb-3 last:border-0 last:pb-0"><span className="text-sm text-slate-600">{item.method}</span><span className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</span></div>)}</div>
                )}
              </div>
              <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2"><Receipt size={18} className="text-indigo-700" /><h2 className="font-semibold text-slate-900">Despesas do turno</h2></div>
                {register.expenses.length === 0 ? <p className="text-sm text-slate-500">Nenhuma despesa lançada.</p> : <div className="space-y-3">{register.expenses.map((expense) => <div key={expense.id} className="flex justify-between gap-3 border-b border-purple-50 pb-3 last:border-0 last:pb-0"><div><p className="text-sm font-medium text-slate-800">{expense.description}</p><p className="text-xs text-slate-400">{formatDate(expense.createdAt)}</p></div><span className="text-sm font-semibold text-rose-700">− {formatCurrency(expense.amount)}</span></div>)}</div>}
              </div>
            </div>

            <div className="space-y-6">
              <form onSubmit={handleExpense} className="space-y-4 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
                <div><h2 className="font-semibold text-slate-900">Lançar despesa</h2><p className="mt-1 text-xs text-slate-500">Despesas em dinheiro reduzem o saldo esperado.</p></div>
                <label className="block text-sm font-medium text-slate-600" htmlFor="expense-amount">Valor</label>
                <input id="expense-amount" type="number" min="0.01" step="0.01" required value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0,00" className="w-full border border-purple-100 px-3 py-2.5" />
                <label className="block text-sm font-medium text-slate-600" htmlFor="expense-description">Descrição</label>
                <input id="expense-description" type="text" minLength={2} maxLength={300} required value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} placeholder="Ex.: embalagem, transporte" className="w-full border border-purple-100 px-3 py-2.5" />
                <button type="submit" disabled={saving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 font-semibold text-indigo-800 hover:bg-purple-100 disabled:opacity-50"><Plus size={17} />Registrar despesa</button>
              </form>

              <form onSubmit={handleClose} className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="flex items-center gap-2"><LockKeyhole size={18} className="text-amber-800" /><h2 className="font-semibold text-amber-950">Fechar caixa</h2></div>
                <p className="text-sm text-amber-900/80">Conte o dinheiro físico e informe o total. Esperado agora: <strong>{formatCurrency(register.expectedCash)}</strong>.</p>
                <label className="block text-sm font-medium text-amber-950" htmlFor="closing-amount">Dinheiro contado (R$)</label>
                <input id="closing-amount" type="number" min="0" step="0.01" required value={closingAmount} onChange={(event) => setClosingAmount(event.target.value)} className="w-full border border-amber-200 bg-white px-3 py-2.5" />
                <button type="submit" disabled={saving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 font-semibold text-white hover:bg-amber-900 disabled:opacity-50"><CalendarClock size={17} />{saving ? "Fechando..." : "Conferir e fechar caixa"}</button>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
