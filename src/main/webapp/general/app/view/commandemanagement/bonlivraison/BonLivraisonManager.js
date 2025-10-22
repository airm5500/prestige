
var url_services_pdf_bonlivraison = '../webservices/commandemanagement/bonlivraison/ws_generate_pdf.jsp';
var Me;
var store_bl;
var myAppController;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.bonlivraison.BonLivraisonManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'bonlivraisonmanager',
    id: 'bonlivraisonmanagerID',
    frame: true,
//    collapsible: true,
    animCollapse: false,
    title: 'Gestion des entrees',
    plain: true,
    maximizable: true,
    closable: false,

    initComponent: function () {
        myAppController = Ext.create('testextjs.controller.App', {});

        Me = this;

        var itemsPerPage = 9999;
        store_bl = new Ext.data.Store({
            model: 'testextjs.model.BonLivraison',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/commande/list-bons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 240000
            },
            sorters: [{
        property: 'dt_DATE_LIVRAISON',
        direction: 'ASC' // ou 'DESC' pour un ordre croissant
    }]

        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            store: store_bl,
            id: 'gridpanelLivraisonID',
            columns: [
                {
                    header: 'lg_BON_LIVRAISON_ID',
                    dataIndex: 'lg_BON_LIVRAISON_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                },
                // str_REF
                {
                    header: 'Ref.',
                    dataIndex: 'str_REF_LIVRAISON',
                    flex: 1,
                                    renderer: function (value) {
                                        return '<span style="color:blue; font-weight:bold; font-size:1em;">'+ value +'</span>';
                                    }
                },
                {
                    header: 'Grossiste',
                    dataIndex: 'str_GROSSISTE_LIBELLE',
                    flex: 1,
                                    renderer: function (value) {
                                        return '<span style="color:blue; font-weight:bold; font-size:1em;">'+ value +'</span>';
                                    }
                },
                {
                    header: 'Ref.CMDE',
                    dataIndex: 'str_REF_ORDER',
                    flex: 1
                },
                // int_NBRE_LIGNE_BL_DETAIL
                {
                    header: 'Lignes',
                    dataIndex: 'int_NBRE_LIGNE_BL_DETAIL',
                    align: 'right',
                    flex: 0.5,
                                    renderer: function (value) {
                                        return '<span style="color:blue; font-weight:bold; font-size:1em;">'+ value +'</span>';
                                    }
                },

                {
                    header: 'Date',
                    dataIndex: 'dt_DATE_LIVRAISON',
                    align: 'right',
                    flex: 1,
                                    renderer: function (value) {
                                        return '<span style="color:blue; font-weight:bold; font-size:1em;">'+ value +'</span>';
                                    }
                },
                {
                    header: 'MONTANT.HT',
                    dataIndex: 'PRIX_ACHAT_TOTAL',
//                    renderer: amountformat,
                    align: 'right',
                    flex: 1,
                    renderer: function (value, metadata, record) {

                        if (record.get('PRIX_ACHAT_TOTAL') != record.get('int_MHT')) {
                            return '<span style="color: red">' + value + '</span>';
                        } else {
                            return '<span style="color:green; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                        }
                    }
                },
                {
                    header: 'PRIX.BL.HT',
                    dataIndex: 'int_MHT',
                    xtype: 'numbercolumn',
                    align: 'right',
                                    renderer: function (value) {
                                        return '<span style="color:green; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                    format: '0,000.',

                    flex: 1
                },
                {
                    header: 'TVA',
                    dataIndex: 'int_TVA',
                    xtype: 'numbercolumn',
                    align: 'right',
                    format: '0,000.',
                                    renderer: function (value) {
                                        return '<span style="color:green; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                    flex: 1
                },
                {
                    header: 'PRIX.BL.TTC',
                    dataIndex: 'int_HTTC',
                    xtype: 'numbercolumn',
                    align: 'right',
                                    renderer: function (value) {
                                        return '<span style="color:green; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                    format: '0,000.',

                    flex: 1
                },
                {
                    header: 'Op&eacute;rateur',
                    dataIndex: 'lg_USER_ID',
                    align: 'center',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    //width: 80,
                    flex: 1,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Detail livraison',
                            scope: this,
                            handler: this.onManageDetailsClick
                        }, '-', {
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }


                    ]
                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'suggestion',
                    flex: 1,
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                }, '-',

                {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store_bl,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {


    },
    onManageDetailsClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "bonlivraisondetail";
     
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Details de la livraison", rec.get('lg_BON_LIVRAISON_ID'), rec.data);
    },

    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        myAppController.ShowWaitingProcess();
                        Ext.Ajax.request({
                            method: 'DELETE',
                            url: '../api/v1/commande/bon/' + rec.get('lg_BON_LIVRAISON_ID'),
                            timeout: 240000,

                            success: function (response)
                            {
                                myAppController.StopWaitingProcess();

                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                grid.getStore().reload();

                            }
                        });
                        return;
                    }
                });

    },

    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            timeout: 240000,
            params: {
                query: val.value
            }
        });
    }

});