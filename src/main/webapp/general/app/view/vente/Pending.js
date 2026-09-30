/* global Ext */

/*
 * MENU VENTE du service client : les ventes en attente (maquette validee le 30/09, theme commun).
 *
 * Une seule barre arrondie (retour du 30/09) : « Nouvelle vente », type de vente en puces, recherche, puis les
 * impressions et l'inventaire. Le tableau montre le client et le type en pastille, et les actions de chaque ligne ont
 * le dessin commun (icones au trait).
 *
 * Les identifiants lus par le controleur (PendingCtr) sont gardes : addBtn, typeVente (combo, desormais cache et pose
 * par les puces), query, rechercher, printParVente, printListe, createInventaire, et les evenements toEdit / goto des
 * actions de ligne.
 */
Ext.define('testextjs.view.vente.Pending', {
    extend: 'Ext.panel.Panel',
    xtype: 'cloturerventemanager',
    requires: ['testextjs.view.commun.PaginationNumerotee'],
    frame: true,
    title: 'Liste Des Ventes',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel theme-commun mv-panneau',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var store = Ext.create('Ext.data.ArrayStore', {
            data: [['VNO'], ['VO']],
            fields: [{name: 'typeVente', type: 'string'}]
        });
        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            sorters: [{
                    property: 'heure',
                    direction: 'DESC'
                }],
            autoLoad: false,
            pageSize: 9999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/preventes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var me = this;
        /* Puces du type de vente : elles posent le combo (cache) que lit le controleur, puis relancent la recherche. */
        var puce = function (texte, valeur, enfoncee) {
            return {xtype: 'button', text: texte, cls: 'ordo-puce', enableToggle: true, toggleGroup: 'venteTypePuces',
                allowDepress: false, pressed: !!enfoncee, margin: '0 4 0 0',
                handler: function (b) {
                    var combo = b.up('cloturerventemanager').down('#typeVente');
                    combo.setValue(valeur || null);
                    combo.fireEvent('select', combo, valeur ? [combo.getStore().findRecord('typeVente', valeur)] : []);
                }};
        };
        var icone = function (nom) {
            return 'resources/images/icons/fam/' + nom;
        };
        Ext.applyIf(me, {
            /* Une seule barre (retour du 30/09) : Nouvelle vente, type en puces, recherche, impressions et inventaire. */
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    itemId: 'barreMenuVente',
                    cls: 'mv-barre',
                    margin: '10 10 8 10',
                    padding: '6 8',
                    defaults: {scale: 'small'},
                    items: [{
                            text: 'Nouvelle vente',
                            scope: this,
                            itemId: 'addBtn',
                            icon: icone('add.png'),
                            cls: 'ordo-btn-primaire'
                        }, {
                            xtype: 'container',
                            itemId: 'typesPuces',
                            margin: '0 6 0 10',
                            layout: {type: 'hbox', align: 'middle'},
                            items: [puce('Toutes', '', true), puce('Au comptant', 'VNO'), puce('Assurance / carnet', 'VO')]
                        }, {
                            xtype: 'combobox',
                            itemId: 'typeVente',
                            hidden: true,
                            store: store,
                            valueField: 'typeVente',
                            displayField: 'typeVente',
                            queryMode: 'local'
                        }, {
                            xtype: 'textfield',
                            itemId: 'query',
                            cls: 'mv-recherche',
                            flex: 1,
                            minWidth: 180,
                            enableKeyEvents: true,
                            emptyText: 'Rechercher : référence, client, produit… (Entrée)'
                        }, {
                            xtype: 'button',
                            tooltip: 'Rechercher',
                            itemId: 'rechercher',
                            icon: 'resources/images/search.png',
                            cls: 'ordo-btn',
                            margin: '0 10 0 2'
                        }, {
                            text: 'Imprimer par vente',
                            tooltip: 'Produits regroupés par vente (ordre chronologique)',
                            itemId: 'printParVente',
                            icon: icone('printer.png'),
                            cls: 'ordo-btn'
                        }, {
                            text: 'Liste des produits',
                            tooltip: 'Tous les produits par ordre alphabétique avec le numéro de vente',
                            itemId: 'printListe',
                            icon: icone('printer.png'),
                            cls: 'ordo-btn'
                        }, {
                            text: 'Créer un inventaire',
                            tooltip: 'Créer un inventaire avec les produits des ventes en attente affichées',
                            itemId: 'createInventaire',
                            icon: icone('add.png'),
                            cls: 'ordo-btn'
                        }]
                }],
            items: [{
                    xtype: 'gridpanel',
                    store: vente,
                    cls: 'ordo-carte theme-grille',
                    margin: '0 10 10 10',
                    viewConfig: {
                        forceFit: true,
                        columnLines: false,
                        enableColumnHide: false,
                        loadMask: false,
                        emptyText: '<div class="va-vide">Aucune vente en attente.</div>',
                        deferEmptyText: false
                    },
                    columns: [{
                            header: 'Référence',
                            dataIndex: 'strREF',
                            flex: 1,
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (v) {
                                return '<span class="va-mono">' + Ext.String.htmlEncode(v || '') + '</span>';
                            }
                        }, {
                            header: 'Date · heure',
                            dataIndex: 'heure',
                            sortable: false,
                            menuDisabled: true,
                            width: 150,
                            renderer: function (v, meta, rec) {
                                return Ext.String.htmlEncode(rec.get('dtUPDATED') || '') + ' <b>'
                                        + Ext.String.htmlEncode(String(v || '').substring(0, 5)) + '</b>';
                            }
                        }, {
                            header: 'Client',
                            dataIndex: 'clientFullName',
                            flex: 1.4,
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (v) {
                                return v ? Ext.String.htmlEncode(v) : '<span style="color:#9aa8b6">—</span>';
                            }
                        }, {
                            header: 'Type',
                            dataIndex: 'strTYPEVENTE',
                            sortable: false,
                            menuDisabled: true,
                            width: 150,
                            renderer: function (v, meta, rec) {
                                var id = String(rec.get('lgTYPEVENTEID') || '');
                                var libelles = {'1': 'Au comptant', '2': 'Assurance', '3': 'Carnet'};
                                var cls = {'1': 'va-p-ok', '2': 'va-p-info', '3': 'va-p-att'}[id] || 'va-p-gris';
                                return '<span class="va-pill ' + cls + '">' + Ext.String.htmlEncode(libelles[id] || v || '')
                                        + '</span>';
                            }
                        }, {
                            header: 'Montant',
                            dataIndex: 'intPRICE',
                            align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            width: 130,
                            renderer: function (v) {
                                return '<b>' + Ext.util.Format.number(v || 0, '0,000') + '</b>';
                            }
                        }, {
                            header: 'Vendeur',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userFullName',
                            flex: 1
                        }, {
                            /* Actions de ligne au dessin commun : un trait, une couleur, un cadre. */
                            xtype: 'actioncolumn',
                            header: 'Actions',
                            width: 90,
                            align: 'center',
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    iconCls: 'act-ico act-modifier',
                                    tooltip: 'Modifier (reprendre la vente)',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toEdit', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }, {
                                    iconCls: 'act-ico act-voir',
                                    tooltip: 'Voir le détail',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('goto', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            hidden: true,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/trash.png',
                                    tooltip: 'Mettre dans la corbeille',
                                    menuDisabled: true,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toTrash', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            hidden: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer',
                                    menuDisabled: true,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toDelete', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        }],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: vente,
                        dock: 'bottom',
                        plugins: ['paginationnumerotee'],
                        displayInfo: true,
                        displayMsg: 'Ventes {0} – {1} sur {2}',
                        emptyMsg: 'Aucune vente en attente'
                    }
                }]
        });
        me.callParent(arguments);
        /* Chargement moderne : barre fine en haut du tableau au lieu du masque. */
        vente.on('beforeload', function () {
            var g = me.down('gridpanel');
            if (g && g.rendered) {
                g.addCls('theme-chargement');
            }
        });
        vente.on('load', function () {
            var g = me.down('gridpanel');
            if (g && g.rendered) {
                g.removeCls('theme-chargement');
            }
        });
    }
});
