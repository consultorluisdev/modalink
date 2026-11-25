import { useCallback, useEffect, useState, type ComponentType, type FormEvent } from "react";
import { AudioLines, CheckCircle2, ExternalLink, LoaderCircle, LogIn, Music2, Radio, Unplug, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

type MusicProvider = "youtube" | "spotify" | "deezer";

interface SavedMusic {
  provider: MusicProvider;
  url: string;
  embedUrl: string;
}

interface StoredMusic {
  provider: MusicProvider;
  url: string;
}

interface ProviderConnection {
  provider: MusicProvider;
  connected: boolean;
}

interface MusicPlaylist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  trackCount: number | null;
  url: string;
  embedUrl: string;
}

const STORAGE_KEY = "modalink-ambient-music";
function YouTubeMark({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z" fill="#FF0033" />
      <path d="m9.6 15.6 6.2-3.6-6.2-3.6v7.2Z" fill="white" />
    </svg>
  );
}

const providers: { id: MusicProvider; label: string; Icon: ComponentType<{ size: number }> }[] = [
  { id: "youtube", label: "YouTube", Icon: YouTubeMark },
  { id: "spotify", label: "Spotify", Icon: Music2 },
  { id: "deezer", label: "Deezer", Icon: AudioLines },
];

function isMusicProvider(value: unknown): value is MusicProvider {
  return value === "youtube" || value === "spotify" || value === "deezer";
}

function createEmbedUrl(provider: MusicProvider, input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Cole um link válido do YouTube, Spotify ou Deezer.");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.split("/").filter(Boolean);

  if (provider === "youtube") {
    if (host === "youtu.be") {
      const videoId = path[0];
      if (!videoId || !/^[\w-]{6,}$/.test(videoId)) {
        throw new Error("Não encontrei um vídeo válido nesse link do YouTube.");
      }
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    }

    if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") {
      throw new Error("O link selecionado não é do YouTube.");
    }

    const playlistId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v") ?? (path[0] === "embed" ? path[1] : undefined);
    if (playlistId && /^[\w-]{5,}$/.test(playlistId)) {
      const videoPart = videoId && /^[\w-]{6,}$/.test(videoId)
        ? `${encodeURIComponent(videoId)}?list=`
        : "videoseries?list=";
      return `https://www.youtube-nocookie.com/embed/${videoPart}${encodeURIComponent(playlistId)}`;
    }
    if (videoId && /^[\w-]{6,}$/.test(videoId)) {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    }
    throw new Error("Use um link de vídeo ou playlist do YouTube.");
  }

  if (provider === "spotify") {
    if (host !== "open.spotify.com" && host !== "spotify.com") {
      throw new Error("O link selecionado não é do Spotify.");
    }
    const [type, id] = path[0] === "embed" ? path.slice(1, 3) : path;
    if (!type || !["track", "album", "playlist", "episode", "show"].includes(type)
      || !id || !/^[a-zA-Z0-9]{10,}$/.test(id)) {
      throw new Error("Use um link de faixa, álbum, playlist, episódio ou programa do Spotify.");
    }
    return `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator`;
  }

  if (host !== "deezer.com") {
    throw new Error("O link selecionado não é do Deezer.");
  }
  const deezerPath = path[0] && /^[a-z]{2}$/i.test(path[0]) ? path.slice(1) : path;
  const [type, id] = deezerPath[0] === "widget" ? deezerPath.slice(2) : deezerPath;
  if (!type || !["track", "album", "playlist"].includes(type) || !id || !/^\d+$/.test(id)) {
    throw new Error("Use um link de faixa, álbum ou playlist do Deezer.");
  }
  return `https://widget.deezer.com/widget/dark/${type}/${encodeURIComponent(id)}`;
}

function readStoredMusic(): { stored: StoredMusic | null; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stored: null, error: "" };

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("provider" in parsed) || !("url" in parsed)
      || !isMusicProvider(parsed.provider) || typeof parsed.url !== "string") {
      return { stored: null, error: "A configuração de música salva não pôde ser lida. Escolha um link novamente." };
    }
    return { stored: { provider: parsed.provider, url: parsed.url }, error: "" };
  } catch {
    return { stored: null, error: "Não foi possível ler a configuração de música deste navegador." };
  }
}

const savedState = readStoredMusic();

export default function AmbientMusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState<MusicProvider>(savedState.stored?.provider ?? "spotify");
  const [url, setUrl] = useState(savedState.stored?.url ?? "");
  const [savedMusic, setSavedMusic] = useState<SavedMusic | null>(() => {
    if (!savedState.stored) return null;
    try {
      return {
        ...savedState.stored,
        embedUrl: createEmbedUrl(savedState.stored.provider, savedState.stored.url),
      };
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(savedState.error);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<MusicPlaylist | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const loadConnections = useCallback(async () => {
    try {
      const response = await api.get<ProviderConnection[]>("/music-connections");
      setConnections(response.data);
      setAccountError("");
    } catch {
      setAccountError("Não foi possível consultar as contas conectadas.");
    }
  }, []);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const result = query.get("musicConnection");
    const callbackProvider = query.get("provider");
    if (!result) return;

    if (result === "connected" && isMusicProvider(callbackProvider)) {
      setProvider(callbackProvider);
      setIsOpen(true);
      setAccountNotice(`Conta ${providers.find((item) => item.id === callbackProvider)?.label} conectada.`);
      void loadConnections();
    } else {
      setAccountError("Não foi possível conectar. Confira as permissões e tente novamente.");
    }

    query.delete("musicConnection");
    query.delete("provider");
    const search = query.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
  }, [location.pathname, location.search, navigate, loadConnections]);

  async function connectAccount(selectedProvider: MusicProvider) {
    setProvider(selectedProvider);
    setAccountBusy(true);
    setAccountError("");
    setAccountNotice("");
    try {
      const response = await api.post<{ authorizationUrl: string }>(
        `/music-connections/${selectedProvider}/connect`
      );
      window.location.assign(response.data.authorizationUrl);
    } catch (connectError: unknown) {
      const message = typeof connectError === "object" && connectError !== null
        && "response" in connectError
        && typeof connectError.response === "object"
        && connectError.response !== null
        && "data" in connectError.response
        && typeof connectError.response.data === "object"
        && connectError.response.data !== null
        && "detail" in connectError.response.data
        && typeof connectError.response.data.detail === "string"
          ? connectError.response.data.detail
          : "Não foi possível iniciar a conexão da conta.";
      setAccountError(message);
      setAccountBusy(false);
    }
  }

  async function loadPlaylists(selectedProvider: MusicProvider) {
    setProvider(selectedProvider);
    setAccountBusy(true);
    setAccountError("");
    setAccountNotice("");
    setSelectedPlaylist(null);
    try {
      const response = await api.get<MusicPlaylist[]>(
        `/music-connections/${selectedProvider}/playlists`
      );
      setPlaylists(response.data);
      if (response.data.length === 0) setAccountNotice("Nenhuma playlist foi encontrada nessa conta.");
    } catch {
      setAccountError("Não foi possível carregar as playlists. Tente reconectar a conta.");
    } finally {
      setAccountBusy(false);
    }
  }

  async function disconnectAccount(selectedProvider: MusicProvider) {
    setAccountBusy(true);
    setAccountError("");
    try {
      await api.delete(`/music-connections/${selectedProvider}`);
      setConnections((current) => current.map((item) =>
        item.provider === selectedProvider ? { ...item, connected: false } : item
      ));
      setPlaylists([]);
      setSelectedPlaylist(null);
      setAccountNotice("Conta desconectada.");
    } catch {
      setAccountError("Não foi possível desconectar a conta.");
    } finally {
      setAccountBusy(false);
    }
  }

  function choosePlaylist(playlist: MusicPlaylist) {
    setSelectedPlaylist(playlist);
    setSavedMusic({ provider, url: playlist.url, embedUrl: playlist.embedUrl });
    setAccountNotice(`Playlist "${playlist.name}" selecionada.`);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, url: playlist.url } satisfies StoredMusic));
    } catch {
      setError("A playlist foi selecionada, mas não foi possível salvar a preferência neste navegador.");
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const embedUrl = createEmbedUrl(provider, url.trim());
      setSavedMusic({ provider, url: url.trim(), embedUrl });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, url: url.trim() } satisfies StoredMusic));
      } catch {
        setError("O player está pronto, mas não foi possível salvar sua preferência neste navegador.");
      }
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível abrir esse link.");
    }
  }

  function clearMusic() {
    setSavedMusic(null);
    setSelectedPlaylist(null);
    setUrl("");
    setError("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      setError("Não foi possível apagar a preferência salva neste navegador.");
    }
  }

  const providerName = savedMusic
    ? providers.find((item) => item.id === savedMusic.provider)?.label
    : undefined;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <section
          aria-label="Música ambiente"
          className="w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-2xl shadow-purple-950/20"
        >
          <div className="flex items-center justify-between bg-[#29113d] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                <Music2 size={17} />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Música ambiente</h2>
                <p className="text-[11px] text-purple-200/75">Ouça enquanto trabalha</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar painel de música"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-purple-100 transition hover:bg-white/10"
            >
              <X size={17} />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-3 gap-2" aria-label="Serviço de música">
              {providers.map(({ id, label, Icon }) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={provider === id}
                  onClick={() => {
                    setProvider(id);
                    setPlaylists([]);
                    setSelectedPlaylist(null);
                    setError("");
                  }}
                  className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition ${
                    provider === id
                      ? "border-purple-300 bg-purple-50 text-purple-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            <section className="space-y-3 rounded-xl border border-purple-100 bg-purple-50/50 p-3" aria-label="Contas de música">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Suas contas</h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Conecte sua conta para buscar playlists pessoais.
                </p>
              </div>

              {accountError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{accountError}</p>}
              {accountNotice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{accountNotice}</p>}

              {providers.map(({ id, label, Icon }) => {
                const connected = connections.find((item) => item.provider === id)?.connected ?? false;
                return (
                  <div key={id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-700">
                      <Icon size={15} />
                      <span className="truncate">{label}</span>
                      {connected && <CheckCircle2 size={14} className="shrink-0 text-emerald-600" aria-label="Conectada" />}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {connected ? (
                        <>
                          <button
                            type="button"
                            disabled={accountBusy}
                            onClick={() => void loadPlaylists(id)}
                            className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-purple-800 hover:bg-purple-50 disabled:opacity-50"
                          >
                            Playlists
                          </button>
                          <button
                            type="button"
                            disabled={accountBusy}
                            onClick={() => void disconnectAccount(id)}
                            aria-label={`Desconectar ${label}`}
                            title={`Desconectar ${label}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                          >
                            <Unplug size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={accountBusy}
                          onClick={() => void connectAccount(id)}
                          className="flex items-center gap-1 rounded-lg bg-purple-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-800 disabled:opacity-50"
                        >
                          {accountBusy && provider === id
                            ? <LoaderCircle size={13} className="animate-spin" />
                            : <LogIn size={13} />}
                          Conectar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {accountBusy && connections.some((item) => item.provider === provider && item.connected) && (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <LoaderCircle size={14} className="animate-spin" /> Carregando conta…
                </p>
              )}

              {playlists.length > 0 && (
                <div className="max-h-44 space-y-1 overflow-y-auto" aria-label="Playlists encontradas">
                  {playlists.map((playlist) => (
                    <button
                      type="button"
                      key={playlist.id}
                      onClick={() => choosePlaylist(playlist)}
                      className={`flex w-full items-center gap-2 rounded-lg p-2 text-left transition hover:bg-purple-50 ${
                        selectedPlaylist?.id === playlist.id ? "bg-purple-50 ring-1 ring-purple-200" : ""
                      }`}
                    >
                      {playlist.imageUrl
                        ? <img src={playlist.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                        : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-700"><Music2 size={16} /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-700">{playlist.name}</span>
                        {playlist.trackCount !== null && <span className="block text-[10px] text-slate-400">{playlist.trackCount} faixas</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <details className="rounded-xl border border-slate-200 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-slate-600">Ou usar um link público</summary>
              <form onSubmit={handleSave} className="mt-3 space-y-2">
                <label htmlFor="ambient-music-url" className="block text-xs font-medium text-slate-700">
                  Link de música ou playlist
                </label>
                <input
                  id="ambient-music-url"
                  type="url"
                  required
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={`Cole um link do ${providers.find((item) => item.id === provider)?.label}`}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="submit"
                  className="min-h-10 w-full rounded-xl bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-800"
                >
                  {savedMusic ? "Atualizar música" : "Carregar player"}
                </button>
              </form>
            </details>

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

            {savedMusic && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-slate-600">Player do {providerName}</p>
                  <button
                    type="button"
                    onClick={clearMusic}
                    className="shrink-0 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-rose-700"
                  >
                    Remover
                  </button>
                </div>
                <iframe
                  key={savedMusic.embedUrl}
                  title={`Player de música do ${providerName}`}
                  src={savedMusic.embedUrl}
                  width="100%"
                  height={savedMusic.provider === "youtube" ? "200" : "152"}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="block w-full overflow-hidden rounded-xl border-0"
                />
                <a
                  href={savedMusic.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-purple-800"
                >
                  Abrir no {providerName} <ExternalLink size={12} />
                </a>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-slate-400">
              A reprodução começa no player. Disponibilidade e login dependem do serviço e do conteúdo escolhido.
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fechar música ambiente" : "Abrir música ambiente"}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-700 text-white shadow-lg shadow-purple-900/25 transition hover:scale-105 hover:bg-purple-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300"
      >
        {isOpen ? <X size={22} /> : <Radio size={22} />}
      </button>
    </div>
  );
}
