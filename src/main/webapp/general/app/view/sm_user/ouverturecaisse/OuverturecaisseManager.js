

var Me;


Ext.define('testextjs.view.sm_user.ouverturecaisse.OuverturecaisseManager', {
    extend: 'Ext.form.Panel',
    xtype: 'ouverturecaissemanger',
    id: 'ouverturecaissemangerID',
    frame: true,
    title: 'Ouverture de Caisse',
    bodyPadding: 10,
    autoScroll: true,
    width: 420,
    fieldDefaults: {
        labelAlign: 'left',
        labelWidth: 100
    
    },
    closable: false,
    initComponent: function () {
        Me = this;
        this.items = [{
                xtype: 'fieldset',
                title: 'INFORMATIONS TRANSACTIONS',
                defaultType: 'displayfield',
                defaults: {
                    anchor: '100%',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;"
                },
                items: [
                    {
                        xtype: 'hiddenfield',
                        name: 'id',
                        id: 'coffreCaisseId'
                    }, {
                        fieldLabel: 'Nom',
                        name: 'firstName',
                        id: 'coffreCaisseFirstName'
                    }
                    , {
                        fieldLabel: 'Prénom',
                        name: 'lastName',
                        id: 'coffreCaisseLastName'
                    },
                    {
                        xtype: 'numberfield',
                        height: 30,
                        fieldLabel: 'Montant',
                        name: 'amount',
                        id: 'coffreCaisseAmount',
                        minValue: 0,
                        listeners: {
                            afterrender: function (field) {
                                field.focus(false, 100);
                            }
                        }
                    },
                    {
                     
                        name: 'createAt',
                        fieldLabel: 'Ouverte à:',
                        id: 'createAt'
                    }

                ]
            }];

        this.callParent();

        this.LoadData();
    },
    buttons: [{
            text: 'Ouvrir caisse',
            id: 'btnValidate',
            tooltip: 'Ouverture de caisse',
            handler: function (btn) {
                testextjs.app.getController('App').ShowWaitingProcess();
                let formData = btn.up('form').getValues();

                Ext.Ajax.request({
                    method: 'POST',
                    url: '../api/v1/caisse/ouvrir-caisse',
                    headers: {'Content-Type': 'application/json'},
                    params: Ext.JSON.encode(formData),

                    success: function (response)
                    {
                        testextjs.app.getController('App').StopWaitingProcess();
                        const object = Ext.JSON.decode(response.responseText, false);
                        Me.onbtnprint(object.mvtId);
                    },
                    failure: function (response)
                    {

                        Ext.MessageBox.alert('Error Message', response);

                    }
                });

            }
        }],
    LoadData: function () {
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/billetage/ouventure-data',
            success: function (response)
            {
                const object = Ext.JSON.decode(response.responseText, false);
                const caisse = object.data;
                Ext.getCmp('coffreCaisseId').setValue(caisse.id);
                Ext.getCmp('coffreCaisseFirstName').setValue(caisse.firstName);
                Ext.getCmp('coffreCaisseLastName').setValue(caisse.lastName);
                Ext.getCmp('coffreCaisseAmount').setValue(caisse.amount);

                const btnValidate = Ext.getCmp('btnValidate');
                if (caisse.inUse) {
                    btnValidate.hide();
                    Ext.getCmp('createAt').show();
                    Ext.getCmp('createAt').setValue(caisse.createAt);
                } else {
                    btnValidate.show();
                    Ext.getCmp('createAt').hide();
                }

            },
            failure: function (response)
            {
                const object = Ext.JSON.decode(response.responseText, false);
                console.log(object);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }

        });
    },
    onbtnprint: function (ref) {
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression du ticket',
                function (btn) {
                    if (btn == 'yes') {
                        Me.lunchPrinter(ref);

                    } else {
                        testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");
                    }
                    testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");
                });

    },
    lunchPrinter: function (str_REF) {

        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/caisse/ticke-mvt-caisse?mvtCaisseId=' + str_REF,

            success: function (response)
            {

                testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");

            },
            failure: function (response)
            {
                testextjs.app.getController('App').onLoadNewComponent("ouverturecaisseempmanager", "Attribution Caisse Emp");
            }
        });
    }
});
