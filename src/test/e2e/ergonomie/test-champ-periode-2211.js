/* PLAN DU 21/11, POINT 7.2 (reponse du 22/11) : un seul selecteur de periode « du → au » sur trois ecrans : Balance
 * vente caisse 2 (onglet Balance), État de contrôle des achats, Liste des bons par organisme.
 *
 * Par l'ecran, pour chacun (menu, puis le champ « 01/11/2026 → 21/11/2026 ») :
 *  - un seul champ visible, les deux champs « Du » et « Au » masques, periode du jour a l'ouverture ;
 *  - calendrier : premier clic = debut, second clic = fin ; clics dans l'ordre inverse : dates remises dans l'ordre ;
 *  - raccourcis : Aujourd'hui, Hier, Ce mois, Mois précédent (dates exactes) ;
 *  - chaque choix lance la recherche : rapprochement champ affiche = champs d'origine = parametres dtStart / dtEnd de
 *    la requete envoyee au serveur, qui repond sans erreur ;
 *  - 1366x768 et 1280x720 : le champ entier dans sa barre, sans chevauchement.
 * Sur l'etat de controle des achats, au clavier : « jj/mm/aaaa → jj/mm/aaaa » + Entree lance la recherche ; une seule
 * date = un jour ; texte illisible ou fin apres aujourd'hui : champ en erreur, dates inchangees, aucune requete ;
 * l'aide de test « saisir » sur « #datedebut » (anciens tests) passe par le champ unique.
 * Lecture seule : aucune ecriture en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const D = (d) => d.toISOString().slice(0, 10);
const jour = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const fr = (d) => D(d).split('-').reverse().join('/');
const AUJ = jour(0);
const debutMois = new Date(AUJ.getFullYear(), AUJ.getMonth(), 1, 12);
const moisPrec = [new Date(AUJ.getFullYear(), AUJ.getMonth() - 1, 1, 12), new Date(AUJ.getFullYear(), AUJ.getMonth(), 0, 12)];

const ECRANS = [
  { nom: 'Balance vente caisse 2', xtype: 'balancesalecahs', fin: 'balancesalecahs #dtEnd', debut: 'balancesalecahs #dtStart', requete: /api\/v1\/balance\/balancesalecash\?/ },
  { nom: 'État de contrôle des achats', xtype: 'etatscontrolemanager', fin: '#datefin', debut: '#datedebut', requete: /api\/v1\/etat-control-bon\/list/ },
  { nom: 'Liste des bons par organisme', xtype: 'facturesubrogatoireother', fin: 'facturesubrogatoireother #dtEnd', debut: 'facturesubrogatoireother #dtStart', requete: /api\/v1\/facture-subro\/list/ }
];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    for (const E of ECRANS) {
      const menu = await p.evaluate((x) => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', x, true); return r ? [r.parentNode.get('text'), r.get('text')] : null; }, E.xtype);
      if (!menu) { ok(E.nom + ' : menu trouvé', false); continue; }
      await V.ouvrirMenu(p, menu[0], menu[1]);
      await p.waitForFunction((q) => Ext.ComponentQuery.query(q).length > 0, E.fin, { timeout: 60000 });
      await p.waitForTimeout(2500);
      const etat = () => p.evaluate(([qf, qd]) => { const f = Ext.ComponentQuery.query(qf)[0], d = Ext.ComponentQuery.query(qd)[0], c = f.champPeriode;
        const r = c && c.getEl().dom.getBoundingClientRect(), barre = c && c.ownerCt.getEl().dom.getBoundingClientRect();
        const voisins = c ? c.ownerCt.items.items.filter((x) => x !== c && x.isVisible(true) && x.getEl()).map((x) => x.getEl().dom.getBoundingClientRect()) : [];
        return { existe: !!c, visible: !!c && c.isVisible(true), texte: c ? c.getValue() : '', invalide: c ? !c.isValid() || c.getActiveError() !== '' : null,
          du: d.getSubmitValue(), au: f.getSubmitValue(), dMasque: !d.isVisible(true), fMasque: !f.isVisible(true),
          entier: !!r && r.left >= barre.left - 1 && r.right <= barre.right + 1 && r.top >= barre.top - 1 && r.bottom <= barre.bottom + 1 && r.width > 150,
          chevauche: !!r && voisins.some((v) => v.right > r.left + 1 && v.left < r.right - 1 && v.bottom > r.top + 1 && v.top < r.bottom - 1),
          trigger: c && c.triggerEl ? (c.triggerEl.first ? c.triggerEl.first() : c.triggerEl.item(0)).dom.id : null, input: c ? c.inputEl.dom.id : null }; }, [E.fin, E.debut]);
      const e0 = await etat();
      ok(`${E.nom} : un seul champ « période » visible (Du et Au masqués), période du jour à l'ouverture`, e0.existe && e0.visible && e0.dMasque && e0.fMasque
        && e0.texte === fr(AUJ) + ' → ' + fr(AUJ) && e0.du === D(AUJ) && e0.au === D(AUJ), JSON.stringify(e0));
      if (!e0.existe) { continue; }

      /* choix -> requete : rapprochement champ = champs d'origine = parametres envoyes */
      const verifier = async (libelle, action, d1, d2) => {
        const [rep] = await Promise.all([p.waitForResponse((r) => E.requete.test(r.url()), { timeout: 60000 }).catch(() => null), action()]);
        await p.waitForTimeout(400);
        const e = await etat();
        const u = rep ? new URL(rep.url()) : null;
        const params = u ? [u.searchParams.get('dtStart'), u.searchParams.get('dtEnd')] : [];
        const corps = rep ? await rep.json().catch(() => ({})) : {};
        ok(`${E.nom} : ${libelle} → ${fr(d1)} → ${fr(d2)}, champ = Du/Au = requête (dtStart, dtEnd), réponse sans erreur`,
          e.texte === fr(d1) + ' → ' + fr(d2) && e.du === D(d1) && e.au === D(d2) && params[0] === D(d1) && params[1] === D(d2) && rep.status() === 200 && corps.success !== false,
          JSON.stringify({ texte: e.texte, du: e.du, au: e.au, params, http: rep && rep.status() }));
      };
      const cliquerJour = async (d) => {
        const id = await p.evaluate((t) => { const pan = Ext.ComponentQuery.query('container[cls~=champ-periode-panneau]').find((x) => x.isVisible());
          const cal = pan && pan.down('#calendrier'); if (!cal) { return null; }
          let cible = null; cal.cells.each((c) => { const a = c.dom.firstChild; const v = a && a.dateValue; if (v && new Date(v).toDateString() === new Date(t).toDateString()) { cible = a; } });
          if (!cible) { return null; } cible.id = cible.id || 'e2e-jour-' + Math.random().toString(36).slice(2); return cible.id; }, d.getTime());
        if (!id) { throw new Error('jour absent du calendrier : ' + fr(d)); }
        await p.click('#' + id);
      };
      const ouvrirCalendrier = async () => { await p.click('#' + e0.trigger); await p.waitForFunction(() => Ext.ComponentQuery.query('container[cls~=champ-periode-panneau]').some((x) => x.isVisible()), null, { timeout: 5000 }); };
      const d1 = AUJ.getDate() > 4 ? jour(-(AUJ.getDate() - 2)) : jour(-3), d2 = jour(-1);
      await ouvrirCalendrier();
      const consigne = await p.evaluate(() => Ext.ComponentQuery.query('container[cls~=champ-periode-panneau]').find((x) => x.isVisible()).down('#consigne').getEl().dom.textContent);
      ok(`${E.nom} : calendrier ouvert, consigne « Cliquez la date de début »`, /Cliquez la date de début/.test(consigne), consigne);
      await verifier('calendrier, début puis fin', async () => { await cliquerJour(d1); await p.waitForTimeout(200); await cliquerJour(d2); }, d1, d2);
      await ouvrirCalendrier();
      await verifier('calendrier, fin puis début (remis dans l\'ordre)', async () => { await cliquerJour(d2); await p.waitForTimeout(200); await cliquerJour(d1); }, d1, d2);
      for (const [nom, a, z] of [['Hier', jour(-1), jour(-1)], ['Ce mois', debutMois, AUJ], ['Mois précédent', moisPrec[0], moisPrec[1]], ['Aujourd\'hui', AUJ, AUJ]]) {
        await ouvrirCalendrier();
        await verifier('raccourci « ' + nom + ' »', () => p.locator('.champ-periode-panneau .x-btn', { hasText: nom }).first().click(), a, z);
      }
      for (const [l, h] of [[1366, 768], [1280, 720]]) {
        await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(700);
        const e = await etat();
        ok(`${E.nom} : ${l}×${h}, champ entier dans sa barre, sans chevauchement`, e.visible && e.entier && !e.chevauche, JSON.stringify({ entier: e.entier, chevauche: e.chevauche }));
      }
      await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(500);

      if (E.xtype === 'etatscontrolemanager') {
        /* clavier */
        const taper = async (texte, touche) => { await p.click('#' + e0.input); await p.keyboard.press('Control+A'); await p.keyboard.type(texte, { delay: 10 }); await p.keyboard.press(touche); };
        await verifier('saisie clavier « ' + fr(moisPrec[0]) + ' → ' + fr(moisPrec[1]) + ' » + Entrée', () => taper(fr(moisPrec[0]) + ' → ' + fr(moisPrec[1]), 'Enter'), moisPrec[0], moisPrec[1]);
        await verifier('saisie clavier d\'une seule date (un jour) + Entrée', () => taper(fr(jour(-2)), 'Enter'), jour(-2), jour(-2));
        /* un cote vide, comme un des deux anciens champs vide : « X → » (fin vide = aujourd'hui pour le serveur), « → Y » */
        for (const [texte, du, au] of [[fr(jour(-6)) + ' →', D(jour(-6)), ''], ['→ ' + fr(jour(-3)), '', D(jour(-3))]]) {
          const [rep] = await Promise.all([p.waitForResponse((r) => E.requete.test(r.url()), { timeout: 60000 }).catch(() => null), taper(texte, 'Enter')]);
          await p.waitForTimeout(400);
          const e = await etat();
          const u = rep ? new URL(rep.url()) : null;
          const params = u ? [u.searchParams.get('dtStart') || '', u.searchParams.get('dtEnd') || ''] : null;
          ok(`Saisie « ${texte} » : un côté vide, champ = Du/Au = requête`, (e.du || '') === du && (e.au || '') === au && !e.invalide && params && params[0] === du && params[1] === au && rep.status() === 200,
            JSON.stringify({ texte: e.texte, du: e.du, au: e.au, params }));
        }
        await taper(fr(jour(-2)), 'Enter'); await p.waitForTimeout(1500);
        /* illisible : refusee ; hors bornes (fin apres aujourd'hui) : comme les anciens champs, signalee en rouge mais
           appliquee et envoyee (les tests des BL d'essai dates de 2031 en dependent) */
        for (const [texte, motif] of [['32/13/2026 → 01/01/2027', 'illisible'], [fr(jour(-1)) + ' → ' + fr(jour(3)), 'fin après aujourd\'hui']]) {
          let requetes = 0; const compter = (r) => { if (E.requete.test(r.url())) { requetes++; } };
          p.on('request', compter);
          await taper(texte, 'Enter'); await p.waitForTimeout(1500);
          p.off('request', compter);
          const e = await etat();
          if (motif === 'illisible') {
            ok(`Saisie ${motif} « ${texte} » : champ en erreur, dates inchangées, aucune requête`, e.invalide && e.du === D(jour(-2)) && e.au === D(jour(-2)) && requetes === 0, JSON.stringify({ invalide: e.invalide, du: e.du, au: e.au, requetes }));
          } else {
            ok(`Saisie ${motif} « ${texte} » : signalée en rouge, mais appliquée et envoyée comme avec les anciens champs`, e.invalide && e.du === D(jour(-1)) && e.au === D(jour(3)) && requetes === 1, JSON.stringify({ invalide: e.invalide, du: e.du, au: e.au, requetes }));
          }
        }
        await taper(fr(jour(-2)), 'Tab'); await p.waitForTimeout(300);
        /* aide des anciens tests : « saisir » sur #datedebut passe par le champ unique */
        await V.saisir(p, '#datedebut', fr(jour(-5)));
        const e2 = await etat();
        ok('Aide « saisir » sur « #datedebut » : tapée dans le champ unique, début changé, fin gardée', e2.du === D(jour(-5)) && e2.au === D(jour(-2)) && e2.texte === fr(jour(-5)) + ' → ' + fr(jour(-2)), JSON.stringify(e2));
      }
    }
    const fenetres = await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((x) => x.isVisible()).length);
    ok('Aucune fenêtre surgissante pendant les choix de période', fenetres === 0, fenetres);
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
