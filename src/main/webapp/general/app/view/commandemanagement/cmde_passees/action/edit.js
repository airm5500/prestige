/* global Ext, testextjs */

/*
 * Fenetre « Mise à jour des informations du Bon de livraison » (etat de controle des achats, icone « Modifier les
 * informations du bon de livraison »).
 *
 * Plan du 21/11, point 1 : la fenetre etait non modale, construisait une seconde fenetre cachee, et ses champs portaient
 * des identifiants fixes (id) et des variables globales (vue, BL). Un clic sur un autre BL ouvrait donc une seconde
 * fenetre aux memes identifiants : la premiere ne retrouvait plus ses champs (« Enregistrer » sans effet, fenetre figee
 * en bas de l'ecran) ou enregistrait sur le dernier BL ouvert. Desormais : une seule fenetre, modale, champs designes par
 * itemId (relus dans la fenetre elle-meme), BL et vue gardes par la fenetre ; aucune suggestion du navigateur sous les
 * champs. Meme service REST (v1/etat-control-bon/edit), memes controles.
 */
Ext.define('testextjs.view.commandemanagement.cmde_passees.action.edit', {
    extend: 'Ext.window.Window',
    requires: ['Ext.form.*', 'testextjs.model.Grossiste'],
    cls: 'bl-edition',
    config: {
        odatasource: '',
        idOrder: '',
        montantachat: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    modal: true,
    autoShow: true,
    width: 500,
    height: 320,
    minWidth: 300,
    minHeight: 200,
    layout: 'fit',
    plain: true,

    initComponent: function () {
        var me = this, d = me.getOdatasource() || {};
        me.bonId = d.lgBONLIVRAISONID;
        var storeRepartiteur = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.Grossiste',
            pageSize: 999,
            proxy: {type: 'ajax', url: '../api/v1/grossiste/all', reader: {type: 'json', root: 'results', totalProperty: 'total'}, timeout: 240000}
        });
        /* pas de suggestions du navigateur sous les champs */
        var sansSuggestion = {afterrender: function (c) {
                if (c.inputEl) {
                    c.inputEl.set({autocomplete: 'off'});
                }
            }};
        Ext.apply(me, {
            title: me.getTitre(),
            items: [{
                    xtype: 'form', itemId: 'blFormulaire', bodyPadding: 10, border: false,
                    fieldDefaults: {labelAlign: 'right', labelWidth: 115, msgTarget: 'side'},
                    items: [{
                            xtype: 'fieldset', title: 'Saisie du bon de livraison', defaultType: 'textfield', defaults: {anchor: '100%', listeners: sansSuggestion},
                            items: [
                                {xtype: 'displayfield', fieldLabel: 'REF CMD:', name: 'str_REF_', itemId: 'str_REF_', fieldStyle: 'color:blue;', value: d.orderRef},
                                {xtype: 'combobox', fieldLabel: 'Repartiteur', allowBlank: false, name: 'lgGROSSISTEIDEDIT', itemId: 'lgGROSSISTEIDEDIT', margin: '5 15 0 0',
                                    store: storeRepartiteur, valueField: 'lg_GROSSISTE_ID', displayField: 'str_LIBELLE', pageSize: 999, queryMode: 'remote',
                                    emptyText: 'Choisir un repartiteur...', value: (d.fournisseur || {}).fournisseurLibelle},
                                {fieldLabel: 'NUMERO BL:', emptyText: 'NUMERO BL', name: 'str_REF_LIVRAISON', itemId: 'str_REF_LIVRAISON', allowBlank: false, value: d.strREFLIVRAISON},
                                {xtype: 'datefield', fieldLabel: 'Date du BL', name: 'dt_DATE_LIVRAISON', itemId: 'dt_DATE_LIVRAISON', format: 'd/m/Y', submitFormat: 'Y-m-d',
                                    allowBlank: false, maxValue: new Date(), value: d.dateLivraison},
                                {fieldLabel: 'Montant Hors Taxe', emptyText: 'Montant Hors Taxe', name: 'int_MHT', itemId: 'int_MHT', allowBlank: false, maskRe: /[0-9.]/, value: d.intMHT},
                                {fieldLabel: 'Montant TVA', emptyText: 'Montant TVA', name: 'int_TVA', itemId: 'int_TVA', allowBlank: false, maskRe: /[0-9.]/, value: d.intTVA}
                            ]
                        }]
                }],
            buttons: [{text: 'Enregistrer', itemId: 'blEnregistrer', cls: 'ordo-btn ordo-btn-primaire', handler: function (b) {
                        me.enregistrer(b);
                    }},
                {text: 'Annuler', itemId: 'blAnnuler', cls: 'ordo-btn', handler: function () {
                        me.close();
                    }}]
        });
        me.callParent(arguments);
    },

    champ: function (nom) {
        return this.down('#' + nom);
    },

    enregistrer: function (button) {
        var me = this;
        var reference = me.champ('str_REF_LIVRAISON').getValue();
        var date = me.champ('dt_DATE_LIVRAISON').getSubmitValue();
        var ht = me.champ('int_MHT').getValue();
        var tva = me.champ('int_TVA').getValue();
        if (tva === null || tva === undefined) {
            tva = 0;
        }
        if (reference === '' || !date || ht === '' || tva === '') {
            Ext.MessageBox.alert('VALIDATION', 'Veuillez renseigner les champs vides svp!');
            return;
        }
        if (date > Ext.Date.format(new Date(), 'Y-m-d')) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de livraison doit &ecirc;tre inf&eacute;rieur &agrave; ou &eacute;gale la date du jour');
            return;
        }
        button.disable();
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            timeout: 240000,
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode({
                bonId: me.bonId,
                dateLivraison: date,
                montantHt: ht,
                tva: tva,
                referenceBon: reference,
                grossisteId: me.champ('lgGROSSISTEIDEDIT').getValue()
            }),
            url: '../api/v1/etat-control-bon/edit',
            success: function (response) {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, true) || {};
                if (object.status !== 1) {
                    if (!me.isDestroyed) {
                        button.enable();
                    }
                    Ext.MessageBox.alert('Error Message', object.message || response.responseText);
                    return;
                }
                var vue = me.getParentview();
                me.close();
                Ext.MessageBox.alert('confirmation', object.message);
                if (vue && !vue.isDestroyed && vue.getStore) {
                    vue.getStore().reload();
                }
            },
            failure: function (response) {
                testextjs.app.getController('App').StopWaitingProcess();
                if (!me.isDestroyed) {
                    button.enable();
                }
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    }
});
