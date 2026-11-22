/* RAPPELS TRAITEMENT, « CIBLAGE LIBRE » : RECHERCHE ET FILTRES SUR UNE LIGNE (plan du 21/11, point 18).
 *
 * Par les vues (admin), Campagnes > onglet « Rappel traitement » > « Ciblage libre », a 1366×768, 1280×720 et
 * 1920×1080 :
 *  - champ de recherche agrandi (360 px au moins), curseur dedans a l'ouverture du ciblage ;
 *  - libelles « Acheté du … au … » et « Au moins … achats », chacun sur une ligne ; tous les filtres et
 *    « Rechercher » sur une seule ligne, dans l'ecran ;
 *  - liste des produits : au moins aussi large que le champ, un produit par ligne ;
 *  - Entree choisit le produit dans la liste ouverte, puis Entree (liste fermee) lance la recherche.
 * Rapprochement : criteres envoyes au serveur = ecran (produit choisi, dates, minimum) ; titre de la grille et nombre
 * de lignes = reponse du serveur. Bilan : rien n'est ecrit (aucune campagne, aucun rappel). Aucun nom de client n'est
 * lu ni affiche : seuls les nombres sont compares.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
/* produit actif au CIP de 7 chiffres ou plus (libelle produit, pas de donnee nominative) */
const CIP = q("SELECT int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND CHAR_LENGTH(int_CIP) >= 7 ORDER BY lg_FAMILLE_ID LIMIT 1");
const TAILLES = [[1366, 768], [1280, 720], [1920, 1080]];

(async () => {
  const traces = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_campagne), '/', (SELECT COUNT(*) FROM t_campagne_ligne), '/', (SELECT COUNT(*) FROM notification), '/', (SELECT COUNT(*) FROM t_rappel_habitude))");
  const traces0 = traces();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [], envois = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('request', (r) => { if (/rappels-habitude\/ciblage$/.test(r.url().split('?')[0]) && r.method() === 'POST') { envois.push(r.postData() || ''); } });
  const hub = (corps) => p.evaluate(`(() => { const h = Ext.ComponentQuery.query('rappelstraitement').filter((x) => x.isVisible(true))[0]; ${corps} })()`);
  const ouvrirCiblage = async () => {
    await p.click('#' + await hub("return h.down('#rp-liste').getEl().dom.id;"));
    await p.waitForTimeout(600);
    await p.click('#' + await hub("return h.down('#rp-ciblage').getEl().dom.id;"));
    await p.waitForTimeout(900);
  };
  const mesure = () => hub(`
    const c = h.down('#ciblageRappels'), r = (x) => x.getEl().dom.getBoundingClientRect(), ref = c.down('#cbReference');
    const ids = ['cbType', 'cbReference', 'cbDu', 'cbAu', 'cbMin', 'cbChercher'], el = ids.map((i) => c.down('#' + i));
    const tops = el.map((x) => Math.round(r(x).top + r(x).height / 2));
    const libelles = ['cbDu', 'cbAu', 'cbMin'].map((i) => { const x = c.down('#' + i); return { t: x.fieldLabel, coupe: x.labelEl.dom.scrollWidth > x.labelEl.dom.clientWidth + 1 || x.labelEl.dom.getBoundingClientRect().height > 24 }; });
    const apres = c.down('#cbMinSuite');
    return { focus: ref.inputEl.dom === document.activeElement, largeur: Math.round(r(ref).width), uneLigne: Math.max(...tops) - Math.min(...tops) <= 4,
      dansEcran: el.every((x) => r(x).right <= Math.min(r(c).right, window.innerWidth) + 1),
      libelles: libelles.map((x) => x.t).join('|') + (apres ? '|' + apres.getEl().dom.textContent.trim() : ''), coupes: libelles.filter((x) => x.coupe).map((x) => x.t),
      suiteMemeLigne: !!apres && Math.abs(r(apres).top + r(apres).height / 2 - (r(c.down('#cbMin')).top + r(c.down('#cbMin')).height / 2)) < 6 };`);
  try {
    ok('Préalable : un produit au CIP de 7 chiffres', !!CIP, CIP);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    const onglet = await p.evaluate(() => { const t = Ext.ComponentQuery.query('campagnes #ongletRappels')[0]; return t && t.tab && !t.tab.hidden ? t.tab.getEl().dom.id : null; });
    await p.click('#' + onglet);
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagnes rappelstraitement').some((h) => h.isVisible(true)), null, { timeout: 30000 });
    for (const [l, h] of TAILLES) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(800);
      await ouvrirCiblage();
      const m = await mesure();
      ok(`${l}×${h} : champ de recherche agrandi, curseur dedans`, m.focus && m.largeur >= 360, JSON.stringify(m));
      ok(`${l}×${h} : « Acheté du … au … », « Au moins … achats », chacun sur une ligne ; filtres et « Rechercher » sur une ligne, dans l'écran`,
        m.libelles === 'Acheté du|au|Au moins|achats' && m.coupes.length === 0 && m.suiteMemeLigne && m.uneLigne && m.dansEcran, JSON.stringify(m));
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(800);
    await ouvrirCiblage();

    /* saisie au clavier : CIP, liste ouverte, Entree choisit, Entree recherche */
    await p.keyboard.type(CIP, { delay: 30 });
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 20000 });
    await p.waitForTimeout(400);
    const liste = await hub(`const x = h.down('#cbReference'), pk = x.getPicker().getEl().dom, items = Array.from(pk.querySelectorAll('.x-boundlist-item'));
      return { liste: Math.round(pk.getBoundingClientRect().width), champ: Math.round((x.bodyEl || x.inputEl).dom.getBoundingClientRect().width),
        coupes: items.filter((i) => i.scrollWidth > i.clientWidth + 1 || i.getBoundingClientRect().height > 28).length, n: items.length };`);
    ok('Liste des produits : au moins aussi large que le champ, un produit par ligne', liste.n > 0 && liste.liste + 1 >= liste.champ && liste.coupes === 0, JSON.stringify(liste));
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(500);
    const choix = await hub("const x = h.down('#cbReference'); return { valeur: x.getValue(), ouverte: !!x.isExpanded };");
    ok('Entrée dans la liste ouverte : le produit est choisi, la liste se ferme, rien n\'est cherché', !!choix.valeur && !choix.ouverte && envois.length === 0, JSON.stringify(choix) + ' envois ' + envois.length);
    const reponse = p.waitForResponse((r) => /rappels-habitude\/ciblage$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', { timeout: 60000 });
    await p.keyboard.press('Enter');
    const rep = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(1200);
    const envoye = envois.length ? JSON.parse(envois[0]) : {};
    const ecran = await hub("const c = h.down('#ciblageRappels'), f = h.filtresCiblage(), g = c.down('#cbResultats'); return { f, titre: g.title, lignes: g.getStore().getCount() };");
    ok('Entrée (liste fermée) lance la recherche, une seule fois', envois.length === 1, envois.length);
    ok('Rapprochement : critères envoyés = écran (produit, dates, minimum, type)', envoye.produitId === choix.valeur && envoye.produitId === ecran.f.produitId && envoye.achatDu === ecran.f.achatDu
      && envoye.achatAu === ecran.f.achatAu && envoye.minAchats === ecran.f.minAchats && envoye.produitType === 'PRODUIT', JSON.stringify({ envoye, ecran: ecran.f }));
    ok('Rapprochement : titre et lignes de la grille = réponse du serveur', rep.success && ecran.titre === 'Clients ayant acheté : ' + rep.total + ' trouvé(s), ' + rep.joignables + ' joignable(s)'
      && ecran.lignes === (rep.data || []).length, JSON.stringify({ titre: ecran.titre, total: rep.total, lignes: ecran.lignes }));
    ok('Bilan : rien d\'écrit (campagnes, lignes, notifications, rappels)', traces() === traces0, traces0 + ' -> ' + traces());
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
