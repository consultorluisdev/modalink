import { useState, useEffect, useMemo } from "react";
import type { FormEvent } from 'react';
import { Users, Search, ArrowUpRight, ArrowLeft, Check, ChevronRight, Phone, Mail, MessageCircle, Plus, Pencil, AlertCircle, X, Save } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";

interface Cliente {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string | null;
  instagram?: string | null;
  notes?: string | null;
  creditLimit?: number | null;
  totalOrders: number;
  totalSpent: number;
  totalOwed: number;
}

const currency = (amount: number) =>
  Number(amount || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const initials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase()

  const avatarColors = [
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
  ];


export default function Clientes() {
  useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    notes: "",
    creditLimit: "",
  });

  useEffect(() => {
    void loadClientes();
  }, []);

  async function loadClientes() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/customers");
      const loaded: Cliente[] = Array.isArray(res.data) ? res.data : [];
      setClientes(loaded);
      setSelectedId((current) => current ?? loaded[0]?.id ?? null);
    } catch {
      setError("Não foi possivel carregar os clientes. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      instagram: form.instagram.trim() || null,
      notes: form.notes.trim() || null,
      creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
    };

    setSaving(true);
    try {
      if (editingCustomerId !== null) {
        await api.put(`/customers/${editingCustomerId}`, payload);
      } else {
        await api.post("/customers", payload);
      }

      setShowModal(false);
      setEditingCustomerId(null);
      setForm({ name: "", email: "", phone: "", whatsapp: "", instagram: "", notes: "", creditLimit: "" });
      await loadClientes();
    } catch {
      setError(
        editingCustomerId !== null
          ? "Não foi possível atualizar o cliente. Tente novamente."
          : "Não foi possível criar o cliente. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }

  }

  function openCreateModal() {
      setEditingCustomerId(null);
      setForm({ name: "", email: "", phone: "", whatsapp: "", instagram: "", notes: "", creditLimit: "" });
      setShowModal(true);
    }

  async function openEditModal(cliente: Cliente) {
      setEditingCustomerId(cliente.id);
      try {
        const response = await api.get(`/customers/${cliente.id}`);
        const details = response.data as Cliente;
        setForm({
          name: details.name,
          email: details.email ?? "",
          phone: details.phone ?? "",
          whatsapp: details.whatsapp ?? "",
          instagram: details.instagram ?? "",
          notes: details.notes ?? "",
          creditLimit: details.creditLimit?.toString() ?? "",
        });
        setShowModal(true);
      } catch {
        setEditingCustomerId(null);
        setError("Não foi possível carregar os dados do cliente para edição.");
      }
  }

  const filtered = useMemo(() =>{
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if(!term) return clientes;
    return clientes.filter((cliente) =>
    [cliente.name, cliente.email, cliente.phone].some((value) =>
    (value || "").toLocaleLowerCase("pt-BR").includes(term),
    ),
  );
  }, [clientes, search]);

  const selected = filtered.find((cliente) => cliente.id === selectedId) ?? filtered[0] ?? null;
  const totals = useMemo(
    () =>
      clientes.reduce(
        (acc, cliente) => ({
          spent: acc.spent + Number(cliente.totalSpent || 0),
          owed: acc.owed + Number(cliente.totalOwed || 0),
        }),
        { spent: 0, owed: 0 }
      ),
    [clientes]
  );
return (
  <main className="min-h-full bg-[#f8f7fb] p-4 text-slate-800 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-violet-700"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-violet-600"></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhe e gerencie sua base de clientes.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        >
          <Plus size={17} /> Novo cliente
        </button>
      </header>

      <section aria-label="Resumo dos clientes" className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={<Users size={18} />}
          label="Clientes cadastrados"
          value={clientes.length.toLocaleString('pt-BR')}
          note="Na sua base"
          tint="violet"
        />
        <Metric
          icon={<ArrowUpRight size={18} />}
          label="Total gasto"
          value={currency(totals.spent)}
          note="Soma dos valores informados"
          tint="blue"
        />
        <Metric
          icon={<AlertCircle size={18} />}
          label="Saldo devedor"
          value={currency(totals.owed)}
          note="Soma dos saldos informados"
          tint="amber"
        />
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlertCircle size={17} />
          {error}
          <button onClick={() => void loadClientes()} className="ml-auto font-semibold underline">
            Tentar novamente
          </button>
        </div>
      )}

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">Sua lista</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
              </p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                placeholder="Buscar por nome ou contato"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <span
                className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600"
                aria-label="Carregando"
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Cliente</th>
                      <th className="px-4 py-3">Contato</th>
                      <th className="px-4 py-3 text-center">Pedidos</th>
                      <th className="px-4 py-3 text-right">Total gasto</th>
                      <th className="px-5 py-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((cliente) => (
                      <tr
                        key={cliente.id}
                        onClick={() => setSelectedId(cliente.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedId(cliente.id);
                          }
                        }}
                        tabIndex={0}
                        aria-selected={selected?.id === cliente.id}
                        className={`cursor-pointer transition hover:bg-violet-50/50 focus:bg-violet-50/50 ${selected?.id === cliente.id ? 'bg-violet-50/60' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={cliente.name} id={cliente.id} />
                            <span className="truncate text-sm font-semibold text-slate-800">
                              {cliente.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1 text-xs text-slate-500">
                            {cliente.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail size={13} />
                                {cliente.email}
                              </div>
                            )}
                            {cliente.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone size={13} />
                                {cliente.phone}
                              </div>
                            )}
                            {!cliente.email && !cliente.phone && (
                              <span className="text-slate-400">Sem contato</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-600">
                          {Number(cliente.totalOrders || 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-800">
                          {currency(cliente.totalSpent)}
                        </td>
                        <td className="px-5 py-4 text-right text-sm font-semibold">
                          {Number(cliente.totalOwed || 0) > 0 ? (
                            <span className="text-rose-600">{currency(cliente.totalOwed)}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <Check size={14} /> Quitado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {filtered.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => setSelectedId(cliente.id)}
                    className={`block w-full p-4 text-left ${selected?.id === cliente.id ? 'bg-violet-50/60' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={cliente.name} id={cliente.id} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{cliente.name}</div>
                        <div className="truncate text-xs text-slate-500">
                          {cliente.email || cliente.phone || 'Sem contato'}
                        </div>
                      </div>
                      <ChevronRight size={17} className="text-slate-400" />
                    </div>
                    <div className="mt-3 flex justify-between text-xs">
                      <span className="text-slate-500">
                        {Number(cliente.totalOrders || 0)} pedidos
                      </span>
                      <span className="font-semibold">{currency(cliente.totalSpent)}</span>
                    </div>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                    <Users size={23} />
                  </div>
                  <p className="font-medium text-slate-700">
                    {search ? 'Nenhum resultado encontrado' : 'Sua lista está vazia'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {search
                      ? 'Experimente outro nome ou contato.'
                      : 'Adicione seu primeiro cliente para começar.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:sticky xl:top-6">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Detalhes do cliente</h2>
            <p className="mt-0.5 text-xs text-slate-500">Informações disponíveis no cadastro</p>
          </div>
          {selected ? (
            <div className="p-5">
              <div className="flex flex-col items-center border-b border-slate-100 pb-5 text-center">
                <Avatar name={selected.name} id={selected.id} large />
                <h3 className="mt-3 text-lg font-bold text-slate-900">{selected.name}</h3>
                <span className="mt-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                  Cliente
                </span>
              </div>
              <div className="space-y-4 py-5">
                <Detail icon={<Mail size={16} />} label="E-mail" value={selected.email} />
                <Detail icon={<Phone size={16} />} label="Telefone" value={selected.phone} />
                <Detail
                  icon={<MessageCircle size={16} />}
                  label="WhatsApp"
                  value={selected.whatsapp}
                  iconClassName="text-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Pedidos</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {Number(selected.totalOrders || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Total gasto</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {currency(selected.totalSpent)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-50/70 px-3 py-3">
                <span className="text-xs font-medium text-slate-600">Saldo devedor</span>
                <span
                  className={`text-sm font-bold ${Number(selected.totalOwed || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                >
                  {Number(selected.totalOwed || 0) > 0 ? currency(selected.totalOwed) : 'Quitado'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openEditModal(selected)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              >
                <Pencil size={16} /> Editar cliente
              </button>
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              {loading
                ? 'Carregando dados…'
                : 'Selecione um cliente na lista para ver os detalhes.'}
            </div>
          )}
        </aside>
      </section>
    </div>

    {showModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowModal(false);
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-customer-title"
          className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 id="create-customer-title" className="text-lg font-bold text-slate-900">
                {editingCustomerId !== null ? 'Editar cliente' : 'Novo cliente'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {editingCustomerId !== null
                  ? 'Atualize os dados do cliente.'
                  : 'Preencha os dados para cadastrar.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingCustomerId(null);
              }}
              aria-label="Fechar"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={19} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4 p-6">
            <Field label="Nome" required>
              <input
                autoFocus
                type="text"
                placeholder="Nome completo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail">
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Telefone">
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp">
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Instagram">
                <input
                  type="text"
                  placeholder="@usuario"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Limite de crédito (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Observações">
              <textarea
                placeholder="Anotações sobre o cliente"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingCustomerId(null);
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {saving
                  ? 'Salvando…'
                  : editingCustomerId !== null
                    ? 'Atualizar cliente'
                    : 'Salvar cliente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </main>
);
}

const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

function Metric({ icon, label, value, note, tint }: { icon: React.ReactNode; label: string; value: string; note: string; tint: "violet" | "blue" | "amber" }) {
  const colors = { violet: "bg-violet-50 text-violet-600", blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600" };
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p></div><div className={`rounded-xl p-2.5 ${colors[tint]}`}>{icon}</div></div><p className="mt-3 text-xs text-slate-400">{note}</p></div>;
}

function Avatar({ name, id, large = false }: { name: string; id: number; large?: boolean }) {
  return <div className={`${large ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm"} ${avatarColors[Math.abs(id) % avatarColors.length]} flex shrink-0 items-center justify-center rounded-full font-bold`}>{initials(name) || "?"}</div>;
}

function Detail({
  icon,
  label,
  value,
  iconClassName = "text-violet-500",
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 ${iconClassName}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 break-all text-sm font-medium text-slate-700">
          {value || "Não informado"}
        </p>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
