/* MONOGRAPHIES DS PHARMAGORA (retours du 07/10) : fiche article et interactions, contre un faux service local qui sert
 * les pages d'exemple fournies (le vrai site n'est pas joignable depuis le banc).
 * Jeu d'essai : trois articles existants (CIP « A » = DOLIPRANE par la page de presentation, « B » = produit fictif de
 * classe Antivitamines K par lien direct, « C » = rien trouve). Les parametres sont remis et le cache vide a la fin.
 *  - API : recherche CIP -> produit, fiche posologie et interactions, cache (le site n'est pas rappele), absence
 *    memorisee, interactions A+B (paracetamol / AVK) et A+C (rien, C sans fiche), panne (derniere fiche connue ou
 *    message), rubrique et article invalides, service coupe ;
 *  - ecran : section MONOGRAPHIE du detail de la fiche, rubriques, interactions colorees, rien de tronque ; section
 *    masquee si le service est coupe ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const faux = require('./faux-pharmagora');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const SORTIE = process.env.SORTIE || '/tmp';
const CLES = ['KEY_MONOGRAPHIE_ACTIF', 'KEY_MONOGRAPHIE_URL', 'KEY_MONOGRAPHIE_DELAI_SEC'];
const avant = {};
CLES.forEach((k) => { avant[k] = q("SELECT IFNULL(MAX(str_VALUE), '') FROM t_parameters WHERE str_KEY = '" + k + "'"); });
const param = (k, v) => exec("UPDATE t_parameters SET str_VALUE = '" + v + "' WHERE str_KEY = '" + k + "'");
const arts = q("SELECT CONCAT(lg_FAMILLE_ID, '|', int_CIP, '|', str_NAME) FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP REGEXP '^[0-9]{7}$'"
  + " ORDER BY str_NAME LIMIT 3 OFFSET 10").split('\n').map((l) => l.split('|'));
const [A, B, C] = arts;
function nettoyer() {
  exec("DELETE FROM t_monographie WHERE str_PRODUIT IN ('506504', '900001');"
    + "DELETE FROM t_monographie_produit WHERE lg_FAMILLE_ID IN ('" + A[0] + "', '" + B[0] + "', '" + C[0] + "')");
}

(async () => {
  const site = await faux.demarrer(A[1], B[1]);
  nettoyer();
  param('KEY_MONOGRAPHIE_URL', 'http://127.0.0.1:' + site.port + '/diivision/');
  param('KEY_MONOGRAPHIE_ACTIF', '1');
  param('KEY_MONOGRAPHIE_DELAI_SEC', '3');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (u, corps) => p.evaluate(async (a) => JSON.parse(await (await fetch(a.u, a.c ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.c) } : {})).text()), { u, c: corps });
  const M = '../api/v1/monographie/';
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* ---------------- API */
    const e = await api(M + 'etat');
    ok('État : service actif, 7 rubriques, interactions à la vente coupées par défaut', e.actif === true && e.rubriques.length === 7 && e.interactionsVente === false, JSON.stringify(e));
    let n0 = site.appels;
    const f1 = await api(M + 'fiche/' + A[0] + '?rubrique=1');
    ok('CIP A : produit trouvé par la page de présentation (3 appels : recherche, présentation, fiche)', f1.success && f1.trouve && site.appels - n0 === 3
      && q("SELECT CONCAT(str_STATUT, '|', str_PRODUIT, '|', str_CIP) FROM t_monographie_produit WHERE lg_FAMILLE_ID = '" + A[0] + "'") === 'TROUVE|506504|' + A[1], JSON.stringify(f1).slice(0, 300));
    ok('Posologie : titre, rubriques du menu et paragraphes lisibles (accents réparés)', /DOLIPRANE/.test(f1.fiche.titre) && f1.fiche.rubriques.length >= 5
      && f1.fiche.paragraphes.length > 3 && f1.fiche.paragraphes.join(' ').includes('POSOLOGIE') && !/Ã©/.test(JSON.stringify(f1.fiche)), JSON.stringify(f1.fiche.paragraphes.slice(0, 4)));
    n0 = site.appels;
    const f1b = await api(M + 'fiche/' + A[0] + '?rubrique=1');
    ok('Deuxième lecture : servie par le cache, le site n\'est pas rappelé', f1b.success && f1b.trouve && site.appels === n0 && JSON.stringify(f1b.fiche) === JSON.stringify(f1.fiche));
    const f3 = await api(M + 'fiche/' + A[0] + '?rubrique=3');
    const classes = (f3.fiche && f3.fiche.interactions || []).map((c) => c.classe);
    const avk = ((f3.fiche && f3.fiche.interactions || [])[0] || { avec: [] }).avec.find((x) => /Antivitamines K/i.test(x.classe));
    ok('Interactions (rubrique 3) : classe Paracétamol, AVK en précaution d\'emploi avec conseil', classes.length >= 1 && classes.some((c) => /Parac.tamol/.test(c)) && avk && avk.gravite === 2 && /INR/.test(avk.conseilDispensateur || ''), JSON.stringify(classes) + JSON.stringify(avk));
    n0 = site.appels;
    const fc = await api(M + 'fiche/' + C[0] + '?rubrique=1');
    const fc2 = await api(M + 'fiche/' + C[0] + '?rubrique=1');
    ok('CIP C : « aucune monographie » ; l\'absence est mémorisée (1 seul appel au site)', fc.success && fc.trouve === false && /Aucune monographie/.test(fc.msg) && fc2.trouve === false && site.appels - n0 === 1
      && q("SELECT str_STATUT FROM t_monographie_produit WHERE lg_FAMILLE_ID = '" + C[0] + "'") === 'ABSENT', JSON.stringify(fc));
    const i1 = await api(M + 'interactions', { articles: [A[0], B[0]] });
    const al = (i1.alertes || [])[0] || {};
    ok('Interactions A + B : une alerte paracétamol / AVK, précaution d\'emploi, noms des articles', i1.success && i1.alertes.length === 1 && al.gravite === 2
      && [al.nomA, al.nomB].sort().join('|') === [A[2], B[2]].sort().join('|') && i1.sansFiche.length === 0, JSON.stringify(i1).slice(0, 400));
    const i2 = await api(M + 'interactions', { articles: [A[0], C[0], A[0]] });
    ok('Interactions A + C (+ doublon) : aucune alerte, C signalé sans fiche', i2.success && i2.alertes.length === 0 && i2.sansFiche.length === 1 && i2.sansFiche[0].id === C[0], JSON.stringify(i2));
    site.panne = true;
    const fp = await api(M + 'fiche/' + A[0] + '?rubrique=1&relire=true');
    ok('Panne + « Relire » : dernière fiche connue, signalée comme ancienne', fp.success && fp.trouve && fp.ancienne === true && /DOLIPRANE/.test(fp.fiche.titre), JSON.stringify(fp).slice(0, 200));
    const fp2 = await api(M + 'fiche/' + B[0] + '?rubrique=6');
    ok('Panne sans fiche connue : message clair, rien d\'enregistré', fp2.success === false && /ne répond pas/.test(fp2.msg)
      && q("SELECT COUNT(*) FROM t_monographie WHERE str_PRODUIT = '900001' AND int_RUBRIQUE = 6") === '0', JSON.stringify(fp2));
    site.panne = false;
    const r99 = await api(M + 'fiche/' + A[0] + '?rubrique=99'), rx = await api(M + 'fiche/inexistant-e2e?rubrique=1'), rt = await api(M + 'fiche/' + A[0] + '?rubrique=abc');
    const rj = await p.evaluate(async () => (await fetch('../api/v1/monographie/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{pas du json' })).text());
    ok('Saisies invalides refusées : rubrique 99, article inconnu, rubrique non numérique, corps illisible', r99.success === false && /Rubrique/.test(r99.msg) && rx.success === false && /introuvable/.test(rx.msg)
      && rt.success === false && /Rubrique/.test(rt.msg) && /illisible/.test(rj), JSON.stringify([r99, rx, rt]).slice(0, 300) + rj);
    param('KEY_MONOGRAPHIE_URL', 'javascript:alert(1)');
    const fu = await api(M + 'fiche/' + B[0] + '?rubrique=1&relire=true');
    ok('Adresse du service invalide : refus propre, aucune requête', fu.success === false && /ne répond pas/.test(fu.msg), JSON.stringify(fu));
    param('KEY_MONOGRAPHIE_URL', 'http://127.0.0.1:' + site.port + '/diivision/');

    /* ---------------- Ecran : detail de la fiche article */
    const ouvrirDetail = async (art) => {
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
      await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.fmField('rechecher').setValue(cip); g.onRechClick(); }, art[1]);
      await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, art[0], { timeout: 30000 });
      await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, art[0]);
      await p.waitForFunction(() => Ext.ComponentQuery.query('#monographieDetail').length > 0, null, { timeout: 30000 });
    };
    await ouvrirDetail(A);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('#monographieDetail')[0]; return c.getEl() && c.getEl().dom.querySelector('.mono-titre'); }, null, { timeout: 30000 });
    await p.evaluate(() => { const s = Ext.ComponentQuery.query('#monographieSection')[0]; s.getEl().dom.scrollIntoView(); });
    await p.waitForTimeout(500);
    const v1 = await p.evaluate(() => { const d = Ext.ComponentQuery.query('#monographieDetail')[0].getEl().dom;
      const tronques = [...d.querySelectorAll('.mono-rub')].filter((x) => x.scrollWidth > x.clientWidth + 1).length;
      return { rub: d.querySelectorAll('.mono-rub').length, actif: (d.querySelector('.mono-rub.actif') || {}).textContent, titre: d.querySelector('.mono-titre').textContent,
        p: d.querySelectorAll('.mono-corps p').length, etat: d.querySelector('.mono-etat').textContent, tronques, deborde: d.scrollWidth > d.clientWidth + 1 }; });
    ok('Écran : section MONOGRAPHIE, 7 rubriques, Posologie ouverte, texte et source affichés, rien de tronqué', v1.rub === 7 && v1.actif === 'Posologie' && /DOLIPRANE/.test(v1.titre) && v1.p > 3
      && /DS Pharmagora/.test(v1.etat) && /lue le/.test(v1.etat) && v1.tronques === 0 && !v1.deborde, JSON.stringify(v1));
    await p.screenshot({ path: SORTIE + '/monographie-posologie.png' });
    /* retours du 08/10 : tout le texte visible et la fin atteignable par defilement, sans redimensionner la fenetre */
    await p.waitForTimeout(400);
    const v1b = await p.evaluate(() => { const c = Ext.ComponentQuery.query('#monographieDetail')[0]; const d = c.getEl().dom;
      let s = d.parentElement; while (s && !(/(auto|scroll)/.test(getComputedStyle(s).overflowY) && s.scrollHeight > s.clientHeight)) { s = s.parentElement; }
      const coupe = d.getBoundingClientRect().height + 1 < d.querySelector('.mono').getBoundingClientRect().height;
      if (s) { s.scrollTop = s.scrollHeight; }
      const fin = d.querySelector('.mono-etat').getBoundingClientRect(), cadre = s ? s.getBoundingClientRect() : { top: 0, bottom: innerHeight };
      return { coupe, defile: !!s, finVisible: fin.bottom <= cadre.bottom + 1 && fin.top >= cadre.top - 1 }; });
    ok('Monographie : texte entier (rien de coupé), fin atteignable par la barre de défilement, sans redimensionner', !v1b.coupe && v1b.defile && v1b.finVisible, JSON.stringify(v1b));
    await p.click('.mono-rub[data-rub="3"]');
    await p.waitForFunction(() => document.querySelector('.mono-inter'), null, { timeout: 30000 });
    const v2 = await p.evaluate(() => { const d = document.querySelector('.mono'); const g2 = d.querySelector('.mono-inter.g2');
      return { n: d.querySelectorAll('.mono-inter').length, actif: d.querySelector('.mono-rub.actif').textContent, g2: !!g2, txt: g2 ? g2.textContent : '',
        bord: g2 ? getComputedStyle(g2).borderLeftColor : '', ordre: [...d.querySelectorAll('.mono-inter')].map((x) => +x.className.replace(/\D/g, '')) }; });
    const trie = v2.ordre.every((g, i) => i === 0 || v2.ordre[i - 1] >= g);
    ok('Clic « Interactions » : interactions affichées, triées par gravité, précaution colorée avec conseil', v2.n >= 1 && v2.actif === 'Interactions' && v2.g2 && /Antivitamines K/.test(v2.txt)
      && /Conseil (au dispensateur|\(dispensateur)/.test(v2.txt) && v2.bord === 'rgb(212, 165, 20)' && trie, JSON.stringify(v2).slice(0, 300));
    await p.screenshot({ path: SORTIE + '/monographie-interactions.png' });
    await p.evaluate(() => Ext.ComponentQuery.query('#monographieDetail')[0].up('window').close());
    await p.waitForTimeout(500);
    await ouvrirDetail(C);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('#monographieDetail')[0]; return c.getEl() && /Aucune monographie/.test(c.getEl().dom.textContent); }, null, { timeout: 30000 });
    ok('Article sans monographie : message dans la section, sans fenêtre', await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length === 0));
    await p.evaluate(() => Ext.ComponentQuery.query('#monographieDetail')[0].up('window').close());
    param('KEY_MONOGRAPHIE_ACTIF', '0');
    const ec = await api(M + 'etat'), fco = await api(M + 'fiche/' + A[0] + '?rubrique=1');
    ok('Service coupé : état inactif, fiche refusée', ec.actif === false && fco.success === false && /coupées/.test(fco.msg));
    await ouvrirDetail(A);
    await p.waitForTimeout(2000);
    ok('Service coupé : section MONOGRAPHIE masquée dans le détail', await p.evaluate(() => Ext.ComponentQuery.query('#monographieSection')[0].isHidden()));
    await p.evaluate(() => Ext.ComponentQuery.query('#monographieDetail')[0].up('window').close());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Exécution sans exception', false, x.stack);
  } finally {
    CLES.forEach((k) => param(k, avant[k]));
    nettoyer();
    await b.close();
    await site.fermer();
    const f = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - f) + '/' + res.length + ' OK');
    process.exit(f ? 1 : 0);
  }
})();
