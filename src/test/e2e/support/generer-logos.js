/* Genere les badges des operateurs mobile money (couleurs et formes de leurs logos), 128x128 png,
   dans resources/images/modes/. A remplacer par les logos officiels si l'officine les fournit. */
const { chromium } = require('playwright-core');
const path = require('path');
const DEST = path.resolve(__dirname, '../../../main/webapp/general/resources/images/modes');
const LOGOS = {
  ORANGE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FF7900"/>
    <g stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M28 82 L58 52"/><path d="M34 52 H58 V76"/><path d="M100 46 L70 76"/><path d="M94 76 H70 V52"/></g></svg>`,
  WAVE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#1DC3F5"/>
    <ellipse cx="64" cy="52" rx="18" ry="26" fill="#111"/><ellipse cx="64" cy="58" rx="9" ry="15" fill="#fff"/>
    <circle cx="58" cy="40" r="3" fill="#fff"/><circle cx="70" cy="40" r="3" fill="#fff"/><path d="M60 47 h8 l-4 4z" fill="#F7931E"/>
    <path d="M46 44 c-8 2 -12 10 -8 16" stroke="#111" stroke-width="7" fill="none" stroke-linecap="round"/>
    <text x="64" y="106" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="26" fill="#fff">wave</text></svg>`,
  DJAMO: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#000"/>
    <text x="64" y="75" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-style="italic" font-weight="900" font-size="30" fill="#fff">djamo</text></svg>`,
  MOOV: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect x="18" y="18" width="92" height="92" rx="14" transform="rotate(45 64 64)" fill="#F26522"/>
    <text x="64" y="58" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="22" fill="#1B4F9C">MOOV</text>
    <text x="64" y="84" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="22" fill="#fff">Money</text></svg>`,
  MTN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="18" fill="#FFCC00"/>
    <rect x="42" y="18" width="44" height="44" rx="8" fill="none" stroke="#0A4E7A" stroke-width="5"/>
    <path d="M52 50 l12 -20 c8 6 12 14 12 22 z" fill="#0A4E7A"/>
    <text x="64" y="94" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="26" fill="#0A4E7A">MoMo</text>
    <text x="64" y="112" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="12" fill="#0A4E7A">from MTN</text></svg>`
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 128, height: 128 }, deviceScaleFactor: 1 });
  for (const [code, svg] of Object.entries(LOGOS)) {
    await p.setContent('<html><body style="margin:0;background:transparent">' + svg.replace('<svg ', '<svg width="128" height="128" ') + '</body></html>');
    await p.screenshot({ path: path.join(DEST, code + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: 128, height: 128 } });
    console.log('ok ' + code);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
