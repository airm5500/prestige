/* ECRAN « RH > BORNES DE POINTAGE » (demande mobile 57), par le menu RESSOURCES HUMAINES :
 *  - une borne enrolee (par l'API, comme le fait l'application) apparait : nom, enrolee par, statut « Active » ;
 *  - « Retirer » : premier clic, confirmation dans le bouton ; second clic, la borne passe « Retirée » et son appel
 *    suivant recoit 401 REVOQUEE ; aucune fenetre ;
 *  - une borne retiree ne se retire plus (bouton inactif).
 * Borne d'essai et journal retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 220) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sNr', '-e', s], { encoding: 'utf8' }).trim();
const NOM = 'E2E Borne ecran';
const EMPREINTE = crypto.createHash('sha256').update('ANDROID-ecran:com.dici.prestigepointage').digest('hex');
const nettoyer = () => q(`DELETE FROM t_borne_pointage WHERE nom = '${NOM}'; DELETE FROM t_event_log WHERE str_DESCRIPTION LIKE '%Borne de pointage ${NOM}%'`);

(async () => {
  nettoyer();
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const e = await p.evaluate(async (c) => (await fetch('../api/v1/rh/bornes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).json(),
      { empreinte: EMPREINTE, nom: NOM });
    ok('Borne enrôlée (comme depuis l\'application)', e.success && !!e.borneId);
    const borne = { id: e.borneId, secret: e.secret };
    /* l'adresse peut rester bloquee par test-borne-pointage (signatures fausses) : attendre la fin du blocage */
    const moi = async () => {
      for (let i = 0; ; i++) {
        const r = await moiUneFois();
        if (r.statut !== 429 || i >= 3) { return r; }
        await p.waitForTimeout(((r.attente || 60) + 1) * 1000);
      }
    };
    const moiUneFois = async () => p.evaluate(async (x) => {
      const date = new Date().toISOString(), chemin = '/prestige/api/v1/borne-pointage/moi';
      const enc = new TextEncoder(), vide = await crypto.subtle.digest('SHA-256', new Uint8Array());
      const hex = Array.from(new Uint8Array(vide)).map((v) => v.toString(16).padStart(2, '0')).join('');
      const cle = await crypto.subtle.importKey('raw', Uint8Array.from(atob(x.secret.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cle, enc.encode(['GET', chemin, date, x.empreinte, hex].join('\n'))));
      const s = btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const r = await fetch(chemin, { headers: { 'X-Borne': x.id, 'X-Borne-Date': date, 'X-Borne-Empreinte': x.empreinte, 'X-Borne-Signature': s }, credentials: 'omit' });
      return { statut: r.status, attente: Number(r.headers.get('Retry-After')) || 0, o: await r.json() };
    }, Object.assign({ empreinte: EMPREINTE }, borne));
    const avant = await moi();
    ok('La borne répond avant le retrait', avant.statut === 200, JSON.stringify(avant));

    await vues.ouvrirMenu(p, 'RESSOURCES HUMAINES', 'Ressources humaines');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#ongletBornes').length > 0, null, { timeout: 60000 });
    await p.click('.x-tab:has-text("Bornes de pointage")');
    await p.waitForFunction((n) => { const g = Ext.ComponentQuery.query('#ongletBornes')[0]; return g && g.getStore().findExact('nom', n) >= 0; }, NOM, { timeout: 30000 });
    const ligne = await p.evaluate((n) => { const g = Ext.ComponentQuery.query('#ongletBornes')[0], r = g.getStore().getAt(g.getStore().findExact('nom', n));
      return { statut: r.get('statut'), par: r.get('enroleePar'), texte: g.getView().getNode(r).innerText }; }, NOM);
    ok('Liste : nom, enrôlée par, statut « Active »', ligne.statut === 'ACTIVE' && /Essai/.test(ligne.par) && /Active/.test(ligne.texte), JSON.stringify(ligne));

    await p.evaluate((n) => { const g = Ext.ComponentQuery.query('#ongletBornes')[0]; g.getSelectionModel().select(g.getStore().getAt(g.getStore().findExact('nom', n))); }, NOM);
    await p.click('.x-btn:has-text("Retirer")');
    const texte1 = await p.evaluate(() => Ext.ComponentQuery.query('#retirerBorne')[0].getText());
    ok('« Retirer » : premier clic, confirmation dans le bouton (rien n\'est retiré)', /Confirmer le retrait/.test(texte1) && q(`SELECT statut FROM t_borne_pointage WHERE id = '${borne.id}'`) === 'ACTIVE', texte1);
    await p.click('.x-btn:has-text("Confirmer le retrait")');
    await p.waitForFunction((n) => { const g = Ext.ComponentQuery.query('#ongletBornes')[0], i = g.getStore().findExact('nom', n); return i >= 0 && g.getStore().getAt(i).get('statut') === 'RETIREE'; }, NOM, { timeout: 20000 });
    const apres = await moi();
    ok('Second clic : borne « Retirée », son appel suivant reçoit 401 REVOQUEE', apres.statut === 401 && apres.o.code === 'REVOQUEE', JSON.stringify(apres));
    await p.evaluate((n) => { const g = Ext.ComponentQuery.query('#ongletBornes')[0]; g.getSelectionModel().select(g.getStore().getAt(g.getStore().findExact('nom', n))); }, NOM);
    const etat = await p.evaluate(() => { const g = Ext.ComponentQuery.query('#ongletBornes')[0], s = g.getSelectionModel().getSelection();
      return { inactif: Ext.ComponentQuery.query('#retirerBorne')[0].isDisabled(), choisies: s.length, statut: s[0] && s[0].get('statut'), boutons: Ext.ComponentQuery.query('#retirerBorne').length }; });
    ok('Borne retirée : bouton « Retirer » inactif', etat.inactif, JSON.stringify(etat));
    ok('Aucune fenêtre', dialogues.length === 0, dialogues.join(' | '));
  } catch (x) { ok('Parcours sans exception', false, x.stack); } finally {
    await b.close();
    nettoyer();
    ok('Borne d\'essai retirée', q(`SELECT COUNT(*) FROM t_borne_pointage WHERE nom = '${NOM}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
