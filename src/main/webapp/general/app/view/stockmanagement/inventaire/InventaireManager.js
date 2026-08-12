/* global Ext */

var url_services_data_inventaire = '../api/v1/inventaire/liste';
var url_services_transaction_inventaire = '../webservices/stockmanagement/inventaire/ws_transactions.jsp?mode=';
var Me;
var url_services_pdf_fiche_inventaire = '../webservices/stockmanagement/inventaire/ws_generate_pdf.jsp';
var url_services_rest_inventaire = '../api/v1/inventaire';

Ext.define('testextjs.view.stockmanagement.inventaire.InventaireManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'inventaire',
    id: 'inventaireID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des inventaires',
    plain: true,
    maximizable: true,
    closable: false,
    frame: true,
    initComponent: function() {

        Me = this;
        var itemsPerPage = 20;

        var store = new Ext.data.Store({
            model: 'testextjs.model.Inventaire',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_inventaire,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE', 'str_STATUT_TRANSACTION'],
            data: [{str_TYPE: 'En cours', str_STATUT_TRANSACTION: 'enable'}, {str_TYPE: 'Cloture', str_STATUT_TRANSACTION: 'is_Closed'}]
        });

        var store_zone = new Ext.data.Store({
            fields: ['str_ZONE', 'str_LIBELLE'],
            data: [
                {str_ZONE: 'ALL', str_LIBELLE: 'Toutes les zones'},
                {str_ZONE: 'rayon', str_LIBELLE: 'Rayon'},
                {str_ZONE: 'reserve', str_LIBELLE: 'Reserve'}
            ]
        });


       


        Ext.apply(this, {
            width: '98%',
            height: 580,
          
            store: store,
            id: 'GridInventaireID',
            columns: [{
                    /* Coche de selection pour la suppression multiple. Une ligne cloturee n'est
                     * pas cochable : la supprimer effacerait la trace d'un stock deja applique. */
                    xtype: 'checkcolumn',
                    dataIndex: 'bl_A_SUPPRIMER',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    renderer: function (value, meta, record) {
                        if (record.get('etat') === 'is_Closed') {
                            meta.tdAttr = 'data-qtip="Inventaire cloture : suppression impossible."';
                            return '';
                        }
                        /* rendu standard de la case a cocher ; l'appeler explicitement est
                         * necessaire puisqu'on remplace le renderer de la colonne */
                        return Ext.grid.column.CheckColumn.prototype.renderer.call(this, value, meta);
                    },
                    listeners: {
                        beforecheckchange: function (col, rowIndex, checked) {
                            var rec = Me.getStore().getAt(rowIndex);
                            /* garde-fou : la case des lignes cloturees n'est pas affichee, mais
                             * un clic sur la cellule ne doit rien cocher pour autant */
                            return !(rec && rec.get('etat') === 'is_Closed');
                        },
                        checkchange: function (col, rowIndex) {
                            /* la coche est un etat d'ecran, pas une modification a enregistrer :
                             * on la valide tout de suite pour ne pas marquer la ligne modifiee */
                            var rec = Me.getStore().getAt(rowIndex);
                            if (rec) {
                                rec.commit();
                            }
                            Me.majBoutonSuppressionMultiple();
                        }
                    }
                }, {
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    sortable: true
                }, {
                    header: 'lg_INVENTAIRE_ID',
                    dataIndex: 'lg_INVENTAIRE_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Libelle',
                    dataIndex: 'str_NAME',
                    flex: 1
                }, {
                    // Commentaire saisi a la creation : il porte le motif de l'inventaire et
                    // reste la seule trace du pourquoi une fois celui-ci cloture. Place juste
                    // apres le libelle, et modifiable par double-clic tant que l'inventaire
                    // est en cours.
                    header: 'Commentaire',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1.5,
                    editor: {xtype: 'textfield', selectOnFocus: true},
                    renderer: function (v, meta, record) {
                        var enCours = record.get('etat') === 'enable';
                        if (!v) {
                            return enCours
                                    ? '<span style="color:#999;font-style:italic" data-qtip="Double-cliquez pour saisir le commentaire">(double-clic pour saisir)</span>'
                                    : '';
                        }
                        var t = Ext.String.htmlEncode(v);
                        var bulle = enCours ? t + ' - double-cliquez pour modifier' : t;
                        return '<span data-qtip="' + bulle + '">' + t + '</span>';
                    }
                },
                {
                    header: 'Utilisateur',
                    dataIndex: 'lg_USER_ID',
                    flex: 1
                }, {
                    header: 'Date de cr&eacute;ation',
                    dataIndex: 'dt_CREATED',
                    flex: 1.2
                }, {
                    header: 'Statut',
                    dataIndex: 'str_STATUT',
                    flex: 1,
                    renderer: function (v, meta, record) {
                        // Un inventaire cloture se repere d'un coup d'oeil dans la liste ; ceux encore
                        // ouverts ressortent en orange.
                        if (record.get('etat') === 'is_Closed') {
                            meta.style = 'color:#1f7a1f;font-weight:bold;';
                        } else {
                            meta.style = 'color:#e07b18;';
                        }
                        return v;
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/add.png',
                            tooltip: 'Ajouter des articles a une fiche d\'inventaire',
                            scope: this,
                            handler: this.onAddArticleClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('etat') == "is_Closed") {
                                    return 'x-hide-display';
                                } else {
                                    if (record.get('str_TYPE') == "unitaire") {
                                        return 'x-display-hide';
                                    } else {
                                        return 'x-hide-display';
                                    }
                                }

                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    hidden:true,
                    items: [{
                        icon: 'resources/images/icons/fam/chart_bar.png', // Nouvelle icône
                        tooltip: 'Effectuer une analyse avancée',
                        scope: this,
                        handler: this.onAnalyseAvanceeClick
                    }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    hidden:true,
                    items: [{
                        icon: 'resources/images/icons/fam/application_view_list.png',
                        tooltip: 'Effectuer une analyse simple',
                        scope: this,
                        handler: this.onAnalyseClick // Garde l'ancienne analyse
                    }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/paste_plain.png',
                            tooltip: 'Editer un inventaire',
                            scope: this,
                            handler: this.onEditClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('etat') == "enable") {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer un inventaire',
                            scope: this,
                            handler: this.onRemoveClick,
                            getClass: function (value, metadata, record) {
                                // Un inventaire cloture a deja modifie du stock : le supprimer
                                // effacerait la trace de ce qui a ete compte et applique.
                                return record.get('etat') === 'is_Closed' ? 'x-hide-display' : 'x-display-hide';
                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    hidden: true,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/application_view_list.png',
                            tooltip: 'Valorisation d\'inventaire',
                            scope: this,
                            handler: this.onDetailClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            /* disponible sur toute ligne, y compris un
                             * inventaire cloture : c'est justement apres
                             * cloture qu'on recontrole les ecarts */
                            icon: 'resources/images/icons/fam/inventaire.png',
                            tooltip: 'Créer un inventaire à partir des écarts',
                            scope: this,
                            handler: this.onCreateFromEcartsClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Imprimer la liste d\'inventaire',
                            scope: this,
                            handler: this.onbtnprint,
                            /* impression disponible uniquement sur les
                             * inventaires en cours (pas apres cloture) */
                            getClass: function(value, metadata, record) {
                                if (record.get('etat') == "enable") {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            /* meme edition que le bouton 'Imprimer liste des
                             * ecarts' de la fiche ; disponible sur TOUTE ligne,
                             * y compris un inventaire cloture : on peut ainsi
                             * toujours reimprimer les ecarts apres cloture */
                            /* icone distincte de celle de la fiche : les deux boutons etaient
                             * impossibles a distinguer l'un de l'autre */
                            icon: 'resources/images/icons/fam/iconpdf.png',
                            tooltip: 'R&eacute;&eacute;diter la liste des &eacute;carts (m&ecirc;me apr&egrave;s cl&ocirc;ture)',
                            scope: this,
                            handler: this.onPrintEcartsClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            /* export Excel de tous les produits de l'inventaire
                             * avec tous les champs (stock machine, saisi, ecart,
                             * prix, valeur d'ecart...) ; disponible sur toute
                             * ligne, y compris apres cloture */
                            icon: 'resources/images/icons/fam/excel_icon.png',
                            tooltip: 'Exporter les produits et &eacute;carts en Excel (tous les champs)',
                            scope: this,
                            handler: this.onExportExcelClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            /* Edition du commentaire au double-clic. Le plugin ne s'ouvre que sur la colonne
             * Commentaire d'un inventaire EN COURS ; le serveur refuse de toute facon la
             * modification d'un inventaire cloture. */
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {
                    pluginId: 'commentaireEditor',
                    clicksToEdit: 2,
                    listeners: {
                        beforeedit: function (editor, e) {
                            if (e.field !== 'str_DESCRIPTION') {
                                return false;
                            }
                            if (e.record.get('etat') !== 'enable') {
                                Ext.MessageBox.alert('Modification impossible',
                                        'Cet inventaire est cl&ocirc;tur&eacute; : son commentaire ne peut plus '
                                        + '&ecirc;tre modifi&eacute;.');
                                return false;
                            }
                            return true;
                        },
                        edit: function (editor, e) {
                            Me.enregistrerCommentaire(e.record, e.value, e.originalValue);
                        }
                    }
                })],
            tbar: [{
                    text: 'Cr&eacute;er inventaire',
                    scope: this,
                    iconCls: 'addicon',
                    cls: 'btn-primary',
                    handler: this.onAddClick
                }, '-', {
                    text: 'Cr&eacute;er inventaire unitaire',
                    scope: this,
                    iconCls: 'addicon',
                    cls: 'btn-primaryb',
                    handler: this.onAddUnitaireClick
                }, '-', {
                    text: 'Importer CSV inventaire',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onImportCsvClick
                }, '-', {
                    /* Recherche par libelle ou par commentaire d'inventaire. Entree cherche tout
                     * de suite ; a partir de trois caracteres la recherche part seule apres une
                     * pause de frappe, comme les autres zones de recherche de l'application. */
                    xtype: 'textfield',
                    itemId: 'rechercheInventaire',
                    width: 210,
                    emptyText: 'Rechercher (libelle ou commentaire)',
                    listeners: {
                        specialkey: function (f, e) {
                            if (e.getKey() === e.ENTER) {
                                f.dernierTerme = (f.getValue() || '').trim();
                                Me.filtreRecherche = f.dernierTerme;
                                Me.rechargerAvecFiltres();
                            }
                        },
                        change: {
                            buffer: 800,
                            fn: function (f, v) {
                                var terme = (v || '').trim();
                                if (terme.length > 0 && terme.length < 3) {
                                    return;
                                }
                                if (terme === f.dernierTerme) {
                                    return;
                                }
                                f.dernierTerme = terme;
                                Me.filtreRecherche = terme;
                                Me.rechargerAvecFiltres();
                            }
                        }
                    }
                }, {
                    text: 'Effacer',
                    handler: function () {
                        var champ = Me.down('#rechercheInventaire');
                        if (champ) {
                            champ.dernierTerme = '';
                            champ.setValue('');
                        }
                        Me.filtreRecherche = '';
                        Me.rechargerAvecFiltres();
                    }
                }, '-', {
                    xtype: 'combobox',
                    name: 'str_TYPE',
                    margins: '0 0 0 10',
                    id: 'str_TYPE',
                    store: store_type,
                    valueField: 'str_STATUT_TRANSACTION',
                    displayField: 'str_TYPE',
                    typeAhead: true,
                    queryMode: 'remote',
                    emptyText: 'Type...',
                    listeners: {
                        select: function(cmp) {
                            Me.filtreStatut = cmp.getValue();
                            Me.rechargerAvecFiltres();
                        }
                    }
                }, '-', {
                    /* Filtre de zone : les inventaires de reserve d'un cote, ceux du rayon de
                     * l'autre. La recherche part au choix, comme le filtre de statut. */
                    xtype: 'combobox',
                    id: 'str_ZONE_INVENTAIRE',
                    store: store_zone,
                    valueField: 'str_ZONE',
                    displayField: 'str_LIBELLE',
                    queryMode: 'local',
                    editable: false,
                    width: 150,
                    emptyText: 'Rayon / Reserve...',
                    listeners: {
                        select: function (cmp) {
                            Me.filtreZone = cmp.getValue();
                            Me.rechargerAvecFiltres();
                        }
                    }
                }, '-', {
                    /* Suppression de plusieurs inventaires cochés, l'un apres l'autre, en
                     * reutilisant exactement le meme appel que la suppression unitaire. */
                    text: 'Supprimer la s&eacute;lection',
                    itemId: 'btnSupprimerSelection',
                    icon: 'resources/images/icons/fam/delete.png',
                    disabled: true,
                    scope: this,
                    handler: this.onRemoveSelectionClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();

        this.chargerPrivilegeStock();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    /* Filtres courants de l'ecran. Les deux sont envoyes ensemble : choisir une zone ne doit
     * pas faire oublier le statut deja selectionne, et inversement. */
    filtreStatut: '',
    filtreZone: '',
    filtreRecherche: '',
    rechargerAvecFiltres: function () {
        var url = url_services_data_inventaire;
        var params = [];
        if (this.filtreStatut) {
            params.push('str_TYPE=' + encodeURIComponent(this.filtreStatut));
        }
        if (this.filtreZone && this.filtreZone !== 'ALL') {
            params.push('str_ZONE=' + encodeURIComponent(this.filtreZone));
        }
        if (this.filtreRecherche) {
            params.push('search_value=' + encodeURIComponent(this.filtreRecherche));
        }
        this.getStore().getProxy().url = params.length ? url + '?' + params.join('&') : url;
        this.getStore().loadPage(1);
    },
    /* Le bouton de suppression multiple ne s'active que s'il y a au moins une ligne cochee. */
    majBoutonSuppressionMultiple: function () {
        var btn = this.down('#btnSupprimerSelection');
        if (btn) {
            btn.setDisabled(this.getInventairesCoches().length === 0);
        }
    },
    getInventairesCoches: function () {
        var coches = [];
        this.getStore().each(function (rec) {
            if (rec.get('bl_A_SUPPRIMER') === true && rec.get('etat') !== 'is_Closed') {
                coches.push(rec);
            }
        });
        return coches;
    },
    /* Suppression des inventaires coches, un par un et dans l'ordre, avec le MEME appel que la
     * suppression unitaire. Un echec sur une ligne n'arrete pas les suivantes : le bilan est
     * presente a la fin. */
    onRemoveSelectionClick: function () {
        var me = this;
        var aSupprimer = me.getInventairesCoches();
        if (!aSupprimer.length) {
            Ext.MessageBox.alert('Message', 'Cochez au moins un inventaire &agrave; supprimer.');
            return;
        }
        Ext.MessageBox.confirm('Confirmation',
                'Supprimer <b>' + aSupprimer.length + '</b> inventaire(s) ? Cette action est d&eacute;finitive.',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    var succes = 0, echecs = [];
                    testextjs.app.getController('App').ShowWaitingProcess();
                    var suivant = function (index) {
                        if (index >= aSupprimer.length) {
                            testextjs.app.getController('App').StopWaitingProcess();
                            var msg = '<b>' + succes + '</b> inventaire(s) supprim&eacute;(s).';
                            if (echecs.length) {
                                msg += '<br/><br/><b style="color:#c0392b">Non supprim&eacute;(s) : '
                                        + echecs.length + '</b><ul style="margin:4px 0 0 16px">'
                                        + echecs.join('') + '</ul>';
                            }
                            Ext.MessageBox.alert('Suppression', msg);
                            me.getStore().reload();
                            me.majBoutonSuppressionMultiple();
                            return;
                        }
                        var rec = aSupprimer[index];
                        Ext.Ajax.request({
                            url: url_services_rest_inventaire + '/supprimer',
                            method: 'POST',
                            timeout: 1800000,
                            jsonData: {lg_INVENTAIRE_ID: rec.get('lg_INVENTAIRE_ID')},
                            callback: function (opts, ok, response) {
                                var object = ok ? Ext.JSON.decode(response.responseText, true) : null;
                                if (ok && object && object.code_statut != "0") {
                                    succes++;
                                } else {
                                    echecs.push('<li>' + Ext.String.htmlEncode(rec.get('str_NAME') || '')
                                            + ' &mdash; ' + Ext.String.htmlEncode(
                                            (object && object.desc_satut) ? object.desc_satut : 'echec')
                                            + '</li>');
                                }
                                suivant(index + 1);
                            }
                        });
                    };
                    suivant(0);
                });
    },
    /* Enregistrement du commentaire modifie au double-clic. En cas de refus ou d'erreur, la
     * valeur precedente est remise a l'ecran : jamais d'affichage different de la base. */
    enregistrerCommentaire: function (record, valeur, ancienneValeur) {
        var texte = (valeur || '').trim();
        if (texte === (ancienneValeur || '').trim()) {
            return;
        }
        var remettre = function () {
            record.set('str_DESCRIPTION', ancienneValeur);
            record.commit();
        };
        if (!texte) {
            Ext.MessageBox.alert('Message', 'Le commentaire ne peut pas &ecirc;tre vide.');
            remettre();
            return;
        }
        Ext.Ajax.request({
            url: url_services_rest_inventaire + '/commentaire/'
                    + encodeURIComponent(record.get('lg_INVENTAIRE_ID')),
            method: 'POST',
            jsonData: {commentaire: texte},
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true) || {};
                if (res.success === false) {
                    Ext.MessageBox.alert('Modification impossible', res.message || 'Modification refus&eacute;e.');
                    remettre();
                    return;
                }
                record.commit();
            },
            failure: function () {
                Ext.MessageBox.alert('Erreur', "L'enregistrement du commentaire a &eacute;chou&eacute;.");
                remettre();
            }
        });
    },
    /* Reedition de la liste des ecarts depuis la liste des inventaires :
     * strictement la meme edition que le bouton 'Imprimer liste des ecarts'
     * de la fiche (str_NAME_FILE=ecart, sans filtre d'ecran ; le modele
     * avec/sans stock machine reste choisi par le privilege cote serveur).
     * Utilisable meme apres cloture de l'inventaire. */
    onPrintEcartsClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        Me.demanderAffichageStock(function (showStock) {
            var linkUrl = url_services_pdf_fiche_inventaire + '?lg_INVENTAIRE_ID='
                    + rec.get('lg_INVENTAIRE_ID') + "&str_NAME_FILE=ecart"
                    + "&showStock=" + showStock;
            window.open(linkUrl);
        });
    },

    /* Privilege d'affichage du stock machine a l'impression, lu UNE SEULE FOIS par ouverture
     * de l'ecran puis conserve : c'est le meme controle que celui de la fiche d'inventaire. */
    chargerPrivilegeStock: function () {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/inventaire/privilege-stock',
            success: function (response) {
                var o = Ext.JSON.decode(response.responseText, true);
                me.stockAutorise = !!(o && o.authorize === true);
            },
            failure: function () {
                me.stockAutorise = false;
            }
        });
    },

    /**
     * Demande si le stock doit figurer sur l'edition, puis rend la main.
     *
     * La question n'est posee qu'aux utilisateurs AYANT le droit de voir le stock machine.
     * Pour les autres, l'edition part sans stock, sans question : leur poser le choix
     * laisserait croire qu'ils peuvent l'obtenir.
     */
    demanderAffichageStock: function (suite) {
        if (!this.stockAutorise) {
            suite('false');
            return;
        }
        Ext.MessageBox.show({
            title: 'Impression',
            msg: 'Afficher le stock sur cette &eacute;dition ?',
            buttons: Ext.MessageBox.YESNO,
            buttonText: {yes: 'Oui', no: 'Non'},
            icon: Ext.MessageBox.QUESTION,
            fn: function (btn) {
                if (btn === 'yes' || btn === 'no') {
                    suite(btn === 'yes' ? 'true' : 'false');
                }
            }
        });
    },
    /* export Excel de tous les produits de l'inventaire (tous les champs :
     * stocks, ecart, prix, valeur d'ecart, comptage) ; meme apres cloture */
    onExportExcelClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        window.location = '../api/v1/inventaire/export-excel/'
                + encodeURIComponent(rec.get('lg_INVENTAIRE_ID'));
    },
    onbtnprint: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        /* Plus de confirmation prealable : cliquer sur le bouton d'impression EST la
         * confirmation. On enchaine directement sur la seule question utile, celle du stock. */
        Me.demanderAffichageStock(function (showStock) {
            /* meme modele que l'impression depuis la fiche (str_NAME_FILE vide) pour
             * eviter deux documents divergents */
            var linkUrl = url_services_pdf_fiche_inventaire + '?lg_INVENTAIRE_ID='
                    + rec.get('lg_INVENTAIRE_ID') + "&str_NAME_FILE="
                    + "&showStock=" + showStock;
            window.open(linkUrl);
        });

    },
    onPdfClick: function(lg_INVENTAIRE_ID) {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_fiche_inventaire + '?lg_INVENTAIRE_ID=' + lg_INVENTAIRE_ID + "&str_NAME_FILE=final";
        window.open(linkUrl);

    },
    onStoreLoad: function() {
    },    
    onAddClick: function() {

        new testextjs.view.stockmanagement.inventaire.action.addBis({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Cr&eacute;er inventaire"
        });
    },
    onAddUnitaireClick: function() {
        new testextjs.view.stockmanagement.inventaire.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Cr&eacute;er inventaire"
        });
    },
    onAddArticleClick: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.stockmanagement.inventaire.action.addArticle({
            odatasource: rec.data,
            parentview: this,
            mode: "create",
            titre: "Inventaire [" + rec.get('str_NAME') + "]"
        });

    },
    /* cree un nouvel inventaire avec les produits en ecart de la ligne
     * choisie ; le stock initial est recalcule cote serveur depuis le stock
     * courant (pas repris de l'ancien inventaire) */
    onCreateFromEcartsClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        // MessageBox.confirm ne s'elargit pas tout seul : le texte sur deux lignes etait coupe.
        // On passe par show() pour imposer une largeur.
        Ext.MessageBox.show({
            title: 'Message',
            msg: 'Cr&eacute;er un nouvel inventaire &agrave; partir des &eacute;carts de <b>'
                    + Ext.String.htmlEncode(rec.get('str_NAME') || '') + '</b> ?'
                    + '<br/><br/>Le stock initial des lignes sera repris du stock courant.',
            width: 460,
            buttons: Ext.MessageBox.YESNO,
            buttonText: {yes: 'Oui', no: 'Non'},
            icon: Ext.MessageBox.QUESTION,
            fn: function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    testextjs.app.getController('App').ShowWaitingProcess();
                    Ext.Ajax.request({
                        url: url_services_rest_inventaire + '/create-from-ecarts/' + rec.get('lg_INVENTAIRE_ID'),
                        method: 'POST',
                        timeout: 1800000,
                        success: function(response) {
                            testextjs.app.getController('App').StopWaitingProcess();
                            var object = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.Msg.alert(object.success ? 'Confirmation' : 'Information',
                                    object.message || 'Traitement terminé.');
                            grid.getStore().reload();
                        },
                        failure: function(response) {
                            testextjs.app.getController('App').StopWaitingProcess();
                            Ext.Msg.alert('Erreur', 'Erreur du serveur ' + response.status);
                        }
                    });
            }
        });
    },
    // DEBUT DE LA NOUVELLE FONCTION
    onAnalyseClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        Ext.create('testextjs.view.stockmanagement.inventaire.action.AnalyseInventaire', {
            odatasource: rec.data,
            titre: 'Analyse de l\'inventaire : ' + rec.get('str_NAME')
        }).show();
    },
    
    

    onAnalyseAvanceeClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        Ext.create('testextjs.view.stockmanagement.inventaire.action.AnalyseAvancee', {
            odatasource: rec.data
            
        }).show();
    },
    // FIN DE LA NOUVELLE FONCTION
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        // Verrou en plus du masquage du bouton : un inventaire cloture ne s'edite plus,
        // meme si un affichage perime (cache navigateur) laisse le bouton visible.
        if (rec && rec.get('etat') !== 'enable') {
            Ext.MessageBox.alert('Message', 'Cet inventaire est clôturé : la fiche ne peut plus être éditée.');
            return;
        }
        var xtype = "editinventaireManager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Modification de la fiche d'inventaire", rec.get('lg_INVENTAIRE_ID'), rec.data);
    },
    onDetailClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "detailinventaireManager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Detail de la fiche d'inventaire", rec.get('lg_INVENTAIRE_ID'), rec.data);
    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            // Suppression par le service REST, en remplacement du mode delete
                            // de la JSP. La reponse garde les memes champs.
                            url: url_services_rest_inventaire + '/supprimer',
                            method: 'POST',
                            timeout: 1800000,
                            jsonData: {
                                lg_INVENTAIRE_ID: rec.get('lg_INVENTAIRE_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.code_statut == "0") {
                                    Ext.MessageBox.alert('Error Message', object.desc_satut);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.desc_satut);
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    
    onImportCsvClick: function() {
        var me = this;
        var fileInput = Ext.DomHelper.append(Ext.getBody(), {
            tag: 'input',
            type: 'file',
            accept: '.csv,text/csv',
            style: 'display:none'
        }, true);
        fileInput.on('change', function(e) {
            var file = e.target.files[0];
            if (!file) {
                fileInput.remove();
                return;
            }
            var reader = new FileReader();
            reader.onload = function(evt) {
                testextjs.app.getController('App').ShowWaitingProcess();
                Ext.Ajax.request({
                    url: url_services_rest_inventaire + '/import-csv',
                    method: 'POST',
                    jsonData: {
                        csvContent: evt.target.result
                    },
                    success: function(response) {
                        testextjs.app.getController('App').StopWaitingProcess();
                        var object = Ext.JSON.decode(response.responseText, false);
                        Ext.Msg.alert('Information', object.message || 'Traitement termin\u00e9.');
                        me.getStore().reload();
                    },
                    failure: function(response) {
                        testextjs.app.getController('App').StopWaitingProcess();
                        Ext.Msg.alert('Erreur', response.responseText);
                    }
                });
            };
            reader.readAsText(file, 'UTF-8');
            fileInput.remove();
        });
        fileInput.dom.click();
    }


});
