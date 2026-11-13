/* RH, CREATION D'EQUIPE : RECHERCHE DES MEMBRES (plan du 12/11 : « Création équipe pas ergonomique, pas de recherche
 * manuelle, il faut dérouler tous les utilisateurs »).
 *
 * Vrai chemin (admin) : menu RESSOURCES HUMAINES, onglet Planning, bouton « Équipes », « Nouvelle », nom tape au
 * clavier ; champ « Rechercher un employé » tape au clavier ; cases cochees a la souris. Jeu d'essai varie, retire a la
 * fin : trois employes (accents dans le prenom et le poste, matricules differents).
 * Controles :
 *  - le champ de recherche est au-dessus de la liste des membres ;
 *  - recherche sans accents ni casse, sur plusieurs mots, par nom, prenom, matricule, poste : seuls les employes
 *    correspondants restent ; aucune correspondance : message dans la liste ;
 *  - un employe coche reste coche quand la recherche le masque, et quand elle est videe ; le titre compte les coches ;
 *  - decocher pendant une recherche retire bien le membre ;
 *  - enregistrer pendant qu'une recherche masque un membre coche : il est enregistre ;
 *  - rapprochement : membres en base = API des equipes = cases cochees a la reouverture de l'equipe = compte du titre ;
 *  - bilan : une equipe et ses membres crees, rien d'autre (planning intact) ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const NOM = 'ZZ E2E Recherche équipe';
const EMP = [
  { id: 'E2E-RHQ-1', mat: 'E2EQ-101', nom: 'E2E RECHEQ', prenoms: 'Hélène', poste: 'Caissière' },
  { id: 'E2E-RHQ-2', mat: 'E2EQ-102', nom: 'E2E RECHEQ', prenoms: 'Bruno', poste: 'Vendeur' },
  { id: 'E2E-RHQ-3', mat: 'E2EQ-203', nom: 'E2E AUTREQ', prenoms: 'Chloé', poste: 'Préparateur' },
];
const ids = EMP.map((e) => "'" + e.id + "'").join(',');

function nettoyer() {
  q(`DELETE FROM t_equipe_membre WHERE equipe_id IN (SELECT id FROM t_equipe WHERE nom = '${NOM}') OR employe_id IN (${ids});
    DELETE FROM t_equipe_programme WHERE equipe_id IN (SELECT id FROM t_equipe WHERE nom = '${NOM}'); DELETE FROM t_equipe WHERE nom = '${NOM}';
    DELETE FROM t_employe WHERE id IN (${ids})`);
}
const membresEnBase = () => q(`SELECT IFNULL(GROUP_CONCAT(m.employe_id ORDER BY m.employe_id), '') FROM t_equipe_membre m JOIN t_equipe e ON e.id = m.equipe_id WHERE e.nom = '${NOM}'`);
const empreinte = () => ['t_equipe', 't_equipe_membre', 't_planning', 't_employe', 't_absence'].map((t) => t + '=' + q('SELECT COUNT(*) FROM ' + t)).join(' ');

(async () => {
  nettoyer();
  q('INSERT INTO t_employe (id, matricule, nom, prenoms, poste, statut, created_at) VALUES '
    + EMP.map((e) => `('${e.id}', '${e.mat}', '${e.nom}', '${e.prenoms}', '${e.poste}', 'ACTIF', NOW())`).join(', '));
  const avant = empreinte();
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    const erreurs = [], dialogues = [];
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'rhmanager', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu rhmanager absent pour ce compte'); }
    await ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.locator('.x-tab', { hasText: 'Planning' }).first().click();
    await p.waitForTimeout(1500);
    const id = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    await p.click('#' + await id('rhmanager #btnEquipes'));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('#fenetreEquipes #equipeMembres')[0];
      return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 20000 });
    await p.click('#' + await id('#fenetreEquipes #btnNouvelleEquipe'));
    await p.waitForTimeout(500);
    await p.click('#' + await id('#fenetreEquipes #equipeNom') + ' input');
    await p.keyboard.type(NOM, { delay: 10 });

    const champ = await id('#fenetreEquipes #rechercheMembre');
    ok('Champ « Rechercher un employé » présent, au-dessus de la liste des membres', !!champ && await p.evaluate(() => {
      const f = Ext.ComponentQuery.query('#fenetreEquipes #rechercheMembre')[0], g = Ext.ComponentQuery.query('#fenetreEquipes #equipeMembres')[0];
      return f.isVisible(true) && f.getEl().dom.getBoundingClientRect().bottom <= g.getEl().dom.getBoundingClientRect().top + 1; }));
    if (!champ) { throw new Error('pas de champ de recherche'); }
    const chercher = async (texte) => {
      await p.click('#' + champ + ' input');
      await p.keyboard.press('Control+A');
      await p.keyboard.press('Delete');
      if (texte) { await p.keyboard.type(texte, { delay: 15 }); }
      await p.waitForTimeout(600);
    };
    const etat = () => p.evaluate(() => {
      const g = Ext.ComponentQuery.query('#fenetreEquipes #equipeMembres')[0], sm = g.getSelectionModel();
      const lignes = Array.from(g.getView().getEl().dom.querySelectorAll('.x-grid-row')).filter((n) => n.offsetParent !== null)
        .map((n) => ({ texte: n.innerText.replace(/\s+/g, ' '), coche: n.classList.contains('x-grid-row-selected') }));
      return { lignes, titre: g.title, vide: g.getView().getEl().dom.innerText };
    });
    const cocher = async (mat) => { await p.locator('#' + await id('#fenetreEquipes #equipeMembres') + ' .x-grid-row', { hasText: mat }).first().locator('.x-grid-row-checker').click(); await p.waitForTimeout(300); };
    const nos = (e) => e.lignes.map((l) => (l.texte.match(/E2EQ-\d+/) || ['?'])[0] + (l.coche ? '+' : '')).sort().join(',');

    await chercher('helene recheq');
    let e = await etat();
    ok('« helene recheq » (sans accent, deux mots) : seule Hélène', nos(e) === 'E2EQ-101', JSON.stringify(e.lignes));
    await cocher('E2EQ-101');
    await chercher('e2eq-102');
    e = await etat();
    ok('« e2eq-102 » (matricule) : seul Bruno, Hélène masquée', nos(e) === 'E2EQ-102', JSON.stringify(e.lignes));
    await cocher('E2EQ-102');
    e = await etat();
    ok('Titre : 2 cochés (Hélène masquée comptée)', /Membres : 2 cochés/.test(e.titre), e.titre);
    await chercher('PREPARATEUR autreq');
    e = await etat();
    ok('« PREPARATEUR autreq » (poste, casse) : seule Chloé, non cochée', nos(e) === 'E2EQ-203', JSON.stringify(e.lignes));
    await chercher('');
    e = await etat();
    const nosTous = e.lignes.map((l) => (l.texte.match(/E2EQ-\d+/) || [''])[0] + (l.coche ? '+' : '')).filter((x) => /E2EQ/.test(x)).sort().join(',');
    ok('Recherche vidée : tous les employés, Hélène et Bruno toujours cochés', nosTous === 'E2EQ-101+,E2EQ-102+,E2EQ-203' && e.lignes.length >= 3, nosTous);
    await chercher('recheq e2e');
    await cocher('E2EQ-102');
    e = await etat();
    ok('Décocher Bruno pendant une recherche : retiré, Hélène gardée', nos(e) === 'E2EQ-101+,E2EQ-102' && /Membres : 1 coché /.test(e.titre), nos(e) + ' / ' + e.titre);
    await chercher('zzzz-aucun');
    e = await etat();
    ok('Aucune correspondance : message dans la liste', e.lignes.length === 0 && /Aucun employé ne correspond/.test(e.vide), e.vide);
    /* enregistrement pendant que la recherche masque Hélène */
    await chercher('e2eq-203');
    await p.click('#' + await id('#fenetreEquipes #btnEnregistrerEquipe'));
    await p.waitForTimeout(2500);
    ok('Enregistrer, Hélène masquée par la recherche : seule Hélène est membre en base', membresEnBase() === 'E2E-RHQ-1', membresEnBase());
    const api = await p.evaluate(async (n) => { const r = await (await fetch('../api/v1/rh/equipes')).json();
      const eq = (r.data || []).find((x) => x.nom === n); return eq ? eq.membres.map((m) => m.id).sort().join(',') : null; }, NOM);
    ok('Rapprochement : API des équipes = base', api === membresEnBase(), api);
    /* reouverture : choisir l'equipe dans la liste */
    await p.click('#' + await id('#fenetreEquipes #btnNouvelleEquipe'));
    await p.waitForTimeout(500);
    await p.click('#' + await id('#fenetreEquipes #equipeChoisie') + ' input');
    await p.locator('.x-boundlist-item:visible', { hasText: NOM }).first().click();
    await p.waitForTimeout(800);
    e = await etat();
    const coches = e.lignes.filter((l) => l.coche).map((l) => (l.texte.match(/E2EQ-\d+/) || ['autre'])[0]).sort().join(',');
    ok('Rapprochement : réouverture = base (cases cochées), recherche vidée, titre 1 coché', coches === 'E2EQ-101' && /Membres : 1 coché /.test(e.titre)
      && await p.evaluate(() => Ext.ComponentQuery.query('#fenetreEquipes #rechercheMembre')[0].getValue() === ''), coches + ' / ' + e.titre);
    const apres = empreinte().split(' '), av = avant.split(' ');
    ok('Bilan : une équipe et un membre de plus, planning, employés et absences intacts', apres[0] === 't_equipe=' + (Number(av[0].split('=')[1]) + 1)
      && apres[1] === 't_equipe_membre=' + (Number(av[1].split('=')[1]) + 1) && apres.slice(2).join(' ') === av.slice(2).join(' '), avant + ' / ' + empreinte());
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Remise en état : équipe et employés d\'essai retirés', empreinte() === (() => { const a = avant.split(' '); return a.map((x) => x.startsWith('t_employe=') ? 't_employe=' + (Number(x.split('=')[1]) - 3) : x).join(' '); })(),
      empreinte());
  }
  const n = res.filter((r) => r.c).length;
  console.log('===== ' + n + '/' + res.length + (n === res.length ? ' PASS' : ' ECHEC') + ' =====');
  process.exit(n === res.length ? 0 : 1);
})();
