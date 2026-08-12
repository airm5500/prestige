var url_services_data_preenregistrement = '../webservices/sm_user/preenregistrement/ws_data.jsp';
var url_services_transaction_preenregistrement = '../webservices/sm_user/preenregistrement/ws_transaction.jsp?mode=';
var url_services_transaction_cloturercaisse = '../webservices/sm_user/cloturercaisse/ws_transaction.jsp?mode=';
var url_services_data_famille_select = '../webservices/sm_user/famille/ws_data.jsp';

var Oview;
var Omode;
var Me;
var ref;


var OgridpanelID;
var str_VENDEUR_INFOS;
var str_REFVENTE_INFOS;
var int_PRICE_INFOS;
var int_PRICE_RESUME;


Ext.define('testextjs.view.sm_user.cloturecaisse.action.cloturevente', {
    extend: 'Ext.window.Window',
    xtype: 'addcloturecaisse',
    id: 'addcloturecaisseID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    }, title: 'Choix Produit',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;

        str_VENDEUR_INFOS = "";
        str_REFVENTE_INFOS = "";
        int_PRICE_INFOS;
        int_PRICE_RESUME;

        var int_product_price;
        var int_qte;
        url_services_data_famille_select = '../webservices/sm_user/famille/ws_data.jsp';
        url_services_transaction_cloturercaisse = '../webservices/sm_user/cloturercaisse/ws_transaction.jsp?mode=';









        str_VENDEUR_INFOS = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Vendeur',
                    name: 'str_VENDEUR_INFOS',
                    id: 'str_VENDEUR_INFOS',
                    fieldStyle: "color:blue;",
                    emptyText: 'str_VENDEUR_INFOS'
                });
        str_REFVENTE_INFOS = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Ref.Pre-Vente',
                    name: 'str_REFVENTE_INFOS',
                    id: 'str_REFVENTE_INFOS',
                    fieldStyle: "color:blue;",
                    emptyText: 'str_REFVENTE_INFOS'
                });
        int_PRICE_INFOS = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total',
                    name: 'int_PRICE_INFOS',
                    id: 'int_PRICE_INFOS',
                    fieldStyle: "color:blue;",
                  //  style: "color:red;",
                    emptyText: 'int_PRICE_INFOS'
                });


        str_VENDEUR_INFOS.setValue(this.getOdatasource().lg_USER_ID);
        str_REFVENTE_INFOS.setValue(this.getOdatasource().str_REF);
        int_PRICE_INFOS.setValue(this.getOdatasource().int_PRICE);

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille_select,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });





        var form = new Ext.form.Panel({
            width: 850,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            items: ['gridpanelID', 'infos_vente'],
            autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    id: 'gridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            text: 'lg_FAMILLE_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_FAMILLE_ID'
                        }, {
                            header: 'Groupe Famille',
                            dataIndex: 'lg_GROUPE_FAMILLE_ID',
                            flex: 1

                        }, {
                            text: 'Nom',
                            flex: 1,
                            dataIndex: 'str_NAME'
                        }, {
                            text: 'Description',
                            flex: 1,
                            dataIndex: 'str_DESCRIPTION'
                        }, {
                            text: 'Prix',
                            flex: 1,
                            sortable: true,
                            // renderer: Ext.util.Format.dateRenderer('m/d/Y'),
                            dataIndex: 'int_PRICE'
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/add.gif',
                                    tooltip: 'Choisir Produit',
                                    scope: this,
                                    handler: this.onChooseProductClick
                                }]
                        }], tbar: [
                        {
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            emptyText: 'Rech'
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    listeners: {
                        scope: this/*,
                         selectionchange: this.onSelectionChange*/
                    }
                }, {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Infos Vente',
                    id: 'infos_vente',
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [
                        str_VENDEUR_INFOS,
                        str_REFVENTE_INFOS,
                        int_PRICE_INFOS
                    ]

                }]
        });


        this.callParent();
        OgridpanelID = Ext.getCmp('gridpanelID');


        //Initialisation des valeur


        if (Omode === "update") {
            ref = this.getOdatasource().lg_PREENREGISTREMENT_ID;
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 850,
            Height: 400,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Cloturer',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }]
        });

    }, onChooseProductClick: function(grid, rowIndex) {
        var rec = OgridpanelID.getStore().getAt(rowIndex);
        /*lg_FAMILLEID_CHOSEN = rec.get('lg_FAMILLE_ID');
        str_NAME_RESUME.setValue(rec.get('str_NAME'));
        int_PRICE_RESUME.setValue(rec.get('int_PRICE'));
        int_product_price = rec.get('int_PRICE');*/
    },
    DisplayTotal: function(int_price, int_qte) {
        var TotalAmount = 0;
        TotalAmount = int_qte * int_price;
        return TotalAmount;
    },
    onbtnsave: function() {

        var internal_url = "";


        if (Omode === "create") {
            internal_url = url_services_transaction_cloturercaisse + 'create';
        } else {
            internal_url = url_services_transaction_cloturercaisse + 'update&lg_PREENREGISTREMENT_ID=' + ref;
        }


        Ext.Ajax.request({
            url: internal_url,
            params: {
               // lg_FAMILLE_ID: lg_FAMILLEID_CHOSEN,
               // int_PRICE_RESUME: Ext.getCmp('int_PRICE_RESUME').getValue(),
              //  int_QUANTITY: Ext.getCmp('int_QUANTITY').getValue()

            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                Oview.getStore().reload();

            },
            failure: function(response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    },
    onRechClick: function() {

        var val = Ext.getCmp('rechercher');
        OgridpanelID.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_famille_select);
    }
});