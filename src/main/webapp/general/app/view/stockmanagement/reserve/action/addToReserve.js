var url_services_data_reserve = '../webservices/stockmanagement/reserve/ws_data.jsp';
var url_services_transaction_reserve = '../webservices/stockmanagement/reserve/ws_transaction.jsp?mode=';
var url_services_data_famille_initial = '../webservices/sm_user/famille/ws_data_initial.jsp';


var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.stockmanagement.reserve.action.addToReserve', {
    extend: 'Ext.window.Window',
    xtype: 'addarticlereserve',
    id: 'addarticlereserveID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;

        var store_famille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille_initial,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


//        int_NUMBER = new Ext.form.field.Display(
//                {
//                    xtype: 'displayfield',
//                    fieldLabel: 'Quantite stock:',
//                    name: 'int_NUMBER',
//                    id: 'int_NUMBER',
//                    fieldStyle: "color:blue;",
//                    margin: '0 15 0 0',
//                    flex: 0.7
//
//                });

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information sur l\'article',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Article',
                            name: 'lg_FAMILLE_ID',
                            id: 'lg_FAMILLE_ID',
                            store: store_famille,
                            valueField: 'lg_FAMILLE_ID',
                            pageSize: 20, //ajout la barre de pagination
                            displayField: 'str_DESCRIPTION',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un article...',
                            listeners: {
                                change: function () {
                                    Me.onfiltercheck();
                                }/*,
                                select: function (cmp, rowIndex) {
                                    var value = cmp.getValue();
                                    var rec = cmp.getStore().getAt(rowIndex);

                                    alert("int_NUMBER_AVAILABLE " + rec.get('int_NUMBER_AVAILABLE'));
                                    
                                }*/
                            }
                        },
                        //int_NUMBER,
                        {
                            fieldLabel: 'Quantite assort',
                            emptyText: 'Quantite assort',
                            name: 'int_NUMBER_REASSORT',
                            id: 'int_NUMBER_REASSORT'
                        }
                    ]
                }
            ]
        });



        //Initialisation des valeur 



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 250,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onfiltercheck: function () {
        var lg_FAMILLE_ID = Ext.getCmp('lg_FAMILLE_ID').getValue();
        var int_name_size = lg_FAMILLE_ID.length;
        var OGrid = Ext.getCmp('lg_FAMILLE_ID');

        if (int_name_size > 3) {
            OGrid.getStore().getProxy().url = url_services_data_famille_initial + "?search_value=" + lg_FAMILLE_ID;
            OGrid.getStore().reload();
            //alert("lg_FAMILLE_ID "+lg_FAMILLE_ID);
        }
    },
    onbtnsave: function () {

        var internal_url = "";

        if (Omode === "assort") {
            internal_url = url_services_transaction_reserve + 'assort';
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID').getValue(),
                int_NUMBER: Ext.getCmp('int_NUMBER_REASSORT').getValue()
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                // alert(object.success);
                if (object.success == 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    Oview.getStore().reload();
                }


            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    }
});
