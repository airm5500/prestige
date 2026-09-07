/* global Ext */

Ext.define('testextjs.view.vente.Removed', {
    extend: 'Ext.panel.Panel',
    xtype: 'venteannuler',
    requires: [
        'testextjs.view.garde.SelecteurGarde',
        'testextjs.view.vente.DetailProduitsVente'
    ],

    frame: true,
    title: 'Liste des Ventes annulées',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
//        align: 'stretch'
    },
    initComponent: function () {

        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/annulations',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                }

            }
        });

        var me = this;

        // Selection de ventes conservee a travers les pages et les filtres :
        // { lgPREENREGISTREMENTID: true }
        me.selectedVentes = {};
        var selModel = Ext.create('Ext.selection.CheckboxModel', {checkOnly: true});
        me.selModel_ = selModel;
        selModel.on('select', function (sm, rec) {
            me.selectedVentes[rec.get('lgPREENREGISTREMENTID')] = true;
            me.updateSelCounter();
        });
        selModel.on('deselect', function (sm, rec) {
            delete me.selectedVentes[rec.get('lgPREENREGISTREMENTID')];
            me.updateSelCounter();
        });
        vente.on('load', function () {
            me.reapplySelection();
        });

        Ext.applyIf(me, {
            dockedItems: [

                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            height: 30,
                            labelWidth: 30,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            height: 30,
                            labelWidth: 30,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            height: 30,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',

                        // Applique en un geste les bornes d'une garde enregistree.
                        {xtype: 'selecteurgarde'},
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-',
                        {
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            itemId: 'printPdf',
                            scope: this,
                            iconCls: 'printable'
                        },
                         '-',
                        {
                            text: 'Imprimer +',
                            tooltip: 'imprimer +',
                            itemId: 'printPlus',
                            scope: this,
                            iconCls: 'printable'
                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            text: 'Tout selectionner (toutes les pages)',
                            scope: this,
                            handler: this.selectAllPages
                        }, {
                            text: 'Tout deselectionner',
                            scope: this,
                            handler: this.deselectAllVentes
                        }, {
                            text: 'Creer inventaire',
                            iconCls: 'addicon',
                            tooltip: 'Creer un inventaire avec les produits des ventes annulees selectionnees',
                            scope: this,
                            handler: this.onCreateInventaire
                        }, '->', {
                            xtype: 'tbtext', itemId: 'selCount', text: 'Selectionnees : 0'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',

                    store: vente,
                    selModel: selModel,

                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        collapsible: true,
                        animCollapse: false,
                        enableColumnHide: false

                    },
                    columns: [
                        {
                            header: 'Reference',
                            dataIndex: 'strREF',
                            sortable: false,
                            menuDisabled: true,
                            flex: 0.8
                        },
                        {
                            header: 'Type.Vente',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'strTYPEVENTE',
                            flex: 0.5
                        }

                        , {
                            header: 'Montant',
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICE',
                            flex: 0.8,
                            align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            format: '0,000.'

                        },
                        {
                            header: 'Date.vente',
                            dataIndex: 'dtCREATED',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true,
                            align: 'center'
                        }, {
                            header: 'Heure.vente',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'HEUREVENTE',
                            flex: 0.6,
                            align: 'center'
                        }
                        ,

                        {
                            header: 'Date.Ann',
                            dataIndex: 'dateAnnulation',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true,
                            align: 'center'
                        }, {
                            header: 'Heure.Ann',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'heureAnnulation',
                            flex: 0.6,
                            align: 'center'
                        },

                        {
                            header: 'Opérateur',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userFullName',
                            flex: 1
                        }

                        , {
                            header: 'Vendeur',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userVendeurName',
                            flex: 1
                        }, {
                            header: 'Caissier',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userCaissierName',
                            flex: 1
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    // « action » distingue les deux icones : la colonne emet un
                                    // seul evenement « click » pour toutes, et sans ce marqueur
                                    // ouvrir le detail declencherait une impression de ticket.
                                    action: 'imprimer',
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Réimprimer le ticket',
                                    scope: me
                                }, {
                                    action: 'detail',
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir le détail des produits',
                                    scope: me
                                }]
                        }

                    ],
                    bbar: {
                        xtype: 'toolbar',
                        dock: 'bottom',
                        items: [{
                                xtype: 'pagingtoolbar',
                                store: vente,
                                dock: 'bottom',
                                pageSize: 16,
                                flex: 1.3,
                                displayInfo: true
                            }
                            , {
                                xtype: 'tbseparator'
                            },
                            {
                                xtype: 'displayfield',
                                flex: 0.7,
                                fieldLabel: 'Total annulation::',
                                labelWidth: 120,
                                itemId: 'totalAmount',
                                renderer: function (v) {
                                    return Ext.util.Format.number(v, '0,000.');
                                },
                                fieldStyle: "color:blue;font-weight:800;",
                                value: 0
                            }
                        ]
                    }
                }]
        });
        me.callParent(arguments);
    },
    getGridStore: function () {
        return this.down('gridpanel').getStore();
    },
    getActiveFilters: function () {
        var me = this;
        return {
            dtStart: me.down('#dtStart').getSubmitValue() || '',
            dtEnd: me.down('#dtEnd').getSubmitValue() || '',
            query: me.down('#query').getValue() || ''
        };
    },
    updateSelCounter: function () {
        var me = this, n = 0, k;
        for (k in me.selectedVentes) {
            if (me.selectedVentes.hasOwnProperty(k)) {
                n++;
            }
        }
        var cmp = me.down('#selCount');
        if (cmp) {
            cmp.setText('Selectionnees : ' + n);
        }
    },
    // Re-coche les lignes de la page courante presentes dans la selection
    reapplySelection: function () {
        var me = this, selModel = me.selModel_;
        selModel.suspendEvents();
        selModel.deselectAll();
        me.getGridStore().each(function (rec) {
            if (me.selectedVentes[rec.get('lgPREENREGISTREMENTID')]) {
                selModel.select(rec, true, true);
            }
        });
        selModel.resumeEvents();
        me.updateSelCounter();
    },
    // Selectionne l'ensemble des ventes annulees correspondant aux filtres actifs
    selectAllPages: function () {
        var me = this, filters = me.getActiveFilters();
        var prog = Ext.MessageBox.wait('Chargement...', 'Selection de toutes les ventes');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/annulations',
            method: 'GET',
            params: Ext.apply({start: 0, limit: 100000}, filters),
            timeout: 600000,
            success: function (response) {
                prog.hide();
                var res = Ext.JSON.decode(response.responseText, true);
                var list = (res && res.data) ? res.data : [];
                Ext.each(list, function (v) {
                    if (v.lgPREENREGISTREMENTID) {
                        me.selectedVentes[v.lgPREENREGISTREMENTID] = true;
                    }
                });
                me.reapplySelection();
            },
            failure: function () {
                prog.hide();
                Ext.MessageBox.alert('Erreur', 'Echec du chargement de la liste complete.');
            }
        });
    },
    deselectAllVentes: function () {
        var me = this;
        me.selectedVentes = {};
        me.selModel_.deselectAll();
        me.updateSelCounter();
    },
    onCreateInventaire: function () {
        var me = this, ids = [], k;
        for (k in me.selectedVentes) {
            if (me.selectedVentes.hasOwnProperty(k)) {
                ids.push(k);
            }
        }
        if (ids.length === 0) {
            Ext.MessageBox.alert('Message',
                    'Veuillez selectionner au moins une vente (bouton "Tout selectionner" pour tout inclure).');
            return;
        }
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Controle des produits');
        Ext.Ajax.request({
            url: '../api/v1/inventaire/produit-annules/selection/count',
            method: 'POST',
            jsonData: {ids: ids},
            timeout: 600000,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                var count = (r && r.count) ? r.count : 0;
                if (count === 0) {
                    Ext.MessageBox.alert('Message', 'Aucun produit dans les ventes selectionnees.');
                    return;
                }
                Ext.MessageBox.confirm('Confirmation',
                        'Vous allez creer un inventaire contenant <b>' + count
                        + '</b> produit(s) distinct(s) de <b>' + ids.length
                        + '</b> vente(s) annulee(s) selectionnee(s) (toutes pages confondues).<br/>Confirmez-vous ?',
                        function (btn) {
                            if (btn !== 'yes') {
                                return;
                            }
                            var prog = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                            Ext.Ajax.request({
                                url: '../api/v1/inventaire/produit-annules/selection',
                                method: 'POST',
                                jsonData: {ids: ids},
                                timeout: 600000,
                                success: function (response) {
                                    prog.hide();
                                    var res = Ext.JSON.decode(response.responseText, true);
                                    if (res && res.success) {
                                        Ext.MessageBox.alert('Inventaire',
                                                'Inventaire cree.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>');
                                    } else {
                                        Ext.MessageBox.alert('Erreur',
                                                (res && res.message) ? res.message : "La creation de l'inventaire a echoue.");
                                    }
                                },
                                failure: function () {
                                    prog.hide();
                                    Ext.MessageBox.alert('Erreur',
                                            "La creation de l'inventaire a echoue. Aucun inventaire partiel n'a ete cree.");
                                }
                            });
                        });
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Erreur', 'Le controle du nombre de produits a echoue.');
            }
        });
    }
});


