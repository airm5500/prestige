
/* global Ext */

Ext.define('testextjs.view.pharmaml.Rupturepharma', {
    extend: 'Ext.panel.Panel',
    xtype: 'rupturepharma',
    frame: true,
    title: 'LISTE DES RUPTURES',
    scrollable: true,
    width: '98%',
    minHeight: 500,
    cls: 'custompanel',
    /* 08/10 : la liste des ruptures, puis les equivalents proposes par les grossistes (point 5) */
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    initComponent: function () {
        var grossiste = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/grossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });

        var store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'libelleGrossiste',
                            type: 'string'

                        },

                        {name: 'reference',
                            type: 'string'

                        },
                        {name: 'prixAchat',
                            type: 'number'

                        },
                        {name: 'prixVente',
                            type: 'number'

                        },

                        {name: 'qty',
                            type: 'number'

                        },
                        {name: 'nbreProduit',
                            type: 'number'

                        },

                        {name: 'details',
                            type: 'string'

                        },
                        {name: 'grossisteId',
                            type: 'string'

                        },
                        {name: 'commandeDate',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/rupture',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            submitFormat: 'Y-m-d',
                            flex: 0.8,
                            labelWidth: 17,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 17,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        }
                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            emptyText: 'Taper pour rechercher',
                            enableKeyEvents: true
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'grossiste',
                            store: grossiste,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }

                        , {
                            xtype: 'tbseparator'
                        }, {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }

                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'Fussionner les ruptures',
                            iconCls: 'fusionicon',
                            itemId: 'fusion',
                            scope: this

                        }


                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'grilleRuptures',
                    flex: 1,
                    minHeight: 260,
                    /* retours du 08/10 (4) : la ligne cliquee choisit les equivalents affiches en dessous */
                    viewConfig: {
                        /* le RowExpander ignore getRowClass : la classe est posee sur la ligne apres chaque affichage */
                        listeners: {
                            refresh: function (v) {
                                var e = v.up('rupturepharma');
                                if (e) {
                                    e.marquerRuptureChoisie();
                                }
                            }
                        }
                    },
                    listeners: {
                        itemclick: function (view, rec, item, i, e) {
                            var cible = e && e.target, n;
                            for (n = cible; n && n !== item; n = n.parentNode) {
                                if (/(^|\s)(x-action-col-icon|x-grid-row-checker|x-grid-row-expander)(\s|$)/.test(n.className || '')) {
                                    return;
                                }
                            }
                            var ecran = view.up('rupturepharma');
                            ecran.filtrerEquivalents(rec);
                            ecran.marquerRuptureChoisie();
                        }
                    },
                    plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                    '<p>{details}</p>'

                                    )
                        }
                    ],
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },

                    columns: [
                        {
                            header: 'Référence',
                            dataIndex: 'reference',
                            flex: 1

                        },

                        {
                            header: 'Grossiste',
                            dataIndex: 'libelleGrossiste',
                            flex: 1.5
                        },
                        {
                            header: 'Nb.Produits',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            dataIndex: 'nbreProduit',
                            flex: 0.5
                        },
                        {
                            header: 'Montant.Achat',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            dataIndex: 'prixAchat',
                            flex: 1
                        },
                        {
                            /* retours du 08/10 : date et heure */
                            header: 'Date',
                            dataIndex: 'commandeDate',
                            itemId: 'colDateRupture',
                            width: 128

                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/order_tracking.png',
                                    tooltip: 'ENVOI PAR PHARMAML', 
                                            handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                            this.fireEvent('envoiPharmaML', view, rowIndex, colIndex, item, e, record, row);
                                            }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/excel_csv.png',
                                    tooltip: 'Exporter CSV',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('exportCsv', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('remove', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        }

                    ],
                    selModel: {
                        selType: 'checkboxmodel',
                        injectCheckbox: 'last',
                        pruneRemoved: false

                    },
                    dockedItems: [

                        {
                            xtype: 'pagingtoolbar',
                            store: store,
                            dock: 'bottom',
                            displayInfo: true,
                            pageSize: 15

                        }
                    ]

                },
                me.grilleEquivalents()
            ]

        });
        me.callParent(arguments);
    },

    /*
     * Retours du 08/10 (4) : les equivalents affiches sont ceux de la rupture choisie en haut (clic sur une ligne) ;
     * ils changent a chaque clic. Rien de choisi : tous, avec le rappel de cliquer une ligne.
     */
    ruptureChoisie: null,

    marquerRuptureChoisie: function () {
        var me = this, g = me.down('#grilleRuptures'), v = g && g.getView(), choix = me.ruptureChoisie;
        if (!v || !v.rendered) {
            return;
        }
        g.getStore().each(function (r) {
            var n = v.getNode(r);
            if (n) {
                Ext.fly(n)[choix && choix.id === r.get('id') ? 'addCls' : 'removeCls']('rupture-choisie');
            }
        });
    },

    filtrerEquivalents: function (rec) {
        var me = this, g = me.down('#grilleEquivalents'), st, n, total;
        if (rec !== undefined) {
            me.ruptureChoisie = rec ? {id: rec.get('id'), reference: rec.get('reference')} : null;
        }
        if (!g) {
            return;
        }
        st = g.getStore();
        st.clearFilter(true);
        total = st.getCount();
        if (me.ruptureChoisie) {
            var choix = me.ruptureChoisie;
            st.filterBy(function (r) {
                return r.get('ruptureId') ? r.get('ruptureId') === choix.id : r.get('reference') === choix.reference;
            });
        } else {
            st.filterBy(function () {
                return true;
            });
        }
        n = st.getCount();
        g.setTitle('Équivalents proposés par les grossistes' + (me.ruptureChoisie
                ? ' · rupture ' + Ext.String.htmlEncode(me.ruptureChoisie.reference) + ' (' + n + ' sur ' + total + ')'
                : ' (' + n + ') · cliquez une rupture en haut pour ne voir que les siens'));
        g.getView().emptyText = '<div style="padding:10px;color:#6b7b8c">' + (me.ruptureChoisie
                ? 'Aucun équivalent proposé pour cette rupture.' : 'Aucun équivalent proposé en attente.') + '</div>';
        g.getView().refresh();
    },

    /*
     * Point 5 du 08/10 : equivalents proposes (EP) par le grossiste dans sa reponse PharmaML, non livres. Accepter = la
     * ligne de rupture passe sur l'equivalent (le renvoi de la rupture le commandera) ; refuser = rien ne change.
     * « Mémoriser » : le meme choix sera applique automatiquement a ce couple de produits. Pas de fenetre : tout se
     * fait sur la ligne.
     */
    grilleEquivalents: function () {
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'type', 'codeRemplacant', 'designationRemplacant', {name: 'connu', type: 'boolean'}, 'qte', 'prixAchat',
                'reference', 'grossiste', 'cipOrigine', 'produitOrigine', 'date', {name: 'ruptureOuverte', type: 'boolean'}, 'ruptureId'],
            autoLoad: true,
            proxy: {type: 'ajax', url: '../api/v1/pharma/remplacements', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                load: function () {
                    var ecran = Ext.ComponentQuery.query('rupturepharma')[0];
                    if (ecran) {
                        ecran.filtrerEquivalents();
                    }
                }
            }
        });
        var enc = Ext.String.htmlEncode;
        var decider = function (grid, rec, decision) {
            var g = grid.up('#grilleEquivalents') || grid, memo = g.down('#memoriserChoix').getValue();
            Ext.Ajax.request({
                method: 'POST',
                url: '../api/v1/pharma/remplacements/' + encodeURIComponent(rec.get('id')) + '?decision=' + decision + '&memoriser=' + (memo ? 'true' : 'false'),
                success: function (r) {
                    var o = Ext.decode(r.responseText, true) || {}, info = g.down('#infoEquivalent');
                    info.update('<span style="color:' + (o.success ? '#17795f' : '#b42318') + '">' + enc(o.msg || 'Opération impossible.') + '</span>');
                    if (o.success) {
                        store.reload();
                    }
                },
                failure: function () {
                    g.down('#infoEquivalent').update('<span style="color:#b42318">Le serveur ne répond pas.</span>');
                }
            });
        };
        return {
            xtype: 'gridpanel',
            itemId: 'grilleEquivalents',
            title: 'Équivalents proposés par les grossistes',
            height: 230,
            collapsible: true,
            margin: '8 0 0 0',
            store: store,
            viewConfig: {emptyText: '<div style="padding:10px;color:#6b7b8c">Aucun équivalent proposé en attente.</div>', deferEmptyText: false},
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top',
                    items: [{xtype: 'checkboxfield', itemId: 'memoriserChoix', boxLabel: 'Mémoriser mon choix pour ce couple de produits'},
                        '->', {xtype: 'component', itemId: 'infoEquivalent', html: ''},
                        {xtype: 'button', itemId: 'toutesRuptures', text: 'Toutes les ruptures', tooltip: 'Afficher les équivalents de toutes les ruptures',
                            handler: function (b) {
                                var ecran = b.up('rupturepharma');
                                ecran.filtrerEquivalents(null);
                                ecran.marquerRuptureChoisie();
                            }},
                        {xtype: 'button', text: 'Actualiser', handler: function () {
                                store.reload();
                            }}]
                }],
            columns: [
                {header: 'Commande', dataIndex: 'reference', width: 130},
                {header: 'Grossiste', dataIndex: 'grossiste', width: 140},
                {header: 'Produit commandé', dataIndex: 'produitOrigine', flex: 1, renderer: function (v, m, r) {
                        return enc(v) + ' <span style="color:#6b7b8c">' + enc(r.get('cipOrigine')) + '</span>';
                    }},
                {header: 'Équivalent proposé', dataIndex: 'designationRemplacant', flex: 1, renderer: function (v, m, r) {
                        return '<b>' + enc(v || r.get('codeRemplacant')) + '</b> <span style="color:#6b7b8c">' + enc(r.get('codeRemplacant')) + '</span>'
                                + (r.get('connu') ? '' : ' <span data-qtip="Produit absent du fichier : il sera créé à l\'acceptation" style="color:#b26a00">(nouveau)</span>');
                    }},
                {header: 'Qté', dataIndex: 'qte', width: 55, align: 'right'},
                {header: 'Date', dataIndex: 'date', width: 132},
                {header: '', width: 190, sortable: false, menuDisabled: true, dataIndex: 'id',
                    renderer: function (v, m, r) {
                        if (!r.get('ruptureOuverte')) {
                            return '<span style="color:#6b7b8c" data-qtip="Rupture déjà renvoyée ou supprimée">Rupture close</span> '
                                    + '<span role="button" tabindex="0" class="eq-refuser" data-decision="REFUSER" style="cursor:pointer;color:#2E75B6">Écarter</span>';
                        }
                        return '<span role="button" tabindex="0" class="eq-accepter" data-decision="ACCEPTER" style="cursor:pointer;font-weight:600;color:#17795f">Accepter</span>'
                                + ' &nbsp;·&nbsp; <a href="#" class="eq-refuser" data-decision="REFUSER" style="color:#b42318">Refuser</a>';
                    }}
            ],
            listeners: {
                cellclick: function (view, td, ci, rec, tr, ri, e) {
                    var t = e.getTarget('[data-decision]');
                    if (t) {
                        decider(view.up('gridpanel'), rec, t.getAttribute('data-decision'));
                    }
                }
            }
        };
    }
});
