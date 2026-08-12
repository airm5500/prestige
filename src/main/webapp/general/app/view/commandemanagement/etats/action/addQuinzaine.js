/* global Ext */

var Me;
var ref;
var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_quinzaine_transaction = '../webservices/commandemanagement/bonlivraison/ws_quinzaine_transaction.jsp';
var Oview;
var mode;
var record;
var saveText;
var lg_GROSSISTE_ID;
var lg_QUINZAINE_ID;
var PARAMS  = {};

Ext.define('testextjs.view.commandemanagement.etats.action.addQuinzaine', {
    extend: 'Ext.window.Window',
    xtype: 'addQuinzaine',
    id: 'addQuinzaineID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Client'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        record: ''

    },
    initComponent: function () {

        Oview = this.getParentview();
        mode = this.getMode();
        Me = this;
        var itemsPerPage = 20;

        var store_grossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                   url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });


        var dt_START_DATE_FIELD = new Ext.form.field.Date({
            fieldLabel: 'Du:',
            allowBlank: false,
            submitFormat: 'Y-m-d',
            format: 'd/m/Y',
            flex: 1,
            name: 'dt_QUINZAINE_START_DATE',
            id: 'dt_QUINZAINE_START_DATE',
            minValue: new Date(),
            listener: {
                change: function (me) {
                    //Ext.getCmp('dt_START_DATE_ID').setMaxValue(me.getValue());
                }
            }
        });

        var dt_END_DATE_FIELD = new Ext.form.field.Date({
            fieldLabel: 'Au:',
            allowBlank: false,
            submitFormat: 'Y-m-d',
            format: 'd/m/Y',
            //labelWidth: 20,
            flex: 1,
//            margin: '0 25 0 10',
            name: 'dt_QUINZAINE_END_DATE',
            id: 'dt_QUINZAINE_END_DATE',
            minValue: new Date(),
            listener: {
                change: function (me) {
                    // Ext.getCmp('dt_START_DATE_ID').setMaxValue(me.getValue());
                }
            }
        });

        var GROSSISTE_FIELD = new Ext.form.field.ComboBox({
            fieldLabel: 'Grossiste',
            name: 'lg_GROSSISTE_ID',
            id: 'lg_QUINZAINE_GROSSISTE_LIBELLE',
            store: store_grossiste,
            //disabled: true,
            width: 170,
            valueField: 'lg_GROSSISTE_ID',
            displayField: 'str_LIBELLE',
            typeAhead: true,
            queryMode: 'remote',
            flex: 1,
            emptyText: 'Selectionner grossiste...',
            listeners: {
                select: function (cmp) {
                    
                    //var record = cmp.getStore().findRecord('str_LIBELLE', grossiste_libelle);
                    lg_GROSSISTE_ID = cmp.getValue();

                }
            }

        });


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            width: '100%',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Informations de la Quinzaine',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [GROSSISTE_FIELD, dt_START_DATE_FIELD, dt_END_DATE_FIELD]
                }
            ]
        });

        if (mode === 'create') {
            saveText = "Céer";
        }
        if (mode === "update") {
            record = this.getRecord();
            lg_QUINZAINE_ID = record.get('lg_QUINZAINE_ID');
            var start_date = record.get('dt_START_DATE');
            var end_date = record.get('dt_END_DATE');
            var grossiste_libelle = record.get('str_GROSSISTE_LIBELLE');

            //console.log("start date: ", start_date, " end date: ", end_date, " grossiste libelle ", grossiste_libelle);
            saveText = "Modifier";
            Ext.getCmp('dt_QUINZAINE_START_DATE').setValue(start_date);
            Ext.getCmp('dt_QUINZAINE_END_DATE').setValue(end_date);
            Ext.getCmp('lg_QUINZAINE_GROSSISTE_LIBELLE').setValue(grossiste_libelle);

        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 450,
            //autoHeight: true,
            height: 200,
            minWidth: 200,
//            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: saveText,
                    //disabled: true,
                    id: 'quinzain_save_btn',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function (btn) {

        var fenetre = btn.up('window'),
            formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            var dt_QUINZAINE_START_DATE = Ext.getCmp('dt_QUINZAINE_START_DATE').getSubmitValue();
            var dt_QUINZAINE_END_DATE = Ext.getCmp('dt_QUINZAINE_END_DATE').getSubmitValue();
            var str_GROSSISTE_LIBELLE = Ext.getCmp('lg_QUINZAINE_GROSSISTE_LIBELLE').getValue();
            console.log("dt_QUINZAINE_START_DATE: ",dt_QUINZAINE_START_DATE, "dt_QUINZAINE_END_DATE: ", dt_QUINZAINE_END_DATE, "lg_GROSSISTE_ID: ", str_GROSSISTE_LIBELLE);
            
            Ext.Ajax.request({
                url: url_services_quinzaine_transaction,
                params: {
                    lg_QUINZAINE_ID: lg_QUINZAINE_ID,
                    lg_GROSSISTE_ID: lg_GROSSISTE_ID,
                    dt_START_DATE: dt_QUINZAINE_START_DATE,
                    dt_END_DATE: dt_QUINZAINE_END_DATE,
                    mode: mode
                },
                success: function (response) {
                    var jsonResponseStringyfied = Ext.JSON.decode(response.responseText);
                    Me.processQuinzaineCreation(jsonResponseStringyfied, btn);
                },
                failure: function (error) {
                    console.error('Error occured');
                }
            });

        }
    },
    processQuinzaineCreation: function (response, btn) {
        // if the response is a success response, then take time to refresh the parent's store
        if (response.success === true) {
            Oview.getStore().reload();
            Ext.MessageBox.show({
                title: 'Création de la quinzaine',
                width: 320,
                msg: 'Quinzaine créée avec succès.',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.SUCC,
                fn: function (bt) {
                    btn.up('window').close();
           }
            });
            lg_GROSSISTE_ID = '';
        } else {
            Ext.MessageBox.show({
                title: 'Création de la quinzaine',
                width: 320,
                msg: 'Erreur lors de la création de la quinzaine',
                buttons: Ext.MessageBox.ERROR,
                icon: Ext.MessageBox.ERROR,
                fn: function (bt) {}
            });
            lg_GROSSISTE_ID = '';
        }

    }


});
