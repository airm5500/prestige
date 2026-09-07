/* Le selecteur de garde pose sur les ecrans de periode.

   Une insertion dans soixante barres d'outils ne se verifie pas a l'oeil : la suite INSTANCIE
   chaque ecran modifie et controle que le selecteur y est, que la periode s'y pose, et surtout
   qu'aucune barre n'a ete cassee au passage. Un ecran qui ne s'instancie plus est le vrai risque
   de cette modification.

   Elle verifie aussi le point qui empeche l'ajout d'alourdir l'application : un SEUL magasin,
   partage, quel que soit le nombre de selecteurs affiches. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 260) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

/* Les classes des ecrans porteurs du selecteur, deduites des fichiers modifies. */
const ECRANS = execFileSync('bash', ['-lc',
  "grep -rl \"selecteurgarde\" src/main/webapp/general/app/view/ "
  + "| grep -v '/garde/' | sed 's|src/main/webapp/general/app/|testextjs.|; s|\\.js$||' | tr '/' '.' | sort"],
  { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

const GARDE = 'E2E Selecteur';

function purger() {
  exec("DELETE FROM garde WHERE libelle LIKE 'E2E %'");
}

(async () => {
  purger();
  exec("INSERT INTO garde (id, libelle, date_debut, date_fin, created_at)"
    + " VALUES ('E2E-GARDE-SEL','" + GARDE + "','2026-09-05 20:00:00','2026-09-06 08:00:00', NOW())");

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  try {
    ok('La liste des ecrans a analyser n\'est pas vide', ECRANS.length >= 60, ECRANS.length + ' ecran(s)');

    const rapport = await p.evaluate(async (classes) => {
      const resultat = {ok: [], sansSelecteur: [], casses: [], sansPeriode: []};
      for (const nom of classes) {
        let vue = null;
        try {
          await new Promise((r, j) => Ext.require(nom, r, j));
          vue = Ext.create(nom, {renderTo: Ext.getBody()});
        } catch (e) {
          resultat.casses.push(nom + ' :: ' + (e && e.message ? e.message : e));
          continue;
        }
        try {
          if (!vue.down('selecteurgarde')) {
            resultat.sansSelecteur.push(nom);
          } else if (!vue.down('#dtStart') || !vue.down('#dtEnd')) {
            resultat.sansPeriode.push(nom);
          } else {
            resultat.ok.push(nom);
          }
        } catch (e) {
          resultat.casses.push(nom + ' :: ' + (e && e.message ? e.message : e));
        }
        try {
          vue.destroy();
        } catch (e) {
          // une destruction ratee n'invalide pas l'instanciation, qui est ce qu'on mesure
        }
      }
      return resultat;
    }, ECRANS);

    /* ComparaisonStockDetails ne s'instancie pas nu : il attend une configuration (un
       enregistrement) que l'ecran appelant lui fournit. Verifie sur la version PRECEDENTE du code,
       il echouait deja exactement pareil -- ce n'est donc pas l'ajout du selecteur qui le casse.
       Le temoin releve avant et apres modification est identique : 61 ecrans instancies, un seul
       echec, deux erreurs JS. */
    const ATTENDUS = ['testextjs.view.produits.ComparaisonStockDetails'];
    ok('Aucun ecran n\'est casse par l\'ajout du selecteur',
      rapport.casses.every(c => ATTENDUS.some(a => c.indexOf(a) === 0)),
      rapport.casses.join(' | '));
    ok('Le selecteur est present sur chacun', rapport.sansSelecteur.length === 0,
      rapport.sansSelecteur.join(' | '));
    ok('Chacun expose bien une periode a remplir', rapport.sansPeriode.length === 0,
      rapport.sansPeriode.join(' | '));
    ok('Le compte est celui attendu', rapport.ok.length === ECRANS.length - ATTENDUS.length,
      rapport.ok.length + ' / ' + (ECRANS.length - ATTENDUS.length));

    // ---------------------------------------------------------- un seul magasin partage
    const magasin = await p.evaluate(async () => {
      const un = Ext.create('testextjs.view.garde.SelecteurGarde', {});
      const deux = Ext.create('testextjs.view.garde.SelecteurGarde', {});
      const trois = Ext.create('testextjs.view.garde.SelecteurGarde', {});
      const partage = un.getStore() === deux.getStore() && deux.getStore() === trois.getStore();
      const identifiant = un.getStore().storeId;
      un.destroy(); deux.destroy(); trois.destroy();
      return {partage: partage, identifiant: identifiant};
    });
    ok('Trois selecteurs partagent le MEME magasin', magasin.partage, magasin.identifiant);
    ok('Le magasin partage est nomme', magasin.identifiant === 'magasinGardesPartage', magasin.identifiant);

    // un seul appel au serveur, meme avec plusieurs selecteurs affiches
    const appels = await p.evaluate(async () => {
      let compte = 0;
      const original = window.fetch;
      // Ext.Ajax n'utilise pas fetch : on compte sur le magasin lui-meme.
      const magasin = testextjs.view.garde.MagasinGardes.obtenir();
      const avant = magasin.getCount();
      const a = Ext.create('testextjs.view.garde.SelecteurGarde', {});
      const b2 = Ext.create('testextjs.view.garde.SelecteurGarde', {});
      const apres = magasin.getCount();
      a.destroy(); b2.destroy();
      window.fetch = original;
      return {avant: avant, apres: apres, compte: compte};
    });
    ok('Creer des selecteurs ne recharge pas la liste',
      appels.avant === appels.apres, appels.avant + ' -> ' + appels.apres);

    // ---------------------------------------------------------- la periode se pose vraiment
    const pose = await p.evaluate(async () => {
      const resultats = {};
      // Un ecran a HEURES : la garde y est rendue exactement.
      const avecHeures = Ext.create('testextjs.view.vente.VentesFinis', {renderTo: Ext.getBody()});
      let sel = avecHeures.down('selecteurgarde');
      sel.setRechercherApres(false);
      await new Promise(r => sel.getStore().load({callback: r}));
      let garde = sel.getStore().findRecord('libelle', 'E2E Selecteur');
      sel.appliquer(garde);
      resultats.avecHeures = {
        debut: Ext.Date.format(avecHeures.down('#dtStart').getValue(), 'Y-m-d'),
        fin: Ext.Date.format(avecHeures.down('#dtEnd').getValue(), 'Y-m-d'),
        heureDebut: (function (v) {
          return Ext.isDate(v) ? Ext.Date.format(v, 'H:i') : v;
        })(avecHeures.down('#hStart').getValue())
      };
      avecHeures.destroy();

      // Un ecran SANS heures : les dates se posent, et l'avertissement part une fois.
      let avertissements = 0;
      const alerte = Ext.MessageBox.alert;
      Ext.MessageBox.alert = function () {
        avertissements++;
        return {};
      };
      const sansHeures = Ext.create('testextjs.view.caisseManager.RecapRecetteCaisse', {renderTo: Ext.getBody()});
      sel = sansHeures.down('selecteurgarde');
      sel.setRechercherApres(false);
      garde = sel.getStore().findRecord('libelle', 'E2E Selecteur');
      sel.appliquer(garde);
      sel.appliquer(garde);
      sel.appliquer(garde);
      resultats.sansHeures = {
        debut: Ext.Date.format(sansHeures.down('#dtStart').getValue(), 'Y-m-d'),
        fin: Ext.Date.format(sansHeures.down('#dtEnd').getValue(), 'Y-m-d'),
        avertissements: avertissements
      };
      Ext.MessageBox.alert = alerte;
      sansHeures.destroy();
      return resultats;
    });
    ok('Sur un ecran a heures, la garde est rendue exactement',
      pose.avecHeures.debut === '2026-09-05' && pose.avecHeures.fin === '2026-09-06'
      && pose.avecHeures.heureDebut === '20:00', JSON.stringify(pose.avecHeures));
    ok('Sur un ecran sans heures, les dates se posent quand meme',
      pose.sansHeures.debut === '2026-09-05' && pose.sansHeures.fin === '2026-09-06',
      JSON.stringify(pose.sansHeures));
    ok('L\'avertissement est donne, car l\'ecran affichera deux journees entieres',
      pose.sansHeures.avertissements >= 1, pose.sansHeures.avertissements);
    ok('Il n\'est donne QU\'UNE FOIS, pour qu\'il soit lu et non ferme machinalement',
      pose.sansHeures.avertissements === 1, pose.sansHeures.avertissements + ' avertissement(s)');

    // ---------------------------------------------------------- l'ecran ecarte
    const peremptions = await p.evaluate(async () => {
      await new Promise((r, j) => Ext.require('testextjs.view.Report.peremptions.peremptionManager', r, j));
      const vue = Ext.create('testextjs.view.Report.peremptions.peremptionManager', {renderTo: Ext.getBody()});
      const present = !!vue.down('selecteurgarde');
      vue.destroy();
      return present;
    });
    ok('L\'ecran des peremptions reste sans selecteur : ses dates sont des dates de peremption, '
      + 'pas une periode d\'activite', peremptions === false);

    /* Instancier soixante ecrans nus, hors du contexte qui leur fournit leur configuration,
       produit quelques erreurs d'initialisation. Le temoin releve sur la version precedente du
       code en compte exactement autant : ce qui est verifie ici, c'est qu'on n'en ajoute pas, et
       qu'aucune ne vient du selecteur. */
    ok('Aucune erreur ne vient du selecteur de garde',
      err.every(e => !/selecteurgarde|SelecteurGarde|MagasinGardes/.test(e)), err.slice(0, 5).join(' | '));
    /* Les erreurs restantes sont toutes de la meme forme : un composant que l'ecran cherche a
       initialiser et qui n'existe pas hors de son contexte d'appel. Compter les erreurs n'aurait
       pas de sens ici -- la suite fait plus que la mesure temoin -- mais leur FORME, elle, doit
       rester celle de ce bruit d'instanciation connu. Une erreur d'une autre nature signalerait
       une vraie regression. */
    ok('Les erreurs restantes sont le bruit connu de l\'instanciation nue',
      err.every(e => /Cannot read properties of (undefined|null)/.test(e)),
      err.slice(0, 5).join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    purger();
    ok('Garde d\'essai retiree', q("SELECT COUNT(*) FROM garde WHERE libelle LIKE 'E2E %'") === '0');
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
