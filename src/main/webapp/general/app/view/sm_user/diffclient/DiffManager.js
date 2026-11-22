var url_services_data_diffclient = '../webservices/sm_user/diffclient/ws_data.jsp';
var url_services_diffclient_generate_pdf = '../webservices/sm_user/diffclient/ws_generate_pdf.jsp';
var Me_Workflow;
var valdatedebut = "";
var valdatefin = "";

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.diffclient.DiffManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'diffmanager',
    id: 'diffmanagerID',
    title: 'Liste Des Differes',
    requires: ['testextjs.view.commun.ChampPeriode', 
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager'

    ],
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function() {

        Me_Workflow = this;
        valdatedebut = "";
        valdatefin = "";

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_diffclient,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridArticleID',
            columns: [
                {
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1
                },
                {
                    header: 'Reference',
                    dataIndex: 'int_CIP',
                    flex: 0.7
                },
                {
                    header: 'Nom',
                    dataIndex: 'str_NAME',
                    flex: 1.5
                },
                {
                    header: 'Prenom',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1.5
                },
                {
                    header: 'Montant',
                    dataIndex: 'int_PRICE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.7
                },
                {
                    header: 'Part client',
                    dataIndex: 'int_PAF',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.7
                },
                {
                    header: 'Reste',
                    dataIndex: 'int_PAT',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.7
                },
                {
                    header: 'Date',
                    dataIndex: 'int_T',
                    align: 'center',
                    flex: 0.7
                },
                {
                    header: 'Heure',
                    dataIndex: 'int_S',
                    align: 'center',
                    flex: 0.7
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    hidden: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick
                        }]
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    text: 'Regler Differer',
                    scope: this,
                    hidden: true,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    flex: 0.5,
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            // alert(me.getSubmitValue());
                            valdatedebut = me.getSubmitValue();
                            Ext.getCmp('datefin').setMinValue(me.getValue());
                            // Ext.getCmp('GridArticleID').getStore().getProxy().url = url_services_data_diffclient + "?datedebut=" + valdatedebut;

                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    /* plan du 21/11, point 7.2 (retour du 22/11) : selecteur de periode unique, menu FACTURATION */
                    plugins: [{ptype: 'champperiode', souple: true, debut: 'datedebut', declencher: 'btnRechercherDiff'}],
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    submitFormat: 'Y-m-d',
                    flex: 0.5,
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            valdatefin = me.getSubmitValue();

                            Ext.getCmp('datedebut').setMaxValue(me.getValue());
                            //    Ext.getCmp('GridArticleID').getStore().getProxy().url = url_services_data_diffclient + "?datedebut=" + valdatedebut + "&datefin=" + valdatefin;
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }
                            });
                        }
                    }
                }, '-', {
                    text: 'rechercher',
                    itemId: 'btnRechercherDiff',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }, '-', {
                    text: 'Imprimer',
                    tooltip: 'imprimer',
                    iconCls: 'printable',
                    scope: this,
                    handler: this.onPdfClick
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(), // same store GridPanel is using
                listeners: {
                    beforechange: function(page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: ''
                        };
                        myProxy.setExtraParam('search_value', Ext.getCmp('rechecher').getValue());
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
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onPdfClick: function() {

        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_diffclient_generate_pdf + '?&search_value=' + Ext.getCmp('rechecher').getValue() + "&dt_Date_Debut=" + valdatedebut + "&dt_Date_Fin=" + valdatefin;


        window.open(linkUrl);
    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');

        this.getStore().load({
            params: {
                search_value: val.getValue(),
                datedebut: valdatedebut,
                datefin: valdatefin
            }
        }, url_services_data_famille_famille);
    }

});