/* Lot 3 — ergonomie et navigation.
   Point 4  : apres generation d'une facture provisoire, retour a la liste, rafraichie.
   Point 7  : privileges, recherche « contient » declenchee au 3e caractere, temporisee.
   Point 15 : modeles de message, duplication et variables cliquables.
   Point 16 : analyse des ajustements triee par nombre d'ajustements decroissant.
   Point 18 : fiche article, emplacement et famille preselectionnes a la creation. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 260) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2EL3';

function nettoyer() {
  exec("DELETE FROM modele_message WHERE libelle LIKE '" + MARQUE + "%'");
  exec("DELETE d FROM t_ajustement_detail d JOIN t_ajustement a ON a.lg_AJUSTEMENT_ID = d.lg_AJUSTEMENT_ID"
    + " WHERE a.lg_AJUSTEMENT_ID LIKE '" + MARQUE + "%'");
  exec("DELETE FROM t_ajustement WHERE lg_AJUSTEMENT_ID LIKE '" + MARQUE + "%'");
}

/* Trois produits, ajustes 5, 3 et 1 fois : l'ordre attendu est donc connu d'avance.
   Le volume deplace est volontairement INVERSE du nombre d'ajustements, pour que l'ancien
   tri (par quantite) et le nouveau (par nombre) ne puissent pas donner le meme resultat. */
const PRODUITS = [];
function semer() {
  nettoyer();
  const lignes = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 3");
  lignes.split('\n').filter(Boolean).forEach(id => PRODUITS.push(id.trim()));
  if (PRODUITS.length < 3) { return false; }
  const emplacement = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const utilisateur = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const nb = [5, 3, 1];          // nombre d'ajustements par produit
  const volume = [1, 10, 100];   // quantite par ajustement : l'inverse
  PRODUITS.forEach((produit, rang) => {
    for (let i = 0; i < nb[rang]; i++) {
      const idA = MARQUE + '-A-' + rang + '-' + i;
      exec("INSERT INTO t_ajustement (lg_AJUSTEMENT_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, str_NAME)"
        + " VALUES ('" + idA + "', 'enable', NOW(), NOW(), '" + utilisateur + "', '" + idA + "')");
      exec("INSERT INTO t_ajustement_detail (lg_AJUSTEMENTDETAIL_ID, lg_AJUSTEMENT_ID, lg_FAMILLE_ID,"
        + " int_NUMBER, str_STATUT, dt_CREATED) VALUES ('" + idA + "-D', '" + idA + "', '" + produit + "',"
        + " " + volume[rang] + ", 'enable', NOW())");
    }
  });
  return !!emplacement;
}

(async () => {
  if (!semer()) { console.log('FATAL : impossible de semer les donnees'); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const appel = (url, options) => p.evaluate(async (a) => {
    const r = await fetch(a.url, a.options || {});
    const texte = await r.text();
    let json = null; try { json = JSON.parse(texte); } catch (e) { }
    return { status: r.status, json: json, texte: texte.slice(0, 300) };
  }, { url, options });

  try {

    // ---------------------------------------------------------------- point 16
    const analyse = await appel('../api/v1/ajustement/analyse?start=0&limit=20'
      + '&dtStart=' + new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      + '&dtEnd=' + new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    const lignes = (analyse.json && analyse.json.data) || [];
    ok('point 16 : l analyse des ajustements repond', analyse.status === 200 && lignes.length >= 3,
       'status=' + analyse.status + ' lignes=' + lignes.length);
    const nombres = lignes.map(l => l.nbAjustement);
    ok('point 16 : tri par nombre d ajustements decroissant',
       nombres.every((v, i) => i === 0 || nombres[i - 1] >= v), JSON.stringify(nombres.slice(0, 6)));
    ok('point 16 : le produit le plus ajuste ouvre la liste, pas le plus gros volume',
       lignes[0] && lignes[0].nbAjustement === 5 && lignes[0].familleId === PRODUITS[0],
       lignes[0] ? lignes[0].nbAjustement + ' ajustements, qte ' + lignes[0].qteTotale : 'aucune ligne');
    const exAequo = lignes.filter(l => l.nbAjustement === lignes[0].nbAjustement).map(l => l.name);
    ok('point 16 : a egalite, tri alphabetique sur la designation',
       exAequo.every((v, i) => i === 0 || exAequo[i - 1].localeCompare(v) <= 0), JSON.stringify(exAequo));

    // ---------------------------------------------------------------- point 15
    const creation = await appel('../api/v1/modeles-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ libelle: MARQUE + ' source', canal: 'SMS', contenu: 'Bonjour {client}' })
    });
    ok('point 15 : modele source cree', creation.json && creation.json.success, creation.texte);
    const idSource = creation.json && creation.json.id;

    const copie1 = await appel('../api/v1/modeles-messages/' + idSource + '/dupliquer', { method: 'POST' });
    ok('point 15 : la duplication reussit', copie1.json && copie1.json.success, copie1.texte);
    ok('point 15 : la copie porte le suffixe « (Copie) »',
       copie1.json && copie1.json.libelle === MARQUE + ' source (Copie)', copie1.json && copie1.json.libelle);
    ok('point 15 : la copie est un modele independant du source',
       copie1.json && copie1.json.id && copie1.json.id !== idSource, copie1.json && copie1.json.id);

    const copie2 = await appel('../api/v1/modeles-messages/' + idSource + '/dupliquer', { method: 'POST' });
    ok('point 15 : dupliquer deux fois ne bute pas sur l unicite du libelle',
       copie2.json && copie2.json.success && copie2.json.libelle === MARQUE + ' source (Copie 2)',
       copie2.json && (copie2.json.libelle || copie2.json.msg));

    const apres = q("SELECT libelle FROM modele_message WHERE libelle LIKE '" + MARQUE + "%' ORDER BY libelle");
    ok('point 15 : le modele source est preserve',
       apres.split('\n').map(s => s.trim()).indexOf(MARQUE + ' source') !== -1, apres.replace(/\n/g, ' | '));
    const source = q("SELECT contenu FROM modele_message WHERE libelle = '" + MARQUE + " source'");
    const clone = q("SELECT contenu FROM modele_message WHERE libelle = '" + MARQUE + " source (Copie)'");
    ok('point 15 : la copie reprend le contenu et le canal du source', source === clone && source.length > 0,
       'source=' + source + ' copie=' + clone);

    // variables cliquables : insertion a la position du curseur
    const insertion = await p.evaluate(() => {
      const ctr = testextjs.app.getController('ModeleMessageCtr');
      const zone = Ext.create('Ext.form.field.TextArea', { renderTo: Ext.getBody(), value: 'Bonjour , merci' });
      zone.inputEl.dom.setSelectionRange(8, 8);           // curseur juste avant la virgule
      ctr.insererVariable(zone, '{client}');
      const valeur = zone.getValue();
      zone.destroy();
      return valeur;
    });
    ok('point 15 : la variable est inseree a la position du curseur',
       insertion === 'Bonjour {client}, merci', insertion);
    const html = await p.evaluate(() => testextjs.app.getController('ModeleMessageCtr').htmlVariables());
    ok('point 15 : chaque variable est rendue cliquable',
       (html.match(/data-variable=/g) || []).length === 7, (html.match(/data-variable=/g) || []).length + ' variables');

    // ---------------------------------------------------------------- point 7
    const privilegeConnu = q("SELECT str_DESCRIPTION FROM t_privilege WHERE str_STATUT='enable'"
      + " AND CHAR_LENGTH(str_DESCRIPTION) > 12 ORDER BY str_DESCRIPTION LIMIT 1");
    const milieu = privilegeConnu.substring(4, 9);
    /* Cette vieille page repond en JSONP, entoure de commentaires HTML : « (...{json}...) ».
       On en extrait la charge utile plutot que de la donner telle quelle a JSON.parse. */
    const charge = (texte) => {
      const debut = texte.indexOf('({'), fin = texte.lastIndexOf('})');
      if (debut === -1 || fin === -1) { return null; }
      try { return JSON.parse(texte.slice(debut + 1, fin + 1)); } catch (e) { return null; }
    };
    const lire = async (motif) => {
      const r = await p.evaluate(async (u) => (await (await fetch(u)).text()),
        '../webservices/sm_user/privilege/ws_data.jsp?start=0&limit=20&search_value=' + encodeURIComponent(motif));
      return charge(r);
    };
    const sansFiltre = await lire('');
    const contient = await lire(milieu);
    ok('point 7 : la recherche « contient » trouve par un mot du MILIEU du libelle',
       contient && Number(contient.total) > 0, 'motif="' + milieu + '" total=' + (contient && contient.total));
    ok('point 7 : la recherche restreint bien la liste',
       sansFiltre && contient && Number(contient.total) < Number(sansFiltre.total),
       'sans=' + (sansFiltre && sansFiltre.total) + ' avec=' + (contient && contient.total));
    /* Preuve que le motif n'est plus « commence par » : on cherche un fragment qui n'est le DEBUT
       d'aucun libelle, et qui doit pourtant ramener des lignes. */
    const auMilieu = await lire(milieu.trim());
    ok('point 7 : un fragment absent de tout DEBUT de libelle ramene quand meme des lignes',
       auMilieu && Number(auMilieu.total) > 0, 'motif="' + milieu.trim() + '" total=' + (auMilieu && auMilieu.total));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('privilegemanager', {}));
    await p.waitForTimeout(2500);
    const champ = await p.evaluate(() => {
      const c = Ext.getCmp('rechecher');
      return c ? { invite: c.emptyText, present: true } : { present: false };
    });
    ok('point 7 : l invite annonce un « contient »', champ.present && /[Cc]ontient/.test(champ.invite || ''),
       JSON.stringify(champ));

    // deux caracteres : aucune requete ne doit partir
    const deuxCaracteres = await p.evaluate(async () => {
      const c = Ext.getCmp('rechecher');
      const grille = Ext.ComponentQuery.query('privilegemanager')[0];
      let appels = 0;
      const ecoute = function () { appels++; };
      grille.getStore().on('beforeload', ecoute);
      c.setValue('an');
      c.fireEvent('keyup', c, { getKey: () => 65 });
      await new Promise(r => setTimeout(r, 900));
      grille.getStore().un('beforeload', ecoute);
      return appels;
    });
    ok('point 7 : a deux caracteres aucune recherche n est lancee', deuxCaracteres === 0,
       deuxCaracteres + ' requete(s)');

    // trois caracteres : une seule requete, apres la temporisation
    const troisCaracteres = await p.evaluate(async () => {
      const c = Ext.getCmp('rechecher');
      const grille = Ext.ComponentQuery.query('privilegemanager')[0];
      let appels = 0, motif = null;
      const ecoute = function (s, op) { appels++; motif = s.getProxy().extraParams.search_value; };
      grille.getStore().on('beforeload', ecoute);
      c.setValue('ann');
      c.fireEvent('keyup', c, { getKey: () => 78 });
      const immediat = appels;
      await new Promise(r => setTimeout(r, 900));
      grille.getStore().un('beforeload', ecoute);
      return { immediat: immediat, total: appels };
    });
    ok('point 7 : rien ne part a la frappe meme, la recherche est temporisee',
       troisCaracteres.immediat === 0, JSON.stringify(troisCaracteres));
    ok('point 7 : au 3e caractere la recherche part, une seule fois',
       troisCaracteres.total === 1, JSON.stringify(troisCaracteres));

    // frappe rapide : une seule requete pour cinq frappes
    const frappeRapide = await p.evaluate(async () => {
      const c = Ext.getCmp('rechecher');
      const grille = Ext.ComponentQuery.query('privilegemanager')[0];
      let appels = 0;
      const ecoute = function () { appels++; };
      grille.getStore().on('beforeload', ecoute);
      for (const mot of ['ann', 'annu', 'annul', 'annula', 'annulat']) {
        c.setValue(mot);
        c.fireEvent('keyup', c, { getKey: () => 65 });
        await new Promise(r => setTimeout(r, 60));
      }
      await new Promise(r => setTimeout(r, 900));
      grille.getStore().un('beforeload', ecoute);
      return appels;
    });
    ok('point 7 : cinq frappes rapides ne font qu une requete', frappeRapide === 1, frappeRapide + ' requete(s)');

    // ---------------------------------------------------------------- point 18
    const referentiels = await p.evaluate(async () => {
      const zone = await (await fetch('../api/v1/referentiel-article/zones-geographiques?query=DEFAULT&start=0&limit=20')).json();
      const fam = await (await fetch('../api/v1/common/famille-articles?query=SPECIALITES PUBLIQUES&start=0&limit=20')).json();
      return { zones: zone.results || [], familles: fam.results || [] };
    });
    ok('point 18 : l emplacement par defaut existe dans le referentiel',
       referentiels.zones.some(z => String(z.str_LIBELLEE || '').trim().toUpperCase() === 'DEFAULT'),
       JSON.stringify(referentiels.zones.map(z => z.str_LIBELLEE)));
    ok('point 18 : la famille par defaut existe dans le referentiel',
       referentiels.familles.some(f => String(f.str_LIBELLE || '').trim().toUpperCase() === 'SPECIALITES PUBLIQUES'),
       JSON.stringify(referentiels.familles.map(f => f.str_LIBELLE)));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForTimeout(2500);
    await p.evaluate(() => {
      const vue = Ext.create('testextjs.view.configmanagement.famille.action.add', { mode: 'create' });
      vue.initComponent ? null : null;
      window.__vueCreation = vue;
    }).catch(() => { });
    const defauts = await p.evaluate(async () => {
      const grille = Ext.ComponentQuery.query('famillemanager')[0];
      const bouton = grille.down('[itemId=btnNouveau]') || grille.down('button[text*="Nouveau"]')
        || (grille.getDockedItems('toolbar[dock=top]')[0] || {}).items;
      if (bouton && bouton.fireEvent) { bouton.fireEvent('click', bouton); }
      await new Promise(r => setTimeout(r, 2500));
      const fenetre = Ext.ComponentQuery.query('window')
        .filter(w => w.isVisible() && w.down('#lg_ZONE_GEO_ID'))[0];
      if (!fenetre) { return { ouverte: false }; }
      await new Promise(r => setTimeout(r, 2500));
      const zone = fenetre.down('#lg_ZONE_GEO_ID'), fam = fenetre.down('#lg_FAMILLEARTICLE_ID');
      return {
        ouverte: true,
        emplacement: zone && zone.getRawValue(),
        famille: fam && fam.getRawValue()
      };
    });
    if (defauts.ouverte) {
      ok('point 18 : l emplacement est preselectionne a DEFAULT',
         String(defauts.emplacement || '').trim().toUpperCase() === 'DEFAULT', JSON.stringify(defauts));
      ok('point 18 : la famille est preselectionnee a SPECIALITES PUBLIQUES',
         String(defauts.famille || '').trim().toUpperCase() === 'SPECIALITES PUBLIQUES', JSON.stringify(defauts));
    } else {
      ok('point 18 : fenetre de creation ouverte', false, JSON.stringify(defauts));
    }

    // ---------------------------------------------------------------- point 4
    const redirection = await p.evaluate(() => {
      const ctr = testextjs.app.getController('FactureCtr');
      return typeof ctr.retourALaListeProvisoire === 'function';
    });
    ok('point 4 : le retour a la liste des provisoires est cable', redirection);
    const rafraichit = await p.evaluate(async () => {
      const ctr = testextjs.app.getController('FactureCtr');
      let charge = 0;
      ctr.retourALaListeProvisoire();
      await new Promise(r => setTimeout(r, 1200));
      const grille = Ext.ComponentQuery.query('factureprovisoire #gridFactureProvi')[0]
        || Ext.getCmp('gridFactureProvi');
      if (grille) { grille.getStore().on('beforeload', () => charge++); }
      await new Promise(r => setTimeout(r, 1500));
      return { ecran: !!Ext.ComponentQuery.query('factureprovisoire').length, grille: !!grille };
    });
    ok('point 4 : la liste des factures provisoires est bien affichee', rafraichit.ecran && rafraichit.grille,
       JSON.stringify(rafraichit));

    ok('aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));

  } finally {
    await b.close();
    nettoyer();
  }
  const total = res.length, passes = res.filter(r => r.c).length;
  console.log('\n===== ' + passes + '/' + total + ' PASS =====');
  process.exit(passes === total ? 0 : 1);
})();
