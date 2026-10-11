var url_services_pdf_fiche_etiquette = '../webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf.jsp';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.stockmanagement.etiquette.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addetiquette',
    id: 'addetiquetteID',
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
        ref = this.getOdatasource();

        Me = this;


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information sur l\'etiquette',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Commencer l\'impression &agrave; partir de:',
                            name: 'int_NUMBER',
                            id: 'int_NUMBER',
                            xtype: 'numberfield',
                            fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                            margin: '0 15 0 10',
                            minValue: 1,
                            flex: 1,
                            value: 1,
                            allowBlank: false,
                            regex: /[0-9.]/
                        }
                    ]
                }
            ]
        });


        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 200,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Imprimer',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function() {
        if (parseInt(Ext.getCmp('int_NUMBER').getValue()) > 65 || parseInt(Ext.getCmp('int_NUMBER').getValue()) < 1) {
            Ext.MessageBox.show({
                title: 'Avertissement',
                width: 320,
                msg: 'Veuillez renseigner un nombre inférieur ou égal à 65 et supérieur à 0',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function(buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('int_NUMBER').focus(false, 100, function() {
                            this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                        });
                    }
                }
            });

            return;
        }
        
       // '../Etiquete?lg_BON_LIVRAISON_ID=' + ref + "&int_NUMBER=" + Ext.getCmp('int_NUMBER').getValue();
        var url = url_services_pdf_fiche_etiquette + '?lg_BON_LIVRAISON_ID=' + ref + "&int_NUMBER=" + Ext.getCmp('int_NUMBER').getValue();
        var preset = {source: 'BL', id: ref, position: Ext.getCmp('int_NUMBER').getValue()};
        this.up('window').close();
        /* retours du 11/10 : apercu d'Etiquettage Pro pour ce bon, sinon impression historique */
        testextjs.view.stockmanagement.etiquetagepro.Passerelle.imprimer(preset, function () {
            window.open(url);
        });
    }
});
