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
            'modelemessagemanager #btnDupliquer': {
                click: this.onDupliquer
            },
            'modelemessagemanager': {
                dupliquerModele: this.onDupliquerLigne
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
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/modeles-messages/' + rec.get('id') + '/toggle',
            callback: function () {
                me.getGrille().getStore().reload();
            }
        });
    },

    onDupliquer: function () {
        const rec = this.selection();
        if (rec) {
            this.onDupliquerLigne(rec);
        }
    },

    /*
     * Duplication : le nom libre est trouve par le SERVEUR, seul a savoir quels libelles sont deja
     * pris - ils sont uniques en base. L'ecran ne fait que rafraichir et annoncer le nom obtenu.
     */
    onDupliquerLigne: function (rec) {
        const me = this;
        if (!rec) {
            return;
        }
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/modeles-messages/' + rec.get('id') + '/dupliquer',
            callback: function (opts, success, response) {
                let json = {};
                try {
                    json = Ext.decode(response.responseText);
                } catch (e) {
                }
                if (json.success) {
                    me.getGrille().getStore().reload();
                    Ext.toast ? Ext.toast(json.msg) : Ext.Msg.alert('Modèles de messages', json.msg);
                } else {
                    Ext.Msg.alert('Modèles de messages', json.msg || 'La duplication a échoué');
                }
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
                    itemId: 'variables',
                    fieldLabel: 'Variables',
                    // Chaque variable est un bouton : la lire pour la recopier a la main etait une
                    // source de fautes de frappe, et une variable mal orthographiee reste telle
                    // quelle dans le message envoye au client.
                    value: me.htmlVariables(),
                    listeners: {
                        render: function (champ) {
                            champ.getEl().on('click', function (evenement, cible) {
                                const variable = cible.getAttribute('data-variable');
                                if (variable) {
                                    evenement.preventDefault();
                                    me.insererVariable(champ.up('window').down('#contenu'), variable);
                                }
                            }, null, {delegate: '[data-variable]'});
                        }
                    }
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

    /** Variables disponibles dans un message. Une seule liste, partagee par l'ecran et la fenetre. */
    VARIABLES: ['{client}', '{prenom}', '{nom}', '{medicament}', '{officine}', '{telephone_officine}',
        '{dernier_achat}'],

    htmlVariables: function () {
        return this.VARIABLES.map(function (variable) {
            return '<a href="#" data-variable="' + variable + '" title="Insérer ' + variable + ' dans le message"'
                    + ' style="display:inline-block;margin:0 6px 4px 0;padding:1px 6px;border:1px solid #b8c6d4;'
                    + 'border-radius:3px;background:#f4f7fa;color:#2a4d69;text-decoration:none;">'
                    + variable + '</a>';
        }).join('');
    },

    /*
     * Insere la variable la ou se trouve le curseur, et replace le curseur JUSTE APRES : sans cela
     * l'insertion suivante repartirait du debut du message, et il faudrait recliquer dans la zone
     * de saisie entre chaque variable.
     */
    insererVariable: function (zone, variable) {
        if (!zone) {
            return;
        }
        const element = zone.inputEl && zone.inputEl.dom;
        const texte = zone.getValue() || '';
        let debut = texte.length;
        let fin = texte.length;
        if (element && typeof element.selectionStart === 'number') {
            debut = element.selectionStart;
            fin = element.selectionEnd;
        }
        zone.setValue(texte.slice(0, debut) + variable + texte.slice(fin));
        zone.focus();
        if (element && element.setSelectionRange) {
            const apres = debut + variable.length;
            // Apres setValue, le champ est re-rendu : on repositionne au tour de boucle suivant.
            Ext.defer(function () {
                element.setSelectionRange(apres, apres);
            }, 1);
        }
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
