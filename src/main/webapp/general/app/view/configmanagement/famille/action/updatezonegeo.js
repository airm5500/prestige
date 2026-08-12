var winZoneGeoOuverte = null;
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';
var url_services_data_zonegeo_famille = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var Oview;
var Omode;
var Me;
var ref;
var lg_EMPLACEMENT_ID = "";

Ext.define('testextjs.view.configmanagement.famille.action.updatezonegeo', {
    extend: 'Ext.window.Window',
    xtype: 'updatezone',
    id: 'updatezoneID',
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

        var store_zonegeo_famille = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

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
                    title: 'Information le produit',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Emplacement',
                            name: 'lg_ZONE_GEO_ID',
                            width: 400,
                            id: 'lg_ZONE_GEO_ID',
                            store: store_zonegeo_famille,
                            valueField: 'lg_ZONE_GEO_ID',
                            displayField: 'str_LIBELLEE',
                            pageSize: itemsPerPage, //ajout la barre de pagination
                            typeAhead: true,
                            minChars: 2,
                            allowBlank: false,
                            queryMode: 'remote',
                            emptyText: 'Choisir un emplacement...'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_FAMILLE_ID;
            lg_EMPLACEMENT_ID = this.getOdatasource().lg_EMPLACEMENT_ID;
            Ext.getCmp('lg_ZONE_GEO_ID').setValue(this.getOdatasource().lg_ZONE_GEO_ID);
        }



        // Une seule fenetre a la fois : un nouveau clic remplace la precedente.
        if (winZoneGeoOuverte && !winZoneGeoOuverte.isDestroyed) {
            winZoneGeoOuverte.destroy();
        }
        var win = winZoneGeoOuverte = new Ext.window.Window({
            autoShow: true,
            modal: true,
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
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function(button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');

        if (formulaire.isValid()) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: url_services_transaction_famille + "updateonlyzonegeo",
                params: {
                    lg_ZONE_GEO_ID: Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                    lg_FAMILLE_ID: ref,
                    lg_EMPLACEMENT_ID: lg_EMPLACEMENT_ID
                },
                success: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        Me_Workflow = Oview;
                        fenetre.close();
                        Me_Workflow.onRechClick();
                    }


                },
                failure: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);

                }

            });
        } else {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide');
        }

    }

});