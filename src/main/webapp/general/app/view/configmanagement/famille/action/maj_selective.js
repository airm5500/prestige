var winMajSelectiveOuverte = null;
/* global Ext, testextjs */

/*
 * MAJ SELECTIVE : affecte UNE donnee (grossiste, famille, TVA, code remise, code tableau, laboratoire ou
 * gamme) a plusieurs produits d'un coup. Meme facon de travailler que MAJ SEUIL : on filtre, on coche a
 * travers les pages, puis on applique.
 *
 * Une seule donnee par operation, volontairement. Permettre d'en changer plusieurs a la fois rendrait la
 * confirmation illisible et, en cas d'erreur, on ne saurait plus ce qui a ete touche.
 *
 * Variables prefixees "sel" : maj_seuil.js et basculement.js posent deja les leurs dans l'espace global.
 */
var selOview, selMe;
var selSelected = [];   // ids coches (mode SELECTED)
var selUnchecked = [];  // ids decoches en mode ALL (exceptions)
var selSelectAll = false;

/* Les donnees modifiables. 'champ' est la valeur envoyee au serveur, 'saisie' l'identifiant du
 * composant qui porte la valeur a affecter : un seul est visible a la fois. */
var SEL_CHAMPS = [
    {champ: 'GROSSISTE', libelle: 'Grossiste', saisie: 'selValGrossiste'},
    {champ: 'FAMILLE', libelle: 'Famille', saisie: 'selValFamille'},
    {champ: 'TVA', libelle: 'Code TVA', saisie: 'selValTva'},
    {champ: 'CODE_REMISE', libelle: 'Code remise', saisie: 'selValRemise'},
    {champ: 'CODE_TABLEAU', libelle: 'Code tableau', saisie: 'selValTableau'},
    {champ: 'LABORATOIRE', libelle: 'Laboratoire', saisie: 'selValLabo'},
    {champ: 'GAMME', libelle: 'Gamme', saisie: 'selValGamme'},
    // Deux reglages OUI / NON. Ils passent par une liste et non par une case a cocher : une case
    // decochee ne se distingue pas d'une case a laquelle on n'a pas touche, et l'ecran refuse
    // justement d'appliquer une valeur vide.
    {champ: 'ORDONNANCIER', libelle: 'Soumis à ordonnance', saisie: 'selValOrdonnancier'},
    {champ: 'REMISE', libelle: 'Remise autorisée', saisie: 'selValRemise2'}
];

/** Valeurs d'un reglage oui / non. La valeur transmise est « 1 » ou « 0 », jamais une chaine vide. */
var SEL_OUI_NON = [{id: '1', libelle: 'Oui'}, {id: '0', libelle: 'Non'}];

Ext.define('testextjs.view.configmanagement.famille.action.maj_selective', {
    extend: 'Ext.window.Window',
    xtype: 'majselective',
    id: 'majSelectiveWinID',
    maximizable: true,
    requires: ['Ext.form.*', 'Ext.window.Window', 'Ext.ux.ProgressBarPager', 'Ext.grid.*'],
    config: {
        parentview: '',
        titre: ''
    },
    initComponent: function () {
        selSelected = [];
        selUnchecked = [];
        selSelectAll = false;
        selOview = this.getParentview();
        selMe = this;
        var itemsPerPage = 15;

        var listeSimple = function (url) {
            return Ext.create('Ext.data.Store', {
                fields: ['id', 'libelle'], autoLoad: true, pageSize: 9999,
                proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
            });
        };
        var rayonStore = listeSimple('../api/v1/common/rayons');
        var familleStore = listeSimple('../api/v1/common/famillearticles');
        // Le code tableau est un champ libre dans la fiche article : la liste vient donc des valeurs
        // reellement presentes, sinon le filtre proposerait des codes que personne n'utilise.
        var codeTableauStore = listeSimple('../api/v1/fichearticle/maj-selective/codes-tableau');
        var laboStore = listeSimple('../api/v1/common/laboratoireproduits');
        var gammeStore = listeSimple('../api/v1/common/gammeproduits');
        var tvaStore = Ext.create('Ext.data.Store', {
            fields: ['lg_CODE_TVA_ID', 'str_NAME'], autoLoad: true, pageSize: 9999,
            proxy: {type: 'ajax', url: '../api/v1/common/tvas',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}}
        });
        var grossisteStore = Ext.create('Ext.data.Store', {
            fields: ['lg_GROSSISTE_ID', 'str_LIBELLE'], autoLoad: true, pageSize: 9999,
            proxy: {type: 'ajax', url: '../api/v1/grossiste/all',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}}
        });
        // Memes valeurs que la fiche article, plus « (vide) » qui sert au filtre : une bonne partie du
        // fichier n'a pas de code remise, et ce sont justement ces articles que l'on veut retrouver.
        var remiseFiltreStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            data: [{id: 'VIDE', libelle: '(vide)'}, {id: '0', libelle: '0'}, {id: '1', libelle: '1'},
                {id: '2', libelle: '2'}, {id: '3', libelle: '3'}, {id: '4', libelle: '4'}]
        });
        var remiseValeurStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            data: [{id: '0', libelle: '0'}, {id: '1', libelle: '1'}, {id: '2', libelle: '2'},
                {id: '3', libelle: '3'}, {id: '4', libelle: '4'}]
        });

        var store = Ext.create('Ext.data.Store', {
            fields: ['lg_FAMILLE_ID', 'int_CIP', 'str_NAME', 'emplacement', 'famille', 'tva', 'codeRemise',
                'codeTableau', 'grossiste', 'laboratoire', 'gamme',
                {name: 'isChecked', type: 'boolean', defaultValue: false}],
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/fichearticle/maj-selective/list',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                load: function (st) {
                    // La selection survit au changement de page : on la reapplique a chaque chargement.
                    st.each(function (r) {
                        var id = r.get('lg_FAMILLE_ID');
                        r.set('isChecked', selSelectAll ? (selUnchecked.indexOf(id) === -1)
                                : (selSelected.indexOf(id) !== -1));
                    });
                    st.commitChanges();
                }
            }
        });

        var grid = {
            xtype: 'gridpanel',
            id: 'majSelectiveGridID',
            flex: 1,
            store: store,
            columns: [
                {header: 'ID', dataIndex: 'lg_FAMILLE_ID', flex: 1, hidden: true},
                {header: 'CIP', dataIndex: 'int_CIP', flex: 0.8},
                {header: 'LIBELLE', dataIndex: 'str_NAME', flex: 2.5},
                {header: 'Emplacement', dataIndex: 'emplacement', flex: 1},
                {header: 'Famille', dataIndex: 'famille', flex: 1.2},
                {header: 'TVA', dataIndex: 'tva', flex: 0.6},
                {header: 'Remise', dataIndex: 'codeRemise', flex: 0.6, align: 'center'},
                {header: 'Tableau', dataIndex: 'codeTableau', flex: 0.6, align: 'center'},
                {header: 'Grossiste', dataIndex: 'grossiste', flex: 1.2},
                {header: 'Laboratoire', dataIndex: 'laboratoire', flex: 1.2},
                {header: 'Gamme', dataIndex: 'gamme', flex: 1},
                {
                    xtype: 'checkcolumn', text: '&#10003;', dataIndex: 'isChecked', flex: 0.4,
                    menuDisabled: true, sortable: false,
                    listeners: {checkChange: this.onSelCheckChange}
                }
            ],
            /* Huit filtres, deux boutons et une case : entasses sur une ligne, les libelles se coupent et la
             * case « Tous Sélectionner » devient une case anonyme. Trois lignes, chacune lisible. */
            dockedItems: [
                {
                    xtype: 'toolbar', dock: 'top',
                    items: [
                        {
                            xtype: 'textfield', id: 'selRech', emptyText: 'Recherche (CIP, libellé)', flex: 1,
                            listeners: {
                                render: function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) { selMe.onSelRech(); }
                                    });
                                }
                            }
                        },
                        {
                            xtype: 'combobox', id: 'selZone', store: rayonStore, valueField: 'id',
                            displayField: 'libelle', fieldLabel: 'Emplacement', labelWidth: 90, flex: 1.4,
                            typeAhead: true, queryMode: 'local', emptyText: 'Tous les emplacements...',
                            listeners: {select: function () { selMe.onSelRech(); }}
                        },
                        {
                            xtype: 'combobox', id: 'selFam', store: familleStore, valueField: 'id',
                            displayField: 'libelle', fieldLabel: 'Famille', labelWidth: 60, flex: 1.4,
                            typeAhead: true, queryMode: 'local', emptyText: 'Toutes les familles...',
                            listeners: {select: function () { selMe.onSelRech(); }}
                        }
                    ]
                },
                {
                    xtype: 'toolbar', dock: 'top',
                    items: [
                        {
                            xtype: 'combobox', id: 'selTableau', store: codeTableauStore, valueField: 'id',
                            displayField: 'libelle', fieldLabel: 'Code tableau', labelWidth: 90, flex: 1,
                            typeAhead: true, queryMode: 'local', emptyText: 'Tous...',
                            listeners: {select: function () { selMe.onSelRech(); }}
                        },
                        {
                            xtype: 'combobox', id: 'selTva', store: tvaStore, valueField: 'lg_CODE_TVA_ID',
                            displayField: 'str_NAME', fieldLabel: 'TVA', labelWidth: 40, flex: 0.8,
                            typeAhead: true, queryMode: 'local', emptyText: 'Toutes...',
                            listeners: {select: function () { selMe.onSelRech(); }}
                        },
                        {
                            xtype: 'combobox', id: 'selRemise', store: remiseFiltreStore, valueField: 'id',
                            displayField: 'libelle', fieldLabel: 'Code remise', labelWidth: 85, flex: 0.9,
                            typeAhead: true, queryMode: 'local', emptyText: 'Tous...',
                            listeners: {select: function () { selMe.onSelRech(); }}
                        }
                    ]
                },
                {
                    xtype: 'toolbar', dock: 'top',
                    items: [
                        {
                            xtype: 'combobox', id: 'selLabo', store: laboStore, valueField: 'id',
                            displayField: 'libelle', fieldLabel: 'Laboratoire', labelWidth: 80, flex: 1.3,
                            typeAhead: true, queryMode: 'local', emptyText: 'Tous les laboratoires...',
                            listeners: {select: function () { selMe.onSelRech(); }}
                        },
                        {
                            xtype: 'combobox', id: 'selGamme', store: gammeStore, valueField: 'id',
                            displayField: 'libelle', fieldLabel: 'Gamme', labelWidth: 55, flex: 1.1,
                            typeAhead: true, queryMode: 'local', emptyText: 'Toutes les gammes...',
                            listeners: {select: function () { selMe.onSelRech(); }}
                        },
                        {
                            text: 'effacer les filtres', tooltip: 'Effacer tous les filtres',
                            iconCls: 'cancelicon',
                            handler: function () { selMe.onSelEffacerFiltres(); }
                        },
                        {text: 'rechercher', iconCls: 'searchicon', scope: this, handler: this.onSelRech},
                        '->',
                        {
                            xtype: 'checkbox', id: 'selAll', boxLabel: 'Tous Sélectionner (tout le filtre)',
                            width: 230, margin: '0 4 0 8',
                            listeners: {
                                change: function (cb, val) {
                                    /* Porte sur TOUT le filtre, pas sur la page affichee : on ne retient donc
                                     * pas une liste d'ids mais l'intention, plus les exceptions decochees. */
                                    selSelectAll = val;
                                    selUnchecked = [];
                                    selSelected = [];
                                    var st = Ext.getCmp('majSelectiveGridID').getStore();
                                    st.each(function (r) { r.set('isChecked', val); });
                                    st.commitChanges();
                                    selMe.majCompteurSelection();
                                }
                            }
                        }
                    ]
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar', pageSize: itemsPerPage, store: store, displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(),
                listeners: {
                    beforechange: function () { selMe.applyFilterParams(store); }
                }
            }
        };

        // Assez large pour que le libelle choisi tienne en entier : c'est la seule relecture possible
        // avant de lancer une modification qui touche des centaines d'articles.
        var valeurCommune = {width: 430, labelWidth: 110, fieldLabel: 'Nouvelle valeur', hidden: true,
            fieldStyle: 'background-color:#FFA500;color:#000;font-weight:bold;'};
        var form = new Ext.form.Panel({
            bodyPadding: 10,
            layout: {type: 'vbox', align: 'stretch'},
            items: [
                {
                    xtype: 'container', layout: 'hbox', margin: '0 0 8 0',
                    items: [
                        {
                            xtype: 'combobox', id: 'selChamp', fieldLabel: 'Donnée à mettre à jour',
                            labelWidth: 150, width: 380, valueField: 'champ', displayField: 'libelle',
                            queryMode: 'local', editable: false, emptyText: 'Choisir la donnée...',
                            store: Ext.create('Ext.data.Store', {fields: ['champ', 'libelle'], data: SEL_CHAMPS}),
                            listeners: {select: function (cmp) { selMe.onSelChampChange(cmp.getValue()); }}
                        },
                        {xtype: 'splitter'},
                        Ext.apply({xtype: 'combobox', id: 'selValGrossiste', store: grossisteStore,
                            valueField: 'lg_GROSSISTE_ID', displayField: 'str_LIBELLE', typeAhead: true,
                            queryMode: 'local', emptyText: 'Choisir un grossiste...'}, valeurCommune),
                        Ext.apply({xtype: 'combobox', id: 'selValFamille', store: familleStore,
                            valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'local',
                            emptyText: 'Choisir une famille...'}, valeurCommune),
                        Ext.apply({xtype: 'combobox', id: 'selValTva', store: tvaStore,
                            valueField: 'lg_CODE_TVA_ID', displayField: 'str_NAME', typeAhead: true,
                            queryMode: 'local', emptyText: 'Choisir un code TVA...'}, valeurCommune),
                        Ext.apply({xtype: 'combobox', id: 'selValRemise', store: remiseValeurStore,
                            valueField: 'id', displayField: 'libelle', queryMode: 'local', editable: false,
                            emptyText: 'Choisir un code remise...'}, valeurCommune),
                        // Editable : le code tableau est libre, on doit pouvoir en saisir un qui
                        // n'existe encore nulle part.
                        Ext.apply({xtype: 'combobox', id: 'selValTableau', store: codeTableauStore,
                            valueField: 'id', displayField: 'libelle', queryMode: 'local', editable: true,
                            emptyText: 'Saisir ou choisir un code tableau...'}, valeurCommune),
                        Ext.apply({xtype: 'combobox', id: 'selValLabo', store: laboStore,
                            valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'local',
                            emptyText: 'Choisir un laboratoire...'}, valeurCommune),
                        Ext.apply({xtype: 'combobox', id: 'selValGamme', store: gammeStore,
                            valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'local',
                            emptyText: 'Choisir une gamme...'}, valeurCommune),
                        Ext.apply({xtype: 'combobox', id: 'selValOrdonnancier',
                            store: Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], data: SEL_OUI_NON}),
                            valueField: 'id', displayField: 'libelle', queryMode: 'local', editable: false,
                            emptyText: 'Soumis à ordonnance ?'}, valeurCommune),
                        Ext.apply({xtype: 'combobox', id: 'selValRemise2',
                            store: Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], data: SEL_OUI_NON}),
                            valueField: 'id', displayField: 'libelle', queryMode: 'local', editable: false,
                            emptyText: 'Remise autorisée ?'}, valeurCommune),
                        {xtype: 'splitter'},
                        {xtype: 'displayfield', id: 'selCompteur', width: 220, value: ''}
                    ]
                },
                grid
            ]
        });

        // Une seule fenetre a la fois : un nouveau clic remplace la precedente.
        if (winMajSelectiveOuverte && !winMajSelectiveOuverte.isDestroyed) {
            winMajSelectiveOuverte.destroy();
        }
        var win = winMajSelectiveOuverte = new Ext.window.Window({
            autoShow: true, title: this.getTitre() || 'MAJ SÉLECTIVE',
            maximizable: true, width: '90%', height: 640, minWidth: 700, minHeight: 320,
            layout: 'fit', plain: true, modal: true, items: form,
            buttons: [
                {text: 'Appliquer', scope: this, handler: this.onSelApply},
                {text: 'Fermer', handler: function () { win.close(); }}
            ]
        });

        this.callParent();
        this.applyFilterParams(store);
        store.loadPage(1);
        this.majCompteurSelection();
    },

    /** N'affiche que le champ de saisie correspondant a la donnee choisie, et vide les autres. */
    onSelChampChange: function (champ) {
        Ext.Array.each(SEL_CHAMPS, function (c) {
            var cmp = Ext.getCmp(c.saisie);
            if (!cmp) { return; }
            if (c.champ === champ) {
                cmp.show();
            } else {
                cmp.setValue(null);
                cmp.hide();
            }
        });
    },

    /** Renseigne les parametres du proxy a partir des filtres courants. */
    applyFilterParams: function (store) {
        var v = function (id) {
            var c = Ext.getCmp(id);
            return (c && c.getValue()) || '';
        };
        var proxy = store.getProxy();
        proxy.setExtraParam('search', v('selRech'));
        proxy.setExtraParam('zoneGeoId', v('selZone'));
        proxy.setExtraParam('codeFamille', v('selFam'));
        proxy.setExtraParam('codeTableau', v('selTableau'));
        proxy.setExtraParam('codeTvaId', v('selTva'));
        proxy.setExtraParam('codeRemise', v('selRemise'));
        proxy.setExtraParam('laboratoireId', v('selLabo'));
        proxy.setExtraParam('gammeId', v('selGamme'));
    },

    /** Vrai des qu'un filtre est pose : le mode « tout cocher » l'exige, pour ne pas viser tout le fichier. */
    filtreRenseigne: function () {
        var ids = ['selRech', 'selZone', 'selFam', 'selTableau', 'selTva', 'selRemise', 'selLabo', 'selGamme'];
        return Ext.Array.some(ids, function (id) {
            var c = Ext.getCmp(id);
            var val = c && c.getValue();
            return val !== null && val !== undefined && val !== '' && val !== 'ALL';
        });
    },

    onSelEffacerFiltres: function () {
        Ext.Array.each(['selRech', 'selZone', 'selFam', 'selTableau', 'selTva', 'selRemise', 'selLabo', 'selGamme'],
                function (id) {
            var c = Ext.getCmp(id);
            if (c) { c.setValue(null); }
        });
        this.onSelRech();
    },

    onSelRech: function () {
        var st = Ext.getCmp('majSelectiveGridID').getStore();
        selMe.applyFilterParams(st);
        st.loadPage(1);
    },

    onSelCheckChange: function (column, rowIndex, checked) {
        var rec = Ext.getCmp('majSelectiveGridID').getStore().getAt(rowIndex);
        if (!rec) { return; }
        var id = rec.get('lg_FAMILLE_ID');
        var retirer = function (arr, v) {
            var i = arr.indexOf(v);
            if (i > -1) { arr.splice(i, 1); }
        };
        if (selSelectAll) {
            // en mode ALL on ne retient que les exceptions
            if (checked) { retirer(selUnchecked, id); } else if (selUnchecked.indexOf(id) === -1) {
                selUnchecked.push(id);
            }
        } else {
            if (checked) {
                if (selSelected.indexOf(id) === -1) { selSelected.push(id); }
            } else {
                retirer(selSelected, id);
            }
        }
        Ext.getCmp('majSelectiveGridID').getStore().commitChanges();
        selMe.majCompteurSelection();
    },

    /** Rappelle ce qui est retenu : en mode « tout », le nombre exact n'est connu que du serveur. */
    majCompteurSelection: function () {
        var champ = Ext.getCmp('selCompteur');
        if (!champ) { return; }
        if (selSelectAll) {
            champ.setValue('<b>Tout le filtre</b>'
                    + (selUnchecked.length ? ' moins ' + selUnchecked.length + ' produit(s)' : ''));
        } else {
            champ.setValue('<b>' + selSelected.length + '</b> produit(s) coché(s)');
        }
    },

    onSelApply: function () {
        var champCmp = Ext.getCmp('selChamp');
        var champ = champCmp && champCmp.getValue();
        if (!champ) {
            Ext.MessageBox.show({title: 'Donnée requise', width: 420,
                msg: 'Veuillez choisir la <b>donnée</b> à mettre à jour.',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function () { champCmp.focus(true, 100); }});
            return;
        }
        var definition = Ext.Array.findBy(SEL_CHAMPS, function (c) { return c.champ === champ; });
        var saisie = Ext.getCmp(definition.saisie);
        var valeur = saisie && saisie.getValue();
        // Le code remise « 0 » est une valeur legitime : ne pas la confondre avec une absence de saisie.
        if (valeur === null || valeur === undefined || valeur === '') {
            Ext.MessageBox.show({title: 'Valeur requise', width: 420,
                msg: 'Veuillez indiquer la nouvelle valeur pour <b>' + definition.libelle + '</b>.',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function () { saisie.focus(true, 100); }});
            return;
        }
        var mode = selSelectAll ? 'ALL' : 'SELECTED';
        if (mode === 'ALL' && !this.filtreRenseigne()) {
            Ext.MessageBox.show({title: 'Filtre requis', width: 460,
                msg: 'En mode « Tous Sélectionner », veuillez d\'abord poser au moins un filtre '
                        + '(emplacement, famille, code tableau, TVA, code remise, laboratoire, gamme '
                        + 'ou recherche).',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
            return;
        }
        if (mode === 'SELECTED' && selSelected.length === 0) {
            Ext.MessageBox.show({title: 'Sélection requise', width: 420,
                msg: 'Veuillez cocher au moins un produit (ou utiliser « Tous Sélectionner »).',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
            return;
        }
        var v = function (id) {
            var c = Ext.getCmp(id);
            return (c && c.getValue()) || '';
        };
        // On affiche le libelle choisi, pas l'identifiant technique : c'est ce que l'utilisateur reconnait.
        var libelleValeur = saisie.getRawValue ? saisie.getRawValue() : valeur;
        var portee = (mode === 'ALL')
                ? 'tous les produits du filtre'
                        + (selUnchecked.length ? ' sauf les ' + selUnchecked.length + ' décoché(s)' : '')
                : selSelected.length + ' produit(s) coché(s)';
        Ext.MessageBox.confirm('MAJ SÉLECTIVE',
                'Affecter <b>' + definition.libelle + ' = ' + Ext.String.htmlEncode(libelleValeur) + '</b>'
                + ' à ' + portee + ' ?',
                function (btn) {
                    if (btn !== 'yes') { return; }
                    var progress = Ext.MessageBox.wait('Mise à jour en cours . . .', 'Veuillez patienter');
                    Ext.Ajax.request({
                        url: '../api/v1/fichearticle/maj-selective/apply',
                        method: 'POST',
                        timeout: 1800000,
                        headers: {'Content-Type': 'application/json'},
                        jsonData: {
                            mode: mode, search: v('selRech'), zoneGeoId: v('selZone'), codeFamille: v('selFam'),
                            codeTableau: v('selTableau'), codeTvaId: v('selTva'), codeRemise: v('selRemise'),
                            laboratoireId: v('selLabo'), gammeId: v('selGamme'),
                            ids: selSelected, uncheckedIds: selUnchecked,
                            champ: champ, valeur: String(valeur)
                        },
                        success: function (resp) {
                            progress.hide();
                            var r = Ext.JSON.decode(resp.responseText, true) || {};
                            Ext.MessageBox.show({title: 'MAJ SÉLECTIVE', width: 480,
                                msg: r.success
                                        ? ('Mise à jour effectuée pour <b>' + (r.count || 0) + '</b> produit(s).')
                                        : (r.message || 'La mise à jour a échoué.'),
                                buttons: Ext.MessageBox.OK,
                                icon: r.success ? Ext.MessageBox.INFO : Ext.MessageBox.ERROR});
                            selSelected = []; selUnchecked = []; selSelectAll = false;
                            var allCb = Ext.getCmp('selAll');
                            if (allCb) { allCb.setValue(false); }
                            selMe.majCompteurSelection();
                            Ext.getCmp('majSelectiveGridID').getStore().reload();
                        },
                        failure: function (resp) {
                            progress.hide();
                            Ext.MessageBox.show({title: 'Erreur', width: 460,
                                msg: 'Échec. Code HTTP : ' + resp.status,
                                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
                        }
                    });
                });
    }
});
