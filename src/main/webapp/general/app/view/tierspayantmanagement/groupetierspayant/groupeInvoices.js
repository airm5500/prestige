/* global Ext */


var Me;
var view_title;
//var mydataSource;
var codeFact = "";
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.tierspayantmanagement.groupetierspayant.groupeInvoices', {
    extend: 'Ext.grid.Panel',
    xtype: 'groupeInvoices',
    id: 'groupeInvoicesID',
    title: 'Groupe Factures',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.GroupeModel',
        'testextjs.model.groupFactureModel',
        'testextjs.view.tierspayantmanagement.groupetierspayant.action.facturegroupe',
        'testextjs.view.tierspayantmanagement.groupetierspayant.reglementGroup'

    ],
    frame: true,
    config: {
        odatasource: ''
    },
    initComponent: function () {
        var mydataSource = this.getOdatasource();
        codeFact = mydataSource.CODEGROUPE;
        // CODEGROUPE n'est ajoute que si l'ecran est ouvert depuis une facture precise :
        // depuis le menu, odatasource est vide et l'URL n'envoie plus CODEGROUPE=undefined
        var urlInvoices = '../api/v1/groupe-tierspayant/invoices'
                + (codeFact !== undefined && codeFact !== null && codeFact !== '' ? '?CODEGROUPE=' + codeFact : '');
        var groupesInvoice = new Ext.data.Store({
            model: 'testextjs.model.groupFactureModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: urlInvoices,
                reader: {
                    type: 'json',
                    root: 'data',
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
                url: '../api/v1/groupe-tierspayant/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        Me = this;
        Ext.apply(this, {
            width: '98%',

            minHeight: 570,
            maxHeight: 570,
            cls: 'custompanel',
            id: 'invoiceGRID',

            store: groupesInvoice,
            columns:
                    [
                        {
                            xtype: 'rownumberer',
                            text: '#',
                            width: 45


                        },
                        {
                            header: 'ID',
                            dataIndex: 'lg_GROUPE_ID',
                            flex: 1,
                            hidden: true

                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'str_LIB',
                            flex: 1.5

                        },
                        {
                            header: 'Nombre de factures',
                            dataIndex: 'NBFACTURES',
                            align: 'right',
                            renderer: amountformat,
                            flex: 1

                        },
                        {
                            header: 'Montant',
                            dataIndex: 'AMOUNT',
                            align: 'right',
                            renderer: amountformat,
                            flex: 1

                        },
                        {
                            header: 'Montant Payé',
                            dataIndex: 'AMOUNTPAYE',
                            align: 'right',
                            renderer: amountformat,
                            flex: 1

                        },
                        {
                            header: 'Montant Restant',
                            dataIndex: 'MONTANTRESTANT',
                            align: 'right',
                            renderer: amountformat,
                            flex: 1

                        },

                        {
                            header: 'Date  d\'édition',
                            dataIndex: 'DATECREATION',

                            flex: 1

                        },
                        {
                            xtype: 'actioncolumn',
                            hidden: false,
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    // Le bouton reste disponible tant qu'il RESTE des factures a
                                    // certifier : relancer ne recertifie pas celles qui le sont deja,
                                    // le serveur les ignore une par une.
                                    getClass: function (v, meta, rec) {
                                        var certifiees = Number(rec.get('NB_CERTIFIEES') || 0);
                                        var total = Number(rec.get('NBFACTURES') || 0);
                                        return (total > 0 && certifiees >= total) ? 'x-hide-display'
                                                : '';
                                    },
                                    getTip: function (v, meta, rec) {
                                        var certifiees = Number(rec.get('NB_CERTIFIEES') || 0);
                                        var total = Number(rec.get('NBFACTURES') || 0);
                                        if (certifiees > 0) {
                                            return 'Certifier les ' + (total - certifiees) + ' facture(s) restante(s) '
                                                    + '(' + certifiees + ' d&eacute;j&agrave; certifi&eacute;e(s))';
                                        }
                                        return 'Certification';
                                    },
                                    icon: 'resources/images/icons/certication.png',
                                    scope: this,
                                    handler: this.shwoChoiceModal
                                }, {
                                    // Groupe entierement certifie : plus rien a envoyer, on remplace le
                                    // bouton par une information pour eviter un clic par erreur.
                                    getClass: function (v, meta, rec) {
                                        var certifiees = Number(rec.get('NB_CERTIFIEES') || 0);
                                        var total = Number(rec.get('NBFACTURES') || 0);
                                        return (total > 0 && certifiees >= total) ? ''
                                                : 'x-hide-display';
                                    },
                                    getTip: function (v, meta, rec) {
                                        return 'Facture d&eacute;j&agrave; certifi&eacute;e';
                                    },
                                    icon: 'resources/images/icons/facture-certifiee.svg',
                                    scope: this,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        Ext.MessageBox.show({
                                            title: 'Facture d&eacute;j&agrave; certifi&eacute;e',
                                            msg: 'Les ' + rec.get('NBFACTURES') + ' facture(s) de ce groupe portent '
                                                    + 'd&eacute;j&agrave; une certification FNE valide. Elles ne '
                                                    + 'peuvent pas &ecirc;tre certifi&eacute;es une seconde fois.',
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
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    // Avoirs du groupe : proposes des qu'au moins une facture est
                                    // certifiee. Les factures qui portent deja un avoir ne sont jamais
                                    // renvoyees, celles non certifiees sont ignorees (controle serveur).
                                    getClass: function (v, meta, rec) {
                                        return Number(rec.get('NB_CERTIFIEES') || 0) > 0 ? ''
                                                : 'x-hide-display';
                                    },
                                    getTip: function (v, meta, rec) {
                                        return '&Eacute;mettre les avoirs FNE des factures certifi&eacute;es '
                                                + 'de ce groupe';
                                    },
                                    icon: 'resources/images/icons/fam/retour.png',
                                    scope: this,
                                    handler: this.onAvoirGroupeClick
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    iconCls: 'detailclients',
                                    tooltip: 'Voir les différentes factures',
                                    scope: this,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);

                                        new testextjs.view.tierspayantmanagement.groupetierspayant.action.facturegroupe({
                                            odatasource: rec.get('CODEFACTURE'),
                                            ogroupe: rec.get('lg_GROUPE_ID'),
                                            parentview: this,
                                            titre: "Les factures du groupe [" + rec.get('str_LIB') + "]"
                                        });
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    getClass: function (v, meta, rec) {

                                        if (rec.get('STATUT') !== "paid") {
                                            if (rec.get('ACTION_REGLER_FACTURE')) {
                                                return 'nonregle';
                                            } else {
                                                return 'x-hide-display';
                                            }

                                        } else {
                                            return 'regle';
                                        }
                                    },
                                    getTip: function (v, meta, rec) {
                                        if (rec.get('STATUT') !== "paid") {
                                            return 'R&eacute;gler Facture';
                                        } else {
                                            return 'Sold&eacute;e ';
                                        }
                                    },
                                    scope: this,
                                    handler: this.onPaidFactureClick
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
                                        return 'Imprimer la facture ';
                                    },
                                    scope: this,
                                    handler: this.onPrint
                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    // reedition du recapitulatif de reglement : uniquement si un
                                    // reglement (partiel ou total) a ete fait sur la ligne.
                                    // Deux indices, car les lignes reglees par l'ancien circuit
                                    // peuvent avoir un montant paye non renseigne : le montant
                                    // paye cumule, ou un reste a payer inferieur au montant total.
                                    getClass: function (v, meta, rec) {
                                        var paye = Number(rec.get('AMOUNTPAYE') || 0);
                                        var total = Number(rec.get('AMOUNT') || 0);
                                        var reste = Number(rec.get('MONTANTRESTANT') || 0);
                                        var regle = paye > 0 || (total > 0 && reste < total);
                                        return regle ? 'recu' : 'x-hide-display';
                                    },
                                    getTip: function (v, meta, rec) {
                                        return 'R&eacute;capitulatif de r&egrave;glement';
                                    },
                                    scope: this,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        window.open('../webservices/configmanagement/groupe/ws_rp_recap_reglement_groupe.jsp'
                                                + '?lg_GROUPE_ID=' + rec.get('lg_GROUPE_ID')
                                                + '&CODEFACTURE=' + rec.get('CODEFACTURE'));
                                    }
                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    getClass: function (v, meta, rec) {

                                        if (rec.get('STATUT') !== "paid") {
                                            return 'unpaid';
                                        } else {
                                            return 'paid';
                                        }
                                    },
                                    getTip: function (v, meta, rec) {
                                        if (rec.get('STATUT') !== "paid") {
                                            return 'Supprimer ';
                                        } else {
                                            return 'Sold&eacute;e ';
                                        }
                                    },
                                    scope: this,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        if (rec.get('STATUT') === "paid") {
                                            Ext.MessageBox.show({
                                                title: 'Information',
                                                msg: 'Cette facture de groupe est sold&eacute;e : elle ne peut '
                                                        + 'plus &ecirc;tre supprim&eacute;e.',
                                                minWidth: 420,
                                                maxWidth: 560,
                                                buttons: Ext.MessageBox.OK,
                                                icon: Ext.MessageBox.INFO
                                            });
                                            return;
                                        }
                                        var nomGroupe = rec.get('str_LIB') || '';
                                        var question = 'Voulez-vous supprimer la facture du groupe <b>'
                                                + nomGroupe + '</b> (n&deg; ' + rec.get('CODEFACTURE') + ') ?'
                                                + '<br/><br/>Toutes les factures de ce groupe seront supprim&eacute;es '
                                                + 'et leurs bons redeviendront facturables.';
                                        Ext.MessageBox.confirm('Confirmation', question, function (btn) {
                                            // Non : on ne supprime rien et on rafraichit la liste
                                            if (btn !== 'yes') {
                                                grid.getStore().load();
                                                return;
                                            }
                                            testextjs.app.getController('App').ShowWaitingProcess();
                                            Ext.Ajax.request({
                                                url: '../api/v1/groupe-tierspayant/transaction',
                                                params: {
                                                    mode: 7,
                                                    CODEFACTURE: rec.get('CODEFACTURE'),
                                                    lg_GROUPE_ID: rec.get('lg_GROUPE_ID')
                                                },
                                                success: function (response)
                                                {
                                                    testextjs.app.getController('App').StopWaitingProcess();
                                                    var object = Ext.JSON.decode(response.responseText, false);
                                                    grid.getStore().load();
                                                    if (object.status === 1) {
                                                        Ext.MessageBox.show({
                                                            title: 'Information',
                                                            msg: 'La facture du groupe ' + nomGroupe
                                                                    + ' a &eacute;t&eacute; supprim&eacute;e.',
                                                            minWidth: 420,
                                                            maxWidth: 560,
                                                            buttons: Ext.MessageBox.OK,
                                                            icon: Ext.MessageBox.INFO
                                                        });
                                                        return;
                                                    }
                                                    // motif reel du refus (reglement deja fait, facture certifiee...)
                                                    // au lieu d'un "Erreur de suppression" sans explication
                                                    Ext.MessageBox.show({
                                                        title: 'Suppression impossible',
                                                        minWidth: 420,
                                                        maxWidth: 560,
                                                        msg: object.message
                                                                || 'La suppression n\'a pas pu &ecirc;tre '
                                                                + 'effectu&eacute;e. Consultez le Centre de Support '
                                                                + 'pour le d&eacute;tail.',
                                                        buttons: Ext.MessageBox.OK,
                                                        icon: Ext.MessageBox.WARNING
                                                    });
                                                },
                                                failure: function (response)
                                                {
                                                    testextjs.app.getController('App').StopWaitingProcess();
                                                    grid.getStore().load();
                                                    Ext.MessageBox.alert('Erreur',
                                                            'Le serveur n\'a pas r&eacute;pondu &agrave; la demande '
                                                            + 'de suppression. R&eacute;essayez ; si le probl&egrave;me '
                                                            + 'persiste, contactez le support.');
                                                }
                                            });
                                        });
                                    }
                                }]
                        }




                    ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [

                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date début',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Du',
                    labelWidth: 20,
                    flex: 1,
                    id: 'dt_start',
                    listeners: {
                        change: function () {
                            Ext.getCmp('dt_end').setMinValue(this.getValue());
                        }
                    }

                }, {
                    xtype: 'tbseparator'
                }

                ,
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date fin',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Au',
                    labelWidth: 20,
                    flex: 1,
                    id: 'dt_end',
                    listeners: {
                        change: function () {

                            Ext.getCmp('dt_start').setMaxValue(this.getValue());
                        }
                    }

                }, '-',

                {
                    xtype: 'combobox',

                    margin: '0 15 0 0',

                    id: 'cmb_fact_GROUPECOMPAGNIES',
                    store: groupesStore,
                    pageSize: 20,
                    valueField: 'lg_GROUPE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
                    flex: 2,
                    queryMode: 'remote',
                    minChars: 2,
                    emptyText: 'Selection un Groupe',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                        getInnerTpl: function () {
                            return '<span>{str_LIBELLE}</span>';
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
                        select: function (field, e) {
                            var mystore = Ext.getCmp('invoiceGRID').getStore();
                            mystore.getProxy().url = "../api/v1/groupe-tierspayant/invoices";

                            mystore.load(
                                    {params: {
                                            lg_GROUPE_ID: field.getValue(),
                                            'dt_end': Ext.getCmp('dt_end').getSubmitValue(),
                                            'dt_start': Ext.getCmp('dt_start').getSubmitValue(),
                                            "search_value": Ext.getCmp('groupeSearch').getValue()

                                        }});




                        }


                    }

                }, '-',

                {
                    xtype: 'textfield',
                    id: 'groupeSearch',

                    width: 200,
                    emptyText: 'Rechercher',
                    enableKeyEvents: true,
                    listeners: {

                        specialKey: function (field, e, options) {
                            if (e.getKey() === e.ENTER)
                            {
                                let combox = Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').getValue();
                                if (combox === '' || combox === null) {
                                    combox = '';
                                }
                                const mystore = Ext.getCmp('invoiceGRID').getStore();
                                mystore.getProxy().url = "../api/v1/groupe-tierspayant/invoices";

                                mystore.load({params: {
                                        lg_GROUPE_ID: combox,
                                        'dt_end': Ext.getCmp('dt_end').getSubmitValue(),
                                        'dt_start': Ext.getCmp('dt_start').getSubmitValue(),
                                        search_value: this.getValue()

                                    }});

                            }


                        }


                    }

                }, {
                    xtype: 'tbseparator'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'ventesearch',
                    width: 100,
                    scope: this,
                    handler: function () {
                        {
                            let combox = Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').getValue();
                            if (combox === '' || combox === null) {
                                combox = '';
                            }
                            codeFact = '';
                            var mystore = Ext.getCmp('invoiceGRID').getStore();
                            mystore.getProxy().url = "../api/v1/groupe-tierspayant/invoices";
                            mystore.load({params: {
                                    lg_GROUPE_ID: combox,
                                    'dt_end': Ext.getCmp('dt_end').getSubmitValue(),
                                    'dt_start': Ext.getCmp('dt_start').getSubmitValue(),
                                    search_value: Ext.getCmp('groupeSearch').getValue()

                                }});

                        }
                    }
                }, {
                    xtype: 'tbseparator'
                }, {
                    // Releve des factures de groupe : reprend EXACTEMENT les criteres affiches
                    // (periode, groupe, recherche), pour que le papier montre la meme liste que
                    // l'ecran. Le bouton "Imprimer" de chaque ligne, lui, edite la facture elle-meme.
                    //
                    // Deux decoupages possibles, d'ou le menu : par facture de groupe (le decoupage
                    // de la liste) ou par tiers payant (toutes les factures d'un organisme sur la
                    // periode, rassemblees avec leur sous-total).
                    text: 'Relevé',
                    tooltip: 'Imprimer le relev&eacute; des factures de groupe affich&eacute;es',
                    iconCls: 'printable',
                    scope: this,
                    menu: {
                        items: [{
                                text: 'Sous-total par facture de groupe',
                                tooltip: 'Un bloc par facture de groupe, comme la liste &agrave; l\'&eacute;cran',
                                iconCls: 'printable',
                                scope: this,
                                handler: function () {
                                    this.onReleveClick('facture');
                                }
                            }, {
                                text: 'Sous-total par tiers payant',
                                tooltip: 'Toutes les factures d\'un organisme sur la p&eacute;riode, '
                                        + 'rassembl&eacute;es avec leur sous-total',
                                iconCls: 'printable',
                                scope: this,
                                handler: function () {
                                    this.onReleveClick('tierspayant');
                                }
                            }]
                    }
                }



            ],
            bbar: {
                xtype: 'pagingtoolbar',
                store: groupesInvoice,
                dock: 'bottom',
                displayInfo: true,
                listeners: {
                    beforechange: function (page, currentPage) {
                        let myProxy = this.store.getProxy();

                        myProxy.params = {
                            dt_end: '',
                            dt_start: '',
                            lg_GROUPE_ID: '',
                            search_value: ''


                        };
                        let combox = Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').getValue();
                        if (combox === '' || combox === null) {
                            combox = '';
                        }

                        const search_value = Ext.getCmp('groupeSearch').getValue();
                        myProxy.setExtraParam('dt_start', Ext.getCmp('dt_start').getSubmitValue());
                        myProxy.setExtraParam('dt_end', Ext.getCmp('dt_end').getSubmitValue());
                        myProxy.setExtraParam('search_value', search_value);
                        myProxy.setExtraParam('lg_GROUPE_ID', combox);



                    }

                }
            }


        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



    },
    loadStore: function () {
        this.getStore().load();
    },

    /**
     * Releve des factures de groupe de la periode affichee.
     *
     * Les memes criteres que la grille sont transmis au serveur : aucune date n'est inventee ici,
     * c'est le servlet qui applique la periode par defaut (un an) quand l'ecran n'en donne pas.
     */
    onReleveClick: function (regroupement) {
        const parametres = {
            dt_start: Ext.getCmp('dt_start').getSubmitValue() || '',
            dt_end: Ext.getCmp('dt_end').getSubmitValue() || '',
            lg_GROUPE_ID: Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').getValue() || '',
            search_value: Ext.getCmp('groupeSearch').getValue() || '',
            // 'facture' : un bloc par facture de groupe. 'tierspayant' : un bloc par organisme
            // sur toute la periode. Le serveur retombe sur 'facture' si la valeur est inconnue.
            regroupement: regroupement === 'tierspayant' ? 'tierspayant' : 'facture'
        };
        // ecran ouvert sur UNE facture de groupe precise : on releve celle-la, pas la periode
        if (codeFact !== undefined && codeFact !== null && codeFact !== '') {
            parametres.CODEGROUPE = codeFact;
        }
        window.open('../releveFactureGroupeServlet?' + Ext.Object.toQueryString(parametres));
    },

    onPrint: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const lg_GROUPE_ID = rec.get('lg_GROUPE_ID');
        const CODEFACTURE = rec.get('CODEFACTURE');
        window.open("../webservices/configmanagement/groupe/group_invoice_pdf.jsp" + "?lg_GROUPE_ID=" + lg_GROUPE_ID + "&CODEFACTURE=" + CODEFACTURE);
    },
    onPaidFactureClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        if (rec.get('STATUT') !== "paid" && rec.get('ACTION_REGLER_FACTURE')) {
            // Reglement en fenetre modale (comme Voir les differentes factures) : la liste
            // des factures de groupe reste en dessous et est actualisee a la fermeture
            const moi = this;
            const dejaOuvert = Ext.getCmp('reglementGroupeFactureID');
            if (dejaOuvert) {
                if (dejaOuvert.up('window')) {
                    dejaOuvert.up('window').destroy();
                } else {
                    dejaOuvert.destroy();
                }
            }
            // Titre : numero de facture ET nom du groupe, pour savoir d'un coup d'oeil
            // quel organisme on est en train de regler
            const nomGroupe = rec.get('str_LIB');
            Ext.create('Ext.window.Window', {
                title: 'Faire un r&eacute;glement de la facture ' + rec.get('CODEFACTURE')
                        + (nomGroupe ? ' &mdash; ' + nomGroupe : ''),
                modal: true,
                width: '95%',
                // hauteur adaptee a l'ecran, bornee pour rester lisible sur un petit poste :
                // le bloc REGLEMENT et la barre de boutons doivent tenir sans rien tronquer
                height: Math.max(620, Math.min(Ext.Element.getViewportHeight() - 60, 800)),
                maximizable: true,
                autoScroll: true,
                layout: 'fit',
                items: [{
                        xtype: 'reglementGroupeFacture',
                        // La fenetre porte deja son titre : sans ceci, l'ecran ajoutait le sien
                        // ("Faire Reglement") juste en dessous, soit deux bandeaux l'un sur
                        // l'autre. Masque ICI seulement : ouvert depuis un autre ecran, ce meme
                        // composant s'affiche sans fenetre et son titre reste son seul reperage.
                        header: false,
                        odatasource: rec.data,
                        parentview: moi,
                        nameintern: rec.get('lg_GROUPE_ID'),
                        titre: 'Faire un r&eacute;glement'
                    }],
                listeners: {
                    close: function () {
                        moi.getStore().load();
                    }
                }
            }).show();
        }
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
                                                    me.certify(rec.get('ids'), formValues.typeInvoice, win);
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
    /**
     * Avoirs FNE de toutes les factures certifiees d'un groupe, emis une par une cote serveur.
     *
     * Un avoir est un document fiscal definitif : la confirmation est explicite et rappelle ce qui sera
     * fait. Les factures deja avoirees ne sont jamais renvoyees, les non certifiees sont ignorees.
     */
    onAvoirGroupeClick: function (grid, rowIndex) {
        const moi = this;
        const rec = grid.getStore().getAt(rowIndex);
        const certifiees = Number(rec.get('NB_CERTIFIEES') || 0);
        Ext.MessageBox.confirm('Avoirs FNE',
                '&Eacute;mettre un avoir FNE total pour les <b>' + certifiees + '</b> facture(s) certifi&eacute;e(s) '
                + 'du groupe <b>' + (rec.get('str_LIB') || '') + '</b> (n&deg; ' + rec.get('CODEFACTURE') + ') ?'
                + '<br/><br/>Les factures qui portent d&eacute;j&agrave; un avoir ne seront pas renvoy&eacute;es. '
                + 'Un avoir est un document d&eacute;finitif : il ne peut pas &ecirc;tre annul&eacute; depuis le '
                + 'logiciel.',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Avoirs FNE en cours!');
                    Ext.Ajax.request({
                        url: '../api/v1/fne/invoices/avoir-group',
                        method: 'POST',
                        params: {ids: rec.get('ids')},
                        success: function (response) {
                            progress.hide();
                            var object = Ext.JSON.decode(response.responseText, false);
                            moi.getStore().load();
                            Ext.MessageBox.show({
                                title: object.success ? 'Avoirs FNE' : 'Aucun avoir &eacute;mis',
                                minWidth: 420,
                                maxWidth: 560,
                                msg: object.message || 'Op&eacute;ration effectu&eacute;e',
                                buttons: Ext.MessageBox.OK,
                                icon: object.success ? Ext.MessageBox.INFO : Ext.MessageBox.WARNING
                            });
                        },
                        failure: function (response) {
                            progress.hide();
                            moi.getStore().load();
                            var motif = '';
                            try {
                                motif = Ext.JSON.decode(response.responseText, false).message || '';
                            } catch (e) {
                            }
                            if (!motif) {
                                // Ne plus accuser le privilege par defaut : le refus de privilege est un 403,
                                // tout le reste est une erreur technique dont le detail est dans le journal.
                                motif = response.status === 403
                                        ? 'Vous n\'avez pas le privil&egrave;ge d\'&eacute;mission d\'avoir. '
                                        + 'Demandez-le au responsable.'
                                        : 'L\'op&eacute;ration n\'a pas abouti (erreur technique '
                                        + response.status + '). Le d&eacute;tail figure dans le journal du '
                                        + 'serveur : transmettez-le au support.';
                            }
                            Ext.MessageBox.show({
                                title: 'Avoirs FNE',
                                minWidth: 420,
                                maxWidth: 560,
                                msg: motif,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.WARNING
                            });
                        }
                    });
                });
    },
    certify: function (ids, typeInvoice, win) {
        const moi = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/fne/invoices/sign-group',
            method: 'GET',
            params: {
                ids,
                typeInvoice

            },
            success: function (response)
            {
                progress.hide();
                win.destroy();
                var object = Ext.JSON.decode(response.responseText, false);
                // la liste doit refleter le nouvel etat de certification
                moi.getStore().load();
                Ext.MessageBox.show({
                    title: object.success ? 'Certification' : 'Certification non effectuée',
                    minWidth: 420,
                    maxWidth: 560,
                    msg: object.message || 'Opération effectuée',
                    buttons: Ext.MessageBox.OK,
                    icon: object.success ? Ext.MessageBox.INFO : Ext.MessageBox.WARNING
                });
            },
            failure: function (response)
            {
                progress.hide();
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    }
});