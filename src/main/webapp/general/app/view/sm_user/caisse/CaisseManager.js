
var Me_caisse;

Ext.define('testextjs.view.sm_user.caisse.CaisseManager', {
    extend: 'Ext.form.Panel',
    xtype: 'caissemanger',
    id: 'caissemangerID',
    frame: true,
    title: 'Cl&ocirc;ture de Caisse',
    bodyPadding: 10,
    autoScroll: true,
    width: 420,
    fieldDefaults: {
        labelAlign: 'left',
        labelWidth: 115,
        msgTarget: 'side'
    },
    config: {
        nameintern: '',
        titre: ''
    },
    initComponent: function () {
        Me_caisse = this;
        this.items = [
            {
                xtype: 'fieldset',
                title: 'INFORMATION CAISSE',
                defaultType: 'displayfield',
                defaults: {
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    anchor: '100%',
                    labelWidth: 120
                },
                items: [
                    {
                        fieldLabel: 'NOM',
                        name: 'str_NAME_USER',
                        id: 'str_NAME_USER'
                    },
                    {
                        fieldLabel: 'FOND DE CAISSE',
                        name: 'int_AMOUNT_FOND_CAISSE',
                        id: 'int_AMOUNT_FOND_CAISSE'
                    },
                    {
                        xtype: 'hiddenfield',
                        name: 'lg_RESUME_CAISSE_ID',
                        id: 'lg_RESUME_CAISSE_ID'
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'INFORMATIONS SUPPLEMENTAIRES',
                defaultType: 'displayfield',
                defaults: {
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    labelWidth: 120,
                    anchor: '100%'
                },
                items: [
                    {
                        fieldLabel: 'DATE',
                        name: 'dt_CREATED',
                        id: 'dt_CREATED'
                    },
                    {
                        fieldLabel: 'CODE',
                        xtype: 'hiddenfield',
                        name: 'lg_CAISSE_ID',
                        id: 'lg_CAISSE_ID'
                    }
                ]
            }];

        this.callParent();

        this.LoadData();
    },
    buttons: [
        {
            text: 'Cl&ocirc;turer',
            tooltip: 'Cl&ocirc;ture de caisse',
            hidden: true,
            id: 'btn_validate',
            handler: function () {
                Ext.MessageBox.confirm('CONFIRMATION',
                        'Voulez-vous cl&ocirc;turer votre caisse',
                        function (btn) {
                            if (btn === 'yes') {
                             
                                 Me_caisse.doBilletage();
                          
                            }

                        });
            }
        }],
    LoadData: function () {
        Ext.Ajax.request({
            url: '../api/v1/billetage/cloture-data',
            success: function (response)
            {
               
                const object = Ext.JSON.decode(response.responseText, false);

                const caisse = object.data;
                Ext.getCmp('str_NAME_USER').setValue(caisse?.userFullName);
                Ext.getCmp('int_AMOUNT_FOND_CAISSE').setValue(Ext.util.Format.number(caisse?.cashFund, '0,000.') + " CFA");
                Ext.getCmp('lg_RESUME_CAISSE_ID').setValue(caisse?.resumeCaisseId);
                Ext.getCmp('dt_CREATED').setValue(caisse?.createAt);
                Ext.getCmp('lg_CAISSE_ID').setValue(caisse?.caisseId);
                if (caisse?.display === true) {
                    Ext.getCmp('btn_validate').show();
                }


            },
            failure: function (response)
            {
                const object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }

        });
    },
    doBilletage: function () {
        new testextjs.view.sm_user.caisse.action.DoBilletage({
            odatasource: Ext.getCmp('lg_RESUME_CAISSE_ID').getValue(),
            parentview: this,
            mode: "dobilletage",
            titre: "BILLETAGE"
        });
    }
});
