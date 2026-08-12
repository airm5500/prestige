var url_services_transaction_privilege = '../webservices/sm_user/privilege/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.privilege.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addprivilege',
    id: 'addprivilegeID',
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
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information privilege',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Composant',
                            emptyText: 'Composant',
                            name: 'str_NAME',
                            id: 'str_NAME'
                        }, {
                            fieldLabel: 'Description',
                            emptyText: 'Description',
                            id: 'str_DESCRIPTION',
                            name: 'str_DESCRIPTION'
                        },
                        {
                            fieldLabel: 'str_TYPE',
                            emptyText: 'str_TYPE',
                            hidden: true,
                            name: 'str_TYPE',
                            id: 'str_TYPE'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode == "update") {

            ref = this.getOdatasource().lg_PRIVELEGE_ID;

            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_NAME').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_TYPE').setValue(this.getOdatasource().str_TYPE);
           
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 320,
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
                    handler: function() {
                        win.close()
                    }
                }]
        });

    },
    onbtnsave: function() {
        var internal_url = "";
        if (Omode == "create") {
            internal_url = url_services_transaction_privilege + 'create';
        } else {
            internal_url = url_services_transaction_privilege + 'update&lg_PRIVELEGE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                str_NAME: Ext.getCmp('str_NAME').getValue(),
                str_TYPE: Ext.getCmp('str_TYPE').getValue()
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == 0) {
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
    }
});
