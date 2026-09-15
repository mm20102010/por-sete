# Por Sete

Aplicativo de divisão por 7 para Web/PWA, iPhone e Apple Watch.

## Arquitetura

- `public/`: fonte única do WebApp, publicada no Cloudflare Pages e usada pelo iPhone.
- `native-web/`: gerado por `npm run native:prepare` (não editar).
- `ios/App/App/public/`: gerado por `npm run native:sync` (não editar).
- iPhone: Capacitor/Swift, iPhone-only, iOS 15+.
- Apple Watch: SwiftUI, watchOS 10+, configurações locais no relógio.
- Complication: WidgetKit com o ícone `/7`.

## Validação

```bash
npm test
npm run repo:gate
```

## Cloudflare

Use `public/` como diretório de saída do Pages. Para upload manual, compacte somente o conteúdo de `public/`.

## URLs de App Store

- Suporte: `https://por-sete.pages.dev/support.html`
- Privacidade: `https://por-sete.pages.dev/privacy.html`
