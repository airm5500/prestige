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
        'Ext.window.Window',
        'testextjs.view.stockmanagement.reserve.action.traitementSuggestion'
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

        // Motif et commentaire sont saisis ICI, dans la meme vue que la quantite. Ils ouvraient
        // auparavant une seconde fenetre par-dessus celle-ci : deux vues superposees pour une
        // seule decision, alors que tout tient sur un seul ecran.
        var categorieSuggestion = (Omode === 'assort') ? 'RESERVE' : 'RAYON';
        var storeMotifs = new Ext.data.Store({
            fields: ['id', 'libelle'],
            proxy: {
                type: 'ajax', url: '../api/v1/suggestion-reserve/motifs',
                extraParams: {categorie: categorieSuggestion}, reader: {type: 'json'}
            }
        });
        storeMotifs.load();

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
                        },
                        {
                            xtype: 'combo', itemId: 'cboMotifLigne', fieldLabel: 'Motif *',
                            editable: false, allowBlank: false, forceSelection: true,
                            queryMode: 'local', displayField: 'libelle', valueField: 'id',
                            emptyText: 'Motif (obligatoire)', store: storeMotifs
                        },
                        {
                            xtype: 'textfield', itemId: 'txtComLigne', fieldLabel: 'Commentaire',
                            emptyText: 'Facultatif'
                        }
                    ]
                },
                {
                    xtype: 'component',
                    html: '<div style="padding:4px 10px;color:#555;">Le stock ne bougera '
                            + 'qu\'apres traitement depuis l\'onglet SUGGESTIONS.</div>'
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
            modal: true,
            autoShow: false,
            title: this.getTitre(),
            width: 560,
            height: 380,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Creer la suggestion',
                    cls: 'btn-suggestions-violet',
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
                    'Le stock reserve disponible est de ' + stockDispo + ' unités. La quantité a été ajustée à ce maximum.',
                    focusQte);
                return;
            } else {
                var msg = 'La quantite (' + qte + ') ne peut pas depasser le stock rayon disponible (' + stockDispo + ').';
                qteField.markInvalid(msg);
                Ext.MessageBox.alert('Quantite invalide', msg, focusQte);
                return;
            }
        }

        // Le stock n'est plus deplace ici : cette action cree une suggestion, tracee, qui sera
        // traitee depuis l'onglet SUGGESTIONS. Les mouvements ponctuels suivent ainsi le meme
        // chemin que les mouvements en lot : aucun ne echappe a la piste d'audit.
        //   assort   = le trop-plein du rayon part EN RESERVE
        //   reassort = la reserve remonte AU RAYON
        var categorie = (Omode === 'assort') ? 'RESERVE' : 'RAYON';

        // Motif obligatoire : chaque mouvement de reserve doit pouvoir etre justifie.
        var cboMotif = win.down('#cboMotifLigne');
        if (!cboMotif || !cboMotif.getValue()) {
            if (cboMotif) {
                cboMotif.markInvalid('Motif obligatoire');
                cboMotif.focus();
            }
            Ext.MessageBox.alert('Motif obligatoire',
                    'Indiquez le motif de cette suggestion avant de la creer.');
            return;
        }
        var txtCom = win.down('#txtComLigne');
        var motifId = cboMotif.getValue();
        var commentaire = (txtCom && txtCom.getValue()) ? txtCom.getValue() : null;

        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/suggestion-reserve/creer',
            jsonData: {
                categorie: categorie,
                motifId: motifId,
                commentaire: commentaire,
                items: [{lg_FAMILLE_ID: ref, int_QTE: qte}]
            },
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true) || {};
                if (res.success === false) {
                    // Erreur metier : on garde la fenetre ouverte pour corriger
                    qteField.markInvalid(res.message || "Creation impossible");
                    Ext.MessageBox.alert('Message', res.message || "Creation impossible", focusQte);
                    return;
                }
                win.close();
                if (Oview && Oview.getStore) {
                    Oview.getStore().reload();
                }
                ouvrirSuggestionCreee(res);
            },
            failure: function (response) {
                Ext.MessageBox.alert('Error Message', "Echec de la communication avec le serveur", focusQte);
            }
        });
    }
});

// Bascule sur l'onglet SUGGESTIONS et ouvre la suggestion qui vient d'etre creee.
function ouvrirSuggestionCreee(res) {
    var manager = Ext.getCmp('reservemanagerID');
    var onglet = manager ? manager.down('#ongletSuggestions') : null;
    if (!manager || !onglet) {
        Ext.MessageBox.alert('Suggestion creee', 'Retrouvez-la dans l\'onglet SUGGESTIONS.');
        return;
    }
    manager.setActiveTab(onglet);
    onglet.reloadGrid();
    if (res.lg_SUGGESTION_RESERVE_ID) {
        Ext.create('testextjs.view.stockmanagement.reserve.action.traitementSuggestion', {
            suggestionid: res.lg_SUGGESTION_RESERVE_ID,
            parentview: onglet
        });
    }
}
