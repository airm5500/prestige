/* global Ext */

/*
 * Retours du 10/10 (section 13) : « Rappels traitement » en deux onglets :
 *  - Liste : l'ecran existant (rappelshabitude), sans changement de fonctionnement ;
 *  - Analyse : rappels de la periode (date prevue), a preparer / prepares / ecartes / rachetes, envoyes par canal,
 *    rachetes apres rappel (efficacite) et evolution par mois. Une tuile de statut ouvre la liste correspondante.
 * Le menu ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants, ses gestionnaires et ses tests.
 * Plan avoir du 08/11, point 5 :
 *  - aide « ? » : ce que montre la liste affichee d'office et ce que veut dire « preparer » (bandeau, pas de fenetre) ;
 *  - Ciblage libre : « clients ayant acheté » un produit, une famille ou une DCI sur une periode, avec un nombre
 *    minimal d'achats, puis « Envoyer aux résultats » (confirmation dans le bouton). Meme API que les campagnes
 *    (v1/rappels-habitude/ciblage -> CampagneService.population) ; l'onglet « Rappels traitement » des campagnes est
 *    ce meme ecran.
 */
Ext.define('testextjs.view.configmanagement.client.rappels.RappelsTraitement', {
    extend: 'Ext.panel.Panel',
    xtype: 'rappelstraitement',
    requires: ['testextjs.view.configmanagement.client.rappels.RappelsHabitudeManager'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub rp-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'liste', texte: 'Liste', aide: 'Traitements à préparer et rappels à envoyer'},
        {cle: 'analyse', texte: 'Analyse', aide: 'Rappels préparés, écartés, envoyés par canal, rachetés après rappel, par mois'},
        {cle: 'ciblage', texte: 'Ciblage libre', aide: 'Clients ayant acheté un produit, une famille ou une DCI : leur envoyer un rappel'}],

    AIDE: '<div class="rp-aide-t">Ce que montre la liste affichée d\'office</div>'
            + '<p>Les traitements à renouveler <b>maintenant</b>. Prestige repère les <b>habitudes d\'achat</b> : un client qui a acheté '
            + 'le même produit <b>au moins 3 fois en un an</b>, avec <b>35 jours d\'écart au plus</b> entre deux achats (réglages par défaut). '
            + 'Il en déduit la date probable du prochain achat ; quand elle tombe <b>dans les 3 jours</b>, la ligne apparaît « À préparer ». '
            + 'Le calcul tourne chaque matin à 7 h 13, ou par « Actualiser la liste ». Quand le client rachète, la ligne passe à « Racheté ».</p>'
            + '<div class="rp-aide-t">Que veut dire « préparer » ?</div>'
            + '<p>Préparer le traitement du client (pilulier, produits mis de côté), puis lui envoyer le message de rappel '
            + '(« Envoyer le rappel », par SMS ou WhatsApp). « Marquer préparé » note que c\'est fait ; « Écarter » retire la ligne '
            + 'sans rien envoyer.</p>'
            + '<div class="rp-aide-t">Ciblage libre</div>'
            + '<p>Pour écrire à d\'autres clients que ceux de la liste : choisissez un produit, une famille ou une DCI, une période '
            + 'et un nombre minimal d\'achats. Prestige liste les clients concernés ; « Envoyer aux résultats » leur écrit '
            + '(SMS ou WhatsApp, avec un modèle de message). Le consentement et le numéro de chaque client sont contrôlés ; '
            + 'l\'envoi figure dans le journal des campagnes (« Rappel traitement »).</p>',

    CANAUX: {SMS: 'SMS', WHATSAPP: 'WhatsApp', SMS_WHATSAPP: 'WhatsApp (repli SMS)', NON_RENSEIGNE: 'Canal non renseigné'},

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.configmanagement.client.rappels.RappelsHabitudeManager', {header: false});
        me.habiller(me.liste);
        me.analyse = me.creerAnalyse();
        me.styles();
        me.ciblage = me.creerCiblage();
        Ext.apply(me, {
            items: [me.liste, me.analyse, me.ciblage],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsRp', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'rp-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'rp-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'liste', tooltip: o.aide, handler: function () {
                                me.afficher(o.cle);
                            }};
                    }).concat(['->', {xtype: 'button', itemId: 'rp-aide', text: '?', enableToggle: true, cls: 'rp-bouton-aide',
                            tooltip: 'Comment fonctionnent les rappels des traitements', toggleHandler: function (b, ouvert) {
                                me.down('#rp-texte-aide').setVisible(ouvert);
                            }}])
                }, {xtype: 'component', dock: 'top', itemId: 'rp-texte-aide', hidden: true, cls: 'rp-aide', html: me.AIDE}]
        });
        me.callParent(arguments);
    },

    habiller: function (ecran) {
        var A = window.PrestigeAffichage;
        if (!A) {
            return;
        }
        if (Ext.Array.some(A.ECRANS_STYLE_VENTE || [], function (x) {
            return ecran.isXType(x);
        }) || A.THEME_PARTOUT) {
            A.habillerStyleVente(ecran);
        }
    },

    afficher: function (cle) {
        var me = this;
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#rp-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'analyse') {
            me.getLayout().setActiveItem(me.analyse);
            me.chargerAnalyse();
            return me.analyse;
        }
        if (cle === 'ciblage') {
            me.getLayout().setActiveItem(me.ciblage);
            me.initialiserCiblage();
            return me.ciblage;
        }
        me.getLayout().setActiveItem(me.liste);
        return me.liste;
    },

    /** Tuile de statut : la liste de ces rappels sur la meme periode. */
    ouvrirListe: function (statut) {
        var me = this, a = me.analyse, l = me.liste;
        l.down('#statut').setValue(statut);
        l.down('#du').setValue(a.down('#anDebut').getValue());
        l.down('#au').setValue(a.down('#anFin').getValue());
        l.down('#query').setValue('');
        me.afficher('liste');
        l.rechercher();
    },

    creerAnalyse: function () {
        var me = this, aujourdhui = new Date();
        return Ext.create('Ext.panel.Panel', {
            itemId: 'analyseRappels', autoScroll: true, bodyPadding: 12, cls: 'rp-analyse',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'anDebut', fieldLabel: 'Prévus du', labelWidth: 60, width: 175, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.add(Ext.Date.getFirstDateOfMonth(aujourdhui), Ext.Date.MONTH, -5),
                            tooltip: 'Date prévue du prochain achat : début de la période'},
                        {xtype: 'datefield', itemId: 'anFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.add(aujourdhui, Ext.Date.DAY, 30), tooltip: 'Date prévue du prochain achat : fin de la période'},
                        {text: 'Actualiser', itemId: 'anActualiser', iconCls: 'refresh', tooltip: 'Recalculer l\'analyse sur la période', handler: function () {
                                me.chargerAnalyse();
                            }}]}],
            items: [{xtype: 'component', itemId: 'anContenu', html: '<div style="color:#7f8c8d">Chargement…</div>',
                    listeners: {afterrender: function (c) {
                            c.getEl().on('click', function (e) {
                                var t = e.getTarget('[data-statut]');
                                if (t) {
                                    me.ouvrirListe(t.getAttribute('data-statut'));
                                }
                            });
                        }}}]
        });
    },

    criteresAnalyse: function () {
        var a = this.analyse;
        return {dtStart: a.down('#anDebut').getSubmitValue(), dtEnd: a.down('#anFin').getSubmitValue()};
    },

    chargerAnalyse: function () {
        var me = this, a = me.analyse, contenu = a.down('#anContenu'), c = me.criteresAnalyse();
        if (c.dtStart && c.dtEnd && c.dtStart > c.dtEnd) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        a.setLoading('Calcul…');
        Ext.Ajax.request({url: '../api/v1/rappels-habitude/analyse', method: 'GET', params: c, timeout: 120000,
            success: function (r) {
                if (a.isDestroyed) {
                    return;
                }
                a.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Analyse indisponible') + '</span>');
                    return;
                }
                me.donnees = o;
                contenu.update(me.htmlAnalyse(o));
            },
            failure: function (r) {
                if (a.isDestroyed) {
                    return;
                }
                a.setLoading(false);
                contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
            }});
    },

    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    libelleMois: function (m) {
        var p = String(m || '').split('-');
        return p.length === 2 ? this.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0] : m;
    },

    htmlAnalyse: function (o) {
        var me = this, enc = Ext.String.htmlEncode, t = o.total || {}, pct = function (n, d) {
            return d ? Math.round(n * 100 / d) + ' %' : '—';
        };
        var tuile = function (cls, titre, valeur, detail, aide, statut) {
            return '<div class="pml-tuile ' + cls + (statut ? ' rp-cliquable' : '') + '"' + (statut ? ' data-statut="' + statut + '"' : '')
                    + ' data-qtip="' + enc(aide + (statut ? ' — cliquer pour voir la liste' : '')) + '"><div class="pml-tuile-valeur">' + valeur
                    + '</div><div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var canaux = [];
        Ext.Object.each(t.canaux || {}, function (k, v) {
            canaux.push(enc(me.CANAUX[k] || k) + ' ' + v);
        });
        var html = '<div class="pml-tuiles rp-tuiles">'
                + tuile('info', 'Rappels', t.total, 'sur la période', 'Rappels dont la date prévue est dans la période', 'TOUS')
                + tuile(t.aPreparer ? 'alerte' : 'ok', 'À préparer', t.aPreparer, pct(t.aPreparer, t.total), 'Encore à préparer', 'A_PREPARER')
                + tuile('ok', 'Préparés', t.prepares, pct(t.prepares, t.total), 'Traitement préparé (pilulier, mise de côté)', 'PREPARE')
                + tuile('', 'Écartés', t.ecartes, pct(t.ecartes, t.total), 'Écartés par l\'équipe', 'ECARTE')
                + tuile('info', 'Envoyés', t.envoyes, canaux.join(' · ') || 'aucun envoi', '« Envoyé » n\'est pas un statut : rappel parti, quel que soit le statut')
                + tuile(t.rachetesApresEnvoi ? 'ok' : '', 'Rachetés après rappel', t.rachetesApresEnvoi, String(t.efficacite).replace('.', ',') + ' % des envoyés',
                        'Efficacité : rachetés après un rappel envoyé ÷ rappels envoyés', 'ACHETE')
                + tuile('', 'Rachetés sans rappel', t.rachetesSansEnvoi, pct(t.rachetesSansEnvoi, t.rachetes) + ' des rachats', 'Rachetés sans qu\'un rappel ait été envoyé')
                + '</div>';
        var lignes = '';
        Ext.each(o.mois || [], function (m) {
            var c = [];
            Ext.Object.each(m.canaux || {}, function (k, v) {
                c.push(enc(me.CANAUX[k] || k) + ' ' + v);
            });
            lignes += '<tr class="rp-mois"><td>' + enc(me.libelleMois(m.mois)) + '</td><td class="n">' + m.total + '</td><td class="n">' + m.aPreparer
                    + '</td><td class="n">' + m.prepares + '</td><td class="n">' + m.ecartes + '</td><td class="n">' + m.envoyes + '</td><td>' + c.join(' · ')
                    + '</td><td class="n">' + m.rachetes + '</td><td class="n">' + m.rachetesApresEnvoi + '</td><td class="n">'
                    + String(m.efficacite).replace('.', ',') + ' %</td></tr>';
        });
        html += '<div class="ac-bloc-t" style="margin-top:14px">Évolution par mois (date prévue)</div>'
                + '<table class="ac-table rp-par-mois"><tr><th>Mois</th><th class="n">Rappels</th><th class="n">À préparer</th><th class="n">Préparés</th>'
                + '<th class="n">Écartés</th><th class="n">Envoyés</th><th>Canaux</th><th class="n">Rachetés</th><th class="n">Après rappel</th>'
                + '<th class="n">Efficacité</th></tr>'
                + (lignes || '<tr><td colspan="10" style="color:#7f8c8d">Aucun rappel sur la période.</td></tr>') + '</table>';
        return html;
    },

    /* ============================================================================================ ciblage libre */

    URL_CIBLAGE: '../api/v1/rappels-habitude/ciblage',
    CANAUX_CIBLAGE: [{v: 'WHATSAPP', t: 'WhatsApp'}, {v: 'SMS', t: 'SMS'}, {v: 'SMS_WHATSAPP', t: 'WhatsApp, repli SMS'}],

    styles: function () {
        if (document.getElementById('rp-ciblage-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet('.rp-aide{margin:6px 8px;padding:8px 12px;border-radius:6px;background:#f4f6f8;color:#34495e;line-height:1.45}'
                + '.rp-aide p{margin:2px 0 8px}.rp-aide-t{font-weight:bold;color:#1f4e79}'
                + '.x-btn.rp-bouton-aide .x-btn-inner{font-weight:bold;font-size:14px}'
                + '.rp-etat{padding:4px 10px;min-height:22px}.rp-ok{color:#1e8449;font-weight:bold}.rp-erreur{color:#c0392b;font-weight:bold}.rp-info{color:#34495e}'
                + '.rp-joignable{color:#1e8449}.rp-motif{color:#c0392b}'
                + '.x-btn.rp-confirmer{background:#c0392b !important;border-color:#922b21 !important}.x-btn.rp-confirmer .x-btn-inner{color:#fff !important}',
                'rp-ciblage-styles');
    },

    etatCiblage: function (texte, classe) {
        var e = this.ciblage.down('#cbEtat');
        if (e) {
            e.update(texte ? '<span class="' + (classe || 'rp-info') + '">' + Ext.String.htmlEncode(texte) + '</span>' : '');
        }
    },

    appelCiblage: function (methode, chemin, corps, rappel) {
        Ext.Ajax.request({url: this.URL_CIBLAGE + chemin, method: methode, jsonData: corps || undefined, timeout: 120000,
            success: function (r) {
                rappel(Ext.decode(r.responseText, true) || {success: false, message: 'Réponse illisible.'});
            },
            failure: function (r) {
                rappel({success: false, message: r.status === 401 ? 'Session expirée.' : 'Le serveur ne répond pas.'});
            }});
    },

    creerCiblage: function () {
        var me = this, aujourdhui = new Date();
        var references = Ext.create('Ext.data.Store', {fields: ['id', 'libelle', 'affiche'],
            proxy: {type: 'ajax', url: me.URL_CIBLAGE + '/references', extraParams: {type: 'PRODUIT'}, reader: {type: 'json', root: 'data'}}});
        var resultats = Ext.create('Ext.data.Store', {fields: ['clientId', 'client', 'telephone', {name: 'achats', type: 'int'}, {name: 'montant', type: 'int'},
                'dernierAchat', {name: 'joignable', type: 'boolean'}, 'motif'], data: [],
            sorters: [{property: 'joignable', direction: 'DESC'}, {property: 'client', direction: 'ASC'}]});
        var modeles = Ext.create('Ext.data.Store', {fields: ['id', 'libelle', 'canal', 'contenu'],
            proxy: {type: 'ajax', url: '../api/v1/modeles-messages', extraParams: {canal: 'WHATSAPP'}, reader: {type: 'json', root: 'data'}}});
        var nombre = function (v) {
            return Ext.util.Format.number(v || 0, '0,000').replace(/,/g, ' ');
        };
        return Ext.create('Ext.panel.Panel', {
            itemId: 'ciblageRappels', layout: {type: 'vbox', align: 'stretch'}, border: false,
            references: references, modeles: modeles,
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'cbFiltres', items: [
                        {xtype: 'combobox', itemId: 'cbType', width: 100, editable: false, queryMode: 'local', value: 'PRODUIT', displayField: 't', valueField: 'v',
                            tooltip: 'Ce que les clients ont acheté', store: Ext.create('Ext.data.Store', {fields: ['v', 't'],
                                data: [{v: 'PRODUIT', t: 'Produit'}, {v: 'FAMILLE', t: 'Famille'}, {v: 'DCI', t: 'DCI'}]}),
                            listeners: {change: function (c, v) {
                                    var ref = me.ciblage.down('#cbReference');
                                    references.getProxy().setExtraParam('type', v);
                                    references.removeAll();
                                    ref.clearValue();
                                    ref.lastQuery = null;
                                }}},
                        {xtype: 'combobox', itemId: 'cbReference', width: 280, store: references, queryMode: 'remote', queryParam: 'q', minChars: 2,
                            displayField: 'affiche', valueField: 'id', hideTrigger: true, typeAhead: false, forceSelection: true,
                            emptyText: 'Nom ou CIP (2 lettres au moins)', tooltip: 'Le produit, la famille ou la DCI achetés'},
                        {xtype: 'datefield', itemId: 'cbDu', fieldLabel: 'Achats du', labelWidth: 58, width: 168, format: 'd/m/Y',
                            value: Ext.Date.add(aujourdhui, Ext.Date.MONTH, -6)},
                        {xtype: 'datefield', itemId: 'cbAu', fieldLabel: 'au', labelWidth: 18, width: 128, format: 'd/m/Y', value: aujourdhui},
                        {xtype: 'numberfield', itemId: 'cbMin', fieldLabel: 'Achats au moins', labelWidth: 95, width: 150, value: 2, minValue: 1, maxValue: 1000,
                            allowDecimals: false, tooltip: 'Nombre minimal d\'achats (ventes) sur la période'},
                        {xtype: 'button', itemId: 'cbChercher', text: 'Rechercher', iconCls: 'searchicon', handler: function () {
                                me.chercherCiblage();
                            }}]}],
            items: [{xtype: 'container', flex: 1, layout: {type: 'hbox', align: 'stretch'}, padding: 8, items: [
                        {xtype: 'gridpanel', itemId: 'cbResultats', flex: 3, title: 'Clients ayant acheté', columnLines: true, store: resultats,
                            selModel: Ext.create('Ext.selection.CheckboxModel', {checkOnly: true, listeners: {beforeselect: function (sm, r) {
                                        return r.get('joignable');
                                    }}}),
                            viewConfig: {emptyText: '<div style="padding:20px;color:#7f8c8d">Choisissez le produit, la famille ou la DCI, puis « Rechercher ».</div>',
                                deferEmptyText: false, markDirty: false},
                            columns: [{text: 'Client', dataIndex: 'client', flex: 1, minWidth: 170},
                                {text: 'Téléphone', dataIndex: 'telephone', width: 110},
                                {text: 'Achats', dataIndex: 'achats', width: 65, align: 'right'},
                                {text: 'Montant', dataIndex: 'montant', width: 90, align: 'right', renderer: nombre},
                                {text: 'Dernier achat', dataIndex: 'dernierAchat', width: 95, renderer: function (v) {
                                        return v ? Ext.Date.format(Ext.Date.parse(v, 'Y-m-d'), 'd/m/Y') : '';
                                    }},
                                {text: 'État', dataIndex: 'motif', width: 190, renderer: function (v, m, r) {
                                        return r.get('joignable') ? '<span class="rp-joignable">Joignable</span>' : '<span class="rp-motif">' + Ext.String.htmlEncode(v) + '</span>';
                                    }}],
                            listeners: {selectionchange: function (sm, sel) {
                                    me.majEnvoiCiblage(sel.length);
                                }}},
                        {xtype: 'panel', itemId: 'cbMessage', flex: 2, margin: '0 0 0 10', title: 'Message', bodyPadding: 8, layout: {type: 'vbox', align: 'stretch'}, items: [
                                {xtype: 'combobox', itemId: 'cbCanal', fieldLabel: 'Canal', labelWidth: 50, editable: false, queryMode: 'local', value: 'WHATSAPP',
                                    displayField: 't', valueField: 'v', store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: me.CANAUX_CIBLAGE}),
                                    listeners: {change: function (c, v) {
                                            me.chargerModelesCiblage(v);
                                        }}},
                                {xtype: 'combobox', itemId: 'cbModele', fieldLabel: 'Modèle', labelWidth: 50, editable: false, queryMode: 'local', store: modeles,
                                    displayField: 'libelle', valueField: 'id', emptyText: 'Choisir un modèle', margin: '6 0 0 0',
                                    listeners: {select: function (c, r) {
                                            var rec = Ext.isArray(r) ? r[0] : r;
                                            me.ciblage.down('#cbTexte').setValue(rec ? rec.get('contenu') : '');
                                        }}},
                                {xtype: 'textarea', itemId: 'cbTexte', flex: 1, minHeight: 80, margin: '6 0 0 0',
                                    emptyText: 'Votre message. Variables : {prenom} {nom} {client} {medicament} {officine} {telephone_officine}'},
                                {xtype: 'component', html: '<div style="color:#5d6d7e;font-size:11px;margin-top:4px">{medicament} : le produit, la famille ou la DCI choisis '
                                            + '(message neutre si la fiche du client interdit de citer les médicaments).</div>'},
                                {xtype: 'button', itemId: 'cbEnvoyer', margin: '10 0 0 0', scale: 'medium', text: 'Envoyer aux résultats', disabled: true,
                                    iconCls: 'fa fa-paper-plane', handler: function (b) {
                                        me.envoyerCiblage(b);
                                    }}]}]},
                {xtype: 'component', itemId: 'cbEtat', cls: 'rp-etat'}]
        });
    },

    initialiserCiblage: function () {
        var me = this, c = me.ciblage;
        if (c.initialise) {
            return;
        }
        c.initialise = true;
        me.chargerModelesCiblage(c.down('#cbCanal').getValue(), 'MODELE_HABITUDE');
    },

    chargerModelesCiblage: function (canal, defaut) {
        var c = this.ciblage, s = c.modeles, combo = c.down('#cbModele');
        s.getProxy().setExtraParam('canal', canal === 'SMS' ? 'SMS' : 'WHATSAPP');
        s.load({callback: function () {
                var actuel = defaut || combo.getValue();
                if (actuel && s.getById(actuel)) {
                    combo.setValue(actuel);
                    if (defaut) {
                        c.down('#cbTexte').setValue(s.getById(actuel).get('contenu'));
                    }
                } else if (combo.getValue()) {
                    combo.clearValue();
                }
            }});
    },

    /** Criteres du ciblage, envoyes tels quels au serveur (memes noms que les filtres des campagnes). */
    filtresCiblage: function () {
        var c = this.ciblage, du = c.down('#cbDu').getValue(), au = c.down('#cbAu').getValue();
        return {produitType: c.down('#cbType').getValue(), produitId: c.down('#cbReference').getValue(),
            achatDu: du ? Ext.Date.format(du, 'Y-m-d') : null, achatAu: au ? Ext.Date.format(au, 'Y-m-d') : null,
            minAchats: c.down('#cbMin').getValue(), canal: c.down('#cbCanal').getValue()};
    },

    chercherCiblage: function () {
        var me = this, c = me.ciblage, g = c.down('#cbResultats'), f = me.filtresCiblage();
        if (!f.produitId) {
            me.etatCiblage('Choisissez le produit, la famille ou la DCI.', 'rp-erreur');
            return;
        }
        if (f.achatDu && f.achatAu && f.achatDu > f.achatAu) {
            me.etatCiblage('La date de début doit précéder la date de fin.', 'rp-erreur');
            return;
        }
        g.setLoading('Recherche des clients…');
        me.appelCiblage('POST', '', f, function (r) {
            if (c.isDestroyed) {
                return;
            }
            g.setLoading(false);
            if (!r.success) {
                me.etatCiblage(r.message || r.msg, 'rp-erreur');
                return;
            }
            c.criteres = f;
            g.getStore().loadData(r.data || []);
            var l = [];
            g.getStore().each(function (x) {
                if (x.get('joignable')) {
                    l.push(x);
                }
            });
            g.getSelectionModel().select(l, false, false);
            g.setTitle('Clients ayant acheté : ' + r.total + ' trouvé(s), ' + r.joignables + ' joignable(s)');
            me.etatCiblage(r.total === 0 ? 'Aucun client ne correspond.' : (r.total - r.joignables) + ' client(s) non joignable(s) (motif affiché).', 'rp-info');
            me.majEnvoiCiblage(g.getSelectionModel().getCount());
        });
    },

    majEnvoiCiblage: function (n) {
        var b = this.ciblage.down('#cbEnvoyer');
        b.enConfirmation = false;
        b.removeCls('rp-confirmer');
        b.setText(n > 0 ? 'Envoyer aux ' + n + ' résultat(s)' : 'Envoyer aux résultats');
        b.setDisabled(!(n > 0));
    },

    /* premier clic : « Confirmer l'envoi à N client(s) » (5 s) ; second clic : envoi. Aucune fenetre. */
    envoyerCiblage: function (b) {
        var me = this, c = me.ciblage, g = c.down('#cbResultats'), ids = Ext.Array.map(g.getSelectionModel().getSelection(), function (r) {
            return r.get('clientId');
        });
        var texte = Ext.String.trim(c.down('#cbTexte').getValue() || ''), m = c.down('#cbModele').getValue(), rec = m ? c.modeles.getById(m) : null;
        if (!ids.length || !c.criteres) {
            return;
        }
        if (!texte) {
            me.etatCiblage('Écrivez le message ou choisissez un modèle.', 'rp-erreur');
            return;
        }
        if (!b.enConfirmation) {
            b.enConfirmation = true;
            b.addCls('rp-confirmer');
            b.setText('Confirmer l\'envoi à ' + ids.length + ' client(s)');
            Ext.defer(function () {
                if (b.enConfirmation && !b.isDestroyed) {
                    me.majEnvoiCiblage(g.getSelectionModel().getCount());
                }
            }, 5000);
            return;
        }
        b.enConfirmation = false;
        b.removeCls('rp-confirmer');
        b.disable();
        var f = Ext.apply({}, {clientIds: ids, canal: c.down('#cbCanal').getValue()}, c.criteres);
        f.clientIds = ids;
        f.canal = c.down('#cbCanal').getValue();
        if (rec && texte === Ext.String.trim(rec.get('contenu') || '')) {
            f.modeleId = m;
        } else {
            f.message = texte;
        }
        me.appelCiblage('POST', '/envoyer', f, function (r) {
            if (c.isDestroyed) {
                return;
            }
            if (!r.success) {
                me.majEnvoiCiblage(g.getSelectionModel().getCount());
                me.etatCiblage(r.message || r.msg, 'rp-erreur');
                return;
            }
            var refus = Ext.Array.map(r.refus || [], function (x) {
                return x.client + ' : ' + x.motif;
            });
            me.etatCiblage(r.message + (refus.length ? ' ' + refus.join(' ; ') : ''), 'rp-ok');
            g.getSelectionModel().deselectAll();
            me.majEnvoiCiblage(0);
        });
    }
});
