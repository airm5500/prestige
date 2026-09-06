/* Point 9 : la mise en page des colonnes de l'ecran Inventaire doit survivre a la sortie
   du menu, dans les deux sens (colonne decochee qui restait masquee, colonne cochee qui
   restait affichee), et rester propre a l'utilisateur connecte. */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 200) + ']' : '')); }

const URL = 'http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr';

async function session(b, login) {
  const ctx = await b.newContext({ viewport: { width: 1700, height: 950 } });
  const p = await ctx.newPage();
  const err = [];
  p.on('pageerror', e => err.push(String(e.message)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', login); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3500);
  p.ouvrir = async (x, t) => {
    await p.evaluate(([x, t]) => testextjs.app.getController('App').onLoadNewComponent(x, t, ''), [x, t]);
    await p.waitForTimeout(4000);
  };
  p.etat = () => p.evaluate(() => {
    const g = Ext.ComponentQuery.query('inventaire')[0];
    if (!g) return null;
    return g.headerCt.items.items.filter(c => c.dataIndex)
        .map(c => ({ di: c.dataIndex, h: !!c.hidden }));
  });
  p.erreurs = err;
  return { ctx, p };
}
const cache = (e, di) => (e.find(c => c.di === di) || {}).h;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });

  // ---- utilisateur 1 ----
  const s1 = await session(b, 'KGA3');
  const p = s1.p;
  await p.ouvrir('inventaire', 'Inventaire');
  const depart = await p.etat();
  ok('grille inventaire ouverte avec des colonnes', !!depart && depart.length > 0, JSON.stringify(depart));

  const visible = depart.find(c => !c.h && c.di !== 'bl_A_SUPPRIMER');
  const masquee = depart.find(c => c.h);
  ok('une colonne affichee et une colonne masquee au depart', !!visible && !!masquee,
     JSON.stringify({ visible, masquee }));

  // on inverse les deux
  await p.evaluate(([a, b2]) => {
    const g = Ext.ComponentQuery.query('inventaire')[0];
    g.headerCt.items.items.filter(c => c.dataIndex === a).forEach(c => c.setVisible(false));
    g.headerCt.items.items.filter(c => c.dataIndex === b2).forEach(c => c.setVisible(true));
  }, [visible.di, masquee.di]);
  await p.waitForTimeout(1500);

  // sortie du menu puis retour
  await p.ouvrir('famillemanager', 'Fiche article');
  await p.ouvrir('inventaire', 'Inventaire');
  const apres = await p.etat();
  ok('la colonne decochee reste masquee au retour dans le menu',
     cache(apres, visible.di) === true, visible.di + ' -> ' + JSON.stringify(cache(apres, visible.di)));
  ok('la colonne cochee reste affichee au retour dans le menu',
     cache(apres, masquee.di) === false, masquee.di + ' -> ' + JSON.stringify(cache(apres, masquee.di)));

  const cles = await p.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('prestige-') === 0));
  ok('la mise en page est rangee sous l identifiant de l utilisateur',
     cles.some(k => /^prestige-\d+-grille-inventaires$/.test(k)), cles.join(' | '));

  // ---- utilisateur 2, meme navigateur : sa presentation ne doit pas avoir bouge ----
  const s2 = await session(b, 'WANE');
  await s2.p.ouvrir('inventaire', 'Inventaire');
  const autre = await s2.p.etat();
  ok('la presentation d un autre utilisateur n est pas modifiee',
     autre && cache(autre, visible.di) === false && cache(autre, masquee.di) === true,
     JSON.stringify({ [visible.di]: cache(autre, visible.di), [masquee.di]: cache(autre, masquee.di) }));

  ok('aucune erreur JavaScript', p.erreurs.length === 0 && s2.p.erreurs.length === 0,
     p.erreurs.concat(s2.p.erreurs).join(' || '));

  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
