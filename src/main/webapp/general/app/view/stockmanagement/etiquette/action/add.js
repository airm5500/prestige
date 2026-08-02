var url_services_pdf_fiche_etiquette = '../Etiquete';
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
                        },
                        {
                            fieldLabel: 'Mod&egrave;le d\'&eacute;tiquette',
                            name: 'modele_ETIQUETTE',
                            id: 'modele_ETIQUETTE',
                            xtype: 'combobox',
                            margin: '0 15 0 10',
                            store: [
                                ['', 'Défaut (configuration)'],
                                ['CARRE_38X21_2', 'Carré 38 x 21,2 mm (sans espace)'],
                                ['ARRONDI_38X21', 'Arrondi 38 x 21 mm'],
                                ['CARRE_38_1X21_2', 'Carré 38,1 x 21,2 mm (avec espaces)'],
                                ['PERSONNALISE', 'Personnalisé (configuration)']
                            ],
                            queryMode: 'local',
                            editable: false,
                            forceSelection: true,
                            value: ''
                        }
                    ]
                }
            ]
        });


        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 240,
            minWidth: 300,
            minHeight: 240,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Page de test',
                    tooltip: 'Imprime les contours des etiquettes pour verifier le calage',
                    handler: function() {
                        var modele = Ext.getCmp('modele_ETIQUETTE') ? (Ext.getCmp('modele_ETIQUETTE').getValue() || '') : '';
                        window.open('../Etiquete?test=1&modele_ETIQUETTE=' + encodeURIComponent(modele));
                    }
                }, {
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
        
        var modele = Ext.getCmp('modele_ETIQUETTE') ? (Ext.getCmp('modele_ETIQUETTE').getValue() || '') : '';
        var url = url_services_pdf_fiche_etiquette + '?lg_BON_LIVRAISON_ID=' + ref + "&int_NUMBER=" + Ext.getCmp('int_NUMBER').getValue() + "&modele_ETIQUETTE=" + encodeURIComponent(modele);
        window.open(url);
        this.up('window').close();
    }
});
