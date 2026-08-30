/* global Ext */

var url_services_data_parameter = '../webservices/sm_user/parameter/ws_data.jsp';
var url_services_transaction_parameter = '../webservices/sm_user/parameter/ws_transaction.jsp?mode=';
var url_rest_update_parameter = '../api/v1/app-params/update'; // update en REST (memes regles metier)

var Oview;
var Omode;
var Me;
var str_KEY;



Ext.define('testextjs.view.sm_user.parameter.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addparameter',
    id: 'addparameterID',
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
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();

        Me = this;

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 90,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information parametre',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Valeur',
                            emptyText: 'Valeur du parametre',
                            name: 'str_VALUE',
                            id: 'str_VALUE'
                        },
                        {
                            fieldLabel: 'Description',
                            xtype: 'textarea',
                           
                            height: 100,
                            emptyText: 'Description',
                            name: 'str_DESCRIPTION',
                            id: 'str_DESCRIPTION'
                        }
                    ]
                }
            ]
        });


        if (Omode === "update" || Omode === "decondition") {

            ref = this.getOdatasource().str_KEY;
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_VALUE').setValue(this.getOdatasource().str_VALUE);

        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 250,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            modal: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function () {
        var me = this; // scope = le bouton (handler sans scope) -> on garde me pour me.up('window')
        // Sauvegarde reelle (fonction locale : evite tout probleme de scope/methode introuvable)
        var doSave = function () {
            if (Omode === "update") {
                Ext.Ajax.request({
                    url: url_rest_update_parameter,
                    method: 'POST',
                    params: {
                        str_KEY: ref,
                        str_VALUE: Ext.getCmp('str_VALUE').getValue(),
                        str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue()
                    },
                    success: function (response) {
                        var object = Ext.JSON.decode(response.responseText, false);
                        if (object.success == "") {
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        }
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        Oview.getStore().reload();
                        // Couleurs des listes : effet immediat, sans recharger la page
                        if ((ref === 'COULEUR_SURVOL_LIGNE' || ref === 'COULEUR_SELECTION_LIGNE')
                                && window.PrestigeCouleursLignes) {
                            window.PrestigeCouleursLignes.recharger();
                        }
                    },
                    failure: function (response) {
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            }
            me.up('window').close();
        };

        var val = (Ext.getCmp('str_VALUE').getValue() || '').toString().trim();
        // Exclusivite SEMOIS_ABC / SEMOIS_PAR_PRODUIT : on ne previent QUE si l'autre est deja actif (=1)
        if ((ref === 'SEMOIS_ABC' || ref === 'SEMOIS_PAR_PRODUIT') && val === '1') {
            var autre = (ref === 'SEMOIS_ABC') ? 'SEMOIS_PAR_PRODUIT' : 'SEMOIS_ABC';
            var autreActif = false;
            try {
                var rec = (Oview && Oview.getStore()) ? Oview.getStore().findRecord('str_KEY', autre) : null;
                autreActif = !!(rec && (rec.get('str_VALUE') || '').toString().trim() === '1');
            } catch (e) { autreActif = false; }
            if (autreActif) {
                Ext.MessageBox.confirm('Modes SEMOIS exclusifs',
                        "Le mode <b>" + autre + "</b> est actuellement actif.<br><br>"
                        + "Les deux modes ne peuvent pas etre actifs en meme temps : c'est l'un OU l'autre.<br>"
                        + "Si vous continuez, <b>" + autre + "</b> sera automatiquement remis a 0 et <b>" + ref + "</b> active.<br><br>Voulez-vous continuer ?",
                        function (btn) {
                            if (btn === 'yes') {
                                doSave();
                            }
                        });
                return;
            }
        }
        doSave();
    }
});
