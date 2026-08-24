import { mkdir, writeFile } from 'node:fs/promises';

const publicUrl = 'https://tournament-maker-jp.official-club.chatgpt.site';
const page = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=${publicUrl}" />
    <title>トーナメントメーカー</title>
    <script>location.replace(${JSON.stringify(publicUrl)});</script>
  </head>
  <body><a href="${publicUrl}">トーナメントメーカーを開く</a></body>
</html>`;

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', page, 'utf8');
