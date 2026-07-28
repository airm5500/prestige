/* global Ext */

// Fenetre de creation d'un inventaire reserve a partir d'une selection de produits.
//
// Extraite de l'onglet ou elle vivait pour etre ouverte depuis n'importe quel onglet de la
// gestion des reserves : la creation d'un inventaire ne depend pas de l'onglet d'ou l'on part.
//
// La selection est conservee d'une page a l'autre et d'une recherche a l'autre : on peut donc
// chercher un produit, le cocher, chercher le suivant, et creer un seul inventaire a la fin.
Ext.define('testextjs.view.stockmanagement.reserve.action.inventaireSelection', {
    extend: 'Ext.window.Window',
    xtype: 'reserveinventaireselection',
    requires: ['Ext.grid.*', 'Ext.data.*', 'Ext.selection.CheckboxModel'],
    config: {
        // Onglet d'origine : ALL, REAPPRO ou REASSORT_RAYON. La liste proposee suit.
        typetransaction: 'ALL',
        // Recherche initiale, typiquement celle en cours dans l'onglet appelant.
        recherche: '',
        // Source des produits. Par defaut la liste des articles en reserve ; les onglets
        // HISTORIQUE et SUGGESTIONS fournissent la leur pour que l'inventaire porte sur ce
        // qui est REELLEMENT affiche, filtres compris, et non sur toute la reserve.
        source: '',
        // Parametres propres a cette source (filtres de l'onglet appelant).
        sourceparams: null,
        // Titre repris dans la fenetre, pour rappeler d'ou vient la liste.
        soustitre: ''
    },

    initComponent: function () {
        var me = this;
        var typeParam = me.getTypetransaction() || 'ALL';
        var search = me.getRecherche() || '';
        var urlSource = me.getSource() || '../api/v1/reserve/articles';
        var paramsSource = me.getSourceparams();
        var sourceDediee = !!me.getSource();

        // Map des ids coches, conservee a travers les pages ET les recherches successives.
        var selectedIds = {};

        var selStore = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: urlSource,
                extraParams: sourceDediee
                        ? Ext.apply({}, paramsSource || {})
                        : {str_TYPE_TRANSACTION: typeParam, search_value: search},
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        var selModel = Ext.create('Ext.selection.CheckboxModel', {checkOnly: true});

        var prixRenderer = function (v) {
            return (v === null || v === undefined || v === '') ? '' : Ext.util.Format.number(v, '0,000');
        };

        var grid;
        var updateCounter = function () {
            var n = 0, k;
            for (k in selectedIds) {
                if (selectedIds.hasOwnProperty(k)) {
                    n++;
                }
            }
            var cmp = grid && grid.down('#selCount');
            if (cmp) {
                cmp.setText('Selectionnes : ' + n);
            }
        };

        // Re-coche les lignes de la page courante presentes dans selectedIds.
        var reapplySelection = function () {
            selModel.suspendEvents();
            selStore.each(function (rec) {
                if (selectedIds[rec.get('lg_FAMILLE_ID')]) {
                    selModel.select(rec, true, true);
                }
            });
            selModel.resumeEvents();
            updateCounter();
        };

        selModel.on('select', function (sm, rec) {
            selectedIds[rec.get('lg_FAMILLE_ID')] = true;
            updateCounter();
        });
        selModel.on('deselect', function (sm, rec) {
            delete selectedIds[rec.get('lg_FAMILLE_ID')];
            updateCounter();
        });
        selStore.on('load', function () {
            reapplySelection();
        });

        // Recherche par CIP ou par nom : le serveur rejoue la meme requete que la grille.
        // Les produits deja coches restent coches, la recherche ne fait que changer ce qu'on voit.
        var lancerRecherche = function () {
            var champ = grid.down('#invRech');
            search = (champ && champ.getValue()) ? champ.getValue() : '';
            selStore.getProxy().setExtraParam('search_value', search);
            selStore.loadPage(1);
        };

        var barreRecherche = {
            xtype: 'toolbar', dock: 'top',
            items: [
                {
                    xtype: 'textfield', itemId: 'invRech', width: 220,
                    emptyText: 'Rechercher (CIP ou nom du produit)',
                    value: search,
                    // La fenetre s'ouvre deja sur cette recherche : on la memorise pour que la
                    // recherche automatique ne la rejoue pas une seconde fois a l'affichage.
                    dernierTerme: search.trim(),
                    listeners: {
                        specialkey: function (f, e) {
                            if (e.getKey() === e.ENTER) {
                                f.dernierTerme = (f.getValue() || '').trim();
                                lancerRecherche();
                            }
                        },
                        // Recherche automatique a partir de 3 caracteres, apres une pause de
                        // frappe. Les produits deja coches ne sont pas perdus : la recherche ne
                        // change que ce qui est affiche.
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
                                lancerRecherche();
                            }
                        }
                    }
                },
                {text: 'Rechercher', handler: lancerRecherche},
                {
                    text: 'Effacer',
                    handler: function () {
                        var champ = grid.down('#invRech');
                        if (champ) {
                            champ.setValue('');
                        }
                        lancerRecherche();
                    }
                }
            ]
        };

        var barreSelection = {
            xtype: 'toolbar', dock: 'top',
            items: [
                {
                    text: 'Tout selectionner (toutes les pages)',
                    tooltip: 'Coche tous les articles du resultat de recherche en cours, '
                            + 'et pas seulement ceux de la page affichee.',
                    handler: function () {
                        var prog = Ext.MessageBox.wait('Chargement...', 'Selection de tous les articles');
                        Ext.Ajax.request({
                            url: urlSource,
                            method: 'GET',
                            params: sourceDediee
                                    ? Ext.apply({start: 0, limit: 0}, paramsSource || {})
                                    : {str_TYPE_TRANSACTION: typeParam, search_value: search, start: 0, limit: 0},
                            timeout: 600000,
                            success: function (response) {
                                prog.hide();
                                var res = Ext.JSON.decode(response.responseText, true);
                                var list = (res && res.results) ? res.results : [];
                                Ext.each(list, function (a) {
                                    if (a.lg_FAMILLE_ID) {
                                        selectedIds[a.lg_FAMILLE_ID] = true;
                                    }
                                });
                                reapplySelection();
                            },
                            failure: function () {
                                prog.hide();
                                Ext.MessageBox.alert('Erreur', 'Echec du chargement de la liste complete.');
                            }
                        });
                    }
                },
                {
                    text: 'Tout deselectionner',
                    handler: function () {
                        selectedIds = {};
                        selModel.deselectAll();
                        updateCounter();
                    }
                },
                '->',
                {xtype: 'tbtext', itemId: 'selCount', text: 'Selectionnes : 0',
                    style: 'font-weight:bold;color:#0b57d0;'}
            ]
        };

        grid = Ext.create('Ext.grid.Panel', {
            border: false,
            flex: 1,
            store: selStore,
            selModel: selModel,
            columns: [
                {header: 'CIP', dataIndex: 'int_CIP', flex: 1},
                {header: 'Designation', dataIndex: 'str_NAME', flex: 2},
                {header: 'Stock Reserve', dataIndex: 'int_STOCK_RESERVE', align: 'center', flex: 1},
                {header: 'Prix achat', dataIndex: 'int_PAF', align: 'right', flex: 1, renderer: prixRenderer},
                {header: 'Prix vente', dataIndex: 'int_PRICE', align: 'right', flex: 1, renderer: prixRenderer}
            ],
            dockedItems: [
                barreRecherche,
                barreSelection,
                Ext.create('Ext.toolbar.Paging', {store: selStore, dock: 'bottom', displayInfo: true})
            ],
            viewConfig: {
                emptyText: 'Aucun article ne correspond a cette recherche.',
                deferEmptyText: false
            }
        });

        var win = Ext.create('Ext.window.Window', {
            title: 'Creer un inventaire reserve'
                    + (me.getSoustitre() ? ' - ' + me.getSoustitre() : ''),
            modal: true,
            width: 880,
            height: 620,
            layout: {type: 'vbox', align: 'stretch'},
            constrainHeader: true,
            maximizable: true,
            bodyPadding: '8 8 0 8',
            items: [{
                    xtype: 'textarea',
                    itemId: 'commentFld',
                    fieldLabel: 'Commentaire *',
                    labelAlign: 'top',
                    height: 70,
                    allowBlank: false,
                    // Obligatoire : c'est ce commentaire qui dit POURQUOI cet inventaire a ete
                    // lance. Il est enregistre dans la description et reste la seule trace du
                    // motif une fois l'inventaire cloture.
                    emptyText: 'Motif de cet inventaire (obligatoire)'
                }, grid],
            buttons: [{
                    text: 'Creer l\'inventaire',
                    handler: function () {
                        var ids = [], k;
                        for (k in selectedIds) {
                            if (selectedIds.hasOwnProperty(k)) {
                                ids.push(k);
                            }
                        }
                        if (ids.length === 0) {
                            Ext.MessageBox.alert('Message', 'Veuillez selectionner au moins un produit.');
                            return;
                        }
                        var champCom = win.down('#commentFld');
                        var comment = (champCom && champCom.getValue()) ? champCom.getValue().trim() : '';
                        if (comment === '') {
                            if (champCom) {
                                champCom.markInvalid('Commentaire obligatoire');
                                champCom.focus();
                            }
                            Ext.MessageBox.alert('Commentaire obligatoire',
                                    'Indiquez le motif de cet inventaire avant de le creer.');
                            return;
                        }
                        // Recapitulatif : controle du nombre de produits avant confirmation.
                        Ext.MessageBox.confirm('Confirmation',
                                'Vous allez creer un inventaire contenant <b>' + ids.length
                                + '</b> produit(s) (toutes pages et recherches confondues).<br/>Confirmez-vous ?',
                                function (btn) {
                                    if (btn !== 'yes') {
                                        return;
                                    }
                                    var progress = Ext.MessageBox.wait('Veuillez patienter...',
                                            'Creation de l\'inventaire');
                                    Ext.Ajax.request({
                                        url: '../api/v1/reserve/create-inventaire-selection',
                                        method: 'POST',
                                        jsonData: {ids: ids, description: comment},
                                        timeout: 600000,
                                        success: function (response) {
                                            progress.hide();
                                            var res = Ext.JSON.decode(response.responseText, true) || {};
                                            // Un refus metier revient avec un code 200 : sans ce
                                            // controle, la fenetre se fermait en annoncant une
                                            // creation qui n'avait pas eu lieu.
                                            if (res.success === false) {
                                                Ext.MessageBox.alert('Creation impossible',
                                                        res.message || 'Creation impossible.');
                                                return;
                                            }
                                            win.close();
                                            Ext.MessageBox.alert('Inventaire',
                                                    'Inventaire cree.<br/>Produits en compte : <b>'
                                                    + (res.count || 0) + '</b>');
                                        },
                                        failure: function () {
                                            progress.hide();
                                            Ext.MessageBox.alert('Erreur',
                                                    "La creation de l'inventaire a echoue. "
                                                    + "Aucun inventaire partiel n'a ete cree.");
                                        }
                                    });
                                });
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

        win.show();
        // Le champ de recherche prend la main des l'ouverture : on vient chercher un produit,
        // la frappe doit partir directement dedans sans passer par la souris. Le delai laisse
        // la fenetre finir son rendu, sans quoi le focus se perdrait a l'affichage.
        Ext.defer(function () {
            var champ = grid.down('#invRech');
            if (champ && champ.inputEl && champ.inputEl.dom) {
                champ.inputEl.dom.focus();
                champ.inputEl.dom.select();
            } else if (champ) {
                champ.focus(true, 50);
            }
        }, 200);
        selStore.loadPage(1);

        me.callParent();
    }
});
