/* global Ext */


function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
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
                            text: 'D&eacute;bit',
                            dataIndex: 'MONTANTOP',
                            align: 'right',
                            flex: 1,
                            renderer: amountformat
                        }, {
                            text: 'Cr&eacute;dit',
                            dataIndex: 'CREDIT',
                            align: 'right',
                            flex: 1,
                            renderer: amountformat
                        }
                        
                
                
                , {
                            text: 'Solde',
                            dataIndex: 'MONTANTSOLDE',
                            align: 'right',
                            flex: 1,
                            renderer: amountformat
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
                                                grid.getStore().load({
                                                    params: {
                                                        dt_start_vente: dt_start_vente,
                                                        dt_end_vente: dt_end_vente,
                                                        search_value: field.getValue(),
                                                        lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID
                                                    }
                                                });
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
                                            grid.getStore().load({
                                                params: {
                                                    dt_start_vente: dt_start_vente,
                                                    dt_end_vente: dt_end_vente,
                                                    search_value: search_value,
                                                    lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID
                                                }
                                            });
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
                                            grid.getStore().load({
                                                params: {
                                                    dt_start_vente: dt_start_vente,
                                                    dt_end_vente: dt_end_vente,
                                                    search_value: search_value,
                                                    lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID
                                                }
                                            });
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
                                            var linkUrl = "../webservices/sm_user/RecapOrganisme/ws_recapOrganisme_pdf.jsp" + "?dt_start_vente=" + dt_start_vente + "&dt_end_vente=" + dt_end_vente + "&search_value=" + search_value+"&lg_TIERS_PAYANT_ID="+lg_TIERS_PAYANT_ID;
                                            window.open(linkUrl);

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