/* global Ext */

/**
 * « Gestion dépôts extensions » (évolution 5, point 1).
 *
 * Un seul dépôt est choisi en haut de l'écran, et les onglets Valorisation et Chiffre d'affaires le suivent.
 * L'onglet de saisie de vente garde son propre sélecteur : le dépôt y est redemandé à chaque vente, choix de
 * l'officine, et le choix fait en haut ne fait que le prérenseigner.
 *
 * Tous les sélecteurs sont QUALIFIÉS par l'onglet visé (depotextensionstock, depotextensionemplacement,
 * depotextensionca) et non par le seul xtype de l'écran : les trois onglets portent des composants de même
 * nature, et un sélecteur trop large en piloterait un autre que le sien. C'est la classe de bug rencontrée
 * deux fois sur ce projet.
 *
 * Tant qu'aucun dépôt n'est choisi, rien n'est demandé au serveur et les éditions restent inactives : une liste
 * de stock sans dépôt n'aurait aucun sens.
 */
Ext.define('testextjs.controller.DepotExtensionCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.stockmanagement.depotextension.DepotExtensionManager'],

    refs: [
        { ref: 'ecran', selector: 'depotextension' },
        { ref: 'depotEcran', selector: 'depotextension #depotEcran' },
        { ref: 'grilleStock', selector: 'depotextension depotextensionstock' },
        { ref: 'grilleEmplacement', selector: 'depotextension depotextensionemplacement' },
        { ref: 'ongletCa', selector: 'depotextension depotextensionca' }
    ],

    init: function () {
        var me = this;
        me.control({
            'depotextension #depotEcran': { select: me.surChangementDepot },
            'depotextension depotextensionstock combobox[itemId=famille]': { select: me.rechercher },
            'depotextension depotextensionstock checkbox[itemId=enStock]': { change: me.rechercher },
            'depotextension depotextensionstock button[itemId=rechercher]': { click: me.rechercher },
            'depotextension depotextensionstock textfield[itemId=recherche]': { specialkey: me.surTouche },
            'depotextension depotextensionstock button[itemId=exporterExcel]': { click: me.exporterExcel },
            'depotextension depotextensionstock button[itemId=imprimer]': { click: me.imprimer },
            'depotextension #vueSimple': { click: me.montrerVueSimple },
            'depotextension #vueEmplacement': { click: me.montrerVueEmplacement },
            'depotextension depotextensionca button[itemId=caRechercher]': { click: me.chargerCa },
            'depotextension #onglets': { tabchange: me.surChangementOnglet },
            'depotextension': { afterrender: me.surAffichage }
        });
    },

    surAffichage: function () {
        var me = this;
        var stock = me.getGrilleStock();
        if (stock) {
            stock.getStore().on('load', me.surChargementStock, me);
        }
        var emplacement = me.getGrilleEmplacement();
        if (emplacement) {
            emplacement.getStore().on('load', me.surChargementEmplacement, me);
        }
        me.rappeler('Choisissez un dépôt.');
        me.majActions();
        // Des l'affichage : la saisie de vente part d'un depot vide et d'un titre sans nom de depot.
        me.imposerLeDepotALaVente();
    },

    /** Identifiant du dépôt choisi pour l'écran, ou chaîne vide. */
    depotId: function () {
        var combo = this.getDepotEcran();
        return combo && combo.getValue() ? combo.getValue() : '';
    },

    nomDepot: function () {
        var combo = this.getDepotEcran();
        return combo ? (combo.getRawValue() || '') : '';
    },

    /** Critères courants de la valorisation, partagés par les deux vues et les deux éditions. */
    criteres: function () {
        var stock = this.getGrilleStock();
        var famille = stock ? stock.down('#famille').getValue() : '';
        return {
            depotId: this.depotId(),
            query: stock ? (stock.down('#recherche').getValue() || '').trim() : '',
            familleId: (!famille || famille === 'ALL') ? '' : famille,
            enStock: (stock && stock.down('#enStock').getValue()) ? 'true' : 'false'
        };
    },

    surChangementDepot: function () {
        var me = this;
        // Un changement de dépôt vide les listes avant de recharger : on ne doit pas voir une seconde le
        // contenu du dépôt précédent sous le nom du nouveau.
        var stock = me.getGrilleStock();
        if (stock) { stock.getStore().removeAll(); }
        var emplacement = me.getGrilleEmplacement();
        if (emplacement) { emplacement.getStore().removeAll(); }
        me.majValorisation(null);
        me.majTotauxEmplacement(null);
        me.viderCa();
        me.rappeler('');
        me.majActions();
        me.imposerLeDepotALaVente();
        me.rechargerOngletCourant();
    },

    /**
     * Impose à la saisie de vente le dépôt choisi en haut de l'écran.
     *
     * Le dépôt appartient à l'écran : dans l'onglet de vente il n'est plus saisissable, il est affiché en
     * lecture seule et grisé. Deux retours de l'officine viennent de là — le dépôt disparaissait, encadré de
     * rouge, après chaque vente validée, et le titre gardait le nom d'un dépôt précédent alors que plus rien
     * n'était choisi. Un reflet ne peut ni disparaître ni retarder.
     *
     * Passer une valeur vide est volontairement permis : c'est ce qui remet le champ ET le titre à zéro quand
     * on désélectionne le dépôt en haut.
     */
    imposerLeDepotALaVente: function () {
        var me = this;
        var ecran = me.getEcran();
        if (!ecran) { return; }
        var combo = ecran.down('doventeendepot #depotVente');
        if (!combo || combo.isDestroyed) { return; }
        var ctr = me.application.getController('VenteEnDepotCtr');
        var id = me.depotId();
        var poser = function () {
            if (!ctr || combo.isDestroyed) { return; }
            ctr.imposerLeDepot(id && combo.getStore().findExact('id', id) >= 0 ? id : null);
        };
        // Le store des dépôts de la vente peut ne pas être encore chargé : on attend, une seule fois.
        if (id && combo.getStore().getCount() === 0) {
            combo.getStore().on('load', poser, me, { single: true });
            combo.getStore().load();
        } else {
            poser();
        }
    },

    surTouche: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.rechercher();
        }
    },

    majActions: function () {
        var stock = this.getGrilleStock();
        if (!stock) { return; }
        var actif = !!this.depotId();
        stock.down('#exporterExcel').setDisabled(!actif);
        stock.down('#imprimer').setDisabled(!actif);
    },

    rechercher: function () {
        var me = this;
        me.majActions();
        if (!me.depotId()) {
            me.majValorisation(null);
            me.majTotauxEmplacement(null);
            return;
        }
        me.rechargerOngletCourant();
    },

    /** On ne charge que la vue visible : un onglet caché n'a pas à interroger le serveur. */
    rechargerOngletCourant: function () {
        var me = this;
        if (!me.depotId()) { return; }
        var ecran = me.getEcran();
        if (!ecran) { return; }
        var onglets = ecran.down('#onglets');
        var actif = onglets ? onglets.getActiveTab() : null;
        if (!actif || actif.getItemId() === 'ongletValorisation') {
            me.chargerVueValorisation();
        }
    },

    chargerVueValorisation: function () {
        var me = this;
        var ecran = me.getEcran();
        var vues = ecran ? ecran.down('#vues') : null;
        var courante = vues ? vues.getLayout().getActiveItem() : null;
        if (courante && courante.getXType() === 'depotextensionemplacement') {
            me.chargerEmplacement();
        } else {
            me.chargerStock();
        }
    },

    chargerStock: function () {
        var stock = this.getGrilleStock();
        if (!stock || !this.depotId()) { return; }
        var proxy = stock.getStore().getProxy();
        proxy.extraParams = Ext.apply(proxy.extraParams || {}, this.criteres());
        stock.getStore().loadPage(1);
    },

    chargerEmplacement: function () {
        var grille = this.getGrilleEmplacement();
        if (!grille || !this.depotId()) { return; }
        var proxy = grille.getStore().getProxy();
        proxy.extraParams = Ext.apply(proxy.extraParams || {}, this.criteres());
        grille.getStore().load();
    },

    montrerVueSimple: function () {
        var ecran = this.getEcran();
        var vues = ecran ? ecran.down('#vues') : null;
        if (!vues) { return; }
        vues.getLayout().setActiveItem(0);
        this.chargerStock();
    },

    montrerVueEmplacement: function () {
        var ecran = this.getEcran();
        var vues = ecran ? ecran.down('#vues') : null;
        if (!vues) { return; }
        vues.getLayout().setActiveItem(1);
        this.chargerEmplacement();
    },

    surChangementOnglet: function (onglets, onglet) {
        var me = this;
        if (!me.depotId()) {
            me.rappeler('Choisissez un dépôt.');
            return;
        }
        var id = onglet.getItemId();
        if (id === 'ongletValorisation') {
            me.chargerVueValorisation();
        } else if (id === 'ongletVente') {
            me.imposerLeDepotALaVente();
        }
        // L'onglet Chiffre d'affaires ne se charge pas tout seul : la période est à choisir.
    },

    /**
     * La valorisation vient du serveur : elle porte sur toutes les lignes retenues, pas sur la page affichée.
     *
     * Elle est lue dans les données brutes du lecteur du store, et non dans un argument de l'événement : en
     * ExtJS 4.2, « load » reçoit (store, enregistrements, succès, eOpts) et ne transporte PAS l'opération,
     * donc aucune réponse complète.
     */
    surChargementStock: function (store) {
        var reponse = this.reponseBrute(store);
        if (reponse && reponse.success === false) {
            this.majValorisation(null, reponse.message);
            return;
        }
        this.majValorisation(reponse ? reponse.valorisation : null);
    },

    surChargementEmplacement: function (store) {
        var reponse = this.reponseBrute(store);
        this.majTotauxEmplacement(reponse ? reponse.valorisation : null);
        this.majValorisation(reponse ? reponse.valorisation : null);
    },

    reponseBrute: function (store) {
        var lecteur = store.getProxy().getReader();
        return lecteur ? lecteur.rawData : null;
    },

    montant: function (v) {
        return Ext.util.Format.number(v || 0, '0,000');
    },

    majValorisation: function (valorisation, message) {
        var stock = this.getGrilleStock();
        var zone = stock ? stock.down('#valorisation') : null;
        if (!zone) { return; }
        if (!valorisation) {
            zone.update(Ext.String.htmlEncode(message || 'Choisissez un dépôt pour voir ce qu\'il détient.'));
            return;
        }
        var n = this.montant;
        zone.update('<b>' + Ext.String.htmlEncode(this.nomDepot()) + '</b> — '
                + n(valorisation.articles) + ' article(s), ' + n(valorisation.quantite) + ' unité(s) — '
                + 'valeur d\'achat <b>' + n(valorisation.valeurAchat) + '</b> CFA — '
                + 'valeur de vente <b>' + n(valorisation.valeurVente) + '</b> CFA');
    },

    /**
     * Total du dépôt rappelé sous la ventilation par emplacement : c'est ce qui permet de vérifier d'un coup
     * d'œil que la somme des lignes fait bien le total.
     */
    majTotauxEmplacement: function (valorisation) {
        var grille = this.getGrilleEmplacement();
        var zone = grille ? grille.down('#totaux') : null;
        if (!zone) { return; }
        if (!valorisation) {
            zone.update('');
            return;
        }
        var n = this.montant;
        zone.update('Total du dépôt — valeur d\'achat <b>' + n(valorisation.valeurAchat) + '</b> CFA, '
                + 'valeur de vente <b>' + n(valorisation.valeurVente) + '</b> CFA '
                + '(la somme des lignes ci-dessus doit faire ce total)');
    },

    rappeler: function (texte) {
        var ecran = this.getEcran();
        var zone = ecran ? ecran.down('#rappelDepot') : null;
        if (zone) {
            zone.update(Ext.String.htmlEncode(texte || ''));
        }
    },

    /* ------------------------------------------------------------------ chiffre d'affaires */

    viderCa: function () {
        var onglet = this.getOngletCa();
        if (!onglet) { return; }
        onglet.down('#caGrille').getStore().removeAll();
        onglet.down('#caTotaux').update('');
    },

    chargerCa: function () {
        var me = this;
        var onglet = me.getOngletCa();
        if (!onglet) { return; }
        if (!me.depotId()) {
            onglet.down('#caTotaux').update('<span style="color:#c0392b;">Choisissez un dépôt.</span>');
            return;
        }
        var debut = onglet.down('#caDebut').getValue();
        var fin = onglet.down('#caFin').getValue();
        if (!debut || !fin) {
            onglet.down('#caTotaux').update('<span style="color:#c0392b;">Indiquez la période.</span>');
            return;
        }
        if (debut > fin) {
            onglet.down('#caTotaux').update('<span style="color:#c0392b;">La date de début est après la fin.</span>');
            return;
        }
        onglet.down('#caTotaux').update('Lecture en cours...');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/balance/balancesalecashdepot',
            params: {
                dtStart: Ext.Date.format(debut, 'Y-m-d'),
                dtEnd: Ext.Date.format(fin, 'Y-m-d'),
                emplacementId: me.depotId()
            },
            timeout: 180000,
            success: function (reponse) {
                var r = Ext.JSON.decode(reponse.responseText, true) || {};
                me.afficherCa(r);
            },
            failure: function () {
                var o = me.getOngletCa();
                if (o && !o.isDestroyed) {
                    o.down('#caTotaux').update('<span style="color:#c0392b;">Le chiffre d\'affaires n\'a pas '
                            + 'pu être lu.</span>');
                }
            }
        });
    },

    afficherCa: function (r) {
        var me = this;
        var onglet = me.getOngletCa();
        if (!onglet || onglet.isDestroyed) { return; }
        if (r.success === false) {
            onglet.down('#caGrille').getStore().removeAll();
            onglet.down('#caTotaux').update('<span style="color:#c0392b;">'
                    + Ext.String.htmlEncode(r.msg || r.message || 'Chiffre d\'affaires indisponible.') + '</span>');
            return;
        }
        onglet.down('#caGrille').getStore().loadData(r.data || []);
        var meta = r.metaData || {};
        var n = me.montant;
        onglet.down('#caTotaux').update('<b>' + Ext.String.htmlEncode(me.nomDepot()) + '</b> — '
                + n(meta.nbreVente) + ' vente(s) — net <b>' + n(meta.montantNet) + '</b> CFA '
                + '(TTC ' + n(meta.montantTTC) + ', remise ' + n(meta.montantRemise) + ')');
    },

    exporterExcel: function () {
        window.location = '../api/v1/depot-extension/stock/excel?'
                + Ext.Object.toQueryString(this.criteres());
    },

    /** PDF servi en flux : il s'ouvre une seule fois, dans l'onglet ouvert par le clic. */
    imprimer: function () {
        var criteres = this.criteres();
        var stock = this.getGrilleStock();
        criteres.familleLibelle = stock ? (stock.down('#famille').getRawValue() || '') : '';
        window.open('../api/v1/depot-extension/stock/pdf?' + Ext.Object.toQueryString(criteres));
    }
});
