# Por Sete 1.0.0 — implementação nativa e testes

**Data:** 15/09/2026

## Escopo entregue

### Web / PWA

- `public/` continua sendo a fonte única do WebApp.
- A lógica da v17 foi preservada em `game-core.js`, `i18n.js` e `styles.css` sem alteração.
- Versão de assets/cache promovida para v18.
- `platform.js` passou a reconhecer runtime Capacitor.
- convite de instalação PWA e registro do Service Worker são desativados somente quando o mesmo frontend está dentro do app nativo.
- páginas de Privacidade e Suporte em português, inglês e espanhol.

### iPhone

- shell Capacitor/Swift baseado na arquitetura nativa enviada do Dentes.
- iPhone-only.
- iOS mínimo 15.
- Swift Package Manager com Capacitor 8.5.0 fixado.
- Privacy Manifest.
- nomes localizados via InfoPlist.strings.
- mesma base visual e funcional do WebApp.
- bundle `br.com.mmregistro.porsete`.

### Apple Watch

- SwiftUI nativo, watchOS 10+.
- paleta derivada do Dentes (azul-marinho/azul claro).
- tela inicial com `/7`, botão Começar jogo e engrenagem inferior.
- configurações locais, com idioma por último.
- critérios Truncar/Arredondar.
- mínimo Livre/1...10.
- dificuldades Iniciante/Intermediário/Avançado.
- 5 fases, 10 acertos por fase, 3 erros para Game Over.
- timer por pergunta nas dificuldades temporizadas.
- tempo de background excluído do cronômetro.
- teclado 1...9 + linha especial com separador decimal menor, 0 normal, apagar menor e Enter maior/destacado.
- matemática decimal exata, sem depender de Double para validar respostas.
- regra dos zeros finais preservada: zeros meramente formais podem ser omitidos.
- configurações armazenadas localmente com `@AppStorage`.

### Complication

- WidgetKit.
- ícone `/7`.
- families circular, corner e inline, seguindo o padrão do Dentes.
- strings PT/EN/ES para nome e descrição.
- bundle `br.com.mmregistro.porsete.watchkitapp.complications`.

### MM Tools 2.9.7

- novo projeto `por-sete`, alias `porsete`.
- caminho canônico `~/Developer/MM/por-sete`.
- URL `https://github.com/mm20102010/por-sete.git`.
- suporte adicionado a `mm-init-clone`, `mm-update`, `mm-check`, `mm-publish`, `mm-sync`, `mm-open` e `mm-help`.
- label executivo do `mm-check`: `POR SETE`.

## Verificações executadas neste ambiente

### JavaScript / Web

- `npm test`: **6/6 aprovados**.
- `npm run validate:repo`: aprovado.
- `npm run native:sync`: aprovado.
- `npm run native:validate`: aprovado.
- parse de todos os arquivos JS/MJS com Node 22: aprovado.
- `game-core.js` do projeto nativo comparado com a v17: **byte a byte idêntico**.
- `i18n.js` comparado com a v17: **byte a byte idêntico**.
- `styles.css` comparado com a v17: **byte a byte idêntico**.

A suíte web inclui:

- truncamento e arredondamento exatos;
- regra de zeros finais;
- 50 acertos para vitória;
- 3 erros para Game Over;
- stress para 1.000 numeradores × 2 critérios × 7 precisões.

### Swift / Watch

- `swiftc -parse` em todos os Swift de iPhone, Watch e complication: aprovado.
- `WatchGameMath.swift` foi compilado como código Swift executável separado do SwiftUI e executado neste ambiente.
- validação exata para numeradores 0...999, Truncar/Arredondar e precisões 0...20: aprovada (mais de 42 mil combinações), além de casos explícitos de zeros finais.

### Recursos/projeto

- JSON e String Catalogs parseados: aprovados.
- Plists, Privacy Manifests e entitlements validados por `plutil`: aprovados.
- bundle IDs, versões, deployment targets e targets do Xcode verificados pelo gate do repositório.
- `public/ -> native-web/ -> ios/App/App/public/` sincronizado e validado.

### MM Tools

- foram feitas verificações estáticas para confirmar que os seis comandos principais reconhecem `por-sete|porsete`, o caminho canônico, a URL oficial e o label `POR SETE`.
- as alterações nos comandos existentes são aditivas: versão + novo case/URL/ajuda, sem mudança da lógica transacional existente.

**Limitação do ambiente:** não há `zsh` instalado neste container, portanto a suíte `test-mm-tools.sh` não pôde ser executada aqui. No Mac, `mm-update tools ...` roda essa suíte automaticamente antes de publicar/reinstalar e faz rollback se houver falha.

## Validação que ainda exige Mac/Xcode/dispositivo Apple

Este ambiente não possui Xcode, iOS Simulator ou watchOS Simulator. Portanto ainda é necessário no Mac:

- resolver o Swift Package Capacitor no Xcode;
- compilar os três targets com SDK Apple real;
- validar signing/provisioning;
- executar no iPhone;
- executar no Apple Watch/Simulator;
- adicionar/tocar a complication em mostrador real;
- confirmar layout em diferentes tamanhos físicos do Watch.

O parse Swift e os gates reduzem riscos de sintaxe/estrutura, mas não substituem uma build com os SDKs Apple.

## Decisões intencionais

1. **Watch autônomo na v1.** Não há necessidade funcional de WatchConnectivity para jogar; eliminar essa dependência reduz complexidade e falhas de sincronização.
2. **Sem backend para recordes.** O WebApp, iPhone e Watch continuam locais; não há conta, tracking ou servidor apenas para o ranking.
3. **Mesma fonte Web para WebApp e iPhone.** Evita divergência entre a versão web e o app da App Store.
4. **Lógica do Watch em Swift.** Necessária para um app watchOS nativo e independente; a matemática foi isolada em `WatchGameMath.swift` para ficar testável sem UI.
