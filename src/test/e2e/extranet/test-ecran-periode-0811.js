/* EXTRANETS GROSSISTES : période des listes (retour 2 de l'utilisateur, 08/11), par le vrai chemin de l'écran.
 * Autorisé par l'utilisateur le 08/11 : domain3, base laborex_audit telle quelle, CONSULTATION seulement. Ce test ne lit
 * rien sur les extranets (la seule lecture demandée est interceptée dans le navigateur avant de partir), n'enregistre
 * ni n'efface aucun compte et n'écrit rien en base.
 *
 * Rapprochement : pour chaque liste gardée, les lignes affichées (positions) = les lignes de l'API retenues par un
 * oracle indépendant (dates relues ici, règle « en cours pendant la période » pour Début / Fin, sinon une date dans la
 * période ; ligne sans date lisible gardée). Périodes : le jour (par défaut), une période saisie au clavier, « Toute
 * la période ». Liste sans colonne de date : champs masqués, tout affiché.
 * DPCI : « Lire sur l'extranet » envoie la période saisie (du, au) ; le serveur refuse une période à l'envers.
 * Bilan : aucune collecte ajoutée, comptes inchangés.
 *
 * Lancement : BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-ecran-periode-0811.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}
const ECRAN = 'extranetsgrossistes';
const pad = (n) => String(n).padStart(2, '0');
const aujourdhui = (() => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); })();

/* oracle indépendant de l'écran */
function dateDe(v) {
  const s = String(v == null ? '' : v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?!\d)/);
  if (m) { return m[1] + '-' + m[2] + '-' + m[3]; }
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})(?!\d)/);
  if (!m) { return null; }
  const j = Number(m[1]), mo = Number(m[2]);
  if (j < 1 || j > 31 || mo < 1 || mo > 12) { return null; }
  return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad(mo) + '-' + pad(j);
}
function retenues(colonnes, lignes, du, au) {
  const deb = colonnes.findIndex((t) => /^(date de )?d[ée]but/i.test(t)), fin = colonnes.findIndex((t) => /^(date de )?fin\b/i.test(t));
  const autres = colonnes.map((t, i) => i).filter((i) => i !== deb && i !== fin
    && /Date|Quinzaine|Année/.test(colonnes[i]) && !/Désignation|Produit|Libellé|Description|Nom|Montant|Total|Prix|^N°|^Code|^Référence/.test(colonnes[i]));
  return lignes.filter((l) => {
    const c = l.cellules || [];
    if (deb >= 0 || fin >= 0) {
      const d = deb >= 0 ? dateDe(c[deb]) : null, f = fin >= 0 ? dateDe(c[fin]) : null;
      if (d || f) { return (!d || d <= au) && (!f || f >= du); }
    }
    const lues = autres.map((i) => dateDe(c[i])).filter((x) => x);
    return lues.length === 0 || lues.some((x) => x >= du && x <= au);
  }).map((l) => l.position);
}

const LISTES = [
  { code: 'PROMOTIONS', chemin: ['Ubipharm', 'Produits', 'Promotions'], api: 'ubipharm/listes/' },
  { code: 'PRODUITS_UG', chemin: ['Produits avec UG'], api: 'ubipharm/listes/', sansDate: true },
  { code: 'TEDIS_SORTIES_RUPTURE', chemin: ['TEDIS', 'Produits', 'Nos sorties de rupture'], api: 'tedis/listes/' },
  { code: 'TEDIS_HISTORIQUE_COMMANDES', chemin: ['Commandes', 'Historique de vos commandes'], api: 'tedis/listes/' },
  { code: 'COPHARMED_PROMOTIONS', chemin: ['Copharmed', 'Promotions', 'Promotion'], api: 'copharmed/listes/' },
  { code: 'DPCI_OFFRES', chemin: ['DPCI', 'Mes offres en cours', 'Offres en cours'], api: 'dpci/listes/' },
  { code: 'DPCI_COMMANDES', chemin: ['Mes commandes', 'Mes commandes'], api: 'dpci/listes/' },
  { code: 'DPCI_BL', chemin: ['Mes documents', 'Bons de livraison'], api: 'dpci/listes/' }];

/* 09/11 : jamais un vrai extranet (sources dirigees vers 127.0.0.1, sinon arret) */
require('./garde-extranets').verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);

(async () => {
  const comptesAvant = q('SELECT CONCAT_WS(\'|\', source, modifie_le) FROM extranet_compte ORDER BY source');
  const collecteAvant = q('SELECT IFNULL(MAX(id), 0) FROM extranet_collecte');
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const interceptees = [];
  const LECTURE = /\/collecte(\?|$)|\/lectures\//;
  await p.route(LECTURE, (route) => {
    if (route.request().method() !== 'POST') { return route.continue(); }
    interceptees.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false, msg: 'Lecture interceptée par le test' }) });
  });
  const onglet = async (titres) => {
    for (const t of titres) {
      await p.evaluate((x) => { const tabs = Ext.ComponentQuery.query('extranetsgrossistes tab[text=' + x + ']').filter((b) => b.isVisible(true));
        if (!tabs.length) { throw new Error('Onglet absent : ' + x); } }, t);
      await vues.cliquer(p, ECRAN + ' tab[text=' + t + ']');
      await p.waitForTimeout(400);
    }
  };
  const saisirDate = async (itemId, texte) => {
    const id = await p.evaluate((i) => Ext.ComponentQuery.query('extranetsgrossistes #' + i)[0].inputEl.id, itemId);
    await p.click('#' + id);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texte, { delay: 20 });
    await p.keyboard.press('Tab');
    await p.waitForTimeout(300);
  };
  const etat = (code) => p.evaluate((c) => {
    const me = Ext.ComponentQuery.query('extranetsgrossistes')[0], id = 'exListe' + c, f = (s) => me.down('#' + id + s);
    const st = me.listes[c], pos = [];
    st.each((r) => { pos.push(r.get('position')); });
    return { pos, du: f('Du').getValue() && Ext.Date.format(f('Du').getValue(), 'Y-m-d'), au: f('Au').getValue() && Ext.Date.format(f('Au').getValue(), 'Y-m-d'),
      visibles: ['Du', 'Au', 'Tout'].map((s) => f(s).isVisible(true)), nombre: f('Nombre').el.dom.textContent, date: f('Date').el.dom.textContent };
  }, code);
  const comparer = (nom, attendu, e, total) => {
    const a = attendu; /* toutes les lignes dans la grille depuis le 08/11 (rendu par tampon, point 3) */
    ok(nom, a.length === e.pos.length && a.every((x, i) => x === e.pos[i])
      && e.nombre.indexOf(attendu.length + ' / ' + total + ' ligne(s)') === 0,
    'attendu ' + attendu.length + ' / ' + total + ', affiché ' + e.pos.length + ' « ' + e.nombre + ' »');
  };
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(2000);

    let vues0 = 0;
    for (const l of LISTES) {
      await onglet(l.chemin);
      await p.waitForFunction((c) => { const me = Ext.ComponentQuery.query('extranetsgrossistes')[0];
        return me.donnees && me.donnees[c] !== undefined && !me.down('#exListe' + c).el.isMasked(); }, l.code, { timeout: 60000 });
      const api = await p.evaluate((u) => fetch('../api/v1/extranet/' + u).then((r) => r.json()), l.api + l.code);
      const lignes = api.lignes || [], total = lignes.length;
      if (!total) { ok(l.code + ' : liste gardée vide, rien à comparer', true, 'ignorée'); continue; }
      vues0++;
      let e = await etat(l.code);
      if (l.sansDate) {
        ok(l.code + ' : sans colonne de date, champs de période masqués, tout affiché', e.visibles.every((v) => !v)
          && e.pos.length === total && e.nombre.indexOf(total + ' ligne(s)') === 0, JSON.stringify(e.visibles) + ' ' + e.nombre);
        continue;
      }
      ok(l.code + ' : Du et Au visibles, à la date du jour par défaut', e.visibles.every((v) => v) && e.du === aujourdhui && e.au === aujourdhui,
        JSON.stringify(e.visibles) + ' ' + e.du + '..' + e.au + ' — colonnes ' + JSON.stringify(api.colonnes));
      comparer(l.code + ' : le jour = oracle', retenues(api.colonnes, lignes, aujourdhui, aujourdhui), e, total);

      await saisirDate('exListe' + l.code + 'Du', '01/10/2026');
      e = await etat(l.code);
      comparer(l.code + ' : du 01/10/2026 au jour, saisi au clavier = oracle', retenues(api.colonnes, lignes, '2026-10-01', aujourdhui), e, total);
      await saisirDate('exListe' + l.code + 'Du', '15/11/2026');
      await saisirDate('exListe' + l.code + 'Au', '15/10/2026');
      e = await etat(l.code);
      comparer(l.code + ' : dates à l\'envers, remises dans l\'ordre (15/10 au 15/11) = oracle', retenues(api.colonnes, lignes, '2026-10-15', '2026-11-15'), e, total);

      await vues.cliquer(p, ECRAN + ' #exListe' + l.code + 'Tout');
      await p.waitForTimeout(300);
      e = await etat(l.code);
      ok(l.code + ' : « Toute la période » affiche tout', e.pos.length === total && e.nombre.indexOf(total + ' ligne(s)') === 0, e.nombre);
      await vues.cliquer(p, ECRAN + ' #exListe' + l.code + 'Tout');
      await saisirDate('exListe' + l.code + 'Du', Ext_jour());
      await saisirDate('exListe' + l.code + 'Au', Ext_jour());
    }
    ok('au moins 4 listes gardées vérifiées', vues0 >= 4, vues0);

    /* DPCI : la lecture demandée part avec la période saisie (interceptée avant l'extranet) */
    await onglet(['Mes commandes', 'Mes commandes']);
    await saisirDate('exListeDPCI_COMMANDESDu', '01/11/2026');
    const avant = interceptees.length;
    await vues.cliquer(p, ECRAN + ' #exListeDPCI_COMMANDESCollecter');
    await p.waitForTimeout(800);
    await vues.cliquer(p, ECRAN + ' #exListeDPCI_COMMANDESCollecter');
    await p.waitForTimeout(1500);
    const url = interceptees.slice(avant)[0] || '';
    ok('DPCI : « Lire sur l\'extranet » envoie du=2026-11-01 et au=le jour', /lectures\/dpci\/DPCI_COMMANDES\?du=2026-11-01&au=/.test(url)
      && url.endsWith('au=' + aujourdhui), url.replace(/^.*\/api/, '/api'));
    await p.unroute(LECTURE);
    const refus = await p.evaluate(() => fetch('../api/v1/extranet/dpci/listes/DPCI_BL/collecte?du=2026-11-09&au=2026-11-08', { method: 'POST' }).then((r) => r.json()));
    ok('serveur : période à l\'envers refusée sans rien lire', refus.success === false && /commence après sa fin/.test(refus.msg), JSON.stringify(refus));
    const refus2 = await p.evaluate(() => fetch('../api/v1/extranet/dpci/listes/DPCI_BL/collecte?du=2026-11-08', { method: 'POST' }).then((r) => r.json()));
    ok('serveur : une seule date refusée sans rien lire', refus2.success === false && /deux dates/.test(refus2.msg), JSON.stringify(refus2));

    ok('bilan : aucune collecte ajoutée', q('SELECT IFNULL(MAX(id), 0) FROM extranet_collecte') === collecteAvant);
    ok('bilan : comptes inchangés', q('SELECT CONCAT_WS(\'|\', source, modifie_le) FROM extranet_compte ORDER BY source') === comptesAvant);
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'periode-0811-erreur').catch(() => {});
  } finally {
    await navigateur.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();

function Ext_jour() { return aujourdhui.split('-').reverse().join('/'); }
