var url_services_data_compteclient = '../webservices/configmanagement/compteclient/ws_data.jsp';
var url_services_transaction_compteclient= '../webservices/configmanagement/compteclient/ws_transaction.jsp?mode=';
       
Ext.define('testextjs.view.configmanagement.CompteClientManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'compteclientmanager',
    id: 'compteclientmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.CompteClient',
        'testextjs.view.configmanagement.compteclient.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gest.CompteCLient',
     plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CompteClient',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_compteclient,
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
            width: 1000,
            height: 580,
            plugins: [this.cellEditing],
            store: store,

            columns: [{
                    header: 'lg_COMPTE_CLIENT_ID',
                    dataIndex: 'lg_COMPTE_CLIENT_ID',
                    hidden:true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },{
                    header: 'Code compte',
                    dataIndex: 'str_CODE_COMPTE_CLIENT',
                    flex: 1/*,
                    editor: {
                        allowBlank: false
                    }*/
                } ,{
                    header: 'Quota consommation mensuelle',
                    dataIndex: 'dbl_QUOTA_CONSO_MENSUELLE',
                    flex: 1/*,
                    editor: {
                        allowBlank: false
                    }*/

                },{
                    header: 'Caution',
                    dataIndex: 'dbl_CAUTION',
                    flex: 1/*,
                    editor: {
                        allowBlank: false
                    }*/

                },{
                    header: 'Client',
                    dataIndex: 'lg_CLIENT_ID',
                    flex: 1/*,
                    editor: {
                        allowBlank: false  
                    }*/
                },{
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick
                        }]
                },{
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
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
                },{
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                },'-',{
                    xtype: 'textfield',
                    id:'rechecher',
                    name: 'famille',
                    emptyText: 'Rech'
                },{
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        }),


        this.on('edit', function(editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_compteclient+'update',
                params: {
                    lg_COMPTE_CLIENT_ID : e.record.data.lg_COMPTE_CLIENT_ID,
                    str_CODE_COMPTE_CLIENT : e.record.data.str_CODE_COMPTE_CLIENT,
                    dbl_QUOTA_CONSO_MENSUELLE : e.record.data.dbl_QUOTA_CONSO_MENSUELLE,
                    dbl_CAUTION : e.record.data.dbl_CAUTION,
                    lg_CLIENT_ID : e.record.data.lg_CLIENT_ID
                    
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
    onManageFoneClick: function(grid, rowIndex){
    
//        var rec = grid.getStore().getAt(rowIndex);
//        var xtype = "userphonemanager";
//        var  alias ='widget.' + xtype;
//        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype,"",rec.get('str_FIRST_NAME'),rec.data);
//        
    },

    onAddClick: function(){

        new testextjs.view.configmanagement.compteclient.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Compte client"
        });
    },
    onPrintClick: function(){
       
        //alert("print");
        /*Ext.ux.grid.Printer.printAutomatically = false;
        Ext.ux.grid.Printer.print(grid);*/
        window.print();
         body :{
            visibility:visible
        }
        print: {
            visibility:visible
        }
          
               
    },

 onPdfClick: function () {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_compteclient;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "compteclientmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "compteclientmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },

    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                var rec = grid.getStore().getAt(rowIndex);
                Ext.Ajax.request({
                    url: url_services_transaction_compteclient+'delete',
                    params: {
                        lg_COMPTE_CLIENT_ID : rec.get('lg_COMPTE_CLIENT_ID')
                    },
                    success: function(response)
                    {
                        var object = Ext.JSON.decode(response.responseText,false);
                        if(object.success == 0){
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        }
                        grid.getStore().reload();
                    },
                    failure: function(response)
                    {
                       // alert("non ok");
                        var object = Ext.JSON.decode(response.responseText,false);
                        //  alert(object);

                        console.log("Bug "+response.responseText);
                        Ext.MessageBox.alert('Error Message', response.responseText);

                    }
                });
                return;
            });


    },
    onEditClick: function(grid, rowIndex){
        var rec = grid.getStore().getAt(rowIndex);

       
        new testextjs.view.configmanagement.compteclient.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification  Compte client  ["+rec.get('str_CODE_COMPTE_CLIENT')+"]"
        });

  

    },
    onEditpwdClick: function(grid, rowIndex){
//        var rec = grid.getStore().getAt(rowIndex);
//
//
//        new testextjs.view.sm_user.user.action.addpwd({
//            odatasource: rec.data,
//            parentview: this,
//            mode: "update",
//            titre: "Modification Groupe Famille  ["+rec.get('str_LibelleGroup')+"]"
//        });


    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_compteclient);
    }

});