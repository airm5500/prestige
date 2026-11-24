/* RETOUR DU 22/11, FACTURATION > FACTURES, « DÉJÀ FACTURÉ ? » : le numero de bon se cherche par « contient » (avant :
 * a l'identique), et « Fermer » (ou « Déjà facturé ? » a nouveau) vide la recherche faite.
 *
 * Jeu d'essai lu en base (rien n'est ecrit) : un bon facture dont le numero a au moins 6 caracteres ; on cherche un
 * morceau du MILIEU de son numero (ni le debut ni le numero entier).
 * Par le vrai menu, en 1366×768 :
 *  - morceau + Entree : rapprochement avec la base, bon par bon : les bons affiches sont exactement ceux dont le numero
 *    affiche (celui de la part tiers payant, sinon celui de la vente) contient le morceau (ventes closes, non annulees) ;
 *    le bon d'essai y est, avec sa facture ;
 *  - « Fermer » : panneau ferme ; rouvert, champ vide, liste vide, message d'origine ;
 *  - meme chose en refermant par le bouton « Déjà facturé ? » ;
 *  - bilan : aucune ecriture (factures, details) ; aucune fenetre surgissante ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const BON = "COALESCE(NULLIF(p.str_REF_BON, ''), v.str_REF_BON)";

(async () => {
  /* un bon facture, numero de 6 caracteres au moins, morceau du milieu qui ne ramene pas plus de 60 bons */
  const candidats = q("SELECT " + BON + " FROM t_facture_detail d JOIN t_preenregistrement_compte_client_tiers_payent p ON p.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = d.str_REF"
    + " JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID WHERE v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0"
    + " AND CHAR_LENGTH(" + BON + ") >= 6 AND " + BON + " REGEXP '^[A-Za-z0-9-]+$' ORDER BY v.dt_UPDATED DESC LIMIT 200").split('\n').filter(Boolean);
  let morceau = null, bonEssai = null, attendus = null;
  for (const c of candidats) {
    const m = c.slice(1, Math.min(c.length - 1, 6));
    if (m.length < 3) { continue; }
    const l = q("SELECT DISTINCT " + BON + " FROM t_preenregistrement_compte_client_tiers_payent p JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
      + " WHERE v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0 AND " + BON + " LIKE '%" + m + "%' LIMIT 61").split('\n').filter(Boolean);
    if (l.length >= 1 && l.length <= 60 && l.some((x) => !x.startsWith(m))) { morceau = m; bonEssai = c; attendus = l.sort(); break; }
  }
  if (!morceau) { ok('Jeu d\'essai : un bon facturé avec un numéro d\'au moins 6 caractères', false); process.exit(1); }
  console.log(`bon ${bonEssai}, morceau « ${morceau} », ${attendus.length} bon(s) attendu(s)`);
  const traces0 = q('SELECT CONCAT((SELECT COUNT(*) FROM t_facture), "/", (SELECT COUNT(*) FROM t_facture_detail))');

  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await V.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await p.waitForFunction(() => Ext.ComponentQuery.query('facturemanager #btnDejaFacture').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const etat = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('facturemanager')[0], x = g.down('#panneauDejaFacture');
      return { ouvert: x.isVisible(true), champ: x.down('#dfRecherche').getValue() || '', lignes: x.down('#dfResultats').getStore().getRange().map((r) => ({ bon: r.get('bon'), etat: r.get('etat'), facture: r.get('facture') })),
        message: x.down('#dfEtat').getEl().dom.textContent }; });
    const chercher = async () => {
      await V.cliquer(p, 'facturemanager #btnDejaFacture'); await p.waitForTimeout(500);
      const id = await p.evaluate(() => Ext.ComponentQuery.query('facturemanager #dfRecherche')[0].inputEl.dom.id);
      await p.click('#' + id); await p.keyboard.type(morceau, { delay: 30 });
      await Promise.all([p.waitForResponse((r) => /deja-facture/.test(r.url()), { timeout: 60000 }), p.keyboard.press('Enter')]);
      await p.waitForTimeout(600);
      return etat();
    };
    const e1 = await chercher();
    const affiches = [...new Set(e1.lignes.map((x) => x.bon))].sort();
    ok(`« ${morceau} » (milieu du numéro) : les bons affichés = bons de la base dont le numéro contient le morceau (${attendus.length})`,
      JSON.stringify(affiches) === JSON.stringify(attendus), affiches.length + ' / ' + attendus.length + ' ; manquants : ' + attendus.filter((x) => !affiches.includes(x)).slice(0, 5).join(' | ')
      + ' ; en trop : ' + affiches.filter((x) => !attendus.includes(x)).slice(0, 5).join(' | '));
    const ligne = e1.lignes.find((x) => x.bon === bonEssai);
    ok(`Le bon d'essai ${bonEssai} est trouvé, facturé`, ligne && ligne.etat === 'FACTURE' && ligne.facture && ligne.facture.code, JSON.stringify(ligne));

    await V.cliquer(p, 'facturemanager #dfFermer'); await p.waitForTimeout(400);
    const e2 = await etat();
    ok('« Fermer » : panneau fermé', !e2.ouvert);
    await V.cliquer(p, 'facturemanager #btnDejaFacture'); await p.waitForTimeout(500);
    const e3 = await etat();
    ok('Rouvert après « Fermer » : champ vide, liste vide, message d\'origine', e3.ouvert && e3.champ === '' && e3.lignes.length === 0 && /sans limite de période/.test(e3.message), JSON.stringify(e3).slice(0, 300));
    await V.cliquer(p, 'facturemanager #btnDejaFacture'); await p.waitForTimeout(400);

    const e4 = await chercher();
    ok('Nouvelle recherche : des bons affichés', e4.lignes.length > 0, e4.lignes.length);
    await V.cliquer(p, 'facturemanager #btnDejaFacture'); await p.waitForTimeout(400);
    await V.cliquer(p, 'facturemanager #btnDejaFacture'); await p.waitForTimeout(500);
    const e5 = await etat();
    ok('Refermé par « Déjà facturé ? » puis rouvert : champ vide, liste vide', e5.ouvert && e5.champ === '' && e5.lignes.length === 0, JSON.stringify(e5).slice(0, 300));

    const fenetres = await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((x) => x.isVisible()).length);
    ok('Aucune fenêtre surgissante', fenetres === 0, fenetres);
    ok('Bilan : aucune écriture (factures, détails)', q('SELECT CONCAT((SELECT COUNT(*) FROM t_facture), "/", (SELECT COUNT(*) FROM t_facture_detail))') === traces0);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const n = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - n) + '/' + res.length + (n ? ' ECHEC' : ' OK'));
  process.exit(n ? 1 : 0);
})();
