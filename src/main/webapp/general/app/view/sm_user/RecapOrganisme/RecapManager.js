/* global Ext */


function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

/* Criteres de l'ecran, lus au meme endroit par la recherche, l'impression et l'export : trois
   lectures separees finissaient par diverger. */
function criteresRecap() {
    var lu = function (id) {
        var c = Ext.getCmp(id);
        return c && c.getValue() !== null && c.getValue() !== undefined ? c.getValue() : '';
    };
    var tp = lu('TIERS_PAYANT_ID');
    return {
        dt_start_vente: Ext.getCmp('dt_start_recap').getSubmitValue(),
        dt_end_vente: Ext.getCmp('dt_end_recap').getSubmitValue(),
        search_value: lu('rechrecap'),
        lg_TIERS_PAYANT_ID: tp,
        operateurMontant: lu('recapOperateurMontant'),
        valeurMontant: lu('recapValeurMontant'),
        typeTiersPayant: lu('recapTypeTiersPayant'),
        groupeTiersPayant: lu('recapGroupeTiersPayant')
    };
}

Ext.define('testextjs.view.sm_user.RecapOrganisme.RecapManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'recapOrganisme',
    id: 'recapOrganismeID',
    requires: [
        
    ],
    title: 'Le r&eacute;capitulatif par compte d’organisme',
    frame: true,
    initComponent: function () {
        var itemsPerPage = 20;
        var searchstore = Ext.create('testextjs.store.Statistics.TiersPayans');
        var store = Ext.create('testextjs.store.RecpaOrganisme');
        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this,
                {width: '98%',
                    height: valheight,
                   /* features: [
                        {
                            ftype: 'grouping',
                            groupHeaderTpl: "{[values.rows[0].data.FULNAME]}",
                            hideGroupedHeader: true
                        }],*/
                    id: 'RecapGrid',
                    store: store,
                    viewConfig: {
                        forceFit: true,
//                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {xtype: "rownumberer"
                          
                        },
                        {
                            header: "Type Organisme",
                            dataIndex: 'TYPEORGANISME',
                            flex: 1

                        },
                        {
                            header: "Organisme",
                            dataIndex: 'FULNAME',
                            flex: 2

                        },
                        
                       
                        
                        
                        {
                            /* Point 10 : le groupe sert de filtre et de regroupement a
                             * l'impression ; l'afficher evite d'avoir a le deviner. */
                            header: 'Groupe',
                            dataIndex: 'GROUPE',
                            flex: 1
                        },
                        {
                            header: 'Code Organisme',
                            dataIndex: 'CODEORGANISME',
                            flex: 1
                        },
                        {
                            text: 'Num&eacute;ro Compte',
                            dataIndex: 'NUMORGANISME',
                            flex: 1

                        }
                        , {
                            text: 'Compte Comptable',
                            dataIndex: 'COMPTECOMPTABLE',
                            flex: 1

                        },
                        {
                            /* Points 10 : debit en rouge et gras, credit en vert et gras, solde
                             * colore selon son signe (voir PrestigeMontants dans app.js). */
                            text: 'D&eacute;bit',
                            dataIndex: 'MONTANTOP',
                            align: 'right',
                            flex: 1,
                            renderer: function (v) {
                                return window.PrestigeMontants.debit(v);
                            }
                        }, {
                            text: 'Cr&eacute;dit',
                            dataIndex: 'CREDIT',
                            align: 'right',
                            flex: 1,
                            renderer: function (v) {
                                return window.PrestigeMontants.credit(v);
                            }
                        }, {
                            text: 'Solde',
                            dataIndex: 'MONTANTSOLDE',
                            align: 'right',
                            flex: 1,
                            renderer: function (v) {
                                return window.PrestigeMontants.solde(v);
                            }
                        }

                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    dockedItems: [{
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    xtype: 'textfield',
                                    id: 'rechrecap',
                                    width: 150,
                                    emptyText: 'Recherche',
                                    listeners: {
                                        specialKey: function (field, e, Familletion) {
                                            if (e.getKey() === e.ENTER) {
                                                var grid = Ext.getCmp('RecapGrid');
                                                var dt_start_vente = Ext.getCmp('dt_start_recap').getSubmitValue();
                                                var dt_end_vente = Ext.getCmp('dt_end_recap').getSubmitValue();
                                                var lg_TIERS_PAYANT_ID = Ext.getCmp('TIERS_PAYANT_ID').getValue();
                                                if (lg_TIERS_PAYANT_ID === null) {
                                                    lg_TIERS_PAYANT_ID = "";
                                                }
                                                grid.getStore().load({params: criteresRecap()});
                                            }

                                        }
                                    }
                                },
                                {
                                    xtype: 'tbseparator'
                                },
                                {
                                    xtype: 'combo',
                                    id: 'TIERS_PAYANT_ID',
                                    flex: 1.5,
                                    store: Ext.create('Ext.data.Store', {
                                        fields: [
                                            // l'API REST renvoie lgTIERSPAYANTID / strFULLNAME
                                            {name: 'lg_TIERS_PAYANT_ID', type: 'string', mapping: function (data) {
                                                    return data.lgTIERSPAYANTID !== undefined ? data.lgTIERSPAYANTID : data.lg_TIERS_PAYANT_ID;
                                                }},
                                            {name: 'str_FULLNAME', type: 'string', mapping: function (data) {
                                                    return data.strFULLNAME !== undefined ? data.strFULLNAME : data.str_FULLNAME;
                                                }}
                                        ],
                                        // pas d'autoLoad : le combo distant charge lui-meme la liste a l'ouverture
                                        // du menu deroulant ; l'autoLoad ne faisait que doubler la requete
                                        // tiers-payants a l'affichage de l'ecran
                                        autoLoad: false,
                                        pageSize: 10,
                                        proxy: {
                                            type: 'ajax',
                                            url: '../api/v1/client/tiers-payants',
                                            reader: {
                                                type: 'json',
                                                root: 'data',
                                                totalProperty: 'total'
                                            },
                                            timeout: 240000
                                        }
                                    }),
                                    pageSize: 10,
                                    valueField: 'lg_TIERS_PAYANT_ID',
                                    displayField: 'str_FULLNAME',
                                    minChars: 2,
                                    //queryMode: 'remote',
                                    enableKeyEvents: true,
                                    emptyText: 'Selectionner tiers payant...',
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
                                            var grid = Ext.getCmp('RecapGrid');
                                            var dt_start_vente = Ext.getCmp('dt_start_recap').getSubmitValue();
                                            var dt_end_vente = Ext.getCmp('dt_end_recap').getSubmitValue();
                                            var search_value = Ext.getCmp('rechrecap').getValue();
                                            var lg_TIERS_PAYANT_ID = Ext.getCmp('TIERS_PAYANT_ID').getValue();
                                            if (lg_TIERS_PAYANT_ID === null) {
                                                lg_TIERS_PAYANT_ID = "";
                                            }
                                            grid.getStore().load({params: criteresRecap()});
                                        },
                                        change: function () {


                                        }
                                    }
                                },
                                {
                                    xtype: 'tbseparator'
                                },
                                {
                                    xtype: 'datefield',
                                    format: 'd/m/Y',
                                    emptyText: 'Date debut',
                                    submitFormat: 'Y-m-d',
                                    fieldLabel: 'Du',
                                    labelWidth: 20,
                                    flex: 0.7,
                                    id: 'dt_start_recap',
                                    listeners: {
                                        change: function () {
                                            Ext.getCmp('dt_end_recap').setMinValue(this.getValue());
                                        }
                                    }

                                }, {
                                    xtype: 'tbseparator'
                                }

                                ,
                                {
                                    xtype: 'datefield',
                                    format: 'd/m/Y',
                                    emptyText: 'Date fin',
                                    submitFormat: 'Y-m-d',
                                    fieldLabel: 'Au',
                                    labelWidth: 20,
                                    flex: 0.7,
                                    id: 'dt_end_recap',
                                    listeners: {
                                        change: function () {

                                            Ext.getCmp('dt_start_recap').setMaxValue(this.getValue());
                                        }
                                    }

                                }

                                , {
                                    xtype: 'tbseparator'
                                },
                                {
                                    xtype: 'tbseparator'
                                },
                                /* Point 10 : filtre sur le montant du solde, avec les six
                                 * operateurs de comparaison demandes. Sans operateur ou sans
                                 * valeur, rien n'est filtre : l'ecran s'ouvre comme avant. */
                                {
                                    xtype: 'combo',
                                    id: 'recapOperateurMontant',
                                    width: 130,
                                    editable: false,
                                    queryMode: 'local',
                                    emptyText: 'Solde...',
                                    valueField: 'code',
                                    displayField: 'libelle',
                                    store: Ext.create('Ext.data.Store', {
                                        fields: ['code', 'libelle'],
                                        data: [
                                            {code: '', libelle: 'Solde : tous'},
                                            {code: 'eq', libelle: '= égal à'},
                                            {code: 'ne', libelle: '≠ différent de'},
                                            {code: 'gt', libelle: '> supérieur à'},
                                            {code: 'gte', libelle: '≥ supérieur ou égal'},
                                            {code: 'lt', libelle: '< inférieur à'},
                                            {code: 'lte', libelle: '≤ inférieur ou égal'}
                                        ]
                                    })
                                },
                                {
                                    xtype: 'textfield',
                                    id: 'recapValeurMontant',
                                    width: 100,
                                    emptyText: 'Montant',
                                    maskRe: /[0-9.,-]/
                                },
                                {
                                    xtype: 'tbseparator'
                                },
                                {
                                    xtype: 'combo',
                                    id: 'recapTypeTiersPayant',
                                    width: 140,
                                    editable: false,
                                    queryMode: 'local',
                                    emptyText: 'Tous les types...',
                                    /* Le filtre porte sur le LIBELLE du type : c'est ce que rend
                                     * le recapitulatif, la procedure stockee ne donnant pas
                                     * l'identifiant du type. */
                                    valueField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                                    displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                                    store: Ext.create('Ext.data.Store', {
                                        fields: ['str_LIBELLE_TYPE_TIERS_PAYANT'],
                                        autoLoad: true,
                                        proxy: {
                                            type: 'ajax',
                                            url: '../api/v1/common/types-tiers-payant',
                                            reader: {type: 'json', root: 'results', totalProperty: 'total'}
                                        },
                                        listeners: {
                                            load: function (magasin) {
                                                // « tous les types » en tete : le choisir revient a ne pas filtrer
                                                magasin.insert(0, [{str_LIBELLE_TYPE_TIERS_PAYANT: ''}]);
                                            }
                                        }
                                    })
                                },
                                {
                                    xtype: 'combo',
                                    id: 'recapGroupeTiersPayant',
                                    width: 160,
                                    editable: false,
                                    queryMode: 'local',
                                    emptyText: 'Tous les groupes...',
                                    valueField: 'libelle',
                                    displayField: 'libelle',
                                    store: Ext.create('Ext.data.Store', {
                                        fields: ['libelle'],
                                        autoLoad: true,
                                        proxy: {
                                            type: 'ajax',
                                            url: '../api/v1/facturation/groupetierspayant',
                                            reader: {type: 'json', root: 'data', totalProperty: 'total'}
                                        },
                                        listeners: {
                                            load: function (magasin) {
                                                magasin.insert(0, [{libelle: ''}]);
                                            }
                                        }
                                    })
                                },
                                {
                                    xtype: 'tbseparator'
                                },
                                {
                                    // flex: 0.4,
                                    width: 100,
                                    xtype: 'button',
                                    iconCls: 'searchicon',
                                    text: 'Rechercher',
                                    listeners: {
                                        click: function () {
                                            var grid = Ext.getCmp('RecapGrid');
                                            var dt_start_vente = Ext.getCmp('dt_start_recap').getSubmitValue();
                                            var dt_end_vente = Ext.getCmp('dt_end_recap').getSubmitValue();
                                            var search_value = Ext.getCmp('rechrecap').getValue();
                                            var lg_TIERS_PAYANT_ID = Ext.getCmp('TIERS_PAYANT_ID').getValue();
                                            if (lg_TIERS_PAYANT_ID === null) {
                                                lg_TIERS_PAYANT_ID = "";
                                            }
                                            grid.getStore().load({params: criteresRecap()});
                                        }
                                    }


                                },
                                , {
                                    xtype: 'tbseparator'
                                }


                                ,
                                {
                                    width: 100,
                                    xtype: 'button',
                                    text: 'Imprimer',
                                    iconCls: 'printable',
                                    listeners: {
                                        click: function () {

                                            var dt_start_vente = Ext.getCmp('dt_start_recap').getSubmitValue();
                                            var dt_end_vente = Ext.getCmp('dt_end_recap').getSubmitValue();
                                            var search_value = Ext.getCmp('rechrecap').getValue();
                                           var  lg_TIERS_PAYANT_ID=Ext.getCmp('TIERS_PAYANT_ID').getValue();
                                           if(lg_TIERS_PAYANT_ID===null){
                                             lg_TIERS_PAYANT_ID="";  
                                               
                                           }
                                            var linkUrl = "../webservices/sm_user/RecapOrganisme/ws_recapOrganisme_pdf.jsp" + "?" + Ext.Object.toQueryString(criteresRecap());
                                            window.open(linkUrl);

                                        }
                                    }


                                },
                                {
                                    xtype: 'tbseparator'
                                },
                                {
                                    /* Point 10 : export Excel. Memes criteres que l'ecran, mais
                                     * toutes les lignes du resultat ; la grille reste paginee. */
                                    width: 90,
                                    xtype: 'button',
                                    id: 'recapBtnExcel',
                                    text: 'Excel',
                                    icon: 'resources/images/icons/fam/excel_icon.png',
                                    tooltip: 'Exporter le r&eacute;sultat complet vers Excel',
                                    listeners: {
                                        click: function () {
                                            window.location = '../api/v1/reglement-facture/recap-organisme/export-excel?'
                                                    + Ext.Object.toQueryString(criteresRecap());
                                        }
                                    }
                                }


                            ]
                        }

                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true
                    }
                }
        );

        this.callParent();
 },
    exportToExcel: function () {
        var lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue()
                ;
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        var search_value = Ext.getCmp('rechecher').getValue();


        window.location = "../FactureDataExport?action=facture&lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value;

    }
})