var Omode;
var ref;
var Oview;
var me;

Ext.define('testextjs.view.sm_user.outboudmessage.action.add', {
    extend: 'Ext.window.Window',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        closable: true,
        nameintern: ''
    },
    xtype: 'detailmessage',
    id: 'detailmessageID',
    title: 'Detail du message',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        titre = this.getTitre();
        ref = this.getNameintern();
        Omode = this.getMode();
        Oview = this.getParentview();
        me = this;


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'container',
                    layout: 'vbox',
                    defaultType: 'textfield',
                    margin: '0 0 5 0',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            margin: '0 10 5 0',
                            items: [
                                {
                                    xtype: 'textareafield',
                                    grow: true,
                                    name: 'str_COMMENTAIRE_MOUVEMENT',
                                    fieldLabel: 'Commentaire',
                                    id: 'str_COMMENTAIRE_MOUVEMENT',
                                    anchor: '100%',

                                    emptyText: 'Saisir un commentaire'
                                }


                            ]
                        }
                    ]
                }

            ]
        });

        //this.callParent();

        if (Omode === "update") {
            ref = this.getOdatasource().lg_OUTBOUND_MESSAGE_ID;
            Ext.getCmp('str_COMMENTAIRE_MOUVEMENT').setValue(this.getOdatasource().str_MESSAGE);
        }

        var win_add_mvt_caisse = new Ext.window.Window({
            autoShow: true,
            id: 'paydebtID',
            height: 300,
            width: 670,
            layout: {
                type: 'fit'
            },
            // closable: false,
            resizable: false,
            title: this.getTitre(),
            items: form,
            buttons: [{
                    text: 'Renvoyer',
                    hidden: true,
                    handler: function() {
                        me.onReloadSmsClick
                    }
                }/*,{
                    text: 'Fermer',
                    id: 'btn_clt_anulerID',
                    handler: function() {
                        win_add_mvt_caisse.close();
                    }
                }*/]

        });


    },
    onReloadSmsClick: function() {
        Ext.MessageBox.confirm('Message',
                'Voulez-vous renvoyer la notification',
                function(btn) {
                    if (btn === 'yes') {
                        Ext.Ajax.request({
                            url: url_services_transaction_outboudmessage + 'reload',
                            params: {
                                lg_OUTBOUND_MESSAGE_ID: ref
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    Oview.getStore().reload();
                                }

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


    }
});


