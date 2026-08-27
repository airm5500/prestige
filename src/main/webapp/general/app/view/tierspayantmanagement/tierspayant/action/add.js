/* global Ext */

var url_services_data_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';
var url_services_transaction_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_transaction.jsp?mode=';

/*
 * L'interrupteur « gerer ce carnet comme un depot » ne concerne que les carnets : il n'apparait
 * que lorsque le type choisi en est un. On se fie au LIBELLE du type plutot qu'a son identifiant,
 * qui n'est pas garanti d'une officine a l'autre ; l'identifiant sert de recours.
 */
function typeEstCarnet(combo) {
    if (!combo) {
        return false;
    }
    var valeur = combo.getValue();
    var enregistrement = combo.getStore() ? combo.getStore().findRecord('lg_TYPE_TIERS_PAYANT_ID', valeur) : null;
    if (enregistrement) {
        var libelle = (enregistrement.get('str_LIBELLE_TYPE_TIERS_PAYANT') || '').toLowerCase();
        return libelle.indexOf('carnet') !== -1;
    }
    return valeur === '2';
}

function majAffichageCarnetDepot() {
    var interrupteur = Ext.getCmp('is_depot');
    if (!interrupteur) {
        return;
    }
    var carnet = typeEstCarnet(Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID_ADD'));
    interrupteur.setVisible(carnet);
    if (!carnet) {
        // Un tiers payant qui n'est pas un carnet ne peut pas etre gere en depot : on ne laisse
        // pas trainer une case cochee que l'utilisateur ne voit plus.
        interrupteur.setValue(false);
    }
}

var url_services_data_ville_tp = '../webservices/configmanagement/ville/ws_data.jsp';
// Types de tiers payant : service REST. La reponse garde la forme lue par l'ecran (total +
// results, memes noms de colonnes), le combo se comporte donc exactement comme avant.
// Le JSP reste en place : cinq autres vues s'en servent encore (edition de facture, achat
// differe, factures reglees, reglement, suivi conso clients) et ne sont pas touchees ici.
var url_services_data_typetierspayant_tp = '../api/v1/tierspayant/types';
var url_services_data_typecontrat_tp = '../webservices/configmanagement/typecontrat/ws_data.jsp';
var url_services_data_regimecaisse_tp = '../webservices/configmanagement/regimecaisse/ws_data.jsp';
var url_services_data_risque_tp = '../webservices/configmanagement/risque/ws_data.jsp';
// Liste des modeles de facture : service REST. La reponse garde la forme lue par l'ecran
// (total + results, memes noms de colonnes) : le combo se comporte exactement comme avant.
var url_services_data_modelfacture_rp = '../api/v1/facturation/modelfacture/liste';

var Oview;
var Omode;
var Me;
var ref;
//var str_PHOTO;

Ext.define('testextjs.view.tierspayantmanagement.tierspayant.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addtierspayant',
    id: 'addtierspayantID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.OptimisationQuantite',
        'testextjs.model.CodeGestion',
        'testextjs.model.TypeTiersPayant',
        'testextjs.model.Regimecaisse',
        'testextjs.model.Risque',
        'testextjs.model.TypeContrat'
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

        var store_ville_tp = new Ext.data.Store({
            model: 'testextjs.model.Ville',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_ville_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var groupesStore = new Ext.data.Store({
            model: 'testextjs.model.GroupeModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });


        var store_modelfacture = new Ext.data.Store({
            model: 'testextjs.model.ModelFacture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_modelfacture_rp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_type_tp = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typetierspayant_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_regime_tp = new Ext.data.Store({
            model: 'testextjs.model.Regimecaisse',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_regimecaisse_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_risque_tp = new Ext.data.Store({
            model: 'testextjs.model.Risque',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_risque_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_typecontrat_tp = new Ext.data.Store({
            model: 'testextjs.model.TypeContrat',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typecontrat_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        /*
         * Habillage de la fiche.
         *
         * Une feuille de style deposee une seule fois : titres de blocs en bleu marine, blocs sur
         * fond blanc detache du fond de la fenetre, libelles adoucis. Les memes couleurs que les
         * etats de facture retravailles pour l'officine, pour que l'application et le papier se
         * ressemblent.
         */
        if (!Ext.util.CSS.getRule('.fiche-tp .x-fieldset-header-text')) {
            Ext.util.CSS.createStyleSheet(
                    '.fiche-tp .x-panel-body{background:#F4F6F9;}'
                    + '.fiche-tp .x-fieldset{border:1px solid #D3DBE5;border-radius:3px;'
                    + 'background:#FFFFFF;padding:6px 12px 10px 12px;margin-bottom:10px;}'
                    + '.fiche-tp .x-fieldset-header-text{color:#1E3A5F;font-weight:700;font-size:12px;}'
                    + '.fiche-tp .x-fieldset-header{padding-left:2px;}'
                    + '.fiche-tp .x-form-item-label{color:#5A6779;}'
                    + '.fiche-tp .x-form-cb-label{color:#5A6779;}',
                    'fiche-tiers-payant');
        }

        /*
         * Champs conserves mais retires de l'ecran.
         *
         * L'officine ne renseigne aucun de ces vingt champs : les afficher obligeait a parcourir
         * six blocs pour atteindre les quelques-uns qui servent vraiment. Ils restent presents
         * dans le formulaire, charges et renvoyes tels quels a l'enregistrement : la valeur deja
         * en base ne bouge pas, et il suffit de retirer un champ de cette liste pour le revoir.
         */
        var champsMasques = {
            xtype: 'container',
            hidden: true,
            itemId: 'champsMasques',
            defaultType: 'textfield',
            items: [
                {fieldLabel: 'Ville', xtype: 'combobox', name: 'lg_VILLE_ID', id: 'lg_VILLE_ID',
                    store: store_ville_tp, valueField: 'lg_VILLE_ID', displayField: 'STR_NAME',
                    queryMode: 'remote'},
                // Une fiche creee est faite pour servir : sans la case a l'ecran, le nouveau tiers
                // payant serait enregistre inactif.
                {fieldLabel: 'Active', xtype: 'checkbox', name: 'bool_ENABLED', id: 'bool_ENABLED',
                    checked: Omode !== 'update'},
                {fieldLabel: 'Periodicite.edit.bord', name: 'int_PERIODICITE_EDIT_BORD',
                    id: 'int_PERIODICITE_EDIT_BORD'},
                {fieldLabel: 'Fact.Subrogatoire', xtype: 'checkbox', name: 'bool_PRENUM_FACT_SUBROGATOIRE',
                    id: 'bool_PRENUM_FACT_SUBROGATOIRE'},
                {fieldLabel: 'No IDF', name: 'str_NUMERO_IDF_ORGANISME', id: 'str_NUMERO_IDF_ORGANISME'},
                {fieldLabel: 'Taux.Remboursement', name: 'dbl_TAUX_REMBOURSEMENT', id: 'dbl_TAUX_REMBOURSEMENT'},
                {fieldLabel: 'Montant F Client', name: 'dbl_MONTANT_F_CLIENT', id: 'dbl_MONTANT_F_CLIENT'},
                {fieldLabel: 'Base Remise', name: 'dbl_BASE_REMISE', id: 'dbl_BASE_REMISE'},
                {fieldLabel: 'Code Comptable', name: 'str_CODE_COMPTABLE', id: 'str_CODE_COMPTABLE'},
                {fieldLabel: 'N0 Decompte', name: 'int_NUMERO_DECOMPTE', id: 'int_NUMERO_DECOMPTE'},
                {fieldLabel: 'N0 Caisse Officiel', name: 'str_NUMERO_CAISSE_OFFICIEL',
                    id: 'str_NUMERO_CAISSE_OFFICIEL'},
                {fieldLabel: 'Code Doc Comptoire', name: 'str_CODE_DOC_COMPTOIRE', id: 'str_CODE_DOC_COMPTOIRE'},
                {fieldLabel: 'Regime.Caisse', xtype: 'combobox', name: 'lg_REGIMECAISSE_ID', id: 'lg_REGIMECAISSE_ID',
                    store: store_regime_tp, valueField: 'lg_REGIMECAISSE_ID', displayField: 'str_LIBELLEREGIMECAISSE',
                    queryMode: 'remote'},
                {fieldLabel: 'Type.Contrat', xtype: 'combobox', name: 'lg_TYPE_CONTRAT_ID', id: 'lg_TYPE_CONTRAT_ID',
                    store: store_typecontrat_tp, valueField: 'lg_TYPE_CONTRAT_ID',
                    displayField: 'str_LIBELLE_TYPE_CONTRAT', queryMode: 'remote'},
                {fieldLabel: 'Code Regroupement', name: 'str_CODE_REGROUPEMENT', id: 'str_CODE_REGROUPEMENT'},
                {fieldLabel: 'Risque', xtype: 'combobox', name: 'lg_RISQUE_ID', id: 'lg_RISQUE_ID',
                    store: store_risque_tp, valueField: 'lg_RISQUE_ID', displayField: 'str_LIBELLE_RISQUE',
                    queryMode: 'remote'},
                {fieldLabel: 'Centre payeur', name: 'str_CENTRE_PAYEUR', id: 'str_CENTRE_PAYEUR'},
                {fieldLabel: 'Caution', name: 'caution', id: 'caution'},
                {fieldLabel: 'Seuil minimum', name: 'dbl_SEUIL_MINIMUM', id: 'dbl_SEUIL_MINIMUM'},
                {fieldLabel: 'Code Paiement', name: 'str_CODE_PAIEMENT', id: 'str_CODE_PAIEMENT'}
            ]
        };

        var form = new Ext.form.Panel({
            cls: 'fiche-tp',
            bodyPadding: 12,
            scrollable: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 130,
                msgTarget: 'side'
            },
            /*
             * Quatre blocs seulement, et une meme grille de quatre colonnes sur toutes les lignes.
             *
             * Le premier reunit ce qu'on regarde en premier : qui est l'organisme et comment le
             * joindre. Viennent ensuite ce qui decide de sa facture, ses conditions, puis son
             * compte. Tout le reste est masque (voir champsMasques ci-dessus).
             *
             * Aucun champ n'a change de nom ni d'identifiant : l'enregistrement et le chargement
             * sont exactement ceux d'avant.
             */
            defaults: {
                xtype: 'fieldset',
                collapsible: true,
                layout: 'vbox',
                defaultType: 'textfield',
                defaults: {anchor: '100%'}
            },
            items: [
                {
                    title: 'Identification et coordonn&eacute;es',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 4 0',
                            defaults: {flex: 1, labelWidth: 105, margin: '0 10 0 0'},
                            items: [
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Nom Abrege',
                                    emptyText: 'Nom Abrege',
                                    name: 'str_NAME_ADD',
                                    id: 'str_NAME_ADD',
                                    style: 'background-color: #ffffe0;',
                                    listeners: {
                                        change: function (field, newValue) {
                                            // Récupérer les autres champs
                                            var fullnameField = Ext.getCmp('str_FULLNAME');
                                            var codeOrganismeField = Ext.getCmp('str_CODE_ORGANISME');

                                            // Mettre à jour leur valeur
                                            if (fullnameField) {
                                                fullnameField.setValue(newValue);
                                            }
                                            if (codeOrganismeField) {
                                                codeOrganismeField.setValue(newValue);
                                            }
                                        }
                                    }
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Nom complet',
                                    emptyText: 'Nom complet',
                                    name: 'str_FULLNAME',
                                    id: 'str_FULLNAME',
                                    style: 'background-color: #ffffe0;'
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Code.Organisme',
                                    emptyText: 'CODE ORGANISME',
                                    name: 'str_CODE_ORGANISME',
                                    id: 'str_CODE_ORGANISME',
                                    style: 'background-color: #ffffe0;'
                                },
                                {
                                    allowBlank: false,
                                    xtype: 'combobox',
                                    fieldLabel: 'Type.Tiers.Payant',
                                    name: 'lg_TYPE_TIERS_PAYANT_ID_ADD',
                                    id: 'lg_TYPE_TIERS_PAYANT_ID_ADD',
                                    store: store_type_tp,
                                    valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                                    displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                                    editable: false,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un type tiers payant ...',
                                    style: 'background-color: #ffffe0;',
                                    listeners: {
                                        select: function () {
                                            majAffichageCarnetDepot();
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 4 0',
                            defaults: {flex: 1, labelWidth: 105, margin: '0 10 0 0'},
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Groupe',
                                    name: 'lg_GROUPE_ID',
                                    id: 'lg_GROUPE_ID',
                                    store: groupesStore,
                                    valueField: 'str_LIBELLE',
                                    displayField: 'str_LIBELLE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un groupe...',
                                    listeners: {
                                        keypress: function (field, e) {
                                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                                if (field.getValue().length === 1) {
                                                    field.getStore().load();
                                                }
                                            }

                                        }
                                    }
                                },
                                {
                                    fieldLabel: 'Code Officine',
                                    emptyText: 'Code Officine',
                                    name: 'str_CODE_OFFICINE',
                                    id: 'str_CODE_OFFICINE'
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Adresse',
                                    emptyText: 'ADRESSE',
                                    name: 'str_ADRESSE',
                                    id: 'str_ADRESSE',
                                    style: 'background-color: #ffffe0;',
                                    value: 'ABJ'
                                },
                                {
                                    allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Telephone',
                                    emptyText: 'TELEPHONE',
                                    name: 'str_TELEPHONE',
                                    id: 'str_TELEPHONE',
                                    style: 'background-color: #ffffe0;',
                                    value: '225'
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 2 0',
                            defaults: {flex: 1, labelWidth: 105, margin: '0 10 0 0'},
                            items: [
                                {
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Mobile',
                                    emptyText: 'Mobile',
                                    name: 'str_MOBILE',
                                    id: 'str_MOBILE'
                                },
                                {
                                    fieldLabel: 'Mail',
                                    emptyText: 'MAIL',
                                    name: 'str_MAIL',
                                    id: 'str_MAIL'
                                },
                                {
                                    fieldLabel: 'Compte Contribuable',
                                    emptyText: 'Compte Contribuable',
                                    name: 'str_COMPTE_CONTRIBUABLE',
                                    id: 'str_COMPTE_CONTRIBUABLE'
                                },
                                {
                                    fieldLabel: 'Registre de Commerce',
                                    emptyText: 'Registre de Commerce',
                                    name: 'str_REGISTRE_COMMERCE',
                                    id: 'str_REGISTRE_COMMERCE'
                                }
                            ]
                        }
                    ]
                },
                {
                    /*
                     * Tout ce qui decide de la facture de ce tiers payant. La 4e colonne porte les
                     * trois reglages de l'edition, l'un sous l'autre : tri des bons, nombre de bons
                     * par page, taille de police.
                     */
                    title: 'Facturation et &eacute;dition de la facture',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            margin: '0 0 2 0',
                            defaults: {
                                flex: 1,
                                margin: '0 10 0 0',
                                xtype: 'container',
                                layout: 'anchor',
                                defaultType: 'textfield',
                                defaults: {anchor: '100%', labelWidth: 105, margin: '0 0 4 0'}
                            },
                            items: [
                                {
                                    items: [
                                        {
                                            maskRe: /[0-9.]/,
                                            fieldLabel: 'Nbre Bons &agrave; facturer',
                                            emptyText: 'Nbre Bons à facturer',
                                            name: 'nbrbons',
                                            id: 'nbrbons'
                                        },
                                        {
                                            maskRe: /[0-9.]/,
                                            fieldLabel: 'Montant Facture',
                                            emptyText: 'Montant Facture',
                                            name: 'montantFact',
                                            id: 'montantFact'
                                        },
                                        {
                                            maskRe: /[0-9.]/,
                                            fieldLabel: 'Nbre.Exempl.Bord',
                                            emptyText: 'Nbre.Exemplaire.Bord',
                                            name: 'int_NBRE_EXEMPLAIRE_BORD',
                                            id: 'int_NBRE_EXEMPLAIRE_BORD',
                                            minValue: 1
                                        }
                                    ]
                                },
                                {
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Code.Edit.Bordereau',
                                            displayField: 'str_VALUE',
                                            valueField: 'str_VALUE',
                                            id: 'str_CODE_EDIT_BORDEREAU',
                                            emptyText: 'Code.Edit.Bordereau',
                                            queryMode: 'remote',
                                            store: store_modelfacture
                                        },
                                        {
                                            maskRe: /[0-9.]/,
                                            fieldLabel: 'Date.dern.edition',
                                            name: 'int_DATE_DERNIERE_EDITION',
                                            id: 'int_DATE_DERNIERE_EDITION'
                                        },
                                        {
                                            xtype: 'checkbox',
                                            fieldLabel: 'Grouper par taux',
                                            name: 'groupingByTaux',
                                            id: 'groupingByTaux'
                                        }
                                    ]
                                },
                                {
                                    // 3e colonne libre : elle garde l'alignement des quatre colonnes
                                    items: []
                                },
                                {
                                    // 4e colonne : les trois reglages de l'edition, l'un sous l'autre.
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Tri facture',
                                            name: 'str_MODE_TRI_FACTURE',
                                            id: 'str_MODE_TRI_FACTURE_TP',
                                            store: Ext.create('Ext.data.ArrayStore', {
                                                data: [
                                                    ['ALPHABETIQUE', 'Alphabétique (nom du client)'],
                                                    ['DATE_BON', 'Date du bon / opération']
                                                ],
                                                fields: [{name: 'value', type: 'string'},
                                                    {name: 'libelle', type: 'string'}]
                                            }),
                                            valueField: 'value',
                                            displayField: 'libelle',
                                            editable: false,
                                            queryMode: 'local',
                                            value: 'ALPHABETIQUE'
                                        },
                                        {
                                            xtype: 'numberfield',
                                            fieldLabel: 'Bons par page',
                                            name: 'int_NB_BONS_PAR_PAGE',
                                            id: 'int_NB_BONS_PAR_PAGE',
                                            emptyText: 'Automatique',
                                            allowBlank: true,
                                            allowDecimals: false,
                                            minValue: 5,
                                            maxValue: 500,
                                            step: 5,
                                            // 20 bons par page par defaut. Vider le champ revient a
                                            // « automatique » : la page se remplit alors d'elle-meme.
                                            value: 20
                                        },
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Police facture',
                                            name: 'int_TAILLE_POLICE',
                                            id: 'int_TAILLE_POLICE',
                                            store: Ext.create('Ext.data.ArrayStore', {
                                                data: [
                                                    [0, 'Automatique (taille du modèle)'],
                                                    [5, '5 points'],
                                                    [6, '6 points'],
                                                    [7, '7 points'],
                                                    [8, '8 points'],
                                                    [9, '9 points'],
                                                    [10, '10 points'],
                                                    [11, '11 points'],
                                                    [12, '12 points']
                                                ],
                                                fields: [{name: 'value', type: 'int'},
                                                    {name: 'libelle', type: 'string'}]
                                            }),
                                            valueField: 'value',
                                            displayField: 'libelle',
                                            editable: false,
                                            queryMode: 'local',
                                            // 7 points : la taille moyenne des modeles livres.
                                            value: 7
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    title: 'Conditions commerciales',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 4 0',
                            defaults: {flex: 1, labelWidth: 105, margin: '0 10 0 0'},
                            items: [
                                {
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Pourcentage.Remise',
                                    emptyText: 'POURCENTAGE_REMISE',
                                    name: 'dbl_POURCENTAGE_REMISE',
                                    id: 'dbl_POURCENTAGE_REMISE'
                                },
                                {
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Remise.Forfetaire',
                                    emptyText: 'REMISE_FORFETAIRE',
                                    name: 'dbl_REMISE_FORFETAIRE',
                                    id: 'dbl_REMISE_FORFETAIRE'
                                },
                                {
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'D&eacute;lai paiement',
                                    name: 'dt_DELAI_PAIEMENT',
                                    id: 'dt_DELAI_PAIEMENT'
                                },
                                {xtype: 'container'}
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            margin: '0 0 2 0',
                            defaults: {flex: 1, labelWidth: 105, margin: '0 10 0 0'},
                            items: [
                                {
                                    xtype: 'checkbox',
                                    fieldLabel: 'Interdiction',
                                    name: 'bool_INTERDICTION',
                                    id: 'bool_INTERDICTION'
                                },
                                {
                                    xtype: 'checkbox',
                                    fieldLabel: 'Utilise la cmu',
                                    name: 'cmu',
                                    id: 'cmu'
                                },
                                {xtype: 'container'},
                                {xtype: 'container'}
                            ]
                        }
                    ]
                },
                {
                    title: 'Compte et plafonds',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 4 0',
                            defaults: {flex: 1, labelWidth: 105, margin: '0 10 0 0'},
                            items: [
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Caution',
                                    emptyText: 'Caution',
                                    name: 'dbl_CAUTION',
                                    id: 'dbl_CAUTION',
                                    value: 0
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Quota',
                                    emptyText: 'Quota',
                                    name: 'dbl_QUOTA_CONSO_MENSUELLE',
                                    id: 'dbl_QUOTA_CONSO_MENSUELLE',
                                    selectOnFocus: true,
                                    value: 0
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Plafond credit',
                                    emptyText: 'Plafond credit',
                                    name: 'dbl_PLAFOND_CREDIT',
                                    id: 'dbl_PLAFOND_CREDIT',
                                    selectOnFocus: true,
                                    value: 0
                                },
                                {
                                    // Valeur predefinie du plafond des liens client/tiers payant :
                                    // heritee par les nouveaux clients, propagee aux liens actifs
                                    // quand elle change. 0 = aucun plafond predefini.
                                    fieldLabel: 'Plafond par vente',
                                    emptyText: 'Plafond par vente',
                                    name: 'dbl_PLAFOND_VENTE',
                                    id: 'dbl_PLAFOND_VENTE',
                                    maskRe: /[0-9.]/,
                                    selectOnFocus: true,
                                    value: 0
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Accompte',
                                    emptyText: 'Accompte',
                                    hidden: true,
                                    name: 'int_ACCOUNT',
                                    id: 'int_ACCOUNT',
                                    value: 0
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            margin: '0 0 2 0',
                            defaults: {flex: 1, labelWidth: 105, margin: '0 10 0 0'},
                            items: [
                                {
                                    xtype: 'checkbox',
                                    fieldLabel: 'Prepayer',
                                    name: 'bool_IsACCOUNT',
                                    id: 'bool_IsACCOUNT',
                                    // Retire de la vue, mais toujours present : le champ garde sa valeur, la
                                    // soumet comme avant, et son ecouteur continue de piloter le quota et le
                                    // montant du compte. Rien n'est supprime, on cesse seulement de le montrer.
                                    hidden: true,
                                    listeners: {
                                        change: function (checkbox, newValue, oldValue, eOpts) {
                                            if (newValue) {
                                                Ext.getCmp('int_ACCOUNT').show();
                                                Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').disable();
                                                Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').setValue(0);
                                            } else {
                                                Ext.getCmp('int_ACCOUNT').hide();
                                                Ext.getCmp('int_ACCOUNT').setValue(0);
                                                Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').enable();
                                            }
                                        }
                                    }
                                },
                                {
                                    xtype: 'checkbox',
                                    fieldLabel: 'Plafond absolu',
                                    boxLabel: 'Le plafond est-il absolu ?',
                                    name: 'b_IsAbsolute',
                                    checked: false,
                                    id: 'b_IsAbsolute'
                                },
                                {
                                    /* Ne concerne que les carnets : l'interrupteur reste cache tant que le
                                     * type choisi n'est pas « carnet ». Il evite d'avoir a ressortir de la
                                     * fiche pour aller cocher « gerer comme depot » dans un autre menu. */
                                    xtype: 'checkbox',
                                    fieldLabel: 'Carnet dépôt',
                                    boxLabel: 'Gérer ce carnet comme un dépôt',
                                    name: 'is_depot',
                                    id: 'is_depot',
                                    checked: false,
                                    hidden: true
                                },
                                {xtype: 'container'}
                            ]
                        }
                    ]
                },
                champsMasques
            ]

        });
        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_TIERS_PAYANT_ID;

            Ext.getCmp('str_CODE_ORGANISME').setValue(this.getOdatasource().str_CODE_ORGANISME);
            Ext.getCmp('str_NAME_ADD').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_FULLNAME').setValue(this.getOdatasource().str_FULLNAME);

            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_MOBILE').setValue(this.getOdatasource().str_MOBILE);
            Ext.getCmp('str_TELEPHONE').setValue(this.getOdatasource().str_TELEPHONE);
            Ext.getCmp('str_MAIL').setValue(this.getOdatasource().str_MAIL);
            Ext.getCmp('str_CODE_OFFICINE').setValue(this.getOdatasource().str_CODE_OFFICINE);
            Ext.getCmp('str_COMPTE_CONTRIBUABLE').setValue(this.getOdatasource().str_COMPTE_CONTRIBUABLE);

            Ext.getCmp('str_REGISTRE_COMMERCE').setValue(this.getOdatasource().str_REGISTRE_COMMERCE);
            Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').setValue(this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE);


            Ext.getCmp('dbl_PLAFOND_CREDIT').setValue(this.getOdatasource().dbl_PLAFOND_CREDIT);
            Ext.getCmp('dbl_PLAFOND_VENTE').setValue(this.getOdatasource().dbl_PLAFOND_VENTE || 0);
            Ext.getCmp('dbl_TAUX_REMBOURSEMENT').setValue(this.getOdatasource().dbl_TAUX_REMBOURSEMENT);

            Ext.getCmp('str_NUMERO_IDF_ORGANISME').setValue(this.getOdatasource().str_NUMERO_IDF_ORGANISME);
            Ext.getCmp('str_NUMERO_CAISSE_OFFICIEL').setValue(this.getOdatasource().str_NUMERO_CAISSE_OFFICIEL);
            Ext.getCmp('str_CENTRE_PAYEUR').setValue(this.getOdatasource().str_CENTRE_PAYEUR);
            Ext.getCmp('str_CODE_REGROUPEMENT').setValue(this.getOdatasource().str_CODE_REGROUPEMENT);

            Ext.getCmp('dbl_SEUIL_MINIMUM').setValue(this.getOdatasource().dbl_SEUIL_MINIMUM);
            Ext.getCmp('bool_INTERDICTION').setValue(this.getOdatasource().bool_INTERDICTION);
            Ext.getCmp('str_CODE_COMPTABLE').setValue(this.getOdatasource().str_CODE_COMPTABLE);
            Ext.getCmp('bool_PRENUM_FACT_SUBROGATOIRE').setValue(this.getOdatasource().bool_PRENUM_FACT_SUBROGATOIRE);
            Ext.getCmp('int_NUMERO_DECOMPTE').setValue(this.getOdatasource().int_NUMERO_DECOMPTE);
            Ext.getCmp('str_CODE_PAIEMENT').setValue(this.getOdatasource().str_CODE_PAIEMENT);

            Ext.getCmp('dt_DELAI_PAIEMENT').setValue(this.getOdatasource().dt_DELAI_PAIEMENT);
            Ext.getCmp('dbl_POURCENTAGE_REMISE').setValue(this.getOdatasource().dbl_POURCENTAGE_REMISE);
            Ext.getCmp('dbl_REMISE_FORFETAIRE').setValue(this.getOdatasource().dbl_REMISE_FORFETAIRE);
            Ext.getCmp('str_CODE_EDIT_BORDEREAU').setValue(this.getOdatasource().lg_MODEL_FACTURE_ID);
            Ext.getCmp('int_NBRE_EXEMPLAIRE_BORD').setValue(this.getOdatasource().int_NBRE_EXEMPLAIRE_BORD);
            Ext.getCmp('int_PERIODICITE_EDIT_BORD').setValue(this.getOdatasource().int_PERIODICITE_EDIT_BORD);

            Ext.getCmp('int_DATE_DERNIERE_EDITION').setValue(this.getOdatasource().int_DATE_DERNIERE_EDITION);
            Ext.getCmp('str_NUMERO_IDF_ORGANISME').setValue(this.getOdatasource().str_NUMERO_IDF_ORGANISME);
            Ext.getCmp('dbl_MONTANT_F_CLIENT').setValue(this.getOdatasource().dbl_MONTANT_F_CLIENT);
            Ext.getCmp('dbl_BASE_REMISE').setValue(this.getOdatasource().dbl_BASE_REMISE);
            Ext.getCmp('str_CODE_DOC_COMPTOIRE').setValue(this.getOdatasource().str_CODE_DOC_COMPTOIRE);
            Ext.getCmp('bool_ENABLED').setValue(this.getOdatasource().bool_ENABLED);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID_ADD').setValue(this.getOdatasource().lg_TYPE_TIERS_PAYANT_ID);
            // L'interrupteur du carnet depot se presente dans l'etat enregistre. Le magasin des
            // types se remplit en differe : on repasse a son chargement pour que la case soit
            // visible ou non selon le type reellement charge.
            Ext.getCmp('is_depot').setValue(this.getOdatasource().is_depot === true
                    || this.getOdatasource().is_depot === 'true');
            majAffichageCarnetDepot();
            store_type_tp.on('load', majAffichageCarnetDepot);
            Ext.getCmp('lg_TYPE_CONTRAT_ID').setValue(this.getOdatasource().lg_TYPE_CONTRAT_ID);
            Ext.getCmp('lg_REGIMECAISSE_ID').setValue(this.getOdatasource().lg_REGIMECAISSE_ID);
            Ext.getCmp('lg_RISQUE_ID').setValue(this.getOdatasource().lg_RISQUE_ID);
            Ext.getCmp('bool_IsACCOUNT').setValue(this.getOdatasource().bool_IsACCOUNT);
            Ext.getCmp('dbl_CAUTION').setValue(this.getOdatasource().dbl_CAUTION);
            Ext.getCmp('lg_GROUPE_ID').setValue(this.getOdatasource().lgGROUPEID);
            Ext.getCmp('montantFact').setValue(this.getOdatasource().montantFact);
            Ext.getCmp('nbrbons').setValue(this.getOdatasource().nbrbons);
            Ext.getCmp('groupingByTaux').setValue(this.getOdatasource().groupingByTaux);
            Ext.getCmp('str_MODE_TRI_FACTURE_TP').setValue(this.getOdatasource().str_MODE_TRI_FACTURE || 'ALPHABETIQUE');
            // Un tiers payant deja regle garde SA valeur. Celui qui n'a jamais ete regle
            // (0 en base = automatique) affiche la valeur par defaut de la fiche : 20 bons par
            // page et 7 points. Tant qu'on n'enregistre pas, rien n'est ecrit en base.
            var bonsParPage = this.getOdatasource().int_NB_BONS_PAR_PAGE;
            Ext.getCmp('int_NB_BONS_PAR_PAGE').setValue(bonsParPage > 0 ? bonsParPage : 20);
            var taillePolice = this.getOdatasource().int_TAILLE_POLICE;
            Ext.getCmp('int_TAILLE_POLICE').setValue(taillePolice > 0 ? taillePolice : 7);
            Ext.getCmp('cmu').setValue(this.getOdatasource().cmu);
            Ext.getCmp('caution').setValue(this.getOdatasource().caution);
            
            Ext.getCmp('dbl_CAUTION').disable();

            Ext.getCmp('bool_IsACCOUNT').hide();
            Ext.getCmp('b_IsAbsolute').setValue(this.getOdatasource().b_IsAbsolute);
        }


        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: '85%',
            // Quatre blocs de deux a trois lignes : la fiche tient sans qu'on ait a agrandir la
            // fenetre a la main. Bornee a l'ecran, et le formulaire garde son ascenseur au cas ou
            // un theme ou une resolution rendrait les champs plus hauts que prevu.
            height: Math.min(600, Ext.Element.getViewportHeight() - 40),
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            maximizable: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Retour',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    }, onbtnsave: function (button) {


        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var dbl_QUOTA_CONSO_MENSUELLE = 0;
        if (Ext.getCmp('bool_IsACCOUNT').getValue()) {

            dbl_QUOTA_CONSO_MENSUELLE = Ext.getCmp('int_ACCOUNT').getValue();
        } else {
            dbl_QUOTA_CONSO_MENSUELLE = Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').getValue();

        }



        if (formulaire.isValid()) {

            if (Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID_ADD').getValue() == "1" && Ext.getCmp('bool_IsACCOUNT').getValue() == "true") {
                Ext.MessageBox.alert('Error Message', "Un tiers payant de type assurance ne peut pas beneficier du prepayer");
                return;
            }

            var internal_url = "";


            if (Omode === "create") {

                internal_url = url_services_transaction_tierspayant + 'create';

                //alert("CREATION DE TP OK");

            } else {
                // Modification en REST (memes regles metier que la JSP) ; l'identifiant est
                // transmis en parametre de formulaire et non plus dans l'URL
                internal_url = '../api/v1/tierspayant/gestion/update';
            }
            var lg_GROUPE_ID = Ext.getCmp('lg_GROUPE_ID').getValue();

            if (lg_GROUPE_ID === null && lg_GROUPE_ID === '') {
                lg_GROUPE_ID = '';
            }


            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                method: 'POST',
                params: {
                    lg_TIERS_PAYANT_ID: (Omode === "create" ? '' : ref),
                    str_CODE_ORGANISME: Ext.getCmp('str_CODE_ORGANISME').getValue(),
                    str_NAME: Ext.getCmp('str_NAME_ADD').getValue(),
                    str_FULLNAME: Ext.getCmp('str_FULLNAME').getValue(),
                    str_ADRESSE: Ext.getCmp('str_ADRESSE').getValue(),
                    str_MOBILE: Ext.getCmp('str_MOBILE').getValue(),
                    str_TELEPHONE: Ext.getCmp('str_TELEPHONE').getValue(),
                    str_MAIL: Ext.getCmp('str_MAIL').getValue(),
                    dbl_QUOTA_CONSO_MENSUELLE: dbl_QUOTA_CONSO_MENSUELLE,
                    dbl_CAUTION: Ext.getCmp('dbl_CAUTION').getValue(),
                    bool_IsACCOUNT: Ext.getCmp('bool_IsACCOUNT').getValue(),
                    dbl_PLAFOND_CREDIT: Ext.getCmp('dbl_PLAFOND_CREDIT').getValue(),
                    // En modification, le service REST pose la valeur et la propage aux liens
                    // actifs au changement. En creation, la JSP historique l'ignore : elle part
                    // dans le second temps ci-dessous, avec « gere comme depot ».
                    dbl_PLAFOND_VENTE: Ext.getCmp('dbl_PLAFOND_VENTE').getValue() || 0,
                    dbl_TAUX_REMBOURSEMENT: Ext.getCmp('dbl_TAUX_REMBOURSEMENT').getValue(),
                    str_NUMERO_CAISSE_OFFICIEL: Ext.getCmp('str_NUMERO_CAISSE_OFFICIEL').getValue(),
                    str_CENTRE_PAYEUR: Ext.getCmp('str_CENTRE_PAYEUR').getValue(),
                    str_CODE_REGROUPEMENT: Ext.getCmp('str_CODE_REGROUPEMENT').getValue(),
                    dbl_SEUIL_MINIMUM: Ext.getCmp('dbl_SEUIL_MINIMUM').getValue(),
                    bool_INTERDICTION: Ext.getCmp('bool_INTERDICTION').getValue(),
                    str_CODE_COMPTABLE: Ext.getCmp('str_CODE_COMPTABLE').getValue(),
                    bool_PRENUM_FACT_SUBROGATOIRE: Ext.getCmp('bool_PRENUM_FACT_SUBROGATOIRE').getValue(),
                    int_NUMERO_DECOMPTE: Ext.getCmp('int_NUMERO_DECOMPTE').getValue(),
                    str_CODE_PAIEMENT: Ext.getCmp('str_CODE_PAIEMENT').getValue(),
                    dt_DELAI_PAIEMENT: Ext.getCmp('dt_DELAI_PAIEMENT').getValue(),
                    dbl_POURCENTAGE_REMISE: Ext.getCmp('dbl_POURCENTAGE_REMISE').getValue(),
                    dbl_REMISE_FORFETAIRE: Ext.getCmp('dbl_REMISE_FORFETAIRE').getValue(),
                    str_CODE_EDIT_BORDEREAU: Ext.getCmp('str_CODE_EDIT_BORDEREAU').getValue(),
                    int_NBRE_EXEMPLAIRE_BORD: Ext.getCmp('int_NBRE_EXEMPLAIRE_BORD').getValue(),
                    int_PERIODICITE_EDIT_BORD: Ext.getCmp('int_PERIODICITE_EDIT_BORD').getValue(),
                    int_DATE_DERNIERE_EDITION: Ext.getCmp('int_DATE_DERNIERE_EDITION').getValue(),
                    str_NUMERO_IDF_ORGANISME: Ext.getCmp('str_NUMERO_IDF_ORGANISME').getValue(),
                    dbl_MONTANT_F_CLIENT: Ext.getCmp('dbl_MONTANT_F_CLIENT').getValue(),
                    dbl_BASE_REMISE: Ext.getCmp('dbl_BASE_REMISE').getValue(),
                    str_CODE_DOC_COMPTOIRE: Ext.getCmp('str_CODE_DOC_COMPTOIRE').getValue(),
                    bool_ENABLED: Ext.getCmp('bool_ENABLED').getValue(),
                    lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                    lg_TYPE_TIERS_PAYANT_ID: Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID_ADD').getValue(),
                    lg_TYPE_CONTRAT_ID: Ext.getCmp('lg_TYPE_CONTRAT_ID').getValue(),
                    lg_REGIMECAISSE_ID: Ext.getCmp('lg_REGIMECAISSE_ID').getValue(),
                    lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID').getValue(),
                    str_REGISTRE_COMMERCE: Ext.getCmp('str_REGISTRE_COMMERCE').getValue(),
                    str_CODE_OFFICINE: Ext.getCmp('str_CODE_OFFICINE').getValue(),
                    str_COMPTE_CONTRIBUABLE: Ext.getCmp('str_COMPTE_CONTRIBUABLE').getValue(),
                    b_IsAbsolute: Ext.getCmp('b_IsAbsolute').getValue(),
                    lg_GROUPE_ID: lg_GROUPE_ID,
                    montantFact: Ext.getCmp('montantFact').getValue(),
                    nbrbons: Ext.getCmp('nbrbons').getValue(),
                    groupingByTaux: Ext.getCmp('groupingByTaux').getValue(),
                    str_MODE_TRI_FACTURE: Ext.getCmp('str_MODE_TRI_FACTURE_TP').getValue(),
                    // Champ vide = automatique : on transmet 0, la facture garde sa presentation actuelle
                    int_NB_BONS_PAR_PAGE: Ext.getCmp('int_NB_BONS_PAR_PAGE').getValue() || 0,
                    int_TAILLE_POLICE: Ext.getCmp('int_TAILLE_POLICE').getValue() || 0,
                    cmu: Ext.getCmp('cmu').getValue(),
                    caution: Ext.getCmp('caution').getValue(),
                    // Gere comme depot : n'a de sens que pour un carnet, d'ou le controle de
                    // visibilite. En modification, le service REST le pose avec le reste.
                    is_depot: Ext.getCmp('is_depot').isVisible() && Ext.getCmp('is_depot').getValue()
                },
                success: function (response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        /* A la CREATION, la page historique ne rend pas l'identifiant du tiers
                         * payant qu'elle vient d'ecrire : l'option « gere comme depot » ne peut
                         * donc pas voyager avec le reste. On la pose dans un second temps, et
                         * c'est le serveur qui retrouve la fiche - meme nom, meme type, creee a
                         * l'instant. En modification, elle est deja posee par le service REST. */
                        var poserDepot = (Omode === "create" && Ext.getCmp('is_depot').isVisible()
                                && Ext.getCmp('is_depot').getValue());
                        var plafondVenteCree = (Omode === "create"
                                ? (parseFloat(Ext.getCmp('dbl_PLAFOND_VENTE').getValue()) || 0) : 0);
                        var terminer = function (messageEnPlus) {
                            Ext.MessageBox.alert('Confirmation',
                                    object.errors + (messageEnPlus ? '<br><br>' + messageEnPlus : ''));
                            fenetre.close();
                            Me_Workflow = Oview;
                            Me_Workflow.getStore().reload();
                        };
                        if (!poserDepot && plafondVenteCree <= 0) {
                            terminer();
                            return;
                        }
                        Ext.Ajax.request({
                            url: '../api/v1/tierspayant/gestion/depot-apres-creation',
                            method: 'POST',
                            params: {
                                str_NAME: Ext.getCmp('str_NAME_ADD').getValue(),
                                lg_TYPE_TIERS_PAYANT_ID: Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID_ADD').getValue(),
                                is_depot: poserDepot,
                                dbl_PLAFOND_VENTE: plafondVenteCree
                            },
                            success: function (reponseDepot) {
                                var r = Ext.JSON.decode(reponseDepot.responseText, true) || {};
                                terminer(r.success ? '' : r.message);
                            },
                            failure: function () {
                                terminer("Les options (géré comme dépôt, plafond par vente) n'ont pas pu être posées."
                                        + " Ouvrez la fiche depuis la liste pour les renseigner.");
                            }
                        });
                    }

                },
                failure: function (response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);

                    Ext.MessageBox.alert('Error Message', response.responseText);

                }
            });

        } else {
            Ext.MessageBox.show({
                title: 'Averstissement',
                msg: 'Veuillez renseigner les champs obligatoires',
                // width: 300,
                height: 150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
        }
    }
});