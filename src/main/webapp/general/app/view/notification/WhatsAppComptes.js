/* global Ext */

/*
 * COMPTES WHATSAPP (plan d'octobre, section 4.2, lot L10). Deux modes : API officielle (Cloud API de Meta : identifiant
 * du numero, WABA, jeton d'acces, jeton de verification et secret d'application pour le webhook, modele approuve) et
 * WhatsApp Web (service compagnon : adresse et jeton partage). Mode test par compte : aucun envoi reel. Les secrets
 * sont en ECRITURE SEULE : l'ecran sait seulement s'ils sont definis ; un champ laisse vide garde la valeur. Essai
 * d'envoi par le mode par defaut et journal des derniers envois (statuts du webhook).
 */
Ext.define('testextjs.view.notification.WhatsAppComptes', {
    extend: 'Ext.panel.Panel',
    xtype: 'whatsappcomptes',
    id: 'whatsappcomptesID',
    title: 'Comptes WhatsApp',
    frame: true,
    width: '98%',
    minHeight: 620,
    autoScroll: true,
    bodyPadding: 10,

    secret: function (name, label) {
        return {xtype: 'textfield', inputType: 'password', name: name, fieldLabel: label, anchor: '100%',
            emptyText: 'non défini', itemId: name};
    },

    initComponent: function () {
        var me = this;
        var journal = Ext.create('Ext.data.Store', {
            fields: ['date', 'maj', 'mode', 'simule', 'statut', 'erreur', 'repliSms', 'telephone', 'client', 'essai'],
            proxy: {type: 'ajax', url: '../api/v1/whatsapp/journal', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var section = function (titre, items) {
            return {xtype: 'fieldset', title: titre, cls: 'fen-section', defaults: {labelWidth: 190}, items: items};
        };
        /* retours du 07/10 : trois onglets, les comptes (inchanges), la connexion WhatsApp Web par QR code avec les
           regles anti-bannissement, et les modeles de l'API officielle */
        var comptes = [{
                    xtype: 'container', layout: {type: 'hbox', align: 'stretch'}, defaults: {flex: 1, margin: '0 10 0 0'},
                    items: [{
                            xtype: 'form', itemId: 'formAPI', border: false,
                            items: [section('API officielle (WhatsApp Cloud API)', [
                                    {xtype: 'checkbox', name: 'actif', boxLabel: 'Compte actif', fieldLabel: 'État'},
                                    {xtype: 'checkbox', name: 'modeTest', boxLabel: 'Mode test : aucun envoi réel', fieldLabel: 'Mode test'},
                                    {xtype: 'textfield', name: 'phoneNumberId', fieldLabel: 'Identifiant du numéro', anchor: '100%'},
                                    {xtype: 'textfield', name: 'wabaId', fieldLabel: 'Identifiant WABA', anchor: '100%'},
                                    {xtype: 'textfield', name: 'apiVersion', fieldLabel: 'Version de l\'API', emptyText: 'v21.0', anchor: '100%'},
                                    me.secret('accessToken', 'Jeton d\'accès'),
                                    me.secret('verifyToken', 'Jeton de vérification (webhook)'),
                                    me.secret('appSecret', 'Secret de l\'application (signature)'),
                                    {xtype: 'textfield', name: 'modeleNom', fieldLabel: 'Modèle approuvé', anchor: '100%',
                                        emptyText: 'vide : texte libre (fenêtre de 24 h seulement)'},
                                    {xtype: 'textfield', name: 'modeleLangue', fieldLabel: 'Langue du modèle', emptyText: 'fr', anchor: '100%'},
                                    {xtype: 'displayfield', fieldLabel: 'Webhook à déclarer chez Meta', itemId: 'urlWebhook'},
                                    {xtype: 'button', text: 'Enregistrer le compte API', itemId: 'btnEnregistrerAPI', cls: 'fen-btn-principal',
                                        handler: function () {
                                            me.enregistrer('API');
                                        }}
                                ])]
                        }, {
                            xtype: 'form', itemId: 'formWEB', border: false,
                            items: [section('WhatsApp Web (service compagnon)', [
                                    {xtype: 'checkbox', name: 'actif', boxLabel: 'Compte actif', fieldLabel: 'État'},
                                    {xtype: 'checkbox', name: 'modeTest', boxLabel: 'Mode test : aucun envoi réel', fieldLabel: 'Mode test'},
                                    {xtype: 'textfield', name: 'webUrl', fieldLabel: 'Adresse du service', emptyText: 'https://…', anchor: '100%'},
                                    me.secret('webJeton', 'Jeton partagé'),
                                    {xtype: 'displayfield', fieldLabel: 'Avertissement',
                                        value: '<span style="color:#b9770e">Débit lent conseillé : un numéro qui envoie trop vite peut être bloqué par WhatsApp. Pour les tests et les faibles volumes.</span>'},
                                    {xtype: 'button', text: 'Enregistrer le compte Web', itemId: 'btnEnregistrerWEB', cls: 'fen-btn-principal',
                                        handler: function () {
                                            me.enregistrer('WEB');
                                        }}
                                ])]
                        }]
                }, section('Mode par défaut et essai', [{
                        xtype: 'container', layout: 'hbox', items: [
                            {xtype: 'combobox', itemId: 'modeDefaut', fieldLabel: 'Mode par défaut', labelWidth: 120, width: 330, editable: false,
                                queryMode: 'local', displayField: 'l', valueField: 'v',
                                store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: 'API', l: 'API officielle'}, {v: 'WEB', l: 'WhatsApp Web'}]})},
                            {xtype: 'button', text: 'Appliquer', itemId: 'btnModeDefaut', margin: '0 0 0 8', handler: function () {
                                    var m = me.down('#modeDefaut').getValue();
                                    me.poster('../api/v1/whatsapp/comptes/' + m, {defaut: true}, function () {
                                        me.charger();
                                    });
                                }},
                            {xtype: 'tbspacer', width: 30},
                            {xtype: 'textfield', itemId: 'numeroEssai', fieldLabel: 'Numéro d\'essai', labelWidth: 110, width: 270, emptyText: '07 XX XX XX XX'},
                            {xtype: 'textfield', itemId: 'texteEssai', width: 300, margin: '0 0 0 8', emptyText: 'Message d\'essai de la pharmacie.'},
                            {xtype: 'button', text: 'Envoyer un essai', itemId: 'btnEssai', margin: '0 0 0 8', handler: function () {
                                    me.poster('../api/v1/whatsapp/test', {numero: me.down('#numeroEssai').getValue(), texte: me.down('#texteEssai').getValue()},
                                            function (r) {
                                                me.down('#resultatEssai').setValue(Ext.String.htmlEncode(r.message || ''));
                                                journal.load();
                                            }, true);
                                }}
                        ]}, {xtype: 'displayfield', itemId: 'resultatEssai', fieldLabel: 'Résultat', labelWidth: 120}]),
                {
                    xtype: 'grid', itemId: 'journal', title: 'Derniers envois WhatsApp', store: journal, height: 260,
                    viewConfig: {emptyText: 'Aucun envoi WhatsApp.', deferEmptyText: false},
                    columns: [
                        {text: 'Date', dataIndex: 'date', width: 140},
                        {text: 'Client', dataIndex: 'client', flex: 1, renderer: function (v, m, r) {
                                return r.get('essai') ? '<i>essai</i>' : Ext.String.htmlEncode(v || '');
                            }},
                        {text: 'Téléphone', dataIndex: 'telephone', width: 110},
                        {text: 'Mode', dataIndex: 'mode', width: 60},
                        {text: 'Statut', dataIndex: 'statut', width: 90, renderer: function (v) {
                                var c = {SIMULE: '#7f8c8d', ENVOYE: '#2980b9', DELIVRE: '#27ae60', LU: '#1e8449', ECHEC: '#c0392b'}[v] || '#555';
                                return '<b style="color:' + c + '">' + ({SIMULE: 'simulé', ENVOYE: 'envoyé', DELIVRE: 'délivré', LU: 'lu', ECHEC: 'échec'}[v] || v) + '</b>';
                            }},
                        {text: 'Repli SMS', dataIndex: 'repliSms', width: 75, renderer: function (v) {
                                return v ? 'oui' : '';
                            }},
                        {text: 'Erreur', dataIndex: 'erreur', flex: 1, renderer: function (v) {
                                return Ext.String.htmlEncode(v || '');
                            }},
                        {text: 'Mis à jour', dataIndex: 'maj', width: 140}
                    ],
                    tools: [{type: 'refresh', tooltip: 'Actualiser', handler: function () {
                                journal.load();
                            }}]
                }];
        Ext.apply(me, {
            items: [{xtype: 'tabpanel', itemId: 'ongletsWhatsApp', cls: 'ordo-onglets', height: 680, plain: true,
                    items: [{title: 'Comptes', itemId: 'ongletComptes', autoScroll: true, bodyPadding: 8, border: false, items: comptes},
                        me.ongletWeb(), me.ongletModeles()],
                    listeners: {tabchange: function (tp, t) {
                            if (t.itemId === 'ongletWeb') {
                                me.chargerWeb(true);
                            } else if (t.itemId === 'ongletModeles') {
                                t.getStore().load();
                            }
                        }}}]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.charger();
            journal.load();
        });
        me.on('destroy', function () {
            clearTimeout(me.minuteurWeb);
        });
    },

    esc: function (v) {
        return Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v));
    },

    appel: function (methode, url, corps, suite) {
        var me = this;
        Ext.Ajax.request({
            url: url, method: methode, headers: corps ? {'Content-Type': 'application/json'} : undefined, jsonData: corps || undefined,
            timeout: 60000,
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false && !r.etat) {
                    Ext.MessageBox.alert('WhatsApp', r.msg || r.message || 'Refusé.');
                    return;
                }
                suite(r);
            },
            failure: function (response) {
                Ext.MessageBox.alert('WhatsApp', 'Le serveur n\'a pas répondu (' + response.status + ').');
            }
        });
    },

    /* ------------------------------------------------------------------ WhatsApp Web : QR code et regles */

    REGLES_AIDE: {
        delaiMinSec: ['Délai entre deux messages : de', 's'], delaiMaxSec: ['à', 's'],
        pauseApres: ['Longue pause tous les', 'messages'], pauseMinMin: ['durée de la pause : de', 'min'], pauseMaxMin: ['à', 'min'],
        plafondHeure: ['Au plus', 'messages par heure'], plafondJour: ['Au plus', 'messages par jour'],
        monteeDepart: ['Numéro neuf : le 1er jour', 'messages'], monteePas: ['puis + par jour', 'messages'],
        heureDebut: ['Envoi de', 'h'], heureFin: ['à', 'h'],
        echecsAvantPause: ['Pause de protection après', 'échecs de suite'], pauseEchecMin: ['durée', 'min']
    },

    ongletWeb: function () {
        var me = this;
        var nombre = function (n) {
            var a = me.REGLES_AIDE[n];
            return {xtype: 'numberfield', name: n, fieldLabel: a[0], labelWidth: 210, width: 330, minValue: 0, allowDecimals: false,
                hideTrigger: true, afterBodyEl: '<span class="wa-unite">' + a[1] + '</span>'};
        };
        return {
            title: 'WhatsApp Web : connexion et règles', itemId: 'ongletWeb', layout: {type: 'hbox', align: 'stretch'}, bodyPadding: 10, border: false,
            items: [{
                    xtype: 'container', width: 360, margin: '0 16 0 0', items: [
                        {xtype: 'component', itemId: 'etatWeb', html: '<div class="wa-etat">Chargement…</div>'},
                        {xtype: 'component', itemId: 'qrWeb', html: ''},
                        {xtype: 'container', layout: 'hbox', margin: '8 0 0 0', items: [
                                {xtype: 'button', text: 'Actualiser', itemId: 'btnActualiserWeb', handler: function () {
                                        me.chargerWeb(true);
                                    }},
                                {xtype: 'button', text: 'Déconnecter / changer de numéro', itemId: 'btnDeconnecterWeb', margin: '0 0 0 8', handler: function () {
                                        Ext.Msg.confirm('WhatsApp Web', 'Déconnecter ce numéro ? Il faudra scanner à nouveau le QR code avec le téléphone.', function (b) {
                                            if (b === 'yes') {
                                                me.appel('POST', '../api/v1/whatsapp/web/deconnecter', null, function () {
                                                    me.chargerWeb(true);
                                                });
                                            }
                                        });
                                    }}]},
                        {xtype: 'component', margin: '12 0 0 0', html: '<div class="wa-note"><b>Scanner le QR code</b> : sur le téléphone de la pharmacie, '
                                    + 'WhatsApp → Réglages → Appareils connectés → Connecter un appareil, puis visez le code. La connexion est gardée : '
                                    + 'pas de nouveau scan au redémarrage du service.</div>'}
                    ]
                }, {
                    xtype: 'form', itemId: 'formRegles', flex: 1, autoScroll: true, border: false,
                    items: [{xtype: 'fieldset', title: 'Règles d\'envoi (contre le bannissement du numéro)', cls: 'fen-section',
                            items: [
                                {xtype: 'container', layout: 'hbox', items: [nombre('delaiMinSec'), nombre('delaiMaxSec')]},
                                {xtype: 'container', layout: 'hbox', items: [nombre('pauseApres'), nombre('pauseMinMin'), nombre('pauseMaxMin')]},
                                {xtype: 'container', layout: 'hbox', items: [nombre('plafondHeure'), nombre('plafondJour')]},
                                {xtype: 'checkbox', name: 'monteeEnCharge', boxLabel: 'Montée en charge progressive pour un numéro neuf (recommandé)'},
                                {xtype: 'container', layout: 'hbox', items: [nombre('monteeDepart'), nombre('monteePas')]},
                                {xtype: 'container', layout: 'hbox', items: [nombre('heureDebut'), nombre('heureFin')]},
                                {xtype: 'container', layout: 'hbox', items: [nombre('echecsAvantPause'), nombre('pauseEchecMin')]},
                                {xtype: 'checkbox', name: 'verifierNumero', boxLabel: 'Vérifier que le numéro a WhatsApp avant d\'envoyer (recommandé)'},
                                {xtype: 'component', html: '<div class="wa-note">Toujours appliqué : « en train d\'écrire » avant chaque message, '
                                            + 'délais jamais identiques, variation des textes {Bonjour|Bonsoir}, un même texte au plus une fois par jour et par '
                                            + 'numéro, arrêt définitif pour qui répond STOP. Valeurs hors bornes : la valeur conseillée est reprise.</div>'},
                                {xtype: 'button', text: 'Enregistrer les règles', itemId: 'btnEnregistrerRegles', cls: 'fen-btn-principal', margin: '8 0 0 0',
                                    handler: function () {
                                        var f = me.down('#formRegles'), v = f.getForm().getValues(false, false, false, true);
                                        v.monteeEnCharge = !!f.down('[name=monteeEnCharge]').getValue();
                                        v.verifierNumero = !!f.down('[name=verifierNumero]').getValue();
                                        me.appel('PUT', '../api/v1/whatsapp/web/regles', v, function (r) {
                                            f.getForm().setValues(r.regles);
                                            Ext.MessageBox.alert('WhatsApp Web', me.esc(r.message));
                                        });
                                    }}
                            ]}]
                }]
        };
    },

    chargerWeb: function (reglesAussi) {
        var me = this;
        clearTimeout(me.minuteurWeb);
        if (reglesAussi) {
            me.appel('GET', '../api/v1/whatsapp/web/regles', null, function (r) {
                me.down('#formRegles').getForm().setValues(r.regles);
            });
        }
        me.appel('GET', '../api/v1/whatsapp/web/etat', null, function (e) {
            var et = e.etat || 'INCONNU';
            var lib = {CONNECTE: ['Connecté', '#1e8449'], QR: ['En attente du scan', '#b9770e'], INITIALISATION: ['Démarrage…', '#2980b9'],
                AUTHENTIFIE: ['Connexion en cours…', '#2980b9'], DECONNECTE: ['Déconnecté', '#c0392b'], ECHEC_AUTH: ['Échec de connexion', '#c0392b'],
                NON_CONFIGURE: ['Service non configuré', '#7f8c8d'], INJOIGNABLE: ['Service injoignable', '#c0392b'], JETON_REFUSE: ['Jeton refusé', '#c0392b']}[et] || [et, '#555'];
            var f = e.file || {};
            var html = '<div class="wa-etat"><span class="wa-pastille" style="background:' + lib[1] + '"></span><b>' + lib[0] + '</b>'
                    + (e.numero ? ' · +' + me.esc(e.numero) : '') + (e.faux ? ' <i>(service d\'essai)</i>' : '') + '</div>';
            if (e.success === false) {
                html += '<div class="wa-note" style="color:#c0392b">' + me.esc(e.message) + '</div>';
            } else if (e.file) {
                html += '<div class="wa-note">File d\'attente : <b>' + (f.enAttente || 0) + '</b> · envoyés aujourd\'hui : <b>' + (f.envoyesAujourdhui || 0)
                        + '</b> / ' + (f.plafondDuJour || '—') + (f.pauseJusqua ? ' · <b style="color:#b9770e">pause de protection</b>' : '') + '</div>';
            }
            me.down('#etatWeb').update(html);
            me.down('#btnDeconnecterWeb').setDisabled(et !== 'CONNECTE');
            if (et === 'QR') {
                me.appel('GET', '../api/v1/whatsapp/web/qr', null, function (q) {
                    me.down('#qrWeb').update(q.image ? '<img class="wa-qr" alt="QR code WhatsApp" src="' + me.esc(q.image) + '">' : '<div class="wa-note">QR code en préparation…</div>');
                });
            } else {
                me.down('#qrWeb').update(et === 'CONNECTE' ? '<div class="wa-connecte">✓ Le téléphone est connecté : les messages partent selon les règles.</div>' : '');
            }
            /* tant que la connexion n'est pas faite, l'ecran se rafraichit seul (le QR change toutes les 20 s environ) */
            var onglet = me.down('#ongletWeb');
            if (/QR|INITIALISATION|AUTHENTIFIE/.test(et) && onglet && onglet.isVisible(true)) {
                me.minuteurWeb = setTimeout(function () {
                    if (!me.isDestroyed) {
                        me.chargerWeb(false);
                    }
                }, 4000);
            }
        });
    },

    /* ------------------------------------------------------------------ modeles de l'API officielle */

    STATUTS_MODELE: {BROUILLON: '#7f8c8d', PENDING: '#b9770e', APPROVED: '#1e8449', REJECTED: '#c0392b', PAUSED: '#b9770e', DISABLED: '#7f8c8d'},

    ongletModeles: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'langue', 'categorie', 'entete', 'corps', 'pied', 'exemples', 'boutons', 'statut', 'statutLibelle', 'metaId',
                'motifRejet', 'soumisLe', 'modifieLe'],
            proxy: {type: 'ajax', url: '../api/v1/whatsapp/modeles', reader: {type: 'json', root: 'data'}}
        });
        var choisi = function () {
            var s = me.down('#ongletModeles').getSelectionModel().getSelection();
            return s.length ? s[0] : null;
        };
        return {
            xtype: 'grid', title: 'Modèles (API officielle)', itemId: 'ongletModeles', store: store,
            viewConfig: {emptyText: 'Aucun modèle. Hors de la fenêtre de 24 h ouverte par le client, Meta n\'accepte que des modèles approuvés.',
                deferEmptyText: false},
            columns: [
                {text: 'Nom', dataIndex: 'nom', width: 190},
                {text: 'Langue', dataIndex: 'langue', width: 60},
                {text: 'Catégorie', dataIndex: 'categorie', width: 100},
                {text: 'Texte', dataIndex: 'corps', flex: 1, renderer: function (v, m) {
                        m.tdAttr = 'data-qtip="' + me.esc(me.esc(v)) + '"';
                        return me.esc(v);
                    }},
                {text: 'Statut', dataIndex: 'statut', width: 150, renderer: function (v, m, r) {
                        if (r.get('motifRejet')) {
                            m.tdAttr = 'data-qtip="Motif de Meta : ' + me.esc(me.esc(r.get('motifRejet'))) + '"';
                        }
                        return '<b style="color:' + (me.STATUTS_MODELE[v] || '#555') + '">' + me.esc(r.get('statutLibelle')) + '</b>';
                    }},
                {text: 'Soumis le', dataIndex: 'soumisLe', width: 120}
            ],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Nouveau modèle', itemId: 'btnNouveauModele', iconCls: 'addicon', handler: function () {
                                me.editerModele(null);
                            }},
                        {text: 'Modifier', itemId: 'btnModifierModele', handler: function () {
                                var r = choisi();
                                if (r) {
                                    me.editerModele(r);
                                }
                            }},
                        {text: 'Soumettre à Meta', itemId: 'btnSoumettreModele', handler: function () {
                                var r = choisi();
                                if (!r) {
                                    return;
                                }
                                me.appel('POST', '../api/v1/whatsapp/modeles/' + encodeURIComponent(r.get('id')) + '/soumettre', null, function (o) {
                                    Ext.MessageBox.alert('Modèles WhatsApp', me.esc(o.message));
                                    store.load();
                                });
                            }},
                        {text: 'Actualiser les statuts', itemId: 'btnSynchroniserModeles', iconCls: 'refresh', tooltip: 'Demande à Meta le statut des modèles soumis',
                            handler: function () {
                                me.appel('POST', '../api/v1/whatsapp/modeles/synchroniser', null, function (o) {
                                    if (o.message) {
                                        Ext.MessageBox.alert('Modèles WhatsApp', me.esc(o.message));
                                    }
                                    store.load();
                                });
                            }},
                        {text: 'Supprimer', itemId: 'btnSupprimerModele', handler: function () {
                                var r = choisi();
                                if (!r) {
                                    return;
                                }
                                Ext.Msg.confirm('Modèles WhatsApp', 'Supprimer le modèle « ' + me.esc(r.get('nom')) + ' » de Prestige ?', function (b) {
                                    if (b === 'yes') {
                                        me.appel('DELETE', '../api/v1/whatsapp/modeles/' + encodeURIComponent(r.get('id')), null, function () {
                                            store.load();
                                        });
                                    }
                                });
                            }}]}],
            listeners: {itemdblclick: function (v, r) {
                    me.editerModele(r);
                }}
        };
    },

    /** Apercu du message tel que le client le verra (bulle WhatsApp), variables remplacees par les exemples. */
    apercu: function (v) {
        var me = this, ex = (v.exemples || '').split('|');
        var remplacer = function (t) {
            return me.esc(t || '').replace(/\{\{\s*(\d+)\s*\}\}/g, function (x, n) {
                return '<span class="wa-var">' + me.esc(ex[n - 1] || ('{{' + n + '}}')) + '</span>';
            }).replace(/\n/g, '<br>');
        };
        var b = '';
        Ext.each([1, 2, 3], function (i) {
            if (v['boutonTexte' + i]) {
                b += '<div class="wa-bouton">' + me.esc(v['boutonTexte' + i]) + '</div>';
            }
        });
        return '<div class="wa-bulle">' + (v.entete ? '<div class="wa-entete">' + remplacer(v.entete) + '</div>' : '') + remplacer(v.corps)
                + (v.pied ? '<div class="wa-pied">' + me.esc(v.pied) + '</div>' : '') + '</div>' + b;
    },

    editerModele: function (rec) {
        var me = this, d = rec ? rec.getData() : {langue: 'fr', categorie: 'UTILITY'};
        if (rec && d.statut !== 'BROUILLON' && d.statut !== 'REJECTED') {
            Ext.MessageBox.alert('Modèles WhatsApp', 'Un modèle soumis à Meta ne se modifie plus : créez-en une nouvelle version (autre nom).');
            return;
        }
        var boutons = d.boutons || [];
        var ligneBouton = function (i) {
            var b = boutons[i - 1] || {};
            return {xtype: 'container', layout: 'hbox', margin: '0 0 6 0', items: [
                    {xtype: 'combobox', name: 'boutonType' + i, fieldLabel: 'Bouton ' + i, labelWidth: 120, width: 300, editable: false, queryMode: 'local',
                        displayField: 'l', valueField: 'v', value: b.type || '',
                        store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: 'aucun'}, {v: 'QUICK_REPLY', l: 'Réponse rapide'},
                                {v: 'URL', l: 'Lien (https://…)'}, {v: 'PHONE_NUMBER', l: 'Appeler la pharmacie'}]})},
                    {xtype: 'textfield', name: 'boutonTexte' + i, emptyText: 'Libellé (25 caractères)', maxLength: 25, enforceMaxLength: true, width: 180, margin: '0 0 0 6', value: b.texte},
                    {xtype: 'textfield', name: 'boutonValeur' + i, emptyText: 'Lien ou numéro', width: 200, margin: '0 0 0 6', value: b.valeur}]};
        };
        var win = Ext.create('Ext.window.Window', {
            title: rec ? 'Modèle « ' + me.esc(d.nom) + ' »' : 'Nouveau modèle WhatsApp', modal: true, width: 980, itemId: 'fenetreModele',
            maxHeight: Ext.getBody().getViewSize().height - 40, autoScroll: true, layout: {type: 'hbox', align: 'stretch'}, bodyPadding: 12,
            items: [{
                    xtype: 'form', flex: 1, border: false, defaults: {anchor: '100%', labelWidth: 120}, items: [
                        {xtype: 'textfield', name: 'nom', fieldLabel: 'Nom', value: d.nom, allowBlank: false, maxLength: 512, enforceMaxLength: true,
                            emptyText: 'minuscules et _ : rappel_traitement', regex: /^[a-z0-9_]+$/, regexText: 'Minuscules, chiffres et _ seulement'},
                        {xtype: 'combobox', name: 'categorie', fieldLabel: 'Catégorie', editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: d.categorie,
                            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: 'UTILITY', l: 'Service (rappel, commande prête)'},
                                    {v: 'MARKETING', l: 'Marketing (promotion)'}, {v: 'AUTHENTICATION', l: 'Code de connexion'}]})},
                        {xtype: 'textfield', name: 'langue', fieldLabel: 'Langue', value: d.langue, emptyText: 'fr', maxLength: 10, enforceMaxLength: true},
                        {xtype: 'textfield', name: 'entete', fieldLabel: 'En-tête', value: d.entete, maxLength: 60, enforceMaxLength: true, emptyText: 'Facultatif, 60 caractères'},
                        {xtype: 'textarea', name: 'corps', fieldLabel: 'Corps', value: d.corps, allowBlank: false, maxLength: 1024, enforceMaxLength: true, height: 110,
                            emptyText: 'Bonjour {{1}}, votre traitement habituel sera prêt le {{2}}.'},
                        {xtype: 'textfield', name: 'exemples', fieldLabel: 'Exemples des variables', value: (d.exemples || []).join('|'),
                            emptyText: 'Awa|12/10 (une valeur par variable, séparées par |)'},
                        {xtype: 'textfield', name: 'pied', fieldLabel: 'Pied', value: d.pied, maxLength: 60, enforceMaxLength: true, emptyText: 'Facultatif : Répondez STOP pour ne plus recevoir'},
                        ligneBouton(1), ligneBouton(2), ligneBouton(3),
                        {xtype: 'component', itemId: 'erreursModele', html: ''}
                    ],
                    listeners: {dirtychange: function () {
                            me.majApercu(win);
                        }, validitychange: function () {
                            me.majApercu(win);
                        }}
                }, {xtype: 'component', itemId: 'apercuModele', width: 300, margin: '0 0 0 14', html: ''}],
            buttons: [{text: 'Annuler', handler: function () {
                        win.close();
                    }}, {text: 'Enregistrer', itemId: 'btnEnregistrerModele', handler: function () {
                        var v = win.down('form').getForm().getValues();
                        var b = [];
                        Ext.each([1, 2, 3], function (i) {
                            if (v['boutonType' + i]) {
                                b.push({type: v['boutonType' + i], texte: v['boutonTexte' + i], valeur: v['boutonValeur' + i]});
                            }
                        });
                        me.appel('POST', '../api/v1/whatsapp/modeles', {id: rec ? d.id : null, nom: v.nom, langue: v.langue, categorie: v.categorie,
                            entete: v.entete, corps: v.corps, pied: v.pied, exemples: v.exemples ? v.exemples.split('|') : [], boutons: b}, function () {
                            win.close();
                            me.down('#ongletModeles').getStore().load();
                        });
                    }}]
        });
        win.show();
        Ext.each(win.query('field'), function (f) {
            f.on('change', function () {
                me.majApercu(win);
            });
        });
        me.majApercu(win);
    },

    majApercu: function (win) {
        var v = win.down('form').getForm().getValues();
        win.down('#apercuModele').update('<div class="wa-apercu-titre">Aperçu</div><div class="wa-fond">' + this.apercu(v) + '</div>'
                + '<div class="wa-note">' + (v.corps || '').length + ' / 1024 caractères</div>');
    },

    charger: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/whatsapp/comptes',
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    Ext.MessageBox.alert('WhatsApp', r.msg || 'Accès refusé.');
                    return;
                }
                me.down('#modeDefaut').setValue(r.modeDefaut);
                Ext.each(r.comptes || [], function (c) {
                    var f = me.down('#form' + c.mode);
                    if (!f) {
                        return;
                    }
                    f.getForm().setValues(c);
                    Ext.each(['accessToken', 'verifyToken', 'appSecret', 'webJeton'], function (s) {
                        var champ = f.down('#' + s);
                        if (champ) {
                            champ.setValue('');
                            champ.emptyText = c[s + 'Defini'] ? 'défini — laisser vide pour le garder' : 'non défini';
                            champ.applyEmptyText();
                        }
                    });
                });
                var w = me.down('#urlWebhook');
                if (w) {
                    w.setValue(window.location.origin + window.location.pathname.replace(/\/general\/.*$/, '') + '/api/v1/whatsapp/webhook');
                }
            }
        });
    },

    enregistrer: function (mode) {
        var me = this, f = me.down('#form' + mode), v = f.getForm().getValues(false, false, false, true);
        v.actif = !!f.down('[name=actif]').getValue();
        v.modeTest = !!f.down('[name=modeTest]').getValue();
        me.poster('../api/v1/whatsapp/comptes/' + mode, v, function () {
            me.charger();
        });
    },

    poster: function (url, corps, suite, garderMessage) {
        var me = this;
        me.setLoading(true);
        Ext.Ajax.request({
            url: url, method: 'POST', headers: {'Content-Type': 'application/json'}, jsonData: corps,
            success: function (response) {
                me.setLoading(false);
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false && !garderMessage) {
                    Ext.MessageBox.alert('WhatsApp', Ext.String.htmlEncode(r.msg || r.message || 'Refusé.'));
                    return;
                }
                suite(r);
            },
            failure: function () {
                me.setLoading(false);
                Ext.MessageBox.alert('WhatsApp', 'Le serveur n\'a pas répondu.');
            }
        });
    }
});
