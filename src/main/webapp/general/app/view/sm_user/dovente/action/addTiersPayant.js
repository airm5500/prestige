var url_services_data_tierspayant_dovente = '../webservices/tierspayantmanagement/clienttierspayant/ws_data.jsp?lg_COMPTE_CLIENT_ID=';
url_services_transaction_tierspayant_dovente = '../webservices/configmanagement/compteclienttierspayant/ws_transaction_clt.jsp?mode=';

var OTiersPayantgridpanelID;
var OadddoventeID;
var Oview;
var Omode;
var Me;
var ref;

var ref_compte_clt;


var str_tp_chosen;
var id_tp_chosen;
var percentage_tp_chosen;


var tp_id;
var tp_name;
var tp_percentage;
var tp_clt_name;
var win;
var str_tab_tp = [];


Ext.define('testextjs.view.sm_user.dovente.action.addTiersPayant', {
    extend: 'Ext.window.Window',
    xtype: 'addTiersPayant',
    id: 'aaddTiersPayantID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.HBox',
        'testextjs.model.dd.Simple',
        'testextjs.model.CompteClientTierspayant',
        'Ext.selection.CellModel',
        'Ext.ux.CheckColumn'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function() {

        ref = this.getOdatasource();
      ref_compte_clt = ref;
        var url_services_data_tierspayant_dovente_fonal = '../webservices/tierspayantmanagement/clienttierspayant/ws_data.jsp?lg_COMPTE_CLIENT_ID=' + ref;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CompteClientTierspayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant_dovente_fonal,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
          

        });



        str_tp_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Tiers.Payant : ',
                    labelWidth: 95,
                    name: 'str_tp_chosen',
                    id: 'str_tp_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Tiers.Payant.Nom'
                });

        id_tp_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Id.Tiers.Payant : ',
                    labelWidth: 110,
                    name: 'id_tp_chosen',
                    id: 'id_tp_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Tiers.Payant.Id'
                });

        percentage_tp_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Pourcentage.Tiers.Payant : ',
                    labelWidth: 180,
                    name: 'percentage_tp_chosen',
                    id: 'percentage_tp_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Tiers.Payant.Pourcentage'
                });


        var form = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            items: ['TiersPayantgridpanelID', 'resume_choix_tp'],
           // autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    id: 'TiersPayantgridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            xtype: 'rownumberer',
                            text: 'Ligne',
                            width: 45,
                            sortable: true/*,
                             locked: true*/
                        }, {
                            text: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID'
                        }, {
                            text: 'lg_TIERS_PAYANT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_TIERS_PAYANT_ID'
                        }, {
                            text: 'Tiers.Payant',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_CODE_ORGANISME'
                        }, {
                            text: 'Pourcentage',
                            flex: 1,
                            dataIndex: 'int_POURCENTAGE'
                        }, {
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
                        }],
                    tbar: [
                        {
                            text: 'Ajouter.Tiers.Payant',
                            scope: this,
                            handler: this.onAddClick
                        }, '-', {
                            xtype: 'textfield',
                            id: 'rechercher_tp',
                            name: 'user',
                            emptyText: 'Rech'
                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    listeners: {
                        scope: this},
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true
                    }
                }, {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Resume Choix',
                    id: 'resume_choix_tp',
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [
                        id_tp_chosen,
                        str_tp_chosen,
                        percentage_tp_chosen

                    ]

                }]
        });

        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        OTiersPayantgridpanelID = Ext.getCmp('TiersPayantgridpanelID');
        OadddoventeID = Ext.getCmp('cltwinID');


        win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            width: 1150,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'OK',
                    id: 'btn_tp_savechoseID',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }]
        });


        win.down('#btn_tp_savechoseID').disable();
    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    }, onChooseTiersPayantClick: function(grid, rowIndex) {

        var rec = OTiersPayantgridpanelID.getStore().getAt(rowIndex);

        id_tp_chosen.setValue(rec.get('lg_TIERS_PAYANT_ID'));
        str_tp_chosen.setValue(rec.get('str_CODE_ORGANISME'));
        percentage_tp_chosen.setValue(rec.get('int_POURCENTAGE'));


        tp_id = rec.get('lg_TIERS_PAYANT_ID');
        tp_name = rec.get('str_CODE_ORGANISME');
        tp_percentage = rec.get('int_POURCENTAGE');

        win.down('#btn_tp_savechoseID').enable();
    },
    onbtnsave: function() {
        var xtype = "doventemanager";
        this.up('window').close();
        OadddoventeID.close();
        testextjs.app.getController('App').onLoadNewComponentWith4DataSource(xtype, "by_cloturer_vente_addtp", tp_percentage, ref_compte_clt, str_tab_tp, tp_clt_name, tp_name);
    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.dovente.action.addTiersPayantItem({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Tiers.Payant du client  [" + rec.get('str_CODE_ORGANISME') + "]"
        });
    },
    onChooseTiersClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.dovente.action.addTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "updatecarnet",
            titre: "Tiers.Payant  Client  [" + rec.get('str_LAST_NAME') + "]"
        });
    },
    onAddClick: function() {

        new testextjs.view.sm_user.dovente.action.addTiersPayantItem({
            odatasource: ref_compte_clt,
            parentview: this,
            mode: "create",
            titre: "Ajouter Tiers.Payant"
        });
    }, onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion', function(btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_tierspayant_dovente + 'delete',
                            params: {
                                lg_COMPTE_CLIENT_TIERS_PAYANT_ID: rec.get('lg_COMPTE_CLIENT_TIERS_PAYANT_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });

    },
    DisplayTotal: function(int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        return TotalAmount;
    },
    DisplayMonnaie: function(int_total, int_amount_recu) {
        var TotalMonnaie = 0;
        Ext.getCmp('int_REEL_RESTE').setValue(int_amount_recu - int_total);
        if (int_total <= int_amount_recu) {
            var TotalMonnaie_temp = int_amount_recu - int_total;
            TotalMonnaie = Number(TotalMonnaie_temp);
            return TotalMonnaie;
        } else {
            return null;
        }
        return TotalMonnaie;
    },
    onsplitovalue: function(Ovalue) {

        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];

        return int_ovalue;
    },
    onCheckedClick: function(grid, rowIndex, checked) {
        /*var rec = OTiersPayantgridpanelID.getStore().getAt(rowIndex);
         var tp_id = "";
         if (checked) {
         tp_id = rec.get('lg_TIERS_PAYANT_ID');
         str_tab_tp.push(tp_id);
         
         
         alert("tp_id  " + tp_id);
         }*/


        // if (!checked) {

        //  alert("rowIndex  " + rowIndex);

        //  alert("str_tab_tp.length  " + str_tab_tp.length);
        //for (var i = 0; i < str_tab_tp.length; i++) {
        //  alert("str_tab_tp[i]  " + str_tab_tp[rowIndex] + "  rec.get('lg_TIERS_PAYANT_ID')  " + rec.get('lg_TIERS_PAYANT_ID'));

        // str_tab_tp.splice(rowIndex, 1);
        // if (str_tab_tp[rowIndex] === rec.get('lg_TIERS_PAYANT_ID'))
        //   str_tab_tp.splice(rowIndex, 1);
        // }

        // str_tab_tp.splice(rowIndex, 1);
        /*for (var i = str_tab_tp.length - 1; i >= 0; i--) {    
         alert(" i =  "+i+" rowIndex  "+rowIndex);
         if (i === rowIndex) {
         str_tab_tp.splice(i, 1);
         }
         }*/
        //  }
        //  alert(" vs avez choisi  " + str_tab_tp.length);



    },
    onRechClick: function() {

        var val = Ext.getCmp('rechercher_tp');
        OTiersPayantgridpanelID.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_tierspayant_dovente);
    },
    GetAllRowsSelected: function() {

        OTiersPayantgridpanelID.getSelectionModel().on('selectionchange', function(sm, selectedRecord) {
            if (selectedRecord.length) {
                var rowIndex = OTiersPayantgridpanelID.store.indexOf(selectedRecord);
                var gridrecord = OTiersPayantgridpanelID.getSelectionModel().getSelected();
                alert(gridrecord);
            }
        });
    }
});