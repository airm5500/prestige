var url_services_transaction_lotarticle = '../webservices/configmanagement/lotarticle/ws_transaction.jsp?mode=';
var url_services_data_article = '../webservices/sm_user/famille/ws_data.jsp';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.lotarticle.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addlotarticle',
    id: 'addlotarticleID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;


        Me = this;
        var itemsPerPage = 20;
        var store_famille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_article,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });




        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information lot article',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Quantite',
                            emptyText: 'Quantite',
                            name: 'int_QUANTITE',
                            id: 'int_QUANTITE',
                            allowBlank: false,
                        },
                        {
                            fieldLabel: 'Quantite/produit',
                            emptyText: 'int_QUANTITE_FAMILLE_BYLOT',
                            name: 'int_QUANTITE_FAMILLE_BYLOT',
                            allowBlank: false,
                            id: 'int_QUANTITE_FAMILLE_BYLOT'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Date peromption',
                            name: 'dt_PEROMPTION',
                            id: 'dt_PEROMPTION',
                            allowBlank: false
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Article',
                            name: 'lg_FAMILLE_ID',
                            id: 'lg_FAMILLE_ID',
                            store: store_famille,
                            valueField: 'lg_FAMILLE_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un article...'
                        }
                    ]
                }]
        });







        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 800,
            height: 350,
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
    onbtnsave: function () {

        var internal_url = "";

        if (Omode === "create") {
            internal_url = url_services_transaction_lotarticle + 'create';
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID').getValue(),
                    int_QUANTITE: Ext.getCmp('int_QUANTITE').getValue(),
                    int_QUANTITE_FAMILLE_BYLOT: Ext.getCmp('int_QUANTITE_FAMILLE_BYLOT').getValue(),
                    dt_PEROMPTION: Ext.getCmp('dt_PEROMPTION').getValue()
                },
                success: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
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
        }

        this.up('window').close();
    }


});
