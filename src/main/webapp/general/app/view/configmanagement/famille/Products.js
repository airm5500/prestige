/* global Ext, valheight, amountformat */

/*
 * GESTION DES ARTICLES (menu « produitsxx ») : cocher les articles retenus.
 * Retours du 07/10 : nouvelle presentation, filtre par grossiste, et « Cocher / Décocher tout le résultat » qui
 * s'applique a TOUS les articles de la recherche courante, sur toutes les pages (apres confirmation avec le nombre).
 * Coche a l'ecran = bool_ACCOUNT a 0 en base (regle historique, inchangee).
 */
var products;

Ext.define('testextjs.view.configmanagement.famille.Products', {
    extend: 'Ext.grid.Panel',
    xtype: 'produitsxx',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Famille'
    ],
    title: 'Gestion des Articles',
    plain: true,
    frame: true,
    initComponent: function () {
        var me = this;
        products = me;
        var itemsPerPage = 20;
        var filtre = Ext.create('Ext.data.Store', {
            fields: ['libelle', 'valeur'],
            data: [{libelle: 'Produits cochés', valeur: 'Y'}, {libelle: 'Produits non cochés', valeur: 'N'}, {libelle: 'Tous', valeur: 'A'}]
        });
        var liste = function (url) {
            return Ext.create('Ext.data.Store', {
                idProperty: 'id', fields: ['id', 'libelle'], autoLoad: false, pageSize: 9999,
                proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
            });
        };
        var store = new Ext.data.Store({
            idProperty: 'lgFAMILLEID',
            fields: [{name: 'lgFAMILLEID', type: 'string'}, {name: 'intCIP', type: 'string'}, {name: 'strNAME', type: 'string'},
                {name: 'intPAF', type: 'number'}, {name: 'intPRICE', type: 'number'}, {name: 'stock', type: 'number'},
                {name: 'boolACCOUNT', type: 'boolean'}],
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {type: 'ajax', url: '../api/v1/fichearticle/account', timeout: 240000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        /* les filtres suivent toutes les pages (avant : seule la recherche etait reprise au changement de page) */
        store.on('beforeload', function (st) {
            st.getProxy().extraParams = me.criteres();
        });
        store.on('load', function () {
            me.majTotal();
        });

        Ext.apply(me, {
            width: '98%',
            height: typeof valheight !== 'undefined' ? valheight : 620,
            store: store,
            id: 'produitsxxID',
            viewConfig: {emptyText: 'Aucun article pour ces critères.', deferEmptyText: false, stripeRows: true},
            columns: [
                {header: 'CIP', dataIndex: 'intCIP', flex: 0.7},
                {header: 'Désignation', dataIndex: 'strNAME', flex: 2.5},
                {header: 'Prix vente', dataIndex: 'intPRICE', renderer: amountformat, align: 'right', flex: 0.7},
                {header: 'Prix achat', dataIndex: 'intPAF', renderer: amountformat, align: 'right', flex: 0.7},
                {header: 'Stock', dataIndex: 'stock', align: 'right', flex: 0.5},
                {
                    xtype: 'checkcolumn', header: 'Coché', dataIndex: 'boolACCOUNT', width: 70, sortable: false, menuDisabled: true,
                    listeners: {checkchange: function (scr, rowIndex, checked) {
                            var rec = store.getAt(rowIndex);
                            Ext.Ajax.request({
                                method: 'PUT',
                                headers: {'Content-Type': 'application/json'},
                                params: Ext.JSON.encode({checkug: checked}),
                                url: '../api/v1/fichearticle/account/' + rec.get('lgFAMILLEID'),
                                success: function (response) {
                                    var result = Ext.JSON.decode(response.responseText, true);
                                    if (result && result.success) {
                                        store.reload();
                                    }
                                },
                                failure: function (response) {
                                    Ext.Msg.alert('Gestion des articles', 'L\'opération a échoué (' + response.status + ').');
                                }
                            });
                        }}
                }
            ],
            selModel: {selType: 'cellmodel'},
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'textfield', itemId: 'recherche', id: 'rechecherProductxx', emptyText: 'Nom ou CIP…', width: 260,
                            maxLength: 100, enforceMaxLength: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.onRechClick();
                                    }
                                }}},
                        {xtype: 'combobox', itemId: 'rayons', flex: 1, minWidth: 170, store: liste('../api/v1/common/rayons'), pageSize: 99999,
                            valueField: 'id', displayField: 'libelle', queryMode: 'remote', minChars: 2, emptyText: 'Tous les emplacements',
                            listeners: {select: function () {
                                    me.onRechClick();
                                }}},
                        {xtype: 'combobox', itemId: 'grossiste', flex: 1, minWidth: 170, store: liste('../api/v1/common/grossiste'), pageSize: 99999,
                            valueField: 'id', displayField: 'libelle', queryMode: 'remote', minChars: 2, emptyText: 'Tous les grossistes',
                            listeners: {select: function () {
                                    me.onRechClick();
                                }}},
                        {xtype: 'combobox', itemId: 'filtres', id: 'filtres', width: 170, store: filtre, valueField: 'valeur', displayField: 'libelle',
                            editable: false, queryMode: 'local', value: 'A',
                            listeners: {select: function () {
                                    me.onRechClick();
                                }}},
                        {text: 'Rechercher', iconCls: 'searchicon', handler: function () {
                                me.onRechClick();
                            }},
                        {text: 'Effacer', tooltip: 'Effacer les filtres', handler: function () {
                                me.down('#recherche').setValue('');
                                me.down('#rayons').clearValue();
                                me.down('#grossiste').clearValue();
                                me.down('#filtres').setValue('A');
                                me.onRechClick();
                            }}
                    ]
                }, {
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'component', itemId: 'totalResultat', html: ''}, '->',
                        {text: 'Cocher tout le résultat', itemId: 'btnCocherTout', iconCls: 'checkicon',
                            tooltip: 'Coche TOUS les articles de la recherche courante, sur toutes les pages', handler: function () {
                                me.cocherTout(true);
                            }},
                        {text: 'Décocher tout le résultat', itemId: 'btnDecocherTout',
                            tooltip: 'Décoche TOUS les articles de la recherche courante, sur toutes les pages', handler: function () {
                                me.cocherTout(false);
                            }}
                    ]
                }],
            bbar: {xtype: 'pagingtoolbar', pageSize: itemsPerPage, store: store, displayInfo: true}
        });

        me.callParent();
        me.on('afterlayout', me.loadStore, me, {delay: 1, single: true});
    },

    /** Criteres de la recherche courante, communs a la liste et a « tout le résultat ». */
    criteres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c ? (c.getValue() || '') : '';
        };
        return {query: v('recherche'), rayon: v('rayons'), grossiste: v('grossiste'), filtre: v('filtres')};
    },

    majTotal: function () {
        var me = this, t = me.down('#totalResultat');
        if (t) {
            t.update('<b>' + Ext.util.Format.number(me.getStore().getTotalCount(), '0,000').replace(/,/g, ' ')
                    + '</b> article(s) dans le résultat');
        }
    },

    loadStore: function () {
        this.getStore().loadPage(1);
    },

    onRechClick: function () {
        this.getStore().loadPage(1);
    },

    cocherTout: function (coche) {
        var me = this, c = Ext.apply(me.criteres(), {coche: coche});
        var envoyer = function (simuler, ok) {
            Ext.Ajax.request({
                method: 'PUT', url: '../api/v1/fichearticle/account-lot', timeout: 240000,
                headers: {'Content-Type': 'application/json'}, params: Ext.JSON.encode(Ext.apply({simuler: simuler}, c)),
                success: function (r) {
                    var o = Ext.JSON.decode(r.responseText, true) || {};
                    if (o.success === false) {
                        Ext.Msg.alert('Gestion des articles', o.msg || o.message || 'Opération refusée.');
                        return;
                    }
                    ok(o);
                },
                failure: function (r) {
                    Ext.Msg.alert('Gestion des articles', 'L\'opération a échoué (' + r.status + ').');
                }
            });
        };
        envoyer(true, function (o) {
            if (!o.nombre) {
                Ext.Msg.alert('Gestion des articles', 'Aucun article dans le résultat.');
                return;
            }
            Ext.Msg.confirm('Gestion des articles', (coche ? 'Cocher' : 'Décocher') + ' les <b>' + o.nombre
                    + '</b> article(s) du résultat (toutes les pages) ?', function (b) {
                if (b === 'yes') {
                    envoyer(false, function () {
                        me.getStore().reload();
                    });
                }
            });
        });
    }
});
