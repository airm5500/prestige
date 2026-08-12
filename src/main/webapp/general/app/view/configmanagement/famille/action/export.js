var Oview;
var Omode;
var Me_Child;
var titre;
var type;


Ext.define('testextjs.view.configmanagement.famille.action.export', {
    extend: 'Ext.window.Window',
    xtype: 'addexport',
    id: 'addexportID',
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
        titre = this.getTitre();
        type = this.getType();


        Me_Child = this;

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'csv', str_desc: 'CSV'}, {str_TYPE_TRANSACTION: 'xls', str_desc: 'EXCEL'}]
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
                    title: 'Information sur l\'exportation',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type de fichier',
                            name: 'str_TYPE_TRANSACTION_EXPORT',
                            id: 'str_TYPE_TRANSACTION_EXPORT',
                            store: store_type,
                            allowBlank: false,
                            valueField: 'str_TYPE_TRANSACTION',
                            displayField: 'str_desc',
                            editable: false,
                            queryMode: 'local',
                            emptyText: 'Choisir un type de fichier...'
                        }
                    ]
                }
            ]
        });



        //Initialisation des valeur 



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 250,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }]
        });

    },
    onbtnsave: function(button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var url_services_export = '../MigrationServlet';


        if (formulaire.isValid()) {

            Ext.Ajax.request({
                url: url_services_export,
                waitMsg: 'Veuillez patienter le temps du traitement des donnees de l\'exportation...',
                params: {
                    table_name: type,
                    extension: Ext.getCmp('str_TYPE_TRANSACTION_EXPORT').getValue()
                },
                success: function(response)
                {
                    /*var bouton = button.up('window');
                    bouton.close();*/
                    Me = Oview;

                },
                failure: function(response)
                {
                    Ext.MessageBox.alert('Error Message', 'Echec de l\'exportation');
                }
            });
        } else {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide. Verifiez votre saisie');
            return;
        }


        // this.up('window').close();
    }
});
