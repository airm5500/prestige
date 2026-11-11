/* global Ext */

Ext.define('testextjs.view.reglement.Differe', {
    extend: 'Ext.tab.Panel',
    xtype: 'delayed',
    requires: [
        'testextjs.model.caisse.ClientLambda'
    ],
    frame: true,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    fullscreen: true,
    // border:1,
//    cls: 'custompanel',
    tabPosition: "top",
    initComponent: function () {
        var liste = new Ext.data.Store({
            fields: [
                {
                    name: 'etat',
                    type: 'string'
                }, {
                    name: 'clientId',
                    type: 'string'
                },
                {
                    name: 'clientFullName',
                    type: 'string'
                },
                {
                    name: 'reference',
                    type: 'string'
                },

                {
                    name: 'heure',
                    type: 'string'
                },
                {
                    name: 'dateOp',
                    type: 'string'
                },
                {
                    name: 'montantAttendu',
                    type: 'number'
                },
                {
                    name: 'montantRegle',
                    type: 'number'
                },
                {
                    name: 'totalAmount',
                    type: 'number'
                },
                {
                    name: 'montantRestant',
                    type: 'number'
                }

            ],
            pageSize: 999,
            autoLoad: false,
            groupField: 'clientFullName',
            proxy: {
                type: 'ajax',
                url: '../api/v1/reglement/liste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });
        var diffreglement = new Ext.data.Store({
            fields: [
                {
                    name: 'clientId',
                    type: 'string'
                },
                {
                    name: 'clientFullName',
                    type: 'string'
                },
                {
                    name: 'libelleRegl',
                    type: 'string'
                },
                {
                    name: 'idRegle',
                    type: 'string'
                },
                {
                    name: 'heure',
                    type: 'string'
                },
                {
                    name: 'dateOp',
                    type: 'string'
                },
                {
                    name: 'montantAttendu',
                    type: 'number'
                },
                {
                    name: 'montantRegle',
                    type: 'number'
                },
                {
                    name: 'montantRestant',
                    type: 'number'
                },
                {
                    name: 'solde',
                    type: 'number'
                },
                {
                    name: 'soldeFormated',
                    type: 'string'
                },

                {
                    name: 'userFullName',
                    type: 'string'
                }, {
                    name: 'reference',
                    type: 'string'
                }
            ],
            pageSize: 20,
            autoLoad: false,
            groupField: 'clientFullName',
            proxy: {
                type: 'ajax',
                url: '../api/v1/reglement/delayed',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.ClientLambda',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/delayed',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var diffUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.ClientLambda',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/differes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var me = this;
        Ext.applyIf(me, {
            items: [

                {
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    text: 'Faire un réglement',
                                    itemId: 'doreglement',
                                    iconCls: 'addicon',
                                    scope: this
                                },
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStartre',
                                    margin: '0 10 0 0',
                                    submitFormat: 'Y-m-d',
                                    flex: 1,
                                    labelWidth: 20,
                                    maxValue: new Date(),
                                    value: new Date(),
                                    format: 'd/m/Y'

                                }, {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    itemId: 'dtEndre',
                                    labelWidth: 20,
                                    flex: 1,
                                    maxValue: new Date(),
                                    value: new Date(),
                                    margin: '0 9 0 0',
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y'

                                },

                                {
                                    xtype: 'combobox',
                                    itemId: 'userre',
                                    store: diffUser,
                                    labelWidth: 40,
                                    fieldLabel: 'Clients',
                                    pageSize: null,
                                    valueField: 'lgCLIENTID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 1,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un client'

                                }
                                ,
                                {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    itemId: 'search',
                                    scope: this,
                                    iconCls: 'searchicon'
                                },
                                {
                                    text: 'imprimer',
                                    itemId: 'imprimerre',
                                    iconCls: 'printable',
                                    tooltip: 'imprimer',
                                    scope: this
                                }
                            ]
                        }
                    ],
                    xtype: 'gridpanel',
                    title: 'LISTE DES REGLEMENTS',
                    features: [
                        {
                            ftype: 'groupingsummary',
                            collapsible: true,
                            groupHeaderTpl: "{[values.rows[0].data.clientFullName]}  <span style='color:blue;font-weight:800;padding-left:5rem;'>SOLDE:  <span style='color:blue;font-weight:800;padding-left:10px;'>{[values.rows[0].data.soldeFormated]}</span></span> ",
                            
                            hideGroupedHeader: true,
                            showSummaryRow: true
                        }],
                    border: false,

                    itemId: 'reglementGrid',
                    store: diffreglement,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: '#',
                            dataIndex: 'clientId',
                            flex: 1,
                            hidden: true

                        },

                        {
                            header: 'Mode R&egrave;glement',
                            dataIndex: 'libelleRegl',
                            flex: 1.5, summaryType: "count",
                            summaryRenderer: function (value) {
                                return "<b>Nombre de R&egrave;glements </b><span style='color:blue;font-weight:800;'>" + value + "</span>";

                            }},
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant attendu',
                            format: '0,000.',
                            dataIndex: 'montantAttendu',
                            flex: 1,
                            align: 'right'
                        
                          
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant R&egrave;gl&eacute;',
                            format: '0,000.',
                            dataIndex: 'montantRegle',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " <span style='color:blue;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }

                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant Restant',
                            format: '0,000.',
                            dataIndex: 'montantRestant',
                            fieldStyle: "color:red;",
                            flex: 1,
                            align: 'right'
                         
                        },
                        {
                            header: 'Date',
                            dataIndex: 'dateOp',
                            flex: 1

                        },
                        {
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 1

                        },
                        {
                            header: 'Op&eacute;rateur',
                            dataIndex: 'userFullName',
                            flex: 1

                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            tooltip: 'Faire le reglement',
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir le detail du reglement',
                                    scope: this

                                }
                            ]
                        }

                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: diffreglement,
                        pageSize: 30,
                        dock: 'bottom',
                        displayInfo: true

                    }
                },

                {
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStart',
                                    margin: '0 10 0 0',
                                    submitFormat: 'Y-m-d',
                                    flex: 1,
                                    labelWidth: 20,
                                    maxValue: new Date(),
                                    value: new Date("2015-01-01"),
                                    format: 'd/m/Y'

                                }, {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    itemId: 'dtEnd',
                                    labelWidth: 20,
                                    flex: 1,
                                    maxValue: new Date(),
                                    value: new Date(),
                                    margin: '0 9 0 0',
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y'

                                },
                                {
                                    xtype: 'textfield',
                                    itemId: 'query',
                                    emptyText: 'Recherche',
                                    flex: 1,
                                    enableKeyEvents: true
                                },
                                {
                                    xtype: 'combobox',
                                    itemId: 'user',
                                    store: storeUser,
                                    labelWidth: 40,
                                    fieldLabel: 'Clients',
                                    pageSize: null,
                                    valueField: 'lgCLIENTID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 1,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un client'

                                },
                                /* retours du 07/10 : regle, non regle ou regle partiellement */
                                {
                                    xtype: 'combobox',
                                    itemId: 'etatDiffere',
                                    width: 175,
                                    editable: false,
                                    queryMode: 'local',
                                    valueField: 'v',
                                    displayField: 'l',
                                    value: 'NON_SOLDES',
                                    tooltip: 'Réglé : plus rien à payer. Partiel : une partie déjà payée. Non réglé : rien payé.',
                                    store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [
                                            {v: 'NON_SOLDES', l: 'Non soldés (à payer)'}, {v: 'NON_REGLES', l: 'Non réglés'},
                                            {v: 'PARTIELS', l: 'Réglés partiellement'}, {v: 'REGLES', l: 'Réglés'}, {v: 'TOUS', l: 'Tous'}]})
                                },
                                {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    itemId: 'rechercher',
                                    scope: this,
                                    iconCls: 'searchicon'
                                },
                                {
                                    text: 'imprimer',
                                    itemId: 'imprimer',
                                    iconCls: 'printable',
                                    tooltip: 'imprimer',
                                    scope: this
                                }
                            ]
                        }
                    ],
                    xtype: 'gridpanel',
                    title: 'LISTE DES DIFFERES',
                    features: [
                        {
                            ftype: 'groupingsummary',
                            collapsible: true,
                            groupHeaderTpl: "{[values.rows[0].data.clientFullName]}",
                            hideGroupedHeader: true,
                            showSummaryRow: true
                        }],
                    border: false,

                    itemId: 'liste',
                    store: liste,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Réference',
                            dataIndex: 'reference',
                            flex: 1,
                            summaryType: "count",
                            summaryRenderer: function (value) {
                                return "<b>Nombre de ventes différées:  </b><span style='color:blue;font-weight:800;'>" + value + "</span>";

                            }},

                        {
                            header: 'Client',
                            dataIndex: 'clientFullName',
                            flex: 1.5

                        },
                        {
                            header: 'État',
                            dataIndex: 'etat',
                            width: 105,
                            renderer: function (v) {
                                var e = {NON_REGLE: ['Non réglé', '#c0392b'], PARTIEL: ['Partiel', '#b9770e'], REGLE: ['Réglé', '#1e8449']}[v];
                                return e ? '<b style="color:' + e[1] + '">' + e[0] + '</b>' : '';
                            }
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant total vente',
                            format: '0,000.',
                            dataIndex: 'totalAmount',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " <span style='color:red;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }

                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant Attendu',
                            format: '0,000.',
                            dataIndex: 'montantAttendu',
                            flex: 1,
                            align: 'right'
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Reste à Payer',
                            format: '0,000.',
                            dataIndex: 'montantRegle',
                            fieldStyle: "color:green;",
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " Reste à Payer: <span style='color:green;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }
                        },
                        {
                            header: 'Date',
                            dataIndex: 'dateOp',
                            flex: 1

                        },
                        {
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 1

                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: liste,
                        pageSize: 999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }/*  FIN LISTE*/

            ]

        });
        /* « Liste des différés » passe devant « Liste des règlements » : c'est l'onglet
         * consulté en premier au comptoir. L'ordre est inversé ici, sur le tableau des
         * items, plutôt qu'en deplacant les deux definitions - longues de plusieurs
         * centaines de lignes - ce qui ne changerait rien d'autre que le risque. */
        if (Ext.isArray(me.items) && me.items.length === 2) {
            me.items.reverse();
        }
        me.callParent(arguments);
        /* retours du 07/10 : onglet « Solde » (releve date et heure, debit, credit, solde, solde de fin de mois) */
        me.add(me.ongletSolde());
        /* besoins du 11/10 (3) : correction du nom du client d'un differe, dans la page (pas de fenetre) */
        var liste = me.down('#liste');
        if (liste) {
            liste.addDocked(me.bandeauCorrection());
            liste.on('itemclick', function (v, rec) {
                me.choisirClientCorrection(rec.get('clientId'));
            });
        }
    },

    bandeauCorrection: function () {
        var me = this, entree = {
            specialkey: function (f, e) {
                if (e.getKey() === e.ENTER) {
                    me.corrigerClient();
                }
            }
        };
        var bandeau = {
            xtype: 'toolbar', dock: 'bottom', itemId: 'corrigerClient', cls: 'differe-corr',
            items: [
                {xtype: 'tbtext', text: '<b>Corriger le client</b> (ligne choisie) :'},
                {xtype: 'textfield', itemId: 'corrNom', cls: 'differe-corr-nom', fieldLabel: 'Nom', labelWidth: 35, width: 230,
                    maxLength: 50, enforceMaxLength: true, disabled: true, fieldStyle: 'text-transform:uppercase', listeners: entree},
                {xtype: 'textfield', itemId: 'corrPrenoms', cls: 'differe-corr-prenoms', fieldLabel: 'Prénoms', labelWidth: 60,
                    width: 280, maxLength: 50, enforceMaxLength: true, disabled: true, fieldStyle: 'text-transform:uppercase',
                    listeners: entree},
                {xtype: 'button', itemId: 'corrValider', text: 'Corriger', iconCls: 'icon-save', disabled: true,
                    tooltip: 'Corrige le nom sur la fiche du client et sur ses ventes qui portent l\'ancien nom (Entrée)',
                    handler: function () {
                        me.corrigerClient();
                    }},
                {xtype: 'tbtext', itemId: 'corrMessage', text: ''}
            ],
            listeners: {
                afterrender: function (b) {
                    Ext.Ajax.request({
                        method: 'GET', url: '../api/v1/vente-client-standard/droit',
                        success: function (r) {
                            var o = Ext.decode(r.responseText, true) || {};
                            if (!b.isDestroyed) {
                                b.setVisible(o.modifier === true);
                            }
                        },
                        failure: function () {
                            if (!b.isDestroyed) {
                                b.hide();
                            }
                        }
                    });
                }
            }
        };
        return bandeau;
    },

    messageCorrection: function (texte, erreur) {
        var m = this.down('#corrigerClient #corrMessage');
        if (m) {
            m.update(texte ? '<span style="color:' + (erreur ? '#c0392b' : '#1e8449') + ';font-weight:bold">'
                    + Ext.String.htmlEncode(texte) + '</span>' : '');
        }
    },

    choisirClientCorrection: function (clientId) {
        var me = this, b = me.down('#corrigerClient');
        if (!b || !b.isVisible() || !clientId) {
            return;
        }
        me.clientCorrection = null;
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/differe-client/' + encodeURIComponent(clientId),
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {}, actif = o.success === true && o.client;
                if (b.isDestroyed) {
                    return;
                }
                me.clientCorrection = actif ? o.client.id : null;
                b.down('#corrNom').setValue(actif ? o.client.nom : '');
                b.down('#corrPrenoms').setValue(actif ? o.client.prenoms : '');
                Ext.each(['#corrNom', '#corrPrenoms', '#corrValider'], function (s) {
                    b.down(s).setDisabled(!actif);
                });
                me.messageCorrection(actif ? '' : (o.message || 'Client indisponible.'), !actif);
            }
        });
    },

    corrigerClient: function () {
        var me = this, b = me.down('#corrigerClient');
        if (!b || !me.clientCorrection || b.down('#corrValider').isDisabled()) {
            return;
        }
        b.down('#corrValider').disable();
        Ext.Ajax.request({
            method: 'POST', url: '../api/v1/differe-client/' + encodeURIComponent(me.clientCorrection),
            headers: {'Content-Type': 'application/json'},
            jsonData: {nom: b.down('#corrNom').getValue(), prenoms: b.down('#corrPrenoms').getValue()},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (b.isDestroyed) {
                    return;
                }
                b.down('#corrValider').enable();
                if (o.success === true) {
                    b.down('#corrNom').setValue(o.client.nom);
                    b.down('#corrPrenoms').setValue(o.client.prenoms);
                    me.messageCorrection(o.message, false);
                    me.down('#liste').getStore().reload();
                } else {
                    me.messageCorrection(o.message || 'Le nom n\'a pas pu être corrigé.', true);
                }
            },
            failure: function (r) {
                if (!b.isDestroyed) {
                    b.down('#corrValider').enable();
                    me.messageCorrection('Le serveur ne répond pas (' + r.status + ').', true);
                }
            }
        });
    },

    /* Retours du 09/10 (1) : releve de l'onglet Solde en PDF ou Excel (API v1/reglement/releve/pdf|excel) ; plan du
       10/11, point 4 : groupe par client, memes criteres que l'ecran */
    editerSolde: function (format) {
        var me = this, du = me.down('#soldeDu'), au = me.down('#soldeAu'), c = me.down('#soldeClient');
        if (!du.isValid() || !au.isValid()) {
            return;
        }
        if (du.getValue() && au.getValue() && du.getValue() > au.getValue()) {
            me.down('#soldeMessage').update('<span style="color:#c0392b">La date de début est après la date de fin.</span>');
            return;
        }
        window.open('../api/v1/reglement/releve/' + format + '?' + Ext.Object.toQueryString({
            dtStart: du.getSubmitValue() || '', dtEnd: au.getSubmitValue() || '', clientId: c.getValue() || '',
            clientNom: c.getValue() ? c.getRawValue() : ''
        }));
    },

    /**
     * Plan du 10/11, point 4 : onglet « Solde ».
     * - rien n'est affiche a l'ouverture : la periode (du 01/01/2015 a ce jour, comme l'onglet des differes) et le
     *   client se choisissent, puis « Rechercher » ;
     * - le releve est groupe par client : une ligne par client (solde au debut, debit, credit, solde a la fin), puis
     *   ses operations avec son solde apres chacune, et ses soldes de fin de mois ;
     * - volet de droite : clic sur une vente (ou son annulation), ses produits ; clic sur un reglement, son detail ;
     *   clic sur un client, son resume ;
     * - debits en rouge, credits en vert ; releve et volet se partagent la largeur (3/5 et 2/5).
     */
    ongletSolde: function () {
        var me = this, enc = Ext.String.htmlEncode, f = function (v) {
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        };
        var ROUGE = '#c62828', VERT = '#2e7d32';
        if (!Ext.get('differe-solde-style')) {
            Ext.util.CSS.createStyleSheet('.differe-ligne-client .x-grid-cell{background:#dce6f1 !important;font-weight:bold}'
                    + '.differe-ligne-client .x-grid-cell-inner{padding-top:5px;padding-bottom:5px}'
                    + '.sd-vide{color:#7f8c8d;padding:18px 14px;line-height:1.6}'
                    + '.sd{padding:10px 12px;font-size:12px}.sd-titre{font-size:14px;font-weight:bold;margin-bottom:6px;color:#1e3a5f}'
                    + '.sd-infos{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin-bottom:10px}.sd-infos span:nth-child(odd){color:#65758a}'
                    + '.sd table{width:100%;border-collapse:collapse}.sd th{background:#eef2f7;text-align:left;padding:4px 6px;font-weight:bold}'
                    + '.sd td{padding:4px 6px;border-bottom:1px solid #e3e8ef}.sd .n{text-align:right;white-space:nowrap}'
                    + '.sd tr.sd-total td{font-weight:bold;border-top:2px solid #1e3a5f;border-bottom:0}', 'differe-solde-style');
        }
        var store = Ext.create('Ext.data.Store', {
            fields: ['type', 'piece', 'clientId', 'date', 'libelle', 'reference', 'client', {name: 'soldeDebut', type: 'int'},
                {name: 'debit', type: 'int'}, {name: 'credit', type: 'int'}, {name: 'solde', type: 'int'}],
            proxy: {type: 'ajax', url: '../api/v1/reglement/releve', reader: {type: 'json', root: 'data'}}
        });
        var clients = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.ClientLambda', pageSize: 100,
            proxy: {type: 'ajax', url: '../api/v1/client/differes', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var detail = function (html) {
            var d = me.down('#soldeDetail');
            if (d) {
                d.update(html);
            }
        };
        var invite = '<div class="sd-vide">Cliquez sur une vente pour voir ses produits, sur un règlement pour voir son détail, '
                + 'sur un client pour voir son résumé.</div>';
        var charger = function () {
            var du = me.down('#soldeDu'), au = me.down('#soldeAu');
            if (!du.isValid() || !au.isValid()) {
                return;
            }
            if (du.getValue() && au.getValue() && du.getValue() > au.getValue()) {
                me.down('#soldeMessage').update('<span style="color:#c0392b">La date de début est après la date de fin.</span>');
                return;
            }
            me.down('#soldeMessage').update('');
            me.soldeCharge = true;
            detail(invite);
            store.load({params: {dtStart: du.getSubmitValue(), dtEnd: au.getSubmitValue(),
                    clientId: me.down('#soldeClient').getValue() || ''}});
        };
        store.on('load', function (s) {
            var o = s.getProxy().getReader().rawData || {}, g = me.down('#grilleSolde');
            g.getView().emptyText = '<div class="x-grid-empty">Aucune vente différée ni règlement sur la période.</div>';
            if (o.success === false) {
                me.down('#soldeMessage').update('<span style="color:#c0392b">' + enc(o.msg || 'Relevé indisponible.') + '</span>');
                me.down('#soldeResume').update('');
                return;
            }
            me.down('#soldeResume').update((o.clients || 0) + ' client(s) · Solde au début : <b>' + f(o.soldeInitial)
                    + '</b> · Débit (ventes) : <b style="color:' + ROUGE + '">' + f(o.totalDebit)
                    + '</b> · Crédit (règlements et annulations) : <b style="color:' + VERT + '">' + f(o.totalCredit)
                    + '</b> · Solde à la fin : <b>' + f(o.soldeFinal) + '</b>');
            g.getView().refresh();
        });
        var montant = function (couleur) {
            return function (v, m, r) {
                if (r.get('type') === 'MOIS') {
                    m.tdCls = 'differe-mois';
                }
                return v ? '<span style="color:' + couleur + '">' + f(v) + '</span>' : '';
            };
        };
        var ligneTableau = function (cellules) {
            return '<tr>' + Ext.Array.map(cellules, function (c) {
                return '<td' + (c.n ? ' class="n"' : '') + '>' + c.v + '</td>';
            }).join('') + '</tr>';
        };
        var afficherVente = function (rec) {
            detail('<div class="sd-vide">Chargement…</div>');
            Ext.Ajax.request({
                method: 'GET', url: '../api/v1/reglement/releve/vente/' + encodeURIComponent(rec.get('piece')),
                success: function (rep) {
                    var o = Ext.decode(rep.responseText, true) || {};
                    if (o.success !== true) {
                        detail('<div class="sd-vide">' + enc(o.msg || 'Détail indisponible.') + '</div>');
                        return;
                    }
                    var lignes = Ext.Array.map(o.produits || [], function (p) {
                        return ligneTableau([{v: enc(p.cip)}, {v: enc(p.libelle)}, {v: f(p.quantite), n: 1}, {v: f(p.prixUnitaire), n: 1},
                            {v: f(p.montant), n: 1}]).replace('<tr>', '<tr class="sd-produit">');
                    }).join('');
                    detail('<div class="sd" data-type="VENTE"><div class="sd-titre">Vente N° ' + enc(o.reference) + '</div>'
                            + '<div class="sd-infos"><span>Date</span><span class="sd-date">' + enc(o.date) + '</span>'
                            + '<span>Client</span><span>' + enc(o.client) + '</span>'
                            + '<span>Montant de la vente</span><span class="sd-montant">' + f(o.montant) + '</span>'
                            + '<span>Part en différé</span><span class="sd-part" style="color:' + ROUGE + ';font-weight:bold">' + f(o.partDifferee) + '</span>'
                            + '<span>Reste dû aujourd\'hui</span><span class="sd-reste">' + f(o.reste) + '</span>'
                            + (o.annulee ? '<span>État</span><span style="color:' + VERT + ';font-weight:bold">Vente annulée</span>' : '')
                            + '</div><table><tr><th>CIP</th><th>Produit</th><th class="n">Qté</th><th class="n">P.U.</th><th class="n">Montant</th></tr>'
                            + lignes + '<tr class="sd-total"><td colspan="4">Total des produits</td><td class="n">' + f(o.totalProduits) + '</td></tr></table></div>');
                },
                failure: function (rep) {
                    detail('<div class="sd-vide">Le serveur ne répond pas (' + rep.status + ').</div>');
                }
            });
        };
        var afficherReglement = function (rec) {
            detail('<div class="sd-vide">Chargement…</div>');
            Ext.Ajax.request({
                method: 'GET', url: '../api/v1/reglement/releve/reglement/' + encodeURIComponent(rec.get('piece')),
                success: function (rep) {
                    var o = Ext.decode(rep.responseText, true) || {};
                    if (o.success !== true) {
                        detail('<div class="sd-vide">' + enc(o.msg || 'Détail indisponible.') + '</div>');
                        return;
                    }
                    var lignes = Ext.Array.map(o.ventes || [], function (v) {
                        return ligneTableau([{v: 'Vente N° ' + enc(v.reference)}, {v: enc(v.date)}, {v: f(v.montant), n: 1},
                            {v: f(v.resteActuel), n: 1}]).replace('<tr>', '<tr class="sd-vente">');
                    }).join('');
                    detail('<div class="sd" data-type="REGLEMENT"><div class="sd-titre">Règlement' + (o.reference ? ' ' + enc(o.reference) : '') + '</div>'
                            + '<div class="sd-infos"><span>Date</span><span class="sd-date">' + enc(o.date) + '</span>'
                            + '<span>Montant réglé</span><span class="sd-montant" style="color:' + VERT + ';font-weight:bold">' + f(o.montantRegle) + '</span>'
                            + '<span>Mode</span><span class="sd-mode">' + enc(o.mode) + '</span>'
                            + '<span>Opérateur</span><span>' + enc(o.operateur) + '</span></div>'
                            + '<table><tr><th>Vente réglée</th><th>Date</th><th class="n">Réglé</th><th class="n">Reste dû aujourd\'hui</th></tr>'
                            + lignes + '<tr class="sd-total"><td colspan="2">Total réglé</td><td class="n">' + f(o.totalVentes) + '</td><td></td></tr></table></div>');
                },
                failure: function (rep) {
                    detail('<div class="sd-vide">Le serveur ne répond pas (' + rep.status + ').</div>');
                }
            });
        };
        var afficherClient = function (rec) {
            detail('<div class="sd" data-type="CLIENT"><div class="sd-titre">' + enc(rec.get('client')) + '</div><div class="sd-infos">'
                    + '<span>Solde au début</span><span class="sd-debut">' + f(rec.get('soldeDebut')) + '</span>'
                    + '<span>Débit de la période</span><span style="color:' + ROUGE + ';font-weight:bold">' + f(rec.get('debit')) + '</span>'
                    + '<span>Crédit de la période</span><span style="color:' + VERT + ';font-weight:bold">' + f(rec.get('credit')) + '</span>'
                    + '<span>Solde à la fin</span><span class="sd-solde"><b>' + f(rec.get('solde')) + '</b></span></div>'
                    + '<div class="sd-vide" style="padding:0">Cliquez sur une de ses opérations pour voir son détail.</div></div>');
        };
        return {
            xtype: 'panel', title: 'SOLDE', itemId: 'ongletSolde', border: false,
            layout: {type: 'hbox', align: 'stretch'},
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'soldeDu', fieldLabel: 'Du', labelWidth: 25, width: 145, format: 'd/m/Y',
                            submitFormat: 'Y-m-d', value: new Date(2015, 0, 1)},
                        {xtype: 'datefield', itemId: 'soldeAu', fieldLabel: 'Au', labelWidth: 25, width: 145, format: 'd/m/Y',
                            submitFormat: 'Y-m-d', value: new Date()},
                        {xtype: 'combobox', itemId: 'soldeClient', store: clients, valueField: 'lgCLIENTID', displayField: 'fullName',
                            width: 280, minChars: 2, queryMode: 'remote', emptyText: 'Tous les clients (ou choisir un client)',
                            listeners: {select: charger, change: function (c, v) {
                                    if (!v && me.soldeCharge) {
                                        charger();
                                    }
                                }}},
                        {text: 'Rechercher', itemId: 'soldeRechercher', iconCls: 'searchicon', handler: charger},
                        {xtype: 'component', itemId: 'soldeMessage', html: ''},
                        /* retours du 09/10 (1) : impression et export du releve, memes criteres que l'ecran */
                        '->',
                        {text: 'Exporter Excel', itemId: 'soldeExcel', cls: 'btn-primary', iconCls: 'export_excel_icon', handler: function () {
                                me.editerSolde('excel');
                            }},
                        {text: 'Imprimer (PDF)', itemId: 'soldePdf', cls: 'btn-primary', iconCls: 'printable', handler: function () {
                                me.editerSolde('pdf');
                            }}]},
                {xtype: 'toolbar', dock: 'top', items: [{xtype: 'component', itemId: 'soldeResume', html: ''}]}],
            items: [{
                    xtype: 'gridpanel', itemId: 'grilleSolde', store: store, flex: 3, border: false,
                    viewConfig: {emptyText: '<div class="x-grid-empty">Choisissez la période (et un client si besoin), puis « Rechercher ».</div>',
                        deferEmptyText: false,
                        getRowClass: function (r) {
                            return r.get('type') === 'CLIENT' ? 'differe-ligne-client' : r.get('type') === 'MOIS' ? 'differe-ligne-mois' : '';
                        }},
                    columns: [
                        {text: 'Date et heure', dataIndex: 'date', flex: 2, minWidth: 110},
                        {text: 'Opération', dataIndex: 'libelle', itemId: 'colOperation', flex: 4, minWidth: 170, renderer: function (v, m, r) {
                                if (r.get('type') === 'CLIENT') {
                                    return enc(r.get('client')) + ' <span style="font-weight:normal;color:#4a5a6a">· solde au début '
                                            + f(r.get('soldeDebut')) + '</span>';
                                }
                                return r.get('type') === 'MOIS' ? '<b>' + enc(v) + '</b>' : enc(v)
                                        + (r.get('reference') ? ' <span style="color:#7f8c8d">· ' + enc(r.get('reference')) + '</span>' : '');
                            }},
                        {text: 'Débit', dataIndex: 'debit', itemId: 'colDebit', flex: 1.5, minWidth: 80, align: 'right', renderer: montant(ROUGE),
                            tooltip: 'Vente mise en différé : le client doit ce montant'},
                        {text: 'Crédit', dataIndex: 'credit', itemId: 'colCredit', flex: 1.5, minWidth: 80, align: 'right', renderer: montant(VERT),
                            tooltip: 'Règlement du client, ou annulation de la vente : diminue ce qu\'il doit'},
                        {text: 'Solde', dataIndex: 'solde', itemId: 'colSolde', flex: 1.5, minWidth: 90, align: 'right',
                            tooltip: 'Reste dû par le client après l\'opération (son solde précédent + débit − crédit)',
                            renderer: function (v) {
                                return '<b>' + f(v) + '</b>';
                            }}
                    ],
                    listeners: {itemclick: function (v, rec) {
                            var t = rec.get('type');
                            if (t === 'VENTE' || t === 'ANNULATION') {
                                afficherVente(rec);
                            } else if (t === 'REGLEMENT') {
                                afficherReglement(rec);
                            } else if (t === 'CLIENT') {
                                afficherClient(rec);
                            }
                        }}
                }, {
                    xtype: 'panel', itemId: 'soldeDetail', title: 'Détail', flex: 2, autoScroll: true, bodyStyle: 'background:#fff',
                    style: 'border-left:1px solid #d5dde6', html: invite
                }]
        };
    }
});
