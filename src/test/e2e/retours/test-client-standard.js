/* Evolution 5, point 3 : creation d'un client standard (nom, prenoms, numero de telephone unique).
 *   - t_client a desormais une vraie colonne str_TELEPHONE, le numero etant auparavant range dans
 *     str_ADRESSE, champ partage avec les adresses reelles des autres types de clients ;
 *   - le numero est normalise au format local a dix chiffres avant enregistrement ;
 *   - il est UNIQUE parmi les clients standards, et seulement parmi eux : deux clients assurance d'une
 *     meme famille peuvent continuer de partager un numero ;
 *   - le filtre « Type client » propose « Client standard », et un bouton de creation allegee s'ajoute
 *     a cote du bouton « Creer ».
 * La creation est jouee a l'ecran : ouverture de la fenetre, saisie, clic sur Enregistrer. Les clients
 * poses par le test sont retires a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const NOM = 'E2ESTANDARD';
const TEL = '0708473750';
const TEL2 = '0508473751';

function nettoyer() {
  // Le client saisi entierement au clavier est retire lui aussi. Son compte client d'abord : la cle
  // etrangere refuserait l'inverse.
  exec("DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN"
    + " (SELECT lg_CLIENT_ID FROM t_client WHERE str_FIRST_NAME='E2ECS-CLAVIER');"
    + "DELETE FROM t_client WHERE str_FIRST_NAME='E2ECS-CLAVIER';");
  exec("DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%');"
    + "DELETE FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%';"
    + "DELETE FROM t_client WHERE str_TELEPHONE IN ('" + TEL + "', '" + TEL2 + "') AND str_LAST_NAME LIKE 'E2E%';");
}

(async () => {
  nettoyer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => { err.push(String(e.message)); if (process.env.TRACE) { console.log('>>> PAGEERROR', e.message, '\n', (e.stack||'').split('\n').slice(0,8).join('\n')); } });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('clientmanager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientgestion').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(5000);

    /* 1. l ecran : colonne telephone, bouton de creation allegee, filtre sur le type standard */
    const colonnes = await p.evaluate(() => Ext.ComponentQuery.query('clientgestion')[0].columns
      .filter((c) => c.dataIndex).map((c) => [c.dataIndex, c.text, !!c.hidden]));
    const colTel = colonnes.find((c) => c[0] === 'str_TELEPHONE');
    ok('Une colonne « Téléphone » visible figure dans la liste des clients',
      !!colTel && /phone/i.test(colTel[1]) && colTel[2] === false, JSON.stringify(colTel));

    const boutons = await p.evaluate(() => Ext.ComponentQuery.query('clientgestion')[0].query('button')
      .map((x) => (x.text || '').replace(/&[a-z]+;/g, 'e')).filter((t) => /r.?er/i.test(t)));
    ok('Le bouton de création allégée s ajoute à côté du bouton « Créer »',
      boutons.length >= 2 && boutons.some((t) => /standard/i.test(t)), JSON.stringify(boutons));

    // Le combo est en queryMode « remote » : sa liste n'existe qu'une fois demandee au serveur,
    // ce que le clic sur son declencheur provoque.
    await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('clientgestion combobox[name=lg_TYPE_CLIENT_FILTER_ID]')[0];
      c.onTriggerClick();
    });
    await p.waitForTimeout(4000);
    const typesFiltre = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('clientgestion combobox[name=lg_TYPE_CLIENT_FILTER_ID]')[0];
      const v = []; c.getStore().each((r) => v.push([r.get('lg_TYPE_TIERS_PAYANT_ID'), r.get('str_LIBELLE_TYPE_TIERS_PAYANT')]));
      c.collapse();
      return v;
    });
    ok('Le filtre « Type client » propose « Client standard » et « Tous les types »',
      typesFiltre.some((t) => t[0] === '6' && /standard/i.test(t[1]))
      && typesFiltre.some((t) => t[0] === '' && /tous/i.test(t[1])), JSON.stringify(typesFiltre));

    /* 2. creation a l ecran, avec un numero saisi avec des separateurs */
    const ouvrir = async () => {
      await p.evaluate(() => {
        const btn = Ext.ComponentQuery.query('clientgestion')[0].query('button')
          .filter((x) => /standard/i.test(x.text || ''))[0];
        btn.handler.call(btn.scope || btn, btn);
      });
      await p.waitForFunction(() => Ext.ComponentQuery.query('addclientstandard').length > 0, null, { timeout: 15000 });
      await p.waitForTimeout(800);
    };
    const saisir = (nom, prenoms, tel) => p.evaluate(([n, pr, t]) => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      w.down('#nom').setValue(n);
      w.down('#prenoms').setValue(pr);
      w.down('#telephone').setValue(t);
    }, [nom, prenoms, tel]);
    const enregistrer = async () => {
      await p.evaluate(() => {
        const w = Ext.ComponentQuery.query('addclientstandard')[0];
        const btn = w.down('#enregistrer');
        btn.handler(btn);
      });
      await p.waitForTimeout(4000);
    };
    const etatFenetre = () => p.evaluate(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      if (!w) { return { ouverte: false, erreur: '' }; }
      const z = w.down('#messageErreur');
      return { ouverte: true, erreur: z && z.rendered ? z.el.dom.textContent.trim() : '' };
    });

    await ouvrir();
    const champs = await p.evaluate(() => Ext.ComponentQuery.query('addclientstandard')[0].down('#formulaire')
      .getForm().getFields().getRange().map((f) => f.getName()));
    ok('La fenêtre ne demande que le nom, les prénoms et le téléphone',
      champs.length === 3 && champs.indexOf('str_FIRST_NAME') >= 0 && champs.indexOf('str_LAST_NAME') >= 0
      && champs.indexOf('str_TELEPHONE') >= 0, JSON.stringify(champs));

    await saisir(NOM + '-A', 'Jean Marc', '07 08 47 37 50');
    await enregistrer();
    let apres = await etatFenetre();
    ok('Le client standard est créé et la fenêtre se referme', apres.ouverte === false, JSON.stringify(apres));

    const cree = q("SELECT CONCAT(COUNT(*), '|', COALESCE(MAX(str_TELEPHONE),''), '|',"
      + " COALESCE(MAX(lg_TYPE_CLIENT_ID),''), '|', COALESCE(MAX(str_STATUT),''))"
      + " FROM t_client WHERE str_FIRST_NAME='" + NOM + "-A'").split('|');
    ok('Le numéro est enregistré normalisé, sans les séparateurs de saisie',
      cree[0] === '1' && cree[1] === TEL, JSON.stringify(cree));
    ok('Le client est bien du type standard et actif', cree[2] === '6' && cree[3] === 'enable', JSON.stringify(cree));
    const compte = q("SELECT COUNT(*) FROM t_compte_client WHERE lg_CLIENT_ID ="
      + " (SELECT lg_CLIENT_ID FROM t_client WHERE str_FIRST_NAME='" + NOM + "-A')");
    ok('Son compte client est créé, comme par le formulaire complet', compte === '1', compte);
    const adresse = q("SELECT COALESCE(str_ADRESSE,'(vide)') FROM t_client WHERE str_FIRST_NAME='" + NOM + "-A'");
    ok('Le numéro n est plus rangé dans le champ Adresse', adresse === '(vide)' || adresse === '', adresse);

    /* 3. le meme numero est refuse, en nommant le client qui le detient */
    await ouvrir();
    await saisir(NOM + '-B', 'Paul', TEL);
    await enregistrer();
    apres = await etatFenetre();
    ok('Un numéro déjà porté par un client standard est refusé',
      apres.ouverte === true && /d.j. celui du client/i.test(apres.erreur), JSON.stringify(apres));
    ok('Le message nomme le client qui détient le numéro',
      apres.erreur.indexOf(NOM + '-A') >= 0 && /Jean Marc/.test(apres.erreur), apres.erreur);
    ok('Le second client n est pas créé',
      q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "-B'") === '0');

    /* 4. le meme numero ecrit autrement est refuse aussi : c est tout l interet de la normalisation */
    await saisir(NOM + '-B', 'Paul', '+225 07-08-47-37-50');
    await enregistrer();
    apres = await etatFenetre();
    ok('Le même numéro écrit autrement est refusé lui aussi',
      apres.ouverte === true && /d.j. celui du client/i.test(apres.erreur), apres.erreur);

    /* 5. un autre numero passe */
    await saisir(NOM + '-B', 'Paul', TEL2);
    await enregistrer();
    ok('Un autre numéro est accepté',
      q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "-B' AND str_TELEPHONE='" + TEL2 + "'") === '1');

    /* 6. saisies refusees a l ecran, sans aller jusqu au serveur */
    await ouvrir();
    await saisir('', '', '');
    await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      const btn = w.down('#enregistrer');
      btn.handler(btn);
    });
    await p.waitForTimeout(1200);
    const invalide = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      return { ouverte: !!w, valide: w ? w.down('#formulaire').getForm().isValid() : null };
    });
    ok('Une saisie vide est refusée à l écran, la fenêtre reste ouverte',
      invalide.ouverte === true && invalide.valide === false, JSON.stringify(invalide));

    await saisir(NOM + '-C', 'Ali', '0208473750');
    const numeroRefuse = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      return w.down('#telephone').isValid();
    });
    ok('Un numéro qui ne commence pas par 01, 05 ou 07 est refusé à l écran', numeroRefuse === false);
    await p.evaluate(() => { Ext.ComponentQuery.query('addclientstandard')[0].close(); });

    /* 7. l unicite ne vaut QUE pour les clients standards */
    const gabarit = q("SELECT lg_CLIENT_ID FROM t_client WHERE lg_TYPE_CLIENT_ID='1' LIMIT 1");
    const deuxieme = q("SELECT lg_CLIENT_ID FROM t_client WHERE lg_TYPE_CLIENT_ID='1' AND lg_CLIENT_ID<>'" + gabarit + "' LIMIT 1");
    let partageAccepte = 'oui';
    try {
      exec("UPDATE t_client SET str_TELEPHONE='0102030499' WHERE lg_CLIENT_ID IN ('" + gabarit + "','" + deuxieme + "');");
    } catch (e) {
      partageAccepte = 'non';
    }
    const partages = q("SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE='0102030499'");
    ok('Deux clients NON standards peuvent partager un numéro (aucune régression pour l assurance)',
      partageAccepte === 'oui' && partages === '2', partageAccepte + ' / ' + partages);
    exec("UPDATE t_client SET str_TELEPHONE=NULL WHERE str_TELEPHONE='0102030499';");

    /* 8. le numero retrouve le client dans la recherche de l ecran */
    await p.evaluate((t) => {
      Ext.getCmp('rechecher').setValue(t);
      Ext.ComponentQuery.query('clientgestion')[0].onRechClick();
    }, TEL);
    await p.waitForTimeout(4000);
    const trouve = await p.evaluate((n) => {
      const g = Ext.ComponentQuery.query('clientgestion')[0];
      let x = null;
      g.getStore().each((r) => { if (r.get('str_FIRST_NAME') === n) { x = { tel: r.get('str_TELEPHONE'), nom: r.get('str_FIRST_NAME') }; } });
      return { total: g.getStore().getCount(), ligne: x };
    }, NOM + '-A');
    ok('La recherche par numéro retrouve le client, et la grille affiche son téléphone',
      !!trouve.ligne && trouve.ligne.tel === TEL, JSON.stringify(trouve));

    /* ---------- retour du 17/09 : Entree ENCHAINE les champs, et l animation de la vente ----------
     *
     * Joue au CLAVIER, comme au comptoir : on tape, on appuie sur Entree, on regarde ou va le focus. Un test
     * qui appellerait focus() en JavaScript ne prouverait rien de l enchainement. */
    await ouvrir();
    const focusCourant = () => p.evaluate(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      if (!w) { return null; }
      const actif = document.activeElement;
      const trouve = ['nom', 'prenoms', 'telephone'].filter((id) => {
        const c = w.down('#' + id);
        return c && c.inputEl && c.inputEl.dom === actif;
      });
      const bouton = w.down('#enregistrer');
      if (trouve.length) { return trouve[0]; }
      if (bouton && bouton.el && bouton.el.dom.contains(actif)) { return 'bouton'; }
      return 'autre';
    });

    await p.waitForFunction(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      const c = w && w.down('#nom');
      return c && c.inputEl && c.inputEl.dom === document.activeElement;
    }, null, { timeout: 15000 });
    ok('À l ouverture, le curseur est dans le champ Nom', await focusCourant() === 'nom');

    await p.keyboard.type('E2ECS-CLAVIER', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    ok('Entrée depuis le Nom passe aux Prénoms', await focusCourant() === 'prenoms',
      String(await focusCourant()));

    await p.keyboard.type('Awa', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    ok('Entrée depuis les Prénoms passe au Téléphone', await focusCourant() === 'telephone',
      String(await focusCourant()));

    await p.keyboard.type('0708473777', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    ok('Entrée depuis le Téléphone passe au bouton Enregistrer', await focusCourant() === 'bouton',
      String(await focusCourant()));

    /* Rien ne doit s etre enregistre : le bouton est une ETAPE, pas un raccourci. */
    ok('Arriver sur le bouton n enregistre rien : la fenêtre est toujours ouverte',
      (await etatFenetre()).ouverte === true);
    ok('Et aucun client n a encore été créé',
      q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='E2ECS-CLAVIER'") === '0');

    /* L animation : celle de l ecran de vente, verifiee dans le style calcule et non dans le code. */
    const animation = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      const bouton = w.down('#enregistrer');
      const champ = w.down('#telephone');
      return {
        zone: String(w.el.dom.className).indexOf('vp-focus-zone') >= 0,
        boutonPret: String(bouton.el.dom.className).indexOf('vp-bouton-pret') >= 0,
        animationBouton: getComputedStyle(bouton.el.dom).animationName,
        /* La regle de l ecran de vente est LUE DANS LA FEUILLE DE STYLE, et non en focalisant un champ
         * temporaire : une premiere version de ce controle creait un input, le focalisait puis le
         * retirait - ce qui volait le focus au bouton et faisait echouer la frappe d Entree suivante.
         * Le test se trompait, pas le produit. */
        regleChamp: (function () {
          const cible = '.vp-focus-zone .x-form-field:not(.x-form-checkbox):focus';
          for (let i = 0; i < document.styleSheets.length; i++) {
            let regles;
            try { regles = document.styleSheets[i].cssRules; } catch (e) { continue; }
            if (!regles) { continue; }
            for (let j = 0; j < regles.length; j++) {
              if (regles[j].selectorText === cible) {
                return regles[j].style.animationName || regles[j].style.animation || '';
              }
            }
          }
          return '';
        }())
      };
    });
    ok('La fenêtre porte la zone d animation de l écran de vente', animation.zone === true,
      JSON.stringify(animation));
    ok('Le champ actif y bat comme dans la vente (vp-focus-beat)',
      /vp-focus-beat/.test(animation.regleChamp), JSON.stringify(animation));
    ok('Le bouton Enregistrer bat quand le focus l atteint (vp-bouton-beat)',
      animation.boutonPret === true && animation.animationBouton === 'vp-bouton-beat',
      JSON.stringify(animation));

    /* Une seconde frappe d Entree, sur le bouton, enregistre. */
    await p.keyboard.press('Enter');
    await p.waitForTimeout(4500);
    ok('Entrée sur le bouton enregistre le client', (await etatFenetre()).ouverte === false,
      JSON.stringify(await etatFenetre()));
    ok('Le client saisi entièrement au clavier est bien créé',
      q("SELECT CONCAT(str_FIRST_NAME,'|',str_LAST_NAME,'|',str_TELEPHONE) FROM t_client"
        + " WHERE str_FIRST_NAME='E2ECS-CLAVIER'") === 'E2ECS-CLAVIER|Awa|0708473777');

    /* Revenir dans un champ eteint le battement du bouton : deux battements ne diraient plus ou l on est.
     *
     * La creation precedente a recharge la grille des clients : on attend que ce rechargement soit fini
     * avant de rouvrir la fenetre, sinon l evaluation suivante tombe pendant le remplacement du contenu. */
    await p.waitForTimeout(2500);
    await ouvrir();
    await p.waitForTimeout(1000);
    const battement = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      const b = w.down('#enregistrer');
      w.donnerLeFocusAuBouton();
      const surLeBouton = String(b.el.dom.className).indexOf('vp-bouton-pret') >= 0;
      w.down('#nom').focus();
      return { surLeBouton: surLeBouton,
        apresRetourDansLeChamp: String(b.el.dom.className).indexOf('vp-bouton-pret') >= 0 };
    });
    ok('Le battement s allume sur le bouton et s éteint dès qu on revient dans un champ',
      battement.surLeBouton === true && battement.apresRetourDansLeChamp === false,
      JSON.stringify(battement));
    await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('addclientstandard')[0];
      if (w) { w.close(); }
    });
    await p.waitForTimeout(800);

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err.slice(0, 3)));
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + p.url());
  } finally {
    await b.close();
    nettoyer();
    const reste = q("SELECT CONCAT((SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%'), '|',"
      + " (SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE='0102030499'))");
    ok('Tout ce que le test a posé est retiré', reste === '0|0', reste);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
