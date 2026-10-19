//var url_services ='../webservices/configmanagement/institution';
var url_services_data_contreindication = '../webservices/configmanagement/contreindication/ws_data.jsp';
var url_services_transaction_contreindication= '../webservices/configmanagement/contreindication/ws_transaction.jsp?mode=';
var url_services_pdf_contreindication = '../webservices/configmanagement/contreindication/ws_generate_pdf.jsp';

Ext.define('testextjs.view.configmanagement.contreindication.ContreIndicationManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'contreindicationmanager',
    id: 'contreindicationmanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.ContreIndication',
    'testextjs.view.configmanagement.contreindication.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des codes de Contre-indication', 
     plain: true,
        maximizable: true,
       // tools: [{type: "pin"}],
       // closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.ContreIndication',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_contreindication,
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
            height: 580,
            plugins: [this.cellEditing],
            store: store,

            columns: [{
                header: 'lg_CONTRE_INDICATION_ID',
                dataIndex: 'lg_CONTRE_INDICATION_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },{
                header: 'Code contre indication',
                dataIndex: 'str_CODE_CONTRE_INDICATION',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Libelle contre indication',
                dataIndex: 'str_LIBELLE_CONTRE_INDICATION',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                    icon: 'resources/images/icons/fam/delete.gif',
                    tooltip: 'Supprimer',
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
                },
            {
                text: 'Creer',
                scope: this,
                handler: this.onAddClick
            },'-',{
                xtype: 'textfield',
                id:'rechecher',
                name: 'contreindication',

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
                url: url_services_transaction_contreindication+'update',
                params: {
                    lg_CONTRE_INDICATION_ID : e.record.data.lg_CONTRE_INDICATION_ID,
                    str_CODE_CONTRE_INDICATION : e.record.data.str_CODE_CONTRE_INDICATION,
                    str_LIBELLE_CONTRE_INDICATION : e.record.data.str_LIBELLE_CONTRE_INDICATION
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
        var linkUrl = url_services_pdf_contreindication;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "contreindicationmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "contreindicationmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    
    onAddClick: function(){
        // Create a model instance
        var rec = new testextjs.view.configmanagement.contreindication.action.add({
            lg_CONTRE_INDICATION_ID: 'init',
            str_CODE_CONTRE_INDICATION: '',
            str_LIBELLE_CONTRE_INDICATION: ''
            

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_contreindication+'delete',
                        params: {
                            lg_CONTRE_INDICATION_ID : rec.get('lg_CONTRE_INDICATION_ID')
                        },
                        success: function(response)
                        {
                            var object = Ext.JSON.decode(response.responseText,false);
                            if(object.success == 0){
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_CONTRE_INDICATION') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_CONTRE_INDICATION') + ']', 'Suppression effectuee avec succes');
//                                    
                                
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
        }, url_services_data_contreindication);
    }

});