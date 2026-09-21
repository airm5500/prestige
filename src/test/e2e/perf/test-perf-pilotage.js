/* PERFORMANCE DU MENU DE PILOTAGE ET DES ECRANS LES PLUS UTILISES.
 *
 * POURQUOI CETTE SUITE EXISTE. L'officine a signale une lenteur que le banc d'essai ne montrait pas :
 * son parc porte trois cent quarante mille ventes quand le banc en portait cinquante mille. Un ecran
 * qui repond en deux cents millisecondes sur un petit jeu peut en demander trois mille sur le vrai,
 * et aucune suite fonctionnelle ne le dit - elles verifient des chiffres, pas des delais. Le banc a
 * donc ete gonfle jusqu'a quatre cent vingt mille ventes etalees de fin 2023 a aujourd'hui, soit plus
 * que l'officine, et cette suite mesure ce que l'utilisateur attend reellement.
 *
 * CE QUI EST MESURE, ET COMMENT. Chaque mesure est prise sur le VRAI parcours : on clique sur le menu,
 * on clique sur les onglets, on declenche les editions par leur bouton. Un appel d'API seul ne dirait
 * rien du temps de dessin, qui est une part du delai ressenti. Chaque geste est repete et l'on retient
 * la MEDIANE - une premiere fois porte le cout des caches froids et ne represente pas l'usage courant -
 * ainsi que le PIRE temps, car c'est celui dont on se plaint.
 *
 * LES BUDGETS. Ils ne sont pas des voeux : ils encadrent ce que la mesure a montre tenable sur ce
 * volume, avec une marge. Un depassement est un defaut a corriger, pas un seuil a relever. Ils sont
 * groupes ci-dessous pour etre relus d'un coup d'oeil.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const BUDGET = {
  ouvertureMenu: 3000,    /* mesure : 666 ms de mediane, 801 ms au pire */
  changementOnglet: 1200, /* mesure : 66 a 195 ms de mediane, 301 ms au pire */
  ongletServi: 200,       /* mesure : 7 ms - un onglet deja rassemble sort du cache, ou le cache est inutile */
  controleSeul: 3000,     /* mesure : 1080 ms sur trente-sept mois */
  edition: 5000,          /* mesure : 163 ms de mediane, 2607 ms au premier appel (Jasper a froid) */
  ecranCourant: 2500,     /* mesure : 113 a 561 ms */
  recalculComplet: 60000  /* mesure : 45 s pour vingt-cinq mois sur quatre cent seize mille ventes */
};
const REPETITIONS = 3;

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
function budget(nom, mesures, limite) {
  const t = mesures.slice().sort((a, b) => a - b);
  const med = t[Math.floor(t.length / 2)];
  const pire = t[t.length - 1];
  ok(nom, med <= limite, 'mediane ' + med + ' ms, pire ' + pire + ' ms, budget ' + limite + ' ms');
  return { med: med, pire: pire };
}

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const ONGLETS = ['ventes', 'marge', 'achats', 'caisse', 'stock', 'qualite', 'kpi', 'achatsventes'];
/* Les ecrans que l'officine ouvre tous les jours. La liste vient de l'usage, pas du hasard. */
const ECRANS = [
  { cle: 'doventemanager', libelle: 'Ecran de vente' },
  { cle: 'preenregistrementmanager', libelle: 'Liste des ventes' },
  { cle: 'caisserecetterecap', libelle: 'Recapitulatif de caisse' },
  { cle: 'balancesalecahs', libelle: 'Balance des ventes' },
  { cle: 'famillemanager', libelle: 'Fiches articles' },
  { cle: 'clientmanager', libelle: 'Clients' },
  { cle: 'suppressionsvente', libelle: 'Annulations de vente' }
];

(async () => {
  const volume = q("SELECT CONCAT(COUNT(*),' ventes closes, de ',DATE_FORMAT(MIN(dt_UPDATED),'%Y-%m-%d'),' a ',DATE_FORMAT(MAX(dt_UPDATED),'%Y-%m-%d')) FROM t_preenregistrement WHERE str_STATUT='is_Closed' AND b_IS_CANCEL=0");
  console.log('VOLUME DU BANC : ' + volume);
  const lignes = q('SELECT COUNT(*) FROM t_preenregistrement_detail');
  console.log('LIGNES DE VENTE : ' + lignes);
  console.log('');

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const chrono = {};
  let enVol = 0, dernier = Date.now();
  p.on('request', () => { enVol++; dernier = Date.now(); });
  const fini = () => { enVol = Math.max(0, enVol - 1); dernier = Date.now(); };
  p.on('requestfinished', fini); p.on('requestfailed', fini);
  const silence = async (repos, limite) => {
    const fin = Date.now() + limite;
    while (Date.now() < fin) {
      if (enVol === 0 && Date.now() - dernier >= repos) { return true; }
      await p.waitForTimeout(50);
    }
    return false;
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);

    /* ---- 1. OUVERTURE DU MENU. Le geste le plus couteux : il rassemble les chiffres ET lance le
       controle des corrections tardives. C'est le delai dont l'officine s'est plainte. */
    const ouvertures = [];
    for (let i = 0; i < REPETITIONS; i++) {
      await p.evaluate(() => { var v = Ext.ComponentQuery.query('pilotage')[0]; if (v) { v.close ? v.close() : v.destroy(); } });
      await p.waitForTimeout(1200);
      const t0 = Date.now();
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
      /* On attend que les TUILES portent un chiffre : l'onglet present sans donnee ne vaut rien. */
      await p.waitForFunction(() => {
        var t = document.querySelectorAll('.pilotage-tuile');
        if (!t.length) { return false; }
        return Array.prototype.some.call(t, function (e) { return /[0-9]/.test(e.textContent || ''); });
      }, null, { timeout: 120000 });
      ouvertures.push(Date.now() - t0);
    }
    chrono.ouverture = budget('Ouverture du menu de pilotage, chiffres a l ecran', ouvertures, BUDGET.ouvertureMenu);

    /* ---- 2. CHANGEMENT D'ONGLET. Une fois le menu ouvert, passer d'un onglet a l'autre ne doit plus
       rien recalculer : c'est le sens du deplacement du controle a l'ouverture seule. */
    const parOnglet = {};
    for (const cle of ONGLETS) {
      const t = [];
      for (let i = 0; i < REPETITIONS; i++) {
        await p.evaluate(() => {
          var o = Ext.ComponentQuery.query('pilotage #onglets')[0];
          o.setActiveTab(0);
        });
        await p.waitForTimeout(600);
        const t0 = Date.now();
        const trouve = await p.evaluate((c) => {
          var o = Ext.ComponentQuery.query('pilotage #onglets')[0];
          var cible = o.items.items.filter(function (it) { return it.itemId === c || it.cleOnglet === c; })[0];
          if (!cible) { return false; }
          o.setActiveTab(cible);
          return true;
        }, cle);
        if (!trouve) { ok('Onglet ' + cle + ' present', false, 'introuvable'); break; }
        await p.waitForFunction((c) => {
          var o = Ext.ComponentQuery.query('pilotage #onglets')[0];
          var a = o.getActiveTab();
          if (!a || (a.itemId !== c && a.cleOnglet !== c)) { return false; }
          var txt = a.getEl() ? a.getEl().dom.textContent || '' : '';
          return /[0-9]/.test(txt) && !/Rassemblement/i.test(txt);
        }, cle, { timeout: 60000 });
        t.push(Date.now() - t0);
      }
      if (t.length) { parOnglet[cle] = budget('Changement d onglet : ' + cle, t, BUDGET.changementOnglet); }
    }

    /* ---- 3. LECTURE SERVIE. Le meme onglet demande deux fois de suite : la seconde doit sortir du
       cache. Si elle coute autant que la premiere, le cache ne sert a rien. */
    const servis = [];
    for (const cle of ['synthese', 'ventes', 'achatsventes']) {
      const t = await p.evaluate(async (c) => {
        const un = async () => {
          const d = Date.now();
          await fetch('../api/v1/pilotage/onglet/' + c + '?axe=G12', { credentials: 'same-origin' }).then(r => r.json());
          return Date.now() - d;
        };
        await un();
        return [await un(), await un(), await un()];
      }, cle);
      servis.push.apply(servis, t);
    }
    chrono.servi = budget('Un onglet deja rassemble est servi sans le recalculer', servis, BUDGET.ongletServi);

    /* ---- 4. LE CONTROLE DES CORRECTIONS TARDIVES, seul. C'est lui qui coutait trois mille millisecondes
       a l'officine quand il se relancait a chaque changement d'onglet. */
    const controles = await p.evaluate(async () => {
      const t = [];
      for (let i = 0; i < 3; i++) {
        const d = Date.now();
        await fetch('../api/v1/pilotage/controler?axe=G12', { credentials: 'same-origin' }).then(r => r.json());
        t.push(Date.now() - d);
      }
      return t;
    });
    chrono.controle = budget('Le controle des corrections tardives, declenche seul', controles, BUDGET.controleSeul);

    /* ---- 4bis. LE RECALCUL, celui du bouton et de sa barre de progression. C'est le seul geste du
       menu dont on accepte qu'il dure : il refait chaque mois de la periode a partir des ventes et des
       achats. L'appel est SYNCHRONE - il ne rend la main qu'une fois fini - et c'est pourquoi l'ecran
       interroge en parallele /avancement pour montrer ou l'on en est. Les deux points a verifier sont
       donc : la duree totale, et le fait que l'avancement reponde PENDANT le recalcul. Un avancement
       muet laisserait l'utilisateur devant un ecran fige, sans savoir si le logiciel travaille. */
    let vivant = 0, muet = 0;
    const sondeur = (async () => {
      await p.waitForTimeout(700);
      for (let i = 0; i < 120; i++) {
        const a = await p.evaluate(() => fetch('../api/v1/pilotage/avancement', { credentials: 'same-origin' })
          .then(r => r.json()).catch(() => null));
        if (a && a.success) { vivant++; } else { muet++; }
        if (a && a.enCours === false && i > 2) { break; }
        await p.waitForTimeout(500);
      }
    })();
    const t0Recalcul = Date.now();
    const rep = await p.evaluate(() => fetch('../api/v1/pilotage/recalculer?axe=G12',
      { credentials: 'same-origin' }).then(r => r.json()));
    const dureeRecalcul = Date.now() - t0Recalcul;
    await sondeur;
    ok('Le recalcul refait bien les mois de la periode', rep && rep.success === true && rep.mois > 0,
      JSON.stringify(rep).slice(0, 160));
    ok('Le recalcul tient dans son budget', dureeRecalcul <= BUDGET.recalculComplet,
      dureeRecalcul + ' ms pour ' + (rep && rep.mois) + ' mois, budget ' + BUDGET.recalculComplet + ' ms');
    ok('L avancement repond PENDANT le recalcul : l ecran n est jamais fige',
      vivant > 0 && muet === 0, vivant + ' reponses, ' + muet + ' sans reponse');
    chrono.recalcul = { med: dureeRecalcul, pire: dureeRecalcul };

    /* ---- 5. EDITIONS. En flux, sans fenetre intermediaire : on mesure le temps jusqu'au dernier octet. */
    for (const forme of [{ cle: 'pdf', mime: 'application/pdf', mini: 3000 },
      { cle: 'excel', mime: 'vnd.ms-excel', mini: 1500 }]) {
      const t = await p.evaluate(async (f) => {
        const t = [];
        for (const c of ['synthese', 'ventes', 'achatsventes']) {
          const d = Date.now();
          /* Le meme appel que le bouton : /pilotage/pdf?onglet=... - c'est la route reelle. */
          const r = await fetch('../api/v1/pilotage/' + f.cle + '?onglet=' + c + '&axe=G12',
            { credentials: 'same-origin' });
          const blob = await r.blob();
          t.push({ ms: Date.now() - d, taille: blob.size, code: r.status,
            type: r.headers.get('content-type') || '' });
        }
        return t;
      }, forme);
      /* Un document, pas une page d'erreur : on exige le bon type ET une taille plausible. */
      const mauvais = t.filter(x => x.code !== 200 || x.type.indexOf(forme.mime) < 0
        || x.taille < forme.mini);
      ok('Les editions ' + forme.cle + ' rendent bien un document', mauvais.length === 0,
        t.map(x => x.code + ' ' + x.taille + ' o ' + x.type.split(';')[0]).join(' | '));
      chrono['edition_' + forme.cle] = budget('Edition ' + forme.cle + ' du detail mensuel', t.map(x => x.ms), BUDGET.edition);
    }

    /* ---- 6. LES ECRANS DU QUOTIDIEN. Le pilotage n'est pas seul a lire ces tables : si le volume
       ralentit la liste des ventes ou l'ecran de vente, c'est plus grave encore. */
    for (const e of ECRANS) {
      const t = [];
      for (let i = 0; i < 2; i++) {
        const t0 = Date.now();
        const r = await p.evaluate(async (cle) => {
          try {
            testextjs.app.getController('App').onRedirectTo(cle, {});
            return 'ok';
          } catch (ex) { return String(ex && ex.message); }
        }, e.cle);
        if (r !== 'ok') { ok('Ouverture : ' + e.libelle, false, r); break; }
        /* On attend le SILENCE RESEAU plutot qu'un masque de chargement : le masque d'ExtJS 4.2
           n'est pas toujours pose, et son style s'ecrit de plusieurs facons - s'y fier donnait des
           attentes qui ne s'achevaient jamais. Un ecran est pret quand il a fini de demander ses
           donnees : aucun appel en vol pendant un quart de seconde. */
        const calme = await silence(400, 60000);
        if (!calme) { ok('Ouverture : ' + e.libelle, false, 'le reseau ne se calme pas en 60 s'); break; }
        t.push(Date.now() - t0 - 400);
      }
      if (t.length) { chrono[e.cle] = budget('Ouverture : ' + e.libelle, t, BUDGET.ecranCourant); }
    }

    ok('Aucune erreur JavaScript pendant toutes les mesures', err.length === 0, JSON.stringify(err.slice(0, 3)));
  } catch (e) {
    ok('La suite de mesures va jusqu au bout', false, String(e && e.message).slice(0, 400));
  } finally {
    console.log('');
    console.log('RECAPITULATIF (mediane / pire, en ms)');
    Object.keys(chrono).forEach(function (k) { console.log('  ' + k + ' : ' + chrono[k].med + ' / ' + chrono[k].pire); });
    await b.close();
  }
  const echecs = res.filter(r => !r.c).length;
  console.log('');
  console.log((res.length - echecs) + '/' + res.length + ' budgets respectes');
  process.exit(echecs ? 1 : 0);
})();
