

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
    statics: {
        // Quand l'ecran est ouvert en fenetre modale (ex. caisse fermee pendant un
        // reglement de facture), on ferme simplement la fenetre pour revenir a l'ecran
        // appelant ; sinon navigation historique via xtypeload.
        retourNavigation: function () {
            var vue = Ext.getCmp('ouverturecaissemangerID');
            if (!vue) {
                return;
            }
            var win = vue.up('window');
            if (win) {
                win.close();
            } else {
                testextjs.view.sm_user.ouverturecaisse.OuverturecaisseManager.retourNavigation();
            }
        }
    },
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
                        // La caisse vient d'etre ouverte : on relit l'etat pour que le bouton
                        // "Ouvrir caisse" disparaisse et laisse place a la date d'ouverture.
                        // Sans cela il restait actif et invitait a une seconde ouverture, que
                        // l'ecran soit venu du menu ou de la fenetre modale de la vente.
                        Me.LoadData();
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
                        testextjs.view.sm_user.ouverturecaisse.OuverturecaisseManager.retourNavigation();
                    }
                    testextjs.view.sm_user.ouverturecaisse.OuverturecaisseManager.retourNavigation();
                });

    },
    lunchPrinter: function (str_REF) {

        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/caisse/ticke-mvt-caisse?mvtCaisseId=' + str_REF,

            success: function (response)
            {

                testextjs.view.sm_user.ouverturecaisse.OuverturecaisseManager.retourNavigation();

            },
            failure: function (response)
            {
                testextjs.app.getController('App').onLoadNewComponent("ouverturecaisseempmanager", "Attribution Caisse Emp");
            }
        });
    }
});
