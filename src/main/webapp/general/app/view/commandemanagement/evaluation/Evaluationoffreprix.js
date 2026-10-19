var url_services_transaction_evaluationoffreprix = '../webservices/commandemanagement/evaluationoffreprix/ws_transaction.jsp?mode=';
var url_services_data_evaluationoffreprix = '../webservices/commandemanagement/evaluationoffreprix/ws_data.jsp';
var url_services_evaluationprix_pdf = '../webservices/commandemanagement/evaluationoffreprix/ws_generate_pdf.jsp';

var Me;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.evaluation.Evaluationoffreprix', {
    extend: 'Ext.grid.Panel',
   /* xtype: 'evaluationoffreprixmanager',
    id: 'evaluationoffreprixmanagerID',*/
    frame: true,
    animCollapse: false,
    title: 'Evaluation des offres de prix',
    plain: true,
    maximizable: true,
    closable: false,
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function(v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function() {

        Me = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Order',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_evaluationoffreprix,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            store: store,
            id: 'OderGrid',
            columns: [
                
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    sortable: true
                },
                {
                    header: 'Prestataire',
                    dataIndex: 'str_REF_ORDER',
                    flex: 1
                },
                {
                    header: 'Nombre d\'Article',
                    dataIndex: 'int_LINE',
                    align: 'center',
                    flex: 1
                },
                {
                    header: 'Montant Offre',
                    dataIndex: 'PRIX_ACHAT_TOTAL',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                }, {
                    header: 'Heure',
                    dataIndex: 'dt_UPDATED',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    hidden: true,
                    items: [
                        {
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Imprimer',
                            scope: this,
                            handler: this.onbtnprint
                        }

                    ]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [
                        {
                            icon: 'resources/images/icons/fam/delete.gif',
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
                    text: 'NOUVELLE EVALUATION',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-',
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'suggestion',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                },
                {
                    text: 'RECHERCHER',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store,
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
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {


    },
  /*   onManageDetailsClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "ordermanagerlist";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Modifier les informations de la commande", rec.get('lg_ORDER_ID'), rec.data);
        //alert("test"+rec.get('lg_ORDER_ID'));
    },*/
    onbtnprint: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        PrestigeConfirmation.ligne('Message', 'Imprimer l\'evaluation des offres de prix en cours?', function () {
                        Me.onPdfClick(rec.get('lg_ORDER_ID'));
                        return;
                    });

    },
    onPdfClick: function(lg_ORDER_ID) {
        var linkUrl = url_services_evaluationprix_pdf + '&lg_EVALUATIONOFFREPRIX_ID=' + lg_ORDER_ID;
        //alert("Ok ca marche " + linkUrl);
        window.open(linkUrl);

    },
    onAddClick: function() {
        var xtype = "addevaluationoffreprixmanager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Faire une nouvelle &eacute;valuation d'offre de prix", "0", "is_Process");
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_evaluationoffreprix + 'delete',
                            params: {
                                lg_EVALUATIONOFFREPRIX_ID: rec.get('lg_ORDER_ID')
                            },
                            success: function(response)
                            {

                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }
                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });

    },
    onRechClick: function() {
        this.getStore().load({
            params: {
                search_value: Ext.getCmp('rechecher').getValue()
            }
        }, url_services_data_evaluationoffreprix);

    }
});