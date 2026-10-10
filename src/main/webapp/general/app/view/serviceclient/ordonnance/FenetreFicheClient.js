/* global Ext */

/*
 * Retours du 10/10 (point 14) : la « Fiche client » des Ordonnances ouverte en fenetre modale (exception voulue a la
 * regle « pas de fenetre ») depuis Gestion des tiers payants › Clients et depuis la vente. Meme vue que l'onglet Fiche
 * client (FicheClientVue), memes droits : la saisie suit le droit de modification des ordonnances.
 */
Ext.define('testextjs.view.serviceclient.ordonnance.FenetreFicheClient', {
    singleton: true,
    requires: ['testextjs.view.serviceclient.ordonnance.FicheClientVue'],

    /** Contexte attendu par la fiche (liste de clients, droit d'ecriture) quand elle vit hors de l'ecran Ordonnances. */
    contexte: function (peutEcrire) {
        return {
            peutEcrire: peutEcrire,
            storeClients: Ext.create('Ext.data.Store', {
                idProperty: 'lgCLIENTID',
                fields: [{name: 'lgCLIENTID', type: 'string'}, {name: 'strFIRSTNAME', type: 'string'},
                    {name: 'strLASTNAME', type: 'string'}, {name: 'strTELEPHONE', type: 'string'},
                    {name: 'typeClient', type: 'string'}, {name: 'libelleTypeClient', type: 'string'},
                    {name: 'dtNAISSANCE', type: 'string'}, {name: 'strSEXE', type: 'string'},
                    {name: 'nomComplet', convert: function (v, rec) {
                            return Ext.String.trim((rec.get('strFIRSTNAME') || '') + ' ' + (rec.get('strLASTNAME') || ''));
                        }}]
            }),
            listeClients: function () {
                return {
                    minWidth: 520,
                    getInnerTpl: function () {
                        return '<div class="ordo-client-ligne"><span class="ordo-client-nom">{strFIRSTNAME} {strLASTNAME}</span>'
                                + '<tpl if="libelleTypeClient"><span class="ordo-client-type ordo-client-type-{typeClient}">'
                                + '{libelleTypeClient}</span></tpl><span class="ordo-client-tel">{strTELEPHONE}</span></div>';
                    }
                };
            }
        };
    },

    /** Ouvre la fiche du client (clientId) ; nom : titre de la fenetre. */
    ouvrir: function (clientId, nom) {
        var me = this;
        if (!clientId) {
            Ext.MessageBox.alert('Fiche client', 'Aucun client choisi.');
            return;
        }
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/ordonnance-client/droits',
            success: function (r) {
                var d = Ext.decode(r.responseText, true) || {};
                if (d.consulter !== true) {
                    Ext.MessageBox.alert('Fiche client', 'Vous n\'avez pas accès aux fiches clients (droit des ordonnances).');
                    return;
                }
                var vue = Ext.create('testextjs.view.serviceclient.ordonnance.FicheClientVue', {
                    ecran: me.contexte(d.modifier === true), title: null, header: false
                });
                var w = Ext.create('Ext.window.Window', {
                    title: 'Fiche client' + (nom ? ' — ' + Ext.String.htmlEncode(nom) : ''), itemId: 'fenFicheClient', cls: 'fen-fiche-client',
                    modal: true, layout: 'fit', width: Math.min(1180, Ext.getBody().getViewSize().width - 40),
                    height: Math.min(720, Ext.getBody().getViewSize().height - 40), items: [vue],
                    buttons: [{text: 'Fermer', handler: function () {
                                w.close();
                            }}]
                });
                w.show();
                vue.ouvrir(clientId);
            }
        });
    }
});
