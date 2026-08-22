

/* global Ext */
var Me;
var selectedBLs;
var selectedBL;
var selected_reglement_type = "";
var dt_DATE_REGLEMENT;
var int_VALEUR_MONTANT_REGLE;
var int_VALEUR_MONTANT_RESTANT;
var str_STATUS;
/* Le reglement postait vers ws_transaction2.jsp, page qui n'a JAMAIS existe dans le projet : la
 * demande rendait un 404 et rien n'etait enregistre. Le bouton qui mene ici etant cache depuis
 * l'origine, le defaut n'avait jamais pu se voir. */
var url_services_bon_livraison_transaction = '../api/v1/etat-control-bon/reglement';
var win;
Ext.define('testextjs.view.commandemanagement.etats.action.paybls', {
    extend: 'Ext.window.Window',
    xtype: 'paybls',
    id: 'payblID',
    require: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*'
    ],
    config: {
        titre: '',
        selectedBLs: '',
        selectedBL: ''

    },
    frame: true,
//    collapsible: true,
    animCollapse: false,
    title: 'Réglement de Bons de Livraison',
    initComponent: function () {

        Me = this;
        selectedBLs = this.getSelectedBLs();
        selectedBL = this.getSelectedBL();
        var store_type_reglement = new Ext.data.Store({
            autoLoad: true,
            fields: ['value', 'name'],
            data: [
                {"value": "0", "name": "NON REGLE"},
                {"value": "1", "name": "REGLE EN PARTIE"},
                {"value": "2", "name": "REGLE TOTALEMENT"}
            ]
        });
        
        var int_MONTANT_REGLE = new Ext.form.field.Text({
            fieldLabel: 'Montant Règlé',
            name: 'int_MONTANT_REGLE',
            id: 'int_MONTANT_REGLE',
            emptyText: 'Montant Règlé',
            hidden: true
        });

        var dt_REGLEMENT_DATE_FIELD = new Ext.form.field.Date({
            fieldLabel: 'Date du Règlement:',
            allowBlank: false,
            submitFormat: 'Y-m-d',
            format: 'd/m/Y',
            flex: 1,
            hidden: true,
            name: 'dt_REGLEMENT_DATE_FIELD',
            id: 'dt_REGLEMENT_DATE_FIELD',
            //minValue: new Date(),
            listener: {
                change: function (me) {
                    //Ext.getCmp('dt_START_DATE_ID').setMaxValue(me.getValue());
                }
            }
        });

        var str_TYPE_REGLEMENT = new Ext.form.field.ComboBox({
            fieldLabel: 'Type de Règlement',
            id: 'str_TYPE_REGLEMENT',
            name: 'str_TYPE_REGLEMENT',
            store: store_type_reglement,
            emptyText: 'Séléctionner un type de règlement',
            width: 300,
            valueField: 'value',
            displayField: 'name',
            typeAhead: true,
            queryMode: 'local',
            listeners: {
                select: function (cmp) {
                    selected_reglement_type = cmp.getValue();
                    /* On ecrit dans str_STATUS, declare en tete de fichier. Le code posait
                     * auparavant un STATUS nu, qui creait une variable globale implicite : elle
                     * survivait d'une ouverture a l'autre et disparaissait en mode strict. */
                    if (selected_reglement_type === "0") {
                        str_STATUS = 'NON REGLE';
                        Ext.getCmp('int_MONTANT_REGLE').hide();
                        Ext.getCmp('dt_REGLEMENT_DATE_FIELD').hide();
                    } else if (selected_reglement_type === "1") {
                        Ext.getCmp('dt_REGLEMENT_DATE_FIELD').show();
                        Ext.getCmp('int_MONTANT_REGLE').show();
                        str_STATUS = 'REGLE EN PARTIE';
                    } else {
                        Ext.getCmp('dt_REGLEMENT_DATE_FIELD').show();
                        Ext.getCmp('int_MONTANT_REGLE').hide();
                        /* Le champ « montant restant » a ete mis en commentaire plus bas : le
                         * chercher par son identifiant rendait undefined, et le .hide() qui suivait
                         * arretait net le gestionnaire - avant meme que str_STATUS ne soit pose. */
                        str_STATUS = 'REGLE';
                    }
                    /* Les valeurs sont lues au moment d'enregistrer, et non ici : les relever des
                     * le choix du type revenait a prendre une date et un montant que la caissiere
                     * n'avait pas encore saisis. */
                }
//                'render': function (cmp) {
//                    cmp.getEl().on('keypress', function (e) {
//                        if (e.getKey() === e.ENTER) {
//
//                        }
//                    });
//                }
            }
        });

        

//        var int_MONTANT_RESTANT = new Ext.form.field.Text({
//            fieldLabel: 'Montant Restant',
//            name: 'int_MONTANT_RESTANT',
//            id: 'int_MONTANT_RESTANT',
//            emptyText: 'Montant Restant',
//            hidden: true
//        });

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
                    title: 'Informations du règlement',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [dt_REGLEMENT_DATE_FIELD, str_TYPE_REGLEMENT, int_MONTANT_REGLE]
                }
            ]
        });

         win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 650,
            //autoHeight: true,
            height: 400,
            minWidth: 200,
            id: 'windowBL',
//            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: "Valider",
                    //disabled: true,
                    id: 'status_save_btn',
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
        if (!str_STATUS) {
            Ext.MessageBox.show({
                title: 'Règlement de BL', width: 400,
                msg: 'Veuillez choisir un type de règlement.',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING
            });
            return;
        }
        /* Le bouton s'appelle « REGLER UNE SELECTION DE BL » : on marque TOUS les bons coches, et
         * non le seul dernier coche. Le champ du store est lgBONLIVRAISONID ; le code lisait
         * lg_BON_LIVRAISON_ID, nom d'une ancienne version du modele, et n'obtenait qu'undefined. */
        var bons = Ext.Array.map(selectedBLs || [], function (r) {
            return r.get('lgBONLIVRAISONID');
        }).filter(function (id) {
            return !!id;
        });
        if (!bons.length && selectedBL) {
            bons = [selectedBL.get('lgBONLIVRAISONID')];
        }
        var corps = {
            bons: bons,
            statut: str_STATUS,
            date: Ext.getCmp('dt_REGLEMENT_DATE_FIELD').getSubmitValue(),
            montantRegle: Number(Ext.getCmp('int_MONTANT_REGLE').getValue()) || 0
        };
        Ext.Ajax.request({
            url: url_services_bon_livraison_transaction,
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode(corps),
            timeout: 240000,
            success: function (response) {
                Me.processReglementResponse(Ext.JSON.decode(response.responseText, true) || {});
            },
            failure: function (error) {
                Me.processReglementResponse({success: false});
                console.error(error);
            }
        });
    },
    processReglementResponse: function (response) {
        if (response.success === true) {
            var nombre = response.count || 0;
            Ext.MessageBox.show({
                title: 'Règlement de BL',
                width: 450,
                msg: nombre > 1 ? nombre + ' bons de livraison marqués « ' + response.statut + ' ».'
                        : 'Bon de livraison marqué « ' + response.statut + ' ».',
                buttons: Ext.MessageBox.OK,
                // Ext.MessageBox.SUCC n'existe pas : l'icone etait donc undefined.
                icon: Ext.MessageBox.INFO,
                fn: function () {
                    var fenetre = Ext.getCmp('windowBL');
                    if (fenetre) {
                        fenetre.close();
                    }
                    var grille = Ext.getCmp('gridID');
                    if (grille) {
                        grille.getStore().reload();
                    }
                }
            });
        } else {
            Ext.MessageBox.show({
                title: 'Règlement de BL',
                width: 450,
                msg: response.msg || 'Une erreur est survenue lors du marquage',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR
                /* Pas de fn : le rappel recoit l'identifiant du bouton, pas le composant, et la
                 * boite se referme d'elle-meme. La fenetre de reglement reste ouverte pour que la
                 * saisie refusee puisse etre corrigee sans tout recommencer. */
            });
        }
    }
});