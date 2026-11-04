/* PILOTAGE, onglet « À suivre » : affichage progressif (demande du 04/11).
 *
 * Constat : au premier clic (calcul non garde en cache), l'onglet restait masque environ 5,5 s. Les courbes sont
 * pourtant calculees d'avance au demarrage et repondent en moins de 0,2 s, mais l'ecran ne les demandait qu'APRES la
 * reponse de GET pilotage/onglet/asuivre, qui lit les ruptures des 90 derniers jours (3,5 s sur la copie) et les
 * demandes de treize mois (1,4 s). Attendu : les courbes et la frequentation s'affichent tout de suite, les tuiles,
 * les alertes et les repartitions se remplissent quand leur calcul arrive.
 *
 * Vrai chemin : menu ANALYSE DE GESTION > Pilotage de l'officine, clic sur l'en-tete « À suivre ». Le calcul de
 * l'onglet doit etre froid (cache d'ecran de 5 min) : s'il repond trop vite, le test passe sur « Ventes », attend
 * l'expiration (ATTENTE_MS, 330000 par defaut) et reclique. Les reponses de l'onglet et des courbes sont resumees par
 * une empreinte, a comparer d'une version a l'autre (memes chiffres). Lecture seule.
 * Variables : BASE (adresse de Prestige), E2E_LOGIN, ATTENTE_MS.
 */
const crypto = require('crypto');
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion, ouvrirMenu } = require('../outils/vues');

/* courbes et frequentation visibles apres le clic, sans attendre le calcul de l'onglet */
const BUDGET_COURBES_MS = 1500;
/* onglet entierement rempli : il reste la lecture des ruptures sur 90 jours (3,5 s sur la copie) */
const BUDGET_COMPLET_MS = 4500;
const FROID_MS = 1000;
const ATTENTE_MS = Number(process.env.ATTENTE_MS || 330000);
const CARTES_RAPIDES = ['ca', 'encaisse', 'achats', 'tva', 'marge', 'panier', 'frequentation'];
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 600) + ']' : '')); }
/* empreinte du CONTENU : cles triees, nombres relus (une reponse resservie par le cache n'ecrit pas les cles ni les
   nombres dans le meme ordre ni sous la meme forme que la reponse calculee) */
const canonique = (v) => (Array.isArray(v) ? '[' + v.map(canonique).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonique(v[k])).join(',') + '}'
    : JSON.stringify(v));
const empreinte = (texte) => {
  let c = texte;
  try { c = canonique(JSON.parse(texte)); } catch (e) { /* reponse non JSON : texte brut */ }
  if (process.env.DUMP_DIR && /"ruptures"/.test(texte)) { require('fs').writeFileSync(require('path').join(process.env.DUMP_DIR, 'asuivre-' + Date.now() + '.json'), c); }
  return crypto.createHash('sha256').update(c).digest('hex').slice(0, 12);
};

(async () => {
  console.log('Serveur : ' + BASE);
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  let enVol = 0, dernier = Date.now();
  const reponses = [];
  const debuts = new Map();
  p.on('request', (r) => { enVol++; dernier = Date.now(); debuts.set(r, Date.now()); });
  const fini = () => { enVol = Math.max(0, enVol - 1); dernier = Date.now(); };
  p.on('requestfinished', fini); p.on('requestfailed', fini);
  p.on('response', async (r) => {
    const u = r.url();
    if (!/pilotage\/(onglet\/asuivre|suivi\/evolution)/.test(u)) { return; }
    const recu = Date.now();
    const corps = await r.text().catch(() => '');
    reponses.push({ recu, ms: recu - (debuts.get(r.request()) || recu), onglet: /onglet\/asuivre/.test(u),
      parametres: (u.split('?')[1] || '').split('&').filter((x) => !/^_dc=/.test(x)).join('&'), statut: r.status(), empreinte: empreinte(corps) });
  });
  const calme = async (limite) => {
    const fin = Date.now() + limite;
    while (Date.now() < fin) {
      if (enVol === 0 && Date.now() - dernier >= 400) {
        const masque = await p.evaluate(() => Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'), (m) => m.offsetParent !== null));
        if (!masque) { return Date.now() - 400; }
      }
      await p.waitForTimeout(50);
    }
    throw new Error('onglet toujours en chargement apres ' + limite + ' ms');
  };
  const onglet = async (id) => p.evaluate((i) => Ext.ComponentQuery.query('pilotage #onglets')[0].items.items
    .filter((o) => o.itemId === i)[0].tab.getId(), id);
  /* cartes encore « Chargement… » ; une carte des courbes cachee sous le masque de l'onglet n'est pas visible */
  const enAttente = (cartes) => p.evaluate((liste) => {
    const e = Ext.ComponentQuery.query('pilotage')[0];
    const o = e && e.down('#onglet-asuivre');
    const masque = o && o.el && o.el.isMasked();
    return liste.filter((c) => {
      const n = e && e.carteSuivi(c);
      return masque || !n || n.querySelector('.sv-attente') !== null;
    });
  }, cartes);
  const mesurer = async () => {
    const t0 = Date.now();
    await p.click('#' + await onglet('onglet-asuivre'));
    let tCourbes = null;
    while (Date.now() - t0 < 300000) {
      if ((await enAttente(CARTES_RAPIDES)).length === 0) { tCourbes = Date.now(); break; }
      await p.waitForTimeout(25);
    }
    const tFin = await calme(300000);
    const ong = reponses.filter((r) => r.onglet && r.recu >= t0)[0];
    return { t0, courbes: tCourbes === null ? null : tCourbes - t0, complet: tFin - t0, onglet: ong,
      restantes: await enAttente(['alertes', 'emplacements', 'familles'].concat(CARTES_RAPIDES)) };
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', "Pilotage de l'officine");
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e && e.isVisible(true) && e.down('#onglet-asuivre'); }, null, { timeout: 120000 });
    await calme(300000);

    let m = await mesurer();
    if (!m.onglet || m.onglet.ms < FROID_MS) {
      console.log('calcul de l onglet deja en cache (' + (m.onglet ? m.onglet.ms : '?') + ' ms) : attente de ' + Math.round(ATTENTE_MS / 1000) + ' s');
      await p.click('#' + await onglet('onglet-ventes'));
      await calme(120000);
      await p.waitForTimeout(ATTENTE_MS);
      m = await mesurer();
    }
    const ms = m.onglet ? m.onglet.ms : null;
    console.log(JSON.stringify({ courbes: m.courbes, complet: m.complet, ongletAsuivre: ms }));
    ok('Mesure a froid : le calcul de l onglet n etait pas en cache', ms !== null && ms >= FROID_MS, ms + ' ms');
    ok('Courbes et frequentation affichees sans attendre le calcul de l onglet', m.courbes !== null && m.courbes <= BUDGET_COURBES_MS,
      m.courbes + ' ms apres le clic, budget ' + BUDGET_COURBES_MS + ' ms ; calcul de l onglet ' + ms + ' ms');
    ok('Onglet entierement rempli dans son budget', m.complet <= BUDGET_COMPLET_MS, m.complet + ' ms, budget ' + BUDGET_COMPLET_MS + ' ms');
    ok('Toutes les cartes sont remplies a la fin', m.restantes.length === 0, m.restantes.join(', '));
    const vues = reponses.filter((r) => r.recu >= m.t0).map((r) => (r.onglet ? 'onglet ' : 'courbe ') + r.parametres + ' -> ' + r.statut + ' ' + r.empreinte).sort();
    console.log('EMPREINTES');
    vues.forEach((v) => console.log('  ' + v));
    ok('Reponses en succes', reponses.filter((r) => r.recu >= m.t0).every((r) => r.statut === 200), vues.length + ' reponses');

    /* ergonomie : changer de periode dans la liste de l'ecran recharge l'onglet, cartes et tuiles comprises */
    const t2 = Date.now();
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('pilotage #axe')[0].triggerEl.first().id));
    await p.locator('.x-boundlist-item').filter({ visible: true }).filter({ hasText: 'Vs mois précédent' }).first().click();
    await calme(300000);
    const apres = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const t = e.down('#tuiles-asuivre');
      return { tuiles: t.getStore().getCount(), reference: t.getStore().getAt(0) && t.getStore().getAt(0).get('libelleReference'),
        masque: !!(t.el && t.el.isMasked()) };
    });
    const ongletApres = reponses.filter((r) => r.onglet && r.recu >= t2);
    ok('Changement de periode : l onglet est recalcule et ses tuiles comparees a la nouvelle reference',
      ongletApres.length === 1 && /axe=VS_M1/.test(ongletApres[0].parametres) && apres.tuiles > 0 && !!apres.reference && !apres.masque,
      JSON.stringify(apres) + ' ; ' + ongletApres.map((r) => r.parametres.split('&')[0]).join(','));
    const restantes = await enAttente(['alertes', 'emplacements', 'familles'].concat(CARTES_RAPIDES));
    ok('Changement de periode : toutes les cartes sont remplies', restantes.length === 0, restantes.join(', '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 3)));
  } catch (e) {
    ok('Le test va jusqu au bout', false, String(e && e.message).slice(0, 300));
    await ENV_E2E.capture(p, 'echec');
  } finally {
    await b.close();
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log((res.length - echecs) + '/' + res.length + ' controles respectes');
  process.exit(echecs ? 1 : 0);
})();
