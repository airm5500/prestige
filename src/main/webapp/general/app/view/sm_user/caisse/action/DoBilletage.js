


var Me_dobilletage;
var ref_resume;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.sm_user.caisse.action.DoBilletage', {
    extend: 'Ext.window.Window',
    xtype: 'DoBilletage',
    id: 'DoBilletageID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column'
    ],
    config: {
        odatasource: '',
        o2ndatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: '',
        from: ''
    },
    title: 'BILLETAGE',
    bodyPadding: 5,
    layout: 'column',
    closable: false,
    initComponent: function () {

        Me_dobilletage = this;

        ref_resume = Me_dobilletage.getOdatasource();

        var form = new Ext.form.Panel({
            bodyPadding: 5,
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
                    //margin: '0 0 15 0',
                    items: [
                        {
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 0,
                            value: 0,
                            name: 'int_NB_DIX',
                            id: 'int_NB_DIX',
                            fieldLabel: '10.000 :',
                            flex: 1,
                            emptyText: '10.000',
                            listeners: {
                                change: function () {
                                    Me_dobilletage.getTotalBilletage();

                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 0,
                            value: 0,
                            name: 'int_NB_CINQ',
                            id: 'int_NB_CINQ',
                            fieldLabel: '5.000 :',
                            flex: 1,
                            emptyText: '5.000',
                            listeners: {
                                change: function () {
                                    Me_dobilletage.getTotalBilletage();

                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 0,
                            value: 0,
                            name: 'int_NB_DEUX',
                            id: 'int_NB_DEUX',
                            fieldLabel: '2.000 :',
                            flex: 1,
                            emptyText: '2.000',
                            listeners: {
                                change: function () {
                                    Me_dobilletage.getTotalBilletage();

                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 0,
                            value: 0,
                            name: 'int_NB_MIL',
                            id: 'int_NB_MIL',
                            fieldLabel: '1.000 :',
                            flex: 1,
                            emptyText: '1.000',
                            listeners: {
                                change: function () {
                                    Me_dobilletage.getTotalBilletage();

                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 0,
                            value: 0,
                            name: 'int_NB_CINQ_CENT',
                            id: 'int_NB_CINQ_CENT',
                            fieldLabel: '500 :',
                            flex: 1,
                            emptyText: '500',
                            listeners: {
                                change: function () {
                                    Me_dobilletage.getTotalBilletage();

                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 0,
                            value: 0,
                            name: 'int_NB_AUTRE',
                            id: 'int_NB_AUTRE',
                            fieldLabel: 'AUTRE :',
                            flex: 1,
                            emptyText: 'AUTRE',
                            listeners: {
                              
                                change: function () {
                                    Me_dobilletage.getTotalBilletage();

                                }

                            }
                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'TOTAL',
                            name: 'int_TOTAL',
                            fieldStyle: "color:red;font-weight: bold; font-size:1.5em;",
                            id: 'int_TOTAL',
                            value: 0 + " CFA",
                            emptyText: 'Total saisi'
                        }
                    ]
                }

            ]
        });
        this.callParent();
        win_dobilletage = new Ext.window.Window({
            autoShow: true,
            id: 'do_billetage_ID',
            title: this.getTitre(),
            width: 400,
            height: 330,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'VALIDER',
                    //  hidden: true,
                    handler: function () {
                        Me_dobilletage.onbtnsave_dobilletage();
                    }
                }, {
                    text: 'Annuler',
                    // hidden: true,
                    handler: function () {
                        win_dobilletage.close();
                    }
                }]

        });
    },
    onbtnsave_dobilletage: function () {

        if (Ext.getCmp('int_NB_DIX').getValue() === null && Ext.getCmp('int_NB_CINQ').getValue() === null && Ext.getCmp('int_NB_DEUX').getValue() === null && Ext.getCmp('int_NB_MIL').getValue() === null && Ext.getCmp('int_NB_CINQ_CENT').getValue() === null && Ext.getCmp('int_NB_AUTRE').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez au moins un champs svp');
            return;
        }
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../api/v1/billetage/cloture',
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode({resumeCaisseId: ref_resume,
                dixMille: Ext.getCmp('int_NB_DIX').getValue(),
                cinqMille: Ext.getCmp('int_NB_CINQ').getValue(),
                deuxMille: Ext.getCmp('int_NB_DEUX').getValue(),
                mille: Ext.getCmp('int_NB_MIL').getValue(),
                cinqCent: Ext.getCmp('int_NB_CINQ_CENT').getValue(),
                autre: Ext.getCmp('int_NB_AUTRE').getValue()}),

            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                const object = Ext.JSON.decode(response.responseText, false);
                if (object.success) {
                    win_dobilletage.close();
                    Ext.MessageBox.show({
                        title: 'INFO',
                        width: 400,
                        msg: 'Opération effectuée avec succès',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.INFO,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");
                            }
                        }
                    });

                }


            },
            failure: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                const object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + object);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    },
    getTotalBilletage: function () {
        let int_NB_DIX = 0, int_NB_CINQ = 0, int_NB_DEUX = 0, int_NB_MIL = 0, int_NB_CINQ_CENT = 0, int_NB_AUTRE = 0, Total = 0;

        if (Ext.getCmp('int_NB_DIX').getValue() != null) {
            int_NB_DIX = Number(Ext.getCmp('int_NB_DIX').getValue()) * 10000;
        }
        if (Ext.getCmp('int_NB_CINQ').getValue() != null) {
            int_NB_CINQ = Number(Ext.getCmp('int_NB_CINQ').getValue()) * 5000;
        }
        if (Ext.getCmp('int_NB_DEUX').getValue() != null) {
            int_NB_DEUX = Number(Ext.getCmp('int_NB_DEUX').getValue()) * 2000;
        }

        if (Ext.getCmp('int_NB_MIL').getValue() != null) {
            int_NB_MIL = Number(Ext.getCmp('int_NB_MIL').getValue()) * 1000;
        }
        if (Ext.getCmp('int_NB_CINQ_CENT').getValue() != null) {
            int_NB_CINQ_CENT = Number(Ext.getCmp('int_NB_CINQ_CENT').getValue()) * 500;
        }
        if (Ext.getCmp('int_NB_AUTRE').getValue() != null) {
            int_NB_AUTRE = Number(Ext.getCmp('int_NB_AUTRE').getValue());
        }
        Total = int_NB_DIX + int_NB_CINQ + int_NB_DEUX + int_NB_MIL + int_NB_CINQ_CENT + int_NB_AUTRE;
        Ext.getCmp('int_TOTAL').setValue(Ext.util.Format.number(Total, '0,000.') + " CFA");
    }

});