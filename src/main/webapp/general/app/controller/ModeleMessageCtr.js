/* global Ext */

/* Point 2 : modeles de messages SMS / WhatsApp (creation, modification, activation). */
Ext.define('testextjs.controller.ModeleMessageCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.configmanagement.modelemessage.ModeleMessageManager'],

    refs: [
        {ref: 'ecran', selector: 'modelemessagemanager'},
        {ref: 'grille', selector: 'modelemessagemanager #grille'}
    ],

    init: function () {
        this.control({
            'modelemessagemanager #btnNouveau': {
                click: this.onNouveau
            },
            'modelemessagemanager #btnModifier': {
                click: this.onModifier
            },
            'modelemessagemanager #btnBasculer': {
                click: this.onBasculer
            },
            'modelemessagemanager #grille': {
                itemdblclick: this.onModifier
            }
        });
    },

    selection: function () {
        const sel = this.getGrille().getSelectionModel().getSelection();
        if (!sel.length) {
            Ext.Msg.alert('Message', 'Sélectionnez un modèle');
            return null;
        }
        return sel[0];
    },

    onNouveau: function () {
        this.ouvrirFenetre(null);
    },

    onModifier: function () {
        const rec = this.selection();
        if (rec) {
            this.ouvrirFenetre(rec);
        }
    },

    onBasculer: function () {
        const me = this;
        const rec = me.selection();
        if (!rec) {
            return;
        }
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/modeles-messages/' + rec.get('id') + '/toggle',
            callback: function () {
                me.getGrille().getStore().reload();
            }
        });
    },

    ouvrirFenetre: function (rec) {
        const me = this;
        const storeCanal = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            data: [
                {id: 'TOUS', libelle: 'SMS et WhatsApp'},
                {id: 'SMS', libelle: 'SMS seulement'},
                {id: 'WHATSAPP', libelle: 'WhatsApp seulement'}
            ]
        });
        const win = Ext.create('Ext.window.Window', {
            title: rec ? 'Modifier le modèle' : 'Nouveau modèle de message',
            modal: true,
            width: 640,
            bodyPadding: 12,
            layout: 'anchor',
            defaults: {anchor: '100%', labelWidth: 80},
            items: [{
                    xtype: 'textfield',
                    itemId: 'libelle',
                    fieldLabel: 'Libellé',
                    allowBlank: false,
                    maxLength: 80,
                    enforceMaxLength: true,
                    value: rec ? rec.get('libelle') : ''
                }, {
                    xtype: 'combobox',
                    itemId: 'canal',
                    fieldLabel: 'Canal',
                    store: storeCanal,
                    valueField: 'id',
                    displayField: 'libelle',
                    queryMode: 'local',
                    editable: false,
                    value: rec ? rec.get('canal') : 'TOUS'
                }, {
                    xtype: 'textareafield',
                    itemId: 'contenu',
                    fieldLabel: 'Message',
                    height: 140,
                    allowBlank: false,
                    maxLength: 1000,
                    enforceMaxLength: true,
                    value: rec ? rec.get('contenu') : ''
                }, {
                    xtype: 'displayfield',
                    fieldLabel: 'Variables',
                    value: '<span style="color:#555;">{client} {prenom} {nom} {medicament} {officine} '
                            + '{telephone_officine} {dernier_achat}</span>'
                }],
            buttons: [{
                    text: 'Enregistrer',
                    itemId: 'btnEnregistrer',
                    handler: function () {
                        me.enregistrer(win, rec);
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.destroy();
                    }
                }]
        });
        win.show();
    },

    enregistrer: function (win, rec) {
        const me = this;
        const libelle = Ext.String.trim(win.down('#libelle').getValue() || '');
        const contenu = Ext.String.trim(win.down('#contenu').getValue() || '');
        if (!libelle || !contenu) {
            Ext.Msg.alert('Message', 'Le libellé et le message sont obligatoires');
            return;
        }
        const bouton = win.down('#btnEnregistrer');
        if (bouton.isDisabled()) {
            return;
        }
        bouton.disable();
        Ext.Ajax.request({
            method: rec ? 'PUT' : 'POST',
            url: '../api/v1/modeles-messages' + (rec ? '/' + rec.get('id') : ''),
            headers: {'Content-Type': 'application/json'},
            jsonData: {libelle: libelle, canal: win.down('#canal').getValue(), contenu: contenu},
            callback: function (opts, success, response) {
                let json = {};
                try {
                    json = Ext.decode(response.responseText);
                } catch (e) {
                }
                if (json.success) {
                    win.destroy();
                    me.getGrille().getStore().reload();
                } else {
                    bouton.enable();
                    Ext.Msg.alert('Message', json.msg || 'L\'enregistrement a échoué');
                }
            }
        });
    }
});
