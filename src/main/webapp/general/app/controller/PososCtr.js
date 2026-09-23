/* global Ext */

/* Evolution 5, point 9 : conduite de l'ecran d'analyse Posos.
 *
 * Tous les selecteurs sont QUALIFIES par l'ecran (pososmanager ...). Un selecteur comme '#produit' non
 * qualifie viserait le premier composant du genre trouve dans TOUTE l'application - y compris celui de la
 * caisse - et cet ecran piloterait alors un autre ecran que le sien.
 */
Ext.define('testextjs.controller.PososCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.posos.PososManager'],

    refs: [
        {ref: 'ecran', selector: 'pososmanager'},
        {ref: 'produitCombo', selector: 'pososmanager #produit'},
        {ref: 'quantite', selector: 'pososmanager #quantite'},
        {ref: 'referenceVente', selector: 'pososmanager #referenceVente'},
        {ref: 'grilleLignes', selector: 'pososmanager #lignes'},
        {ref: 'grilleAlertes', selector: 'pososmanager #alertes'},
        {ref: 'etatPasserelle', selector: 'pososmanager #etatPasserelle'},
        {ref: 'messageAnalyse', selector: 'pososmanager #messageAnalyse'},
        {ref: 'boutonAnalyser', selector: 'pososmanager #analyser'},
        {ref: 'age', selector: 'pososmanager #age'},
        {ref: 'sexe', selector: 'pososmanager #sexe'},
        {ref: 'grossesse', selector: 'pososmanager #grossesse'},
        {ref: 'allaitement', selector: 'pososmanager #allaitement'},
        {ref: 'insuffisanceRenale', selector: 'pososmanager #insuffisanceRenale'},
        {ref: 'insuffisanceHepatique', selector: 'pososmanager #insuffisanceHepatique'}
    ],

    init: function () {
        this.control({
            'pososmanager': {afterrender: this.surOuverture},
            'pososmanager #produit': {select: this.surChoixProduit},
            'pososmanager #chargerVente': {click: this.chargerLaVente},
            'pososmanager #referenceVente': {specialkey: this.surToucheReference},
            'pososmanager #analyser': {click: this.analyser},
            'pososmanager #vider': {click: this.vider},
            'pososmanager #lignes': {itemclick: this.surClicLigne}
        });
    },

    surOuverture: function () {
        this.lireEtatPasserelle();
    },

    /**
     * Etat de la passerelle. La reponse ne contient aucun secret : l'identifiant y est masque et le secret n'est
     * qu'un booleen. On le dit a l'ecran, pour que le gestionnaire sache quoi renseigner cote serveur.
     */
    lireEtatPasserelle: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/posos/status',
            success: function (reponse) {
                var r = Ext.JSON.decode(reponse.responseText, true) || {};
                me.afficherEtat(r);
            },
            failure: function () {
                me.afficherEtat(null);
            }
        });
    },

    afficherEtat: function (r) {
        var zone = this.getEtatPasserelle();
        if (!zone || zone.isDestroyed) {
            return;
        }
        if (!r) {
            zone.update('<div style="color:#c0392b;">L\'état de la passerelle Posos n\'a pas pu être lu.</div>');
            return;
        }
        if (r.configuree && r.mode === 'demonstration') {
            // PROVISOIRE : l'analyse vient de regles preparees, pas de Posos. Le bandeau ne doit pas se rater.
            zone.update('<div class="posos-demo">MODE DÉMONSTRATION — en attendant les accès Posos, les analyses '
                    + 'viennent de règles préparées (Thésaurus ANSM, RCP). Ne pas utiliser pour une décision réelle.'
                    + '</div>');
        } else if (r.configuree) {
            zone.update('<div style="color:#17987e;">Posos configuré — ' + Ext.String.htmlEncode(r.url || '')
                    + ' (identifiant ' + Ext.String.htmlEncode(r.clientId || '') + ')</div>');
        } else {
            // On dit ce qui manque ET OU le renseigner, sans jamais montrer de valeur. Sans le chemin exact, le
            // gestionnaire depose le fichier au hasard et ne comprend pas pourquoi rien ne change.
            var ou = r.fichierAttendu
                    ? '<br/>Fichier attendu : <b>' + Ext.String.htmlEncode(r.fichierAttendu) + '</b> ('
                    + (r.fichierPresent ? 'présent mais incomplet' : 'absent') + '), '
                    + 'dans le même dossier que dicisms.properties.'
                    : '';
            zone.update('<div style="color:#c0392b;">Posos n\'est pas configuré : renseignez POSOS_API_URL, '
                    + 'POSOS_CLIENT_ID et POSOS_CLIENT_SECRET côté serveur — aucun identifiant ne se saisit '
                    + 'depuis cet écran.' + ou + '</div>');
        }
        var bouton = this.getBoutonAnalyser();
        if (bouton && !bouton.isDestroyed) {
            bouton.setDisabled(!r.configuree);
        }
    },

    surChoixProduit: function (combo, enregistrements) {
        var enr = enregistrements && enregistrements.length ? enregistrements[0] : null;
        if (!enr) {
            return;
        }
        var qte = this.getQuantite().getValue();
        this.ajouterLigne(enr.get('strNAME'), enr.get('intCIP'), qte > 0 ? qte : 1, '');
        combo.clearValue();
        combo.focus(false, 80);
    },

    ajouterLigne: function (nom, cip, quantite, posologie) {
        if (!nom) {
            return;
        }
        var store = this.getGrilleLignes().getStore();
        var existante = store.findExact('nom', nom);
        if (existante >= 0) {
            // Le meme produit deux fois n'apporte rien a l'analyse : on cumule la quantite.
            var ligne = store.getAt(existante);
            ligne.set('quantite', (ligne.get('quantite') || 0) + (quantite || 1));
            return;
        }
        store.add({nom: nom, cip: cip || '', quantite: quantite || 1, posologie: posologie || ''});
    },

    surToucheReference: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.chargerLaVente();
        }
    },

    /**
     * Charge les produits d'une vente. Le serveur les relit en base a partir de la reference : le navigateur
     * n'a pas a decider quels produits ont ete vendus.
     */
    chargerLaVente: function () {
        var me = this;
        var reference = Ext.String.trim(me.getReferenceVente().getValue() || '');
        if (!reference) {
            me.dire('Indiquez la référence de la vente ou le N° de l\'ordonnance à analyser.', true);
            return;
        }
        // La reference est resolue par le serveur, qui accepte aussi bien l'identifiant que la reference :
        // c'est lui qui relit les produits en base, le navigateur n'a pas a en decider.
        me.venteId = reference;
        me.analyser();
    },

    surClicLigne: function (vue, enregistrement, element, index, e) {
        // Colonne d'action : le retrait de la ligne.
        if (e && e.getTarget('.x-action-col-icon')) {
            this.getGrilleLignes().getStore().removeAt(index);
        }
    },

    contexte: function () {
        var c = {};
        var age = this.getAge().getValue();
        if (age !== null && age !== '' && age >= 0) {
            c.age = age;
        }
        var sexe = this.getSexe().getValue();
        if (sexe) {
            c.sexe = sexe;
        }
        if (this.getGrossesse().getValue()) {
            c.grossesse = true;
        }
        if (this.getAllaitement().getValue()) {
            c.allaitement = true;
        }
        if (this.getInsuffisanceRenale().getValue()) {
            c.insuffisanceRenale = true;
        }
        if (this.getInsuffisanceHepatique().getValue()) {
            c.insuffisanceHepatique = true;
        }
        return c;
    },

    analyser: function () {
        var me = this;
        var store = me.getGrilleLignes().getStore();
        var demande = {contexte: me.contexte()};
        if (me.venteId) {
            demande.venteId = me.venteId;
        } else {
            if (store.getCount() === 0) {
                me.dire('Ajoutez au moins un produit à analyser.', true);
                return;
            }
            var produits = [];
            store.each(function (l) {
                produits.push({
                    nom: l.get('nom'),
                    cip: l.get('cip'),
                    quantite: l.get('quantite'),
                    posologie: l.get('posologie')
                });
            });
            demande.produits = produits;
        }
        me.dire('Analyse en cours...', false);
        var bouton = me.getBoutonAnalyser();
        if (bouton && !bouton.isDestroyed) {
            bouton.disable();
        }
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/posos/analyse',
            jsonData: demande,
            callback: function () {
                // Le rappel s'execute apres success : l'ecran a pu etre ferme entre-temps.
                if (!me.isDestroyed && bouton && !bouton.isDestroyed) {
                    bouton.enable();
                }
            },
            success: function (reponse) {
                me.afficherResultat(Ext.JSON.decode(reponse.responseText, true) || {});
            },
            failure: function () {
                me.dire('L\'analyse n\'a pas abouti.', true);
            }
        });
    },

    afficherResultat: function (r) {
        var me = this;
        var grille = me.getGrilleAlertes();
        if (!grille || grille.isDestroyed) {
            return;
        }
        grille.getStore().loadData(r.alertes || []);
        me.venteId = null;
        if (r.venteProduits) {
            // Le serveur peut renvoyer les produits qu'il a effectivement analyses : on les montre.
            me.getGrilleLignes().getStore().loadData(r.venteProduits);
        }
        if (r.contexteOrdonnance) {
            // Ordonnance client chargee (22/09) : son contexte clinique enregistre s'affiche, pour qu'on voie
            // ce qui a ete envoye - et qu'on puisse le corriger avant une nouvelle analyse.
            var c = r.contexteOrdonnance;
            me.getAge().setValue(c.age === null || c.age === undefined ? null : c.age);
            me.getSexe().setValue(c.sexe || '');
            me.getGrossesse().setValue(c.grossesse === true);
            me.getAllaitement().setValue(c.allaitement === true);
            me.getInsuffisanceRenale().setValue(c.insuffisanceRenale === true);
            me.getInsuffisanceHepatique().setValue(c.insuffisanceHepatique === true);
        }
        if (r.disponible === false) {
            me.dire(r.message || 'Analyse indisponible.', true);
            return;
        }
        var demo = r.demonstration === true
                ? '<div class="posos-demo">' + Ext.String.htmlEncode(r.avertissement || 'DÉMONSTRATION') + '</div>'
                : '';
        var parties = [];
        var majeures = r.nombreMajeures || 0;
        parties.push((r.total || 0) + ' alerte(s)');
        if (majeures > 0) {
            parties.push('<span style="color:#c0392b;font-weight:bold;">dont ' + majeures + ' à lire absolument'
                    + '</span>');
        }
        if (r.produitsNonReconnus && r.produitsNonReconnus.length) {
            // Un produit non analyse est plus dangereux qu'une alerte : il doit se voir.
            parties.push('<span style="color:#c0392b;">' + (r.demonstration === true ? 'non couvert(s) par la démonstration, ne pas conclure à l\'absence d\'interaction : ' : 'non analysé(s) par Posos : ')
                    + Ext.String.htmlEncode(r.produitsNonReconnus.join(', ')) + '</span>');
        }
        if ((r.total || 0) === 0 && r.message) {
            // Aucune alerte : le message remplace le compteur, mais les produits non couverts restent dits.
            parties[0] = Ext.String.htmlEncode(r.message);
        }
        me.dire(demo + parties.join(' — '), false);
    },

    dire: function (texte, alerte) {
        var zone = this.getMessageAnalyse();
        if (!zone || zone.isDestroyed) {
            return;
        }
        zone.update('<div style="' + (alerte ? 'color:#c0392b;' : 'color:#555;') + '">' + texte + '</div>');
    },

    vider: function () {
        this.venteId = null;
        this.getGrilleLignes().getStore().removeAll();
        this.getGrilleAlertes().getStore().removeAll();
        this.getReferenceVente().setValue('');
        this.dire('', false);
    }
});
