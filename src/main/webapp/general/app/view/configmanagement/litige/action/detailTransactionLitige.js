/* global Ext */

/*
 * Detail d'un litige (audit 05 LI-02, LI-08 ; notice litiges L2, L3), sur l'API REST api/v1/litiges/{id} : litige,
 * dossier tiers payant lie, lignes de la vente ; et, pour un litige ouvert, la cloture : avec remboursement (montant
 * accorde entre 1 et la part d'origine) ou sans remboursement (motif obligatoire). Confirmation dans le bouton.
 */
Ext.define('testextjs.view.configmanagement.litige.action.detailTransactionLitige', {
    extend: 'Ext.window.Window',
    xtype: 'detailtransactionlitige',
    id: 'detailtransactionlitigeID',
    requires: ['Ext.form.*', 'Ext.window.Window', 'Ext.grid.*'],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var source = this.getOdatasource() || {};
        var montant = function (v) {
            return (v === null || v === undefined || v === '') ? '' : Ext.util.Format.number(v, '0,000');
        };
        var lignes = Ext.create('Ext.data.Store', {
            fields: ['int_CIP', 'str_NAME', 'int_QUANTITY', 'int_PRICE_UNITAIR', 'int_PRICE']
        });
        var info = function (itemId, label) {
            return {xtype: 'displayfield', itemId: itemId, fieldLabel: label, value: ''};
        };
        Ext.apply(this, {
            title: this.getTitre() || 'Litige',
            width: 900,
            modal: true,
            layout: {type: 'vbox', align: 'stretch'},
            bodyPadding: 8,
            items: [{
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'stretch'},
                    defaults: {flex: 1, xtype: 'container', layout: 'anchor', defaults: {labelWidth: 130}},
                    items: [{
                            items: [info('dStatut', 'Statut'), info('dType', 'Type'), info('dTiersPayant', 'Tiers payant'),
                                info('dClient', 'Client'), info('dLibelle', 'Libell&eacute;'), info('dMotif', 'Motif organisme'),
                                info('dConsequence', 'Cons&eacute;quence')]
                        }, {
                            items: [info('dVente', 'Vente'), info('dBon', 'Bon'), info('dFacture', 'Facturation'),
                                info('dPart', 'Part organisme'), info('dConteste', 'Contest&eacute;'),
                                info('dAccorde', 'Accord&eacute; / &eacute;cart'), info('dCloture', 'Cl&ocirc;ture')]
                        }]
                }, {
                    xtype: 'grid',
                    title: 'Lignes de la vente',
                    height: 170,
                    store: lignes,
                    columns: [
                        {header: 'CIP', dataIndex: 'int_CIP', width: 90},
                        {header: 'Produit', dataIndex: 'str_NAME', flex: 1},
                        {header: 'Qt&eacute;', dataIndex: 'int_QUANTITY', width: 60, align: 'right'},
                        {header: 'P.U.', dataIndex: 'int_PRICE_UNITAIR', width: 90, align: 'right', renderer: montant},
                        {header: 'Montant', dataIndex: 'int_PRICE', width: 100, align: 'right', renderer: montant}
                    ]
                }, {
                    xtype: 'form',
                    itemId: 'formCloture',
                    title: 'Cl&ocirc;turer le litige',
                    hidden: true,
                    bodyPadding: 8,
                    defaults: {labelWidth: 170, anchor: '100%', msgTarget: 'side'},
                    items: [{
                            xtype: 'radiogroup',
                            itemId: 'clotureMode',
                            fieldLabel: 'D&eacute;cision de l\'organisme',
                            columns: 2,
                            items: [
                                {boxLabel: 'Avec remboursement', name: 'remboursement', inputValue: 'true', checked: true},
                                {boxLabel: 'Sans remboursement (abandon)', name: 'remboursement', inputValue: 'false'}
                            ],
                            listeners: {
                                change: function (g, v) {
                                    var avec = String(v.remboursement) === 'true';
                                    var m = me.down('#clotureMontant');
                                    m.setDisabled(!avec);
                                    m.allowBlank = !avec;
                                    var motif = me.down('#clotureMotif');
                                    motif.allowBlank = avec;
                                    m.validate();
                                    motif.validate();
                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            itemId: 'clotureMontant',
                            name: 'int_MONTANT',
                            fieldLabel: 'Montant accord&eacute;',
                            allowBlank: false,
                            allowDecimals: false,
                            minValue: 1,
                            hideTrigger: true
                        }, {
                            xtype: 'textfield',
                            itemId: 'clotureMotif',
                            name: 'str_MOTIF',
                            fieldLabel: 'Motif',
                            maxLength: 255,
                            blankText: 'Indiquez le motif de l\'abandon'
                        }]
                }],
            buttons: [{
                    text: 'Cl&ocirc;turer',
                    itemId: 'btnCloturer',
                    hidden: true,
                    handler: function (b) {
                        me.cloturer(b);
                    }
                }, {
                    text: 'Fermer',
                    handler: function () {
                        me.close();
                    }
                }]
        });
        this.callParent();
        this.show();
        this.setLoading('Chargement...');
        Ext.Ajax.request({
            url: '../api/v1/litiges/' + encodeURIComponent(source.lg_LITIGE_ID),
            method: 'GET',
            success: function (response) {
                me.setLoading(false);
                var o = Ext.JSON.decode(response.responseText, true) || {};
                if (o.success === undefined || String(o.success) === '0') {
                    Ext.MessageBox.alert('Litige', o.errors || 'Litige introuvable');
                    return;
                }
                me.afficher(o, lignes);
            },
            failure: function (response) {
                me.setLoading(false);
                Ext.MessageBox.alert('Litige', 'Erreur serveur (' + response.status + ')');
            }
        });
    },
    afficher: function (o, lignes) {
        var me = this;
        var n = function (v) {
            return (v === null || v === undefined || v === '') ? '' : Ext.util.Format.number(v, '0,000');
        };
        var statuts = {enable: 'Ouvert', is_Closed: 'Clôturé', 'delete': 'Annulé'};
        var set = function (id, v) {
            me.down('#' + id).setValue(Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v)));
        };
        set('dStatut', statuts[o.str_STATUT] || 'Ancien (sans dossier lié)');
        set('dType', o.str_TYPE);
        set('dTiersPayant', o.str_TIERS_PAYANT);
        set('dClient', o.str_CLIENT);
        set('dLibelle', o.str_LIBELLE);
        set('dMotif', o.str_DESCRIPTION);
        set('dConsequence', o.str_CONSEQUENCE);
        set('dVente', (o.str_REF_VENTE || '') + (o.dt_VENTE ? ' du ' + o.dt_VENTE : '')
                + (o.int_TOTAL_VENTE !== undefined ? ' - total ' + n(o.int_TOTAL_VENTE) : ''));
        set('dBon', (o.str_REF_BON || '') + (o.int_PERCENT !== undefined ? ' (' + o.int_PERCENT + ' %)' : ''));
        set('dFacture', o.b_FACTURE ? 'Facturé' + (o.str_FACTURE ? ' (' + o.str_FACTURE + ')' : '') : 'Non facturé');
        set('dPart', n(o.int_PART_ORIGINE));
        set('dConteste', n(o.int_MONTANT_CONTESTE));
        set('dAccorde', o.int_MONTANT_ACCORDE === null || o.int_MONTANT_ACCORDE === undefined ? ''
                : n(o.int_MONTANT_ACCORDE) + ' / ' + n(o.int_ECART));
        set('dCloture', (o.dt_CLOTURE || '') + (o.str_MOTIF_CLOTURE ? ' - ' + o.str_MOTIF_CLOTURE : ''));
        lignes.loadData(o.lignes || []);
        me.litige = o;
        if (o.str_STATUT === 'enable') {
            var m = me.down('#clotureMontant');
            m.setMaxValue(o.int_PART_ORIGINE);
            m.maxText = 'Au plus la part d\'origine (' + o.int_PART_ORIGINE + ')';
            m.minText = 'Au moins 1 (sinon : sans remboursement)';
            me.down('#formCloture').show();
            me.down('#btnCloturer').show();
        }
        me.center();
    },
    cloturer: function (b) {
        var me = this;
        var form = me.down('#formCloture').getForm();
        if (!form.isValid()) {
            var erreurs = [];
            form.getFields().each(function (f) {
                if (!f.isValid()) {
                    var libelle = document.createElement('div');
                    libelle.innerHTML = f.fieldLabel || '';
                    erreurs.push(libelle.textContent + ' : ' + f.getErrors().join(', '));
                }
            });
            Ext.MessageBox.alert('Litige', erreurs.join('<br>'));
            return;
        }
        // confirmation dans le bouton : premier clic « Confirmer la clôture ? », second clic dans les 5 s
        if (!b.enConfirmation) {
            b.texteInitial = b.texteInitial || b.getText();
            b.enConfirmation = true;
            b.confirmeDepuis = Date.now();
            b.setText('Confirmer la cl&ocirc;ture ?');
            PrestigeConfirmation.armer(b);
            Ext.defer(function () {
                if (b.enConfirmation && !b.isDestroyed) {
                    b.enConfirmation = false;
                    PrestigeConfirmation.desarmer(b);
                    b.setText(b.texteInitial);
                }
            }, 5000);
            return;
        }
        if (Date.now() - b.confirmeDepuis < 400) {
            return;
        }
        b.enConfirmation = false;
        PrestigeConfirmation.desarmer(b);
        b.setText(b.texteInitial);
        b.disable();
        var v = form.getValues();
        Ext.Ajax.request({
            url: '../api/v1/litiges/' + encodeURIComponent(me.litige.lg_LITIGE_ID) + '/cloturer',
            method: 'POST',
            params: {remboursement: v.remboursement, int_MONTANT: v.int_MONTANT || '', str_MOTIF: v.str_MOTIF || ''},
            success: function (response) {
                var o = Ext.JSON.decode(response.responseText, true) || {};
                if (o.success === undefined || String(o.success) === '0') {
                    b.enable();
                    Ext.MessageBox.alert('Litige', o.errors || 'Clôture impossible');
                    return;
                }
                var liste = Ext.getCmp('litigeID');
                if (liste && liste.getStore) {
                    liste.getStore().reload();
                }
                me.close();
                Ext.MessageBox.alert('Litige', o.message);
            },
            failure: function (response) {
                b.enable();
                Ext.MessageBox.alert('Litige', 'Erreur serveur (' + response.status + ')');
            }
        });
    }
});
