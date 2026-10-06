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
        Ext.apply(me, {
            items: [{
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
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.charger();
            journal.load();
        });
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
