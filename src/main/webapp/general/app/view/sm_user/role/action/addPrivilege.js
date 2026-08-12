var url_services_data_module ='../webservices/sm_user/module/ws_data.jsp';
var url_services_data_menu = '../webservices/sm_user/menu/ws_data.jsp';
var url_services_transaction_menu= '../webservices/sm_user/menu/ws_transaction.jsp?mode=';

var url_services_data_Privilege = '../webservices/sm_user/privilege/ws_role_data.jsp';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.role.action.addPrivilege', {
    extend: 'Ext.window.Window',
    xtype: 'addprivilege',
    id: 'addprivilegeID',

    requires: [
    'Ext.form.*',
    'Ext.window.Window',
    'testextjs.store.Statut',
    'Ext.grid.*',
    'Ext.layout.container.HBox',
    'testextjs.model.dd.Simple',
    'testextjs.view.sm_user.role.action.addPrivilegeItem'
    ],

    config: {
        odatasource:'',
        parentview:'',
        mode :'',
        titre :''
    },

    initComponent: function() {

     //  alert(this.getOdatasource().str_DESIGNATION);

       ref = this.getOdatasource().lg_ROLE_ID;

        var form = new testextjs.view.sm_user.role.action.addPrivilegeItem({
            odatasource: this.getOdatasource(),
            parentview: this,
            mode: "update",
            titre: "Attribution des privileges pour le role ["+this.getOdatasource().str_DESIGNATION+"]"
            });
        this.callParent();

        var win =  new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 650,
            height:450,
            minWidth: 500,
            minHeight: 300,
            layout: 'fit',
            plain: true,
            items: form,

            buttons: [/*{
                text: 'Enregistrer',
                handler:  this.onbtnsave
            },{
                text: 'Annuler',
                handler:function (){
                    win.close()
                }
            }*/]
        });


    },
    onbtnsave:function(){


    },

    onResetClick: function(){
        //refresh source grid
        
        alert("rdrd");

        this.down('#grid2').getStore().removeAll();
        this.down('#grid1').getStore().loadData(this.myData);

        //purge destination grid
        this.down('#grid2').getStore().removeAll();
    }
});