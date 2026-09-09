
/* global Ext */
Ext.define('testextjs.view.caisseManager.balance.BalanceSaleCash', {
    extend: 'Ext.panel.Panel',
    xtype: 'balancesalecahs',
    frame: true,
    title: 'Balance Vente/Caisse',
    width: '97%',
    height: 500,
    minHeight: 500,

    cls: 'custompanel',
    layout: {
        type: 'fit',
//        align: 'stretch',
        padding: 10
    },
    initComponent: function () {
        var me = this;
        /*
         * L'analyse comparative du second onglet. Une ligne par periode : les trois derniers mois
         * revolus, plus le mois en cours rappele et marque.
         */
        var analyseStore = Ext.create('Ext.data.Store', {
            fields: ['cle', 'libelle', 'debut', 'fin', {name: 'enCours', type: 'boolean'},
                {name: 'nbreVente', type: 'int'}, {name: 'montantTTC', type: 'int'},
                {name: 'montantRemise', type: 'int'}, {name: 'montantNet', type: 'int'},
                {name: 'montantAchat', type: 'int'}, {name: 'marge', type: 'int'},
                {name: 'panierMoyen', type: 'int'}, {name: 'montantEsp', type: 'int'},
                {name: 'montantCB', type: 'int'}, {name: 'montantCheque', type: 'int'},
                {name: 'montantVirement', type: 'int'}, {name: 'montantMobilePayment', type: 'int'},
                {name: 'montantTp', type: 'int'}, {name: 'montantDiff', type: 'int'},
                {name: 'ecart', type: 'int', useNull: true},
                {name: 'ecartPourcentage', type: 'float', useNull: true},
                // Retour des tests du 09/09 : taux d'evolution par indicateur, montants par mode.
                {name: 'evolutions', type: 'auto'}, {name: 'parModes', type: 'auto'},
                {name: 'montantMobile', type: 'int'}]
        });
        var store = Ext.create('Ext.data.Store', {
            fields:
                    [
                        {name: 'typeVente',
                            type: 'string'

                        },
                        {name: 'nbreVente',
                            type: 'number'

                        },
                        {name: 'montantDiff',
                            type: 'number'

                        },
                        {name: 'montantTp',
                            type: 'number'

                        },
                        {name: 'montantCB',
                            type: 'number'

                        },
                        {name: 'MontantVirement',
                            type: 'number'

                        },
                        {name: 'montantCheque',
                            type: 'number'

                        },
                        {name: 'montantEsp',
                            type: 'number'

                        },
                        {name: 'panierMoyen',
                            type: 'number'

                        },
                        {name: 'pourcentage',
                            type: 'number'

                        },

                        {name: 'montantTTC',
                            type: 'number'

                        },
                        {name: 'montantNet',
                            type: 'number'

                        },
                        {name: 'montantRemise',
                            type: 'number'

                        },
                        {name: 'montantMobilePayment',
                            type: 'number'

                        }
                    ],
            autoLoad: false,
            pageSize: 2,

            proxy: {
                type: 'ajax',
                url: '../api/v1/balance/balancesalecash',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000

            }
        });
        var me = this;
        // Retour des tests du 09/09 : les trois barres du bas (l'affichage historique) restent, pour
        // comparer avec la presentation modernisee de l'onglet Balance ; elles sont masquees sur les
        // onglets d'analyse, qui n'en ont pas besoin.
        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    itemId: 'recapBas1',
                    items: [
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'MONTANT VENTE',
                            labelWidth: 120,
                            itemId: 'montantTTC',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'MONTANT ACHAT',
                            labelWidth: 120,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantAchat',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'MARGE:',
                            labelWidth: 55,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'marge',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'RATIO V/A:',
                            labelWidth: 100,
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'ratioVA'

                        }
                    ]
                },

                {
                    xtype: "toolbar",
                    dock: 'bottom',
                    itemId: 'recapBas2',
                    items: [
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'FOND.CAISSE',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'fondCaisse',
                            value: 0

                        }, {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'REGL.DIFFERE',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantRegDiff',
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'MOBILE',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantMobilePayment',
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },

                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'REGL.TPAYANT:',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantRegleTp',
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'SORTIE:',
                            labelWidth: 60,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantSortie',
                            fieldStyle: "color:red;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'ENTREE',
                            labelWidth: 60,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantEntre',
                            fieldStyle: "color:green;font-weight:800;",
                            value: 0

                        }

                    ]
                },

                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    itemId: 'recapBas3',
                    items: [
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'ESPECES',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantEsp',
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'PANIER M',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'panierMoyen',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'NB.VENTE',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'nbreVente',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'CHEQUE',
                            labelWidth: 60,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'montantCheque',
                            value: 0
                        }, {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'VIREMENT',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'montantVirement',
                            value: 0
                        }
                    ]
                }

            ],
            items: [{
                    xtype: 'tabpanel',
                    itemId: 'ongletsBalance',
                    items: [me.ongletBalance(store), me.ongletAnalyse(analyseStore), me.ongletModes()]
                }]
        });
        this.callParent();
    },

    /* ------------------------------------------------------------------ outils communs */

    /**
     * Les choix de periode, lus dans resources/js/selecteur-periodes.js (le fichier de configuration
     * demande) ; a defaut, la liste standard. Chaque onglet d'analyse porte son propre selecteur.
     */
    choixPeriodes: function () {
        return (window.PrestigeAnalyse && window.PrestigeAnalyse.CHOIX) || [
            {id: 'TROIS_SEMAINES', libelle: '3 derni\u00e8res semaines'}, {id: 'TROIS_MOIS', libelle: '3 derniers mois'},
            {id: 'SIX_MOIS', libelle: '6 derniers mois'}, {id: 'TROIS_ANS', libelle: '3 derni\u00e8res ann\u00e9es'},
            {id: 'LIBRE', libelle: 'P\u00e9riode libre'}];
    },

    /** Les champs de recherche d'un onglet : dates (et selecteur de periode pour les onglets d'analyse). */
    barreRecherche: function (suffixe, avecPeriode, boutons) {
        var me = this;
        var items = [];
        if (avecPeriode) {
            items.push({
                xtype: 'combobox',
                // L'onglet Analyse garde l'identifiant historique « typePeriode » : c'est lui que le
                // fichier selecteur-periodes.js cherche pour ne pas poser un second selecteur.
                itemId: suffixe === 'Analyse' ? 'typePeriode' : 'typePeriode' + suffixe,
                fieldLabel: 'P\u00e9riode',
                labelWidth: 50,
                width: 210,
                margin: '0 6 0 0',
                store: Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], data: me.choixPeriodes()}),
                valueField: 'id',
                displayField: 'libelle',
                queryMode: 'local',
                editable: false,
                value: 'TROIS_MOIS'
            });
        }
        items.push({
            xtype: 'datefield', fieldLabel: 'Du', itemId: 'dtStart' + suffixe, labelWidth: 20, flex: 1,
            submitFormat: 'Y-m-d', maxValue: new Date(), format: 'd/m/Y', value: new Date()
        }, '-', {
            xtype: 'datefield', fieldLabel: 'Au', itemId: 'dtEnd' + suffixe, labelWidth: 20, flex: 1,
            submitFormat: 'Y-m-d', maxValue: new Date(), format: 'd/m/Y', value: new Date()
        }, {
            text: 'rechercher', tooltip: 'rechercher', itemId: 'rechercher' + suffixe, iconCls: 'searchicon'
        });
        return {xtype: 'toolbar', dock: 'top', items: items.concat(boutons || [])};
    },

    /* ------------------------------------------------------------------ onglet Balance */

    /**
     * L'onglet Balance : la grille historique (affichee en entier, sans pagination : deux lignes,
     * COMPTANT et CREDIT), puis la meme balance presentee comme le document du milieu, puis la
     * ventilation (clients et ventes, part dans le CA, caisse, TVA).
     */
    ongletBalance: function (store) {
        var me = this;
        var montant = function (entete, champ, flex) {
            return {header: entete, dataIndex: champ, flex: flex || 1, align: 'right', xtype: 'numbercolumn', format: '0,000.'};
        };
        return {
            title: 'Balance',
            xtype: 'panel',
            itemId: 'ongletBalance',
            layout: {type: 'vbox', align: 'stretch'},
            border: false,
            dockedItems: [me.barreRecherche('', false, [{
                        text: 'imprimer', itemId: 'imprimer', iconCls: 'printable',
                        tooltip: 'Imprimer la balance vente/caisse'
                    }])],
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'balanceGrid',
                    store: store,
                    // Deux lignes connues d'avance : la grille prend la hauteur de ses lignes, sans
                    // pagination ni defilement.
                    viewConfig: {forceFit: true, columnLines: true},
                    columns: [
                        {
                            header: 'Type vente', dataIndex: 'typeVente', flex: 0.7,
                            renderer: function (v) {
                                return me.libelleTypeVente(v);
                            }
                        },
                        {header: 'Nbre Vente', dataIndex: 'nbreVente', flex: 0.6, align: 'right'},
                        {
                            text: 'Montant',
                            columns: [montant('Brut(TTC)', 'montantTTC'), montant('Remise', 'montantRemise', 0.7),
                                montant('Net(TTC)', 'montantNet'), {header: '%', dataIndex: 'pourcentage', flex: 0.4, align: 'right'}]
                        },
                        montant('Panier.M', 'panierMoyen', 0.7),
                        montant('Esp&egrave;ces', 'montantEsp'),
                        montant('Ch&egrave;ques', 'montantCheque', 0.8),
                        montant('Carte.Banc', 'montantCB', 0.8),
                        montant('Diff&eacute;r&eacute;', 'montantDiff', 0.8),
                        montant('P.Mobile', 'montantMobilePayment', 0.8),
                        montant('Tiers payant', 'montantTp', 0.8)
                    ],
                    selModel: {selType: 'cellmodel'}
                }, {
                    xtype: 'panel',
                    itemId: 'syntheseBalance',
                    border: false,
                    bodyStyle: 'background:#fbfcfd;',
                    tpl: me.tplSynthese(),
                    html: ''
                }, me.panneauVentilation()]
        };
    },

    libelleTypeVente: function (v) {
        if (v === 'VNO') {
            return 'COMPTANT';
        }
        if (v === 'VO') {
            return 'CR\u00c9DIT';
        }
        return v;
    },

    /**
     * La balance et son resume presentes comme le document du milieu (retour des tests du 09/09 :
     * modernisation, l'affichage historique restant visible pour comparer).
     */
    tplSynthese: function () {
        return new Ext.XTemplate(
            '<div class="ventilation-balance synthese-balance">',
            '<div class="vb-col vb-large">',
            '<div class="vb-titre">Balance vente / caisse</div>',
            '<table class="vb-table">',
            '<tr><th></th><th>Ventes</th><th>Brut TTC</th><th>Remise</th><th>Net TTC</th><th>%</th><th>Panier</th>',
            '<th>Esp&egrave;ces</th><th>Ch&egrave;ques</th><th>Carte</th><th>Diff&eacute;r&eacute;</th><th>Mobile</th><th>Tiers payant</th></tr>',
            '<tpl for="lignes">',
            '<tr><td class="vb-lib">{[this.type(values.typeVente)]}</td><td class="vb-n">{[this.n(values.nbreVente)]}</td>',
            '<td class="vb-n">{[this.n(values.montantTTC)]}</td><td class="vb-n">{[this.n(values.montantRemise)]}</td>',
            '<td class="vb-n">{[this.n(values.montantNet)]}</td><td class="vb-p">{[this.n(values.pourcentage)]} %</td>',
            '<td class="vb-n">{[this.n(values.panierMoyen)]}</td><td class="vb-n">{[this.n(values.montantEsp)]}</td>',
            '<td class="vb-n">{[this.n(values.montantCheque)]}</td><td class="vb-n">{[this.n(values.montantCB)]}</td>',
            '<td class="vb-n">{[this.n(values.montantDiff)]}</td><td class="vb-n">{[this.n(values.montantMobilePayment)]}</td>',
            '<td class="vb-n">{[this.n(values.montantTp)]}</td></tr>',
            '</tpl>',
            '<tr class="vb-total"><td class="vb-lib">TOTAL</td><td class="vb-n">{[this.n(values.resume.nbreVente)]}</td>',
            '<td class="vb-n">{[this.n(values.resume.montantTTC)]}</td><td class="vb-n">{[this.n(values.resume.montantRemise)]}</td>',
            '<td class="vb-n">{[this.n(values.resume.montantNet)]}</td><td class="vb-p">100 %</td>',
            '<td class="vb-n">{[this.n(values.resume.panierMoyen)]}</td><td class="vb-n">{[this.n(values.resume.montantEsp)]}</td>',
            '<td class="vb-n">{[this.n(values.resume.montantCheque)]}</td><td class="vb-n">{[this.n(values.resume.montantCB)]}</td>',
            '<td class="vb-n">{[this.n(values.resume.montantDiff)]}</td><td class="vb-n">{[this.n(values.resume.montantMobilePayment)]}</td>',
            '<td class="vb-n">{[this.n(values.resume.montantTp)]}</td></tr>',
            '</table>',
            '</div>',
            '<div class="vb-col">',
            '<div class="vb-titre">R&eacute;sum&eacute;</div>',
            '<div class="vb-kpis">',
            '{[this.kpi("Montant vente", values.resume.montantTTC)]}{[this.kpi("Montant achat", values.resume.montantAchat)]}',
            '{[this.kpi("Marge", values.resume.marge)]}{[this.kpi("Ratio V/A", values.resume.ratioVA, true)]}',
            '{[this.kpi("Fonds de caisse", values.resume.fondCaisse)]}{[this.kpi("R&egrave;gl. diff&eacute;r&eacute;s", values.resume.montantRegDiff)]}',
            '{[this.kpi("R&egrave;gl. tiers payant", values.resume.montantRegleTp)]}{[this.kpi("Entr&eacute;es", values.resume.montantEntre)]}',
            '{[this.kpi("Sorties", values.resume.montantSortie)]}{[this.kpi("Esp&egrave;ces", values.resume.montantEsp)]}',
            '{[this.kpi("Mobile", values.resume.montantMobilePayment)]}{[this.kpi("Panier moyen", values.resume.panierMoyen)]}',
            '{[this.kpi("Nb ventes", values.resume.nbreVente)]}{[this.kpi("Ch&egrave;ques", values.resume.montantCheque)]}',
            '{[this.kpi("Virements", values.resume.montantVirement)]}',
            '</div></div></div>',
            {
                n: function (v) {
                    return Ext.util.Format.number(v || 0, '0,000');
                },
                type: function (v) {
                    return v === 'VNO' ? 'COMPTANT' : (v === 'VO' ? 'CR\u00c9DIT' : Ext.String.htmlEncode(v || ''));
                },
                kpi: function (libelle, valeur, brut) {
                    return '<div class="vb-kpi"><span class="vb-kpi-lib">' + libelle + '</span><span class="vb-kpi-val">'
                            + (brut ? (valeur || 0) : Ext.util.Format.number(valeur || 0, '0,000')) + '</span></div>';
                }
            });
    },

    /**
     * Le document de ventilation affiche sous la balance (retour du 09/09, point 4 ; retour des tests :
     * nombre de ventes et part par mode, libelle de la part tiers payant, repartition par taux de TVA).
     */
    panneauVentilation: function () {
        return {
            xtype: 'panel',
            itemId: 'ventilationBalance',
            flex: 1,
            autoScroll: true,
            border: false,
            bodyStyle: 'background:#fbfcfd;',
            tpl: new Ext.XTemplate(
                '<div class="ventilation-balance">',
                '<div class="vb-col">',
                '<div class="vb-titre">Clients et ventes</div>',
                '<table class="vb-table">',
                '<tr><th></th><th>Clients</th><th>% clients</th><th>Montant net</th><th>% ventes</th></tr>',
                '<tr><td class="vb-lib">COMPTANT (VNO)</td><td class="vb-n">{[this.n(values.comptant.ventes)]}</td>',
                '<td class="vb-p">{[this.p(values.comptant.partVentes)]}</td><td class="vb-n">{[this.n(values.comptant.montant)]}</td>',
                '<td class="vb-p">{[this.p(values.comptant.partMontant)]}</td></tr>',
                '<tr><td class="vb-lib">CR&Eacute;DIT (VO)</td><td class="vb-n">{[this.n(values.credit.ventes)]}</td>',
                '<td class="vb-p">{[this.p(values.credit.partVentes)]}</td><td class="vb-n">{[this.n(values.credit.montant)]}</td>',
                '<td class="vb-p">{[this.p(values.credit.partMontant)]}</td></tr>',
                '<tr class="vb-total"><td class="vb-lib">TOTAL</td><td class="vb-n">{[this.n(values.totalVentes)]}</td><td class="vb-p">100 %</td>',
                '<td class="vb-n">{[this.n(values.chiffreAffaires)]}</td><td class="vb-p">100 %</td></tr>',
                '</table>',
                '</div>',
                '<div class="vb-col vb-large">',
                '<div class="vb-titre">Part dans le chiffre d\'affaires</div>',
                '<table class="vb-table">',
                '<tr><th></th><th>Montant</th><th>% du CA</th><th>Ventes</th><th>% ventes</th></tr>',
                '<tr><td class="vb-lib">Esp&egrave;ces</td><td class="vb-n">{[this.n(values.especes.montant)]}</td><td class="vb-p">{[this.p(values.especes.part)]}</td>',
                '<td class="vb-n">{[this.n(values.especes.ventes)]}</td><td class="vb-p">{[this.p(values.especes.partVentes)]}</td></tr>',
                '<tr><td class="vb-lib">Mobile money</td><td class="vb-n">{[this.n(values.mobile.montant)]}</td><td class="vb-p">{[this.p(values.mobile.part)]}</td>',
                '<td class="vb-n">{[this.n(values.mobile.ventes)]}</td><td class="vb-p">{[this.p(values.mobile.partVentes)]}</td></tr>',
                '<tpl for="mobile.operateurs">',
                '<tr class="vb-operateur"><td class="vb-lib">&nbsp;&nbsp;&nbsp;{[Ext.String.htmlEncode(values.libelle)]}</td><td class="vb-n">{[this.n(values.montant)]}</td><td class="vb-p">{[this.p(values.part)]}</td>',
                '<td class="vb-n">{[this.n(values.ventes)]}</td><td class="vb-p">{[this.p(values.partVentes)]}</td></tr>',
                '</tpl>',
                '<tpl for="modes"><tpl if="!values.mobile && values.modeId != \'1\'">',
                '<tr><td class="vb-lib">{[Ext.String.htmlEncode(values.libelle)]}</td><td class="vb-n">{[this.n(values.montant)]}</td><td class="vb-p">{[this.p(values.part)]}</td>',
                '<td class="vb-n">{[this.n(values.ventes)]}</td><td class="vb-p">{[this.p(values.partVentes)]}</td></tr>',
                '</tpl></tpl>',
                '<tr><td class="vb-lib">Part tiers payant (sur ventes &agrave; cr&eacute;dit)</td><td class="vb-n">{[this.n(values.creditCa.montant)]}</td><td class="vb-p">{[this.p(values.creditCa.part)]}</td>',
                '<td class="vb-n">{[this.n(values.credit.ventes)]}</td><td class="vb-p">{[this.p(values.credit.partVentes)]}</td></tr>',
                '</table>',
                '</div>',
                '<div class="vb-col">',
                '<div class="vb-titre">Caisse</div>',
                '<table class="vb-table">',
                '<tr><th></th><th>Nombre</th><th>Montant</th></tr>',
                '<tr><td class="vb-lib">Mouvements de caisse</td><td class="vb-n">{[this.n(values.caisse.mouvements.nombre)]}</td><td class="vb-n">{[this.n(values.caisse.mouvements.montant)]}</td></tr>',
                '<tr class="vb-operateur"><td class="vb-lib">&nbsp;&nbsp;&nbsp;Entr&eacute;es</td><td class="vb-n">{[this.n(values.caisse.entrees.nombre)]}</td><td class="vb-n">{[this.n(values.caisse.entrees.montant)]}</td></tr>',
                '<tr class="vb-operateur"><td class="vb-lib">&nbsp;&nbsp;&nbsp;Sorties</td><td class="vb-n">{[this.n(values.caisse.sorties.nombre)]}</td><td class="vb-n">{[this.n(values.caisse.sorties.montant)]}</td></tr>',
                '<tr><td class="vb-lib">R&egrave;glements tiers payant</td><td class="vb-n">{[this.n(values.caisse.reglementsTp.nombre)]}</td><td class="vb-n">{[this.n(values.caisse.reglementsTp.montant)]}</td></tr>',
                '<tr><td class="vb-lib">R&egrave;glements diff&eacute;r&eacute;s</td><td class="vb-n">{[this.n(values.caisse.reglementsDifferes.nombre)]}</td><td class="vb-n">{[this.n(values.caisse.reglementsDifferes.montant)]}</td></tr>',
                '<tr><td class="vb-lib">Ventes &agrave; cr&eacute;dit</td><td class="vb-n">{[this.n(values.caisse.ventesCredit.nombre)]}</td><td class="vb-n">{[this.n(values.caisse.ventesCredit.montant)]}</td></tr>',
                '</table>',
                '</div>',
                '<div class="vb-col">',
                '<div class="vb-titre">R&eacute;partition par taux de TVA</div>',
                '<table class="vb-table">',
                '<tr><th>Taux</th><th>HT</th><th>TVA</th><th>TTC</th><th>% TTC</th></tr>',
                '<tpl for="tva">',
                '<tr><td class="vb-lib">{taux} %</td><td class="vb-n">{[this.n(values.montantHt)]}</td><td class="vb-n">{[this.n(values.montantTva)]}</td>',
                '<td class="vb-n">{[this.n(values.montantTtc)]}</td><td class="vb-p">{[this.p(values.part)]}</td></tr>',
                '</tpl>',
                '<tpl if="!values.tva || !values.tva.length"><tr><td class="vb-lib" colspan="5" style="color:#7f8c8d">Aucune vente sur la p&eacute;riode.</td></tr></tpl>',
                '</table>',
                '</div>',
                '</div>',
                {
                    n: function (v) {
                        return Ext.util.Format.number(v || 0, '0,000');
                    },
                    p: function (v) {
                        return Ext.util.Format.number(v || 0, '0.0') + ' %';
                    }
                }),
            html: '<div style="padding:10px;color:#7f8c8d;">Lancez une recherche pour afficher la ventilation.</div>'
        };
    },

    /* ------------------------------------------------------------------ onglet Analyse comparative */

    /** Une colonne de montant qui porte, sous la valeur, son taux d'evolution par rapport a la periode precedente. */
    colonneEvolution: function (entete, champ, largeur, cle) {
        var me = this;
        return {
            header: entete, dataIndex: champ, width: largeur || 105, align: 'right',
            renderer: function (v, meta, ligne) {
                return me.montantAvecEvolution(v, (ligne.get('evolutions') || {})[cle || champ]);
            },
            summaryType: 'sum',
            summaryRenderer: function (v) {
                return '<b>' + Ext.util.Format.number(v || 0, '0,000') + '</b>';
            }
        };
    },

    /** « 12 345 » puis, en petit et en couleur, « +8,5 % » ; sans evolution (premiere periode), la valeur seule. */
    montantAvecEvolution: function (valeur, evolution) {
        var texte = Ext.util.Format.number(valeur || 0, '0,000');
        if (evolution === null || evolution === undefined) {
            return texte;
        }
        var couleur = evolution > 0 ? '#177a17' : (evolution < 0 ? '#a00' : '#666');
        return texte + '<br><span class="evolution" style="color:' + couleur + ';font-size:10px;">' + (evolution > 0 ? '+' : '')
                + Ext.util.Format.number(evolution, '0.00') + ' %</span>';
    },

    /**
     * L'onglet d'analyse comparative : sa propre recherche (periode, dates), la grille avec les taux
     * d'evolution et le total general, puis le graphique en barres (mois par annee, jours par
     * semaine, ou une barre par periode) avec sa legende.
     */
    ongletAnalyse: function (analyseStore) {
        var me = this;
        return {
            title: 'Analyse comparative',
            itemId: 'ongletAnalyseBalance',
            xtype: 'panel',
            layout: {type: 'vbox', align: 'stretch'},
            border: false,
            dockedItems: [me.barreRecherche('Analyse', true, ['->', {
                        text: 'Imprimer', itemId: 'analyseImprimer',
                        tooltip: 'Imprimer l\'analyse comparative et l\'&eacute;volution par mode (PDF)',
                        iconCls: 'printable'
                    }, {
                        text: 'Exporter', itemId: 'analyseExporter',
                        tooltip: 'Exporter l\'analyse affich&eacute;e au format Excel',
                        iconCls: 'export_excel_icon'
                    }])],
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'grilleAnalyse',
                    flex: 1,
                    border: false,
                    store: analyseStore,
                    features: [{ftype: 'summary'}],
                    viewConfig: {
                        columnLines: true,
                        deferEmptyText: false,
                        emptyText: '<div style="padding:12px">Choisissez une p&eacute;riode et lancez la recherche.</div>',
                        getRowClass: function (ligne) {
                            return ligne.get('enCours') ? 'periode-en-cours' : '';
                        }
                    },
                    dockedItems: [{
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [{
                                    xtype: 'tbtext',
                                    itemId: 'analyseResume',
                                    text: 'Les p&eacute;riodes r&eacute;volues sont compl&egrave;tes ; celle en cours est '
                                            + 'rappel&eacute;e &agrave; part et n\'est pas comparable telle quelle.'
                                }]
                        }],
                    columns: [
                        {
                            header: 'P&eacute;riode', dataIndex: 'libelle', flex: 1, minWidth: 110,
                            renderer: function (valeur, meta, ligne) {
                                return ligne.get('enCours') ? valeur + ' <i style="color:#888">(en cours)</i>' : valeur;
                            },
                            summaryRenderer: function () {
                                return '<b>TOTAL G&Eacute;N&Eacute;RAL</b>';
                            }
                        },
                        {
                            header: 'Ventes', dataIndex: 'nbreVente', width: 80, align: 'right',
                            renderer: function (v, meta, ligne) {
                                return me.montantAvecEvolution(v, (ligne.get('evolutions') || {}).nbreVente);
                            },
                            summaryType: 'sum',
                            summaryRenderer: function (v) {
                                return '<b>' + Ext.util.Format.number(v || 0, '0,000') + '</b>';
                            }
                        },
                        me.colonneEvolution('Brut TTC', 'montantTTC'),
                        me.colonneEvolution('Remise', 'montantRemise', 90),
                        me.colonneEvolution('Net TTC', 'montantNet'),
                        me.colonneEvolution('Achat', 'montantAchat'),
                        me.colonneEvolution('Marge', 'marge'),
                        Ext.apply(me.colonneEvolution('Panier moyen', 'panierMoyen', 100), {
                            summaryType: 'average',
                            summaryRenderer: function () {
                                return '<b>' + Ext.util.Format.number((me.totalAnalyse || {}).panierMoyen || 0, '0,000') + '</b>';
                            }
                        }),
                        me.colonneEvolution('Esp&egrave;ces', 'montantEsp', 95),
                        me.colonneEvolution('Mobile', 'montantMobilePayment', 95),
                        me.colonneEvolution('Tiers payant', 'montantTp', 100),
                        me.colonneEvolution('Diff&eacute;r&eacute;', 'montantDiff', 95)
                    ]
                }, {
                    xtype: 'panel',
                    itemId: 'graphiqueAnalyse',
                    height: 250,
                    border: false,
                    layout: 'fit',
                    html: '<div style="margin:20px;color:#666;">Lancez une recherche pour afficher le graphique.</div>'
                }]
        };
    },

    /* ------------------------------------------------------------------ onglet Evolution par mode */

    /**
     * L'onglet « Evolution par mode de paiement » : sa propre recherche, les periodes en ligne, les
     * modes de reglement en colonne (ceux rencontres sur les periodes, sans mention « mobile »), le
     * taux d'evolution sous chaque montant, et la ligne TOTAL.
     */
    ongletModes: function () {
        var me = this;
        return {
            title: '&Eacute;volution par mode de paiement',
            itemId: 'ongletModesBalance',
            xtype: 'panel',
            layout: {type: 'vbox', align: 'stretch'},
            border: false,
            dockedItems: [me.barreRecherche('Modes', true, ['->', {
                        text: 'Imprimer', itemId: 'modesImprimer',
                        tooltip: 'Imprimer l\'analyse comparative et l\'&eacute;volution par mode (PDF)',
                        iconCls: 'printable'
                    }, {
                        text: 'Exporter', itemId: 'modesExporter',
                        tooltip: 'Exporter l\'&eacute;volution par mode au format Excel',
                        iconCls: 'export_excel_icon'
                    }])],
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'grilleModes',
                    flex: 1,
                    border: false,
                    store: Ext.create('Ext.data.Store', {fields: ['libelle', 'enCours'], data: []}),
                    features: [{ftype: 'summary'}],
                    viewConfig: {
                        columnLines: true,
                        deferEmptyText: false,
                        emptyText: '<div style="padding:12px">Choisissez une p&eacute;riode et lancez la recherche.</div>',
                        getRowClass: function (ligne) {
                            return ligne.get('enCours') ? 'periode-en-cours' : '';
                        }
                    },
                    dockedItems: [{
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [{
                                    xtype: 'tbtext',
                                    itemId: 'modesResume',
                                    text: 'Montants encaiss&eacute;s par mode de r&egrave;glement, p&eacute;riode par p&eacute;riode.'
                                }]
                        }],
                    columns: [{header: 'P&eacute;riode', dataIndex: 'libelle', flex: 1}]
                }]
        };
    }
});
