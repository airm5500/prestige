var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.stockmanagement.etiquette.action.printEtiquette', {
    extend: 'Ext.window.Window',
    xtype: 'printEtiquetteadd',
    id: 'printEtiquetteaddID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        type: ''
    },
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        type = this.getType();

        Me = this;


        var str_DESCRIPTION = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'PRDUIT:',
                    name: 'str_DESCRIPTION',
                    id: 'str_DESCRIPTION',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        var int_CIP = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'CIP:',
                    name: 'int_CIP',
                    id: 'int_CIP',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

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
                    title: 'Information sur l\'etiquette a imprimer',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        int_CIP,
                        str_DESCRIPTION,
                        {
                            fieldLabel: 'Commencer à partir de:',
                            emptyText: 'Saisir un nombre',
                            name: 'intQUANTITY',
                            id: 'intQUANTITY',
                            value: 1,
                            minValue: 1,
                            maxValue: 65,
                            maskRe: /[0-9.]/,
                            listeners: {
                                afterrender: function(field) { // a decommenter apres les tests
                                    field.focus();
                                }
                            }
                        }
                    ]
                }
            ]
        });



        //Initialisation des valeur 


        if (Omode === "printer") {
            ref = this.getOdatasource().lg_ETIQUETTE_ID;
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().lg_FAMILLE_ID);
            Ext.getCmp('int_CIP').setValue(this.getOdatasource().int_CIP);
        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 300,
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
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function(button) {
        var win = button.up('window'), form = win.down('form');
        
        if(Ext.getCmp('intQUANTITY').getValue() > 65) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: 'Valeur ne doit pas depasser 65.',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
            return;
        }
        
        if (form.isValid()) {
            var linkUrl = url_services_pdf_etiquette + '?lg_ETIQUETTE_ID=' + ref + "&begin=" + Ext.getCmp('intQUANTITY').getValue();
            window.open(linkUrl);
            win.close();
            Me_Workflow = Oview;
            Me_Workflow.onRechClick();
        } else {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: 'Verifiez la valeur svp.',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
            return;
        }

    }
});
