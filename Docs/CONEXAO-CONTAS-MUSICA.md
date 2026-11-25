# Conexão de contas de música no ModaLink

O ERP permite que cada usuário autorize a própria conta de música e consulte playlists pessoais. O login com Spotify, Google/YouTube ou Deezer acontece no site oficial do provedor. O ModaLink não recebe nem armazena a senha desses serviços.

## Endereços de retorno OAuth

Cadastre exatamente estes endereços na configuração de cada aplicativo de desenvolvedor:

| Provedor | Desenvolvimento local | Produção |
|---|---|---|
| Spotify | `http://localhost:5020/api/music-connections/spotify/callback` | `https://modalink-api.onrender.com/api/music-connections/spotify/callback` |
| YouTube/Google | `http://localhost:5020/api/music-connections/youtube/callback` | `https://modalink-api.onrender.com/api/music-connections/youtube/callback` |
| Deezer | `http://localhost:5020/api/music-connections/deezer/callback` | `https://modalink-api.onrender.com/api/music-connections/deezer/callback` |

O `redirect_uri` configurado no `.env`/Render precisa ser idêntico ao registrado no respectivo provedor.

## Variáveis locais

Adicione as credenciais ao `.env` local, que não deve ser commitado. Não envie client secrets, chaves ou tokens pelo chat e não os grave no Git.

```dotenv
MUSIC_SPOTIFY_CLIENT_ID=
MUSIC_SPOTIFY_CLIENT_SECRET=
MUSIC_SPOTIFY_REDIRECT_URI=http://localhost:5020/api/music-connections/spotify/callback
MUSIC_YOUTUBE_CLIENT_ID=
MUSIC_YOUTUBE_CLIENT_SECRET=
MUSIC_YOUTUBE_REDIRECT_URI=http://localhost:5020/api/music-connections/youtube/callback
MUSIC_DEEZER_CLIENT_ID=
MUSIC_DEEZER_CLIENT_SECRET=
MUSIC_DEEZER_REDIRECT_URI=http://localhost:5020/api/music-connections/deezer/callback
MUSIC_TOKEN_ENCRYPTION_KEY=
```

Gere uma chave de criptografia local com:

```bash
openssl rand -base64 32
```

Guarde essa chave em local seguro e configure a **mesma chave** no ambiente da API que já contém os tokens criptografados. Se ela for perdida/trocada, conexões existentes não poderão ser descriptografadas e os usuários precisarão reconectar suas contas.

Recrie somente a API local para carregar configuração e aplicar as migrações:

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d --build api
```

## Variáveis de produção

Configure no serviço `modalink-api` do Render, usando os nomes de configuração .NET:

- `Music__Spotify__ClientId`, `Music__Spotify__ClientSecret`, `Music__Spotify__RedirectUri`
- `Music__YouTube__ClientId`, `Music__YouTube__ClientSecret`, `Music__YouTube__RedirectUri`
- `Music__Deezer__ClientId`, `Music__Deezer__ClientSecret`, `Music__Deezer__RedirectUri`
- `Music__TokenEncryptionKey`
- `Frontend__BaseUrl=https://modalink-frontend.vercel.app`

O segredo de criptografia deve ser gerado uma vez e persistido como segredo da API. Não use valor diferente em reinicializações ou instâncias do mesmo ambiente.

## Permissões solicitadas

- **Spotify:** leitura de playlists privadas e colaborativas.
- **YouTube:** leitura de dados/playlist da conta autorizada pela YouTube Data API.
- **Deezer:** acesso básico e leitura/gerenciamento de biblioteca, conforme permissões disponíveis no aplicativo Deezer.

Conceda somente o acesso necessário e revise as políticas atuais de cada plataforma. Algumas playlists privadas podem aparecer na lista, mas o player incorporado ainda pode exigir login próprio, não permitir incorporação ou não tocar determinado conteúdo.

## Segurança e limitações

- Tokens são armazenados criptografados na tabela `MusicConnections`, por usuário e provedor.
- O navegador recebe apenas a lista de conexões e metadados das playlists; tokens de acesso/refresh nunca são enviados ao frontend.
- O estado OAuth é aleatório, vinculado ao usuário e expira após 10 minutos.
- O estado OAuth fica na memória da API; o fluxo exige que o callback retorne à mesma instância que iniciou a conexão.
- Desconectar remove a credencial armazenada no ModaLink; o usuário também pode revogar a autorização nas configurações do provedor.
- O endpoint de playlist busca até 50 itens por solicitação nesta primeira versão.
- Para reprodução, o ERP usa o player/widget oficial de cada serviço, sujeito ao login, disponibilidade e termos de uso do provedor.
- A leitura e reprodução de playlists não substituem licença de execução pública/comercial em uma loja física.

## Validação antes de uso

1. Preencher e proteger os segredos locais ou no Render.
2. Confirmar que os três redirect URIs estão cadastrados exatamente.
3. Aplicar a migração `AddMusicProviderConnections`.
4. Conectar uma conta de teste de cada provedor.
5. Conferir listagem e seleção de playlists, renovação de autorização e desconexão.
6. Confirmar no DevTools que tokens nunca aparecem em respostas ao navegador ou em logs.
