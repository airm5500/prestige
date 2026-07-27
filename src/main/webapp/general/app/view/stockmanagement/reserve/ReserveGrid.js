/* global Ext, valheight */

// Grille reutilisable pour les 3 onglets de la gestion des reserves.
// gridmode : 'ALL' | 'REAPPRO' | 'REASSORT'
//   ALL          -> tous les articles, actions assort + reassort + historique
//   REAPPRO      -> rayon > reserve, action assort + historique
//   REASSORT     -> reserve > rayon, action reassort + historique
Ext.define('testextjs.view.stockmanagement.reserve.ReserveGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'reservegrid',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer',
        'testextjs.view.stockmanagement.reserve.action.add',
        'testextjs.view.stockmanagement.reserve.action.historique',
        'testextjs.view.stockmanagement.reserve.action.reappro',
        'testextjs.view.stockmanagement.reserve.action.suggestion',
        'testextjs.view.stockmanagement.reserve.action.historiqueGlobal',
        'testextjs.view.stockmanagement.reserve.action.inventaireSelection'
    ],
    config: {
        gridmode: 'ALL'
    },
    frame: true,
    initComponent: function () {
        var me = this;
        var mode = me.getGridmode();

        // Mapping onglet -> parametre serveur
        var typeParam = (mode === 'REAPPRO') ? 'REAPPRO'
                : (mode === 'REASSORT') ? 'REASSORT_RAYON'
                : 'ALL';

        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/reserve/articles',
                extraParams: {str_TYPE_TRANSACTION: typeParam},
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        // ---- Colonnes communes (identiques a la vue d'origine)
        var columns = [
            {header: 'lg_FAMILLE_ID', dataIndex: 'lg_FAMILLE_ID', hidden: true, flex: 1},
            {header: 'CIP', dataIndex: 'int_CIP', flex: 1, minWidth: 80},
            {header: 'Designation', dataIndex: 'str_NAME', flex: 3, minWidth: 220},
            {header: 'Emplacement', dataIndex: 'lg_ZONE_GEO_ID', flex: 1, minWidth: 200},
            {
                header: 'Stock Rayon', dataIndex: 'int_STOCK_RAYON', align: 'center', flex: 1, minWidth: 100,
                renderer: function (v, m, r) {
                    var seuil = r.get('int_SEUIL_RESERVE');
                    if (seuil > 0 && v < seuil) {
                        m.style = 'color:red; font-weight:bold; background-color:#F5BCA9;';
                    }
                    return v;
                }
            },
            {header: 'Stock Reserve', dataIndex: 'int_STOCK_RESERVE', align: 'center', flex: 1, minWidth: 110},
            {header: 'Seuil Reserve (maxi rayon)', dataIndex: 'int_SEUIL_RESERVE', align: 'center', flex: 1.4, minWidth: 210},
            {
                header: 'Seuil Mini Rayon', dataIndex: 'int_SEUIL_MINI_RAYON', align: 'center', flex: 1, minWidth: 130,
                hidden: mode !== 'REASSORT',
                renderer: function (v) {
                    return (v === null || v === undefined || v === '') ? '-' : v;
                }
            },
            {
                header: 'Quantité Suggérée', dataIndex: 'int_QTE_SUGGEREE', align: 'center', flex: 1, minWidth: 150,
                renderer: function (v, m, r) {
                    // Onglet REASSORT : hover pedagogique, y compris quand la cellule est vide
                    if (mode === 'REASSORT') {
                        var sr = r.get('int_STOCK_RAYON');
                        var seuil = r.get('int_SEUIL_RESERVE');
                        var resv = r.get('int_STOCK_RESERVE');
                        if (v > 0) {
                            m.style = 'color:#6600cc; font-weight:bold;';
                            var manque = Math.max(0, seuil - sr);
                            var qtip = "<div style='text-align:left; line-height:1.7; padding:2px'>"
                                    + "<div style='font-weight:bold; color:#6600cc; margin-bottom:4px'>Envoyer " + v + " de la réserve vers le rayon</div>"
                                    + "<div>1) Il manque <b>" + manque + "</b> en rayon <span style='color:#888'>(seuil " + seuil + " − rayon " + sr + ")</span></div>"
                                    + "<div>2) Disponible en réserve : <b>" + resv + "</b></div>"
                                    + "<div style='margin-top:4px'>➜ On envoie le plus petit des deux : <b>" + v + "</b></div>"
                                    + "</div>";
                            m.tdAttr = 'data-qtip="' + qtip + '"';
                            return v;
                        }
                        // Cellule vide : expliquer pourquoi aucune quantite n'est suggeree
                        var raison;
                        if (resv <= 0) {
                            raison = "La réserve est vide : il n'y a rien à envoyer vers le rayon.";
                        } else if (!seuil || seuil <= 0) {
                            raison = "Le seuil réserve n'est pas défini pour cet article.<br/>Renseignez-le pour obtenir une suggestion.";
                        } else {
                            raison = "Le stock rayon (" + sr + ") a déjà atteint le seuil réserve (" + seuil + ").<br/>Aucun réassort n'est nécessaire.";
                        }
                        var qtipEmpty = "<div style='text-align:left; line-height:1.7; padding:2px'>"
                                + "<div style='font-weight:bold; color:#888; margin-bottom:4px'>Aucune quantité suggérée</div>"
                                + "<div>" + raison + "</div>"
                                + "</div>";
                        m.tdAttr = 'data-qtip="' + qtipEmpty + '"';
                        return '';
                    }
                    // Autres onglets : comportement d'origine
                    if (v > 0) {
                        m.style = 'color:#6600cc; font-weight:bold;';
                        return v;
                    }
                    return '';
                }
            }
        ];

        // ---- Colonnes d'action selon le mode
        var colAssort = {
            xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/fleche_orange_droite.svg',
                    tooltip: '<div style=\'white-space:normal;width:230px;line-height:1.5\'><b>Creer une suggestion de reappro</b><br>Le stock part <b>du rayon</b> et arrive <b>en reserve</b>.<br>Rien ne bouge tant que la suggestion n\'est pas traitee.</div>',
                    scope: me,
                    handler: me.onAssortClick,
                    getClass: function (value, metadata, record) {
                        return record.get('int_STOCK_RAYON') > 0 ? 'x-display-hide' : 'x-hide-display';
                    }
                }]
        };
        var colReassort = {
            xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/fleche_verte_gauche.svg',
                    tooltip: '<div style=\'white-space:normal;width:230px;line-height:1.5\'><b>Creer une suggestion de reappro</b><br>Le stock part <b>de la reserve</b> et arrive <b>au rayon</b>.<br>Rien ne bouge tant que la suggestion n\'est pas traitee.</div>',
                    scope: me,
                    handler: me.onReassortClick,
                    getClass: function (value, metadata, record) {
                        return record.get('int_STOCK_RESERVE') > 0 ? 'x-display-hide' : 'x-hide-display';
                    }
                }]
        };
        var colHisto = {
            xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/historique_liste.svg',
                    tooltip: 'Historique des mouvements',
                    scope: me,
                    handler: me.onHistoriqueClick
                }]
        };

        if (mode === 'REAPPRO') {
            columns.push(colAssort, colHisto);
        } else if (mode === 'REASSORT') {
            columns.push(colReassort, colHisto);
        } else {
            columns.push(colAssort, colReassort, colHisto);
        }

        // Conserve pour l'export : c'est le meme parametre que celui envoye par la grille.
        me.typeParam = typeParam;

        // ---- Cases a cocher : selection conservee d'une page a l'autre.
        // La grille est paginee : si l'on se contentait de la selection ExtJS, tout cochage
        // serait perdu au changement de page. On memorise donc les identifiants coches, et
        // on re-coche les lignes correspondantes a chaque chargement.
        me.selectedIds = {};
        var selModel = Ext.create('Ext.selection.CheckboxModel', {
            checkOnly: true,
            mode: 'MULTI'
        });
        selModel.on('select', function (sm, rec) {
            me.selectedIds[rec.get('lg_FAMILLE_ID')] = rec.get('int_QTE_SUGGEREE') || 0;
            me.majCompteurSelection();
        });
        selModel.on('deselect', function (sm, rec) {
            delete me.selectedIds[rec.get('lg_FAMILLE_ID')];
            me.majCompteurSelection();
        });
        store.on('load', function () {
            selModel.suspendEvents();
            store.each(function (rec) {
                if (me.selectedIds.hasOwnProperty(rec.get('lg_FAMILLE_ID'))) {
                    // La quantite suggeree a pu changer depuis le cochage : on reprend la valeur du serveur.
                    me.selectedIds[rec.get('lg_FAMILLE_ID')] = rec.get('int_QTE_SUGGEREE') || 0;
                    selModel.select(rec, true, true);
                }
            });
            selModel.resumeEvents();
            me.majCompteurSelection();
        });

        // Explication au survol, en bleu et en gras. Style en ligne pour rester prioritaire sur l'infobulle.
        var tip = function (texte) {
            return '<span style="color:#0b57d0;font-weight:bold;">' + texte + '</span>';
        };

        // ---- Barre d'outils : recherche + boutons communs + boutons specifiques
        var tbar = [{
                xtype: 'textfield', itemId: 'rechFld', emptyText: 'Rech (code ou nom)', width: 180,
                listeners: {
                    // Entree : recherche immediate, quel que soit le nombre de caracteres.
                    specialkey: function (f, e) {
                        if (e.getKey() === e.ENTER) {
                            f.dernierTerme = (f.getValue() || '').trim();
                            me.onRechClick();
                        }
                    },
                    // Recherche automatique a partir de 3 caracteres. Le buffer attend une pause
                    // de frappe : taper un nom complet ne declenche qu'une requete, pas une par
                    // lettre. En dessous de 3 caracteres le terme est trop large pour cibler quoi
                    // que ce soit, on attend donc la touche Entree. Le champ vide relance la
                    // liste complete, sinon on resterait bloque sur le dernier resultat.
                    change: {
                        buffer: 400,
                        fn: function (f, v) {
                            var terme = (v || '').trim();
                            if (terme.length > 0 && terme.length < 3) {
                                return;
                            }
                            if (terme === f.dernierTerme) {
                                return;
                            }
                            f.dernierTerme = terme;
                            me.onRechClick();
                        }
                    }
                }
            }, {
                text: 'rechercher', scope: me, handler: me.onRechClick
            }, '-'];

        if (mode === 'REAPPRO') {
            tbar.push({
                text: 'Faire un reappro de la reserve (manuel)', iconCls: '', scope: me, handler: me.onFaireReappro,
                tooltip: tip('Vous choisissez vous-meme l\'article et la quantite.<br>'
                        + 'Le stock est retire DU RAYON &rarr; et ajoute EN RESERVE.')
            });
            tbar.push({
                text: 'Voir les suggestions de reappro de la reserve', cls: 'btn-reappro-orange',
                scope: me, handler: me.onSuggererReappro,
                tooltip: tip('Le systeme liste les articles dont le rayon depasse le seuil reserve<br>'
                        + 'et propose pour chacun la quantite a ranger EN RESERVE.<br>'
                        + 'Vous pouvez corriger chaque quantite avant de valider.')
            });
            tbar.push('-');
        } else if (mode === 'REASSORT') {
            tbar.push({
                text: 'Faire un reappro manuel du rayon', scope: me, handler: me.onFaireReassort,
                tooltip: tip('Vous choisissez vous-meme l\'article et la quantite.<br>'
                        + 'Le stock est retire DE LA RESERVE &rarr; et ajoute AU RAYON.')
            });
            tbar.push({
                text: 'Voir les suggestions de reappro du rayon', cls: 'btn-reassort-green',
                scope: me, handler: me.onSuggererReassort,
                tooltip: tip('Le systeme liste les articles dont le rayon est tombe au seuil mini<br>'
                        + 'et propose pour chacun la quantite a sortir DE LA RESERVE.<br>'
                        + 'La quantite proposee ne depasse jamais le stock reserve disponible.')
            });
            tbar.push('-');
        } else {
            // Onglet TOUT : les deux sens sont concernes, on propose donc les deux listes de
            // suggestions. Elles manquaient ici alors que l'onglet affiche les deux flèches.
            tbar.push({
                text: 'Suggestions de reappro de la reserve', cls: 'btn-reappro-orange',
                scope: me, handler: me.onSuggererReappro,
                tooltip: tip('Articles dont le rayon depasse le seuil reserve :<br>'
                        + 'le systeme propose la quantite a ranger EN RESERVE.')
            });
            tbar.push({
                text: 'Suggestions de reappro du rayon', cls: 'btn-reassort-green',
                scope: me, handler: me.onSuggererReassort,
                tooltip: tip('Articles dont le rayon est tombe au seuil mini :<br>'
                        + 'le systeme propose la quantite a sortir DE LA RESERVE.')
            });
            tbar.push('-');
        }

        // Boutons communs aux 3 onglets
        tbar.push({
            text: 'Suggestion sur tout le resultat', cls: 'btn-suggestions-violet',
            scope: me, handler: me.onSuggestionRecherche,
            tooltip: tip('Cree une suggestion portant sur TOUS les articles<br>'
                    + 'du resultat de recherche, et pas seulement sur la page affichee.')
        });
        tbar.push({
            text: 'Suggestion sur la selection', cls: 'btn-suggestions-violet',
            scope: me, handler: me.onSuggestionSelection,
            tooltip: tip('Cree une suggestion portant UNIQUEMENT sur les lignes cochees.<br>'
                    + 'Les lignes cochees sur les autres pages sont conservees.')
        });
        tbar.push({text: 'Tout decocher', scope: me, handler: me.onToutDecocher});
        tbar.push({xtype: 'tbtext', itemId: 'lblSelection', text: 'Coches : 0',
            style: 'font-weight:bold;color:#6a1b9a;'});

        // Seconde ligne : les actions sur la liste entiere. Sur un ecran etroit, une barre unique
        // repoussait ces boutons hors du champ visible et ils devenaient introuvables.
        var tbarActions = [
            {text: 'Creer un inventaire', scope: me, handler: me.onCreateInventaire},
            {text: 'Imprimer', scope: me, handler: me.onPrint},
            {text: 'Historiques', scope: me, handler: me.onHistoriquesGlobal},
            '-',
            {text: 'Exporter (CSV)', scope: me, handler: me.onExportCsv},
            {
                text: 'Exporter (Excel)', scope: me, handler: me.onExportExcel,
                tooltip: tip('Telecharge TOUTES les lignes de cet onglet au format Excel,<br>'
                        + 'en respectant la recherche en cours (et non la seule page affichee).')
            }
        ];

        Ext.apply(me, {
            store: store,
            columns: columns,
            selModel: selModel,
            dockedItems: [
                {xtype: 'toolbar', dock: 'top', items: tbar},
                {xtype: 'toolbar', dock: 'top', items: tbarActions},
                {xtype: 'pagingtoolbar', store: store, dock: 'bottom', displayInfo: true}
            ]
        });

        me.callParent();

    },

    loadStore: function () {
        this.getStore().load();
    },

    // Recharge le store en conservant le filtre type + la recherche
    reloadGrid: function () {
        this.getStore().load();
    },

    onRechClick: function () {
        var me = this;
        var val = me.down('#rechFld').getValue();
        me.getStore().getProxy().setExtraParam('search_value', val);
        me.getStore().loadPage(1);
    },

    onAssortClick: function (grid, rowIndex) {
        var me = this;
        var rec = me.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.reserve.action.add({
            odatasource: rec.data,
            parentview: me,
            mode: 'assort',
            titre: "Reappro de la reserve de l'article [" + rec.get('str_NAME') + "]"
        });
    },

    onReassortClick: function (grid, rowIndex) {
        var me = this;
        var rec = me.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.reserve.action.add({
            odatasource: rec.data,
            parentview: me,
            mode: 'reassort',
            titre: "Reassort du rayon de l'article [" + rec.get('str_NAME') + "]"
        });
    },

    onHistoriqueClick: function (grid, rowIndex) {
        var me = this;
        var rec = me.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.reserve.action.historique({
            odatasource: rec.data,
            titre: "Historique des mouvements [" + rec.get('str_NAME') + "]"
        });
    },

    // ---- Boutons specifiques REAPPRO ------------------------------------
    onFaireReappro: function () {
        new testextjs.view.stockmanagement.reserve.action.reappro({
            parentview: this,
            mode: 'assort',
            titre: 'Faire un reappro reserve'
        });
    },
    onSuggererReappro: function () {
        new testextjs.view.stockmanagement.reserve.action.suggestion({
            parentview: this,
            mode: 'reappro',
            titre: 'Suggerer un reappro reserve'
        });
    },

    // ---- Boutons specifiques REASSORT -----------------------------------
    onFaireReassort: function () {
        new testextjs.view.stockmanagement.reserve.action.reappro({
            parentview: this,
            mode: 'reassort',
            titre: 'Faire un reassort rayon'
        });
    },
    onSuggererReassort: function () {
        new testextjs.view.stockmanagement.reserve.action.suggestion({
            parentview: this,
            mode: 'reassort',
            titre: 'Suggerer un reassort rayon'
        });
    },

    // ---- Bouton ALL : tout reassortir selon suggestions -----------------
    onReassortBatchAll: function () {
        var me = this;
        var items = [];
        me.getStore().each(function (rec) {
            var qte = rec.get('int_QTE_SUGGEREE');
            if (qte > 0) {
                items.push({lg_FAMILLE_ID: rec.get('lg_FAMILLE_ID'), int_QTE: qte});
            }
        });
        if (items.length === 0) {
            Ext.MessageBox.alert('Message', 'Aucun article a reassortir selon les suggestions.');
            return;
        }
        Ext.MessageBox.confirm('Message',
                'Reassortir ' + items.length + ' article(s) selon les quantites suggerees ?',
                function (btn) {
                    if (btn === 'yes') {
                        var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Traitement en cours');
                        Ext.Ajax.request({
                            method: 'POST',
                            url: '../api/v1/reserve/reassort-batch',
                            jsonData: {items: items},
                            success: function (response) {
                                progress.hide();
                                var res = Ext.JSON.decode(response.responseText, true);
                                Ext.MessageBox.alert('Resultat',
                                        (res.traites || 0) + ' / ' + (res.total || 0) + ' reassort(s) effectue(s).');
                                me.reloadGrid();
                                if (typeof refreshNotificationBadge === 'function') {
                                    refreshNotificationBadge();
                                }
                            },
                            failure: function () {
                                progress.hide();
                                Ext.MessageBox.alert('Erreur', 'Echec du traitement par lot.');
                            }
                        });
                    }
                });
    },

    // ---- Bouton commun : creer un inventaire (selection des produits) ----
    // La fenetre de selection est partagee avec les autres onglets : elle vit dans sa propre
    // vue, et la recherche en cours dans l'onglet lui sert de point de depart.
    onCreateInventaire: function () {
        var me = this;
        var rech = me.down('#rechFld');
        Ext.create('testextjs.view.stockmanagement.reserve.action.inventaireSelection', {
            typetransaction: me.typeParam,
            recherche: (rech && rech.getValue()) ? rech.getValue() : ''
        });
    },

    // ---- Cases a cocher : compteur et remise a zero -------------------------
    majCompteurSelection: function () {
        var me = this, n = 0, k;
        for (k in me.selectedIds) {
            if (me.selectedIds.hasOwnProperty(k)) {
                n++;
            }
        }
        var lbl = me.down('#lblSelection');
        if (lbl) {
            lbl.setText('Coches : ' + n);
        }
    },

    onToutDecocher: function () {
        var me = this;
        me.selectedIds = {};
        me.getSelectionModel().deselectAll();
        me.majCompteurSelection();
    },

    // Fenetre de saisie du motif, commune aux deux boutons de creation de suggestion.
    // Le motif est obligatoire : tout mouvement de reserve doit pouvoir etre justifie.
    demanderMotif: function (titre, htmlInfo, onValider) {
        var me = this;
        // Sur l'onglet TOUT les deux sens coexistent : on demande lequel avant tout le reste,
        // car il conditionne la liste des motifs proposes.
        var choixSens = (me.typeParam === 'ALL');
        var categorie = (me.typeParam === 'REAPPRO') ? 'RESERVE' : 'RAYON';
        var storeMotifs = new Ext.data.Store({
            fields: ['id', 'libelle'],
            proxy: {
                type: 'ajax', url: '../api/v1/suggestion-reserve/motifs',
                extraParams: {categorie: categorie}, reader: {type: 'json'}
            }
        });
        storeMotifs.load();

        var win = Ext.create('Ext.window.Window', {
            title: titre,
            width: 520, modal: true, bodyPadding: 10, layout: 'anchor',
            defaults: {anchor: '100%', labelWidth: 90},
            items: [
                {xtype: 'component', html: htmlInfo},
                {
                    xtype: 'combo', itemId: 'cboSens', fieldLabel: 'Sens *', hidden: !choixSens,
                    editable: false, allowBlank: false, forceSelection: true, queryMode: 'local',
                    displayField: 'libelle', valueField: 'id',
                    value: categorie,
                    store: Ext.create('Ext.data.Store', {
                        fields: ['id', 'libelle'],
                        data: [
                            {id: 'RAYON', libelle: 'Reappro du rayon (la reserve remonte au rayon)'},
                            {id: 'RESERVE', libelle: 'Reappro de la reserve (le rayon descend en reserve)'}
                        ]
                    }),
                    listeners: {
                        change: function (cbo, v) {
                            // Les motifs sont propres a chaque sens : on recharge a chaque bascule.
                            categorie = v;
                            if (!win) {
                                return; // valeur initiale posee avant la creation de la fenetre
                            }
                            var cboMotif = win.down('#cboMotifRech');
                            if (cboMotif) {
                                cboMotif.clearValue();
                            }
                            storeMotifs.getProxy().setExtraParam('categorie', v);
                            storeMotifs.load();
                        }
                    }
                },
                {
                    xtype: 'combo', itemId: 'cboMotifRech', fieldLabel: 'Motif *',
                    editable: false, allowBlank: false, forceSelection: true, queryMode: 'local',
                    displayField: 'libelle', valueField: 'id',
                    emptyText: 'Motif (obligatoire)', store: storeMotifs
                },
                {xtype: 'textfield', itemId: 'txtComRech', fieldLabel: 'Commentaire',
                    emptyText: 'Facultatif'}
            ],
            buttons: [
                {
                    text: 'Creer la suggestion', cls: 'btn-suggestions-violet',
                    handler: function () {
                        var cbo = win.down('#cboMotifRech');
                        if (!cbo || !cbo.getValue()) {
                            cbo.markInvalid('Motif obligatoire');
                            Ext.MessageBox.alert('Motif obligatoire',
                                    'Indiquez le motif de cette suggestion avant de la creer.');
                            return;
                        }
                        var com = win.down('#txtComRech');
                        onValider(win, categorie, cbo.getValue(), com ? com.getValue() : null);
                    }
                },
                {text: 'Annuler', handler: function () {
                        win.close();
                    }}
            ]
        });
        win.show();
        return win;
    },

    // Bascule sur l'onglet SUGGESTIONS apres une creation reussie.
    allerAuxSuggestions: function (res) {
        var manager = Ext.getCmp('reservemanagerID');
        var onglet = manager ? manager.down('#ongletSuggestions') : null;
        if (manager && onglet) {
            manager.setActiveTab(onglet);
            onglet.reloadGrid();
        } else {
            Ext.MessageBox.alert('Suggestion creee', (res.lignes || 0) + ' article(s).');
        }
    },

    // ---- Bouton commun : suggestion sur les seules lignes cochees -----------
    onSuggestionSelection: function () {
        var me = this;
        var items = [], k, qte;
        for (k in me.selectedIds) {
            if (me.selectedIds.hasOwnProperty(k)) {
                qte = parseInt(me.selectedIds[k], 10);
                items.push({lg_FAMILLE_ID: k, int_QTE: (isNaN(qte) || qte < 0) ? 0 : qte});
            }
        }
        if (items.length === 0) {
            Ext.MessageBox.alert('Message',
                    'Cochez au moins une ligne pour creer une suggestion sur la selection.');
            return;
        }
        var info = '<div style="margin-bottom:8px;color:#0b57d0;font-weight:bold;">'
                + 'La suggestion portera sur les <b>' + items.length + '</b> ligne(s) cochee(s) '
                + 'uniquement, toutes pages confondues.</div>';
        me.demanderMotif('Creer une suggestion sur la selection', info,
                function (win, categorie, motifId, commentaire) {
                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation en cours');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/suggestion-reserve/creer',
                        jsonData: {
                            categorie: categorie,
                            motifId: motifId,
                            commentaire: commentaire,
                            items: items
                        },
                        success: function (response) {
                            progress.hide();
                            var res = Ext.JSON.decode(response.responseText, true) || {};
                            if (res.success === false) {
                                Ext.MessageBox.alert('Message', res.message || 'Creation impossible.');
                                return;
                            }
                            win.close();
                            me.onToutDecocher();
                            me.allerAuxSuggestions(res);
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Erreur', 'La creation a echoue.');
                        }
                    });
                });
    },

    // ---- Bouton commun : suggestion sur TOUT le resultat de recherche ------
    // Le serveur rejoue la recherche lui-meme : la suggestion couvre toutes les lignes
    // trouvees, et non la seule page affichee.
    onSuggestionRecherche: function () {
        var me = this;
        var rech = me.down('#rechFld');
        var search = (rech && rech.getValue()) ? rech.getValue() : '';
        var info = '<div style="margin-bottom:8px;color:#0b57d0;font-weight:bold;">'
                + 'La suggestion portera sur TOUS les articles du resultat de recherche'
                + (search ? ' correspondant a &laquo; ' + Ext.String.htmlEncode(search) + ' &raquo;' : '')
                + ', et non sur la seule page affichee.</div>';
        me.demanderMotif('Creer une suggestion sur tout le resultat', info,
                function (win, categorie, motifId, commentaire) {
                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation en cours');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/suggestion-reserve/creer-depuis-recherche',
                        jsonData: {
                            // Onglet TOUT : le sens choisi determine la liste a reprendre, sinon
                            // le serveur retomberait par defaut sur le reappro du rayon.
                            type: (me.typeParam === 'ALL')
                                    ? (categorie === 'RESERVE' ? 'REAPPRO' : 'REASSORT_RAYON')
                                    : me.typeParam,
                            search: search,
                            motifId: motifId,
                            commentaire: commentaire
                        },
                        success: function (response) {
                            progress.hide();
                            var res = Ext.JSON.decode(response.responseText, true) || {};
                            if (res.success === false) {
                                Ext.MessageBox.alert('Message', res.message || 'Creation impossible.');
                                return;
                            }
                            win.close();
                            me.allerAuxSuggestions(res);
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Erreur', 'La creation a echoue.');
                        }
                    });
                });
    },

    // ---- Bouton commun : impression PDF (modele JasperReports) -------------
    // Un modele .jrxml dedie par onglet, avec un en-tete qui nomme sans ambiguite
    // le sens du mouvement. La recherche en cours est transmise au rapport.
    onPrint: function () {
        var me = this;
        var mode = me.getGridmode();
        var pdfMode = (mode === 'REAPPRO') ? 'liste_reappro_reserve'
                : (mode === 'REASSORT') ? 'liste_reappro_rayon'
                : 'liste_tout';
        var rech = me.down('#rechFld');
        var search = (rech && rech.getValue()) ? rech.getValue() : '';
        var qs = 'mode=' + encodeURIComponent(pdfMode) + '&search=' + encodeURIComponent(search);
        window.open('../webservices/stockmanagement/reserve/ws_generate_pdf_reserve.jsp?' + qs, '_blank');
    },

    // ---- Bouton commun : historiques globaux ----------------------------
    onHistoriquesGlobal: function () {
        var me = this;
        var mode = me.getGridmode();
        // ALL -> tous ; REAPPRO -> ASSORT ; REASSORT -> REASSORT
        var typeFilter = (mode === 'REAPPRO') ? 'ASSORT'
                : (mode === 'REASSORT') ? 'REASSORT' : 'ALL';
        new testextjs.view.stockmanagement.reserve.action.historiqueGlobal({
            typeFilter: typeFilter,
            titre: 'Historique des mouvements'
        });
    },

    // ---- Bouton commun : export CSV (conserve depuis la vue d'origine) ---
    onExportCsv: function () {
        var me = this;
        var store = me.getStore();
        if (store.getCount() === 0) {
            Ext.MessageBox.alert('Message', 'Aucune donnee a exporter.');
            return;
        }
        var sep = ';';
        var headers = ['CIP', 'Designation', 'Emplacement', 'Stock Rayon', 'Stock Reserve', 'Seuil', 'Suggere'];
        var esc = function (val) {
            var s = (val === null || val === undefined) ? '' : String(val);
            if (s.indexOf(sep) !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
                s = '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };
        var lines = [headers.join(sep)];
        store.each(function (rec) {
            lines.push([
                esc(rec.get('int_CIP')), esc(rec.get('str_NAME')), esc(rec.get('lg_ZONE_GEO_ID')),
                esc(rec.get('int_STOCK_RAYON')), esc(rec.get('int_STOCK_RESERVE')),
                esc(rec.get('int_SEUIL_RESERVE')), esc(rec.get('int_QTE_SUGGEREE'))
            ].join(sep));
        });
        var csv = '﻿' + lines.join('\r\n');
        var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        var fname = 'reserves_' + me.getGridmode() + '_' + Ext.Date.format(new Date(), 'Ymd_His') + '.csv';
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, fname);
        } else {
            var url = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = fname;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
    },

    // ---- Bouton commun : export Excel (genere par le serveur) --------------
    // Contrairement a l'export CSV qui ne prend que la page affichee, celui-ci exporte TOUTES les lignes de
    // l'onglet : le serveur rejoue la meme requete que la grille, avec la recherche en cours.
    onExportExcel: function () {
        var me = this;
        var rech = me.down('#rechFld');
        var search = (rech && rech.getValue()) ? rech.getValue() : '';
        var url = '../api/v1/reserve/export/excel'
                + '?str_TYPE_TRANSACTION=' + encodeURIComponent(me.typeParam)
                + '&search_value=' + encodeURIComponent(search)
                + '&_dc=' + new Date().getTime();
        // Iframe cachee : le telechargement demarre sans quitter ni recharger l'ecran courant.
        var frame = document.getElementById('reserve-export-frame');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = 'reserve-export-frame';
            frame.style.display = 'none';
            document.body.appendChild(frame);
        }
        frame.src = url;
    }
});
