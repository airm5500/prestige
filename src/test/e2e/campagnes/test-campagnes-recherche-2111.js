/* CAMPAGNES : RECHERCHE SIMPLE ET FILTRES SUR UNE LIGNE (plan du 21/11, point 8.2).
 *
 * Par les vues (admin), Campagnes SMS / WhatsApp > Campagnes, onglets Infos clients, Infos pharmacie, Personnalisé,
 * a 1366×768, 1280×720 et 1920×1080 :
 *  - premiere ligne : la recherche simple « Nom ou téléphone » et « Voir les destinataires » ; le curseur est dans la
 *    recherche des l'ouverture de l'onglet ;
 *  - seconde ligne : tous les filtres (sexe, age, liste, achats, canal, accord) sur une seule ligne, dans l'ecran ;
 *  - « Accord » est une liste (« Accord : tous » / « Accord explicite seulement ») ;
 *  - listes deroulantes : la liste ouverte est au moins aussi large que le champ et chaque choix tient sur une ligne ;
 *  - Entree dans la recherche = rechercher. Rapprochement : filtres envoyes au serveur = valeurs de l'ecran ; total du
 *    titre de la grille = total de la reponse. Bilan : rien n'est ecrit (aucune campagne, aucune ligne).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ONGLETS = [['INFO_CLIENTS', 'Infos clients'], ['INFO_PHARMACIE', 'Infos pharmacie'], ['PERSONNALISE', 'Personnalisé']];
const TAILLES = [[1366, 768], [1280, 720], [1920, 1080]];

(async () => {
  const traces = () => q('SELECT CONCAT((SELECT COUNT(*) FROM t_campagne), \'/\', (SELECT COUNT(*) FROM t_campagne_ligne))');
  const traces0 = traces();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [], envois = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('request', (r) => { if (/campagnes?\/population/.test(r.url()) && r.method() === 'POST') { envois.push(r.postData() || ''); } });
  const onglet = async (titre) => { await p.click('.x-tab:has-text("' + titre + '")'); await p.waitForTimeout(1200); };
  /* geometrie d'un onglet : recherche, bouton Voir, filtres de la seconde ligne */
  const mesure = (code) => p.evaluate((c) => {
    const o = Ext.ComponentQuery.query('campagnes #onglet-' + c)[0], r = (x) => x.getEl().dom.getBoundingClientRect();
    const rech = o.down('#recherche'), voir = o.down('#voir'), corps = r(o);
    const filtres = ['sexe', 'ageMin', 'ageMax', 'liste', 'moisAchat', 'canal', 'accord'].map((k) => o.down('#' + k)).filter((x) => x && x.isVisible(true));
    const tops = filtres.map((x) => Math.round(r(x).top));
    const a = document.activeElement;
    return {
      recherche: !!rech, focus: !!(rech && rech.inputEl && rech.inputEl.dom === a),
      rechercheAuDessus: !!rech && filtres.length > 0 && r(rech).bottom <= Math.min(...tops) + 1,
      voirMemeLigne: !!rech && !!voir && Math.abs(r(voir).top + r(voir).height / 2 - (r(rech).top + r(rech).height / 2)) < 6,
      filtres: filtres.map((x) => x.itemId), uneLigne: tops.length > 0 && Math.max(...tops) - Math.min(...tops) <= 4,
      dansEcran: filtres.concat(voir ? [voir] : []).every((x) => r(x).right <= Math.min(corps.right, window.innerWidth) + 1),
      accord: o.down('#accord') ? o.down('#accord').xtype + ':' + o.down('#accord').getRawValue() : null
    };
  }, code);
  /* chaque liste deroulante de l'onglet : ouverte par un clic sur sa fleche, largeur et choix sur une ligne */
  const listes = async (code) => {
    const ids = await p.evaluate((c) => Ext.ComponentQuery.query('campagnes #onglet-' + c + ' combobox').filter((x) => x.isVisible(true) && x.triggerEl)
      .map((x) => [x.itemId, x.triggerEl.item(0).id]), code);
    const defauts = [];
    for (const [nom, fleche] of ids) {
      await p.click('#' + fleche); await p.waitForTimeout(500);
      const m = await p.evaluate((n) => {
        const x = Ext.ComponentQuery.query('campagnes combobox').find((y) => y.itemId === n && y.isExpanded);
        if (!x) { return { absent: true }; }
        const pk = x.getPicker().getEl().dom, champ = (x.bodyEl || x.inputEl).dom.getBoundingClientRect();
        const items = Array.from(pk.querySelectorAll('.x-boundlist-item'));
        return { liste: Math.round(pk.getBoundingClientRect().width), champ: Math.round(champ.width),
          coupes: items.filter((i) => i.scrollWidth > i.clientWidth + 1 || i.getBoundingClientRect().height > 28).map((i) => i.textContent) };
      }, nom);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      if (m.absent) { continue; }
      if (m.liste + 1 < m.champ) { defauts.push(nom + ' : liste ' + m.liste + ' px < champ ' + m.champ + ' px'); }
      if (m.coupes.length) { defauts.push(nom + ' : sur deux lignes ' + JSON.stringify(m.coupes)); }
    }
    return defauts;
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    for (const [l, h] of TAILLES) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(800);
      for (const [code, titre] of ONGLETS) {
        await onglet('Propositions');
        await onglet(titre);
        const m = await mesure(code);
        ok(`${l}×${h} ${titre} : recherche simple en première ligne avec « Voir », curseur dedans`, m.recherche && m.rechercheAuDessus && m.voirMemeLigne && m.focus, JSON.stringify(m));
        ok(`${l}×${h} ${titre} : tous les filtres sur une ligne, dans l'écran`, m.uneLigne && m.dansEcran && m.filtres.includes('accord') && m.filtres.includes('canal'), JSON.stringify(m));
        if (l === 1366) {
          ok(`${titre} : « Accord » est une liste, « Accord : tous » par défaut`, m.accord === 'combobox:Accord : tous', m.accord);
          const d = await listes(code);
          ok(`${titre} : listes déroulantes au moins aussi larges que leur champ, chaque choix sur une ligne`, d.length === 0, JSON.stringify(d));
        }
      }
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(800);

    /* Entree = rechercher ; accord choisi dans la liste par la souris */
    await onglet('Propositions');
    await onglet('Infos clients');
    const fleche = await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #accord')[0].triggerEl.item(0).id);
    await p.click('#' + fleche); await p.waitForTimeout(500);
    await p.locator('.x-boundlist-item:visible', { hasText: 'Accord explicite seulement' }).first().click();
    await p.waitForTimeout(300);
    const idRech = await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #recherche')[0].inputEl.id);
    await p.click('#' + idRech);
    await p.keyboard.type('ZZQRECH', { delay: 20 });
    const reponse = p.waitForResponse((r) => /campagnes?\/population/.test(r.url()), { timeout: 30000 });
    envois.length = 0;
    await p.keyboard.press('Enter');
    const rep = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(1200);
    const envoye = envois.length ? JSON.parse(envois[0]) : {};
    const ecran = await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0];
      return { recherche: o.down('#recherche').getValue(), accord: o.down('#accord').getValue(), titre: o.down('#destinataires').title, lignes: o.down('#destinataires').getStore().getCount() }; });
    ok('Entrée dans la recherche : une recherche part (une seule)', envois.length === 1, envois.length);
    ok('Rapprochement : filtres envoyés = écran (recherche, accord explicite)', envoye.recherche === ecran.recherche && envoye.accordExplicite === true && ecran.accord === true && envoye.categorie === 'INFO_CLIENTS',
      JSON.stringify({ envoye, ecran }));
    ok('Rapprochement : titre de la grille = réponse du serveur (joignables, total, lignes)', rep.success && ecran.titre === 'Destinataires : ' + rep.joignables + ' joignable(s) sur ' + rep.total && ecran.lignes === (rep.data || []).length,
      JSON.stringify({ titre: ecran.titre, total: rep.total, joignables: rep.joignables, lignes: ecran.lignes }));
    ok('Bilan : aucune campagne ni ligne écrite', traces() === traces0, traces0 + ' -> ' + traces());
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
