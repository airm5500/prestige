/* Mouchard des prix de vente passe en API (demande du 30/09) : memes parametres et memes champs que les anciennes
   pages webservices/sm_user/prixmodifies/ws_data.jsp et ws_generate_pdf.jsp, conservees mais plus appelees. */
var url_services_data_modificationprix = '../api/v1/mouchard-prix/liste';
var url_services_data_modificationprix_generate_pdf = '../api/v1/mouchard-prix/pdf';


var Me;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.mouvementprix.Mouvementprixvente', {
    extend: 'Ext.grid.Panel',
    xtype: 'mouvementprixvente',
    id: 'mouvementprixventeID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Famille',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Liste des prix vente modifi&eacute;s',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function() {

        Me = this;

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            groupField: 'MOUVEMENT',
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_modificationprix,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'COMMANDE', str_desc: 'Commandes'}, {str_TYPE_TRANSACTION: 'FICHEARTICLE', str_desc: 'Fiche article'}, {str_TYPE_TRANSACTION: 'VENTE', str_desc: 'Ventes'}]
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
            features: [
                {
                    ftype: 'groupingsummary',
                    showSummaryRow: true
                }],
            columns: [
                {
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1
                },
                {
                    xtype: 'rownumberer',
                    text: 'Num',
                    width: 45,
                    sortable: true
                },
                {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 1,
                    summaryType: "count",
                    summaryRenderer: function(value) {
                        return "<b>Nombre Mouvement : </b><span style='color:blue;font-weight:600;'>" + value + "</span>";

                    }
                },
                {
                    header: 'Designation',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 2.5
                },
                {
                    header: 'R&eacute;f&eacute;rence',
                    dataIndex: 'str_DESCRIPTION_PLUS',
                    flex: 1
                },
                {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                },
                {
                    header: 'Heure',
                    dataIndex: 'lg_ETAT_ARTICLE_ID',
                    flex: 0.7
                },
                {
                    header: 'Ancien Prix',
                    dataIndex: 'int_PRICE_DETAIL',
                    flex: 1,
                    align: 'right',
                    summaryType: "sum",
                    renderer: amountformat,
                    summaryRenderer: function(value) {
                        return "<span style='color:blue;font-weight:600;'>" + amountformat(parseInt(value)) + "</span> ";
                    }
                }, {
                    header: 'Nouveau Prix',
                    dataIndex: 'int_QTEDETAIL',
                    flex: 1,
                    align: 'right',
                    summaryType: "sum",
                    renderer: amountformat,
                    summaryRenderer: function(value) {
                        return "<span style='color:blue;font-weight:600;'>" + amountformat(parseInt(value)) + "</span> ";
                    }
                }, {
                    header: 'Ecart',
                    dataIndex: 'int_NUMBERDETAIL',
                    flex: 1,
                    align: 'right',
                    summaryType: "sum",
                    summaryRenderer: function(value) {
                        return "<span style='color:blue;font-weight:600;'>" + amountformat(parseInt(value)) + "</span> ";
                    }
                },
                {
                    header: 'Operateur',
                    dataIndex: 'lg_AJUSTEMENTDETAIL_ID',
                    flex: 1.5
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    xtype: 'combobox',
                    name: 'str_TYPE_TRANSACTION',
                    margins: '0 0 0 10',
                    flex:1,
                   
                    id: 'str_TYPE_TRANSACTION',
                    store: store_type,
                    valueField: 'str_TYPE_TRANSACTION',
                    displayField: 'str_desc',
                    typeAhead: true,
                    queryMode: 'remote',
                  
                    emptyText: 'Filtre action...',
                    listeners: {
                        select: function(cmp) {
                            /*str_TYPE_TRANSACTION = cmp.getValue();
                             Ext.getCmp('GridArticleID').getStore().getProxy().url = url_services_data_modificationprix + "?str_ACTION=" + str_TYPE_TRANSACTION;
                             */
                            Me.onRechClick();

                        }
                    }
                },
                {
                    xtype: 'datefield', 
                    fieldLabel: 'Du',
                    name: 'dt_debut',
                    id: 'dt_debut', allowBlank: false,
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                   value: new Date(),
                    format: 'd/m/Y',
                    
                     labelWidth:15,
                     flex:1,
                    listeners: {
                        'change': function(me) {
                            // alert(me.getSubmitValue());
                            // dt_Date_Debut = me.getSubmitValue();
                            Ext.getCmp('dt_fin').setMinValue(me.getValue());
                            //  Ext.getCmp('GridArticleID').getStore().getProxy().url = url_services_data_modificationprix + " ?str_ACTION=" + str_TYPE_TRANSACTION+ "&dt_Date_Debut=" + dt_Date_Debut;

                        }
                    }
                }, {
                    xtype: 'datefield',
                    fieldLabel: 'Au',
                    name: 'dt_fin',
                    id: 'dt_fin',
                    labelWidth:15,
                     flex:1,
                    allowBlank: false,
                    maxValue: new Date(),
                    value:new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            // dt_Date_Fin = me.getSubmitValue();
                            Ext.getCmp('dt_debut').setMaxValue(me.getValue());
                            //   Ext.getCmp('GridArticleID').getStore().getProxy().url = url_services_data_modificationprix  + "?str_ACTION=" + str_TYPE_TRANSACT ION+ "&dt_Date_ D ebut=" + dt_Date_Debut +"&dt_Date_Fin="+dt_Date_Fin;

                        }
                    }
                }, {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                     
                     flex:1,
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
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    
                    handler: this.onRechClick
                }, {
                    text: 'Imprimer',
                    tooltip: 'imprimer',
                    scope: this,
                    iconCls: 'printable',
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
                            dt_Date_Debut: '',
                            dt_Date_Fin: '',
                            search_value: '',
                            str_ACTION: ''
                        };
                        var str_TYPE_TRANSACTION = "";
                        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue()) {
                            str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
                        }
                        myProxy.setExtraParam('dt_Date_Debut', Ext.getCmp('dt_debut').getSubmitValue());
                        myProxy.setExtraParam('dt_Date_Fin', Ext.getCmp('dt_fin').getSubmitValue());
                        myProxy.setExtraParam('search_value', Ext.getCmp('rechecher').getValue());
                        myProxy.setExtraParam('str_ACTION', str_TYPE_TRANSACTION);
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
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        var str_TYPE_TRANSACTION = "";
        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue()) {
            str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
        }
        if (new Date(Ext.getCmp('dt_debut').getSubmitValue()) > new Date(Ext.getCmp('dt_fin').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        this.getStore().load({
            params: {
                dt_Date_Debut: Ext.getCmp('dt_debut').getSubmitValue(),
                dt_Date_Fin: Ext.getCmp('dt_fin').getSubmitValue(),
                search_value: val.getValue(),
                str_ACTION: str_TYPE_TRANSACTION
            }
        }, url_services_data_modificationprix);
    },
    onPdfClick: function() {

        var str_TYPE_TRANSACTION = "";
        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue()) {
            str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
        }
        var linkUrl = url_services_data_modificationprix_generate_pdf + '?dt_Date_Debut=' + Ext.getCmp('dt_debut').getSubmitValue() + '&dt_Date_Fin=' + Ext.getCmp('dt_fin').getSubmitValue() + '&search_value=' + Ext.getCmp('rechecher').getValue() + '&str_ACTION=' + str_TYPE_TRANSACTION;


        window.open(linkUrl);
    }

});