import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  DollarSign,
  RotateCcw,
  Search,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';

import { financeiroService } from '../../services/financeiroService';
import type { ReceivableData } from '../../services/financeiroService';

type FilterType = 'Todas' | 'Em aberto' | 'Vencidas' | 'Recebidas';
type ReceivableItem = ReceivableData['items'][number];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(value: string): string {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}

function isItemOverdue(item: ReceivableItem): boolean {
  if (item.isPaid) return false;

  const dueDate = new Date(item.dueDate);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

export default function Financeiro() {
  const [data, setData] = useState<ReceivableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('Todas');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError('');
      const result = await financeiroService.getReceivable();
      setData(result);

      setSelectedId((current) => {
        if (current == null) return null;
        return result.items.some((item) => item.id === current) ? current : null;
      });
    } catch {
      setError('Não foi possível carregar os dados financeiros. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handlePay(id: number) {
    if (
      !window.confirm(
        'Confirma o recebimento desta parcela? Esta ação registrará a baixa no financeiro.'
      )
    )
      return;

    setPayingId(id);
    setError('');

    try {
      await financeiroService.payInstallment(id);
      await loadData(true);
    } catch {
      setError('Não foi possível registrar o recebimento da parcela.');
    } finally {
      setPayingId(null);
    }
  }

  async function handleUnpay(id: number) {
    if (
      !window.confirm(
        'Deseja reabrir esta parcela? Confirme somente se o recebimento foi registrado incorretamente.'
      )
    )
      return;

    setPayingId(id);
    setError('');

    try {
      await financeiroService.unpayInstallment(id);
      await loadData(true);
    } catch {
      setError('Não foi possível reabrir a parcela.');
    } finally {
      setPayingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (!data) return [];

    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return data.items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.customerName.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
        String(item.orderId).includes(normalizedSearch);

      const overdue = isItemOverdue(item);
      const matchesFilter =
        filter === 'Todas' ||
        (filter === 'Recebidas' && item.isPaid) ||
        (filter === 'Vencidas' && overdue) ||
        (filter === 'Em aberto' && !item.isPaid && !overdue);

      return matchesSearch && matchesFilter;
    });
  }, [data, search, filter]);

  const selectedItem = data?.items.find((item) => item.id === selectedId) ?? null;

  const summaryCards = [
    {
      title: 'A receber',
      value: data?.totalReceivable ?? 0,
      description: 'Total de parcelas em aberto',
      icon: Wallet,
      iconClass: 'text-violet-700',
      iconBg: 'bg-violet-100',
      accent: 'border-t-violet-500',
    },
    {
      title: 'Recebido no mês',
      value: data?.totalPaidThisMonth ?? 0,
      description: 'Pagamentos registrados no mês',
      icon: CheckCircle,
      iconClass: 'text-emerald-700',
      iconBg: 'bg-emerald-100',
      accent: 'border-t-emerald-500',
    },
    {
      title: 'Vencido',
      value: data?.overdue ?? 0,
      description: 'Parcelas em atraso',
      icon: AlertTriangle,
      iconClass: 'text-red-700',
      iconBg: 'bg-red-100',
      accent: 'border-t-red-500',
    },
    {
      title: 'A vencer',
      value: data?.dueSoon ?? 0,
      description: 'Próximos vencimentos',
      icon: CalendarCheck,
      iconClass: 'text-blue-700',
      iconBg: 'bg-blue-100',
      accent: 'border-t-blue-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600"
          role="status"
          aria-label="Carregando financeiro"
        />
      </div>
    );
  }

  return (
    <main className="min-w-0 space-y-6 pb-8">
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
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-violet-100 p-2.5">
              <DollarSign className="text-violet-700" size={22} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Financeiro</h1>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Acompanhe recebimentos, parcelas e crediário da sua loja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
            <CalendarDays size={17} className="text-violet-600" />
            <span>Visão geral</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={16} className={refreshing ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Fechar mensagem"
            className="rounded p-1 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section
        aria-label="Resumo financeiro"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className={`rounded-2xl border border-gray-100 border-t-4 ${card.accent} bg-white p-5 shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="mt-3 break-words text-2xl font-bold tracking-tight text-gray-900">
                    {formatCurrency(card.value)}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">{card.description}</p>
                </div>
                <div className={`shrink-0 rounded-xl p-3 ${card.iconBg}`}>
                  <Icon className={card.iconClass} size={22} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid min-w-0 grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Contas a receber</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Consulte parcelas e registre os recebimentos.
                </p>
              </div>
              <span className="w-fit rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                {filteredItems.length} {filteredItems.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Pesquisar cliente ou venda</span>
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar cliente ou número da venda..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(['Todas', 'Em aberto', 'Vencidas', 'Recebidas'] as FilterType[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    filter === item
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Cliente', 'Parcela', 'Vencimento', 'Valor', 'Situação', 'Ação'].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">
                      <DollarSign size={36} className="mx-auto mb-3 text-gray-300" />
                      Nenhuma parcela encontrada para esta pesquisa.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const overdue = isItemOverdue(item);
                    const selected = selectedId === item.id;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        aria-selected={selected}
                        className={`cursor-pointer transition hover:bg-violet-50/60 ${
                          selected ? 'bg-violet-50/80' : ''
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                              {item.customerName.charAt(0).toLocaleUpperCase('pt-BR')}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-semibold text-gray-800">
                                {item.customerName}
                              </p>
                              <p className="text-xs text-gray-400">Venda #{item.orderId}</p>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                          {item.installmentNumber}ª parcela
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                          {formatDate(item.dueDate)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-gray-900">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {item.isPaid ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              Recebida
                            </span>
                          ) : overdue ? (
                            <span className="inline-flex rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
                              Vencida
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700">
                              Em aberto
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {item.isPaid ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleUnpay(item.id);
                              }}
                              disabled={payingId === item.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
                            >
                              <RotateCcw size={13} />
                              Reabrir
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handlePay(item.id);
                              }}
                              disabled={payingId === item.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <CheckCircle size={13} />
                              {payingId === item.id ? 'Aguarde...' : 'Receber'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
            Exibindo {filteredItems.length} de {data?.items.length ?? 0} parcelas.
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5">
              <UserRound size={20} className="text-violet-700" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Detalhes da parcela</h2>
              <p className="text-xs text-gray-400">Informações do registro selecionado</p>
            </div>
          </div>

          {selectedItem ? (
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-medium text-gray-400">Cliente</p>
                <p className="mt-1 break-words font-semibold text-gray-900">
                  {selectedItem.customerName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Venda</p>
                  <p className="mt-1 font-bold text-gray-900">#{selectedItem.orderId}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Parcela</p>
                  <p className="mt-1 font-bold text-gray-900">{selectedItem.installmentNumber}ª</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500">Valor da parcela</p>
                <p className="mt-1 text-2xl font-bold text-violet-700">
                  {formatCurrency(selectedItem.amount)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">Vencimento</span>
                <span className="text-sm font-semibold text-gray-800">
                  {formatDate(selectedItem.dueDate)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">Situação</span>
                <span
                  className={`text-sm font-semibold ${
                    selectedItem.isPaid
                      ? 'text-emerald-700'
                      : isItemOverdue(selectedItem)
                        ? 'text-red-600'
                        : 'text-blue-700'
                  }`}
                >
                  {selectedItem.isPaid
                    ? 'Recebida'
                    : isItemOverdue(selectedItem)
                      ? 'Vencida'
                      : 'Em aberto'}
                </span>
              </div>

              {!selectedItem.isPaid ? (
                <button
                  type="button"
                  onClick={() => void handlePay(selectedItem.id)}
                  disabled={payingId === selectedItem.id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  <CheckCircle size={17} />
                  {payingId === selectedItem.id ? 'Registrando...' : 'Registrar recebimento'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleUnpay(selectedItem.id)}
                  disabled={payingId === selectedItem.id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <RotateCcw size={17} />
                  Reabrir parcela
                </button>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <UserRound size={25} className="text-gray-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-gray-700">
                Nenhuma parcela selecionada
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                Selecione uma parcela na tabela para consultar seus detalhes.
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
