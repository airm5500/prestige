//var url_services ='../webservices/sm_user/institution';
var url_services_data_preenregistrementcompteclienttierspayant = '../webservices/sm_user/preenregistrementcompteclienttierspayant/ws_data.jsp';
var url_services_transaction_preenregistrementcompteclienttierspayant= '../webservices/sm_user/preenregistrementcompteclienttierspayant/ws_transaction.jsp?mode=';
var url_services_pdf_preenregistrementcompteclienttierspayant = '../webservices/sm_user/preenregistrementcompteclienttierspayant/ws_generate_pdf.jsp';

Ext.define('testextjs.view.sm_user.preenregistrementcompteclienttierspayant.PreenregistrementcompteclienttierspayantManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'preenregistrementcompteclienttierspayant',
    id: 'preenregistrementcompteclienttierspayantID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Preenregistrementcompteclienttierspayant',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.Preenregistrementcompteclienttierspayant',    
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Preenregistrementcompteclienttierspayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_preenregistrementcompteclienttierspayant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        Ext.apply(this, {
            width: 950,
            height: 580,
            store: store,

            columns: [{
                header: 'lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID',
                dataIndex: 'lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },{
                header: 'REF PREENREGISTREMENT',
                dataIndex: 'lg_PREENREGISTREMENT_ID',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },
            {
                header: 'TIERS PAYANT',
                dataIndex: 'lg_TIERS_PAYANT_ID',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },
            {
                header: 'CLIENT',
                dataIndex: 'lg_CLIENT_ID',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },
            {
                header: 'MONTANT',
                dataIndex: 'int_PRICE',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },
                           
                {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                    icon: 'resources/images/icons/fam/delete.gif',
                    tooltip: 'Delete Plant',
                    scope: this,
                    handler: this.onRemoveClick
                }]
            }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Imprimer',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler : this.onPdfClick
                },'-',{
                xtype: 'textfield',
                id:'rechecher',
                name: 'preenregistrementcompteclienttierspayant',

                emptyText: 'Rech'
            },{
                text: 'rechercher',
                tooltip: 'rechercher',
                scope: this,
                handler: this.onRechClick
            }],
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
        }),


        this.on('edit', function(editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_preenregistrementcompteclienttierspayant+'update',
                params: {
                    lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID : e.record.data.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID,
                    lg_PREENREGISTREMENT_ID : e.record.data.lg_PREENREGISTREMENT_ID,
                    lg_COMPTE_CLIENT_ID : e.record.data.lg_COMPTE_CLIENT_ID,
                    int_NUMBER : e.record.data.int_NUMBER            
                },
                success: function(response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function(response)
                {
                    console.log("Bug "+response.responseText);
                    alert(response.responseText);
                }
            });
        });


    },


    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },

    onStoreLoad: function(){
    },

 onPdfClick: function () {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_preenregistrementcompteclienttierspayant;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "preenregistrementcompteclienttierspayant";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "preenregistrementcompteclienttierspayant";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    
    onAddClick: function(){
        // Create a model instance
        var rec = new testextjs.view.sm_user.preenregistrementcompteclienttierspayant.action.add({
            lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID: 'init',
            lg_PREENREGISTREMENT_ID: '',
            lg_COMPTE_CLIENT_ID: ''
            

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_preenregistrementcompteclienttierspayant+'delete',
                        params: {
                            lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID : rec.get('lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID')
                        },
                        success: function(response)
                        {
                            var object = Ext.JSON.decode(response.responseText,false);
                            if(object.success === 0){
                                Ext.MessageBox.alert('Error Message', object.errors);
                                return;
                            }
                            grid.getStore().reload();
                        },
                        failure: function(response)
                        {

                            var object = Ext.JSON.decode(response.responseText,false);
                            //  alert(object);

                            console.log("Bug "+response.responseText);
                            Ext.MessageBox.alert('Error Message', response.responseText);

                        }
                    });
                    return;
                });


    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_preenregistrementcompteclienttierspayant);
    }

});