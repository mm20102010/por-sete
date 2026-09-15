# Por Sete 1.0.0 — criação do GitHub, clone local e primeira instalação

O nome canônico do projeto é `por-sete`.

- GitHub: `mm20102010/por-sete`
- Clone local: `~/Developer/MM/por-sete`
- Bundle iPhone: `br.com.mmregistro.porsete`
- Bundle Watch: `br.com.mmregistro.porsete.watchkitapp`
- Bundle complication: `br.com.mmregistro.porsete.watchkitapp.complications`

## 1. Atualizar MM Tools antes de criar o clone do Por Sete

Baixe `mm-tools-2.9.7-por-sete.zip` para `~/Downloads` e execute com a versão atual do MM Tools:

```bash
mm-update tools ~/Downloads/mm-tools-2.9.7-por-sete.zip "MM Tools 2.9.7 - suporte ao Por Sete" && mm-check tools
```

O `mm-update tools` executa os testes do próprio MM Tools antes de publicar e reinstalar os comandos. Se algum gate falhar, a atualização é revertida.

Confirme:

```bash
mm-help
```

A ajuda deve listar:

```text
por-sete    ~/Developer/MM/por-sete
```

## 2. Criar o repositório no GitHub

Na conta `mm20102010`, crie um novo repositório chamado exatamente:

```text
por-sete
```

Na criação inicial:

- deixe a branch padrão como `main`;
- marque **Add a README file**, para o repositório já nascer com um commit em `main`;
- não é necessário adicionar `.gitignore` ou licença nesta etapa.

A URL esperada será:

```text
https://github.com/mm20102010/por-sete.git
```

## 3. Criar o diretório oficial no Mac

Não crie `~/Developer/MM/por-sete` manualmente. Use o MM Tools atualizado:

```bash
cd ~/Developer/MM
mm-init-clone por-sete
```

O comando deve criar:

```text
~/Developer/MM/por-sete
```

Confirme:

```bash
cd ~/Developer/MM/por-sete
git status --short
git branch --show-current
git remote -v
```

Esperado:

- working tree limpa;
- branch `main`;
- `origin` apontando para `https://github.com/mm20102010/por-sete.git`.

## 4. Aplicar o projeto completo

Baixe `por-sete-1.0.0.zip` para `~/Downloads`.

Execute em um único comando:

```bash
mm-update por-sete ~/Downloads/por-sete-1.0.0.zip "Por Sete 1.0.0 - iPhone, Apple Watch e WebApp" && mm-check por-sete && mm-open por-sete
```

Esse fluxo:

1. atualiza o clone a partir de `origin/main`;
2. aplica o ZIP preservando `.git`;
3. roda os testes/gates do Por Sete;
4. sincroniza `public/` com o bundle Capacitor;
5. cria commit e publica na `main`;
6. executa uma nova validação;
7. abre o projeto no Xcode somente se tudo anterior tiver passado.

## 5. Primeira abertura no Xcode

O projeto contém três schemes compartilhados:

```text
Por Sete iPhone
Por Sete Watch App
Por Sete Watch Complications
```

### 5.1 Signing & Capabilities

No Xcode, selecione o projeto **App** e confirme **Automatically manage signing** e o seu Team nos três targets:

```text
App
Por Sete Watch App
Por Sete Watch Complications
```

Bundle IDs esperados:

```text
br.com.mmregistro.porsete
br.com.mmregistro.porsete.watchkitapp
br.com.mmregistro.porsete.watchkitapp.complications
```

O projeto foi preparado com o mesmo Team ID da baseline enviada do Dentes. Na primeira build, o Xcode pode solicitar registro dos novos identifiers/profiles.

### 5.2 Swift Package do Capacitor

O Capacitor está fixado via Swift Package Manager em `8.5.0`, seguindo a baseline do Dentes. Na primeira abertura, aguarde o Xcode resolver os packages antes de compilar.

### 5.3 Primeiro build do iPhone

Selecione:

```text
Scheme: Por Sete iPhone
Destino: seu iPhone
```

Faça **Product > Build** e depois execute o app.

Valide no iPhone:

- menu e configuração PT/EN/ES;
- Truncar/Arredondar;
- mínimo de casas e regra de zeros finais;
- três dificuldades;
- teclado e feedback visual;
- vitória, Game Over e recordes;
- funcionamento sem rede depois de instalado (o app nativo usa arquivos locais, não depende do PWA remoto).

## 6. Primeiro build do Apple Watch

Selecione:

```text
Scheme: Por Sete Watch App
Destino: Apple Watch pareado ou Simulator
```

Valide:

1. tela inicial `/7` + **Começar jogo**;
2. engrenagem na parte inferior;
3. configurações nesta ordem:
   - critério;
   - mínimo de casas;
   - dificuldade;
   - idioma por último;
4. tela do jogo com número + `÷ 7` + teclado;
5. separador decimal menor;
6. `0` em tamanho normal;
7. apagar menor;
8. Enter maior e destacado;
9. mudança de fases;
10. timeout no Intermediário/Avançado;
11. pausa ao enviar o app para background;
12. Vitória e Game Over.

A primeira versão do Watch é propositalmente autônoma: suas configurações ficam no próprio relógio e o jogo não depende de conexão com o iPhone.

## 7. Complication

Depois que o Watch App estiver instalado:

1. edite um mostrador compatível;
2. escolha uma posição de complication circular, corner ou inline;
3. selecione **Por Sete**;
4. confirme o ícone `/7`;
5. toque na complication e confirme que o Por Sete abre.

## 8. Atualizar o WebApp existente no Cloudflare

O mesmo projeto continua sendo a fonte do WebApp. A pasta canônica é:

```text
public/
```

O ZIP `por-sete-cloudflare-v18.zip` contém exatamente o conteúdo dessa pasta com `index.html` na raiz e pode substituir o deploy atual.

A v18 mantém a lógica da v17. As mudanças web são somente:

- detecção de execução dentro do Capacitor;
- ocultação do convite “Adicionar à Tela de Início” no app nativo;
- Service Worker desativado dentro do app nativo;
- páginas PT/EN/ES de Privacidade e Suporte.

URLs propostas:

```text
https://por-sete.pages.dev/privacy.html
https://por-sete.pages.dev/support.html
```

## 9. Fluxo normal depois da criação

Para futuras versões do Por Sete:

```bash
mm-update por-sete ~/Downloads/<arquivo.zip> "<mensagem>" && mm-check por-sete && mm-open por-sete
```

Para apenas validar:

```bash
mm-check por-sete
```

Para atualizar a partir do GitHub:

```bash
mm-sync por-sete
```

## 10. Observação sobre os dados do PWA e do app da App Store

O WebApp/PWA e o app nativo usam a mesma lógica e interface web no iPhone, mas **cada instalação possui seu próprio armazenamento local**. Portanto, recordes e configurações já existentes no PWA não são automaticamente importados para a instalação da App Store, e vice-versa.

Isso evita criar backend ou rastreamento apenas para sincronizar um jogo local. Uma futura função explícita de exportar/importar recordes pode ser adicionada se for desejável.
