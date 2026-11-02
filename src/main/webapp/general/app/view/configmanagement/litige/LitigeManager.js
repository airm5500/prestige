/* global Ext, PrestigeConfirmation */

/*
 * Litiges tiers payant (audit 05 LI-01..08, notice litiges L1..L5) : ecran sur l'API REST api/v1/litiges.
 * Un litige est rattache a un dossier tiers payant ; tant qu'il est ouvert le dossier est hors facturation.
 * Actions de ligne : detail (et cloture avec ou sans remboursement), annulation (confirmation dans l'icone).
 * Les anciennes JSP (webservices/configmanagement/litige) restent dans le depot, l'ecran ne les appelle plus.
 */
var url_rest_litiges = '../api/v1/litiges';

Ext.define('testextjs.view.configmanagement.litige.LitigeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'litige',
    id: 'litigeID',
    requires: [
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.form.*'
    ],
    title: 'Litiges tiers payant',
    plain: true,
    frame: true,
    closable: false,
    initComponent: function () {
        var me = this;
        var montant = function (v) {
            return (v === null || v === undefined || v === '') ? '' : Ext.util.Format.number(v, '0,000');
        };
        var store = Ext.create('Ext.data.Store', {
            fields: ['lg_LITIGE_ID', 'dt_CREATED', 'str_TYPE', 'str_TIERS_PAYANT', 'str_CLIENT', 'str_REF_VENTE',
                'str_REF_BON', 'str_LIBELLE', 'str_ETAT', 'str_CONSEQUENCE', 'str_STATUT', 'int_PART_ORIGINE',
                'int_MONTANT_CONTESTE', 'int_MONTANT_ACCORDE', 'int_ECART', 'dt_CLOTURE', 'str_MOTIF_CLOTURE',
                'b_FACTURE', 'lg_DOSSIER_ID'],
            pageSize: 20,
            remoteFilter: true,
            proxy: {
                type: 'ajax',
                url: url_rest_litiges,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                beforeload: function (s) {
                    var p = s.getProxy();
                    p.setExtraParam('query', me.down('#rechercheLitige') ? me.down('#rechercheLitige').getValue() : '');
                    p.setExtraParam('lg_TYPELITIGE_ID', me.down('#filtreType') ? (me.down('#filtreType').getValue() || '') : '');
                    p.setExtraParam('filtre', me.down('#filtreStatut') ? (me.down('#filtreStatut').getValue() || 'ouverts') : 'ouverts');
                }
            }
        });
        var storeTypes = Ext.create('Ext.data.Store', {
            fields: ['lg_TYPELITIGE_ID', 'str_NAME'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_rest_litiges + '/types',
                reader: {type: 'json', root: 'data'}
            }
        });
        Ext.apply(this, {
            store: store,
            columns: [
                {header: 'Date', dataIndex: 'dt_CREATED', width: 115},
                {header: 'Type', dataIndex: 'str_TYPE', flex: 0.8},
                {header: 'Tiers payant', dataIndex: 'str_TIERS_PAYANT', flex: 1},
                {header: 'Client', dataIndex: 'str_CLIENT', flex: 1},
                {header: 'R&eacute;f. vente', dataIndex: 'str_REF_VENTE', width: 105},
                {header: 'Bon', dataIndex: 'str_REF_BON', width: 90},
                {header: 'Libell&eacute;', dataIndex: 'str_LIBELLE', flex: 1},
                {header: 'Part organisme', dataIndex: 'int_PART_ORIGINE', align: 'right', width: 105, renderer: montant},
                {header: 'Contest&eacute;', dataIndex: 'int_MONTANT_CONTESTE', align: 'right', width: 90, renderer: montant},
                {header: 'Accord&eacute;', dataIndex: 'int_MONTANT_ACCORDE', align: 'right', width: 90, renderer: montant},
                {
                    header: 'Statut', dataIndex: 'str_STATUT', width: 95,
                    renderer: function (v) {
                        if (v === 'enable') {
                            return "<span style='color:#E65100;font-weight:bold'>Ouvert</span>";
                        }
                        if (v === 'is_Closed') {
                            return "<span style='color:#2E7D32;font-weight:bold'>Cl&ocirc;tur&eacute;</span>";
                        }
                        if (v === 'delete') {
                            return "<span style='color:#757575'>Annul&eacute;</span>";
                        }
                        return "<span style='color:#757575'>Ancien</span>";
                    }
                },
                {
                    xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'D&eacute;tail du litige, de la vente et cl&ocirc;ture',
                            handler: function (g, ri) {
                                me.ouvrirDetail(g.getStore().getAt(ri));
                            }
                        }]
                },
                {
                    xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Annuler le litige (le dossier revient dans la facturation)',
                            getClass: function (v, meta, rec) {
                                return rec.get('str_STATUT') === 'enable' ? '' : 'x-hide-display';
                            },
                            handler: function (g, ri) {
                                var rec = g.getStore().getAt(ri);
                                if (rec.get('str_STATUT') !== 'enable') {
                                    return;
                                }
                                PrestigeConfirmation.ligne('Litige', 'Annuler ce litige ?', function () {
                                    me.annuler(rec);
                                });
                            }
                        }]
                }
            ],
            tbar: [{
                    text: 'Cr&eacute;er',
                    iconCls: 'addicon',
                    tooltip: 'Mettre un dossier tiers payant en litige',
                    handler: function () {
                        Ext.create('testextjs.view.configmanagement.litige.action.add', {
                            odatasource: '', parentview: me, mode: 'create', titre: 'Mettre un dossier en litige'
                        });
                    }
                }, '-', {
                    xtype: 'combobox',
                    itemId: 'filtreStatut',
                    width: 140,
                    editable: false,
                    store: [['ouverts', 'Litiges ouverts'], ['clos', 'Clôturés'], ['annules', 'Annulés'],
                        ['tous', 'Tous']],
                    value: 'ouverts',
                    listeners: {
                        select: function () {
                            store.loadPage(1);
                        }
                    }
                }, {
                    xtype: 'combobox',
                    itemId: 'filtreType',
                    width: 190,
                    store: storeTypes,
                    queryMode: 'local',
                    valueField: 'lg_TYPELITIGE_ID',
                    displayField: 'str_NAME',
                    forceSelection: true,
                    emptyText: 'Type de litige...',
                    listeners: {
                        select: function () {
                            store.loadPage(1);
                        },
                        change: function (c, v) {
                            if (!v) {
                                store.loadPage(1);
                            }
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    itemId: 'rechercheLitige',
                    width: 220,
                    emptyText: 'Vente, bon, client, tiers payant...',
                    enableKeyEvents: true,
                    listeners: {
                        specialkey: function (f, e) {
                            if (e.getKey() === e.ENTER) {
                                store.loadPage(1);
                            }
                        }
                    }
                }, {
                    text: 'Rechercher',
                    iconCls: 'searchicon',
                    handler: function () {
                        store.loadPage(1);
                    }
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store,
                displayInfo: true
            }
        });
        this.callParent();
        this.on('afterrender', function () {
            store.loadPage(1);
        }, this, {single: true, delay: 1});
    },
    ouvrirDetail: function (rec) {
        Ext.create('testextjs.view.configmanagement.litige.action.detailTransactionLitige', {
            odatasource: rec.data,
            parentview: this,
            mode: 'detail',
            titre: 'Litige ' + (rec.get('str_REF_VENTE') || '') + ' - ' + (rec.get('str_TIERS_PAYANT') || '')
        });
    },
    annuler: function (rec) {
        var me = this;
        Ext.Ajax.request({
            url: url_rest_litiges + '/' + encodeURIComponent(rec.get('lg_LITIGE_ID')) + '/annuler',
            method: 'POST',
            success: function (response) {
                var o = Ext.JSON.decode(response.responseText, true) || {};
                if (o.success === undefined || String(o.success) === '0') {
                    Ext.MessageBox.alert('Litige', o.errors || 'Annulation impossible');
                    return;
                }
                if (window.PrestigeToast) {
                    PrestigeToast.afficher(o.message, {titre: 'Litige'});
                }
                me.getStore().reload();
            },
            failure: function (response) {
                Ext.MessageBox.alert('Litige', 'Erreur serveur (' + response.status + ')');
            }
        });
    }
});
