/* global Ext */

// Affiche uniquement la lettre de la classe ABC (ex: "ABC_CLASSE_C" -> "C").
function abcClasseLetterDetail(id) {
    if (!id) { return 'Non classe'; }
    var parts = String(id).split('_');
    return parts[parts.length - 1] || 'Non classe';
}

// Rendu "carte de chaleur" des quantites mensuelles vendues : l'intensite du
// fond depend du maximum observe sur les annees chargees (maxVenteMoisDetail).
var maxVenteMoisDetail = 0;
var moisVenteDetail = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function renduMoisVenteDetail(v, meta) {
    var n = parseInt(v, 10) || 0;
    if (n <= 0) {
        meta.style = 'color:#c3c9cf;text-align:right;';
        return n;
    }
    var ratio = maxVenteMoisDetail > 0 ? n / maxVenteMoisDetail : 0;
    var fond = '#f3eefa', texte = '#2b2b2b';
    if (ratio > 0.75) {
        fond = '#b391dd';
        texte = '#fff';
    } else if (ratio > 0.5) {
        fond = '#cdb6e8';
        texte = '#3d2266';
    } else if (ratio > 0.25) {
        fond = '#e3d7f3';
    }
    meta.style = 'background:' + fond + ';color:' + texte + ';font-weight:bold;text-align:right;';
    return n;
}

function totalVenteAnneeDetail(rec) {
    var t = 0;
    for (var i = 0; i < moisVenteDetail.length; i++) {
        t += parseInt(rec.get(moisVenteDetail[i]), 10) || 0;
    }
    return t;
}

// ---------------------------------------------------------------------------
// Courbes d'evolution (SVG inline, aucune librairie graphique ajoutee). Les
// quantites mensuelles proviennent du meme store que le tableau des ventes
// realisees : aucun appel serveur supplementaire.
// ---------------------------------------------------------------------------
var COULEURS_ANNEES_DETAIL = ['#9aa4ad', '#1a5f9e', '#6a3fa0'];
var MOIS_COURTS_DETAIL = ['Jan', 'F\u00e9v', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Ao\u00fbt', 'Sep', 'Oct', 'Nov', 'D\u00e9c'];

// Lignes du store stat-vente ramenees a {annee, mois[12]}, triees par annee croissante.
function lignesStatVenteDetail(store) {
    var lignes = [];
    if (!store) {
        return lignes;
    }
    store.each(function (r) {
        var mois = [];
        for (var i = 0; i < moisVenteDetail.length; i++) {
            mois.push(parseInt(r.get(moisVenteDetail[i]), 10) || 0);
        }
        lignes.push({annee: parseInt(r.get('int_YEAR'), 10) || 0, mois: mois});
    });
    lignes.sort(function (a, b) {
        return a.annee - b.annee;
    });
    return lignes;
}

/**
 * Trace une ou plusieurs courbes. series = [{valeurs:[12], couleur, libelle}].
 * etiquettes : 'tous' = quantite sur chaque mois (lecture d'une seule annee),
 * 'pics' = quantite sur le maximum de chaque courbe (comparaison lisible).
 */
function courbeSvgDetail(series, etiquettes, libellesX) {
    var L = 900, H = 250, mg = 38, md = 16, mh = 26, mb = 30;
    var iw = L - mg - md, ih = H - mh - mb, i, k, max = 0;
    for (i = 0; i < series.length; i++) {
        for (k = 0; k < series[i].valeurs.length; k++) {
            if (series[i].valeurs[k] > max) {
                max = series[i].valeurs[k];
            }
        }
    }
    max = max * 1.2 || 1;
    var n = libellesX.length;
    var px = function (j) {
        return mg + (n <= 1 ? iw / 2 : iw * j / (n - 1));
    };
    var py = function (v) {
        return mh + ih - (v / max) * ih;
    };
    var svg = '<svg viewBox="0 0 ' + L + ' ' + H + '" width="100%" style="max-width:' + L
            + 'px;font-family:Arial,Helvetica,sans-serif">';
    for (i = 0; i <= 3; i++) {
        var gy = mh + ih * i / 3;
        svg += '<line x1="' + mg + '" y1="' + gy + '" x2="' + (L - md) + '" y2="' + gy
                + '" stroke="#e0e6ea" stroke-width="1"/>';
    }
    for (i = 0; i < n; i++) {
        svg += '<text x="' + px(i) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="11" fill="#7a7a7a">'
                + libellesX[i] + '</text>';
    }
    for (i = 0; i < series.length; i++) {
        var s = series[i], d = '';
        for (k = 0; k < s.valeurs.length; k++) {
            d += (k ? 'L' : 'M') + px(k) + ' ' + py(s.valeurs[k]);
        }
        if (series.length === 1) {
            svg += '<path d="' + d + 'L' + px(n - 1) + ' ' + (mh + ih) + 'L' + px(0) + ' ' + (mh + ih)
                    + 'Z" fill="' + s.couleur + '" fill-opacity="0.12"/>';
        }
        svg += '<path d="' + d + '" fill="none" stroke="' + s.couleur
                + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
        var pic = Math.max.apply(null, s.valeurs);
        for (k = 0; k < s.valeurs.length; k++) {
            svg += '<circle cx="' + px(k) + '" cy="' + py(s.valeurs[k]) + '" r="3" fill="#ffffff" stroke="'
                    + s.couleur + '" stroke-width="2"/>';
            if (etiquettes === 'tous' || s.valeurs[k] === pic) {
                svg += '<text x="' + px(k) + '" y="' + (py(s.valeurs[k]) - 9)
                        + '" text-anchor="middle" font-size="11" font-weight="bold" fill="' + s.couleur + '">'
                        + s.valeurs[k] + '</text>';
            }
        }
    }
    return svg + '</svg>';
}

// Courbe des ventes : une annee seule, ou comparaison des 3 dernieres, a la demande.
function afficherCourbeVentesDetail(indices, titre) {
    var cmp = Ext.getCmp('courbe_ventes_detail');
    if (!cmp) {
        return;
    }
    var recentes = lignesStatVenteDetail(storeStatVenteDetail).slice(-3);
    var series = [];
    for (var i = 0; i < indices.length; i++) {
        var l = recentes[indices[i]];
        if (l) {
            series.push({valeurs: l.mois, couleur: COULEURS_ANNEES_DETAIL[indices[i]], libelle: l.annee});
        }
    }
    if (!series.length) {
        return;
    }
    var legende = '';
    for (i = 0; i < series.length; i++) {
        var t = 0;
        for (var k = 0; k < series[i].valeurs.length; k++) {
            t += series[i].valeurs[k];
        }
        legende += '<span style="margin-left:14px;color:' + series[i].couleur + ';font-weight:bold;">&#9644;&nbsp;'
                + series[i].libelle + ' \u2014 ' + t + ' u.</span>';
    }
    cmp.update('<div style="padding:4px 6px 0;">'
            + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">'
            + '<span style="font-weight:bold;color:#6a3fa0;">' + titre + '</span>'
            + '<span style="font-size:12px;">' + legende + '</span></div>'
            + courbeSvgDetail(series, indices.length === 1 ? 'tous' : 'pics', MOIS_COURTS_DETAIL) + '</div>');
    cmp.show();
}

function masquerCourbeVentesDetail() {
    var cmp = Ext.getCmp('courbe_ventes_detail');
    if (cmp) {
        cmp.hide();
    }
}

// Un bouton par annee presente + un bouton de comparaison : la courbe ne
// s'affiche qu'a la demande, le tableau annuel reste la vue par defaut.
function construireBoutonsVentesDetail() {
    var cont = Ext.getCmp('ventes_boutons_detail');
    if (!cont) {
        return;
    }
    cont.removeAll();
    masquerCourbeVentesDetail();
    var recentes = lignesStatVenteDetail(storeStatVenteDetail).slice(-3);
    if (!recentes.length) {
        return;
    }
    recentes.forEach(function (l, i) {
        cont.add({
            xtype: 'button',
            text: String(l.annee),
            tooltip: 'Courbe des ventes ' + l.annee,
            style: 'border-left:4px solid ' + COULEURS_ANNEES_DETAIL[i] + ';',
            handler: function () {
                afficherCourbeVentesDetail([i], '\u00c9volution des ventes ' + l.annee);
            }
        });
    });
    if (recentes.length > 1) {
        cont.add({
            xtype: 'button',
            text: 'Comparer les ' + recentes.length + ' derni\u00e8res ann\u00e9es',
            handler: function () {
                var idx = [];
                for (var i = 0; i < recentes.length; i++) {
                    idx.push(i);
                }
                afficherCourbeVentesDetail(idx, 'Comparaison des ' + recentes.length + ' derni\u00e8res ann\u00e9es');
            }
        });
    }
    cont.add({
        xtype: 'button',
        text: 'Masquer',
        tooltip: 'Masquer la courbe et revenir au tableau seul',
        handler: masquerCourbeVentesDetail
    });
}

var url_services_data_zonegeo_famille = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_codeacte_famille = '../webservices/configmanagement/codeacte/ws_data.jsp';
var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_codegestion_famille = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';
// La grille Infos.Consommations attend les champs de detail-sortie-famille (Reference =
// str_CODE_TVA, Prix Vente = int_VALUE1) : avant la migration, la collision de variables
// globales avec detailArticleOther.js faisait deja servir cette grille par
// ws_data_detailsortie_famille.jsp, pas par ws_data_mouvement_vente.jsp.
var url_services_data_detailsortie_famille = '../api/v1/suivi-stock-vente/detail-sortie-famille';
var url_services_data_statVente_famille = '../api/v1/suivi-stock-vente/stat-vente-famille';
var url_services_data_perime_famille = '../webservices/stockmanagement/perime/ws_data_famille.jsp';
var url_services_data_typeetiquette = '../webservices/configmanagement/typeetiquette/ws_data.jsp';

var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var valdatedebutDetailOrder;
var valdatefinDetailOrder;
var OgridpanelDetailID;
var OgridpanelOrder;
var lg_GROSSISTE_ORDER_ID;
var lgGROSSISTEORDERID = '';
// Fenetre de detail actuellement ouverte (partagee avec detailArticleOther :
// une seule fenetre de detail a la fois, les champs utilisent des ids globaux).
var winDetailArticleOuverte = null;
// Store des ventes mensuelles, partage avec les fonctions de courbe ci-dessus.
var storeStatVenteDetail = null;

Ext.define('testextjs.view.configmanagement.famille.action.detailArticle', {
    extend: 'Ext.window.Window',
    xtype: 'addfamille',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'testextjs.model.GroupeFamille',
        'testextjs.model.Grossiste',
        'testextjs.model.CodeGestion',
        'testextjs.model.CodeActe',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'testextjs.model.modelStatVente'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        produitId: null
    },
    initComponent: function () {
        // Une seule fenetre de detail a la fois : un nouveau clic remplace la
        // precedente au lieu de la dupliquer (et d'en corrompre l'affichage).
        if (winDetailArticleOuverte && !winDetailArticleOuverte.isDestroyed) {
            winDetailArticleOuverte.destroy();
        }
        winDetailArticleOuverte = null;
        // Nettoyage des IDs globaux partages avec d'autres vues (evite duplicate id)
        var sharedIds = [
            'lg_ZONE_GEO_ID', 'lg_FAMILLEARTICLE_ID', 'lg_CODE_ACTE_ID', 'lg_CODE_GESTION_ID',
            'lg_TYPEETIQUETTE_ID', 'int_CIP', 'str_DESCRIPTION', 'int_EAN13',
            'int_PRICE', 'int_PAF', 'int_PAT', 'int_PRICE_TIPS', 'int_TAUX_MARQUE',
            'str_CODE_REMISE', 'str_CODE_TAUX_REMBOURSEMENT', 'int_T', 'str_CODE_TVA',
            'int_QTEDETAIL', 'int_NUMBER_AVAILABLE', 'dt_DATE_LIVRAISON',
            'int_STOCK_REAPROVISONEMENT', 'int_QTE_REAPPROVISIONNEMENT',
            'gridpanelDetailID', 'datedebutDetail', 'datefinDetail',
            'ventes_boutons_detail', 'courbe_ventes_detail'
        ];
        sharedIds.forEach(function (cid) {
            var existing = Ext.getCmp(cid);
            if (existing) { try { existing.destroy(); } catch (e) {} }
        });

        valdatedebutDetail = "";
        valdatefinDetail = "";
        valdatedebutDetailOrder = "";
        valdatefinDetailOrder = "";
        lg_GROSSISTE_ORDER_ID = "";


        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;

        var itemsPerPage = 20;

        ref = this.getOdatasource().lg_FAMILLE_ID;



        var store_vente = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
//            autoLoad: false,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsortie_famille + "?lg_FAMILLE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_statVente = new Ext.data.Store({
            model: 'testextjs.model.modelStatVente',
            pageSize: itemsPerPage,
            autoLoad: true,
            sorters: [{
                    property: 'int_YEAR',
                    // Annee en cours en premier, puis les precedentes
                    direction: 'DESC'
                }],
            remoteSort: false,
            sortOnLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_statVente_famille + "?lg_FAMILLE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_order = new Ext.data.Store({
            // Le modèle est maintenant défini directement dans le store pour plus de clarté
            fields: [
                // On spécifie que ce sont des dates et on indique leur format
                {name: 'dt_ENTREE', type: 'date', dateFormat: 'd/m/Y H:i'},
                {name: 'dt_PEREMPTION', type: 'date', dateFormat: 'd/m/Y'},

                // Le reste des champs de ton modèle
                {name: 'int_NUM_LOT', type: 'string'},
                {name: 'lg_GROSSISTE_ID', type: 'string'},
                {name: 'int_NUMBER', type: 'int'},
                {name: 'int_STOCK_REAPROVISONEMENT', type: 'int'},
                {name: 'int_VALUE2', type: 'string'}
            ],
            pageSize: itemsPerPage,
            autoLoad: true,
            sorters: [{
                    property: 'dt_PEREMPTION',
                    direction: 'ASC' // Tri ascendant (du plus ancien au plus récent)
                }],
            proxy: {
                type: 'ajax',
                url: '../api/v1/commande/produit/commande/famille/' + ref,

                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });


        var store_grossiste_famille = new Ext.data.Store({
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
                }
            }

        });



        var form = new Ext.form.Panel({
            bodyPadding: 15,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                },
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    anchor: '100%',
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    title: 'Infos.Generales sur l\'article',
                    items: [
                        {
                            // Bandeau d'identification de l'article
                            xtype: 'container',
                            layout: {
                                type: 'hbox',
                                align: 'middle'
                            },
                            padding: '6 12',
                            margin: '0 0 10 0',
                            style: 'background:#f4f8fb;border:1px solid #dbe4ec;border-radius:6px;',
                            defaultType: 'displayfield',
                            items: [
                                {
                                    hideLabel: true,
                                    name: 'int_CIP',
                                    id: 'int_CIP',
                                    fieldStyle: 'color:#1a3fc4;font-weight:bold;font-size:22px',
                                    margin: '0 25 0 0',
                                    value: 0
                                },
                                {
                                    hideLabel: true,
                                    name: 'str_DESCRIPTION',
                                    id: 'str_DESCRIPTION',
                                    fieldStyle: 'color:#2b2b2b;font-weight:bold;font-size:17px',
                                    flex: 1
                                },
                                {
                                    // Date de peremption la plus proche (lot en stock, sinon date de la fiche) :
                                    // rouge clignotant pour qu'elle saute aux yeux. Cachee quand il n'y en a pas.
                                    hideLabel: true,
                                    name: 'peremption_proche_detail',
                                    id: 'peremption_proche_detail',
                                    hidden: true,
                                    width: 430,
                                    margin: '0 20 0 0'
                                },
                                {
                                    fieldLabel: 'EAN 13',
                                    labelWidth: 55,
                                    labelStyle: 'color:#7a7a7a;font-size:13px',
                                    name: 'int_EAN13',
                                    id: 'int_EAN13',
                                    fieldStyle: 'color:#555555;font-size:14px',
                                    width: 230,
                                    margin: '0 20 0 0'
                                },
                                {
                                    fieldLabel: 'Classe ABC',
                                    labelWidth: 80,
                                    labelStyle: 'color:#7a7a7a;font-size:13px;font-weight:bold',
                                    name: 'classe_abc_detail',
                                    id: 'classe_abc_detail',
                                    fieldStyle: 'color:#1a3fc4;font-weight:bold;font-size:17px',
                                    width: 170,
                                    value: 'Non classe'
                                }
                            ]
                        },
                        {
                            // Blocs thematiques + colonne stocks
                            xtype: 'container',
                            layout: {
                                type: 'hbox',
                                align: 'stretch'
                            },
                            defaults: {
                                xtype: 'container',
                                layout: {
                                    type: 'vbox',
                                    align: 'stretch'
                                },
                                padding: '6 10 8 10',
                                defaultType: 'displayfield',
                                defaults: {
                                    labelAlign: 'left',
                                    labelWidth: 145,
                                    labelStyle: 'color:#666666;font-size:12.5px',
                                    fieldStyle: 'color:#2b2b2b;font-weight:bold;font-size:13.5px'
                                }
                            },
                            items: [
                                {
                                    // Bloc Classement (bleu)
                                    flex: 1,
                                    margin: '0 10 0 0',
                                    style: 'background:#eef4fb;border:1px solid #cfe0f1;border-radius:6px;',
                                    items: [
                                        {
                                            xtype: 'component',
                                            html: '<div style="font-size:11.5px;font-weight:bold;letter-spacing:.5px;color:#1a5f9e;border-bottom:2px solid #cfe0f1;padding-bottom:3px;margin-bottom:5px;">CLASSEMENT</div>'
                                        },
                                        {
                                            fieldLabel: 'Emplacement',
                                            name: 'lg_ZONE_GEO_ID',
                                            id: 'lg_ZONE_GEO_ID'
                                        },
                                        {
                                            fieldLabel: 'Famille',
                                            name: 'lg_FAMILLEARTICLE_ID',
                                            id: 'lg_FAMILLEARTICLE_ID'
                                        },
                                        {
                                            fieldLabel: 'Code.Gestion',
                                            name: 'lg_CODE_GESTION_ID',
                                            id: 'lg_CODE_GESTION_ID'
                                        },
                                        {
                                            fieldLabel: 'Code geo article',
                                            name: 'str_CODE_GEO_ARTICLE',
                                            id: 'str_CODE_GEO_ARTICLE'
                                        },
                                        {
                                            fieldLabel: 'Code Tableau',
                                            name: 'int_T',
                                            id: 'int_T',
                                            fieldStyle: 'color:red;font-weight:bold;font-size:13.5px'
                                        },
                                        {
                                            fieldLabel: 'Quantite.Detail/Article',
                                            name: 'int_QTEDETAIL',
                                            id: 'int_QTEDETAIL',
                                            fieldStyle: 'color:orange;font-weight:bold;font-size:13.5px',
                                            value: 0
                                        }
                                    ]
                                },
                                {
                                    // Bloc Prix & taxes (vert)
                                    flex: 1,
                                    margin: '0 10 0 0',
                                    style: 'background:#eef8ee;border:1px solid #cfe8cf;border-radius:6px;',
                                    items: [
                                        {
                                            xtype: 'component',
                                            html: '<div style="font-size:11.5px;font-weight:bold;letter-spacing:.5px;color:#1c7c1c;border-bottom:2px solid #cfe8cf;padding-bottom:3px;margin-bottom:5px;">PRIX &amp; TAXES</div>'
                                        },
                                        {
                                            fieldLabel: 'Prix.Vente',
                                            name: 'int_PRICE',
                                            id: 'int_PRICE',
                                            fieldStyle: 'color:#1a3fc4;font-weight:bold;font-size:16px',
                                            value: 0
                                        },
                                        {
                                            fieldLabel: 'Prix.Achat.Facture',
                                            name: 'int_PAF',
                                            id: 'int_PAF',
                                            fieldStyle: 'color:#1a3fc4;font-weight:bold;font-size:16px',
                                            value: 0
                                        },
                                        {
                                            fieldLabel: 'Prix.Achat.Tarif',
                                            name: 'int_PAT',
                                            id: 'int_PAT',
                                            hidden: true
                                        },
                                        {
                                            fieldLabel: 'Taux.Marque',
                                            name: 'int_TAUX_MARQUE',
                                            id: 'int_TAUX_MARQUE'
                                        },
                                        {
                                            fieldLabel: 'Code.Remise',
                                            name: 'str_CODE_REMISE',
                                            id: 'str_CODE_REMISE'
                                        },
                                        {
                                            fieldLabel: 'Code.Tva',
                                            name: 'str_CODE_TVA',
                                            id: 'str_CODE_TVA',
                                            fieldStyle: 'color:green;font-weight:bold;font-size:13.5px'
                                        }
                                    ]
                                },
                                {
                                    // Bloc Reappro & dates (violet)
                                    flex: 1,
                                    margin: '0 10 0 0',
                                    style: 'background:#f5f0fa;border:1px solid #ddd0ec;border-radius:6px;',
                                    items: [
                                        {
                                            xtype: 'component',
                                            html: '<div style="font-size:11.5px;font-weight:bold;letter-spacing:.5px;color:#6a3fa0;border-bottom:2px solid #ddd0ec;padding-bottom:3px;margin-bottom:5px;">REAPPRO &amp; DATES</div>'
                                        },
                                        {
                                            fieldLabel: 'Seuil.Reappro',
                                            name: 'int_STOCK_REAPROVISONEMENT',
                                            id: 'int_STOCK_REAPROVISONEMENT',
                                            fieldStyle: 'color:#1a3fc4;font-weight:bold;font-size:13.5px'
                                        },
                                        {
                                            fieldLabel: 'Qte.Reappro',
                                            name: 'int_QTE_REAPPROVISIONNEMENT',
                                            id: 'int_QTE_REAPPROVISIONNEMENT',
                                            fieldStyle: 'color:#1a3fc4;font-weight:bold;font-size:13.5px'
                                        },
                                        {
                                            fieldLabel: 'Semois Q1',
                                            name: 'int_Q1_SEUIL_REAPPRO',
                                            id: 'int_Q1_SEUIL_REAPPRO',
                                            fieldStyle: 'color:#6a3fa0;font-weight:bold;font-size:13.5px'
                                        },
                                        {
                                            fieldLabel: 'Semois Q2',
                                            name: 'int_Q2_QTE_REAPPRO',
                                            id: 'int_Q2_QTE_REAPPRO',
                                            fieldStyle: 'color:#6a3fa0;font-weight:bold;font-size:13.5px'
                                        },
                                        {
                                            fieldLabel: 'Date dernier.BL',
                                            name: 'dt_DATE_LIVRAISON',
                                            id: 'dt_DATE_LIVRAISON',
                                            fieldStyle: 'color:green;font-weight:bold;font-size:13.5px'
                                        },
                                        {
                                            fieldLabel: 'Date derniere.Vente',
                                            name: 'dt_LAST_VENTE',
                                            id: 'dt_LAST_VENTE',
                                            fieldStyle: 'color:green;font-weight:bold;font-size:13.5px'
                                        },
                                        {
                                            fieldLabel: 'Date derniere.Entree',
                                            name: 'dt_LAST_ENTREE',
                                            id: 'dt_LAST_ENTREE',
                                            fieldStyle: 'color:green;font-weight:bold;font-size:13.5px'
                                        },
                                        {
                                            fieldLabel: 'Date dernier.Inventaire',
                                            name: 'dt_LAST_INVENTAIRE',
                                            id: 'dt_LAST_INVENTAIRE',
                                            fieldStyle: 'color:green;font-weight:bold;font-size:13.5px'
                                        }
                                    ]
                                },
                                {
                                    // 4e colonne dediee aux stocks
                                    id: 'colonne_stocks_detail',
                                    width: 200,
                                    padding: 6,
                                    style: 'background:#fdf6ec;border:1px solid #e0d3bd;border-radius:6px;',
                                    defaults: {
                                        labelAlign: 'left',
                                        labelWidth: 100,
                                        labelStyle: 'color: brown;font-size: 13px;font-weight:bold',
                                        width: 185,
                                        value: 0
                                    },
                                    listeners: {
                                        afterrender: function (c) {
                                            c.getEl().slideIn('r', {
                                                duration: 600,
                                                easing: 'easeOut'
                                            });
                                        }
                                    },
                                    items: [
                                        {
                                            fieldLabel: 'Stock rayon',
                                            name: 'int_NUMBER_AVAILABLE',
                                            id: 'int_NUMBER_AVAILABLE',
                                            fieldStyle: 'color:orange;font-weight:bold;font-size: 16px'
                                        },
                                        {
                                            fieldLabel: 'Stock reserve',
                                            name: 'int_STOCK_RESERVE_DETAIL',
                                            id: 'int_STOCK_RESERVE_DETAIL',
                                            fieldStyle: 'color:green;font-weight:bold;font-size: 16px'
                                        },
                                        {
                                            fieldLabel: 'Stock total',
                                            name: 'int_STOCK_TOTAL_DETAIL',
                                            id: 'int_STOCK_TOTAL_DETAIL',
                                            fieldStyle: 'color:blue;font-weight:bold;font-size: 16px'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'fieldset_conso_detail',
                    title: '<span style="color:#0d6a74;font-weight:bold;letter-spacing:.5px;">CONSOMMATIONS (SORTIES)</span>',
                    style: 'border-top:4px solid #0d6a74;',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelDetailID',
                            margin: '0 0 5 0',
                            store: store_vente,
                            height: 200,
                            columns: [{
                                    header: 'Date',
                                    dataIndex: 'dt_UPDATED',
                                    flex: 1
                                }, {
                                    header: 'Reference',
                                    dataIndex: 'str_CODE_TVA',
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:bold;font-size:1.5em"
                                }, {
                                    header: 'Quantite',
                                    dataIndex: 'int_NUMBER',
                                    align: 'right',
                                    flex: 1,
                                    renderer: function (v) {
                                        return '<span style="display:inline-block;min-width:26px;text-align:center;border-radius:10px;padding:1px 8px;font-weight:bold;background:#e2f2f3;color:#0d6a74;">' + (parseInt(v, 10) || 0) + '</span>';
                                    }
                                },
                                {
                                    header: 'Prix Vente',
                                    dataIndex: 'int_VALUE1',
                                    align: 'right',
                                    flex: 1,
                                    renderer: function (v) {
                                        return '<b>' + (v || '') + '</b>';
                                    }
                                }, {
                                    header: 'Utilisateur',
                                    dataIndex: 'lg_USER_ID',
                                    flex: 1
                                }],
                            tbar: [
                                {
                                    xtype: 'datefield',
                                    id: 'datedebutDetail',
                                    name: 'datedebutDetail',
                                    emptyText: 'Date debut',
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    flex: 0.5,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {
                                            // alert(me.getSubmitValue());
                                            valdatedebutDetail = me.getSubmitValue();
                                            Ext.getCmp('datefinDetail').setMinValue(me.getValue());
                                            Ext.getCmp('gridpanelDetailID').getStore().getProxy().url = url_services_data_detailsortie_famille + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + valdatedebutDetail;

                                        }
                                    }
                                }, {
                                    xtype: 'datefield',
                                    id: 'datefinDetail',
                                    name: 'datefinDetail',
                                    emptyText: 'Date fin',
                                    maxValue: new Date(),
                                    submitFormat: 'Y-m-d',
                                    flex: 0.5,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {
                                            //alert(me.getSubmitValue());
                                            valdatefinDetail = me.getSubmitValue();

                                            Ext.getCmp('datedebutDetail').setMaxValue(me.getValue());
                                            Ext.getCmp('gridpanelDetailID').getStore().getProxy().url = url_services_data_detailsortie_famille + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + valdatedebutDetail + "&datefin=" + valdatefinDetail;

                                        }
                                    }
                                }, '-', {
                                    xtype: 'textfield',
                                    id: 'rechercher',
                                    name: 'user',
                                    flex: 0.5,
                                    emptyText: 'Rech',
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me.onRechClick();

                                                }
                                            });
                                        }
                                    }
                                }, {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    scope: this,
                                    iconCls: 'searchicon',
                                    handler: this.onRechClick
                                },
                                {
                                    text: 'Imprimer',
                                    tooltip: 'imprimer',
                                    scope: this,
                                    iconCls: 'pdf',
                                    handler: function () {
                                        let
                                                dt_fin = Ext.getCmp('datefinDetail').getSubmitValue(), dt_debut = Ext.getCmp('datedebutDetail').getSubmitValue()
                                                ;

                                        const linkUrl = "../webservices/stockmanagement/suivistockvente/ws_generate_pdf.jsp" + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + dt_debut + "&datefin=" + dt_fin + "&search_value=" + Ext.getCmp('rechercher').getValue();
                                        window.open(linkUrl);
                                    }
                                }



                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_vente,
                                displayInfo: true
                            },
                            listeners: {
                                scope: this
                            }
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: '<span style="color:#b25a00;font-weight:bold;letter-spacing:.5px;">COMMANDES RECUES</span>',
                    style: 'border-top:4px solid #b25a00;',
                    collapsible: true,
                    id: 'infoconsorecu',
                    hidden: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelOrderID',
                            margin: '0 0 5 0',
                            store: store_order,
                            height: 200,
                            columns: [{
                                    header: 'Date entrée',
                                    dataIndex: 'dt_ENTREE',
                                    flex: 1,
                                    sortable: true,
                                    xtype: 'datecolumn',
                                    format: 'd/m/Y H:i'
                                }, {
                                    header: 'Date BL',
                                    dataIndex: 'dt_PEREMPTION',
                                    flex: 1,
                                    sortable: true,
                                    xtype: 'datecolumn',
                                    format: 'd/m/Y'
                                },

                                {
                                    header: 'Reference',
                                    dataIndex: 'int_NUM_LOT',
                                    flex: 1
                                }, {
                                    header: 'Repartiteur',
                                    dataIndex: 'lg_GROSSISTE_ID',
                                    flex: 1,
                                    renderer: function (v) {
                                        if (!v) {
                                            return '';
                                        }
                                        return '<span style="display:inline-block;background:#eef4fb;color:#1a5f9e;border-radius:4px;padding:1px 8px;font-weight:bold;">' + v + '</span>';
                                    }
                                }, {
                                    header: 'Quantite Commande',
                                    dataIndex: 'int_NUMBER',
                                    align: 'right',
                                    flex: 1
                                }, {
                                    header: 'Quantite livree',
                                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                                    align: 'right',
                                    flex: 1,
                                    // Pastille orange si la quantite livree differe de la commande, verte sinon.
                                    renderer: function (v, meta, rec) {
                                        var livree = parseInt(v, 10) || 0;
                                        var commandee = parseInt(rec.get('int_NUMBER'), 10) || 0;
                                        var fond = (livree < commandee) ? 'background:#fdeadb;color:#b25a00;' : 'background:#e6f4e6;color:#1c7c1c;';
                                        return '<span style="display:inline-block;min-width:26px;text-align:center;border-radius:10px;padding:1px 8px;font-weight:bold;' + fond + '">' + livree + '</span>';
                                    }
                                }, {
                                    header: 'Prix d\'achat',
                                    dataIndex: 'int_VALUE2',
                                    align: 'right',
                                    flex: 1,
                                    renderer: function (v) {
                                        return '<b>' + (v || '') + '</b>';
                                    }
                                }],
                            tbar: [
                                {
                                    xtype: 'datefield',
                                    id: 'datedebutDetailOrder',
                                    name: 'datedebutDetailOrder',
                                    emptyText: 'Date debut',
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    flex: 0.5,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {

                                            valdatedebutDetailOrder = me.getSubmitValue();
                                            Ext.getCmp('datefinDetailOrder').setMinValue(me.getValue());


                                        }
                                    }
                                }, {
                                    xtype: 'datefield',
                                    id: 'datefinDetailOrder',
                                    name: 'datefinDetailOrder',
                                    emptyText: 'Date fin',
                                    maxValue: new Date(),
                                    submitFormat: 'Y-m-d',
                                    flex: 0.5,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {
                                            valdatefinDetailOrder = me.getSubmitValue();

                                            Ext.getCmp('datedebutDetailOrder').setMaxValue(me.getValue());

                                        }
                                    }
                                }, '-', {
                                    xtype: 'textfield',
                                    id: 'rechercherOrder',
                                    name: 'rechercherOrder',
                                    flex: 0.5,
                                    emptyText: 'Rech',
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me.onRechOrderClick();

                                                }
                                            });
                                        }
                                    }
                                }, {
                                    xtype: 'combobox',
                                    name: 'lg_GROSSISTE_ORDER_ID',
                                    margins: '0 0 0 10',
                                    id: 'lg_GROSSISTE_ORDER_ID',
                                    store: store_grossiste_famille,
                                    //disabled: true,
                                    valueField: 'lg_GROSSISTE_ID',
                                    displayField: 'str_LIBELLE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    flex: 1,
                                    emptyText: 'Sectionner fournisseur...',
                                    listeners: {
                                        select: function (cmp) {
                                            lgGROSSISTEORDERID = cmp.getValue();

                                            Me.onRechOrderClick();

                                        }
                                    }
                                }, {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    scope: this,
                                    iconCls: 'searchicon',
                                    handler: this.onRechOrderClick
                                },
                                {
                                    text: 'Imprimer',
                                    tooltip: 'imprimer',
                                    scope: this,
                                    iconCls: 'pdf',
                                    handler: function () {

                                        var
                                                dt_fin = Ext.getCmp('datefinDetailOrder').getSubmitValue(), dt_debut = Ext.getCmp('datedebutDetailOrder').getSubmitValue(),
                                                lgGROSSISTE = Ext.getCmp('lg_GROSSISTE_ORDER_ID').getValue();
                                        if (lgGROSSISTE === null) {
                                            lgGROSSISTE = '';
                                        }

                                        var linkUrl = "../webservices/stockmanagement/suivistockvente/ws_generate_cmde_pdf.jsp" + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + dt_debut + "&datefin=" + dt_fin + "&search_value=" + Ext.getCmp('rechercherOrder').getValue() + "&lgGROSSISTE=" + lgGROSSISTE;

                                        window.open(linkUrl);
                                    }
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',

                                store: store_order,
                                displayInfo: true,
                                pageSize: itemsPerPage,

                                listeners: {
                                    beforechange: function (page, currentPage) {

                                        const myProxy = this.store.getProxy();
                                        myProxy.params = {
                                            search: null,
                                            grossisteId: null,
                                            dtStart: null,
                                            dtEnd: null

                                        };

                                        myProxy.setExtraParam('search', Ext.getCmp('rechercherOrder').getValue());

                                        myProxy.setExtraParam('dtStart', valdatedebutDetailOrder);
                                        myProxy.setExtraParam('dtEnd', valdatefinDetailOrder);
                                        myProxy.setExtraParam('grossisteId', lgGROSSISTEORDERID);

                                    }

                                }
                            },
                            listeners: {
                                scope: this
                            }
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: '<span style="color:#6a3fa0;font-weight:bold;letter-spacing:.5px;">VENTES REALISEES</span>',
                    style: 'border-top:4px solid #6a3fa0;',
                    collapsible: true,
                    id: 'infoventerealise',
                    defaultType: 'textfield',
                    hidden: true,
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            // Le tableau annuel reste la vue par defaut : la courbe s'affiche
                            // a la demande, une annee a la fois ou en comparaison.
                            xtype: 'container',
                            layout: {type: 'hbox', align: 'middle'},
                            margin: '0 0 6 0',
                            items: [
                                {
                                    xtype: 'component',
                                    margin: '0 8 0 0',
                                    html: '<span style="color:#6a3fa0;font-weight:bold;">Afficher la courbe :</span>'
                                },
                                {
                                    xtype: 'container',
                                    id: 'ventes_boutons_detail',
                                    layout: {type: 'hbox'},
                                    defaults: {margin: '0 6 0 0'}
                                }
                            ]
                        },
                        {
                            xtype: 'component',
                            id: 'courbe_ventes_detail',
                            hidden: true,
                            margin: '0 0 8 0',
                            html: ''
                        },
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelStatVenteID',
                            margin: '0 0 5 0',
                            store: store_statVente,
                            height: 200,
                            columns: [
                                {
                                    header: 'Année',
                                    dataIndex: 'int_YEAR',
                                    flex: 1.2,
                                    renderer: function (v, meta) {
                                        meta.style = 'font-weight:bold;';
                                        return v;
                                    }
                                }, {
                                    header: 'Jan',
                                    dataIndex: 'January',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                }, {
                                    header: 'F&eacute;v',
                                    dataIndex: 'February',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                }, {
                                    header: 'Mar',
                                    dataIndex: 'March',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                }, {
                                    header: 'Avr',
                                    dataIndex: 'April',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                }, {
                                    header: 'Mai',
                                    dataIndex: 'May',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                },
                                {
                                    header: 'Juin',
                                    dataIndex: 'June',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                },
                                {
                                    header: 'Juil',
                                    dataIndex: 'July',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                },
                                {
                                    header: 'Ao&ucirc;t',
                                    dataIndex: 'August',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                },
                                {
                                    header: 'Sep',
                                    dataIndex: 'September',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                },
                                {
                                    header: 'Oct',
                                    dataIndex: 'October',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                },
                                {
                                    header: 'Nov',
                                    dataIndex: 'November',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                },
                                {
                                    header: 'D&eacute;c',
                                    dataIndex: 'December',
                                    align: 'right',
                                    flex: 1,
                                    renderer: renduMoisVenteDetail
                                },
                                {
                                    header: 'Total',
                                    dataIndex: 'int_YEAR',
                                    align: 'right',
                                    sortable: false,
                                    flex: 1.1,
                                    renderer: function (v, meta, rec) {
                                        meta.style = 'background:#f0ebf7;text-align:right;';
                                        return '<b style="color:#6a3fa0;">' + totalVenteAnneeDetail(rec) + '</b>';
                                    }
                                }
                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPage,
                                store: store_statVente,
                                displayInfo: true
                            },
                            listeners: {
                                scope: this
                            }
                        }]

                }

            ]


        });

        OgridpanelDetailID = Ext.getCmp('gridpanelDetailID');
        OgridpanelOrder = Ext.getCmp('gridpanelOrder');

        // Compteurs dans les entetes de section + maximum mensuel pour la carte de chaleur.
        store_vente.on('load', function (st) {
            var fs = Ext.getCmp('fieldset_conso_detail');
            if (fs) {
                fs.setTitle('<span style="color:#0d6a74;font-weight:bold;letter-spacing:.5px;">CONSOMMATIONS (SORTIES)</span>'
                        + ' <span style="background:#e2f2f3;color:#0d6a74;border-radius:10px;padding:1px 8px;font-size:11px;">' + st.getTotalCount() + ' sorties</span>');
            }
        });
        store_order.on('load', function (st) {
            var fs = Ext.getCmp('infoconsorecu');
            if (fs) {
                fs.setTitle('<span style="color:#b25a00;font-weight:bold;letter-spacing:.5px;">COMMANDES RECUES</span>'
                        + ' <span style="background:#fdeadb;color:#b25a00;border-radius:10px;padding:1px 8px;font-size:11px;">' + st.getTotalCount() + ' r&eacute;ceptions</span>');
            }
        });
        store_statVente.on('datachanged', function (st) {
            maxVenteMoisDetail = 0;
            st.each(function (r) {
                for (var i = 0; i < moisVenteDetail.length; i++) {
                    var q = parseInt(r.get(moisVenteDetail[i]), 10) || 0;
                    if (q > maxVenteMoisDetail) {
                        maxVenteMoisDetail = q;
                    }
                }
            });
            // Memes donnees pour les deux courbes : aucun appel serveur en plus.
            storeStatVenteDetail = st;
            construireBoutonsVentesDetail();
        });

        if (Omode == "decondition" || (this.getOdatasource().bool_DECONDITIONNE == 0 && this.getOdatasource().bool_DECONDITIONNE_EXIST == 1)) {
            Ext.getCmp('int_QTEDETAIL').show();
        }
        if (Omode === "update" || Omode === "decondition" || Omode === "detail") {
            ref = this.getProduitId();
        }
        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            modal: true,
            maximizable: true,
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
                    // Le curseur revient toujours dans le champ produit, y compris apres
                    // une simple consultation : sinon la saisie suivante est perdue.
                    var champ = Ext.getCmp('rechecher');
                    if (champ && champ.focus) {
                        champ.focus(true, 100);
                    }
                },
                destroy: function () {
                    winDetailArticleOuverte = null;
                }
            }
        });
        winDetailArticleOuverte = win;
        // Les ventes mensuelles peuvent arriver AVANT que la fenetre soit rendue :
        // dans ce cas 'datachanged' est deja passe, on trace les courbes ici.
        win.on('afterrender', function () {
            if (store_statVente.getCount()) {
                storeStatVenteDetail = store_statVente;
                construireBoutonsVentesDetail();
            }
        }, this, {single: true, delay: 1});
        if (Omode === "update" || Omode === "decondition" || Omode === "detail") {
            // Masque de chargement : la fiche s'affiche des l'ouverture et se
            // remplit a l'arrivee de la reponse, sans etat "vide" trompeur.
            win.setLoading('Chargement de la fiche...');
            this.loadArticle(this.getProduitId());
        }

    },
    onSelectionChange: function (model, records) {
        const rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onRechClick: function () {

        var val = Ext.getCmp('rechercher');
        if (new Date(valdatedebutDetail) > new Date(valdatefinDetail)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        Ext.getCmp('gridpanelDetailID').getStore().load({
            params: {
                datedebut: valdatedebutDetail,
                datefin: valdatefinDetail,
                search_value: val.getValue()
            }
        }, url_services_data_detailsortie_famille);
    },
    onRechOrderClick: function () {
        const val = Ext.getCmp('rechercherOrder');
        Ext.getCmp('gridpanelOrderID').getStore().load({
            params: {
                search: val.getValue(),
                grossisteId: lgGROSSISTEORDERID,
                dtStart: valdatedebutDetailOrder,
                dtEnd: valdatefinDetailOrder
            }
        });
    },
    loadArticle: function (produitId) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/produit-search/fiche',
            params: {
                produitId: produitId

            },

            success: function (response, options) {
                if (winDetailArticleOuverte && !winDetailArticleOuverte.isDestroyed) {
                    winDetailArticleOuverte.setLoading(false);
                }
                const result = Ext.JSON.decode(response.responseText, true);

                const produit = result && result.results ? result.results[0] : null;
                if (produit) {
                    me.updateCmp(produit);
                }
            },
            failure: function () {
                if (winDetailArticleOuverte && !winDetailArticleOuverte.isDestroyed) {
                    winDetailArticleOuverte.setLoading(false);
                }
            }

        });
    },

    /**
     * Date de derniere vente accompagnee d'une lecture immediate : « 01/08/2025 14:20 (non vendu depuis 32
     * jours) » en rouge, « vendu aujourd'hui » en vert, « jamais vendu » en rouge.
     */
    texteDerniereVente: function (valeur) {
        if (!valeur) {
            return '<span style="color:#c0392b;">Jamais vendu</span>';
        }
        var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(valeur));
        if (!m) {
            return valeur;
        }
        var d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
        var aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);
        var jours = Math.round((aujourdhui - d) / 86400000);
        if (jours <= 0) {
            return valeur + ' <span style="color:#1e7e34;">(vendu aujourd\'hui)</span>';
        }
        return valeur + ' <span style="color:#c0392b;">(non vendu depuis ' + jours + ' jour' + (jours > 1 ? 's' : '') + ')</span>';
    },
    /**
     * « Péremption proche : 30/09/2026 (Lot AB1234 × 12) » dans le bandeau : la date en rouge clignotant, le
     * numero de lot en bleu, la quantite en stock de ce lot en vert. Cachee si aucune date.
     */
    afficherPeremptionProche: function (valeur, lot, quantite) {
        var cmp = Ext.getCmp('peremption_proche_detail');
        if (!cmp) {
            return;
        }
        if (!valeur) {
            cmp.hide();
            return;
        }
        if (!Ext.get('css-peremption-clignote')) {
            Ext.util.CSS.createStyleSheet(
                    '@keyframes peremptionClignote { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.15; } }'
                    + ' .peremption-clignote { color:#d40000;font-weight:bold;'
                    + 'animation: peremptionClignote 1s step-end infinite; }', 'css-peremption-clignote');
        }
        var html = '<span style="font-weight:bold;font-size:15px;color:#2b2b2b;">Péremption proche : '
                + '<span class="peremption-clignote">' + Ext.String.htmlEncode(valeur) + '</span>';
        if (lot || quantite) {
            html += ' (<span style="color:#1a3fc4;">Lot ' + Ext.String.htmlEncode(String(lot || '?')) + '</span>'
                    + ' × <span style="color:#1e7e34;">' + Ext.String.htmlEncode(String(quantite || '?')) + '</span>)';
        }
        cmp.setValue(html + '</span>');
        cmp.show();
    },
    updateCmp: function (rec) {
        // Separateur de millier (espace) pour les montants affiches.
        const formatMillier = function (v) {
            if (v === null || v === undefined || v === '') {
                return '';
            }
            const parties = String(v).split('.');
            parties[0] = parties[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            return parties.join('.');
        };
        Ext.getCmp('int_NUMBER_AVAILABLE').setValue(rec.int_NUMBER_AVAILABLE);
        // Classe ABC (lettre), stock reserve et stock total (= stock + reserve)
        Ext.getCmp('classe_abc_detail').setValue(abcClasseLetterDetail(rec.lg_CLASSE_ABC_ID));
        const stockDispo = parseInt(rec.int_NUMBER_AVAILABLE, 10) || 0;
        const stockReserve = parseInt(rec.int_STOCK_RESERVE, 10) || 0;
        Ext.getCmp('int_STOCK_RESERVE_DETAIL').setValue(stockReserve);
        Ext.getCmp('int_STOCK_TOTAL_DETAIL').setValue(stockDispo + stockReserve);
        const colonneStocks = Ext.getCmp('colonne_stocks_detail');
        if (colonneStocks && colonneStocks.getEl()) {
            colonneStocks.getEl().frame('#b8860b', 1, {duration: 700});
        }
        Ext.getCmp('lg_CODE_GESTION_ID').setValue(rec.lg_CODE_GESTION_ID);
        Ext.getCmp('int_STOCK_REAPROVISONEMENT').setValue(rec.int_STOCK_REAPROVISONEMENT);
        Ext.getCmp('int_QTE_REAPPROVISIONNEMENT').setValue(rec.int_QTE_REAPPROVISIONNEMENT);
        Ext.getCmp('str_CODE_REMISE').setValue(rec.str_CODE_REMISE);
        Ext.getCmp('dt_LAST_INVENTAIRE').setValue(rec.dt_LAST_INVENTAIRE);
        Ext.getCmp('dt_LAST_ENTREE').setValue(rec.dt_LAST_ENTREE);
        Ext.getCmp('dt_DATE_LIVRAISON').setValue(rec.dt_DATE_LIVRAISON);
        Ext.getCmp('dt_LAST_VENTE').setValue(this.texteDerniereVente(rec.dt_LAST_VENTE));
        this.afficherPeremptionProche(rec.dt_PEREMPTION_PROCHE, rec.lot_PEREMPTION_PROCHE, rec.qte_PEREMPTION_PROCHE);
        Ext.getCmp('str_CODE_TVA').setValue(rec.lg_CODE_TVA_ID);
        Ext.getCmp('int_T').setValue(rec.int_T);
        Ext.getCmp('int_TAUX_MARQUE').setValue(rec.int_TAUX_MARQUE);
        Ext.getCmp('int_PAF').setValue(formatMillier(rec.int_PAF));
        Ext.getCmp('int_PAT').setValue(rec.int_PAT);
        Ext.getCmp('int_PRICE').setValue(formatMillier(rec.int_PRICE));
        Ext.getCmp('str_CODE_GEO_ARTICLE').setValue(rec.str_CODE_GEO_ARTICLE);
        Ext.getCmp('int_Q1_SEUIL_REAPPRO').setValue(rec.int_Q1_SEUIL_REAPPRO);
        Ext.getCmp('int_Q2_QTE_REAPPRO').setValue(rec.int_Q2_QTE_REAPPRO);
        Ext.getCmp('lg_FAMILLEARTICLE_ID').setValue(rec.lg_FAMILLEARTICLE_ID);
        Ext.getCmp('lg_ZONE_GEO_ID').setValue(rec.lg_ZONE_GEO_ID);
        Ext.getCmp('str_DESCRIPTION').setValue(rec.str_DESCRIPTION);
        Ext.getCmp('int_CIP').setValue(rec.int_CIP);
        Ext.getCmp('int_QTEDETAIL').setValue(rec.int_NUMBERDETAIL);
        Ext.getCmp('int_EAN13').setValue(rec.int_EAN13);
        if (rec.lg_EMPLACEMENT_ID === "1") {
            Ext.getCmp('infoconsorecu').show();
            Ext.getCmp('infoventerealise').show();
        }
    }
});