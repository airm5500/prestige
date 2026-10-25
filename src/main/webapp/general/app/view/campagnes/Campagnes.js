/* global Ext */

/*
 * CAMPAGNES SMS / WHATSAPP (besoins du 11/10, lot 4), API v1/campagnes, droit P_SM_CAMPAGNES.
 *  - Propositions : preparees chaque matin si le volet automatique est actif (desactive par defaut), ou a la demande ;
 *    on decoche ceux a qui on ne veut pas ecrire, puis on envoie. Leur nombre de messages s'affiche dans la cloche.
 *  - Anniversaires, Fetes (calendrier modifiable), Infos clients, Infos pharmacie, Personnalise : choix de la
 *    population, du canal et du message (modele ou texte libre), apercu, destinataires a cocher, envoi.
 *  - Rappels traitement : l'ecran existant, en onglet (droit P_SM_RAPPELS_HABITUDE).
 *  - Journal et Parametres.
 * Un refus du client bloque toujours ; « accord explicite seulement » exige son accord. Aucune fenetre : la
 * confirmation d'envoi se fait dans le bouton lui-meme, les messages dans la barre d'etat de l'onglet.
 */
Ext.define('testextjs.view.campagnes.Campagnes', {
    extend: 'Ext.tab.Panel',
    xtype: 'campagnes',
    title: 'Campagnes SMS / WhatsApp',
    frame: true,
    width: '98%',
    height: 700,
    cls: 'campagnes',
    URL: '../api/v1/campagnes/',
    config: {nameintern: '', titre: '', odatasource: ''},

    CANAUX: [{v: 'SMS', t: 'SMS'}, {v: 'WHATSAPP', t: 'WhatsApp'}, {v: 'SMS_WHATSAPP', t: 'WhatsApp, repli SMS'}],
    MODELE_DEFAUT: {ANNIVERSAIRE: 'MODELE_ANNIVERSAIRE', FETE: 'MODELE_FETE', INFO_PHARMACIE: 'MODELE_INFO_PHARMACIE', INFO_CLIENTS: 'MODELE_CONTACT'},
    AIDE: {
        ANNIVERSAIRE: 'Clients dont c\'est l\'anniversaire le jour choisi (date de naissance de la fiche client).',
        FETE: 'Tous les clients actifs, pour la fête choisie. Les dates des fêtes musulmanes se saisissent chaque année dans le calendrier.',
        INFO_CLIENTS: 'Information ciblée : filtrez par sexe, âge, achats récents ou nom.',
        INFO_PHARMACIE: 'Information de la pharmacie (horaires, garde, nouveautés) à vos clients actifs.',
        PERSONNALISE: 'Message libre aux clients que vous choisissez.'
    },

    initComponent: function () {
        var me = this;
        me.styles();
        /* retours du 25/10 (point 14) : listes de diffusion, partagees par les onglets d'envoi et l'onglet Listes */
        me.listesStore = Ext.create('Ext.data.Store', {fields: ['id', 'nom', 'nombre', 'affiche'], data: []});
        me.items = [me.ongletPropositions()];
        Ext.each(['ANNIVERSAIRE', 'FETE', 'INFO_CLIENTS', 'INFO_PHARMACIE', 'PERSONNALISE'], function (c) {
            me.items.push(me.ongletCategorie(c));
        });
        me.items.push({title: 'Rappels traitement', itemId: 'ongletRappels', layout: 'fit', hidden: true, iconCls: 'fa fa-medkit'});
        me.items.push(me.ongletListes(), me.ongletJournal(), me.ongletParametres());
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.chargerContexte();
        });
        me.on('destroy', function () {
            clearTimeout(me.minuteurSuivi);
        });
        me.on('tabchange', function (p, t) {
            if (t.itemId === 'ongletPropositions') {
                me.chargerPropositions();
            } else if (t.itemId === 'ongletListes') {
                me.chargerListes();
            } else if (t.itemId === 'ongletJournal') {
                me.chargerJournal();
            } else if (t.itemId === 'ongletParametres') {
                me.chargerParametres();
            } else if (t.itemId === 'ongletRappels' && !t.items.getCount()) {
                t.add({xtype: 'rappelstraitement'});
            } else if (t.categorie && !t.charge) {
                t.charge = true;
                me.initialiserCategorie(t);
            }
        });
    },

    styles: function () {
        if (document.getElementById('campagnes-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.cmp-etat{padding:4px 10px;min-height:22px}.cmp-ok{color:#1e8449;font-weight:bold}.cmp-erreur{color:#c0392b;font-weight:bold}'
                + '.cmp-info{color:#34495e}.cmp-aide{color:#5d6d7e;padding:6px 10px;background:#f4f6f8;border-radius:6px;margin:6px 8px 0}'
                + '.cmp-apercu{white-space:pre-wrap;background:#e8f8f5;border:1px solid #a3e4d7;border-radius:10px;padding:10px;color:#145a32;min-height:60px}'
                + '.cmp-compte{color:#5d6d7e;font-size:11px;margin-top:4px}'
                + '.cmp-motif{color:#c0392b}.cmp-joignable{color:#1e8449}'
                + '.cmp-bandeau{margin:8px;padding:8px 12px;border-radius:6px;background:#fff4e0;color:#7a4b00}'
                + '.cmp-vide{padding:20px;color:#7f8c8d}'
                + '.x-btn.cmp-confirmer{background:#c0392b !important;border-color:#922b21 !important}'
                + '.x-btn.cmp-confirmer .x-btn-inner{color:#fff !important}', 'campagnes-styles');
    },

    esc: function (v) {
        return Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v));
    },

    appel: function (methode, chemin, corps, rappel) {
        Ext.Ajax.request({
            url: this.URL + chemin, method: methode, jsonData: corps || undefined,
            success: function (r) {
                rappel(Ext.decode(r.responseText, true) || {success: false, message: 'Réponse illisible.'});
            },
            failure: function (r) {
                rappel({success: false, message: r.status === 401 ? 'Session expirée.' : 'Le serveur ne répond pas.'});
            }
        });
    },

    etat: function (onglet, texte, classe) {
        var e = onglet.down('#etat');
        if (e) {
            e.update(texte ? '<span class="' + (classe || 'cmp-info') + '">' + this.esc(texte) + '</span>' : '');
        }
    },

    chargerContexte: function () {
        var me = this;
        me.appel('GET', 'contexte', null, function (o) {
            if (!o.success) {
                me.etat(me.down('#ongletPropositions'), o.message, 'cmp-erreur');
                return;
            }
            me.contexte = o;
            if (o.rappels) {
                me.down('#ongletRappels').tab.show();
            }
            me.chargerPropositions();
        });
    },

    /* bouton a confirmer : premier clic -> « Confirmer ... » (5 s), second clic -> action */
    confirmer: function (bouton, texteConfirmation, action) {
        if (bouton.enConfirmation) {
            bouton.enConfirmation = false;
            bouton.removeCls('cmp-confirmer');
            bouton.setText(bouton.texteInitial);
            action();
            return;
        }
        bouton.texteInitial = bouton.texteInitial || bouton.getText();
        bouton.enConfirmation = true;
        bouton.addCls('cmp-confirmer');
        bouton.setText(texteConfirmation);
        Ext.defer(function () {
            if (bouton.enConfirmation && !bouton.isDestroyed) {
                bouton.enConfirmation = false;
                bouton.removeCls('cmp-confirmer');
                bouton.setText(bouton.texteInitial);
            }
        }, 5000);
    },

    storeModeles: function () {
        return Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', 'canal', 'contenu'],
            proxy: {type: 'ajax', url: '../api/v1/modeles-messages', extraParams: {canal: 'WHATSAPP'}, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
    },

    storeDestinataires: function () {
        /* joignables d'abord, puis par nom */
        return Ext.create('Ext.data.Store', {fields: ['clientId', 'client', 'telephone', 'age', {name: 'joignable', type: 'boolean'}, 'motif'], data: [],
            sorters: [{property: 'joignable', direction: 'DESC'}, {property: 'client', direction: 'ASC'}]});
    },

    colonnesDestinataires: function () {
        var me = this;
        return [
            {text: 'Client', dataIndex: 'client', flex: 1, minWidth: 180},
            {text: 'Téléphone', dataIndex: 'telephone', width: 120},
            {text: 'Âge', dataIndex: 'age', width: 60, align: 'right'},
            {text: 'État', dataIndex: 'motif', width: 210, renderer: function (v, m, r) {
                    return r.get('joignable') ? '<span class="cmp-joignable"><i class="fa fa-check"></i> Joignable</span>'
                            : '<span class="cmp-motif">' + me.esc(v) + '</span>';
                }}
        ];
    },

    /* grille a cocher : seuls les joignables se cochent ; tous coches par defaut */
    grilleDestinataires: function (store, extra) {
        var me = this;
        var config = Ext.apply({
            xtype: 'gridpanel', itemId: 'destinataires', store: store, columnLines: true, flex: 1,
            selModel: Ext.create('Ext.selection.CheckboxModel', {checkOnly: true, listeners: {
                    beforeselect: function (sm, r) {
                        return r.get('joignable');
                    }
                }}),
            viewConfig: {emptyText: '<div class="cmp-vide">Aucun destinataire.</div>', deferEmptyText: false, markDirty: false},
            columns: me.colonnesDestinataires()
        }, extra || {});
        /* la grille relaie le changement de selection : nombre de clients coches -> bouton d'envoi */
        config.listeners = Ext.apply({}, config.listeners, {
            selectionchange: function (sm, selection) {
                var g = this;
                g.fireEvent('cochage', g, selection.length);
            }
        });
        return config;
    },

    cocherJoignables: function (grille) {
        var s = grille.getStore(), l = [];
        s.each(function (r) {
            if (r.get('joignable')) {
                l.push(r);
            }
        });
        grille.getSelectionModel().select(l, false, false);
    },

    /* ============================================================================================ categories */

    ongletCategorie: function (code) {
        var me = this, libelle = {ANNIVERSAIRE: 'Anniversaires', FETE: 'Fêtes', INFO_CLIENTS: 'Infos clients', INFO_PHARMACIE: 'Infos pharmacie', PERSONNALISE: 'Personnalisé'}[code];
        var icone = {ANNIVERSAIRE: 'fa-birthday-cake', FETE: 'fa-gift', INFO_CLIENTS: 'fa-users', INFO_PHARMACIE: 'fa-info-circle', PERSONNALISE: 'fa-pencil'}[code];
        var filtres = [];
        if (code === 'ANNIVERSAIRE') {
            filtres.push({xtype: 'datefield', itemId: 'jour', fieldLabel: 'Anniversaires du', labelWidth: 110, width: 240, format: 'd/m/Y', value: new Date(), submitFormat: 'Y-m-d'});
        }
        if (code === 'FETE') {
            filtres.push({xtype: 'combobox', itemId: 'fete', fieldLabel: 'Fête', labelWidth: 40, width: 330, editable: false, queryMode: 'local',
                displayField: 'affiche', valueField: 'code', store: Ext.create('Ext.data.Store', {fields: ['code', 'libelle', 'date', 'affiche', 'regle', 'type', {name: 'actif', type: 'boolean'}], data: []}),
                listeners: {change: function () {
                        me.apercu(me.down('#onglet-FETE'));
                    }}});
        }
        if (code === 'INFO_CLIENTS' || code === 'PERSONNALISE') {
            filtres.push({xtype: 'combobox', itemId: 'sexe', fieldLabel: 'Sexe', labelWidth: 35, width: 130, editable: false, queryMode: 'local', value: '',
                displayField: 't', valueField: 'v', store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: [{v: '', t: 'Tous'}, {v: 'F', t: 'Femmes'}, {v: 'M', t: 'Hommes'}]})},
                    {xtype: 'numberfield', itemId: 'ageMin', fieldLabel: 'Âge de', labelWidth: 45, width: 105, minValue: 0, maxValue: 130, hideTrigger: true, allowDecimals: false},
                    {xtype: 'numberfield', itemId: 'ageMax', fieldLabel: 'à', labelWidth: 12, width: 70, minValue: 0, maxValue: 130, hideTrigger: true, allowDecimals: false});
        }
        if (code === 'INFO_CLIENTS' || code === 'INFO_PHARMACIE' || code === 'PERSONNALISE') {
            filtres.push({xtype: 'combobox', itemId: 'liste', fieldLabel: 'Liste', labelWidth: 30, width: 200, editable: false, queryMode: 'local',
                emptyText: 'Tous les clients', store: me.listesStore, displayField: 'affiche', valueField: 'id',
                listeners: {expand: function () {
                        me.chargerListes();
                    }}});
            filtres.push({xtype: 'combobox', itemId: 'moisAchat', fieldLabel: 'Achats', labelWidth: 45, width: 230, editable: false, queryMode: 'local', value: '',
                displayField: 't', valueField: 'v', store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: [{v: '', t: 'Tous les clients actifs'}, {v: 1, t: 'Achat dans le dernier mois'},
                        {v: 3, t: 'Achat dans les 3 derniers mois'}, {v: 6, t: 'Achat dans les 6 derniers mois'}, {v: 12, t: 'Achat dans les 12 derniers mois'}]})},
                    {xtype: 'textfield', itemId: 'recherche', emptyText: 'Nom ou téléphone', width: 170});
        }
        var store = me.storeDestinataires(), modeles = me.storeModeles();
        var onglet = {
            title: libelle, itemId: 'onglet-' + code, categorie: code, iconCls: 'fa ' + icone, layout: {type: 'vbox', align: 'stretch'},
            modeles: modeles,
            items: [
                {xtype: 'component', html: '<div class="cmp-aide">' + me.esc(me.AIDE[code]) + '</div>'},
                /* retours du 25/10 (point 14) : avec beaucoup de filtres, deux rangees (le bouton « Voir » reste visible a 1366 px) */
                {xtype: 'container', layout: {type: 'vbox', align: 'stretch'}, padding: '8 8 0 8', items: me.rangeesFiltres(filtres, [
                        /* retours du 25/10 (point 14) : WhatsApp seul par defaut */
                        {xtype: 'combobox', itemId: 'canal', fieldLabel: 'Canal', labelWidth: 40, width: 220, editable: false, queryMode: 'local', value: 'WHATSAPP',
                            displayField: 't', valueField: 'v', store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: me.CANAUX}),
                            listeners: {change: function (c, v) {
                                    me.chargerModeles(me.down('#onglet-' + code), v);
                                    me.majPieceJointe(me.down('#onglet-' + code));
                                }}},
                        {xtype: 'checkbox', itemId: 'accord', boxLabel: 'Accord explicite seulement', checked: false},
                        {xtype: 'button', itemId: 'voir', text: 'Voir les destinataires', iconCls: 'fa fa-search', handler: function () {
                                me.chargerPopulation(me.down('#onglet-' + code));
                            }}
                    ])},
                {xtype: 'container', flex: 1, layout: {type: 'hbox', align: 'stretch'}, padding: 8, items: [
                        me.grilleDestinataires(store, {flex: 3, title: 'Destinataires', listeners: {cochage: function (g, n) {
                                    me.majBoutonEnvoi(me.down('#onglet-' + code), n);
                                }}}),
                        {xtype: 'panel', flex: 2, margin: '0 0 0 10', title: 'Message', bodyPadding: 8, layout: {type: 'vbox', align: 'stretch'}, items: [
                                {xtype: 'combobox', itemId: 'modele', fieldLabel: 'Modèle', labelWidth: 50, editable: false, queryMode: 'local', store: modeles,
                                    displayField: 'libelle', valueField: 'id', emptyText: code === 'PERSONNALISE' ? 'Facultatif : partir d\'un modèle' : 'Choisir un modèle',
                                    listeners: {select: function (c, r) {
                                            var rec = Ext.isArray(r) ? r[0] : r;
                                            var o = me.down('#onglet-' + code);
                                            o.down('#texte').setValue(rec ? rec.get('contenu') : '');
                                        }}},
                                {xtype: 'textarea', itemId: 'texte', flex: 1, minHeight: 90, margin: '6 0 0 0', enableKeyEvents: true,
                                    emptyText: 'Votre message. Variables : {prenom} {nom} {client} {officine} {telephone_officine} {fete} {age}',
                                    listeners: {change: {buffer: 400, fn: function () {
                                                me.apercu(me.down('#onglet-' + code));
                                            }}}},
                                {xtype: 'component', itemId: 'variables', html: '<div class="cmp-compte">Variables : {prenom} {nom} {client} {officine} {telephone_officine} {fete} {age}</div>'},
                                /* retour du 24/10 (repris du CRM) : piece jointe facultative, par WhatsApp seulement */
                                {xtype: 'container', itemId: 'zonePiece', hidden: true, margin: '6 0 0 0', layout: {type: 'hbox', align: 'middle'}, items: [
                                        {xtype: 'filefield', itemId: 'piece', buttonOnly: true, buttonText: 'Joindre une image ou un PDF', hideLabel: true,
                                            buttonConfig: {iconCls: 'fa fa-paperclip', tooltip: 'Image JPEG ou PNG, ou document PDF, 5 Mo au plus : envoyé avec le message en légende'},
                                            listeners: {change: function (champ) {
                                                    me.lirePieceJointe(me.down('#onglet-' + code), champ);
                                                }}},
                                        {xtype: 'component', itemId: 'nomPiece', flex: 1, margin: '0 0 0 8', html: ''},
                                        {xtype: 'button', itemId: 'retirerPiece', hidden: true, text: 'Retirer', iconCls: 'fa fa-times', handler: function () {
                                                me.retirerPieceJointe(me.down('#onglet-' + code));
                                            }}
                                    ]},
                                {xtype: 'component', margin: '8 0 0 0', html: '<b>Aperçu</b>'},
                                {xtype: 'component', itemId: 'apercu', html: '<div class="cmp-apercu"></div>'},
                                {xtype: 'button', itemId: 'envoyer', margin: '10 0 0 0', scale: 'medium', text: 'Envoyer', disabled: true, iconCls: 'fa fa-paper-plane', handler: function (b) {
                                        me.envoyer(me.down('#onglet-' + code), b);
                                    }}
                            ]}
                    ]},
                {xtype: 'component', itemId: 'etat', cls: 'cmp-etat'}
            ]
        };
        if (code === 'FETE') {
            onglet.items.splice(3, 0, me.calendrierFetes());
        }
        return onglet;
    },

    /* filtres propres a l'onglet, puis canal / accord / « Voir » : sur une rangee, ou deux s'il y a plus de deux filtres */
    rangeesFiltres: function (filtres, communs) {
        var rangee = function (items) {
            return {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, defaults: {margin: '0 8 0 0'}, items: items};
        };
        if (filtres.length <= 2) {
            return [rangee(filtres.concat(communs))];
        }
        var r2 = rangee(communs);
        r2.margin = '6 0 0 0';
        return [rangee(filtres), r2];
    },

    initialiserCategorie: function (o) {
        var me = this;
        me.chargerModeles(o, o.down('#canal').getValue(), me.MODELE_DEFAUT[o.categorie]);
        if (o.categorie === 'FETE') {
            me.chargerFetes(o);
        }
        /* Fetes : destinataires charges une fois la prochaine fete choisie. Personnalise, Infos clients et Infos pharmacie
         * (retours du 25/10, point 14 : jusqu'a 5 000 clients a l'ouverture de l'onglet) : a la demande */
        if (o.categorie === 'ANNIVERSAIRE') {
            me.chargerPopulation(o);
        } else if (o.categorie !== 'FETE') {
            o.down('#destinataires').getView().emptyText = '<div class="cmp-vide">Choisissez les filtres puis cliquez sur « Voir les destinataires ».</div>';
            o.down('#destinataires').getView().refresh();
        }
    },

    chargerModeles: function (o, canal, defaut) {
        var me = this, s = o.modeles, c = o.down('#modele');
        s.getProxy().setExtraParam('canal', canal === 'SMS' ? 'SMS' : 'WHATSAPP');
        s.load({callback: function () {
                var actuel = defaut || c.getValue();
                if (actuel && s.getById(actuel)) {
                    c.setValue(actuel);
                    if (defaut) {
                        o.down('#texte').setValue(s.getById(actuel).get('contenu'));
                    }
                } else if (c.getValue()) {
                    c.clearValue();
                }
                me.apercu(o);
            }});
    },

    filtres: function (o) {
        var v = function (id) {
            var c = o.down('#' + id);
            return c ? c.getValue() : null;
        };
        var f = {categorie: o.categorie, canal: v('canal'), accordExplicite: !!v('accord')};
        if (o.down('#jour')) {
            f.jour = Ext.Date.format(v('jour') || new Date(), 'Y-m-d');
        }
        if (o.down('#fete')) {
            f.fete = v('fete');
        }
        Ext.each(['sexe', 'ageMin', 'ageMax', 'moisAchat', 'recherche', 'liste'], function (k) {
            var x = v(k);
            if (x !== null && x !== undefined && x !== '') {
                f[k] = x;
            }
        });
        return f;
    },

    /* message envoye : le texte s'il differe du modele choisi, sinon le modele */
    message: function (o, f) {
        var m = o.down('#modele').getValue(), r = m ? o.modeles.getById(m) : null, t = Ext.String.trim(o.down('#texte').getValue() || '');
        if (r && t === Ext.String.trim(r.get('contenu') || '')) {
            f.modeleId = m;
        } else {
            f.message = t;
        }
        return f;
    },

    chargerPopulation: function (o) {
        var me = this, g = o.down('#destinataires');
        if (o.categorie === 'FETE' && !o.down('#fete').getValue()) {
            me.etat(o, 'Choisissez la fête.', 'cmp-erreur');
            return;
        }
        g.setLoading('Recherche des destinataires...');
        me.appel('POST', 'population', me.filtres(o), function (r) {
            g.setLoading(false);
            if (!r.success) {
                me.etat(o, r.message, 'cmp-erreur');
                return;
            }
            g.getStore().loadData(r.data || []);
            me.cocherJoignables(g);
            g.setTitle('Destinataires : ' + r.joignables + ' joignable(s) sur ' + r.total);
            me.etat(o, r.total === 0 ? 'Aucun client ne correspond.' : (r.total - r.joignables) + ' client(s) non joignable(s) (motif affiché).', 'cmp-info');
            me.majBoutonEnvoi(o, g.getSelectionModel().getCount());
            me.apercu(o);
        });
    },

    majBoutonEnvoi: function (o, n) {
        var b = o.down('#envoyer');
        b.enConfirmation = false;
        b.removeCls('cmp-confirmer');
        b.texteInitial = null;
        b.setText(n > 0 ? 'Envoyer à ' + n + ' client(s)' : 'Envoyer');
        b.setDisabled(!(n > 0));
    },

    apercu: function (o) {
        var me = this, f = me.message(o, me.filtres(o)), g = o.down('#destinataires'), sel = g.getSelectionModel().getSelection();
        if (!f.modeleId && !f.message) {
            o.down('#apercu').update('<div class="cmp-apercu"></div>');
            return;
        }
        if (sel.length) {
            f.clientId = sel[0].get('clientId');
        }
        me.appel('POST', 'apercu', f, function (r) {
            o.down('#apercu').update(r.success
                    ? '<div class="cmp-apercu">' + me.esc(r.texte) + '</div><div class="cmp-compte">Pour ' + me.esc(r.client) + ' · ' + r.longueur
                    + ' caractères' + (f.canal === 'WHATSAPP' ? '' : ' · ' + r.sms + ' SMS') + '</div>'
                    : '<div class="cmp-apercu cmp-erreur">' + me.esc(r.message) + '</div>');
        });
    },

    /* ============================================================================================ piece jointe */

    PIECE_MAX: 5 * 1024 * 1024,

    /** La piece jointe n'est proposee que pour un canal WhatsApp ; changer pour SMS la retire. */
    majPieceJointe: function (o) {
        var z = o && o.down('#zonePiece');
        if (!z) {
            return;
        }
        var wa = /WHATSAPP/.test(o.down('#canal').getValue() || '');
        z.setVisible(wa);
        if (!wa) {
            this.retirerPieceJointe(o);
        }
    },

    lirePieceJointe: function (o, champ) {
        var me = this, fichier = champ.fileInputEl && champ.fileInputEl.dom.files && champ.fileInputEl.dom.files[0];
        if (!fichier) {
            return;
        }
        if (fichier.size > me.PIECE_MAX) {
            me.etat(o, 'Pièce jointe trop lourde (5 Mo au plus).', 'cmp-erreur');
            champ.reset();
            return;
        }
        if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(fichier.type)) {
            me.etat(o, 'La pièce jointe doit être une image JPEG, PNG ou un document PDF.', 'cmp-erreur');
            champ.reset();
            return;
        }
        var lecteur = new FileReader();
        lecteur.onload = function () {
            var r = String(lecteur.result || '');
            o.pieceJointe = {base64: r.substring(r.indexOf(',') + 1), nomFichier: fichier.name};
            o.down('#nomPiece').update('<span class="cmp-compte"><i class="fa ' + (fichier.type === 'application/pdf' ? 'fa-file-pdf-o' : 'fa-file-image-o')
                    + '"></i> ' + me.esc(fichier.name) + ' (' + Math.max(1, Math.round(fichier.size / 1024)) + ' Ko)</span>');
            o.down('#retirerPiece').show();
            me.etat(o, '', '');
        };
        lecteur.readAsDataURL(fichier);
        champ.reset();
    },

    retirerPieceJointe: function (o) {
        if (!o || !o.down('#nomPiece')) {
            return;
        }
        o.pieceJointe = null;
        o.down('#nomPiece').update('');
        o.down('#retirerPiece').hide();
    },

    envoyer: function (o, b) {
        var me = this, g = o.down('#destinataires'), ids = Ext.Array.map(g.getSelectionModel().getSelection(), function (r) {
            return r.get('clientId');
        });
        var f = me.message(o, me.filtres(o));
        if (!ids.length) {
            return;
        }
        if (!f.modeleId && !f.message) {
            me.etat(o, 'Écrivez le message ou choisissez un modèle.', 'cmp-erreur');
            return;
        }
        me.confirmer(b, 'Confirmer l\'envoi à ' + ids.length + ' client(s)', function () {
            f.clientIds = ids;
            if (o.pieceJointe && /WHATSAPP/.test(f.canal || '')) {
                f.pieceJointe = o.pieceJointe;
            }
            b.disable();
            me.appel('POST', 'envoyer', f, function (r) {
                if (!r.success) {
                    b.enable();
                    me.etat(o, r.message, 'cmp-erreur');
                    return;
                }
                me.etat(o, r.message, 'cmp-ok');
                me.retirerPieceJointe(o);
                g.getSelectionModel().deselectAll();
                me.majBoutonEnvoi(o, 0);
            });
        });
    },

    /* ============================================================================================ fetes */

    calendrierFetes: function () {
        var me = this, annee = new Date().getFullYear(), annees = [];
        for (var a = annee - 1; a <= annee + 2; a++) {
            annees.push({a: a});
        }
        var store = Ext.create('Ext.data.Store', {fields: ['code', 'libelle', 'type', 'regle', {name: 'date', type: 'date', dateFormat: 'Y-m-d'}, {name: 'actif', type: 'boolean'}], data: []});
        return {
            xtype: 'gridpanel', itemId: 'calendrier', title: 'Calendrier des fêtes (cliquez pour l\'afficher ; les dates « à saisir » se renseignent ici)',
            collapsible: true, collapsed: true, titleCollapse: true, height: 250, margin: '6 8 0 8',
            store: store, columnLines: true,
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1})],
            tools: [{xtype: 'combobox', itemId: 'anneeFetes', width: 90, editable: false, queryMode: 'local', displayField: 'a', valueField: 'a', value: annee,
                    store: Ext.create('Ext.data.Store', {fields: ['a'], data: annees}),
                    listeners: {change: function () {
                            me.chargerFetes(me.down('#onglet-FETE'));
                        }}}],
            columns: [
                {xtype: 'checkcolumn', text: 'Active', dataIndex: 'actif', width: 70, listeners: {checkchange: function (c, i, actif) {
                            var r = store.getAt(i);
                            me.appel('POST', 'fetes/actif', {code: r.get('code'), actif: actif}, function (x) {
                                me.etat(me.down('#onglet-FETE'), x.success ? 'Fête « ' + r.get('libelle') + ' » ' + (actif ? 'activée.' : 'désactivée.') : x.message, x.success ? 'cmp-ok' : 'cmp-erreur');
                                if (x.success) {
                                    r.commit();
                                } else {
                                    r.reject();
                                }
                            });
                        }}},
                {text: 'Fête', dataIndex: 'libelle', flex: 1},
                {text: 'Type', dataIndex: 'type', width: 100, renderer: function (v) {
                        return v === 'NATIONALE' ? 'Nationale' : 'Religieuse';
                    }},
                {text: 'Date', dataIndex: 'date', width: 140, itemId: 'colDate', renderer: function (v, m, r) {
                        if (!v) {
                            return r.get('regle') === 'SAISIE' ? '<span class="cmp-motif">À saisir</span>' : '';
                        }
                        return Ext.Date.format(v, 'd/m/Y') + (r.get('regle') === 'SAISIE' ? ' <i class="fa fa-pencil" title="Date saisie"></i>' : '');
                    }, editor: {xtype: 'datefield', format: 'd/m/Y'}},
                {text: 'Calcul', dataIndex: 'regle', width: 150, renderer: function (v) {
                        return v === 'FIXE' ? 'Date fixe' : v === 'PAQUES' ? 'Calculée (Pâques)' : 'Saisie chaque année';
                    }}
            ],
            listeners: {
                afterrender: function (g) {
                    var p = g.findPlugin('cellediting');
                    /* seules les fetes « saisie chaque annee » ont une date modifiable */
                    p.on('beforeedit', function (ed, e) {
                        return e.record.get('regle') === 'SAISIE';
                    });
                    p.on('edit', function (ed, e) {
                        var annee = g.down('#anneeFetes').getValue();
                        me.appel('POST', 'fetes/date', {code: e.record.get('code'), annee: annee, date: e.value ? Ext.Date.format(e.value, 'Y-m-d') : null}, function (x) {
                            me.etat(me.down('#onglet-FETE'), x.success ? 'Date de « ' + e.record.get('libelle') + ' » enregistrée.' : x.message, x.success ? 'cmp-ok' : 'cmp-erreur');
                            me.chargerFetes(me.down('#onglet-FETE'));
                        });
                    });
                }
            }
        };
    },

    chargerFetes: function (o) {
        var me = this, g = o.down('#calendrier'), annee = g.down('#anneeFetes').getValue();
        me.appel('GET', 'fetes?annee=' + annee, null, function (r) {
            if (!r.success) {
                me.etat(o, r.message, 'cmp-erreur');
                return;
            }
            g.getStore().loadData(r.data || []);
            /* liste de choix : fetes actives de l'annee en cours et de la suivante, avec leur date */
            var c = o.down('#fete'), actuelle = c.getValue(), l = [];
            Ext.each(r.data || [], function (x) {
                if (x.actif) {
                    l.push({code: x.code, libelle: x.libelle, date: x.date, regle: x.regle,
                        affiche: x.libelle + (x.date ? ' — ' + Ext.Date.format(Ext.Date.parse(x.date, 'Y-m-d'), 'd/m/Y') : ' — date à saisir')});
                }
            });
            c.getStore().loadData(l);
            if (actuelle) {
                c.setValue(actuelle);
            } else {
                /* prochaine fete active (aujourd'hui compris), sinon la premiere de l'annee */
                var aujourdhui = Ext.Date.format(new Date(), 'Y-m-d'), prochaine = null;
                Ext.each(l, function (x) {
                    if (x.date && x.date >= aujourdhui && (!prochaine || x.date < prochaine.date)) {
                        prochaine = x;
                    }
                });
                prochaine = prochaine || l[0];
                if (prochaine) {
                    c.setValue(prochaine.code);
                    me.chargerPopulation(o);
                }
            }
        });
    },

    /* ============================================================================================ propositions */

    ongletPropositions: function () {
        var me = this;
        var store = me.storeDestinataires(), modeles = me.storeModeles(),
                liste = Ext.create('Ext.data.Store', {fields: ['id', 'titre', 'categorie', 'fete', 'jour', 'canal', 'modele', 'lignes', 'nb'], data: []});
        return {
            title: 'Propositions', itemId: 'ongletPropositions', iconCls: 'fa fa-inbox', layout: {type: 'vbox', align: 'stretch'},
            modeles: modeles,
            items: [
                {xtype: 'component', itemId: 'bandeau', html: ''},
                {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, padding: '8 8 0 8', items: [
                        {xtype: 'button', itemId: 'generer', text: 'Préparer les propositions du jour', iconCls: 'fa fa-magic', handler: function () {
                                me.genererPropositions();
                            }},
                        {xtype: 'component', flex: 1, margin: '0 0 0 12', html: '<span class="cmp-info">Anniversaires et fêtes du jour : rien ne part sans votre validation.</span>'}
                    ]},
                {xtype: 'container', flex: 1, layout: {type: 'hbox', align: 'stretch'}, padding: 8, items: [
                        {xtype: 'gridpanel', itemId: 'listePropositions', width: 330, title: 'À valider', store: liste,
                            viewConfig: {emptyText: '<div class="cmp-vide">Aucune proposition en attente.</div>', deferEmptyText: false},
                            columns: [{text: 'Proposition', dataIndex: 'titre', flex: 1}, {text: 'Messages', dataIndex: 'nb', width: 80, align: 'right'}],
                            listeners: {select: function (sm, r) {
                                    me.afficherProposition(r);
                                }}},
                        me.grilleDestinataires(store, {flex: 1, margin: '0 10', title: 'Destinataires (décochez ceux à exclure)', listeners: {cochage: function (g, n) {
                                    var b = me.down('#ongletPropositions #envoyerProposition');
                                    b.enConfirmation = false;
                                    b.removeCls('cmp-confirmer');
                                    b.texteInitial = null;
                                    b.setText(n > 0 ? 'Envoyer à ' + n + ' client(s)' : 'Envoyer');
                                    b.setDisabled(!(n > 0));
                                }}}),
                        {xtype: 'panel', width: 340, title: 'Envoi', bodyPadding: 8, layout: {type: 'vbox', align: 'stretch'}, items: [
                                {xtype: 'combobox', itemId: 'canal', fieldLabel: 'Canal', labelWidth: 50, editable: false, queryMode: 'local', value: 'WHATSAPP',
                                    displayField: 't', valueField: 'v', store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: me.CANAUX}),
                                    listeners: {change: function (c, v) {
                                            var o = me.down('#ongletPropositions');
                                            o.modeles.getProxy().setExtraParam('canal', v === 'SMS' ? 'SMS' : 'WHATSAPP');
                                            o.modeles.load();
                                        }}},
                                {xtype: 'combobox', itemId: 'modele', fieldLabel: 'Modèle', labelWidth: 50, editable: false, queryMode: 'local',
                                    displayField: 'libelle', valueField: 'id', store: modeles},
                                {xtype: 'button', itemId: 'envoyerProposition', margin: '12 0 0 0', scale: 'medium', text: 'Envoyer', disabled: true, iconCls: 'fa fa-paper-plane', handler: function (b) {
                                        me.envoyerProposition(b);
                                    }},
                                {xtype: 'button', itemId: 'abandonner', margin: '8 0 0 0', text: 'Abandonner la proposition', disabled: true, iconCls: 'fa fa-ban', handler: function (b) {
                                        me.abandonnerProposition(b);
                                    }}
                            ]}
                    ]},
                {xtype: 'component', itemId: 'etat', cls: 'cmp-etat'}
            ]
        };
    },

    chargerPropositions: function () {
        var me = this, o = me.down('#ongletPropositions'), g = o.down('#listePropositions');
        var auto = me.contexte && me.contexte.parametres && me.contexte.parametres.auto;
        o.down('#bandeau').update(auto ? '' : '<div class="cmp-bandeau"><i class="fa fa-info-circle"></i> La préparation automatique est désactivée '
                + '(onglet Paramètres). Vous pouvez préparer les propositions du jour à la demande.</div>');
        me.appel('GET', 'propositions', null, function (r) {
            if (!r.success) {
                me.etat(o, r.message, 'cmp-erreur');
                return;
            }
            Ext.each(r.data, function (p) {
                p.nb = Ext.Array.filter(p.lignes || [], function (l) {
                    return l.joignable;
                }).length;
            });
            g.getStore().loadData(r.data || []);
            o.setTitle('Propositions' + (r.messages ? ' (' + r.messages + ')' : ''));
            o.down('#destinataires').getStore().removeAll();
            o.down('#envoyerProposition').disable();
            o.down('#abandonner').disable();
            if (g.getStore().getCount()) {
                g.getSelectionModel().select(0);
            }
        });
    },

    afficherProposition: function (r) {
        var me = this, o = me.down('#ongletPropositions'), g = o.down('#destinataires');
        o.proposition = r;
        g.getStore().loadData(r.get('lignes') || []);
        me.cocherJoignables(g);
        o.down('#canal').setValue(r.get('canal') || 'SMS');
        o.modeles.getProxy().setExtraParam('canal', r.get('canal') === 'SMS' ? 'SMS' : 'WHATSAPP');
        o.modeles.load({callback: function () {
                o.down('#modele').setValue(r.get('modele'));
            }});
        o.down('#abandonner').enable();
        me.etat(o, '');
    },

    genererPropositions: function () {
        var me = this, o = me.down('#ongletPropositions');
        me.appel('POST', 'propositions/generer', null, function (r) {
            me.etat(o, r.success ? (r.proposes ? r.proposes + ' message(s) proposé(s).' : 'Aucun anniversaire ni fête à proposer aujourd\'hui (ou déjà proposés).') : r.message,
                    r.success ? 'cmp-ok' : 'cmp-erreur');
            me.chargerPropositions();
            me.rafraichirCloche();
        });
    },

    envoyerProposition: function (b) {
        var me = this, o = me.down('#ongletPropositions'), p = o.proposition, g = o.down('#destinataires');
        if (!p) {
            return;
        }
        var coches = {}, decoches = [];
        Ext.each(g.getSelectionModel().getSelection(), function (r) {
            coches[r.get('clientId')] = true;
        });
        g.getStore().each(function (r) {
            if (r.get('joignable') && !coches[r.get('clientId')]) {
                decoches.push(r.get('clientId'));
            }
        });
        var n = g.getSelectionModel().getCount();
        me.confirmer(b, 'Confirmer l\'envoi à ' + n + ' client(s)', function () {
            b.disable();
            me.appel('POST', 'propositions/' + encodeURIComponent(p.get('id')) + '/envoyer',
                    {decoches: decoches, canal: o.down('#canal').getValue(), modeleId: o.down('#modele').getValue()}, function (r) {
                me.etat(o, r.message, r.success ? 'cmp-ok' : 'cmp-erreur');
                if (!r.success) {
                    b.enable();
                    return;
                }
                me.chargerPropositions();
                me.rafraichirCloche();
            });
        });
    },

    abandonnerProposition: function (b) {
        var me = this, o = me.down('#ongletPropositions'), p = o.proposition;
        if (!p) {
            return;
        }
        me.confirmer(b, 'Confirmer : ne rien envoyer', function () {
            me.appel('POST', 'propositions/' + encodeURIComponent(p.get('id')) + '/abandonner', null, function (r) {
                me.etat(o, r.message, r.success ? 'cmp-ok' : 'cmp-erreur');
                me.chargerPropositions();
                me.rafraichirCloche();
            });
        });
    },

    rafraichirCloche: function () {
        if (typeof refreshNotificationBadge === 'function') {
            try {
                refreshNotificationBadge();
            } catch (e) {
            }
        }
    },

    /* ============================================================================================ listes de diffusion */

    /* retours du 25/10 (point 14) : listes nommees (creer, ajouter, retirer) ; l'envoi se fait depuis Infos clients,
     * Infos pharmacie ou Personnalise avec le filtre « Liste ». Les confirmations se font dans les boutons. */
    ongletListes: function () {
        var me = this;
        var cocheMembres = Ext.create('Ext.selection.CheckboxModel', {checkOnly: true}), cocheTrouves = Ext.create('Ext.selection.CheckboxModel', {checkOnly: true});
        return {
            title: 'Listes de diffusion', itemId: 'ongletListes', iconCls: 'fa fa-list-ul', layout: {type: 'hbox', align: 'stretch'}, bodyPadding: 8,
            items: [{xtype: 'gridpanel', itemId: 'listes', width: 330, title: 'Listes', columnLines: true, store: me.listesStore,
                    viewConfig: {emptyText: '<div class="cmp-vide">Aucune liste : donnez un nom puis « Créer ».</div>', deferEmptyText: false},
                    tbar: [{xtype: 'textfield', itemId: 'nomListe', emptyText: 'Nom de la nouvelle liste', flex: 1, maxLength: 80, enforceMaxLength: true,
                            listeners: {specialkey: function (c, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.creerListe();
                                    }
                                }}},
                        {xtype: 'button', itemId: 'creerListe', text: 'Créer', iconCls: 'fa fa-plus', handler: function () {
                                me.creerListe();
                            }}],
                    columns: [{text: 'Nom', dataIndex: 'nom', flex: 1}, {text: 'Clients', dataIndex: 'nombre', width: 70, align: 'right'}],
                    bbar: [{xtype: 'button', itemId: 'supprimerListe', text: 'Supprimer la liste', iconCls: 'fa fa-trash', disabled: true, handler: function (b) {
                                var l = me.listeChoisie();
                                if (l) {
                                    me.confirmer(b, 'Confirmer : supprimer « ' + l.get('nom') + ' »', function () {
                                        me.appel('POST', 'listes/' + encodeURIComponent(l.get('id')) + '/supprimer', {}, function (r) {
                                            me.etat(me.down('#ongletListes'), r.success ? 'Liste supprimée.' : r.message, r.success ? 'cmp-info' : 'cmp-erreur');
                                            me.chargerListes();
                                        });
                                    });
                                }
                            }}],
                    listeners: {selectionchange: function (sm, sel) {
                            me.down('#ongletListes #supprimerListe').setDisabled(!sel.length);
                            me.down('#ongletListes #rechercheClient').setDisabled(!sel.length);
                            me.chargerMembres();
                        }}},
                {xtype: 'gridpanel', itemId: 'membres', flex: 1, margin: '0 0 0 10', title: 'Clients de la liste', columnLines: true, selModel: cocheMembres,
                    store: Ext.create('Ext.data.Store', {fields: ['clientId', 'client', 'telephone', 'ajouteLe'], data: []}),
                    viewConfig: {emptyText: '<div class="cmp-vide">Choisissez une liste.</div>', deferEmptyText: false},
                    columns: [{text: 'Client', dataIndex: 'client', flex: 1}, {text: 'Téléphone', dataIndex: 'telephone', width: 130}, {text: 'Ajouté le', dataIndex: 'ajouteLe', width: 100}],
                    bbar: [{xtype: 'button', itemId: 'retirerMembres', text: 'Retirer les clients cochés', iconCls: 'fa fa-minus', disabled: true, handler: function (b) {
                                var ids = Ext.Array.map(cocheMembres.getSelection(), function (r) {
                                    return r.get('clientId');
                                });
                                me.confirmer(b, 'Confirmer : retirer ' + ids.length + ' client(s)', function () {
                                    me.modifierMembres('retirer', ids);
                                });
                            }}],
                    listeners: {selectionchange: function (sm, sel) {
                            me.down('#ongletListes #retirerMembres').setDisabled(!sel.length);
                        }}},
                {xtype: 'gridpanel', itemId: 'trouves', flex: 1, margin: '0 0 0 10', title: 'Ajouter des clients', columnLines: true, selModel: cocheTrouves,
                    store: Ext.create('Ext.data.Store', {fields: ['clientId', 'client', 'telephone'], data: []}),
                    viewConfig: {emptyText: '<div class="cmp-vide">Nom ou téléphone : 3 caractères au moins.</div>', deferEmptyText: false},
                    tbar: [{xtype: 'textfield', itemId: 'rechercheClient', emptyText: 'Nom ou téléphone', flex: 1, disabled: true,
                            listeners: {change: {buffer: 400, fn: function (c, v) {
                                        me.chercherClients(v);
                                    }}}}],
                    columns: [{text: 'Client', dataIndex: 'client', flex: 1}, {text: 'Téléphone', dataIndex: 'telephone', width: 130}],
                    bbar: [{xtype: 'button', itemId: 'ajouterMembres', text: 'Ajouter les clients cochés', iconCls: 'fa fa-plus', disabled: true, handler: function () {
                                me.modifierMembres('ajouter', Ext.Array.map(cocheTrouves.getSelection(), function (r) {
                                    return r.get('clientId');
                                }));
                            }}],
                    listeners: {selectionchange: function (sm, sel) {
                            me.down('#ongletListes #ajouterMembres').setDisabled(!sel.length || !me.listeChoisie());
                        }}}],
            dockedItems: [{xtype: 'component', dock: 'bottom', itemId: 'etat', cls: 'cmp-etat'}]
        };
    },

    listeChoisie: function () {
        var g = this.down('#ongletListes #listes');
        return g ? g.getSelectionModel().getSelection()[0] : null;
    },

    chargerListes: function () {
        var me = this;
        me.appel('GET', 'listes', null, function (r) {
            if (!r.success) {
                return;
            }
            var choisie = me.listeChoisie(), id = choisie ? choisie.get('id') : null;
            Ext.each(r.data || [], function (l) {
                l.affiche = l.nom + ' (' + l.nombre + ')';
            });
            me.listesStore.loadData(r.data || []);
            var g = me.down('#ongletListes #listes'), rec = id ? me.listesStore.getById(id) || me.listesStore.findRecord('id', id, 0, false, true, true) : null;
            if (g && rec) {
                g.getSelectionModel().select(rec, false, true);
            }
        });
    },

    creerListe: function () {
        var me = this, o = me.down('#ongletListes'), c = o.down('#nomListe'), nom = Ext.String.trim(c.getValue() || '');
        if (!nom) {
            me.etat(o, 'Donnez un nom à la liste.', 'cmp-erreur');
            return;
        }
        me.appel('POST', 'listes', {nom: nom}, function (r) {
            if (!r.success) {
                me.etat(o, r.message, 'cmp-erreur');
                return;
            }
            c.setValue('');
            me.etat(o, 'Liste « ' + nom + ' » créée : ajoutez des clients à droite.', 'cmp-info');
            me.appel('GET', 'listes', null, function (l) {
                Ext.each(l.data || [], function (x) {
                    x.affiche = x.nom + ' (' + x.nombre + ')';
                });
                me.listesStore.loadData(l.data || []);
                var rec = me.listesStore.findRecord('id', r.id, 0, false, true, true);
                if (rec) {
                    o.down('#listes').getSelectionModel().select(rec);
                }
            });
        });
    },

    chargerMembres: function () {
        var me = this, o = me.down('#ongletListes'), g = o.down('#membres'), l = me.listeChoisie();
        g.getStore().removeAll();
        g.setTitle(l ? 'Clients de « ' + Ext.String.htmlEncode(l.get('nom')) + ' »' : 'Clients de la liste');
        if (!l) {
            return;
        }
        me.appel('GET', 'listes/' + encodeURIComponent(l.get('id')) + '/clients', null, function (r) {
            if (r.success) {
                g.getStore().loadData(r.data || []);
            }
        });
    },

    chercherClients: function (texte) {
        var me = this, g = me.down('#ongletListes #trouves');
        if (Ext.String.trim(texte || '').length < 3) {
            g.getStore().removeAll();
            return;
        }
        me.appel('GET', 'clients?q=' + encodeURIComponent(texte), null, function (r) {
            if (r.success) {
                g.getStore().loadData(r.data || []);
            }
        });
    },

    modifierMembres: function (action, ids) {
        var me = this, o = me.down('#ongletListes'), l = me.listeChoisie();
        if (!l || !ids.length) {
            return;
        }
        me.appel('POST', 'listes/' + encodeURIComponent(l.get('id')) + '/' + action, {clientIds: ids}, function (r) {
            if (!r.success) {
                me.etat(o, r.message, 'cmp-erreur');
                return;
            }
            me.etat(o, action === 'ajouter' ? r.ajoutes + ' client(s) ajouté(s).' : r.retires + ' client(s) retiré(s).', 'cmp-info');
            if (action === 'ajouter') {
                o.down('#trouves').getSelectionModel().deselectAll();
            }
            me.chargerMembres();
            me.chargerListes();
        });
    },

    /* ============================================================================================ journal */

    ongletJournal: function () {
        var me = this;
        return {
            title: 'Journal', itemId: 'ongletJournal', iconCls: 'fa fa-history', layout: 'border',
            items: [{xtype: 'gridpanel', itemId: 'journal', columnLines: true, region: 'center',
                    store: Ext.create('Ext.data.Store', {fields: ['id', 'titre', 'origine', 'statut', 'canal', 'modele', 'cibles', 'envoyes', 'exclus', 'partis',
                            'distribues', 'lus', 'repondus', 'echecs', 'quand', 'auteur', 'accordExplicite'], data: []}),
                    listeners: {select: function (g, r) {
                            me.chargerSuivi(r);
                        }},
                    viewConfig: {emptyText: '<div class="cmp-vide">Aucune campagne.</div>', deferEmptyText: false},
                    columns: [
                        {text: 'Date', dataIndex: 'quand', width: 130},
                        {text: 'Campagne', dataIndex: 'titre', flex: 1, minWidth: 200},
                        {text: 'Origine', dataIndex: 'origine', width: 100},
                        {text: 'Statut', dataIndex: 'statut', width: 100, renderer: function (v) {
                                return {ENVOYEE: 'Envoyée', ABANDONNEE: 'Abandonnée', EXPIREE: 'Expirée'}[v] || v;
                            }},
                        {text: 'Canal', dataIndex: 'canal', width: 140},
                        {text: 'Modèle', dataIndex: 'modele', width: 160},
                        {text: 'Clients', dataIndex: 'cibles', width: 70, align: 'right'},
                        {text: 'Préparés', dataIndex: 'envoyes', width: 80, align: 'right'},
                        {text: 'Partis', dataIndex: 'partis', width: 70, align: 'right'},
                        {text: 'Distribués', dataIndex: 'distribues', width: 85, align: 'right'},
                        {text: 'Lus', dataIndex: 'lus', width: 55, align: 'right'},
                        {text: 'Répondus', dataIndex: 'repondus', width: 85, align: 'right'},
                        {text: 'Échecs', dataIndex: 'echecs', width: 65, align: 'right'},
                        {text: 'Écartés', dataIndex: 'exclus', width: 70, align: 'right'},
                        {text: 'Par', dataIndex: 'auteur', width: 140}
                    ]},
                /* retours du 25/10 (point 14) : suivi message par message de la campagne choisie, sous le journal */
                {xtype: 'gridpanel', itemId: 'suivi', region: 'south', height: 300, split: true, columnLines: true, title: 'Suivi des messages',
                    store: Ext.create('Ext.data.Store', {fields: ['client', 'telephone', 'etat', 'motif', 'repondu', 'envoyeLe'], data: []}),
                    viewConfig: {emptyText: '<div class="cmp-vide">Cliquez sur une campagne du journal pour suivre ses messages.</div>', deferEmptyText: false},
                    tbar: [{xtype: 'component', itemId: 'suiviTotaux', html: ''}],
                    columns: [
                        {text: 'Client', dataIndex: 'client', flex: 1, minWidth: 200},
                        {text: 'Téléphone', dataIndex: 'telephone', width: 130},
                        {text: 'Envoyé le', dataIndex: 'envoyeLe', width: 130},
                        {text: 'État', dataIndex: 'etat', width: 110, renderer: function (v) {
                                var c = {'Lu': '#1e8449', 'Distribué': '#2471a3', 'Échec': '#c0392b', 'Exclu': '#7f8c8d'}[v];
                                return c ? '<span style="color:' + c + ';font-weight:600">' + v + '</span>' : v;
                            }},
                        {text: 'Répondu', dataIndex: 'repondu', width: 85, align: 'center', renderer: function (v) {
                                return v ? '<span style="color:#1e8449;font-weight:600">Oui</span>' : '';
                            }},
                        {text: 'Motif d\'exclusion', dataIndex: 'motif', width: 220}
                    ]}],
            dockedItems: [{xtype: 'component', dock: 'bottom', itemId: 'etat', cls: 'cmp-etat'}]
        };
    },

    chargerJournal: function () {
        var me = this, o = me.down('#ongletJournal');
        me.appel('GET', 'journal', null, function (r) {
            if (!r.success) {
                me.etat(o, r.message, 'cmp-erreur');
                return;
            }
            o.down('#journal').getStore().loadData(r.data || []);
        });
    },

    chargerSuivi: function (campagne, rafraichir) {
        var me = this, o = me.down('#ongletJournal'), g = o.down('#suivi'), totaux = g.down('#suiviTotaux');
        clearTimeout(me.minuteurSuivi);
        if (!rafraichir) {
            g.setTitle('Suivi des messages : ' + Ext.String.htmlEncode(campagne.get('titre')));
            g.getStore().removeAll();
            totaux.update('Chargement…');
        }
        me.appel('GET', encodeURIComponent(campagne.get('id')) + '/suivi', null, function (r) {
            if (me.isDestroyed) {
                return;
            }
            /* evolution des envois : le suivi se met a jour toutes les 20 s tant que le journal est affiche et la campagne choisie */
            me.minuteurSuivi = setTimeout(function () {
                var j = me.isDestroyed ? null : o.down('#journal');
                if (j && me.getActiveTab() === o && me.isVisible(true) && j.getSelectionModel().isSelected(campagne)) {
                    me.chargerSuivi(campagne, true);
                }
            }, 20000);
            if (!r.success) {
                totaux.update('');
                me.etat(o, r.message, 'cmp-erreur');
                return;
            }
            var t = r.totaux || {};
            totaux.update('<b>Envoyés : ' + (t.envoyes || 0) + '</b> · Distribués : ' + (t.distribues || 0) + ' · Lus : ' + (t.lus || 0)
                    + ' · Répondus : ' + (t.repondus || 0) + ' · Échecs : ' + (t.echecs || 0) + ' · En attente : ' + (t.enAttente || 0)
                    + ' · Écartés : ' + (t.exclus || 0));
            g.getStore().loadData(r.data || []);
        });
    },

    /* ============================================================================================ parametres */

    ongletParametres: function () {
        var me = this, modeles = me.storeModeles();
        modeles.getProxy().setExtraParam('canal', '');
        return {
            title: 'Paramètres', itemId: 'ongletParametres', iconCls: 'fa fa-cog', bodyPadding: 14, autoScroll: true, modeles: modeles,
            defaults: {labelWidth: 260, width: 620},
            items: [
                {xtype: 'component', html: '<div class="cmp-aide" style="margin:0 0 12px">Le volet automatique PRÉPARE chaque matin (7 h 30) une proposition '
                            + 'pour les anniversaires et les fêtes du jour. Rien n\'est envoyé sans validation dans l\'onglet Propositions ; '
                            + 'le nombre de messages à valider apparaît dans la cloche.</div>'},
                {xtype: 'checkbox', itemId: 'auto', fieldLabel: 'Préparation automatique', boxLabel: 'Activée'},
                {xtype: 'checkbox', itemId: 'anniversaires', fieldLabel: 'Proposer les anniversaires', boxLabel: 'Oui'},
                {xtype: 'checkbox', itemId: 'fetes', fieldLabel: 'Proposer les fêtes', boxLabel: 'Oui'},
                {xtype: 'combobox', itemId: 'canal', fieldLabel: 'Canal proposé', editable: false, queryMode: 'local', displayField: 't', valueField: 'v',
                    store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: me.CANAUX})},
                {xtype: 'combobox', itemId: 'modeleAnniversaire', fieldLabel: 'Modèle des anniversaires', editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'id', store: modeles},
                {xtype: 'combobox', itemId: 'modeleFete', fieldLabel: 'Modèle des fêtes', editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'id', store: modeles},
                {xtype: 'button', itemId: 'enregistrer', text: 'Enregistrer', iconCls: 'fa fa-save', width: 160, margin: '10 0 0 265', handler: function () {
                        me.enregistrerParametres();
                    }},
                {xtype: 'component', itemId: 'etat', cls: 'cmp-etat', margin: '10 0 0 0'}
            ]
        };
    },

    chargerParametres: function () {
        var me = this, o = me.down('#ongletParametres');
        o.modeles.load({callback: function () {
                me.appel('GET', 'parametres', null, function (r) {
                    if (!r.success) {
                        me.etat(o, r.message, 'cmp-erreur');
                        return;
                    }
                    Ext.Object.each(r.data, function (k, v) {
                        var c = o.down('#' + k);
                        if (c) {
                            c.setValue(v);
                        }
                    });
                });
            }});
    },

    enregistrerParametres: function () {
        var me = this, o = me.down('#ongletParametres'), d = {};
        Ext.each(['auto', 'anniversaires', 'fetes', 'canal', 'modeleAnniversaire', 'modeleFete'], function (k) {
            d[k] = o.down('#' + k).getValue();
        });
        me.appel('POST', 'parametres', d, function (r) {
            me.etat(o, r.message, r.success ? 'cmp-ok' : 'cmp-erreur');
            if (r.success && me.contexte) {
                me.contexte.parametres = r.data;
            }
        });
    }
});
