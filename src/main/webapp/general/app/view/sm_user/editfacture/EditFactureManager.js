/* global Ext */


var url_services_data_facturation = '../api/v1/facture-tiers-payant/list';
var url_services_data_typefacture = '../webservices/sm_user/typefacture/ws_data.jsp';
var url_services_transaction_facturation = '../api/v1/facture-tiers-payant/transaction?mode=';
var url_services_pdf_tiers_payant = '../webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?lg_FACTURE_ID=';
var url_services_pdf_fournisseurs = '../webservices/sm_user/facturation/ws_rp_facture_fournisseur.jsp?lg_FACTURE_ID=';
var url_services_data_tiers_payant = '../webservices/tierspayantmanagement/tierspayant/ws_search_data.jsp';
var url_services_data_grossiste = "../webservices/configmanagement/grossiste/ws_data.jsp";
var Me;
var valdatedebut;
var valdatefin;
var myAppController;
var groupeStore, groupesStore;
var factureStore;
var searchstore;

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

/**
 * Complement de date pour les info-bulles FNE : " le 10/08/2026 14:32:05" quand la date de
 * l'appel FNE est connue.
 *
 * Quand elle ne l'est pas, l'info-bulle le DIT au lieu de se taire : sans mention, l'utilisateur
 * ne peut pas distinguer une date manquante d'un oubli du logiciel. La date vient de la trace
 * fne_invoice, alimentee a chaque appel FNE ; les factures certifiees AVANT la mise en place de
 * cette trace n'en ont pas, et n'en auront jamais - c'est aussi pour cette raison qu'elles ne
 * peuvent pas faire l'objet d'un avoir sans rattachement manuel.
 *
 * @param {String} prefixe texte de liaison, par exemple " le "
 * @param {String} valeur date deja formatee renvoyee par l'API, vide si inconnue
 * @param {String} mentionSiInconnue texte affiche a la place de la date, quand elle est inconnue
 */
function complementDateFne(prefixe, valeur, mentionSiInconnue) {
    if (valeur) {
        return prefixe + valeur;
    }
    return mentionSiInconnue || ' (date inconnue)';
}

/** Mention affichee quand la date de certification n'a pas ete conservee. */
var DATE_CERTIFICATION_INCONNUE = ' (date inconnue : certification ant&eacute;rieure &agrave; la version actuelle)';

/**
 * Etat FNE d'une facture, une ligne par evenement : la certification, puis l'avoir s'il existe.
 *
 * Une facture qui a fait l'objet d'un avoir reste une facture certifiee : afficher le seul avoir
 * faisait disparaitre la certification et sa date, alors que les deux informations sont utiles.
 * Les deux lignes sont construites a partir des champs deja presents sur la ligne de la grille
 * (fneUrl, fneAvoirReference et leurs dates) : aucun appel supplementaire au serveur.
 *
 * @return {String[]} les lignes a afficher, dans l'ordre chronologique
 */
function lignesEtatFne(rec) {
    var lignes = [];
    if (rec.get('fneUrl')) {
        lignes.push('Facture certifi&eacute;e'
                + complementDateFne(' le ', rec.get('fneDateCertification'), DATE_CERTIFICATION_INCONNUE));
    }
    if (rec.get('fneAvoirReference')) {
        lignes.push('Avoir FNE ' + rec.get('fneAvoirReference')
                + complementDateFne(', effectu&eacute; le ', rec.get('fneDateAvoir')));
    }
    return lignes;
}

/**
 * Traduit les entites HTML d'un texte ("Annul&eacute;e" -> "Annulée").
 * Ext.util.Format.htmlDecode ne connait que &amp; &lt; &gt; &quot; et &#39; : il laisserait
 * "&eacute;" tel quel dans l'info-bulle. Le contenu est place dans un textarea, dont la
 * propriete value rend le texte deja decode (et ou aucun balisage n'est interprete).
 */
function decoderEntitesHtml(texte) {
    var zone = decoderEntitesHtml.zone;
    if (!zone) {
        zone = decoderEntitesHtml.zone = document.createElement('textarea');
    }
    zone.innerHTML = texte;
    return zone.value;
}

/**
 * Renderer qui pose une info-bulle rappelant le libelle de la colonne et la valeur affichee.
 * Sur les petits ecrans la colonne est trop etroite pour tout montrer : l'info-bulle redonne
 * l'information complete au survol, sans changer l'affichage de la cellule.
 *
 * @param {String} libelle libelle de la colonne, repris en tete de l'info-bulle
 * @param {Function} formateur formatage optionnel de la valeur (ex : amountformat)
 */
function renduAvecInfobulle(libelle, formateur) {
    return function (value, meta, rec) {
        var affiche = formateur ? formateur(value, meta, rec) : value;
        var texte = (affiche === null || affiche === undefined) ? '' : String(affiche);
        // stripTags : la cellule "Code Facture" peut contenir du HTML (mention "Annulee - avoir") ;
        // decoderEntitesHtml : sans quoi l'info-bulle afficherait "Annul&eacute;e" en toutes lettres ;
        // htmlEncode : la valeur part dans un attribut HTML entre guillemets (organismes avec
        // apostrophe, guillemets ou esperluette dans leur raison sociale).
        meta.tdAttr = 'data-qtip="'
                + Ext.String.htmlEncode(libelle + ' : ' + decoderEntitesHtml(Ext.util.Format.stripTags(texte)))
                + '"';
        return affiche;
    };
}
Ext.define('testextjs.view.sm_user.editfacture.EditFactureManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'facturemanager',
    id: 'facturemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.selection.CheckboxModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Facture',
        'testextjs.view.sm_user.editfacture.action.add',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des facturations ',
    frame: true,
    // repere les info-bulles issues de cet ecran, cf. marquerInfobullesDeLaListe()
    cls: 'facture-liste',
    width: "98%",
    height: 580,
    viewConfig: {
        // survol : la classe standard d'ExtJS, pour que la ligne soit orange
        // comme dans toutes les autres grilles (vente-theme.css). Cette grille
        // avait sa propre classe et son propre jaune pale.
        trackOver: true,
        // coche de selection masquee (CSS) pour les lignes non supprimables :
        // reglees, partiellement reglees ou avec facture/avoir FNE
        getRowClass: function (rec) {
            return testextjs.view.sm_user.editfacture.EditFactureManager.estSupprimable(rec)
                    ? '' : 'facture-non-supprimable';
        }
    },
    statics: {
        estSupprimable: function (rec) {
            return rec.get('str_STATUT') !== 'paid' && Number(rec.get('dbl_MONTANT_PAYE') || 0) <= 0
                    && !rec.get('fneUrl') && !rec.get('fneAvoirUrl') && rec.get('isALLOWED');
        }
    },
    listeners: {
        render: function (grid) {
            this.onRechClick();
        }
    },
    /**
     * Marque l'info-bulle quand elle est declenchee depuis CET ecran, pour la mettre en bleu gras
     * (regle .tip-facture de vente-theme.css).
     *
     * ExtJS n'a qu'UNE info-bulle pour toute l'application : lui poser la regle directement
     * repeindrait aussi celles des autres ecrans. On regarde donc, juste avant l'affichage, si
     * l'element survole se trouve dans la grille des factures (classe facture-liste), et on pose
     * ou retire la classe en consequence. Le test porte sur le DOM et non sur une instance
     * memorisee : l'ecran peut etre ferme puis rouvert sans laisser de reference morte.
     */
    marquerInfobullesDeLaListe: function () {
        if (!Ext.tip || !Ext.tip.QuickTipManager) {
            return;
        }
        var infobulle = Ext.tip.QuickTipManager.getQuickTip();
        if (!infobulle || infobulle.marquageFactureInstalle) {
            return;
        }
        infobulle.marquageFactureInstalle = true;
        // Intercepteur sur showAt, et NON ecouteur de "beforeshow" : quand on passe d'un bouton a
        // l'autre sans que l'info-bulle disparaisse entre-temps, elle n'est pas re-affichee et
        // "beforeshow" ne se declenche pas - le bleu gras serait alors reste colle a l'info-bulle
        // d'un autre ecran (constate au navigateur). showAt, lui, est appele a chaque changement
        // de cible. Un intercepteur agit AVANT la mise en page : la largeur de l'info-bulle est
        // donc calculee avec le texte deja en gras, qui est plus large.
        infobulle.showAt = Ext.Function.createInterceptor(infobulle.showAt, function () {
            var cible = this.activeTarget && this.activeTarget.el;
            var dansLaListe = cible && cible.nodeType === 1 && cible.closest
                    && cible.closest('.facture-liste');
            if (dansLaListe) {
                this.addCls('tip-facture');
            } else {
                this.removeCls('tip-facture');
            }
        });
    },
    initComponent: function () {

        Me = this;
        var _this = this;

        this.marquerInfobullesDeLaListe();

        myAppController = Ext.create('testextjs.controller.App', {});


        var itemsPerPage = 20;
        factureStore = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                // URL en dur : la globale url_services_data_facturation est redefinie par
                // d'autres ecrans charges apres celui-ci (FactureRegleManager, ...), ce qui
                // renvoyait la grille vers l'ancienne JSP selon l'ordre de chargement
                url: '../api/v1/facture-tiers-payant/list',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        searchstore = Ext.create('testextjs.store.Statistics.TiersPayans');
        var store_typefacture = new Ext.data.Store({
            model: 'testextjs.model.TypeFacture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                // URL en dur : la globale url_services_data_typefacture pointait vers une JSP
                // inexistante, le combo restait vide
                url: '../api/v1/reglement-facture/types-facture',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        _this.store = factureStore;
        _this.columns = _this.buildDetailsColumns();
        _this.dockedItems = _this.buildDocked();
        // Selection multi-pages : pruneRemoved=false conserve les coches lors du
        // changement de page; checkOnly=true n'active la coche que via la case.
        _this.selModel = Ext.create('Ext.selection.CheckboxModel', {
            mode: 'MULTI',
            checkOnly: true,
            pruneRemoved: false,
            listeners: {
                // double securite avec le masquage CSS de la coche
                beforeselect: function (sm, rec) {
                    return testextjs.view.sm_user.editfacture.EditFactureManager.estSupprimable(rec);
                }
            }
        });
        // le bouton "Supprimer la selection" ne s'affiche qu'avec le privilege de suppression
        // (isALLOWED est renvoye par l'API sur chaque ligne, meme valeur pour tout l'ecran)
        factureStore.on('load', function (st, records) {
            var btn = Ext.getCmp('btnSupprimerSelectionFacture');
            if (btn && records && records.length > 0) {
                btn.setVisible(!!records[0].get('isALLOWED'));
            }
        });
        this.callParent();

    },
    buildDocked: function () {
        // _this etait declare dans initComponent : il n'existait pas dans cette
        // methode-ci, et la touche Entree sur la recherche levait
        // "ReferenceError: _this is not defined". On le redeclare ici, ou il est
        // utilise par les ecouteurs de la barre d'outils.
        var _this = this;
        return [
            {xtype: 'toolbar',
                dock: 'top',
//                padding: '8',
                items: [
                    {
                        text: 'Cr&eacute;er',
                        scope: this,
                        iconCls: 'addicon',
                        handler: this.onAddCreate
                    }, '-', {
                        text: 'Supprimer la s&eacute;lection',
                        id: 'btnSupprimerSelectionFacture',
                        hidden: true, // affiche au chargement si l'utilisateur a le privilege de suppression
                        tooltip: 'Supprimer les factures coch&eacute;es',
                        iconCls: 'cancelicon',
                        scope: this,
                        handler: this.onDeleteSelection
                    }, '-', {
                        xtype: 'datefield',
                        id: 'datedebut',
                        name: 'datedebut',
                        emptyText: 'Date debut',
                        flex: 1,
                        submitFormat: 'Y-m-d',
                        maxValue: new Date(),
                        format: 'd/m/Y',
                        value: sessionStorage.getItem('dateStart') || null,
                        listeners: {
                            'change': function (me) {

                                valdatedebut = me.getSubmitValue();
                                Ext.getCmp('datefin').setMinValue(me.getValue());
                            }
                        }
                    }, {
                        xtype: 'tbseparator'
                    }, {
                        xtype: 'datefield',
                        id: 'datefin',
                        name: 'datefin',
                        emptyText: 'Date fin',
                        maxValue: new Date(),
                        submitFormat: 'Y-m-d',
                        flex: 1,
                        format: 'd/m/Y',
                        value: sessionStorage.getItem('datefin') || null,
                        listeners: {
                            'change': function (me) {
                                valdatefin = me.getSubmitValue();
                                Ext.getCmp('datedebut').setMaxValue(me.getValue());
                            }
                        }
                    }
                    , '-',
                    {
                        xtype: 'textfield',
                        id: 'rechecherFacture',
                        width: 150,
                        value: sessionStorage.getItem('searchQuery') || '',
                        emptyText: 'Rech',
                        listeners: {
                            specialKey: function (field, e) {
                                if (e.getKey() === e.ENTER) {
                                    _this.onRechClick(); // _this = la vue liste ; la globale Me est ecrasee par la vue de detail
                                }
                            }
                        }
                    }, '-',
                    {
                        xtype: 'combobox',
                        id: 'lg_TIERS_PAYANT_ID',
                        flex: 2,
                        store: searchstore,
                        pageSize: 10,
                        valueField: 'lg_TIERS_PAYANT_ID',
                        displayField: 'str_FULLNAME',
                        minChars: 2,
                        queryMode: 'remote',
                        enableKeyEvents: true,
                        emptyText: 'Selectionner tiers payant...',
                        value: sessionStorage.getItem('customer') || null,
                        listConfig: {
                            loadingText: 'Recherche...',
                            emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                            getInnerTpl: function () {
                                return '<span>{str_FULLNAME}</span>';
                            }

                        },
                        listeners: {
                            keypress: function (field, e) {

                                if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                    if (field.getValue().length <= 2) {
                                        field.getStore().load();
                                    }

                                }

                            },
                            select: function (cmp) {
                                _this.onRechClick(); // _this = la vue liste ; la globale Me est ecrasee par la vue de detail
                            }

                        }
                    }, {
                        xtype: 'tbseparator'
                    },

                    {
                        xtype: 'combobox',
                        flex: 1,
                        margin: '0 5 0 0',
                        labelWidth: 5,
                        id: 'filtreImpayes',
                        store: Ext.create('Ext.data.ArrayStore', {
                            data: [['', 'Tout'], ['non_regle', 'Non réglées'], ['partiel', 'Partiellement réglées'], ['payes', 'Factures réglées']],
                            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}]
                        }),

                        valueField: 'id',
                        displayField: 'libelle',
                        typeAhead: false,
                        queryMode: 'local',
                        value: '',
                        listeners: {

                            select: function (cmp) {
                                _this.onRechClick(); // _this = la vue liste ; la globale Me est ecrasee par la vue de detail
                            }

                        }

                    },
                    {
                        xtype: 'tbseparator'
                    }


                    , {
                        text: 'rechercher',
                        tooltip: 'rechercher',
                        iconCls: 'searchicon',

                        scope: this,
                        handler: this.onRechClick
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Imprimer',
                        tooltip: 'Imprimer',
                        iconCls: 'importicon',
                        id: 'printInvoicereport',

                        scope: this,
                        handler: this.onPrint
                    },

                    {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Exporter',
                        scope: this,

                        iconCls: 'export_excel_icon',
                        handler: this.exportToExcel
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Relev&eacute; FNE',
                        tooltip: 'Relev&eacute; des factures certifi&eacute;es et avoirs FNE du tiers payant',
                        scope: this,
                        handler: this.onReleveFne
                    }
                ]
            },
            {
                dock: 'bottom',
                xtype: 'pagingtoolbar',
                pageSize: 20,
                id: 'balanceGridpagingbar',
                store: this.store,
                displayInfo: true,
                displayMsg: 'Données affichées {0} - {1} sur {2}',
                emptyMsg: "Pas de donnée à afficher",
                listeners: {
                    beforechange: function (page, currentPage) {
                        console.log('on beforechange ');
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: '',
                            dt_fin: '',
                            dt_debut: '',
                            lg_customer_id: '',
                            'impayes': ''
                        };
                        var val = Ext.getCmp('rechecherFacture').getValue();
                        var lg_customer_id = "";

                        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
                            lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                        }
                        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
                        if (filtreImpayes == null || filtreImpayes == undefined) {
                            filtreImpayes = '';
                        }

                        var dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                        var dt_fin = Ext.getCmp('datefin').getSubmitValue();
                        myProxy.setExtraParam('lg_customer_id', lg_customer_id);
                        myProxy.setExtraParam('search_value', val);
                        myProxy.setExtraParam('dt_debut', dt_debut);
                        myProxy.setExtraParam('dt_fin', dt_fin);
                        myProxy.setExtraParam('impayes', filtreImpayes);

                    }

                }
            }];
    },

    buildDetailsColumns: function () {
        return [
            {
                header: 'lg_FACTURE_ID',
                dataIndex: 'lg_FACTURE_ID',
                hidden: true,
                width: 50
            }, {
                header: 'lg_TYPE_TIERS_PAYANT_ID',
                dataIndex: 'lg_TYPE_TIERS_PAYANT_ID',
                hidden: true,
                width: 20
            }, {
                header: 'Code Facture',
                dataIndex: 'str_CODE_FACTURE',
                flex: 0.5,
                renderer: renduAvecInfobulle('Code facture', function (value, meta, rec) {
                    if (rec.get('str_STATUT') === 'avoir') {
                        return '<span style="color:#c0392b;font-weight:bold;">' + value + ' (Annul&eacute;e - avoir)</span>';
                    }
                    return value;
                })

            }, {
                header: 'Organisme',
                dataIndex: 'str_CUSTOMER_NAME',
                flex: 1,
                renderer: renduAvecInfobulle('Organisme')
            }, {
                header: 'P&eacute;riode',
                dataIndex: 'str_PERIODE',
                flex: 1.5,
                renderer: renduAvecInfobulle('Période')

            }, {
                header: 'Nombre de Dossiers',
                dataIndex: 'int_NB_DOSSIER',
                flex: 0.5,
                align: 'right',
                renderer: renduAvecInfobulle('Nombre de dossiers')
            }
            , {
                header: 'Montant Brut',
                dataIndex: 'MONTANTBRUT',
                flex: 1,
                renderer: renduAvecInfobulle('Montant brut', amountformat),
                align: 'right'
            }
            , {
                header: 'Montant Remise',
                dataIndex: 'MONTANTREMISE',
                flex: 1,
                renderer: renduAvecInfobulle('Montant remise', amountformat),
                align: 'right'
            }, {
                header: 'Montant Forfaitaire',
                dataIndex: 'MONTANTFORFETAIRE',
                flex: 1,
                renderer: renduAvecInfobulle('Montant forfaitaire', amountformat),
                align: 'right'
            }, {
                header: 'Montant.Net',
                dataIndex: 'dbl_MONTANT_CMDE',
                flex: 1,
                renderer: renduAvecInfobulle('Montant net', amountformat),
                align: 'right'
            }

            , {
                header: 'Montant Pay&eacute;',
                dataIndex: 'dbl_MONTANT_PAYE',
                flex: 1,
                renderer: renduAvecInfobulle('Montant payé', amountformat),
                align: 'right'
            }, {
                header: 'Montant Restant',
                dataIndex: 'dbl_MONTANT_RESTANT',
                flex: 1,
                renderer: renduAvecInfobulle('Montant restant', amountformat),
                align: 'right'
            },
            {
                header: 'Date',
                dataIndex: 'dt_CREATED',
                flex: 1,
                renderer: renduAvecInfobulle('Date de facture')

            }, {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            if (rec.get('fneUrl')) {
                                return 'x-hide-display';
                            }
                            if (rec.get('str_STATUT') !== "paid") {

                                if (!rec.get('isALLOWED')) {
                                    return 'lock';
                                } else {
                                    return 'unpaid';
                                }
                            } else {
                                return 'paid';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('fneUrl')) {
                                return '';
                            }
                            if (rec.get('str_STATUT') !== "paid") {
                                if (!rec.get('isALLOWED')) {
                                    return '';
                                } else
                                {
                                    return 'Supprimer ';
                                }


                            } else {
                                return 'Sold&eacute;e ';
                            }
                        },
                        scope: this,
                        handler: this.onRemoveClick

                    }

                ]
            },
            {
                xtype: 'actioncolumn',
                hidden: false,
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        // masque des que la facture porte une certification ou un avoir FNE valide :
                        // une seconde certification cree un doublon officiel non rattrapable
                        getClass: function (v, meta, rec) {
                            if (rec.get('str_STATUT') === 'avoir' || rec.get('fneUrl')
                                    || rec.get('fneAvoirReference')) {
                                return 'x-hide-display';
                            }
                            return 'x-display-hide';
                        },
                        icon: 'resources/images/icons/certication.png',
                        tooltip: 'Certification',
                        scope: this,
                        handler: this.shwoChoiceModal
                    }, {
                        // a la place : une information, pour eviter un clic par erreur
                        getClass: function (v, meta, rec) {
                            return (rec.get('fneUrl') || rec.get('fneAvoirReference')) ? 'x-display-hide'
                                    : 'x-hide-display';
                        },
                        getTip: function (v, meta, rec) {
                            // une ligne par evenement : certification, puis avoir s'il existe
                            return lignesEtatFne(rec).join('<br/>');
                        },
                        icon: 'resources/images/icons/facture-certifiee.svg',
                        scope: this,
                        handler: function (grid, rowIndex) {
                            var rec = grid.getStore().getAt(rowIndex);
                            var avoir = rec.get('fneAvoirReference');
                            Ext.MessageBox.show({
                                title: avoir ? 'Avoir d&eacute;j&agrave; certifi&eacute;'
                                        : 'Facture d&eacute;j&agrave; certifi&eacute;e',
                                msg: 'Facture n&deg; ' + rec.get('str_CODE_FACTURE') + '<br/><br/>'
                                        + lignesEtatFne(rec).join('<br/>') + '<br/><br/>'
                                        + (avoir ? 'Un avoir FNE valide existe d&eacute;j&agrave; : cette facture '
                                                + 'ne peut plus &ecirc;tre certifi&eacute;e.'
                                                : 'Cette facture porte d&eacute;j&agrave; une certification FNE '
                                                + 'valide : elle ne peut pas &ecirc;tre certifi&eacute;e une '
                                                + 'seconde fois.'),
                                minWidth: 420,
                                maxWidth: 560,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.INFO
                            });
                        }
                    }]
            },
            {
                xtype: 'actioncolumn',
                hidden: false,
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{

                        getClass: function (v, meta, rec) {

                            if (rec.get('fneUrl')) {
                                return 'x-display-hide';
                            } else {
                                return 'x-hide-display';
                            }
                        },

                        // format SVG : net en 16 px comme sur les ecrans a forte densite
                        icon: 'resources/images/icons/telecharger-facture-fne.svg',
                        getTip: function (v, meta, rec) {
                            return 'T&eacute;l&eacute;charger la facture certifi&eacute;e'
                                    + complementDateFne(' le ', rec.get('fneDateCertification'), DATE_CERTIFICATION_INCONNUE);
                        },
                        scope: this,
                        handler: this.onOpenFneLink
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            if (rec.get('fneUrl') && !rec.get('fneAvoirReference') && rec.get('AUTORISATION_AVOIR_FNE')
                                    && rec.get('str_STATUT') !== 'paid' && rec.get('str_STATUT') !== 'avoir') {
                                return 'x-display-hide';
                            } else {
                                return 'x-hide-display';
                            }
                        },
                        icon: 'resources/images/icons/fam/retour.png',
                        getTip: function (v, meta, rec) {
                            return '&Eacute;mettre un avoir FNE (total) : facture certifi&eacute;e'
                                    + complementDateFne(' le ', rec.get('fneDateCertification'), DATE_CERTIFICATION_INCONNUE);
                        },
                        scope: this,
                        handler: this.onAvoirFneClick
                    }, {
                        getClass: function (v, meta, rec) {
                            if (rec.get('fneAvoirReference')) {
                                return 'x-display-hide';
                            } else {
                                return 'x-hide-display';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            return 'Avoir FNE : ' + rec.get('fneAvoirReference')
                                    + complementDateFne(', effectu&eacute; le ', rec.get('fneDateAvoir'));
                        },
                        icon: 'resources/images/icons/fam/recu.png',
                        scope: this,
                        handler: this.onOpenFneAvoirLink
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        icon: 'resources/images/icons/fam/grid.png',
                        tooltip: 'Detail Bordereau',
                        scope: this,
                        handler: this.viewdetailFacture
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'printable';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer Bordereau ';
                        },
                        scope: this,
                        handler: this.onPdfClick
                    }]
            },

            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'excel';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Exporter au format Excel (montants modifiables, total en formule)';
                        },
                        scope: this,
                        handler: this.onExel
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'word';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer au format Word';
                        },
                        scope: this,
                        handler: this.onword
                    }]
            },

            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {

                            if ((rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") && rec.get('ACTION_REGLER_FACTURE')) {
                                return 'nonregle';
                            } else if (rec.get('str_STATUT') === "group") {
                                return 'groupe';
                            } else if (rec.get('str_STATUT') === 'paid') {
                                return 'regle';
                            } else {
                                return 'x-hide-display';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") {
                                if (rec.get('ACTION_REGLER_FACTURE')) {
                                    return 'R&eacute;gler Facture';
                                } else {
                                    return 'Vous n\êtes pas autorisé';
                                }

                            } else if (rec.get('str_STATUT') === "group") {
                                return 'La facture est générée pour un groupe';
                            } else {
                                return 'Sold&eacute;e ';
                            }
                        },
                        // icon: 'resources/images/icons/fam/folder_go.png',
                        // tooltip: 'R&eacute;gler Facture',
                        scope: this,
                        handler: this.onPaidFactureClick
                    }]
            }
        ];
    },
    onOpenFneLink: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const fneUrl = rec.get('fneUrl');
        if (fneUrl) {
            window.open(fneUrl);
        }

    },
    onOpenFneAvoirLink: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const fneAvoirUrl = rec.get('fneAvoirUrl');
        if (fneAvoirUrl) {
            window.open(fneAvoirUrl);
        } else if (rec.get('fneAvoirReference')) {
            Ext.MessageBox.alert('Info', 'Avoir FNE : ' + rec.get('fneAvoirReference'));
        }

    },
    onReleveFne: function () {
        const tiersPayantId = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        if (!tiersPayantId) {
            Ext.MessageBox.alert('Relevé FNE', 'Sélectionnez d\'abord un tiers payant dans la barre de recherche.');
            return;
        }
        const dtStart = Ext.getCmp('datedebut').getSubmitValue() || '';
        const dtEnd = Ext.getCmp('datefin').getSubmitValue() || '';
        window.open('../webservices/sm_user/facturation/ws_rp_releve_fne.jsp?tiersPayantId='
                + encodeURIComponent(tiersPayantId) + '&dtStart=' + dtStart + '&dtEnd=' + dtEnd);
    },
    onAvoirFneClick: function (grid, rowIndex) {
        const me = this;
        const rec = grid.getStore().getAt(rowIndex);
        if (!rec.get('fneUrl') || rec.get('fneAvoirReference') || !rec.get('AUTORISATION_AVOIR_FNE')) {
            return;
        }
        Ext.MessageBox.confirm('Avoir FNE',
                'Émettre un avoir total à la FNE pour la facture ' + rec.get('str_CODE_FACTURE')
                + ' ?<br/>Toutes les lignes certifiées seront retournées, la facture sera annulée sur Prestige et les ventes redeviendront facturables.<br/>Cette opération consomme un sticker et est irréversible.',
                function (btn) {
                    if (btn === 'yes') {
                        me.doAvoirFne(rec.get('lg_FACTURE_ID'), grid);
                    }
                });
    },
    doAvoirFne: function (idFacture, grid) {
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Avoir FNE en cours!');
        Ext.Ajax.request({
            url: '../api/v1/fne/invoices/avoir/' + idFacture,
            method: 'POST',
            success: function (response) {
                progress.hide();
                let message = 'Avoir FNE émis';
                try {
                    const json = Ext.decode(response.responseText);
                    if (json.reference) {
                        message = 'Avoir FNE émis. Référence : ' + json.reference;
                    }
                    if (json.annulation) {
                        message += '<br/>La facture a été annulée : les ventes sont à nouveau facturables.';
                    } else if (json.warning) {
                        message += '<br/><b>' + json.warning + '</b>';
                    }
                } catch (e) {
                }
                // boite dimensionnee : un message de 2 ou 3 lignes etait tronque sur certains postes
                Ext.MessageBox.show({
                    title: 'Avoir FNE',
                    msg: message,
                    minWidth: 420,
                    maxWidth: 560,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.INFO
                });
                grid.getStore().reload();
            },
            failure: function (response) {
                progress.hide();
                let message = response.responseText;
                try {
                    const json = Ext.decode(response.responseText);
                    if (json.message) {
                        message = json.message;
                    }
                } catch (e) {
                }
                Ext.MessageBox.show({
                    title: 'Avoir FNE impossible',
                    msg: message,
                    minWidth: 420,
                    maxWidth: 560,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
            }
        });

    },
    shwoChoiceModal: function (grid, rowIndex) {
        const me = this;
        const rec = grid.getStore().getAt(rowIndex);
        const choice = new Ext.data.Store({
            fields: ['code', 'libelle'],
            data: [{code: 'GROUPE_TAUX_TVA', libelle: 'Facture'},
                {code: 'PRODUIT_DETAIL', libelle: 'Produit'}]

        });

        const win = Ext.create('Ext.window.Window',
                {
                    extend: 'Ext.window.Window',
                    autoShow: true,
                    height: 200,
                    width: '40%',
                    modal: true,
                    title: 'Choix du type fe facturation',
                    closeAction: 'hide',
                    closable: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'form',
                            bodyPadding: 5,
                            modelValidation: true,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    layout: {
                                        type: 'hbox',
                                        align: 'stretch'
                                    },
                                    title: 'Type de facturation',
                                    items: [
                                        {
                                            xtype: 'combo',
                                            fieldLabel: 'Type de facturation',
                                            allowBlank: false,
                                            name: 'typeInvoice',
                                            flex: 1,
                                            valueField: 'code',
                                            displayField: 'libelle',
                                            typeAhead: true,
                                            queryMode: 'local',
                                            pageSize: 2,
                                            emptyText: 'Choisir un type...',
                                            store: choice
                                        }

                                    ]

                                }

                            ],
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    ui: 'footer',
                                    layout: {
                                        pack: 'end',
                                        type: 'hbox'
                                    },
                                    items: [
                                        {
                                            xtype: 'button',
                                            text: 'Valider',
                                            handler: function (btn) {
                                                const formulaire = btn.up('form');
                                                if (formulaire.isValid()) {

                                                    const formValues = formulaire.getValues();
                                                    me.certify(rec.get('lg_FACTURE_ID'), formValues.typeInvoice, win, grid);
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'button',
                                            text: 'Annuler',
                                            handler: function (btn) {
                                                win.destroy();
                                            }

                                        }
                                    ]
                                }
                            ]
                        }
                    ]

                }


        );





    },

    certify: function (idFacture, typeInvoice, win, grid) {
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/fne/invoices/sign/' + idFacture + '/' + typeInvoice,
            method: 'GET',
            success: function (response)
            {
                progress.hide();
                win.destroy();
                grid.getStore().reload();
                Ext.MessageBox.show({
                    title: 'Certification',
                    msg: 'Facture certifi&eacute;e.',
                    minWidth: 420,
                    maxWidth: 560,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.INFO
                });
            },
            failure: function (response)
            {
                progress.hide();
                win.destroy();
                grid.getStore().reload();
                // motif du refus renvoye par le serveur (facture deja certifiee, avoir deja emis...)
                var motif = '';
                try {
                    motif = Ext.JSON.decode(response.responseText, false).message || '';
                } catch (e) {
                }
                Ext.MessageBox.show({
                    title: 'Certification non effectu&eacute;e',
                    minWidth: 420,
                    maxWidth: 560,
                    msg: motif || 'La certification n\'a pas abouti. Consultez le Centre de Support pour le '
                            + 'd&eacute;tail.',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
            }
        });

    },
    onAddCreate: function () {

        testextjs.app.getController('App').onLoadNewComponent('addeditfacture', "Cr&eacute;er une facture", "0");


    },
    onPaidFactureClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        if ((rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") && rec.get('ACTION_REGLER_FACTURE')) {
            // Reglement en fenetre modale (comme Detail Bordereau) : la liste des factures
            // reste en dessous et est actualisee a la fermeture de la fenetre
            var moi = this;
            var dejaOuvert = Ext.getCmp('doreglementmanagerID');
            if (dejaOuvert) {
                if (dejaOuvert.up('window')) {
                    dejaOuvert.up('window').destroy();
                } else {
                    dejaOuvert.destroy();
                }
            }
            Ext.create('Ext.window.Window', {
                title: 'Faire un r&eacute;glement [' + rec.get('str_CUSTOMER_NAME') + ']',
                modal: true,
                width: '95%',
                height: 620,
                maximizable: true,
                autoScroll: true,
                layout: 'fit',
                items: [{
                        xtype: 'doreglementmanager',
                        // La fenetre porte deja son titre : sans ceci, l'ecran de reglement
                        // ajoutait le sien ("Faire Reglement") juste en dessous, soit deux
                        // bandeaux l'un sur l'autre. On masque le bandeau interne ICI seulement :
                        // ouvert depuis les autres ecrans (liste des reglements, detail
                        // bordereau), ce meme composant s'affiche sans fenetre et son titre
                        // reste son seul reperage.
                        header: false,
                        odatasource: rec.data,
                        parentview: moi,
                        nameintern: rec.get('lg_FACTURE_ID'),
                        titre: 'Faire un r&eacute;glement'
                    }],
                listeners: {
                    close: function () {
                        moi.onRechClick();
                    }
                }
            }).show();
        } else if (rec.get('str_STATUT') === "group") {
            var xtype = "groupeInvoices";
            var alias = 'widget.' + xtype;

            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", rec.get('CODEGROUPE'), rec.data);

        }
    },
    viewdetailFacture: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.editfacture.action.detailTransactionTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            titre: "Detail Bordereau [" + rec.get('str_CUSTOMER_NAME') + "]"
        });


    },

    onRemoveClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        if (rec.get('fneUrl')) {
            Ext.MessageBox.show({
                title: 'Facture certifiée FNE',
                width: 360,
                msg: 'Cette facture est certifiée à la FNE : elle ne peut pas être supprimée.<br/>La régularisation passe par un avoir FNE (icône avoir).',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
            return;
        }
        if (rec.get('str_STATUT') !== "paid" && rec.get('isALLOWED')) {

            Ext.MessageBox.confirm('Message',
                    'confirmez la suppresssion',
                    function (btn) {
                        if (btn == 'yes') {

                            myAppController.ShowWaitingProcess();
                            Ext.Ajax.request({
                                url: '../api/v1/facture-tiers-payant/transaction?mode=delete',
                                params: {
                                    lg_FACTURE_ID: rec.get('lg_FACTURE_ID'),
                                    mode: 'delete'
                                },
                                success: function (response)
                                {
                                    myAppController.StopWaitingProcess();

                                    var object = Ext.JSON.decode(response.responseText, false);
                                    if (object.success === "1") {
                                        Ext.MessageBox.alert('Infos', "La facture a &eacute;t&eacute; supprim&eacute;e");
                                    } else {
                                        Ext.MessageBox.show({
                                            title: 'Avertissement',
                                            width: 320,
                                            msg: (object.errors && object.errors !== 'null') ? object.errors : 'Cette facture a subit un r&eacute;glement',
                                            buttons: Ext.MessageBox.OK,
                                            icon: Ext.MessageBox.WARNING
                                        });

                                    }
                                    grid.getStore().reload();
                                },
                                failure: function (response)
                                {
                                    myAppController.StopWaitingProcess();
                                    var object = Ext.JSON.decode(response.responseText, false);
                                    //  alert(object);

                                    console.log("Bug " + response.responseText);
                                    Ext.MessageBox.alert('Error Message', response.responseText);

                                }
                            });

                        }
                    });

        }
    },
    onDeleteSelection: function () {
        var me = this;
        var selModel = me.getSelectionModel();
        var selection = selModel.getSelection();

        if (!selection || selection.length === 0) {
            Ext.MessageBox.alert('Information', 'Aucune facture s&eacute;lectionn&eacute;e.');
            return;
        }

        // On ne supprime que les factures autorisees et non soldees (meme regle que la
        // suppression unitaire); les autres sont ignorees.
        var deletable = [];
        var ignored = 0;
        Ext.each(selection, function (rec) {
            if (testextjs.view.sm_user.editfacture.EditFactureManager.estSupprimable(rec)) {
                deletable.push(rec);
            } else {
                ignored++;
            }
        });

        if (deletable.length === 0) {
            Ext.MessageBox.alert('Information',
                    'Aucune des factures s&eacute;lectionn&eacute;es n\'est supprimable (sold&eacute;es ou non autoris&eacute;es).');
            return;
        }

        var msg = 'Confirmez la suppression de ' + deletable.length + ' facture(s)';
        if (ignored > 0) {
            msg += ' (' + ignored + ' ignor&eacute;e(s) : sold&eacute;es ou non autoris&eacute;es)';
        }
        msg += ' ?';

        Ext.MessageBox.confirm('Message', msg, function (btn) {
            if (btn !== 'yes') {
                return;
            }
            myAppController.ShowWaitingProcess();
            var done = 0, failed = 0, total = deletable.length;

            // Suppression en cascade : une facture apres l'autre (sequentiel).
            var deleteNext = function (index) {
                if (index >= total) {
                    myAppController.StopWaitingProcess();
                    selModel.deselectAll();
                    me.getStore().reload();
                    Ext.MessageBox.show({
                        title: 'R&eacute;sultat',
                        width: 340,
                        msg: done + ' facture(s) supprim&eacute;e(s)'
                                + (failed > 0 ? ', ' + failed + ' &eacute;chec(s)' : '')
                                + (ignored > 0 ? ', ' + ignored + ' ignor&eacute;e(s)' : ''),
                        buttons: Ext.MessageBox.OK,
                        icon: (failed > 0 ? Ext.MessageBox.WARNING : Ext.MessageBox.INFO)
                    });
                    return;
                }
                var rec = deletable[index];
                Ext.Ajax.request({
                    url: '../api/v1/facture-tiers-payant/transaction?mode=delete',
                    params: {
                        lg_FACTURE_ID: rec.get('lg_FACTURE_ID'),
                        mode: 'delete'
                    },
                    callback: function (options, success, response) {
                        if (success) {
                            var object = Ext.JSON.decode(response.responseText, true);
                            if (object && object.success === '1') {
                                done++;
                            } else {
                                failed++;
                            }
                        } else {
                            failed++;
                        }
                        deleteNext(index + 1);
                    }
                });
            };
            deleteNext(0);
        });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var xtype = "addeditfacture";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "G&eacute;n&eacute;ration de facture", rec.get('lg_FACTURE_ID'), rec.data);



    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecherFacture').getValue();
        var lg_customer_id = "";

        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
            lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }

        this.getStore().load({
            params: {
                search_value: val,
                lg_customer_id: lg_customer_id,
                dt_fin: Ext.getCmp('datefin').getSubmitValue(),
                dt_debut: Ext.getCmp('datedebut').getSubmitValue(),
                'impayes': filtreImpayes
            }});
        sessionStorage.setItem('impayes', filtreImpayes);
        sessionStorage.setItem('customer', lg_customer_id);
        sessionStorage.setItem('searchQuery', val);
        sessionStorage.setItem('datefin', Ext.getCmp('datefin').getSubmitValue());
        sessionStorage.setItem('dateStart', Ext.getCmp('datedebut').getSubmitValue());
        sessionStorage.removeItem('codeGroupe');

    },
    onExel: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        // Vrai classeur construit a partir des donnees. L'ancien export
        // (invoiceServlet?action=exls) passait le PDF deja mis en page a Jasper : le fichier
        // reproduisait le dessin de la facture, et les montants, deja transformes en texte,
        // n'etaient pas des nombres pour Excel - donc ni modifiables, ni sommables.
        window.location = '../api/v1/facture-tiers-payant/export-excel/' + rec.get('lg_FACTURE_ID');
    },
    onword: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');

        window.location = '../invoiceServlet?action=docx&lg_FACTURE_ID=' + lg_FACTURE_ID;



    },

    onPdfClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var typeFacture = rec.get('lg_TYPE_FACTURE_ID');
        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');
        if (typeFacture === "tiers payant") {
            var linkUrl = url_services_pdf_tiers_payant + lg_FACTURE_ID;
            window.open(linkUrl);

        } else {
            var linkUrl = url_services_pdf_fournisseurs + lg_FACTURE_ID;
            window.open(linkUrl);
        }

    },
    onPrint: function () {
        let lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue();
        // Sans periode, le releve sort vierge : on exige la date debut et la date fin.
        if (!dt_debut || !dt_fin) {
            Ext.MessageBox.alert('Information',
                    'Veuillez renseigner la p&eacute;riode (date d&eacute;but et date fin) avant d\'imprimer le relev&eacute; des factures.');
            return;
        }
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }
        const search_value = Ext.getCmp('rechecherFacture').getValue();

        window.open("../releveFactureServlet" + "?lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value + "&impayes=" + filtreImpayes + '&codeFacture=');
    },
    exportToExcel: function () {
        var lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue()
                ;
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }
        var search_value = Ext.getCmp('rechecherFacture').getValue();
        window.location = "../FactureDataExport?action=facture&lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value + "&impayes=" + filtreImpayes;

    }

});