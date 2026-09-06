/* global Ext */



var url_services_pdf_bonlivraison = '../webservices/commandemanagement/bonlivraison/ws_generate_pdf.jsp';

var Me;
var val;
var str_REF_ORDER = "";
var str_REF_LIVRAISON = "";
var selectedBLs = [];
var selectedBL;
var lg_BON_LIVRAISON_ID;
var int_MHT;
var btnUpdate = false;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
/* Reperage visuel de la ligne, demande par la caisse : le numero de BL en vert, les montants en
 * bleu, le grossiste en gras. Sur une grille de dix colonnes chiffrees, l'oeil trouve ainsi tout
 * de suite le bon et ses montants. */
function refBlFormat(val) {
    return '<span style="color:#1B7F3B;font-weight:bold;">' + Ext.util.Format.htmlEncode(val || '') + '</span>';
}
function montantFormat(val) {
    return '<span style="color:#0B57D0;">' + amountformat(val) + '</span>';
}

/* Criteres de l'ecran, lus au meme endroit par la recherche, l'impression et l'export : trois
   lectures separees finissaient par diverger. */
function criteresControleAchat() {
    var lu = function (id) {
        var c = Ext.getCmp(id);
        var v = c ? c.getValue() : null;
        return (v === null || v === undefined) ? '' : v;
    };
    return {
        search: lu('rechecher'),
        grossisteId: lu('lg_GROSSISTE_ID'),
        dtStart: Ext.getCmp('datedebut') ? Ext.getCmp('datedebut').getSubmitValue() : '',
        dtEnd: Ext.getCmp('datefin') ? Ext.getCmp('datefin').getSubmitValue() : '',
        dateType: lu('dateType'),
        statutControle: lu('filtreStatutControle'),
        ecart: lu('filtreEcartControle')
    };
}

Ext.define('testextjs.view.commandemanagement.etats.EtatControleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'etatscontrolemanager',
    id: 'etatscontrolemanagerID',
    frame: true,
    requires: ['testextjs.view.commandemanagement.cmde_passees.action.edit'],

    title: 'Etat de controle des achats',
//    btnUpdate: false,
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {items}</p>')
        }],

    initComponent: function () {


        let store_grossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });
        Me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/is-authorized',
            params: {
                action: 'P_BTN_UPDATEBL'
            },
            success: function (response)
            {
                const object = Ext.JSON.decode(response.responseText, false);
                btnUpdate = object.data;

            },
            failure: function (response)
            {
                console.log("Bug   AIE ");
            }
        });




        const itemsPerPage = 20;
        const store_etats = new Ext.data.Store({

            idProperty: 'id',
            fields: [
                {
                    name: 'lgBONLIVRAISONID',
                    type: 'string'
                },
                {
                    name: 'strREFLIVRAISON',
                    type: 'string'
                },
                {
                    name: 'dtDATELIVRAISON',
                    type: 'string'
                },
                {
                    name: 'strSTATUT',
                    type: 'string'
                },
                {
                    name: 'dtCREATED',
                    type: 'string'
                },
                {
                    name: 'dtUPDATED',
                    type: 'string'
                },
                {
                    name: 'strSTATUTFACTURE',
                    type: 'string'
                },
                {
                    name: 'user',
                    type: 'auto'
                },
                {
                    name: 'orderId',
                    type: 'string'
                },
                {
                    name: 'orderRef',
                    type: 'string'
                },
                {
                    name: 'items',
                    type: 'string'
                },
                {
                    name: 'fournisseurId',
                    type: 'string'
                },
                {
                    name: 'fournisseur',
                    type: 'auto'
                },
                {
                    name: 'intMONTANTRESTANT',
                    type: 'number'
                },
                {
                    name: 'intMONTANTREGLE',
                    type: 'number'
                },
                {
                    name: 'intHTTC',
                    type: 'number'
                },
                {
                    name: 'intTVA',
                    type: 'number'
                },
                {
                    name: 'intMHT',
                    type: 'number'
                },
                {
                    name: 'returnFullBl',
                    type: 'boolean'
                },
                {
                    name: 'montantAvoir',
                    type: 'number'
                },
                {
                    name: 'bl_SELECTED',
                    type: 'boolean'
                },
                {
                    name: 'dateLivraison',
                    type: 'date'
                },
                {
                    name: 'checked',
                    type: 'string'
                },
                {
                    name: 'bonLivraisonDetails',
                    type: 'auto'
                }

            ],
            pageSize: itemsPerPage,
            autoLoad: false,
            groupField: 'fournisseurId',
            proxy: {
                type: 'ajax',
                url: '../api/v1/etat-control-bon/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store_etats,
            id: 'gridID',
            columns: [
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    sortable: true
                },
                {
                    header: 'GROSSISTE',
                    tpl: '<b>{fournisseur.fournisseurLibelle}</b>',
                    xtype: 'templatecolumn',
                    flex: 1.5
                },
                {
                    header: 'REF BL',
                    dataIndex: 'strREFLIVRAISON',
                    renderer: refBlFormat,
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Montant HT',
                    dataIndex: 'intMHT',
                    renderer: montantFormat,
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Montant TVA',
                    dataIndex: 'intTVA',
                    renderer: montantFormat,
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Montant TTC',
                    dataIndex: 'intHTTC',
                    renderer: montantFormat,
                    align: 'right',
                    flex: 1
                },

                {
                    header: 'DATE LIVR',
                    dataIndex: 'dtDATELIVRAISON',
                    flex: 1
                },
                {
                    header: 'DATE ENTREE',
                    dataIndex: 'dtCREATED',
                    flex: 1
                },

                {
                    header: 'MTN AVOIR',
                    dataIndex: 'montantAvoir',
                    renderer: montantFormat,
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Operateur',
                    tpl: '{user.fullName}',
                    xtype: 'templatecolumn',
                    flex: 1.5
                },
                {
                    header: 'CONTROLE',
                    dataIndex: 'checked',
                    width: 100,
                    align: 'center',
                    sortable: true,
                    renderer: this.controleStatutRenderer
                },
                {
                    xtype: 'actioncolumn',
                    header: 'DETAIL',
                    width: 45,
                    align: 'center',
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/application_view_list.png',
                            tooltip: 'Voir le detail du controle (quantites controlees saisies)',
                            scope: this,
                            handler: this.onDetailControleClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    header: 'INVENT.',
                    width: 55,
                    align: 'center',
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/table_refresh.png',
                            tooltip: 'Créer un inventaire des produits de ce bon de livraison',
                            scope: this,
                            handler: this.onInventaireDuBon
                        }]
                },
                {
                    text: '',
                    width: 30,
                    dataIndex: 'bl_SELECTED',
                    xtype: 'checkcolumn',
                    listeners: {
                        checkChange: this.onCheckChange
                    }

                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'RETOUR COMPLET DU BL',
                            scope: this,
                            getClass: function (value, metadata, record) {
                                if (record.get('returnFullBl')) {
                                    return 'x-display-hide';
                                }

                                return 'x-hide-display';
                            },

                            handler: this.retourCompletBL
                        }]
                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier les informations du bon de livraison',
                            scope: this,
                            getClass: function (value, metadata, record) {
                                if (btnUpdate) {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            },

                            handler: this.updateInfoBonlivraison
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/excel_csv.png',
                            tooltip: 'Generer le fichier CSV pour les etiquettes',
                            scope: this,
                            handler: this.onbtnexport
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Edition des entrees de reapprovisionnement',
                            scope: this,
                            handler: this.onPdfDetailClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/paste_plain.png',
                            tooltip: 'Reediter les etiquettes de cette entree en stock',
                            scope: this,
                            handler: this.onPdfEtiquetteClick
                        }]
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'combobox',
                    id: 'dateType',
                    name: 'dateType',
                    editable: false,
                    queryMode: 'local',
                    value: 'LIVRAISON',
                    valueField: 'value',
                    displayField: 'label',
                    flex: 0.9,
                    emptyText: 'Filtrer par...',
                    store: Ext.create('Ext.data.Store', {
                        fields: ['value', 'label'],
                        data: [
                            {value: 'LIVRAISON', label: 'Date du BL'},
                            {value: 'ENTREE', label: "Date d'entrée"}
                        ]
                    }),
                    listeners: {
                        select: function () {
                            Me.onRechClick();
                        }
                    }
                },
                {
                    xtype: 'combobox',
                    name: 'lg_GROSSISTE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_GROSSISTE_ID',
                    store: store_grossiste,
                    //disabled: true,
                    valueField: 'lg_GROSSISTE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    pageSize: 999,
                    emptyText: 'Sectionner grossiste...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }

                },
                {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    value: new Date(),
                    flex: 0.7,
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            Ext.getCmp('datefin').setMinValue(me.getValue());
                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    flex: 0.7,
                    value: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            Ext.getCmp('datedebut').setMaxValue(me.getValue());
                        }
                    }
                }, '-',
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'rechecher',
                    emptyText: 'Rechercher un BL ou une commande',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();
                                }
                            });
                        }
                    }
                },
                /* Point 17 : filtre sur le statut du controle et sur la presence d'ecarts. Ni
                 * l'un ni l'autre n'est stocke en base - le statut est calcule a partir des
                 * lignes du bon, l'ecart se lit en comparant le comptage a la quantite recue -,
                 * le tri se fait donc cote serveur sur la liste complete. « Tous » ne filtre
                 * rien : l'ecran s'ouvre comme avant. */
                {
                    xtype: 'combo',
                    id: 'filtreStatutControle',
                    width: 140,
                    editable: false,
                    queryMode: 'local',
                    value: 'TOUS',
                    valueField: 'code',
                    displayField: 'libelle',
                    store: Ext.create('Ext.data.Store', {
                        fields: ['code', 'libelle'],
                        data: [
                            {code: 'TOUS', libelle: 'Contrôle : tous'},
                            {code: 'CONTROLE', libelle: 'Contrôlés'},
                            {code: 'NON_CONTROLE', libelle: 'Non contrôlés'}
                        ]
                    }),
                    listeners: {
                        select: function () {
                            Me.onRechClick();
                        }
                    }
                },
                {
                    xtype: 'combo',
                    id: 'filtreEcartControle',
                    width: 130,
                    editable: false,
                    queryMode: 'local',
                    value: 'TOUS',
                    valueField: 'code',
                    displayField: 'libelle',
                    store: Ext.create('Ext.data.Store', {
                        fields: ['code', 'libelle'],
                        data: [
                            {code: 'TOUS', libelle: 'Écarts : tous'},
                            {code: 'AVEC_ECART', libelle: 'Avec écarts'},
                            {code: 'SANS_ECART', libelle: 'Sans écart'}
                        ]
                    }),
                    listeners: {
                        select: function () {
                            Me.onRechClick();
                        }
                    }
                },
                {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }, '-',
                {
                    text: 'Imprimer',
                    tooltip: 'Imprimer',
                    iconCls: 'printable',
                    scope: this,
                    handler: this.onPrintClick
                }, '-',
                {
                    text: 'Exporter en excel',
                    tooltip: 'Exporter en excel',
                    icon: 'resources/images/icons/fam/excel_icon.png',
                    scope: this,
                    handler: this.onExportToExcel
                }, '-',

                {
                    text: 'INVENTAIRE DE LA SELECTION',
                    tooltip: 'Créer un inventaire des produits contenus dans les bons cochés',
                    icon: 'resources/images/icons/fam/table_refresh.png',
                    scope: this,
                    handler: this.onInventaireDeLaSelection
                }, '-',
                /*
                 * Ces deux boutons etaient caches en dur depuis l'origine. Ils ont ete affiches le temps de la
                 * recette, et sont remis en retrait sur demande, en attendant l'arbitrage :
                 *
                 * - REGLER UNE SELECTION DE BL fonctionne desormais : il postait vers ws_transaction2.jsp, page
                 *   qui n'a jamais existe dans le projet, et passe par un service REST depuis la reprise. Il est
                 *   pret a etre reaffiche, il suffit de retirer le hidden.
                 * - GESTION DES QUINZAINES reste inoperant : les pages qui le servent appellent des classes
                 *   com.asc.prestige2.business.bonlivraisons absentes du projet, en source comme en bibliotheque,
                 *   et rendent HTTP 500. Ne le reafficher qu'une fois ces pages reprises.
                 */
                {
                    text: 'GESTION DES QUINZAINES',
                    hidden: true,
                    scope: this,
                    handler: this.onGestionQuinzaine
                }, '-',
                {
                    text: 'REGLER UNE SELECTION DE BL',
                    hidden: true,
                    scope: this,
                    handler: this.onReglerSelectionBL
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store_etats,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(), // same store GridPanel is using
                listeners: {
                    beforechange: function (page, currentPage) {
                        let myProxy = this.store.getProxy();
                        myProxy.params = {
                            dtEnd: null,
                            dtStart: null,
                            search: '',
                            grossisteId: ''
                        };
                        let lg_GROSSISTE_ID = "";
                        if (Ext.getCmp('lg_GROSSISTE_ID').getValue()) {
                            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                        }
                        myProxy.setExtraParam('dtStart', Ext.getCmp('datedebut').getSubmitValue());
                        myProxy.setExtraParam('dtEnd', Ext.getCmp('datefin').getSubmitValue());
                        myProxy.setExtraParam('search', Ext.getCmp('rechecher').getValue());
                        myProxy.setExtraParam('grossisteId', lg_GROSSISTE_ID);
                        myProxy.setExtraParam('dateType', Ext.getCmp('dateType').getValue());
                    }

                }
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

    },
    loadStore: function () {
        Me.onRechClick();

    },
    onStoreLoad: function () {


    },
    controleStatutRenderer: function (value) {
        var map = {
            'TERMINE': {libelle: 'Termin&eacute;', color: '#2e7d32', bg: '#c8e6c9'},
            'EN_COURS': {libelle: 'En cours', color: '#ef6c00', bg: '#ffe0b2'},
            'NON_TRAITE': {libelle: '&Agrave; faire', color: '#c62828', bg: '#ffcdd2'}
        };
        var s = map[value] || map['NON_TRAITE'];
        return '<span style="display:inline-block;padding:1px 8px;border-radius:10px;'
                + 'color:' + s.color + ';background:' + s.bg + ';font-weight:bold;">'
                + s.libelle + '</span>';
    },
    onDetailControleClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var details = rec.get('bonLivraisonDetails') || [];

        var rows = Ext.Array.map(details, function (d) {
            var produit = d.produit || {};
            var comptage = d.quantiteControle || 0;
            var stock = d.intINITSTOCK || 0;
            return {
                cip: produit.intCIP,
                designation: produit.strDESCRIPTION,
                prixAchat: d.intPAF,
                prixVente: d.intPRIXVENTE,
                stock: stock,
                comptage: comptage,
                ecart: comptage - stock,
                checked: d.checked === true
            };
        });

        var detailStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'cip', type: 'string'},
                {name: 'designation', type: 'string'},
                {name: 'prixAchat', type: 'number'},
                {name: 'prixVente', type: 'number'},
                {name: 'stock', type: 'number'},
                {name: 'comptage', type: 'number'},
                {name: 'ecart', type: 'number'},
                {name: 'checked', type: 'boolean'}
            ],
            data: rows
        });

        var fournisseur = rec.get('fournisseur') || {};
        var grossisteName = fournisseur.fournisseurLibelle || rec.get('fournisseurLibelle') || '';

        Ext.create('Ext.window.Window', {
            autoShow: true,
            modal: true,
            width: '90%',
            height: 480,
            maximizable: true,
            title: 'DETAILS : ' + (grossisteName ? grossisteName + ' - ' : '') + 'BL N&deg;' + rec.get('strREFLIVRAISON'),
            layout: 'fit',
            items: [{
                    xtype: 'grid',
                    border: false,
                    store: detailStore,
                    columns: [
                        {xtype: 'rownumberer', width: 40},
                        {header: 'CIP', dataIndex: 'cip', width: 90},
                        {header: 'D&eacute;signation', dataIndex: 'designation', flex: 3, minWidth: 320},
                        {header: 'Prix achat', dataIndex: 'prixAchat', renderer: amountformat, align: 'right', flex: 1},
                        {header: 'Prix vente', dataIndex: 'prixVente', renderer: amountformat, align: 'right', flex: 1},
                        {header: 'Stock', dataIndex: 'stock', align: 'right', flex: 0.7},
                        {header: 'Comptage', dataIndex: 'comptage', align: 'right', flex: 0.7},
                        {
                            header: '&Eacute;cart',
                            dataIndex: 'ecart',
                            align: 'right',
                            flex: 0.7,
                            renderer: function (v) {
                                var color = v === 0 ? '#000' : (v > 0 ? '#2e7d32' : '#c62828');
                                return '<span style="color:' + color + ';font-weight:bold;">' + v + '</span>';
                            }
                        },
                        {
                            header: 'Contr&ocirc;l&eacute;',
                            dataIndex: 'checked',
                            width: 80,
                            align: 'center',
                            renderer: function (v) {
                                var color = v ? '#2e7d32' : '#bdbdbd';
                                var tip = v ? 'Produit contr&ocirc;l&eacute;' : 'Non contr&ocirc;l&eacute;';
                                return '<span title="' + tip + '" style="display:inline-block;width:12px;height:12px;'
                                        + 'border-radius:50%;background:' + color + ';"></span>';
                            }
                        }
                    ]
                }]
        });
    },
    onbtnexport: function (grid, rowIndex) {

        Ext.MessageBox.confirm('Message',
                'Voulez-vous generer le fichier CSV pour les etiquettes de cette commande?',
                function (btn) {
                    if (btn === 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        window.location = '../DownloadFileServlet?lg_ORDER_ID=' + rec.get('lgBONLIVRAISONID') + '&str_TYPE_ACTION=ETATCONTROLE';
                    }
                });
    },
    onPdfDetailClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        let linkUrl = url_services_pdf_bonlivraison + '?lg_BON_LIVRAISON_ID=' + rec.get('strREFLIVRAISON');
        window.open(linkUrl);

    },
    onPdfEtiquetteClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.etiquette.action.add({
            odatasource: rec.get('lgBONLIVRAISONID'),
            parentview: this,
            mode: "printer",
            titre: "Edition d'etiquette des produits du bon de livraison [" + rec.get('strREFLIVRAISON') + "]"
        });

    },
    /* Point 17 : l'impression reprend les criteres de l'ecran - filtres de statut et d'ecarts
       compris -, les rappelle en tete de l'etat et regroupe les bons par grossiste avec un
       sous-total par grossiste et un total general. */
    onPrintClick: function () {
        const attente = Ext.MessageBox.wait('Génération du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/etat-control-bon/print',
            params: criteresControleAchat(),
            success: function (reponse) {
                attente.hide();
                const res = Ext.JSON.decode(reponse.responseText, true) || {};
                if (res.success && res.msg) {
                    window.open('..' + res.msg, '_blank');
                } else {
                    Ext.Msg.alert('Message', res.msg || 'Impossible de générer le PDF');
                }
            },
            failure: function () {
                attente.hide();
                Ext.Msg.alert('Message', 'Un problème avec le serveur');
            }
        });
    },

    onExportToExcel: function () {
        const valeur = Ext.getCmp('rechecher').getValue();
        let lg_GROSSISTE_ID = "";
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }
        const dtEnd = Ext.getCmp('datefin').getSubmitValue();
        const dtStart = Ext.getCmp('datedebut').getSubmitValue();

        window.location = '../api/v1/etat-control-bon/export-excel?dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&grossisteId=' + lg_GROSSISTE_ID + '&search=' + valeur + '&fileType=excel'
                + '&dateType=' + Ext.getCmp('dateType').getValue();
      

    },

    onRechClick: function () {
        let lg_GROSSISTE_ID = "";
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() != null) {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }

        if (new Date(Ext.getCmp('datedebut').getSubmitValue()) > new Date(Ext.getCmp('datefin').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        this.getStore().load({params: criteresControleAchat()});
    },

    onGestionQuinzaine: function () {
        const xtype = "quinzaineManager";
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion des quinzaines", "0");
    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {
        let store = Ext.getCmp('gridID').getStore(), rec = store.getAt(rowIndex);
        if (checked) {
            selectedBL = rec;
            selectedBLs.push(rec);
        } else {
            if (selectedBLs.indexOf(rec) !== -1) {
                selectedBLs.splice(selectedBLs.indexOf(rec), 1);
            }
            // selectedBL doit rester un ENREGISTREMENT du store : il est encore lu par
            // onReglerSelectionBL (titre de la fenetre) et par paybls.js, qui appellent .get() dessus.
            // Il portait auparavant un objet nu {}, sans methode get : tout decochage levait alors
            // "selectedBL.get is not a function" des la ligne suivante, ce qui empechait aussi
            // rec.commit() de s'executer. On reprend le dernier bon encore coche, ou null s'il n'en
            // reste aucun (ce cas est deja ecarte par le test selectedBLs.length === 0 du reglement).
            selectedBL = selectedBLs.length ? selectedBLs[selectedBLs.length - 1] : null;
        }

        lg_BON_LIVRAISON_ID = selectedBL ? selectedBL.get('lgBONLIVRAISONID') : null;
        int_MHT = selectedBL ? selectedBL.get('intMHT') : null;

        rec.commit();
    },
    /**
     * Inventaire des produits d'UN bon de livraison, depuis l'icone de la ligne.
     *
     * Enchainement naturel du controle des achats : on vient de recevoir une livraison, on veut recompter
     * ce qu'elle contenait.
     */
    onInventaireDuBon: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        if (!rec) {
            return;
        }
        Me.creerInventaire([rec.get('lgBONLIVRAISONID')],
                'Créer un inventaire des produits du bon ' + (rec.get('strREFLIVRAISON') || '') + ' ?');
    },

    /**
     * Inventaire des produits de TOUS les bons coches, depuis le bouton du haut. Reutilise la case a cocher
     * qui existe deja sur chaque ligne.
     */
    onInventaireDeLaSelection: function () {
        if (selectedBLs.length === 0) {
            Ext.MessageBox.alert('Inventaire', 'Aucun bon de livraison sélectionné.');
            return;
        }
        var ids = Ext.Array.map(selectedBLs, function (r) {
            return r.get('lgBONLIVRAISONID');
        });
        Me.creerInventaire(ids, 'Créer un inventaire des produits contenus dans les '
                + ids.length + ' bons sélectionnés ?');
    },

    /**
     * Demande de creation d'un inventaire au serveur.
     *
     * Seuls les identifiants des BONS partent : un bon peut porter des centaines de lignes, c'est au serveur
     * d'en tirer la liste des produits, sans doublon entre deux bons.
     */
    creerInventaire: function (bonIds, question) {
        Ext.MessageBox.confirm('Confirmation', question, function (btn) {
            if (btn !== 'yes') {
                return;
            }
            var attente = Ext.MessageBox.wait('Création de l\'inventaire . . .', 'Veuillez patienter');
            Ext.Ajax.request({
                method: 'POST',
                url: '../api/v1/etat-control-bon/inventaire',
                headers: {'Content-Type': 'application/json'},
                // 4 minutes : un inventaire sur plusieurs bons touche beaucoup d'articles.
                timeout: 240000,
                params: Ext.JSON.encode(bonIds),
                success: function (response) {
                    attente.hide();
                    var o = Ext.decode(response.responseText, true) || {};
                    if (o.success === false) {
                        Ext.MessageBox.alert('Inventaire', o.msg || 'L\'opération n\'a pas abouti.');
                        return;
                    }
                    if (o.count > 0) {
                        Ext.MessageBox.alert('Inventaire',
                                'Inventaire créé : ' + o.count + ' article(s).<br>' + (o.message || ''));
                    } else {
                        Ext.MessageBox.alert('Inventaire', 'Aucun article à inventorier pour ces bons.');
                    }
                },
                failure: function (response) {
                    attente.hide();
                    Ext.MessageBox.alert('Inventaire',
                            'Erreur lors de la création de l\'inventaire (code ' + response.status + ').');
                }
            });
        });
    },

    onReglerSelectionBL: function () {
        if (selectedBLs.length === 0) {
            Ext.MessageBox.show({
                title: 'Règlement des Bons de Livraison',
                width: 320,
                msg: 'Aucun bon de Livraison sélectionné.',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR
                /* Pas de fn : le rappel d'une boite de message recoit l'IDENTIFIANT du bouton
                 * ('ok'), une simple chaine, et non le composant. Le fn d'origine appelait
                 * btn.up('window').close() et levait donc « btn.up is not a function » a chaque
                 * validation. Le defaut n'avait jamais pu se voir : le bouton qui mene ici etait
                 * cache. La boite se referme d'elle-meme, il n'y a rien a fermer a la main. */
            });

        } else {

            // Filet de securite : selectedBL doit toujours designer l'un des bons encore coches.
            // Une session ouverte avant ce correctif peut encore porter un objet nu, sans methode get.
            if (!selectedBL || typeof selectedBL.get !== 'function' || selectedBLs.indexOf(selectedBL) === -1) {
                selectedBL = selectedBLs[selectedBLs.length - 1];
            }

            /* L'entete nomme ce qu'on regle, pas l'identifiant technique : celui-ci ne dit rien a
             * la caissiere et mangeait toute la barre de titre. Numero de BL et montant suffisent,
             * et le nombre de bons est rappele des qu'il y en a plusieurs. */
            var intitule = 'Règlement de Bons de Livraison — n° '
                    + (selectedBL.get('strREFLIVRAISON') || '') + ' : ' + selectedBL.get('intMHT');
            if (selectedBLs.length > 1) {
                intitule = 'Règlement de ' + selectedBLs.length + ' Bons de Livraison';
            }
            new testextjs.view.commandemanagement.etats.action.paybls({
                selectedBLs: selectedBLs,
                selectedBL: selectedBL,
                titre: intitule
            });
        }

    },
    updateInfoBonlivraison: function (grid, rowIndex) {
        if (!btnUpdate) {
            return;
        }
        let rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.commandemanagement.cmde_passees.action.edit({
            gridToLoad: 'etatscontrolemanagerID',
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Mise &agrave; jour des informations du Bon de livraison N&deg;" + rec.get('strREFLIVRAISON')
        });
    },
    retourCompletBL: function (view, rowIndex, colIndex, item, e, record, row) {
        let storetypemotif = new Ext.data.Store({
            idProperty: 'lgMOTIFRETOUR',
            fields: [
                {name: 'lgMOTIFRETOUR',
                    type: 'string'

                },
                {name: 'strLIBELLE',
                    type: 'string'

                }
            ],
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/motifs-retour',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });



        const win = Ext.create('Ext.window.Window',
                {
                    extend: 'Ext.window.Window',
                    autoShow: true,
                    height: 220,
                    width: '55%',
                    modal: true,
                    title: 'RETOUR COMPLET DE BON DE LIVRAISON',
                    closeAction: 'hide',
                    closable: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'form',
                            bodyPadding: 5,
                            modelValidation: true,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    layout: {
                                        type: 'hbox',
                                        align: 'stretch'
                                    },
                                    title: 'Information sur le bl',
                                    items: [
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Numéro BL',
                                            value: record.get('strREFLIVRAISON'),
                                            labelWidth: 70,
                                            margin: '0 10 0 0',

                                            fieldStyle: "color:green;font-weight: bold;font-size: 1.2em"
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'MONATNT TTC',
                                            value: record.get('intHTTC'),
                                            margin: '0 10 0 0',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.2em"
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'MONATNT HT',
                                            margin: '0 10 0 0',
                                            value: record.get('intMHT'),
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.2em"
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'MONATNT TVA',
                                            value: record.get('intTVA'),
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.2em"
                                        }

                                    ]

                                },

                                {
                                    xtype: 'fieldset',
                                    title: 'MOTIF DU RETOUR',
                                    layout: 'form',
                                    defaults: {
                                        anchor: '100%',
                                        xtype: 'textfield',
                                        msgTarget: 'side',
                                        labelAlign: 'right',
                                        labelWidth: 115
                                    },
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Motif',
                                            name: 'lgMOTIFRETOUR',
                                            store: storetypemotif,
                                            valueField: 'lgMOTIFRETOUR',
                                            displayField: 'strLIBELLE',
                                            typeAhead: true,
                                            pageSize: 20,
                                            queryMode: 'remote',
                                            flex: 1,
                                            emptyText: 'Choisir un Motif...',
                                            allowBlank: false

                                        }



                                    ]
                                }

                            ],
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    ui: 'footer',
                                    layout: {
                                        pack: 'end',
                                        type: 'hbox'
                                    },
                                    items: [
                                        {
                                            xtype: 'button',
                                            text: 'Enregistrer',
                                            handler: function (btn) {
                                                const formulaire = btn.up('form');
                                                if (formulaire.isValid()) {
                                                    let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                                    Ext.Ajax.request({
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json'},
                                                        url: '../api/v1/retourfournisseur/full-bl/' + record.get('lgBONLIVRAISONID'),
                                                        params: Ext.JSON.encode(formulaire.getValues()),
                                                        success: function (response, options) {
                                                            progress.hide();
                                                            const result = Ext.JSON.decode(response.responseText, true);
                                                            if (result.success) {
                                                                win.destroy();
                                                                Me.onRechClick();
                                                            } else {
                                                                Ext.MessageBox.show({
                                                                    title: 'Message d\'erreur',
                                                                    width: 320,
                                                                    msg: result.msg,
                                                                    buttons: Ext.MessageBox.OK,
                                                                    icon: Ext.MessageBox.ERROR

                                                                });
                                                            }

                                                        },
                                                        failure: function (response, options) {
                                                            progress.hide();
                                                            Ext.Msg.alert("Message", 'Erreur du système ' + response.status);
                                                        }

                                                    });
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'button',
                                            text: 'Annuler',
                                            handler: function (btn) {
                                                win.destroy();
                                            }

                                        }
                                    ]
                                }
                            ]
                        }
                    ]

                });
    }

});