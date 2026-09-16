/* global Ext, testextjs */

/**
 * Ecran des depots d'extension (evolution 5, point 1).
 *
 * Tant qu'aucun depot n'est choisi, rien n'est demande au serveur et les deux editions restent inactives : une
 * liste de stock sans depot n'aurait aucun sens.
 */
Ext.define('testextjs.controller.DepotExtensionCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.stockmanagement.depotextension.DepotExtensionManager'],

    refs: [{ ref: 'ecran', selector: 'depotextension' }],

    init: function () {
        var me = this;
        me.control({
            'depotextension combobox[itemId=depot]': { select: me.surChangementDepot },
            'depotextension combobox[itemId=famille]': { select: me.rechercher },
            'depotextension checkbox[itemId=enStock]': { change: me.rechercher },
            'depotextension button[itemId=rechercher]': { click: me.rechercher },
            'depotextension textfield[itemId=recherche]': { specialkey: me.surTouche },
            'depotextension button[itemId=exporterExcel]': { click: me.exporterExcel },
            'depotextension button[itemId=imprimer]': { click: me.imprimer },
            'depotextension': { afterrender: me.surAffichage }
        });
    },

    ecranDe: function (composant) {
        return composant.up ? composant.up('depotextension') : this.getEcran();
    },

    surAffichage: function (ecran) {
        ecran.getStore().on('load', this.surChargement, this);
    },

    /** Criteres courants, partages par la liste et les deux editions. */
    criteres: function (ecran) {
        var famille = ecran.down('#famille').getValue();
        return {
            depotId: ecran.down('#depot').getValue() || '',
            query: (ecran.down('#recherche').getValue() || '').trim(),
            familleId: (!famille || famille === 'ALL') ? '' : famille,
            enStock: ecran.down('#enStock').getValue() ? 'true' : 'false'
        };
    },

    surChangementDepot: function (combo) {
        var ecran = this.ecranDe(combo);
        // Un changement de depot vide la liste avant de recharger : on ne doit pas voir une seconde
        // le stock du depot precedent sous le nom du nouveau.
        ecran.getStore().removeAll();
        this.majValorisation(ecran, null);
        this.rechercher(combo);
    },

    surTouche: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.rechercher(champ);
        }
    },

    rechercher: function (composant) {
        var ecran = this.ecranDe(composant);
        if (!ecran) { return; }
        var criteres = this.criteres(ecran);
        var actif = !!criteres.depotId;
        ecran.down('#exporterExcel').setDisabled(!actif);
        ecran.down('#imprimer').setDisabled(!actif);
        if (!actif) {
            this.majValorisation(ecran, null);
            return;
        }
        var proxy = ecran.getStore().getProxy();
        proxy.extraParams = Ext.apply(proxy.extraParams || {}, criteres);
        ecran.getStore().loadPage(1);
    },

    /**
     * La valorisation vient du serveur : elle porte sur toutes les lignes retenues, pas sur la page.
     *
     * Elle est lue dans les donnees brutes du lecteur du store, et non dans un argument de l'evenement :
     * en ExtJS 4.2, « load » recoit (store, enregistrements, succes, eOpts) et ne transporte PAS
     * l'operation, donc aucune reponse complete.
     */
    surChargement: function (store) {
        var ecran = this.getEcran();
        if (!ecran) { return; }
        var lecteur = store.getProxy().getReader();
        var reponse = lecteur ? lecteur.rawData : null;
        if (reponse && reponse.success === false) {
            this.majValorisation(ecran, null, reponse.message);
            return;
        }
        this.majValorisation(ecran, reponse ? reponse.valorisation : null);
    },

    majValorisation: function (ecran, valorisation, message) {
        var zone = ecran.down('#valorisation');
        if (!zone) { return; }
        if (!valorisation) {
            zone.update(Ext.String.htmlEncode(message || 'Choisissez un dépôt pour voir ce qu\'il détient.'));
            return;
        }
        var n = function (v) { return Ext.util.Format.number(v || 0, '0,000'); };
        var depot = ecran.down('#depot');
        var nom = depot.getRawValue() || '';
        zone.update('<b>' + Ext.String.htmlEncode(nom) + '</b> — '
                + n(valorisation.articles) + ' article(s), ' + n(valorisation.quantite) + ' unité(s) — '
                + 'valeur d\'achat <b>' + n(valorisation.valeurAchat) + '</b> CFA — '
                + 'valeur de vente <b>' + n(valorisation.valeurVente) + '</b> CFA');
    },

    exporterExcel: function (bouton) {
        var ecran = this.ecranDe(bouton);
        window.location = '../api/v1/depot-extension/stock/excel?'
                + Ext.Object.toQueryString(this.criteres(ecran));
    },

    /** PDF servi en flux : il s'ouvre une seule fois, dans l'onglet ouvert par le clic. */
    imprimer: function (bouton) {
        var ecran = this.ecranDe(bouton);
        var criteres = this.criteres(ecran);
        criteres.familleLibelle = ecran.down('#famille').getRawValue() || '';
        window.open('../api/v1/depot-extension/stock/pdf?' + Ext.Object.toQueryString(criteres));
    }
});
