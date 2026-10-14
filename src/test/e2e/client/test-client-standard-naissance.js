/* CLIENT STANDARD : DATE DE NAISSANCE ET SEXE (retours du 13/10, point 14). Par l'ecran « Clients », admin.
 *  - la fenetre « Créer client standard » propose la date de naissance et le sexe, tous deux FACULTATIFS ;
 *  - le premier champ (Nom) n'est plus colle au haut du cadre ;
 *  - Entree enchaine nom, prenoms, telephone, date de naissance, puis le bouton Enregistrer ;
 *  - creation avec date et sexe : enregistres sur la fiche ; creation sans : comme avant ;
 *  - date dans le futur : refusee a l'ecran et par le serveur.
 * Clients d'essai retires a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOM = 'E2ECSNAISS';
function retirer() {
  exec(`DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM t_client WHERE str_FIRST_NAME LIKE '${NOM}%');`
    + `DELETE FROM t_client WHERE str_FIRST_NAME LIKE '${NOM}%';`);
}

(async () => {
  retirer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('clientmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientgestion').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    const ouvrir = async () => {
      await p.evaluate(() => Ext.ComponentQuery.query('clientgestion button').find((x) => /client standard/i.test(x.text || '')).btnEl.dom.click());
      await p.waitForFunction(() => Ext.ComponentQuery.query('addclientstandard').some((w) => w.isVisible()), null, { timeout: 10000 });
      await p.waitForTimeout(400);
    };
    const id = (item) => p.evaluate((i) => { const c = Ext.ComponentQuery.query('addclientstandard #' + i)[0]; return c ? c.inputEl.id : null; }, item);

    /* 1. champs et mise en page */
    await ouvrir();
    const f = await p.evaluate(() => { const w = Ext.ComponentQuery.query('addclientstandard')[0]; const n = w.down('#naissance'), s = w.down('#sexe');
      const corps = w.body.getBox(), nom = w.down('#nom').getEl().getBox();
      return { naissance: !!n && n.isVisible() && n.allowBlank !== false, sexe: !!s && s.isVisible() && s.allowBlank !== false,
        libelles: [n && n.fieldLabel, s && s.fieldLabel], ecartHaut: Math.round(nom.y - corps.y) }; });
    ok('Date de naissance et sexe proposés, facultatifs', f.naissance && f.sexe, JSON.stringify(f));
    ok('Le premier champ (Nom) n\'est plus collé au haut du cadre', f.ecartHaut >= 12, f.ecartHaut + ' px');

    /* 2. Entree enchaine jusqu'a la date puis le bouton */
    const entree = async () => { await p.keyboard.press('Enter'); await p.waitForTimeout(250); };
    await p.fill('#' + await id('nom'), NOM + 'A'); await entree();
    await p.keyboard.type('Avec Date'); await entree();
    await p.keyboard.type('0708473791'); await entree();
    const focus1 = await p.evaluate(() => document.activeElement && document.activeElement.id);
    ok('Entrée : du téléphone à la date de naissance', focus1 === await id('naissance'), focus1);
    await p.keyboard.type('15/03/1980');
    await p.evaluate(() => { Ext.ComponentQuery.query('addclientstandard #sexe')[0].setValue({ str_SEXE: 'F' }); });
    await p.focus('#' + await id('naissance')); await entree();
    const focus2 = await p.evaluate(() => Ext.ComponentQuery.query('addclientstandard #enregistrer')[0].getEl().dom.contains(document.activeElement));
    ok('Entrée : de la date au bouton Enregistrer', focus2);
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => !Ext.ComponentQuery.query('addclientstandard').some((w) => w.isVisible()), null, { timeout: 15000 }).catch(() => {});
    const a = q(`SELECT CONCAT_WS('|', DATE(dt_NAISSANCE), str_SEXE, lg_TYPE_CLIENT_ID, str_TELEPHONE) FROM t_client WHERE str_FIRST_NAME = '${NOM}A'`);
    ok('Créé avec sa date de naissance et son sexe', a === '1980-03-15|F|6|0708473791', a);

    /* 3. sans date ni sexe : comme avant */
    await ouvrir();
    await p.fill('#' + await id('nom'), NOM + 'B'); await p.fill('#' + await id('prenoms'), 'Sans Date'); await p.fill('#' + await id('telephone'), '0708473792');
    await p.evaluate(() => Ext.ComponentQuery.query('addclientstandard #enregistrer')[0].btnEl.dom.click());
    await p.waitForFunction(() => !Ext.ComponentQuery.query('addclientstandard').some((w) => w.isVisible()), null, { timeout: 15000 }).catch(() => {});
    const bb = q(`SELECT CONCAT_WS('|', IFNULL(dt_NAISSANCE, 'VIDE'), IF(IFNULL(str_SEXE, '') = '', 'VIDE', str_SEXE), str_TELEPHONE) FROM t_client WHERE str_FIRST_NAME = '${NOM}B'`);
    ok('Créé sans date ni sexe, comme avant', bb === 'VIDE|VIDE|0708473792', bb);

    /* 4. date future refusee a l'ecran, puis par le serveur */
    await ouvrir();
    await p.fill('#' + await id('nom'), NOM + 'C'); await p.fill('#' + await id('prenoms'), 'Futur'); await p.fill('#' + await id('telephone'), '0708473793');
    await p.fill('#' + await id('naissance'), '01/01/2099'); await p.keyboard.press('Tab');
    await p.evaluate(() => Ext.ComponentQuery.query('addclientstandard #enregistrer')[0].btnEl.dom.click());
    await p.waitForTimeout(1500);
    ok('Date future : refusée à l\'écran, rien n\'est créé', q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME = '${NOM}C'`) === '0'
      && await p.evaluate(() => !Ext.ComponentQuery.query('addclientstandard #naissance')[0].isValid()));
    const srv = await p.evaluate(async () => { const r = await fetch('../api/v1/client/gestion/create-standard', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'str_FIRST_NAME=E2ECSNAISSD&str_LAST_NAME=Futur&str_TELEPHONE=0708473794&dt_NAISSANCE=2099-01-01&str_SEXE=X' }); return r.json(); });
    ok('Date future ou sexe inconnu : refusés par le serveur', srv.success === false && q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME = '${NOM}D'`) === '0', JSON.stringify(srv));
    await p.evaluate(() => Ext.ComponentQuery.query('addclientstandard')[0].close());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    retirer();
    ok('Clients d\'essai retirés', q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '${NOM}%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
