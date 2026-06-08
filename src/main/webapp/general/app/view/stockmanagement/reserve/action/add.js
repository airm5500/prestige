var rsvmgr_url_transaction = '../api/v1/reserve/';


var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.stockmanagement.reserve.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addreserve',
    id: 'addreserveID',
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

        ['addreserveID', 'str_DESCRIPTION', 'int_NUMBER', 'int_NUMBER_REASSORT'].forEach(function (cid) {
            var existing = Ext.getCmp(cid);
            if (existing) { try { existing.destroy(); } catch (e) {} }
        });

        Oview = this.getParentview();
        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;

        // Libelles dynamiques selon le sens de l'operation
        //   assort   : rayon -> reserve (on lit le stock rayon, on envoie en reserve)
        //   reassort : reserve -> rayon (on lit le stock reserve, on envoie en rayon)
        var stockLabel = (Omode === 'reassort') ? 'Stock Reserve:' : 'Stock Rayon:';
        var qteLabel = (Omode === 'reassort') ? 'Quantité à envoyer en rayon' : 'Quantité à envoyer en reserve';

        str_DESCRIPTION = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Designation:',
                    name: 'str_DESCRIPTION',
                    id: 'str_DESCRIPTION',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        int_NUMBER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: stockLabel,
                    name: 'int_NUMBER',
                    id: 'int_NUMBER',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 180,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information (re)assort stock',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        str_DESCRIPTION,
                        int_NUMBER,
                        {
                            fieldLabel: qteLabel,
                            emptyText: qteLabel,
                            name: 'int_NUMBER_REASSORT',
                            id: 'int_NUMBER_REASSORT'
                        }
                    ]
                }
            ]
        });



        //Initialisation des valeur 


        if (Omode === "reassort") {
            ref = this.getOdatasource().lg_FAMILLE_ID;
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('int_NUMBER').setValue(this.getOdatasource().int_STOCK_RESERVE);
            Ext.getCmp('int_NUMBER_REASSORT').setValue(this.getOdatasource().int_QTE_SUGGEREE || 0);
        } else if (Omode === "assort") {
            ref = this.getOdatasource().lg_FAMILLE_ID;
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('int_NUMBER').setValue(this.getOdatasource().int_STOCK_RAYON);
            Ext.getCmp('int_NUMBER_REASSORT').setValue(this.getOdatasource().int_QTE_SUGGEREE || 0);
        }

        var win = new Ext.window.Window({
            autoShow: false,
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
                    handler: function () {
                        win.close();
                    }
                }]
        });

        win.on('show', function () {
            Ext.defer(function () {
                var qf = Ext.getCmp('int_NUMBER_REASSORT');
                if (qf && qf.inputEl && qf.inputEl.dom) {
                    qf.inputEl.dom.focus();
                    qf.inputEl.dom.select();
                } else if (qf) {
                    qf.focus(true, 100);
                }
            }, 200);
        });
        win.show();

    },
    onbtnsave: function () {

        var win = this.up('window');
        var qteField = Ext.getCmp('int_NUMBER_REASSORT');
        var rawValue = qteField.getValue();
        var qte = parseInt(rawValue, 10);

        // Repositionne le curseur dans le champ pour poursuivre la saisie
        var focusQte = function () {
            qteField.focus(true, 50);
        };

        // ---- Validation cote client : on ne ferme PAS la fenetre en cas d'erreur
        if (rawValue === null || rawValue === '' || isNaN(qte)) {
            qteField.markInvalid('Veuillez saisir une quantite valide.');
            Ext.MessageBox.alert('Quantite invalide', 'Veuillez saisir une quantite valide.', focusQte);
            return;
        }
        if (qte <= 0) {
            qteField.markInvalid('La quantite doit etre superieure a 0.');
            Ext.MessageBox.alert('Quantite invalide', 'La quantite doit etre superieure a 0.', focusQte);
            return;
        }

        // Plafond : stock disponible selon le sens de l'operation
        var stockDispo = parseInt(Ext.getCmp('int_NUMBER').getValue(), 10);
        if (!isNaN(stockDispo) && qte > stockDispo) {
            if (Omode === 'reassort') {
                if (stockDispo <= 0) {
                    qteField.markInvalid('Aucun stock reserve disponible pour ce produit.');
                    Ext.MessageBox.alert('Stock insuffisant', 'Aucun stock reserve disponible pour ce produit.', focusQte);
                    return;
                }
                // Propose le maximum disponible en stock reserve
                qteField.setValue(stockDispo);
                Ext.MessageBox.alert('Quantite ajustee',
                    'Le stock reserve disponible est de ' + stockDispo + ' unites. La quantite a ete ajustee a ce maximum.',
                    focusQte);
                return;
            } else {
                var msg = 'La quantite (' + qte + ') ne peut pas depasser le stock rayon disponible (' + stockDispo + ').';
                qteField.markInvalid(msg);
                Ext.MessageBox.alert('Quantite invalide', msg, focusQte);
                return;
            }
        }

        var internal_url = "";

        if (Omode === "assort") {
            internal_url = rsvmgr_url_transaction + 'assort';
        } else if (Omode === "reassort") {
            internal_url = rsvmgr_url_transaction + 'reassort';
        }

        var libOp = (Omode === 'assort') ? 'assort (rayon → reserve)' : 'reassort (reserve → rayon)';
        Ext.MessageBox.confirm('Confirmation',
            'Voulez-vous valider cet ' + libOp + ' de <b>' + qte + '</b> unite(s) ?',
            function (btn) {
                if (btn !== 'yes') {
                    focusQte();
                    return;
                }
                doRequest();
            });

        function doRequest() {
        Ext.Ajax.request({
            method: 'POST',
            url: internal_url,
            jsonData: {
                lg_FAMILLE_ID: ref,
                int_NUMBER: qte
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, true);
                if (object && object.success) {
                    Ext.MessageBox.alert('Confirmation', object.message);
                    Oview.getStore().reload();
                    if (typeof refreshNotificationBadge === 'function') {
                        refreshNotificationBadge();
                    }
                    win.close();
                } else {
                    // Erreur metier : on garde la fenetre ouverte pour corriger
                    var emsg = object ? object.message : "Echec de l'operation";
                    qteField.markInvalid(emsg);
                    Ext.MessageBox.alert('Error Message', emsg, focusQte);
                }
            },
            failure: function (response)
            {
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', "Echec de la communication avec le serveur", focusQte);
            }
        });
        } // end doRequest
    }
});
