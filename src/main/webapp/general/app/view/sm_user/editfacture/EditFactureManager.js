/* global Ext */


var url_services_data_facturation = '../webservices/sm_user/facturation/ws_data.jsp';
var url_services_data_typefacture = '../webservices/sm_user/typefacture/ws_data.jsp';
var url_services_transaction_facturation = '../webservices/sm_user/facturation/ws_transaction.jsp?mode=';
var url_services_pdf_tiers_payant = '../webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?lg_FACTURE_ID=';
var url_services_pdf_fournisseurs = '../webservices/sm_user/facturation/ws_rp_facture_fournisseur.jsp?lg_FACTURE_ID=';
var url_services_data_tiers_payant = '../webservices/tierspayantmanagement/tierspayant/ws_search_data.jsp';
var url_services_data_grossiste = "../webservices/configmanagement/grossiste/ws_data.jsp";
var Me;
var valdatedebut;
var valdatefin;
var myAppController;
var groupeStore, groupesStore;
var factureStore;
var searchstore;

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.editfacture.EditFactureManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'facturemanager',
    id: 'facturemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.selection.CheckboxModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Facture',
        'testextjs.view.sm_user.editfacture.action.add',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des facturations ',
    frame: true,
    width: "98%",
    height: 580,
    // Mise en evidence de la ligne survolee (uniquement cette grille)
    viewConfig: {
        trackOver: true,
        overItemCls: 'facture-row-over'
    },
    listeners: {
        render: function (grid) {
            this.onRechClick();
        }
    },
    initComponent: function () {

        Me = this;
        var _this = this;

        myAppController = Ext.create('testextjs.controller.App', {});


        var itemsPerPage = 20;
        factureStore = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_facturation,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        searchstore = Ext.create('testextjs.store.Statistics.TiersPayans');
        var store_typefacture = new Ext.data.Store({
            model: 'testextjs.model.TypeFacture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typefacture,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        _this.store = factureStore;
        _this.columns = _this.buildDetailsColumns();
        _this.dockedItems = _this.buildDocked();
        // Selection multi-pages : pruneRemoved=false conserve les coches lors du
        // changement de page; checkOnly=true n'active la coche que via la case.
        _this.selModel = Ext.create('Ext.selection.CheckboxModel', {
            mode: 'MULTI',
            checkOnly: true,
            pruneRemoved: false
        });
        this.callParent();



    },
    buildDocked: function () {
        return [
            {xtype: 'toolbar',
                dock: 'top',
//                padding: '8',
                items: [
                    {
                        text: 'Cr&eacute;er',
                        scope: this,
                        iconCls: 'addicon',
                        handler: this.onAddCreate
                    }, '-', {
                        text: 'Supprimer la s&eacute;lection',
                        tooltip: 'Supprimer les factures coch&eacute;es',
                        iconCls: 'cancelicon',
                        scope: this,
                        handler: this.onDeleteSelection
                    }, '-', {
                        xtype: 'datefield',
                        id: 'datedebut',
                        name: 'datedebut',
                        emptyText: 'Date debut',
                        flex: 1,
                        submitFormat: 'Y-m-d',
                        maxValue: new Date(),
                        format: 'd/m/Y',
                        value: sessionStorage.getItem('dateStart') || null,
                        listeners: {
                            'change': function (me) {

                                valdatedebut = me.getSubmitValue();
                                Ext.getCmp('datefin').setMinValue(me.getValue());
                            }
                        }
                    }, {
                        xtype: 'tbseparator'
                    }, {
                        xtype: 'datefield',
                        id: 'datefin',
                        name: 'datefin',
                        emptyText: 'Date fin',
                        maxValue: new Date(),
                        submitFormat: 'Y-m-d',
                        flex: 1,
                        format: 'd/m/Y',
                        value: sessionStorage.getItem('datefin') || null,
                        listeners: {
                            'change': function (me) {
                                valdatefin = me.getSubmitValue();
                                Ext.getCmp('datedebut').setMaxValue(me.getValue());
                            }
                        }
                    }
                    , '-',
                    {
                        xtype: 'textfield',
                        id: 'rechecherFacture',
                        width: 150,
                        value: sessionStorage.getItem('searchQuery') || '',
                        emptyText: 'Rech',
                        listeners: {
                            specialKey: function (field, e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();
                                }
                            }
                        }
                    }, '-',
                    {
                        xtype: 'textfield',
                        id: 'rechecherCode',
                        width: 150,
                        value: sessionStorage.getItem('codeGroupe') || '',
                        emptyText: 'Rech Code facture',
                        listeners: {
                            specialKey: function (field, e) {
                                if (e.getKey() === e.ENTER) {
                                    Ext.getCmp('facturemanagerID').getStore().load({
                                        params: {
                                            CODEGROUPE: field.getValue()
                                        }
                                    });

                                    sessionStorage.setItem('codeGroupe', field.getValue());


                                }
                            }
                        }
                    }
                    , '-'
                            ,
                    {
                        xtype: 'combobox',
                        id: 'lg_TIERS_PAYANT_ID',
                        flex: 2,
                        store: searchstore,
                        pageSize: 10,
                        valueField: 'lg_TIERS_PAYANT_ID',
                        displayField: 'str_FULLNAME',
                        minChars: 2,
                        queryMode: 'remote',
                        enableKeyEvents: true,
                        emptyText: 'Selectionner tiers payant...',
                        value: sessionStorage.getItem('customer') || null,
                        listConfig: {
                            loadingText: 'Recherche...',
                            emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                            getInnerTpl: function () {
                                return '<span>{str_FULLNAME}</span>';
                            }

                        },
                        listeners: {
                            keypress: function (field, e) {

                                if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                    if (field.getValue().length <= 2) {
                                        field.getStore().load();
                                    }

                                }

                            },
                            select: function (cmp) {
                                Me.onRechClick();
                            }

                        }
                    }, {
                        xtype: 'tbseparator'
                    },

                    {
                        xtype: 'combobox',
                        flex: 1,
                        margin: '0 5 0 0',
                        labelWidth: 5,
                        id: 'filtreImpayes',
                        store: Ext.create('Ext.data.ArrayStore', {
                            data: [['', 'Tout'], ['non_regle', 'Non réglées'], ['partiel', 'Partiellement réglées'], ['payes', 'Factures réglées']],
                            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}]
                        }),

                        valueField: 'id',
                        displayField: 'libelle',
                        typeAhead: false,
                        queryMode: 'local',
                        value: '',
                        listeners: {

                            select: function (cmp) {
                                Me.onRechClick();
                            }

                        }

                    },
                    {
                        xtype: 'tbseparator'
                    }


                    , {
                        text: 'rechercher',
                        tooltip: 'rechercher',
                        iconCls: 'searchicon',

                        scope: this,
                        handler: this.onRechClick
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Imprimer',
                        tooltip: 'Imprimer',
                        iconCls: 'importicon',
                        id: 'printInvoicereport',

                        scope: this,
                        handler: this.onPrint
                    },

                    {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Exporter',
                        scope: this,

                        iconCls: 'export_excel_icon',
                        handler: this.exportToExcel
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Relev&eacute; FNE',
                        tooltip: 'Relev&eacute; des factures certifi&eacute;es et avoirs FNE du tiers payant',
                        scope: this,
                        handler: this.onReleveFne
                    }
                ]
            },
            {
                dock: 'bottom',
                xtype: 'pagingtoolbar',
                pageSize: 20,
                id: 'balanceGridpagingbar',
                store: this.store,
                displayInfo: true,
                displayMsg: 'Données affichées {0} - {1} sur {2}',
                emptyMsg: "Pas de donnée à afficher",
                listeners: {
                    beforechange: function (page, currentPage) {
                        console.log('on beforechange ');
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: '',
                            dt_fin: '',
                            dt_debut: '',
                            lg_customer_id: '',
                            CODEGROUPE: '',
                            'impayes': ''
                        };
                        var val = Ext.getCmp('rechecherFacture').getValue();
                        var lg_customer_id = "";

                        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
                            lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                        }
                        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
                        if (filtreImpayes == null || filtreImpayes == undefined) {
                            filtreImpayes = '';
                        }

                        var dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                        var dt_fin = Ext.getCmp('datefin').getSubmitValue();
                        myProxy.setExtraParam('lg_customer_id', lg_customer_id);
                        myProxy.setExtraParam('search_value', val);
                        myProxy.setExtraParam('dt_debut', dt_debut);
                        myProxy.setExtraParam('dt_fin', dt_fin);
                        myProxy.setExtraParam('impayes', filtreImpayes);
                        myProxy.setExtraParam('CODEGROUPE', Ext.getCmp('rechecherCode').getValue());

                    }

                }
            }];
    },

    buildDetailsColumns: function () {
        return [
            {
                header: 'lg_FACTURE_ID',
                dataIndex: 'lg_FACTURE_ID',
                hidden: true,
                width: 50
            }, {
                header: 'lg_TYPE_TIERS_PAYANT_ID',
                dataIndex: 'lg_TYPE_TIERS_PAYANT_ID',
                hidden: true,
                width: 20
            }, {
                header: 'Code Facture',
                dataIndex: 'str_CODE_FACTURE',
                flex: 0.5,
                renderer: function (value, meta, rec) {
                    if (rec.get('str_STATUT') === 'avoir') {
                        return value + ' <span style="color:#c0392b;font-weight:bold;">(Annul&eacute;e - avoir)</span>';
                    }
                    return value;
                }

            }, {
                header: 'Organisme',
                dataIndex: 'str_CUSTOMER_NAME',
                flex: 1
            }, {
                header: 'P&eacute;riode',
                dataIndex: 'str_PERIODE',
                flex: 1.5

            }, {
                header: 'Nombre de Dossiers',
                dataIndex: 'int_NB_DOSSIER',
                flex: 0.5,
                align: 'right'
            }
            , {
                header: 'Montant Brut',
                dataIndex: 'MONTANTBRUT',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }
            , {
                header: 'Montant Remise',
                dataIndex: 'MONTANTREMISE',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }, {
                header: 'Montant Forfaitaire',
                dataIndex: 'MONTANTFORFETAIRE',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }, {
                header: 'Montant.Net',
                dataIndex: 'dbl_MONTANT_CMDE',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }

            , {
                header: 'Montant Pay&eacute;',
                dataIndex: 'dbl_MONTANT_PAYE',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }, {
                header: 'Montant Restant',
                dataIndex: 'dbl_MONTANT_RESTANT',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            },
            {
                header: 'Date',
                dataIndex: 'dt_CREATED',
                flex: 1

            }, {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            if (rec.get('fneUrl')) {
                                return 'x-hide-display';
                            }
                            if (rec.get('str_STATUT') !== "paid") {

                                if (!rec.get('isALLOWED')) {
                                    return 'lock';
                                } else {
                                    return 'unpaid';
                                }
                            } else {
                                return 'paid';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('fneUrl')) {
                                return '';
                            }
                            if (rec.get('str_STATUT') !== "paid") {
                                if (!rec.get('isALLOWED')) {
                                    return '';
                                } else
                                {
                                    return 'Supprimer ';
                                }


                            } else {
                                return 'Sold&eacute;e ';
                            }
                        },
                        scope: this,
                        handler: this.onRemoveClick

                    }

                ]
            },
            {
                xtype: 'actioncolumn',
                hidden: false,
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            if (rec.get('str_STATUT') === 'avoir') {
                                return 'x-hide-display';
                            }
                            return 'x-display-hide';
                        },
                        icon: 'resources/images/icons/certication.png',
                        tooltip: 'Certification',
                        scope: this,
                        handler: this.shwoChoiceModal
                    }]
            },
            {
                xtype: 'actioncolumn',
                hidden: false,
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{

                        getClass: function (v, meta, rec) {

                            if (rec.get('fneUrl')) {
                                return 'x-display-hide';
                            } else {
                                return 'x-hide-display';
                            }
                        },

                        icon: 'resources/images/download.png',
                        tooltip: 'Télécharger',
                        scope: this,
                        handler: this.onOpenFneLink
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            if (rec.get('fneUrl') && !rec.get('fneAvoirReference') && rec.get('AUTORISATION_AVOIR_FNE')
                                    && rec.get('str_STATUT') !== 'paid' && rec.get('str_STATUT') !== 'avoir') {
                                return 'x-display-hide';
                            } else {
                                return 'x-hide-display';
                            }
                        },
                        icon: 'resources/images/icons/fam/retour.png',
                        tooltip: 'Émettre un avoir FNE (total)',
                        scope: this,
                        handler: this.onAvoirFneClick
                    }, {
                        getClass: function (v, meta, rec) {
                            if (rec.get('fneAvoirReference')) {
                                return 'x-display-hide';
                            } else {
                                return 'x-hide-display';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            return 'Avoir FNE : ' + rec.get('fneAvoirReference');
                        },
                        icon: 'resources/images/icons/fam/recu.png',
                        scope: this,
                        handler: this.onOpenFneAvoirLink
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        icon: 'resources/images/icons/fam/grid.png',
                        tooltip: 'Detail Bordereau',
                        scope: this,
                        handler: this.viewdetailFacture
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'printable';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer Bordereau ';
                        },
                        scope: this,
                        handler: this.onPdfClick
                    }]
            },

            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'excel';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer au format Excel';
                        },
                        scope: this,
                        handler: this.onExel
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'word';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer au format Word';
                        },
                        scope: this,
                        handler: this.onword
                    }]
            },

            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {

                            if ((rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") && rec.get('ACTION_REGLER_FACTURE')) {
                                return 'nonregle';
                            } else if (rec.get('str_STATUT') === "group") {
                                return 'groupe';
                            } else if (rec.get('str_STATUT') === 'paid') {
                                return 'regle';
                            } else {
                                return 'x-hide-display';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") {
                                if (rec.get('ACTION_REGLER_FACTURE')) {
                                    return 'R&eacute;gler Facture';
                                } else {
                                    return 'Vous n\êtes pas autorisé';
                                }

                            } else if (rec.get('str_STATUT') === "group") {
                                return 'La facture est générée pour un groupe';
                            } else {
                                return 'Sold&eacute;e ';
                            }
                        },
                        // icon: 'resources/images/icons/fam/folder_go.png',
                        // tooltip: 'R&eacute;gler Facture',
                        scope: this,
                        handler: this.onPaidFactureClick
                    }]
            }
        ];
    },
    onOpenFneLink: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const fneUrl = rec.get('fneUrl');
        if (fneUrl) {
            window.open(fneUrl);
        }

    },
    onOpenFneAvoirLink: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const fneAvoirUrl = rec.get('fneAvoirUrl');
        if (fneAvoirUrl) {
            window.open(fneAvoirUrl);
        } else if (rec.get('fneAvoirReference')) {
            Ext.MessageBox.alert('Info', 'Avoir FNE : ' + rec.get('fneAvoirReference'));
        }

    },
    onReleveFne: function () {
        const me = this;
        const tiersPayantId = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        if (!tiersPayantId) {
            Ext.MessageBox.alert('Relevé FNE', 'Sélectionnez d\'abord un tiers payant dans la barre de recherche.');
            return;
        }
        // fenêtre ouverte de façon synchrone (clic utilisateur) pour ne pas être bloquée par le navigateur
        const winImpression = window.open('', '_blank');
        Ext.Ajax.request({
            url: '../api/v1/fne/releve',
            method: 'GET',
            params: {
                tiersPayantId: tiersPayantId,
                dtStart: Ext.getCmp('datedebut').getSubmitValue() || '',
                dtEnd: Ext.getCmp('datefin').getSubmitValue() || ''
            },
            success: function (response) {
                const data = Ext.decode(response.responseText);
                if (winImpression) {
                    winImpression.document.write(me.buildReleveFneHtml(data));
                    winImpression.document.close();
                }
            },
            failure: function (response) {
                if (winImpression) {
                    winImpression.close();
                }
                let message = response.responseText;
                try {
                    const json = Ext.decode(response.responseText);
                    if (json.message) {
                        message = json.message;
                    }
                } catch (e) {
                }
                Ext.MessageBox.alert('Relevé FNE', message);
            }
        });
    },
    buildReleveFneHtml: function (data) {
        const fmt = function (montant) {
            return Number(montant || 0).toLocaleString('fr-FR');
        };
        let lignes = '';
        (data.rows || []).forEach(function (r) {
            const avoir = r.type === 'AVOIR';
            lignes += '<tr' + (avoir ? ' class="avoir"' : '') + '>'
                    + '<td>' + (r.date || '') + '</td>'
                    + '<td>' + (r.code || '') + '</td>'
                    + '<td>' + (avoir ? 'Avoir (annulation)' : 'Facture') + '</td>'
                    + '<td>' + (r.reference || '') + '</td>'
                    + '<td class="num">' + fmt(r.montant) + '</td>'
                    + '</tr>';
        });
        if (!lignes) {
            lignes = '<tr><td colspan="5" style="text-align:center;">Aucune facture certifi&eacute;e FNE sur la p&eacute;riode</td></tr>';
        }
        return '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relev&eacute; FNE</title>'
                + '<style>'
                + 'body{font-family:Arial,sans-serif;font-size:12px;margin:24px;}'
                + 'h2{margin:0 0 2px 0;font-size:16px;} h3{margin:0 0 12px 0;font-size:13px;font-weight:normal;}'
                + 'table{width:100%;border-collapse:collapse;margin-top:10px;}'
                + 'th,td{border:1px solid #999;padding:4px 6px;} th{background:#eee;}'
                + 'td.num{text-align:right;} tr.avoir td{color:#c0392b;}'
                + 'tfoot td{font-weight:bold;}'
                + '.noprint{margin-top:16px;} @media print{.noprint{display:none;}}'
                + '</style></head><body>'
                + '<h2>' + (data.officine || '') + '</h2>'
                + '<h3>RELEV&Eacute; DE FACTURATION FNE &mdash; ' + (data.tiersPayant || '')
                + '<br/>P&eacute;riode : ' + (data.periode || '') + '</h3>'
                + '<table><thead><tr><th>Date</th><th>Facture</th><th>Type</th><th>R&eacute;f&eacute;rence FNE</th><th>Montant</th></tr></thead>'
                + '<tbody>' + lignes + '</tbody>'
                + '<tfoot>'
                + '<tr><td colspan="4">Total factures certifi&eacute;es</td><td class="num">' + fmt(data.totalFactures) + '</td></tr>'
                + '<tr class="avoir"><td colspan="4">Total avoirs certifi&eacute;s</td><td class="num">-' + fmt(data.totalAvoirs) + '</td></tr>'
                + '<tr><td colspan="4">Solde net</td><td class="num">' + fmt(data.net) + '</td></tr>'
                + '</tfoot></table>'
                + '<div class="noprint"><button onclick="window.print()">Imprimer</button></div>'
                + '</body></html>';
    },
    onAvoirFneClick: function (grid, rowIndex) {
        const me = this;
        const rec = grid.getStore().getAt(rowIndex);
        if (!rec.get('fneUrl') || rec.get('fneAvoirReference') || !rec.get('AUTORISATION_AVOIR_FNE')) {
            return;
        }
        Ext.MessageBox.confirm('Avoir FNE',
                'Émettre un avoir total à la FNE pour la facture ' + rec.get('str_CODE_FACTURE')
                + ' ?<br/>Toutes les lignes certifiées seront retournées, la facture sera annulée sur Prestige et les ventes redeviendront facturables.<br/>Cette opération consomme un sticker et est irréversible.',
                function (btn) {
                    if (btn === 'yes') {
                        me.doAvoirFne(rec.get('lg_FACTURE_ID'), grid);
                    }
                });
    },
    doAvoirFne: function (idFacture, grid) {
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Avoir FNE en cours!');
        Ext.Ajax.request({
            url: '../api/v1/fne/invoices/avoir/' + idFacture,
            method: 'POST',
            success: function (response) {
                progress.hide();
                let message = 'Avoir FNE émis';
                try {
                    const json = Ext.decode(response.responseText);
                    if (json.reference) {
                        message = 'Avoir FNE émis. Référence : ' + json.reference;
                    }
                    if (json.annulation) {
                        message += '<br/>La facture a été annulée : les ventes sont à nouveau facturables.';
                    } else if (json.warning) {
                        message += '<br/><b>' + json.warning + '</b>';
                    }
                } catch (e) {
                }
                Ext.MessageBox.alert('Info', message);
                grid.getStore().reload();
            },
            failure: function (response) {
                progress.hide();
                let message = response.responseText;
                try {
                    const json = Ext.decode(response.responseText);
                    if (json.message) {
                        message = json.message;
                    }
                } catch (e) {
                }
                Ext.MessageBox.alert('Avoir FNE impossible', message);
            }
        });

    },
    shwoChoiceModal: function (grid, rowIndex) {
        const me = this;
        const rec = grid.getStore().getAt(rowIndex);
        const choice = new Ext.data.Store({
            fields: ['code', 'libelle'],
            data: [{code: 'GROUPE_TAUX_TVA', libelle: 'Facture'},
                {code: 'PRODUIT_DETAIL', libelle: 'Produit'}]

        });

        const win = Ext.create('Ext.window.Window',
                {
                    extend: 'Ext.window.Window',
                    autoShow: true,
                    height: 200,
                    width: '40%',
                    modal: true,
                    title: 'Choix du type fe facturation',
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
                                    title: 'Type de facturation',
                                    items: [
                                        {
                                            xtype: 'combo',
                                            fieldLabel: 'Type de facturation',
                                            allowBlank: false,
                                            name: 'typeInvoice',
                                            flex: 1,
                                            valueField: 'code',
                                            displayField: 'libelle',
                                            typeAhead: true,
                                            queryMode: 'local',
                                            pageSize: 2,
                                            emptyText: 'Choisir un type...',
                                            store: choice
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
                                            text: 'Valider',
                                            handler: function (btn) {
                                                const formulaire = btn.up('form');
                                                if (formulaire.isValid()) {

                                                    const formValues = formulaire.getValues();
                                                    me.certify(rec.get('lg_FACTURE_ID'), formValues.typeInvoice, win, grid);
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

                }


        );





    },

    certify: function (idFacture, typeInvoice, win, grid) {
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/fne/invoices/sign/' + idFacture + '/' + typeInvoice,
            method: 'GET',
            success: function (response)
            {
                progress.hide();
                win.destroy();
                Ext.MessageBox.alert('Info', 'Opération effectuée ');
                grid.getStore().reload();

            },
            failure: function (response)
            {
                progress.hide();
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    },
    onAddCreate: function () {

        testextjs.app.getController('App').onLoadNewComponent('addeditfacture', "Cr&eacute;er une facture", "0");


    },
    onPaidFactureClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        if ((rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") && rec.get('ACTION_REGLER_FACTURE')) {
            var xtype = "doreglementmanager";
            var alias = 'widget.' + xtype;

            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Faire un r&eacute;glement", rec.get('lg_FACTURE_ID'), rec.data);
        } else if (rec.get('str_STATUT') === "group") {
            var xtype = "groupeInvoices";
            var alias = 'widget.' + xtype;

            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", rec.get('CODEGROUPE'), rec.data);

        }
    },
    viewdetailFacture: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.editfacture.action.detailTransactionTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            titre: "Detail Bordereau [" + rec.get('str_CUSTOMER_NAME') + "]"
        });


    },

    onRemoveClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        if (rec.get('fneUrl')) {
            Ext.MessageBox.show({
                title: 'Facture certifiée FNE',
                width: 360,
                msg: 'Cette facture est certifiée à la FNE : elle ne peut pas être supprimée.<br/>La régularisation passe par un avoir FNE (icône avoir).',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
            return;
        }
        if (rec.get('str_STATUT') !== "paid" && rec.get('isALLOWED')) {

            Ext.MessageBox.confirm('Message',
                    'confirmez la suppresssion',
                    function (btn) {
                        if (btn == 'yes') {

                            myAppController.ShowWaitingProcess();
                            Ext.Ajax.request({
                                url: url_services_transaction_facturation + 'delete',
                                params: {
                                    lg_FACTURE_ID: rec.get('lg_FACTURE_ID'),
                                    mode: 'delete'
                                },
                                success: function (response)
                                {
                                    myAppController.StopWaitingProcess();

                                    var object = Ext.JSON.decode(response.responseText, false);
                                    if (object.success === "1") {
                                        Ext.MessageBox.alert('Infos', "La facture a &eacute;t&eacute; supprim&eacute;e");
                                    } else {
                                        Ext.MessageBox.show({
                                            title: 'Avertissement',
                                            width: 320,
                                            msg: (object.errors && object.errors !== 'null') ? object.errors : 'Cette facture a subit un r&eacute;glement',
                                            buttons: Ext.MessageBox.OK,
                                            icon: Ext.MessageBox.WARNING
                                        });

                                    }
                                    grid.getStore().reload();
                                },
                                failure: function (response)
                                {
                                    myAppController.StopWaitingProcess();
                                    var object = Ext.JSON.decode(response.responseText, false);
                                    //  alert(object);

                                    console.log("Bug " + response.responseText);
                                    Ext.MessageBox.alert('Error Message', response.responseText);

                                }
                            });

                        }
                    });

        }
    },
    onDeleteSelection: function () {
        var me = this;
        var selModel = me.getSelectionModel();
        var selection = selModel.getSelection();

        if (!selection || selection.length === 0) {
            Ext.MessageBox.alert('Information', 'Aucune facture s&eacute;lectionn&eacute;e.');
            return;
        }

        // On ne supprime que les factures autorisees et non soldees (meme regle que la
        // suppression unitaire); les autres sont ignorees.
        var deletable = [];
        var ignored = 0;
        Ext.each(selection, function (rec) {
            if (rec.get('str_STATUT') !== 'paid' && rec.get('isALLOWED')) {
                deletable.push(rec);
            } else {
                ignored++;
            }
        });

        if (deletable.length === 0) {
            Ext.MessageBox.alert('Information',
                    'Aucune des factures s&eacute;lectionn&eacute;es n\'est supprimable (sold&eacute;es ou non autoris&eacute;es).');
            return;
        }

        var msg = 'Confirmez la suppression de ' + deletable.length + ' facture(s)';
        if (ignored > 0) {
            msg += ' (' + ignored + ' ignor&eacute;e(s) : sold&eacute;es ou non autoris&eacute;es)';
        }
        msg += ' ?';

        Ext.MessageBox.confirm('Message', msg, function (btn) {
            if (btn !== 'yes') {
                return;
            }
            myAppController.ShowWaitingProcess();
            var done = 0, failed = 0, total = deletable.length;

            // Suppression en cascade : une facture apres l'autre (sequentiel).
            var deleteNext = function (index) {
                if (index >= total) {
                    myAppController.StopWaitingProcess();
                    selModel.deselectAll();
                    me.getStore().reload();
                    Ext.MessageBox.show({
                        title: 'R&eacute;sultat',
                        width: 340,
                        msg: done + ' facture(s) supprim&eacute;e(s)'
                                + (failed > 0 ? ', ' + failed + ' &eacute;chec(s)' : '')
                                + (ignored > 0 ? ', ' + ignored + ' ignor&eacute;e(s)' : ''),
                        buttons: Ext.MessageBox.OK,
                        icon: (failed > 0 ? Ext.MessageBox.WARNING : Ext.MessageBox.INFO)
                    });
                    return;
                }
                var rec = deletable[index];
                Ext.Ajax.request({
                    url: url_services_transaction_facturation + 'delete',
                    params: {
                        lg_FACTURE_ID: rec.get('lg_FACTURE_ID'),
                        mode: 'delete'
                    },
                    callback: function (options, success, response) {
                        if (success) {
                            var object = Ext.JSON.decode(response.responseText, true);
                            if (object && object.success === '1') {
                                done++;
                            } else {
                                failed++;
                            }
                        } else {
                            failed++;
                        }
                        deleteNext(index + 1);
                    }
                });
            };
            deleteNext(0);
        });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var xtype = "addeditfacture";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Edition de facture", rec.get('lg_FACTURE_ID'), rec.data);



    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecherFacture').getValue();
        var lg_customer_id = "";

        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
            lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }

        this.getStore().load({
            params: {
                search_value: val,
                lg_customer_id: lg_customer_id,
                dt_fin: Ext.getCmp('datefin').getSubmitValue(),
                dt_debut: Ext.getCmp('datedebut').getSubmitValue(),
                'CODEGROUPE': Ext.getCmp('rechecherCode').getValue(),
                'impayes': filtreImpayes
            }});
        sessionStorage.setItem('impayes', filtreImpayes);
        sessionStorage.setItem('customer', lg_customer_id);
        sessionStorage.setItem('searchQuery', val);
        sessionStorage.setItem('datefin', Ext.getCmp('datefin').getSubmitValue());
        sessionStorage.setItem('dateStart', Ext.getCmp('datedebut').getSubmitValue());
        sessionStorage.setItem('codeGroupe', Ext.getCmp('rechecherCode').getValue());

    },
    onExel: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');
        window.location = '../invoiceServlet?action=exls&lg_FACTURE_ID=' + lg_FACTURE_ID;
    },
    onword: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');

        window.location = '../invoiceServlet?action=docx&lg_FACTURE_ID=' + lg_FACTURE_ID;



    },

    onPdfClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var typeFacture = rec.get('lg_TYPE_FACTURE_ID');
        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');
        if (typeFacture === "tiers payant") {
            var linkUrl = url_services_pdf_tiers_payant + lg_FACTURE_ID;
            window.open(linkUrl);

        } else {
            var linkUrl = url_services_pdf_fournisseurs + lg_FACTURE_ID;
            window.open(linkUrl);
        }

    },
    onPrint: function () {
        let lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue();
        // Sans periode, le releve sort vierge : on exige la date debut et la date fin.
        if (!dt_debut || !dt_fin) {
            Ext.MessageBox.alert('Information',
                    'Veuillez renseigner la p&eacute;riode (date d&eacute;but et date fin) avant d\'imprimer le relev&eacute; des factures.');
            return;
        }
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }
        const search_value = Ext.getCmp('rechecherFacture').getValue();

        window.open("../releveFactureServlet" + "?lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value + "&impayes=" + filtreImpayes + '&codeFacture=' + Ext.getCmp('rechecherCode').getValue());
    },
    exportToExcel: function () {
        var lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue()
                ;
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }
        var search_value = Ext.getCmp('rechecherFacture').getValue();
        window.location = "../FactureDataExport?action=facture&lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value + "&impayes=" + filtreImpayes;

    }

});