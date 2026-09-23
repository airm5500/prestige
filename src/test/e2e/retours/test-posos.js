/* Evolution 5, point 9 : passerelle Posos, jouee contre un VRAI serveur simule.
 *
 * Les tests unitaires verifient la logique sans reseau. Ici on va plus loin : un serveur HTTP local joue
 * Posos (jeton OAuth2 puis analyse), la configuration du site le designe, et l'ecran « Analyse Posos » est
 * parcouru a la souris. Toute la chaine est donc exercee, y compris le client HTTP reel du serveur
 * d'application.
 *
 * Ce que le test etablit :
 *  - sans configuration, le statut dit « non configuree » et ne rend AUCUN identifiant ;
 *  - une fois configuree, la passerelle obtient un jeton en client_credentials et le reutilise ;
 *  - le secret n'apparait jamais dans la reponse de statut ni dans l'analyse ;
 *  - les produits partent PAR LEUR NOM, et aucune donnee identifiant le patient ne quitte l'officine ;
 *  - une vente est analysable par sa REFERENCE, ses produits etant relus en base ;
 *  - l'ecran affiche les alertes, met en avant les majeures, et signale les produits non analyses ;
 *  - une panne de Posos ne fait jamais croire qu'il n'y a pas d'alerte.
 *
 * La configuration posee et la vente creee sont retirees a la fin ; la configuration d'origine est remise.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 340) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

/* Le chemin n'est plus devine : on demande a l'application ou elle attend son fichier de configuration.
 * C'est ce que voit le gestionnaire sur l'ecran, et cela rend le test juste sous Windows comme ici. */
let CONFIG = null;
// Identifiants uniques a chaque execution : le jeton est mis en cache cote serveur pour une heure, et
// c'est voulu. Changer les identifiants doit le faire jeter - le test l'exige donc a chaque passage, et
// verifie du meme coup que l'invalidation sur changement de configuration fonctionne.
const EXECUTION = String(Date.now()).slice(-6);
const SECRET = 'secret-de-recette-ne-doit-jamais-sortir-' + EXECUTION;
const IDENTIFIANT = 'identifiant-de-recette-posos-' + EXECUTION;
const PORT = 18099;
const CAISSE = 'E2E-POSOS-CAISSE';

let sauvegardeConfig = null;
const ventes = [];

function poserConfig(contenu) {
  if (!CONFIG) { throw new Error('emplacement de configuration inconnu'); }
  if (sauvegardeConfig === null) {
    sauvegardeConfig = fs.existsSync(CONFIG) ? fs.readFileSync(CONFIG, 'utf8') : false;
  }
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  if (contenu === null) {
    if (fs.existsSync(CONFIG)) { fs.unlinkSync(CONFIG); }
    return;
  }
  fs.writeFileSync(CONFIG, contenu, { mode: 0o600 });
}

function restaurerConfig() {
  if (!CONFIG) { return; }
  if (sauvegardeConfig === false) {
    if (fs.existsSync(CONFIG)) { fs.unlinkSync(CONFIG); }
  } else if (sauvegardeConfig !== null) {
    fs.writeFileSync(CONFIG, sauvegardeConfig, { mode: 0o600 });
  }
}

function nettoyerVentes() {
  const liste = ventes.length ? "('" + ventes.join("','") + "')" : "('-')";
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID='" + CAISSE + "';");
}

/* ------------------------------------------------------------------ le serveur Posos simule */
const journal = { jetons: 0, analyses: 0, autorisations: [], corps: [], formulaires: [] };
let reponseAnalyse = null;
let statutAnalyse = 200;

function demarrerPosos() {
  return new Promise((resolve) => {
    const serveur = http.createServer((req, rep) => {
      let brut = '';
      req.on('data', (c) => { brut += c; });
      req.on('end', () => {
        journal.autorisations.push(req.headers.authorization || null);
        if (req.url.indexOf('/oauth/token') === 0) {
          journal.jetons++;
          journal.formulaires.push(brut);
          rep.writeHead(200, { 'Content-Type': 'application/json' });
          rep.end(JSON.stringify({ access_token: 'jeton-simule-e2e', expires_in: 3600, token_type: 'Bearer' }));
          return;
        }
        if (req.url.indexOf('/v1/analysis') === 0) {
          journal.analyses++;
          journal.corps.push(brut);
          rep.writeHead(statutAnalyse, { 'Content-Type': 'application/json' });
          rep.end(JSON.stringify(reponseAnalyse || { alerts: [] }));
          return;
        }
        rep.writeHead(404); rep.end('{}');
      });
    });
    serveur.listen(PORT, '127.0.0.1', () => resolve(serveur));
  });
}

(async () => {
  const serveur = await demarrerPosos();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    const json = (url, corps) => p.evaluate(async (a) => {
      const r = a.corps === undefined
        ? await fetch(a.url)
        : await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { return { brut: t.slice(0, 300) }; }
    }, { url: url, corps: corps });

    /* --------------- l application dit elle-meme ou elle attend sa configuration */
    let statut = await json('../api/v1/posos/status');
    CONFIG = statut.fichierAttendu;
    ok('l application annonce OU elle attend son fichier de configuration',
      !!CONFIG && path.isAbsolute(CONFIG) && path.basename(CONFIG) === 'posos.properties', String(CONFIG));
    ok('ce fichier est attendu dans le MÊME dossier que dicisms.properties',
      path.basename(path.dirname(CONFIG)) === 'config'
      || fs.existsSync(path.join(path.dirname(CONFIG), 'dicisms.properties')),
      String(CONFIG));

    /* ------------------------------------------- d abord SANS configuration */
    poserConfig(null);
    statut = await json('../api/v1/posos/status');
    /* Retour du 23/09 : sans acces Posos, la SOLUTION INTERMEDIAIRE (mode demonstration) repond. */
    ok('sans configuration, le statut annonce le mode démonstration (solution intermédiaire)',
      statut.success === true && statut.configuree === true && statut.mode === 'demonstration', JSON.stringify(statut));
    ok('le statut dit que le fichier est absent, pour qu on sache quoi déposer',
      statut.fichierPresent === false, JSON.stringify({ a: statut.fichierAttendu, p: statut.fichierPresent }));
    ok('sans configuration, l analyse vient des règles de démonstration, sans aucun appel à Posos',
      await (async () => {
        const r = await json('../api/v1/posos/analyse', { produits: [{ nom: 'DOLIPRANE 500MG CPR B/16' }] });
        return r.demonstration === true && /DÉMONSTRATION/.test(r.avertissement || '') && journal.jetons === 0;
      })());
    poserConfig('POSOS_MODE=aucun\n');
    ok('POSOS_MODE=aucun : aucune analyse n est tentee et l indisponibilite est dite',
      await (async () => {
        const r = await json('../api/v1/posos/analyse', { produits: [{ nom: 'PARACETAMOL 500 MG' }] });
        return r.disponible === false && /pas configuré/.test(r.message || '') && journal.jetons === 0;
      })());

    /* ------------------------------------------- puis AVEC la configuration du site */
    poserConfig('POSOS_API_URL=http://127.0.0.1:' + PORT + '\n'
      + 'POSOS_CLIENT_ID=' + IDENTIFIANT + '\n'
      + 'POSOS_CLIENT_SECRET=' + SECRET + '\n'
      + 'POSOS_TOKEN_PATH=/oauth/token\n'
      + 'POSOS_ANALYSIS_PATH=/v1/analysis\n');

    statut = await json('../api/v1/posos/status');
    ok('la configuration du site est prise en compte sans redemarrage',
      statut.configuree === true, JSON.stringify(statut));
    ok('le statut signale desormais le fichier comme présent', statut.fichierPresent === true);
    ok('le statut ne rend NI le secret NI l identifiant en clair',
      JSON.stringify(statut).indexOf(SECRET) < 0 && JSON.stringify(statut).indexOf(IDENTIFIANT) < 0,
      JSON.stringify(statut));
    ok('le statut rend l identifiant masqué et le secret comme simple booléen',
      /^\*\*\*\*/.test(statut.clientId || '') && statut.clientId.length <= 8
      && statut.secretRenseigne === true,
      JSON.stringify({ clientId: statut.clientId, secretRenseigne: statut.secretRenseigne }));

    /* ------------------------------------------- une analyse complete */
    reponseAnalyse = {
      alerts: [
        { category: 'interaction', severity: 'majeure', label: 'Association déconseillée',
          recommendation: 'Espacer les prises de 2 heures', drugs: [{ name: 'IBUPROFENE' }, { name: 'ASPIRINE' }] },
        { category: 'posologie', severity: 'mineure', label: 'Dose journalière proche du maximum' }
      ],
      unmatched: ['TISANE MAISON']
    };
    const analyse = await json('../api/v1/posos/analyse', {
      produits: [
        { nom: 'IBUPROFENE 400 MG COMPRIME', quantite: 2, posologie: '1 matin et soir' },
        { nom: 'ASPIRINE 500 MG COMPRIME', quantite: 1 },
        { nom: 'TISANE MAISON' }
      ],
      contexte: { age: 72, sexe: 'F', insuffisanceRenale: true }
    });
    ok('l analyse aboutit', analyse.disponible === true, JSON.stringify(analyse).slice(0, 250));
    ok('les deux alertes sont rendues, une seule est majeure',
      analyse.total === 2 && analyse.nombreMajeures === 1, JSON.stringify({ t: analyse.total, m: analyse.nombreMajeures }));
    ok('les produits concernés par l alerte sont rendus',
      (analyse.alertes[0].produits || []).join(',') === 'IBUPROFENE,ASPIRINE',
      JSON.stringify(analyse.alertes[0]));
    ok('le produit non reconnu par Posos est signalé : l officine doit savoir ce qui n a PAS été analysé',
      (analyse.produitsNonReconnus || []).join(',') === 'TISANE MAISON',
      JSON.stringify(analyse.produitsNonReconnus));

    ok('le jeton a été demandé en client_credentials',
      journal.jetons >= 1 && /grant_type=client_credentials/.test(journal.formulaires[0] || ''),
      journal.formulaires[0]);
    ok('le secret voyage en en-tête Basic vers Posos, jamais dans le corps',
      /^Basic /.test(journal.autorisations[0] || '')
      && (journal.formulaires[0] || '').indexOf(SECRET) < 0,
      'schéma=' + String(journal.autorisations[0]).split(' ')[0] + ' | ' + journal.formulaires[0]);
    // On ne trace jamais l en-tete Basic en entier : il se decode en identifiant:secret.
    ok('l analyse est appelée avec le jeton porteur',
      journal.autorisations.some((a) => a === 'Bearer jeton-simule-e2e'),
      journal.autorisations.map((a) => (a || '').split(' ')[0]).join(','));

    const corpsEnvoye = JSON.parse(journal.corps[journal.corps.length - 1]);
    ok('les produits partent par leur NOM',
      corpsEnvoye.products.length === 3 && corpsEnvoye.products[0].name === 'IBUPROFENE 400 MG COMPRIME',
      JSON.stringify(corpsEnvoye.products));
    ok('la posologie saisie est transmise',
      corpsEnvoye.products[0].posology === '1 matin et soir', JSON.stringify(corpsEnvoye.products[0]));
    ok('le contexte envoyé est clinique, et rien n identifie le patient',
      corpsEnvoye.patient && corpsEnvoye.patient.age === 72 && corpsEnvoye.patient.sex === 'F'
      && corpsEnvoye.patient.renalImpairment === true
      && !['name', 'firstName', 'lastName', 'phone', 'nom', 'prenom', 'telephone', 'socialSecurity']
        .some((k) => Object.prototype.hasOwnProperty.call(corpsEnvoye.patient, k)),
      JSON.stringify(corpsEnvoye.patient));

    const avant = journal.jetons;
    await json('../api/v1/posos/analyse', { produits: [{ nom: 'PARACETAMOL 500 MG' }] });
    ok('le jeton est réutilisé et non redemandé à chaque analyse', journal.jetons === avant,
      'avant=' + avant + ' apres=' + journal.jetons);

    /* ------------------------------------------- analyse d une vente par sa reference */
    const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
    const prods = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID,':',str_NAME) SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME"
      + " FROM t_famille WHERE str_STATUT='enable' AND str_NAME IS NOT NULL AND int_PRICE>0 ORDER BY str_NAME LIMIT 2) x")
      .split('|').map((x) => { const a = x.split(':'); return { id: a[0], nom: a[1] }; });
    const venteId = 'E2E-POSOS-VENTE';
    const reference = 'E2EPOSOS1';
    ventes.push(venteId);
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, lg_USER_ID, str_REF, str_STATUT, int_PRICE,"
      + " dt_CREATED, dt_UPDATED, b_IS_CANCEL, str_TYPE_VENTE) VALUES ('" + venteId + "', '" + user + "', '"
      + reference + "', 'is_Closed', 1000, NOW(), NOW(), 0, 'VENTE_COMPTANT');");
    prods.forEach((pr, i) => {
      exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
        + " lg_FAMILLE_ID, int_QUANTITY, int_PRICE, int_PRICE_UNITAIR, dt_CREATED, dt_UPDATED, str_STATUT,"
        + " int_QUANTITY_SERVED) VALUES ('E2E-POSOS-D" + i + "', '" + venteId + "', '" + pr.id + "', " + (i + 2)
        + ", 500, 500, NOW(), NOW(), 'is_Closed', " + (i + 2) + ");");
    });
    reponseAnalyse = { alerts: [] };
    const parRef = await json('../api/v1/posos/analyse', { venteId: reference });
    ok('une vente est analysable par sa RÉFÉRENCE', parRef.disponible === true, JSON.stringify(parRef).slice(0, 200));
    ok('les produits analysés sont relus en base et renvoyés à l écran',
      (parRef.venteProduits || []).length === 2
      && parRef.venteProduits.map((x) => x.nom).sort().join('|') === prods.map((x) => x.nom).sort().join('|'),
      JSON.stringify(parRef.venteProduits));
    const corpsVente = JSON.parse(journal.corps[journal.corps.length - 1]);
    ok('ce sont bien les noms de la vente qui partent, avec leurs quantités',
      corpsVente.products.length === 2 && corpsVente.products.every((x) => !!x.name && x.quantity > 0),
      JSON.stringify(corpsVente.products));

    /* ------------------------------------------- une panne ne minimise rien */
    statutAnalyse = 500;
    const panne = await json('../api/v1/posos/analyse', { produits: [{ nom: 'PARACETAMOL 500 MG' }] });
    ok('une panne de Posos donne « indisponible » et non « aucune alerte »',
      panne.disponible === false && (panne.alertes || []).length === 0 && /500/.test(panne.message || ''),
      JSON.stringify(panne));
    statutAnalyse = 200;

    /* ------------------------------------------- l ecran, a la souris */
    reponseAnalyse = {
      alerts: [{ category: 'interaction', severity: 'majeure', label: 'Association déconseillée',
        recommendation: 'Espacer les prises', drugs: [{ name: 'IBUPROFENE' }] }],
      unmatched: ['TISANE MAISON']
    };
    const ouvert = await p.evaluate(() => {
      try { testextjs.app.getController('App').onRedirectTo('pososmanager', {}); return 'ok'; }
      catch (e) { return 'ERREUR ' + e.message; }
    });
    ok('l écran « Analyse Posos » s ouvre', ouvert === 'ok', ouvert);
    await p.waitForFunction(() => Ext.ComponentQuery.query('pososmanager').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(1800);
    ok('le bandeau annonce que Posos est configuré, avec l identifiant masqué',
      await p.evaluate(() => {
        const z = Ext.ComponentQuery.query('pososmanager #etatPasserelle')[0];
        const t = z ? (z.el ? z.el.dom.innerText : '') : '';
        return /configur/i.test(t) && t.indexOf('****') >= 0;
      }));
    ok('le bandeau ne montre aucun secret',
      await p.evaluate((s) => {
        const z = Ext.ComponentQuery.query('pososmanager #etatPasserelle')[0];
        return (z && z.el ? z.el.dom.innerText : '').indexOf(s) < 0;
      }, SECRET));

    // saisie d une ligne, puis analyse, a la souris
    await p.evaluate((nom) => {
      testextjs.app.getController('PososCtr').ajouterLigne(nom, '1234567', 2, '1 matin et soir');
    }, 'IBUPROFENE 400 MG COMPRIME');
    await p.waitForTimeout(400);
    ok('le produit ajouté apparaît dans la liste à analyser',
      await p.evaluate(() => Ext.ComponentQuery.query('pososmanager #lignes')[0].getStore().getCount()) === 1);
    const bouton = await p.evaluate(() => {
      const b = Ext.ComponentQuery.query('pososmanager #analyser')[0];
      if (!b || b.isDisabled()) { return 'bouton indisponible'; }
      // fireEvent('click') n appelle PAS le handler d un bouton : on clique sur l element.
      b.el.dom.click();
      return 'ok';
    });
    ok('le bouton « Analyser » est actif et cliquable', bouton === 'ok', bouton);
    await p.waitForFunction(() => Ext.ComponentQuery.query('pososmanager #alertes')[0].getStore().getCount() > 0,
      null, { timeout: 20000 });
    ok('l alerte s affiche dans la grille du résultat',
      await p.evaluate(() => {
        const s = Ext.ComponentQuery.query('pososmanager #alertes')[0].getStore();
        return s.getCount() === 1 && s.getAt(0).get('libelle') === 'Association déconseillée'
          && s.getAt(0).get('majeure') === true;
      }));
    ok('le message signale l alerte majeure et le produit non analysé',
      await p.evaluate(() => {
        const z = Ext.ComponentQuery.query('pososmanager #messageAnalyse')[0];
        const t = z && z.el ? z.el.dom.innerText : '';
        return /absolument/.test(t) && /TISANE MAISON/.test(t);
      }));

    ok('aucune erreur de page pendant tout le parcours', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    console.log('\n' + res.filter(r => r.c).length + '/' + res.length + ' verifications');
    try { restaurerConfig(); nettoyerVentes(); } catch (e) { console.log('NETTOYAGE INCOMPLET : ' + String(e.message).slice(0, 300)); }
    process.exit(res.every(r => r.c) ? 0 : 1);
  }
})();
