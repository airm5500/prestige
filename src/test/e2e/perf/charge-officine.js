/* ESSAI DE CHARGE D'UNE OFFICINE (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md).
 *
 * Plusieurs postes travaillent EN MEME TEMPS, chacun par le vrai chemin de l'ecran (menu clique, champs tapes,
 * boutons cliques), avec son propre compte et sa propre caisse. La charge monte par paliers (PALIERS, par defaut
 * 1, 2, 4, 8, 15 postes) ; chaque palier dure DUREE_PALIER secondes. Les postes sont pris dans cet ordre :
 *   caisse, caisse, recherche, caisse, commande, caisse, etats, caisse, facturation, caisse, recherche, caisse,
 *   commande, caisse, caisse
 * soit, a 15 postes : 9 caisses, 2 postes de recherche et de stock, 2 postes de commande, 1 poste d'etats (Ticket Z,
 * ventes terminees, recap), 1 poste de facturation.
 *
 * Gestes de chaque poste :
 *   - caisse : 1 a 3 articles tapes par leur CIP dans la recherche produit (Entree), montant recu tape,
 *     « Terminer la vente » clique ; une pause de PAUSE_CAISSE secondes entre deux ventes ;
 *   - recherche : un mot tape dans la Fiche article, Entree, apercu d'une ligne (double-clic) ;
 *   - commande : « NOUVELLE COMMANDE », grossiste, 3 articles cherches par leur CIP, quantite, Entree ;
 *   - etats : Ticket Z du jour, ventes terminees du jour, recap des articles vendus de la semaine ;
 *   - facturation : liste des factures du mois, puis « Créer » et recherche des bons du mois (sans generer).
 * Chaque geste est chronometre du premier clic jusqu'au repos de la page (aucune requete en vol depuis 400 ms, aucun
 * masque de chargement). Erreurs relevees : reponses 5xx, requetes echouees, erreurs JavaScript, boites de message
 * d'erreur, gestes qui n'aboutissent pas en GESTE_MAX secondes.
 *
 * Toutes les 5 s : memoire Java et temps de ramasse-miettes du serveur (jstat), connexions et requetes en cours de
 * MariaDB, attentes de verrous, interblocages, processeur et memoire du poste de test.
 *
 * L'IMPRESSION DU TICKET EST BLOQUEE : les appels vente/ticket/* sont annules dans le navigateur, sinon le serveur
 * enverrait de vrais tickets a l'imprimante configuree.
 *
 * ECRIT DANS LA BASE (comptes, caisses, ventes, commandes) : uniquement sur une copie de mesure (nom en _perf), qui est
 * rechargee depuis l'original apres l'essai. Preparation : comptes e2e-c01 a e2e-c15, copies de e2e (memes roles) ;
 * chaque caisse est ouverte par l'ecran, quand la vente le propose (« Votre caisse est fermée... » : Oui, fond saisi).
 *
 * Variables : BASE, DB_TEST + E2E_BASE_LIBRE=1, MARIADB_OPTIONS, PALIERS (1,2,4,8,15), DUREE_PALIER (300), LOURDS (0),
 * PERIODE_LOURDE (30),
 * PAUSE_CAISSE (8), GESTE_MAX (120), SERVEUR_PID (processus Java de Payara), JSTAT, SORTIE.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execFile } = require('child_process');

const DB = ENV_E2E.BASE;
if (!/_perf$/.test(DB)) { throw new Error('Essai de charge : copie de mesure (nom en _perf) obligatoire, pas ' + DB); }
const PALIERS = (process.env.PALIERS || '1,2,4,8,15').split(',').map(Number);
const DUREE = Number(process.env.DUREE_PALIER || 300) * 1000;
const PAUSE_CAISSE = Number(process.env.PAUSE_CAISSE || 8) * 1000;
const GESTE_MAX = Number(process.env.GESTE_MAX || 120) * 1000;
const PID = process.env.SERVEUR_PID;
const JSTAT = process.env.JSTAT || 'C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot/bin/jstat.exe';
const SORTIE = process.env.SORTIE || path.join(ENV_E2E.TMP, 'charge-' + DB + '.json');
const ROLES = ['caisse', 'caisse', 'recherche', 'caisse', 'commande', 'caisse', 'etats', 'caisse', 'facturation', 'caisse',
  'recherche', 'caisse', 'commande', 'caisse', 'caisse'];
/* postes d'etats lourds en plus (LOURDS) : suggestion depuis le recap sur PERIODE_LOURDE jours, en boucle ; ils
   demarrent une minute apres les autres postes et occupent chacun un fil du serveur pendant des minutes */
const LOURDS = Number(process.env.LOURDS || 0);
const PERIODE_LOURDE = Number(process.env.PERIODE_LOURDE || 30);
for (let k = 0; k < LOURDS; k++) { ROLES[Math.max(...PALIERS) + k] = 'suggestion'; }
const NB = Math.max(...PALIERS) + LOURDS;

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN'], { input: s, encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024 }).replace(/\r/g, '').trim();
const qa = (s) => new Promise((ok) => {
  const c = execFile('mariadb', [...ENV_E2E.MARIADB, DB, '-sN', '-e', s], { encoding: 'utf8' }, (e, out) => ok(e ? '' : out.replace(/\r/g, '').trim()));
  c.on('error', () => ok(''));
});
const jour = (d) => d.toISOString().slice(0, 10);

/* ---------- preparation : comptes, fonds de caisse, articles ---------- */
const login = (i) => 'e2e-c' + String(i + 1).padStart(2, '0');
const idUser = (i) => '900000000000000001' + String(i + 10).padStart(2, '0');
function preparerComptes() {
  let s = "CREATE TEMPORARY TABLE e2e_u AS SELECT * FROM t_user WHERE str_LOGIN = 'e2e';";
  for (let i = 0; i < NB; i++) {
    s += `DELETE FROM t_role_user WHERE lg_USER_ID = '${idUser(i)}';`
      + `UPDATE e2e_u SET lg_USER_ID = '${idUser(i)}', str_LOGIN = '${login(i)}', str_FIRST_NAME = 'Caisse', str_LAST_NAME = '${login(i).toUpperCase()}';`
      + 'INSERT IGNORE INTO t_user SELECT * FROM e2e_u;'
      + `INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED, dt_UPDATED) SELECT CONCAT('E2E-CH-', '${i}', '-', ru.lg_ROLE_ID), ru.lg_ROLE_ID,`
      + ` '${idUser(i)}', NOW(), NOW() FROM t_role_user ru JOIN t_user a ON a.lg_USER_ID = ru.lg_USER_ID WHERE a.str_LOGIN = 'e2e';`;
  }
  q(s);
}
/* articles vendables : CIP a 7 chiffres unique, prix moyen, stock large ; mots de recherche tires de leurs noms */
const ARTICLES = q("SELECT CONCAT_WS('|', f.int_CIP, f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 3000 AND s.int_NUMBER_AVAILABLE > 30"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1 ORDER BY RAND(7) LIMIT 300").split('\n').filter(Boolean).map((l) => l.split('|'));
const MOTS = ['PARA', 'DOLI', 'AMOX', 'VITA', 'SIROP', 'CREME', 'GEL', 'COMP', 'IBU', 'SPASF'];
const GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
const hasard = (t) => t[Math.floor(Math.random() * t.length)];

/* ---------- releve du serveur toutes les 5 s ---------- */
const releves = [];
let cpuAvant = os.cpus().map((c) => c.times);
function cpuPoste() {
  const apres = os.cpus().map((c) => c.times);
  let occupe = 0, total = 0;
  apres.forEach((t, i) => { const a = cpuAvant[i]; const d = (k) => t[k] - a[k];
    const tt = d('user') + d('nice') + d('sys') + d('idle') + d('irq'); total += tt; occupe += tt - d('idle'); });
  cpuAvant = apres;
  return total ? Math.round(100 * occupe / total) : null;
}
const statutMaria = ['Threads_connected', 'Threads_running', 'Innodb_row_lock_waits', 'Innodb_row_lock_time', 'Innodb_deadlocks', 'Questions', 'Innodb_row_lock_current_waits'];
async function relever(palier) {
  const r = { t: Date.now(), palier, cpuPoste: cpuPoste(), memLibreGo: Math.round(os.freemem() / 1e8) / 10 };
  const st = await qa("SHOW GLOBAL STATUS WHERE Variable_name IN ('" + statutMaria.join("','") + "')");
  st.split('\n').filter(Boolean).forEach((l) => { const [k, v] = l.split('\t'); r[k] = Number(v); });
  r.requetesLongues = Number(await qa("SELECT COUNT(*) FROM information_schema.processlist WHERE command = 'Query' AND time >= 5 AND info NOT LIKE '%processlist%'")) || 0;
  if (PID) {
    const g = await new Promise((ok) => execFile(JSTAT, ['-gc', PID], { encoding: 'utf8' }, (e, out) => ok(e ? '' : out)));
    const [tete, val] = g.trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/));
    if (tete && val) { const v = (k) => Number(String(val[tete.indexOf(k)]).replace(',', '.'));
      r.tasMo = Math.round((v('S0U') + v('S1U') + v('EU') + v('OU')) / 1024); r.tasMaxMo = Math.round((v('S0C') + v('S1C') + v('EC') + v('OC')) / 1024);
      r.vieuxMo = Math.round(v('OU') / 1024); r.gcS = v('GCT'); r.gcComplets = v('FGC'); }
  }
  releves.push(r);
}

/* ---------- un poste ---------- */
const gestes = [];
const erreurs = [];
async function poste(b, i, fin, palier) {
  const role = ROLES[i];
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  /* impression du ticket bloquee : pas de vrai ticket envoye a l'imprimante */
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  let enVol = 0, derniere = Date.now();
  const suivi = (r) => ['xhr', 'fetch', 'document', 'script'].indexOf(r.resourceType()) >= 0;
  p.on('request', (r) => { if (suivi(r)) { enVol++; derniere = Date.now(); } });
  const finReq = (r) => { if (suivi(r)) { enVol = Math.max(0, enVol - 1); derniere = Date.now(); } };
  p.on('requestfinished', finReq);
  p.on('requestfailed', (r) => { finReq(r); if (!/\/vente\/ticket\//.test(r.url()) && suivi(r)) {
    erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'requete echouee', detail: r.method() + ' ' + r.url().replace(/^.*\/prestige/, '') + ' ' + (r.failure() || {}).errorText }); } });
  p.on('response', (r) => { if (r.status() >= 500) { erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'HTTP ' + r.status(), detail: r.request().method() + ' ' + r.url().replace(/^.*\/prestige/, '').slice(0, 200) }); } });
  p.on('pageerror', (e) => erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'erreur JavaScript', detail: String(e.message).slice(0, 300) }));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));

  async function repos() {
    const limite = Date.now() + GESTE_MAX;
    while (Date.now() < limite) {
      const masque = await p.evaluate(() => !!(window.Ext && (Ext.ComponentQuery.query('loadmask{isVisible()}').length
        || Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'), (e) => e.offsetParent !== null)))).catch(() => false);
      if (!masque && enVol === 0 && Date.now() - derniere >= 400) { return derniere; }
      await p.waitForTimeout(50);
    }
    throw new Error('geste non abouti en ' + GESTE_MAX / 1000 + ' s');
  }
  /* boite de message d'erreur visible : relevee, puis fermee */
  async function messageErreur(nom) {
    const t = await vues.texteMessage(p).catch(() => '');
    if (t && /erreur|error|exception|impossible|échec|echec|failure|500/i.test(t)) {
      erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'message', detail: nom + ' : ' + t.slice(0, 300) });
      await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {});
    }
  }
  async function geste(nom, action) {
    const t0 = Date.now();
    let ok = true, detail = '';
    try { await action(); const tf = await repos(); await messageErreur(nom); gestes.push({ t: t0, palier, poste: i, role, nom, ms: Math.max(0, tf - t0), ok }); return; }
    catch (e) { ok = false; detail = String(e.message).split('\n')[0].slice(0, 200); }
    gestes.push({ t: t0, palier, poste: i, role, nom, ms: Date.now() - t0, ok });
    /* ce que montrait l'ecran : boite de message visible et capture */
    const ecran = await vues.texteMessage(p).catch(() => '');
    const capture = path.join(path.dirname(SORTIE), 'echec-p' + palier + '-poste' + i + '-' + Date.now() + '.png');
    await p.screenshot({ path: capture }).catch(() => {});
    erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'geste en echec', detail: nom + ' : ' + detail + (ecran ? ' ; écran : ' + ecran.slice(0, 200) : ''), capture });
    await messageErreur(nom);
  }
  /* ecran par son xtype : libelles lus dans l'arbre du menu de l'utilisateur, puis clic dans le menu */
  async function ouvrir(xtype) {
    await p.evaluate(() => { try { prestigeShowMetro(); } catch (e) { /* ancien en-tete */ } }).catch(() => {});
    await p.waitForTimeout(500);
    const lib = await p.evaluate((x) => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
      .cascadeBy((n) => { if (!r && n.get('id') === x && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; }, xtype);
    if (!lib) { throw new Error('ecran ' + xtype + ' absent du menu'); }
    await vues.ouvrirMenu(p, lib[0], lib[1]);
  }
  const poser = (requete, d) => p.evaluate(([r, v]) => { const c = r.charAt(0) === '#' && r.indexOf(' ') < 0 ? Ext.getCmp(r.slice(1)) : Ext.ComponentQuery.query(r)[0];
    c.setValue(Ext.Date.parse(v, 'Y-m-d')); }, [requete, d]);
  async function bouton(xtype, texte) {
    const id = await p.evaluate(([x, t]) => { const v = Ext.ComponentQuery.query(x).filter((c) => c.isVisible(true))[0]; if (!v) { return null; }
      const btn = v.query('button').filter((b) => b.isVisible(true) && new RegExp('^\\s*' + t + '\\s*$', 'i').test((b.getText() || '').replace(/&eacute;/g, 'é')))[0];
      return btn ? btn.getId() : null; }, [xtype, texte]);
    if (!id) { throw new Error('bouton « ' + texte + ' » introuvable dans ' + xtype); }
    await p.click('#' + id);
  }

  try {
    await geste('connexion', () => vues.connexion(p, login(i), 'e2etest'));
    const aujourdhui = jour(new Date());
    if (role === 'caisse') {
      /* caisse fermee : l'ecran le propose au moment de terminer la vente (« Votre caisse est fermée, voulez-vous
         l'ouvrir ? ») ; Oui, puis « Ouvrir caisse » dans la fenetre d'ouverture, comme la caissiere */
      const ouvrirCaisseSiProposee = async () => {
        const fin = Date.now() + 3000;
        while (Date.now() < fin) {
          if (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /caisse est ferm/i.test(m.el.dom.textContent)))) {
            await vues.repondre(p, 'yes');
            await p.waitForFunction(() => { const b = Ext.getCmp('btnValidate'); return b && b.isVisible(true) && !b.isDisabled(); }, null, { timeout: GESTE_MAX });
            await vues.saisir(p, '#coffreCaisseAmount', '20000');
            const ouverture = p.waitForResponse((r) => /\/caisse\/ouvrir-caisse/.test(r.url()), { timeout: GESTE_MAX });
            await vues.cliquer(p, '#btnValidate');
            await ouverture;
            /* « Confirmation de l'impression du ticket » d'ouverture : Non (pas d'impression) */
            const finTicket = Date.now() + 5000;
            while (Date.now() < finTicket) {
              if (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /impression du ticket/i.test(m.el.dom.textContent)))) {
                await vues.repondre(p, 'no');
                break;
              }
              await p.waitForTimeout(200);
            }
            return true;
          }
          await p.waitForTimeout(200);
        }
        return false;
      };
      await ouvrir('cloturerventemanager');
      await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await vues.cliquer(p, 'cloturerventemanager #addBtn');
      const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
      await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
      await p.waitForTimeout(1500);
      while (Date.now() < fin) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let k = 0; k < n && Date.now() < fin; k++) {
          const [cip] = hasard(ARTICLES);
          await geste('caisse : article ajouté', async () => {
            await vues.cliquer(p, CHAMP);
            await p.keyboard.press('Control+A');
            await p.keyboard.type(cip, { delay: 15 });
            const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: GESTE_MAX });
            await p.keyboard.press('Enter');
            const r = await rep;
            if (r.status() >= 400) { throw new Error('ajout refusé ' + r.status()); }
          });
          await p.waitForTimeout(600);
        }
        await geste('caisse : vente terminée', async () => {
          const net = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); const d = c.getNetAmountToPay(); return d ? d.montantNet : 0; });
          if (!net) { throw new Error('vente sans montant'); }
          /* apres un ajout, l'ecran rend le curseur a la recherche produit : attendre le focus dans « Montant reçu »
             avant de taper, sinon le premier chiffre part dans l'autre champ */
          await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
          await p.waitForFunction(() => document.activeElement === Ext.ComponentQuery.query('doventemanager #contenu #montantRecu')[0].inputEl.dom, null, { timeout: 10000 });
          await p.waitForTimeout(300);
          await p.keyboard.press('Control+A');
          await p.keyboard.type(String(net), { delay: 15 });
          await p.waitForTimeout(300);
          const rep = p.waitForResponse((r) => /\/vente\/cloturer\/vno/.test(r.url()), { timeout: GESTE_MAX });
          await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
          await ouvrirCaisseSiProposee();
          const r = await rep;
          const corps = await r.json().catch(() => ({}));
          if (r.status() >= 400 || corps.success === false) { throw new Error('clôture refusée ' + r.status() + ' ' + String(corps.msg || '').slice(0, 120)); }
          /* « Voulez-vous imprimer le ticket ? » : Non */
          await p.waitForTimeout(400);
          if (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /imprimer le ticket/i.test(m.el.dom.textContent)))) {
            await vues.repondre(p, 'no');
          }
        });
        await p.waitForTimeout(PAUSE_CAISSE);
      }
    } else if (role === 'recherche') {
      await geste('fiche article : ouverture', () => ouvrir('famillemanager'));
      while (Date.now() < fin) {
        await geste('fiche article : recherche', async () => { await vues.saisir(p, '#rechecher', hasard(MOTS)); await p.keyboard.press('Enter'); });
        await p.waitForTimeout(1500);
        await geste('fiche article : aperçu', async () => {
          const n = await p.locator('.x-grid-row:visible').count();
          if (n > 1) { await p.locator('.x-grid-row:visible').nth(1 + Math.floor(Math.random() * Math.min(n - 1, 15))).locator('td').nth(2).dblclick(); }
        });
        await p.waitForTimeout(4000);
      }
    } else if (role === 'commande') {
      while (Date.now() < fin) {
        await geste('commande : ouverture', () => ouvrir('i_order_manager'));
        await geste('commande : nouvelle commande', async () => {
          await bouton('commandesencours', 'NOUVELLE COMMANDE');
          await p.waitForFunction(() => Ext.getCmp('str_NAME') && Ext.getCmp('str_NAME').rendered, null, { timeout: 60000 });
        });
        await p.waitForTimeout(800);
        await p.evaluate((g) => { const c = Ext.getCmp('lgGROSSISTEID'); c.getStore().load({ callback: () => c.setValue(g) }); }, GROSSISTE);
        await p.waitForFunction((g) => Ext.getCmp('lgGROSSISTEID').getValue() === g, GROSSISTE, { timeout: 30000 }).catch(() => {});
        for (let k = 0; k < 3 && Date.now() < fin; k++) {
          const [cip] = hasard(ARTICLES);
          await geste('commande : article ajouté', async () => {
            await p.click('#str_NAME-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.type(cip, { delay: 15 });
            await p.waitForFunction((c) => { const x = Ext.getCmp('str_NAME'); return x.isExpanded && x.getStore().getCount() > 0 && !x.getStore().isLoading(); }, cip, { timeout: GESTE_MAX });
            await p.locator('#' + await p.evaluate(() => Ext.getCmp('str_NAME').picker.getId()) + ' .x-boundlist-item').first().click();
            await p.waitForFunction(() => document.activeElement && /int_QUANTITE/.test(document.activeElement.id), null, { timeout: 15000 });
            await p.keyboard.press('Control+A'); await p.keyboard.type('5'); await p.keyboard.press('Enter');
          });
          await p.waitForTimeout(2000);
        }
        await p.waitForTimeout(5000);
      }
    } else if (role === 'etats') {
      while (Date.now() < fin) {
        await geste('états : Ticket Z du jour', async () => {
          await ouvrir('ticketzmanager');
          await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: GESTE_MAX });
          await poser('ticketzmanager #dtStart', aujourdhui); await poser('ticketzmanager #dtEnd', aujourdhui);
          await bouton('ticketzmanager', 'Afficher');
        });
        await p.waitForTimeout(3000);
        await geste('états : ventes terminées du jour', async () => {
          await ouvrir('ventemanager');
          await poser('ventemanager #dtStart', aujourdhui); await poser('ventemanager #dtEnd', aujourdhui);
          await vues.cliquer(p, 'ventemanager #rechercher');
        });
        await p.waitForTimeout(3000);
        await geste('états : récap articles vendus, 7 jours', async () => {
          await ouvrir('articlevendurecapitulatif');
          await poser('#dt_debut', jour(new Date(Date.now() - 6 * 86400000))); await poser('#dt_fin', aujourdhui);
          await bouton('articlevendurecapitulatif', 'rechercher');
        });
        await p.waitForTimeout(10000);
      }
    } else if (role === 'suggestion') {
      await ouvrir('articlevendurecapitulatif');
      await p.waitForFunction(() => Ext.getCmp('str_TYPE_TRANSACTION') && Ext.getCmp('str_TYPE_TRANSACTION').rendered, null, { timeout: GESTE_MAX });
      await poser('#dt_debut', jour(new Date(Date.now() - (PERIODE_LOURDE - 1) * 86400000))); await poser('#dt_fin', aujourdhui);
      await p.evaluate(() => { Ext.getCmp('str_TYPE_TRANSACTION').setValue('ALL'); });
      while (Date.now() < fin) {
        await geste('état lourd : suggestion ' + PERIODE_LOURDE + ' jours', async () => {
          const id = await p.evaluate(() => Ext.ComponentQuery.query('articlevendurecapitulatif splitbutton[text=Suggerer]')[0].getId());
          const box = await p.locator('#' + id).boundingBox();
          await p.mouse.click(box.x + box.width - 6, box.y + box.height / 2);
          await p.locator('.x-menu-item:visible').filter({ hasText: /quantités vendues/ }).first().click();
          await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /produits suggérés/.test(m.el.dom.textContent)), null, { timeout: 2400000 });
          await p.evaluate(() => Ext.MessageBox.hide());
        });
      }
    } else if (role === 'facturation') {
      const debutMois = jour(new Date(Date.now() - 30 * 86400000));
      while (Date.now() < fin) {
        await geste('facturation : factures du mois', async () => {
          await ouvrir('facturemanager');
          await p.waitForFunction(() => Ext.getCmp('datedebut') && Ext.getCmp('datedebut').rendered, null, { timeout: GESTE_MAX });
          await poser('#datedebut', debutMois); await poser('#datefin', aujourdhui);
          await bouton('facturemanager', 'rechercher');
        });
        await p.waitForTimeout(3000);
        await geste('facturation : bons à facturer du mois', async () => {
          await bouton('facturemanager', 'Créer');
          await p.waitForFunction(() => Ext.getCmp('dt_debut') && Ext.getCmp('dt_debut').rendered, null, { timeout: GESTE_MAX });
          await poser('#dt_debut', debutMois); await poser('#dt_fin', aujourdhui);
          await vues.cliquer(p, '#btn_add');
        });
        await p.waitForTimeout(15000);
      }
    }
  } catch (e) {
    const ecran = await vues.texteMessage(p).catch(() => '');
    const capture = path.join(path.dirname(SORTIE), 'arret-p' + palier + '-poste' + i + '-' + Date.now() + '.png');
    await p.screenshot({ path: capture }).catch(() => {});
    erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'poste arrêté', detail: String(e.message).split('\n')[0].slice(0, 300) + (ecran ? ' ; écran : ' + ecran.slice(0, 200) : ''), capture });
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* ---------- paliers ---------- */
(async () => {
  preparerComptes();
  const b = await ENV_E2E.lancer(chromium);
  console.log(new Date().toISOString() + ' base ' + DB + ', ' + ARTICLES.length + ' articles, paliers ' + PALIERS.join(', ') + ', ' + DUREE / 1000 + ' s par palier');
  const resultat = { base: DB, debut: new Date().toISOString(), paliers: [] };
  for (const n of PALIERS) {
    const debut = Date.now();
    const fin = debut + DUREE;
    const minuteur = setInterval(() => relever(n).catch(() => {}), 5000);
    await relever(n);
    /* postes lances a 3 s d'intervalle, comme une ouverture d'officine */
    const postes = [];
    for (let i = 0; i < n; i++) { postes.push(poste(b, i, fin, n)); await new Promise((r) => setTimeout(r, 3000)); }
    if (LOURDS) {
      await new Promise((r) => setTimeout(r, 60000));
      for (let k = 0; k < LOURDS; k++) { postes.push(poste(b, Math.max(...PALIERS) + k, fin, n)); }
    }
    await Promise.all(postes);
    clearInterval(minuteur);
    await relever(n);
    const g = gestes.filter((x) => x.palier === n);
    const ventes = g.filter((x) => x.nom === 'caisse : vente terminée' && x.ok).length;
    const rel = releves.filter((x) => x.palier === n);
    const par = {};
    g.forEach((x) => { (par[x.nom] = par[x.nom] || []).push(x); });
    const quantile = (t, qq) => { const s = t.slice().sort((a, c) => a - c); return s.length ? s[Math.min(s.length - 1, Math.floor(qq * s.length))] : null; };
    const synthese = { postes: n, dureeS: Math.round((Date.now() - debut) / 1000), ventes, ventesParHeure: Math.round(ventes * 3600000 / (Date.now() - debut)),
      erreurs: erreurs.filter((x) => x.palier === n).length,
      gestes: Object.keys(par).map((k) => ({ nom: k, n: par[k].length, echecs: par[k].filter((x) => !x.ok).length,
        mediane: quantile(par[k].map((x) => x.ms), 0.5), p90: quantile(par[k].map((x) => x.ms), 0.9), max: Math.max(...par[k].map((x) => x.ms)) })),
      serveur: { tasMaxMo: Math.max(...rel.map((x) => x.tasMo || 0)), vieuxMaxMo: Math.max(...rel.map((x) => x.vieuxMo || 0)),
        gcS: rel.length ? Math.round(((rel[rel.length - 1].gcS || 0) - (rel[0].gcS || 0)) * 10) / 10 : null,
        gcComplets: rel.length ? (rel[rel.length - 1].gcComplets || 0) - (rel[0].gcComplets || 0) : null,
        connexionsMax: Math.max(...rel.map((x) => x.Threads_connected || 0)), enCoursMax: Math.max(...rel.map((x) => x.Threads_running || 0)),
        attentesVerrou: rel.length ? (rel[rel.length - 1].Innodb_row_lock_waits || 0) - (rel[0].Innodb_row_lock_waits || 0) : null,
        interblocages: rel.length ? (rel[rel.length - 1].Innodb_deadlocks || 0) - (rel[0].Innodb_deadlocks || 0) : null,
        requetesLonguesMax: Math.max(...rel.map((x) => x.requetesLongues || 0)) },
      poste: { cpuMax: Math.max(...rel.map((x) => x.cpuPoste || 0)), memLibreMinGo: Math.min(...rel.map((x) => x.memLibreGo || 99)) } };
    resultat.paliers.push(synthese);
    console.log(`\n=== ${n} poste(s) : ${ventes} ventes (${synthese.ventesParHeure}/h), ${synthese.erreurs} erreur(s) ; tas Java max ${synthese.serveur.tasMaxMo} Mo,`
      + ` GC ${synthese.serveur.gcS} s (${synthese.serveur.gcComplets} complets), connexions max ${synthese.serveur.connexionsMax}, verrous ${synthese.serveur.attentesVerrou},`
      + ` interblocages ${synthese.serveur.interblocages} ; poste de test : CPU max ${synthese.poste.cpuMax} %, memoire libre min ${synthese.poste.memLibreMinGo} Go`);
    synthese.gestes.forEach((x) => console.log(`   ${x.nom.padEnd(42)} n=${String(x.n).padStart(4)}  echecs ${x.echecs}  mediane ${x.mediane} ms  p90 ${x.p90} ms  max ${x.max} ms`));
    erreurs.filter((x) => x.palier === n).slice(0, 8).forEach((x) => console.log('   ! poste ' + x.poste + ' (' + x.role + ') ' + x.type + ' : ' + x.detail));
    fs.writeFileSync(SORTIE, JSON.stringify(Object.assign({}, resultat, { gestes, erreurs, releves })));
  }
  await b.close();
  console.log('\nResultats : ' + SORTIE);
})();
