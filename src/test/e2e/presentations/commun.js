/* PRESENTATIONS A L'ESSAI DES SAISIES (proposition du 04/11) : aide commune aux trois tests d'ecran.
 *
 * Lancement (un test a la fois), sur domain3 et sa copie de test laborex_audit :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node src/test/e2e/presentations/test-presentations-suggestion.js
 *
 * Chaque test cree ses propres documents (prefixe E2E-PS-), sauve les fiches produits qu'il touche et retire tout a
 * la fin, meme en cas d'echec. Les clics sont ceux de l'utilisateur : menu, recherche dans la liste, icone de la
 * ligne, selecteur « Présentation », champs et boutons de la variante.
 */
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const { execFileSync } = require('child_process');

const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const liste = (a) => a.map((x) => `'${x}'`).join(',');

const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : ''));
}
function bilan() {
  const ko = res.filter((r) => !r.c);
  console.log('\n' + (res.length - ko.length) + ' / ' + res.length + ' PASS' + (ko.length ? ' ; échecs : ' + ko.map((r) => r.n).join(' | ') : ''));
  return ko.length ? 1 : 0;
}

/* deux produits ordinaires (sans controle de peremption, sans deconditionnement) avec du stock et un grossiste */
function produits(n) {
  return q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, f.int_CIP, f.int_PAF, f.int_PRICE, s.int_NUMBER_AVAILABLE) FROM t_famille f"
    + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 100 AND f.int_PAF > 50 AND s.int_NUMBER_AVAILABLE BETWEEN 1 AND 40"
    + " AND COALESCE(f.bool_CHECKEXPIRATIONDATE, 0) = 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{6,8}$'"
    + " AND f.lg_GROSSISTE_ID IS NOT NULL AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
    + " ORDER BY f.lg_FAMILLE_ID LIMIT " + n + " OFFSET 11").split(/\r?\n/).filter(Boolean)
    .map((l) => { const [id, g, cip, paf, prix, stock] = l.split('|'); return { id, g, cip, paf: Number(paf), prix: Number(prix), stock: Number(stock) }; });
}

/* sauvegarde des fiches produits touchees (le declencheur de t_order_detail et les API de quantite peuvent les modifier) */
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];
function sauver(suffixe, ids) {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_ps_${suffixe}_${t}; CREATE TABLE e2e_ps_${suffixe}_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${liste(ids)});`));
}
function remettre(suffixe) {
  SAUVE.forEach((t) => {
    if (q(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'e2e_ps_${suffixe}_${t}'`) === '1') {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', column_name, '\` = VALUES(\`', column_name, '\`)')) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_ps_${suffixe}_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_ps_${suffixe}_${t};`);
    }
  });
}

async function demarrer(chromium) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message || e)));
  p.on('dialog', (d) => { erreurs.push('dialogue : ' + d.message()); d.dismiss().catch(() => {}); });
  await connexion(p, ENV_E2E.LOGIN, 'e2etest');
  return { b, p, erreurs };
}

/* menu, recherche de la reference dans la liste (frappe + Entree), puis clic sur l'icone de la ligne */
async function ouvrirDocument(p, menu, xtypeListe, champRef, ref, infobulle) {
  await ouvrirMenu(p, 'GESTION DES COMMANDES', menu);
  await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), xtypeListe, { timeout: 60000 });
  await p.waitForTimeout(600);
  const champ = await p.evaluate(() => { const c = Ext.getCmp('rechecher'); return c && c.inputEl ? c.inputEl.dom.id : null; });
  await p.click('#' + champ);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(ref, { delay: 15 });
  await p.keyboard.press('Enter');
  await p.waitForFunction(([x, c, r]) => { const g = Ext.ComponentQuery.query(x)[0]; const st = g && g.getStore();
    return st && !st.isLoading() && st.findExact(c, r) >= 0; }, [xtypeListe, champRef, ref], { timeout: 60000 });
  await p.evaluate(([x, c, r, t]) => { const g = Ext.ComponentQuery.query(x)[0]; const i = g.getStore().findExact(c, r);
    const n = g.getView().getNode(i); const img = [...n.querySelectorAll('img')].find((e) => e.getAttribute('data-qtip') === t);
    img.setAttribute('data-e2e', 'ouvrir'); }, [xtypeListe, champRef, ref, infobulle]);
  await p.click('[data-e2e=ouvrir]');
}

/* clic sur le selecteur « Présentation » ; l'ecran se rouvre avec la variante (ou l'ecran actuel) */
async function choisirPresentation(p, v) {
  await p.click(`.pp-selecteur button[data-pp-v="${v}"]`);
  if (v === 'actuel') {
    await p.waitForFunction(() => !document.querySelector('.pp-vue') && document.querySelector('.pp-selecteur button.on[data-pp-v="actuel"]'), null, { timeout: 60000 });
  } else {
    await p.waitForFunction((x) => { const e = window.PrestigePresentations.etat(); return e && e.v === x && e.charge && !document.querySelector('.pp-attente'); }, v, { timeout: 60000 });
  }
  await p.waitForTimeout(700);
}

const attendreCalme = (p) => p.waitForFunction(() => { const e = window.PrestigePresentations.etat(); return !e || !e.enCours; }, null, { timeout: 30000 })
  .then(() => p.waitForTimeout(900));

/* valeur numerique d'un total de la variante (separateurs retires) */
const total = (p, cle) => p.evaluate((c) => { const el = document.querySelector(`.pp-vue [data-pp-total="${c}"]`);
  return el ? Number(el.textContent.split('/')[0].replace(/[^\d-]/g, '')) : null; }, cle);

/* champ de quantite de la ligne : clic, tout selectionner, frappe, Entree (comme l'utilisateur) */
async function saisirQuantite(p, ligneId, valeur) {
  const sel = `.pp-vue input[data-pp-qte="${ligneId}"]`;
  await p.click(sel);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(valeur), { delay: 30 });
  await p.keyboard.press('Enter');
  await attendreCalme(p);
}

/* ergonomie et lisibilite : rien ne deborde de la page ni n'est coupe, boutons dans l'ecran, selecteur lisible */
async function ergonomie(p, nom) {
  const r = await p.evaluate(() => {
    const vue = document.querySelector('.pp-vue');
    const sel = document.querySelector('.pp-selecteur');
    const hors = [], coupes = [];
    const vw = window.innerWidth, vh = window.innerHeight;
    const boutons = [...document.querySelectorAll('.pp-vue .pp-btn, .pp-selecteur button')].filter((b) => b.offsetWidth > 0);
    boutons.forEach((b) => { const r = b.getBoundingClientRect();
      if (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1) { hors.push(b.textContent.trim()); }
      if (b.scrollWidth > b.clientWidth + 2) { coupes.push(b.textContent.trim()); } });
    const cadre = vue ? vue.querySelector('.pp-cadre') : null;
    const s = sel ? sel.getBoundingClientRect() : null;
    const tailles = [...document.querySelectorAll('.pp-vue td, .pp-vue .pp-btn')].slice(0, 200).map((e) => parseFloat(getComputedStyle(e).fontSize));
    return {
      selecteur: !!(s && s.width > 0 && s.top >= 0 && s.right <= vw),
      debordePage: document.documentElement.scrollWidth > vw + 1,
      debordeCadre: cadre ? cadre.scrollWidth > cadre.clientWidth + 1 : false,
      hors, coupes, policeMin: tailles.length ? Math.min(...tailles) : 12
    };
  });
  ok(nom + ' : sélecteur « Présentation » visible dans l\'écran', r.selecteur);
  ok(nom + ' : pas de défilement horizontal de la page ni du cadre', !r.debordePage && !r.debordeCadre, JSON.stringify({ page: r.debordePage, cadre: r.debordeCadre }));
  ok(nom + ' : boutons entièrement visibles (ni hors écran ni coupés)', !r.hors.length && !r.coupes.length, JSON.stringify({ hors: r.hors, coupes: r.coupes }));
  ok(nom + ' : texte lisible (police ≥ 11 px)', r.policeMin >= 11, r.policeMin);
  await ENV_E2E.capture(p, nom);
}

/* boutons de la variante, par leur libelle */
const boutonsVariante = (p) => p.evaluate(() => [...document.querySelectorAll('.pp-vue .pp-btn')].filter((b) => b.offsetWidth > 0).map((b) => b.textContent.trim()));

module.exports = { ENV_E2E, q, exec, liste, ok, bilan, produits, sauver, remettre, demarrer, ouvrirDocument, choisirPresentation,
  attendreCalme, total, saisirQuantite, ergonomie, boutonsVariante };
