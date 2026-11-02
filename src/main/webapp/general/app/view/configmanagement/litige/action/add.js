/* global Ext */

/*
 * Mise en litige d'un dossier tiers payant (audit 05 LI-01, LI-04, LI-07 ; notice litiges L1, L4), sur l'API REST
 * api/v1/litiges. Trois portes d'entree : ecran Litiges (rien de pre-rempli), Facturation tiers payant (tiers payant et
 * compte client de la ligne), detail de la balance agee (tiers payant de la ligne). Le dossier se choisit dans la liste
 * des dossiers eligibles (vente cloturee, part organisme > 0, non facture ou facture sans reglement) : aucune saisie
 * libre. Le serveur refait tous les controles.
 */
Ext.define('testextjs.view.configmanagement.litige.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addlitige',
    id: 'AjoutLitige',
    requires: ['Ext.form.*', 'Ext.window.Window'],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var source = Ext.isObject(this.getOdatasource()) ? this.getOdatasource() : {};
        var compteId = source.lg_COMPTE_CLIENT_TIERS_PAYANT_ID || '';
        var storeTiersPayant = Ext.create('Ext.data.Store', {
            fields: ['lg_TIERS_PAYANT_ID', 'str_FULLNAME'],
            pageSize: 0,
            proxy: {
                type: 'ajax',
                url: '../api/v1/tierspayant/combo',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });
        var storeDossiers = Ext.create('Ext.data.Store', {
            fields: ['lg_DOSSIER_ID', 'str_LIBELLE', 'str_REF_VENTE', 'str_REF_BON', 'dt_VENTE', 'int_PART',
                'b_FACTURE', 'str_FACTURE', 'str_TIERS_PAYANT', 'lg_TIERS_PAYANT_ID', 'str_CLIENT'],
            pageSize: 20,
            proxy: {
                type: 'ajax',
                url: '../api/v1/litiges/dossiers',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                beforeload: function (s) {
                    var tp = me.down('#litigeTiersPayant');
                    s.getProxy().setExtraParam('lg_TIERS_PAYANT_ID', tp ? (tp.getValue() || '') : '');
                    s.getProxy().setExtraParam('lg_COMPTE_CLIENT_TIERS_PAYANT_ID', compteId);
                }
            }
        });
        var storeTypes = Ext.create('Ext.data.Store', {
            fields: ['lg_TYPELITIGE_ID', 'str_NAME'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/litiges/types',
                reader: {type: 'json', root: 'data'}
            }
        });
        var form = Ext.create('Ext.form.Panel', {
            bodyPadding: 10,
            border: false,
            defaults: {anchor: '100%', labelWidth: 190, msgTarget: 'side'},
            items: [{
                    xtype: 'combobox',
                    itemId: 'litigeTiersPayant',
                    fieldLabel: 'Tiers payant',
                    store: storeTiersPayant,
                    valueField: 'lg_TIERS_PAYANT_ID',
                    displayField: 'str_FULLNAME',
                    queryMode: 'remote',
                    minChars: 2,
                    forceSelection: true,
                    emptyText: 'Choisir le tiers payant (2 lettres au moins)...',
                    listeners: {
                        change: function () {
                            compteId = '';
                            var d = me.down('#litigeDossier');
                            d.clearValue();
                            d.getStore().removeAll();
                            d.lastQuery = null;
                        }
                    }
                }, {
                    xtype: 'combobox',
                    itemId: 'litigeDossier',
                    name: 'lg_DOSSIER_ID',
                    fieldLabel: 'Dossier contest&eacute;',
                    allowBlank: false,
                    blankText: 'Choisissez le dossier tiers payant contest&eacute;',
                    store: storeDossiers,
                    valueField: 'lg_DOSSIER_ID',
                    displayField: 'str_LIBELLE',
                    queryMode: 'remote',
                    minChars: 0,
                    pageSize: 20,
                    forceSelection: true,
                    triggerAction: 'all',
                    emptyText: 'Réf. vente, n° de bon ou client...',
                    listConfig: {emptyText: 'Aucun dossier éligible : choisissez d\'abord le tiers payant (dossiers non'
                                + ' facturés, ou facturés sans règlement).'},
                    listeners: {
                        select: function (c, recs) {
                            var r = Ext.isArray(recs) ? recs[0] : recs;
                            var m = me.down('#litigeMontant');
                            if (r) {
                                m.setMaxValue(r.get('int_PART'));
                                m.maxText = 'Au plus la part organisme du dossier (' + r.get('int_PART') + ')';
                                m.setValue(r.get('int_PART'));
                                me.down('#litigeInfoDossier').setValue('Vente ' + r.get('str_REF_VENTE') + ' du '
                                        + r.get('dt_VENTE') + ' - ' + r.get('str_TIERS_PAYANT') + ' - part organisme '
                                        + r.get('int_PART') + (r.get('b_FACTURE') ? ' - facturé (' + r.get('str_FACTURE') + ')'
                                        : ' - non facturé'));
                            }
                        }
                    }
                }, {
                    xtype: 'displayfield',
                    itemId: 'litigeInfoDossier',
                    fieldLabel: '&nbsp;',
                    labelSeparator: '',
                    value: ''
                }, {
                    xtype: 'numberfield',
                    itemId: 'litigeMontant',
                    name: 'int_MONTANT_CONTESTE',
                    fieldLabel: 'Montant contest&eacute;',
                    allowDecimals: false,
                    minValue: 1,
                    minText: 'Au moins 1',
                    hideTrigger: true
                }, {
                    xtype: 'combobox',
                    itemId: 'litigeType',
                    name: 'lg_TYPELITIGE_ID',
                    fieldLabel: 'Type de litige',
                    allowBlank: false,
                    store: storeTypes,
                    queryMode: 'local',
                    valueField: 'lg_TYPELITIGE_ID',
                    displayField: 'str_NAME',
                    forceSelection: true,
                    editable: false
                }, {
                    xtype: 'textfield',
                    name: 'str_LIBELLE',
                    fieldLabel: 'Libell&eacute;',
                    maxLength: 100,
                    emptyText: 'Par défaut : le type de litige'
                }, {
                    xtype: 'combobox',
                    name: 'str_ETAT',
                    fieldLabel: '&Eacute;tat',
                    editable: false,
                    store: ['Non payé', 'Payé en partie'],
                    value: 'Non payé'
                }, {
                    xtype: 'combobox',
                    name: 'str_CONSEQUENCE',
                    fieldLabel: 'Cons&eacute;quence',
                    editable: false,
                    store: ['Aucune conséquence', 'Interdiction d\'achat partielle', 'Interdiction d\'achat totale'],
                    value: 'Aucune conséquence'
                }, {
                    xtype: 'textareafield',
                    name: 'str_DESCRIPTION',
                    fieldLabel: 'Motif donn&eacute; par l\'organisme',
                    height: 60
                }, {
                    xtype: 'textareafield',
                    name: 'str_COMMENTAIRE',
                    fieldLabel: 'Commentaire',
                    height: 50
                }]
        });
        Ext.apply(this, {
            title: this.getTitre() || 'Mettre un dossier en litige',
            width: 680,
            modal: true,
            layout: 'fit',
            items: [form],
            buttons: [{
                    text: 'Enregistrer',
                    itemId: 'litigeEnregistrer',
                    handler: function (b) {
                        me.enregistrer(b, form);
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        me.close();
                    }
                }]
        });
        this.callParent();
        this.show();
        var tp = this.down('#litigeTiersPayant');
        if (source.lg_TIERS_PAYANT_ID) {
            var compte = compteId;
            storeTiersPayant.add({lg_TIERS_PAYANT_ID: source.lg_TIERS_PAYANT_ID,
                str_FULLNAME: source.str_FULLNAME || source.str_TIERS_PAYANT || source.lg_TIERS_PAYANT_ID});
            tp.suspendEvents(false);
            tp.setValue(source.lg_TIERS_PAYANT_ID);
            tp.resumeEvents();
            compteId = compte;
        }
    },
    enregistrer: function (b, form) {
        var me = this;
        if (!form.getForm().isValid()) {
            var erreurs = [];
            form.getForm().getFields().each(function (f) {
                if (!f.isValid()) {
                    var libelle = document.createElement('div');
                    libelle.innerHTML = f.fieldLabel || '';
                    erreurs.push(libelle.textContent + ' : ' + f.getErrors().join(', '));
                }
            });
            Ext.MessageBox.alert('Litige', erreurs.join('<br>'));
            return;
        }
        if (me.envoiEnCours) {
            return;
        }
        me.envoiEnCours = true;
        b.disable();
        Ext.Ajax.request({
            url: '../api/v1/litiges/create',
            method: 'POST',
            params: form.getForm().getValues(),
            callback: function () {
                me.envoiEnCours = false;
                if (!b.isDestroyed) {
                    b.enable();
                }
            },
            success: function (response) {
                var o = Ext.JSON.decode(response.responseText, true) || {};
                if (o.success === undefined || String(o.success) === '0') {
                    Ext.MessageBox.alert('Litige', o.errors || 'Enregistrement impossible');
                    return;
                }
                var liste = Ext.getCmp('litigeID');
                if (liste && liste.getStore) {
                    liste.getStore().reload();
                }
                var parent = me.getParentview();
                if (parent && parent !== liste && parent.getStore && !parent.isDestroyed) {
                    parent.getStore().reload();
                }
                me.close();
                Ext.MessageBox.alert('Litige', o.message);
            },
            failure: function (response) {
                Ext.MessageBox.alert('Litige', 'Erreur serveur (' + response.status + ') : le litige n\'est pas enregistré');
            }
        });
    }
});
