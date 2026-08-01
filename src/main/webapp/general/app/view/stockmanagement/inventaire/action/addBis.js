/* global Ext */

var url_services_transaction_inventaire = '../webservices/stockmanagement/inventaire/ws_transactions.jsp?mode=';
var url_services_data_zonegeo_other = '../webservices/configmanagement/zonegeographique/ws_data_other.jsp';
var url_services_data_famillearticle_other = '../webservices/configmanagement/famillearticle/ws_data_other.jsp';
var url_services_data_grossiste_other = '../webservices/configmanagement/grossiste/ws_data_other.jsp';

var Oview;
var Omode;
var Me;
var ref;
Ext.define('testextjs.view.stockmanagement.inventaire.action.addBis', {
    extend: 'Ext.window.Window',
    xtype: 'addinventaire',
    id: 'addinventaireID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.view.stockmanagement.inventaire.action.selectionCriteres'
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
        var itemsPerPage = 20;

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_STATUT_TRANSACTION'],
            data: [{str_TYPE_TRANSACTION: 'Famille', str_STATUT_TRANSACTION: 'Famille'}, {str_TYPE_TRANSACTION: 'Emplacement', str_STATUT_TRANSACTION: 'Emplacement'}, {str_TYPE_TRANSACTION: 'Grossiste', str_STATUT_TRANSACTION: 'Grossiste'}, {str_TYPE_TRANSACTION: 'Reserve', str_STATUT_TRANSACTION: 'Reserve'}]
        });
        const stockFilterStore = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [{id: 'ALL', libelle: 'Tout'}, {id: 'LESS_EQUALS', libelle: 'Inférieur ou égal'}, {id: 'LESS', libelle: 'Inférieur'}, {id: 'GREATHER_EQUALS', libelle: 'Supérieur ou égal'}, {id: 'GREATHER', libelle: 'Supérieur'}, {id: 'NOT_EQUALS', libelle: 'Différent'}]
        });

        var storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_grossiste_other,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_famillearticle = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famillearticle_other,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        var store_zonegeo = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo_other,
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
                    title: 'Information sur l\'inventaire',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle',
                            name: 'str_NAME',
                            id: 'str_NAME'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Inventaire par',
                            name: 'str_TYPE_TRANSACTION',
                            margins: '0 0 0 10',
                            id: 'str_TYPE_TRANSACTION',
                            store: store_type,
                            valueField: 'str_STATUT_TRANSACTION',
                            displayField: 'str_TYPE_TRANSACTION',
//                            typeAhead: true,
                            editable: false,
                            queryMode: 'remote',
                            flex: 1,
                            emptyText: 'Inventaire par...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();

                                    var OGridFamille = Ext.getCmp('lg_FAMILLEARTICLE_ID');
                                    var OGridemplacement = Ext.getCmp('lg_ZONE_GEO_ID');
                                    var OGridGrossiste = Ext.getCmp('lg_GROSSISTE_ID');
                                    var OContainerInterval = Ext.getCmp('contenaire_intervalle');
                                    OContainerInterval.hide();
                                    Ext.getCmp('str_BEGIN').reset();
                                    Ext.getCmp('str_END').reset();

                                    // Les trois listes deroulantes d'origine restent en place mais
                                    // ne servent plus a choisir : c'est le panneau a deux volets qui
                                    // porte la selection, desormais multiple. Elles sont conservees
                                    // masquees pour ne pas casser les traitements qui les lisent.
                                    // Depuis la liste deroulante : on remonte a la fenetre par le
                                    // composant lui-meme, jamais par la variable globale Me qui peut
                                    // designer une fenetre deja fermee.
                                    var panneau = cmp.up('window').down('inventaireselectioncriteres');
                                    OGridFamille.hide();
                                    OGridemplacement.hide();
                                    OGridGrossiste.hide();

                                    if (value == "Reserve") {
                                        // Aucun critere a choisir : ce sont TOUS les produits
                                        // marques geres en reserve qui sont inventories.
                                        OGridFamille.setValue("");
                                        OGridemplacement.setValue("");
                                        OGridGrossiste.setValue("");
                                        if (panneau) {
                                            panneau.hide();
                                        }
                                        return;
                                    }
                                    if (panneau) {
                                        panneau.show();
                                        panneau.changerAxe(value);
                                    }
                                    if (value == "Famille") {
                                        OGridemplacement.hide();
                                        OGridGrossiste.hide();
//                                        OGridemplacement.getStore().reload();
//                                        OGridGrossiste.getStore().reload();
                                        OGridemplacement.setValue("");
                                        OGridGrossiste.setValue("");
                                    } else if (value == "Emplacement") {
                                        OGridFamille.hide();
                                        OGridGrossiste.hide();
//                                        OGridFamille.getStore().reload();
//                                        OGridGrossiste.getStore().reload();
                                        OGridFamille.setValue("");
                                        OGridGrossiste.setValue("");
                                    } else if (value == "Grossiste") {
                                        OGridFamille.hide();
                                        OGridemplacement.hide();
//                                        OGridFamille.getStore().reload();
//                                        OGridemplacement.getStore().reload();
                                        OGridFamille.setValue("");
                                        OGridemplacement.setValue("");
                                    }



                                }
                            }
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Famille article',
                            name: 'lg_FAMILLEARTICLE_ID',
                            id: 'lg_FAMILLEARTICLE_ID',
                            store: store_famillearticle,
                            hidden: true,
                            valueField: 'lg_FAMILLEARTICLE_ID',
                            pageSize: itemsPerPage, //ajout la barre de pagination
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Sectionner une famille article...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var OContainerInterval = Ext.getCmp('contenaire_intervalle');
                                    if (value == "0") {
                                        OContainerInterval.show();
                                    } else {
                                        OContainerInterval.hide();
                                        Ext.getCmp('str_BEGIN').reset();
                                        Ext.getCmp('str_END').reset();
                                    }


                                }
                            }
                        },
                        {
                            xtype: 'combobox',
                            name: 'lg_ZONE_GEO_ID',
                            fieldLabel: 'Emplacement',
                            margins: '0 0 0 10',
                            id: 'lg_ZONE_GEO_ID',
                            store: store_zonegeo,
                            hidden: true,
                            valueField: 'lg_ZONE_GEO_ID',
                            displayField: 'str_LIBELLEE',
                            pageSize: itemsPerPage, //ajout la barre de pagination
                            typeAhead: true,
                            queryMode: 'remote',
                            flex: 1,
                            emptyText: 'Sectionner un emplacement...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var OContainerInterval = Ext.getCmp('contenaire_intervalle');
                                    if (value == "0") {
                                        OContainerInterval.show();
                                    } else {
                                        OContainerInterval.hide();
                                        Ext.getCmp('str_BEGIN').reset();
                                        Ext.getCmp('str_END').reset();
                                    }


                                }
                            }
                        },

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Grossiste',
                            name: 'lg_GROSSISTE_ID',

                            id: 'lg_GROSSISTE_ID',
                            store: storerepartiteur,
                            valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE',
                            pageSize: itemsPerPage, //ajout la barre de pagination
                            hidden: true,
                            typeAhead: true,
                            queryMode: 'remote',
                            flex: 1,
                            emptyText: 'Sectionner un grossiste...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var OContainerInterval = Ext.getCmp('contenaire_intervalle');
                                    if (value == "0") {
                                        OContainerInterval.show();
                                    } else {
                                        OContainerInterval.hide();
                                        Ext.getCmp('str_BEGIN').reset();
                                        Ext.getCmp('str_END').reset();
                                    }


                                }
                            }

                        },

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Filter le stock',
                            name: 'stockFilter',

                            id: 'stockFilterStore',
                            store: stockFilterStore,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            value: 'ALL',
                            flex: 1,
                            emptyText: 'Filter le stock...',
                            listeners: {
                                select: function (cmp) {
                                    const value = cmp.getValue();
                                    const stockProduit = Ext.getCmp('stockProduit');
                                    if (value !== "ALL") {
                                        stockProduit.show();
                                    } else {
                                        stockProduit.hide();

                                    }

                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            flex: 1,
                            fieldLabel: 'Stock produit',
                            name: 'stockProduit',
                            hidden: true,
                            id: 'stockProduit'
                        },

                        {
                            // Selection multiple des criteres, en deux volets : la liste de l'axe
                            // choisi a gauche, le panier a droite. Masque tant qu'aucun type n'est
                            // choisi, et pour un inventaire de reserve qui n'a pas de critere.
                            xtype: 'inventaireselectioncriteres',
                            itemId: 'panneauCriteres',
                            hidden: true,
                            anchor: '100%'
                        },
                        {
                            xtype: 'fieldcontainer',
                            fieldLabel: 'Intervalle',
                            layout: 'hbox',
                            id: 'contenaire_intervalle',
                            hidden: true,
                            combineErrors: true,
                            defaultType: 'textfield',
                            defaults: {
                                hideLabel: 'true'
                            },
                            items: [
                                {
                                    fieldLabel: 'De',
                                    width: 100,
                                    emptyText: '',
                                    name: 'str_BEGIN',
                                    id: 'str_BEGIN',
                                    margin: '0 10 0 0'/*,
                                     maskRe: /[a-z]/,
                                     maxLength: 1,
                                     minLength: 1*/
                                },
                                {
                                    fieldLabel: 'A',
                                    xtype: 'textfield',
                                    width: 100,
//                                            hidden: true,
                                    emptyText: '',
                                    name: 'str_END',
                                    id: 'str_END'/*,
                                     maxLength: 1,
                                     minLength: 1*/
                                }
                            ]
                        }
                    ]
                }
            ]
        });






        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            // Elargie et rallongee : les deux volets de selection ne tenaient pas dans les
            // 500x300 d'origine, il fallait etirer la fenetre a la main pour voir la liste.
            width: 900,
            height: 640,
            minWidth: 700,
            minHeight: 480,
            maximizable: true,
            layout: 'fit',
            autoScroll: true,
            plain: true,
            items: form,
            buttons: [{
                    text: 'Cr&eacute;er l\'inventaire',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function (button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var internal_url = "";

        // Recapitulatif des produits que le serveur n'a pas pu inventorier. La creation reste
        // valable pour les autres ; sans ce rappel l'ecart n'apparaissait qu'au comptage.
        function recapIgnores(ignores) {
            if (!ignores || !ignores.length) {
                return '';
            }
            var lignes = [], i, p, MAX = 15;
            for (i = 0; i < ignores.length && i < MAX; i++) {
                p = ignores[i] || {};
                lignes.push('<li>' + Ext.String.htmlEncode(p.int_CIP || p.lg_FAMILLE_ID || '?')
                        + ' ' + Ext.String.htmlEncode(p.str_NAME || '')
                        + ' <span style="color:#888">&mdash; ' + Ext.String.htmlEncode(p.motif || '')
                        + '</span></li>');
            }
            if (ignores.length > MAX) {
                lignes.push('<li>&hellip; et ' + (ignores.length - MAX) + ' autre(s)</li>');
            }
            return '<br/><br/><b style="color:#c0392b">Produit(s) non inventorie(s) : ' + ignores.length + '</b>'
                    + '<ul style="margin:4px 0 0 16px;max-height:180px;overflow:auto">' + lignes.join('') + '</ul>';
        }

        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue() === null) {
            Ext.MessageBox.alert('Message d\'erreur', 'Veuillez s&eacute;lectionner un type inventaire');
            return;
        }

        // Zone RESERVE : aucun critere a controler, et surtout un CHEMIN DIFFERENT. La creation
        // habituelle passe par des procedures stockees qui ne connaissent que le stock rayon ;
        // l'inventaire de reserve emprunte le service dedie, deja en place, qui pose str_TYPE a
        // 'reserve' et fera donc porter la cloture sur le stock reserve.
        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue() === 'Reserve') {
            var progres = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire reserve');
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/reserve/create-inventaire',
                params: {search_value: '', str_TYPE_TRANSACTION: 'ALL'},
                timeout: 1800000,
                success: function (response) {
                    progres.hide();
                    var res = Ext.JSON.decode(response.responseText, true) || {};
                    if (!res.count) {
                        Ext.MessageBox.alert('Message', res.message || 'Aucun produit a inventorier.');
                        return;
                    }
                    Ext.MessageBox.alert('Infos', 'Inventaire reserve cree.<br>Produits en compte : <b>'
                            + res.count + '</b>' + recapIgnores(res.ignores));
                    Oview.getStore().reload();
                    button.up('window').close();
                },
                failure: function () {
                    progres.hide();
                    Ext.MessageBox.alert('Erreur', "La creation de l'inventaire reserve a echoue.");
                }
            });
            return;
        }

        if (!formulaire.isValid()) {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide');
            return;
        }

        // La selection vient desormais du panneau a deux volets, et elle peut porter sur
        // PLUSIEURS valeurs du meme axe. Une selection vide signifie "tout l'axe" : c'est
        // exactement ce que faisait l'entree "Tous" des anciennes listes deroulantes.
        // On repart de la FENETRE COURANTE, jamais de la variable globale Me : celle-ci pointe
        // sur la derniere fenetre construite, qui peut avoir ete fermee entre-temps.
        //
        // L'envoi est une fonction LOCALE et non une methode de la classe : ce gestionnaire est
        // branche sans scope, donc 'this' y designe le bouton, et la fenetre affichee n'est pas
        // l'instance de la classe. Aucun des deux ne porte les methodes du composant.
        var panneau = fenetre.down('#panneauCriteres');
        var valeurs = panneau ? panneau.getValeurs() : [];
        var debut = Ext.getCmp('str_BEGIN').getRawValue();
        var fin = Ext.getCmp('str_END').getRawValue();

        if (valeurs.length === 0 && (!debut || !fin)) {
            Ext.MessageBox.confirm('Confirmation',
                    'Aucun &eacute;l&eacute;ment n\'est coch&eacute; : l\'inventaire portera sur '
                    + '<b>la totalit&eacute;</b>. Continuer ?',
                    function (btn) {
                        if (btn === 'yes') {
                            envoyerCreationInventaire(button, valeurs, debut, fin);
                        }
                    });
            return;
        }
        envoyerCreationInventaire(button, valeurs, debut, fin);
    }
});

/** Envoi de la creation au service REST qui remplace ws_transactions.jsp?mode=createbis. */
function envoyerCreationInventaire(button, valeurs, debut, fin) {
        // La liste du filtre de stock porte l'identifiant 'stockFilterStore' (le nom du champ,
        // lui, est bien 'stockFilter').
        var stockFiltre = Ext.getCmp('stockFilterStore');
        var stockQte = Ext.getCmp('stockProduit');
        var progres = Ext.MessageBox.wait('Veuillez patienter. Traitement en cours...',
                'Creation d\'un inventaire');
        Ext.Ajax.request({
            url: '../api/v1/inventaire/creation',
            method: 'POST',
            timeout: 1800000,
            jsonData: {
                str_NAME: Ext.getCmp('str_NAME').getValue(),
                str_TYPE_TRANSACTION: Ext.getCmp('str_TYPE_TRANSACTION').getValue(),
                valeurs: valeurs,
                str_BEGIN: debut || '',
                str_END: fin || '',
                stockFilter: stockFiltre ? stockFiltre.getValue() : 'ALL',
                stockProduit: stockQte ? stockQte.getValue() : null,
                bool_INVENTAIRE: 1
            },
            success: function (response) {
                progres.hide();
                var res = Ext.JSON.decode(response.responseText, true) || {};
                if (!res.success) {
                    // Refus metier : la fenetre reste ouverte pour corriger la selection.
                    Ext.MessageBox.alert('Message', res.nombre || 'Creation impossible.');
                    return;
                }
                Ext.MessageBox.alert('Infos', res.nombre);
                Oview.getStore().reload();
                button.up('window').close();
            },
            failure: function () {
                progres.hide();
                Ext.MessageBox.alert('Erreur', "La creation de l'inventaire a echoue.");
            }
        });
}
