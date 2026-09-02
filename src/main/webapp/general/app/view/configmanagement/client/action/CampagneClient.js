/* global Ext */

/*
 * Point 2 : fenetre « SMS / WhatsApp » du suivi de consommation.
 *
 * Etape 1 : canal, modele (variables {client}, {prenom}, {nom}, {medicament}, {officine},
 *           {telephone_officine}, {dernier_achat}), texte modifiable, nombre de destinataires.
 * Etape 2 : controle des numeros par le serveur (obligatoire) : conformes / non conformes avec motif,
 *           export Excel des anomalies, puis « Continuer » avec les seuls contacts conformes.
 * Etape 3 : SMS -> envoi par le pipeline SMS existant (une notification personnalisee par client) ;
 *           WhatsApp -> liste de liens wa.me a ouvrir un par un (envoi assiste, pas d'API Business).
 *
 * La population est toujours relue cote serveur : clients coches, sinon tout le resultat des criteres.
 */
Ext.define('testextjs.view.configmanagement.client.action.CampagneClient', {
    extend: 'Ext.window.Window',
    xtype: 'campagneclient',
    title: 'SMS / WhatsApp - campagne clients',
    modal: true,
    width: 900,
    height: 620,
    layout: 'card',
    activeItem: 0,
    bodyPadding: 10,

    // config transmise par l'onglet
    filtres: null,
    clientIds: null,
    nbResultat: 0,
    medicamentLibelle: '',

    initComponent: function () {
        const me = this;
        me.clientIds = me.clientIds || [];
        const storeModeles = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', 'canal', 'contenu'],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/modeles-messages',
                extraParams: {canal: 'SMS'},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.storeModeles = storeModeles;
        const cibleTexte = me.clientIds.length
                ? '<b>' + me.clientIds.length + '</b> client(s) coché(s)'
                : 'tout le résultat de la recherche (<b>' + me.nbResultat + '</b> client(s))';

        Ext.applyIf(me, {
            items: [{
                    // ---------------------------------------------------------------- etape 1
                    xtype: 'form',
                    itemId: 'etapePreparer',
                    border: false,
                    layout: 'anchor',
                    defaults: {anchor: '100%'},
                    items: [{
                            xtype: 'displayfield',
                            fieldLabel: 'Destinataires',
                            labelWidth: 110,
                            itemId: 'cibleTexte',
                            value: cibleTexte + (me.medicamentLibelle ? ' - médicament filtré : <b>'
                                    + Ext.String.htmlEncode(me.medicamentLibelle) + '</b>' : '')
                        }, {
                            xtype: 'radiogroup',
                            fieldLabel: 'Canal',
                            labelWidth: 110,
                            itemId: 'canal',
                            columns: 2,
                            width: 420,
                            items: [
                                {boxLabel: 'SMS', name: 'canal', inputValue: 'SMS', checked: true},
                                {boxLabel: 'WhatsApp (assisté par lien)', name: 'canal', inputValue: 'WHATSAPP'}
                            ],
                            listeners: {
                                change: function (grp, valeur) {
                                    me.onCanal(valeur.canal);
                                }
                            }
                        }, {
                            xtype: 'combobox',
                            fieldLabel: 'Modèle',
                            labelWidth: 110,
                            itemId: 'modele',
                            store: storeModeles,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            emptyText: 'Choisir un modèle de message...',
                            listeners: {
                                select: function (cmp, records) {
                                    if (records && records[0]) {
                                        me.down('#message').setValue(records[0].get('contenu'));
                                    }
                                }
                            }
                        }, {
                            xtype: 'textareafield',
                            fieldLabel: 'Message',
                            labelWidth: 110,
                            itemId: 'message',
                            height: 150,
                            allowBlank: false,
                            maxLength: 1000,
                            enableKeyEvents: true,
                            listeners: {
                                change: function () {
                                    me.majCompteur();
                                }
                            }
                        }, {
                            xtype: 'displayfield',
                            labelWidth: 110,
                            fieldLabel: ' ',
                            labelSeparator: '',
                            itemId: 'compteur',
                            value: ''
                        }, {
                            xtype: 'displayfield',
                            labelWidth: 110,
                            fieldLabel: 'Variables',
                            value: '<span style="color:#555;">{client} {prenom} {nom} {medicament} {officine} '
                                    + '{telephone_officine} {dernier_achat} : remplacées pour chaque client. '
                                    + 'Le texte reste modifiable avant le contrôle.</span>'
                        }, {
                            xtype: 'displayfield',
                            labelWidth: 110,
                            fieldLabel: ' ',
                            labelSeparator: '',
                            itemId: 'noteWhatsapp',
                            hidden: true,
                            value: '<span style="color:#8a6d3b;">WhatsApp : sans API WhatsApp Business configurée, '
                                    + 'l\'application prépare un lien par client avec le message prérempli ; '
                                    + 'vous ouvrez chaque conversation et confirmez l\'envoi dans WhatsApp.</span>'
                        }],
                    buttons: [{
                            text: 'Contrôler les numéros',
                            itemId: 'btnControler',
                            iconCls: 'searchicon',
                            handler: function () {
                                me.controler();
                            }
                        }, {
                            text: 'Annuler',
                            handler: function () {
                                me.close();
                            }
                        }]
                }, {
                    // ---------------------------------------------------------------- etape 2
                    xtype: 'panel',
                    itemId: 'etapeControle',
                    border: false,
                    layout: {type: 'vbox', align: 'stretch'},
                    items: [{
                            xtype: 'displayfield',
                            itemId: 'resumeControle',
                            value: ''
                        }, {
                            xtype: 'gridpanel',
                            itemId: 'grilleAnomalies',
                            flex: 1,
                            title: 'Numéros non conformes',
                            store: Ext.create('Ext.data.Store', {
                                fields: ['clientId', 'client', 'telephone', 'motif'],
                                data: []
                            }),
                            viewConfig: {emptyText: '<div style="margin:10px;">Aucune anomalie</div>', deferEmptyText: false},
                            columns: [
                                {text: 'Client', dataIndex: 'client', flex: 1.5},
                                {text: 'Téléphone enregistré', dataIndex: 'telephone', flex: 1},
                                {text: 'Motif', dataIndex: 'motif', flex: 1.5}
                            ]
                        }],
                    buttons: [{
                            text: 'Retour',
                            handler: function () {
                                me.getLayout().setActiveItem(0);
                            }
                        }, {
                            text: 'Exporter Excel (non conformes)',
                            itemId: 'btnExcelAnomalies',
                            iconCls: 'export_excel_icon',
                            handler: function () {
                                me.exporterAnomalies();
                            }
                        }, {
                            text: 'Continuer',
                            itemId: 'btnContinuer',
                            handler: function () {
                                me.continuer();
                            }
                        }, {
                            text: 'Annuler',
                            handler: function () {
                                me.close();
                            }
                        }]
                }, {
                    // ---------------------------------------------------------------- etape 3 (WhatsApp)
                    xtype: 'panel',
                    itemId: 'etapeWhatsapp',
                    border: false,
                    layout: {type: 'vbox', align: 'stretch'},
                    items: [{
                            xtype: 'displayfield',
                            itemId: 'resumeWhatsapp',
                            value: ''
                        }, {
                            xtype: 'gridpanel',
                            itemId: 'grilleLiens',
                            flex: 1,
                            store: Ext.create('Ext.data.Store', {
                                fields: ['clientId', 'client', 'telephone', 'message', 'lien', 'ouvert'],
                                data: []
                            }),
                            columns: [
                                {text: 'Client', dataIndex: 'client', flex: 1.2},
                                {text: 'Numéro', dataIndex: 'telephone', width: 120},
                                {text: 'Message', dataIndex: 'message', flex: 2.5},
                                {
                                    xtype: 'actioncolumn',
                                    text: 'WhatsApp',
                                    width: 80,
                                    align: 'center',
                                    items: [{
                                            iconCls: 'addicon',
                                            tooltip: 'Ouvrir la conversation WhatsApp avec le message prérempli',
                                            handler: function (grid, rowIndex) {
                                                const rec = grid.getStore().getAt(rowIndex);
                                                window.open(rec.get('lien'), '_blank');
                                                rec.set('ouvert', true);
                                            }
                                        }]
                                },
                                {
                                    text: 'Ouvert',
                                    dataIndex: 'ouvert',
                                    width: 60,
                                    align: 'center',
                                    renderer: function (v) {
                                        return v ? '<span style="color:#1e7e34;font-weight:bold;">oui</span>' : '';
                                    }
                                }
                            ]
                        }],
                    buttons: [{
                            text: 'Fermer',
                            handler: function () {
                                me.close();
                            }
                        }]
                }]
        });
        me.callParent(arguments);
        storeModeles.load();
    },

    onCanal: function (canal) {
        const me = this;
        me.storeModeles.getProxy().setExtraParam('canal', canal);
        me.storeModeles.load();
        me.down('#modele').clearValue();
        me.down('#noteWhatsapp').setVisible(canal === 'WHATSAPP');
        me.majCompteur();
    },

    canal: function () {
        const v = this.down('#canal').getValue();
        return v && v.canal ? v.canal : 'SMS';
    },

    /** Longueur et nombre de SMS estimes (160 caracteres, 153 par segment au-dela ; 70/67 avec accents). */
    majCompteur: function () {
        const me = this;
        const texte = me.down('#message').getValue() || '';
        const gsm = /^[\x00-\x7F€]*$/.test(texte);
        const n = texte.length;
        let info = n + ' caractère(s)';
        if (me.canal() === 'SMS' && n) {
            const simple = gsm ? 160 : 70, suite = gsm ? 153 : 67;
            const segments = n <= simple ? 1 : Math.ceil(n / suite);
            info += ' - ' + segments + ' SMS' + (gsm ? '' : ' (accents : messages plus courts)');
        }
        me.down('#compteur').setValue('<span style="color:#555;">' + info + '</span>');
    },

    corps: function () {
        const me = this;
        return {
            clientIds: me.clientIds,
            filtres: me.filtres || {},
            canal: me.canal(),
            modeleId: me.down('#modele').getValue() || '',
            message: me.down('#message').getValue() || '',
            medicament: me.medicamentLibelle || ''
        };
    },

    controler: function () {
        const me = this;
        if (!me.down('#etapePreparer').getForm().isValid()) {
            Ext.Msg.alert('Message', 'Saisissez ou choisissez le message avant le contrôle.');
            return;
        }
        const bouton = me.down('#btnControler');
        bouton.disable();
        me.setLoading('Contrôle des numéros...');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/notifications/clients/validate-phones',
            headers: {'Content-Type': 'application/json'},
            jsonData: me.corps(),
            callback: function (opts, success, response) {
                me.setLoading(false);
                bouton.enable();
                let json = {};
                try {
                    json = Ext.decode(response.responseText);
                } catch (e) {
                }
                if (!success || !json.success) {
                    Ext.Msg.alert('Message', json.msg || 'Le contrôle des numéros a échoué : aucun envoi possible.');
                    return;
                }
                me.controle = json;
                const nc = json.nbNonConformes || 0, c = json.nbConformes || 0;
                me.down('#resumeControle').setValue('<b>' + json.total + '</b> destinataire(s) contrôlé(s) : '
                        + '<span style="color:#1e7e34;font-weight:bold;">' + c + ' conforme(s)</span>, '
                        + '<span style="color:' + (nc ? '#c0392b' : '#333') + ';font-weight:bold;">' + nc
                        + ' non conforme(s)</span>'
                        + (nc ? ' - ils seront exclus si vous continuez.' : '.'));
                me.down('#grilleAnomalies').getStore().loadData(json.nonConformes || []);
                me.down('#btnExcelAnomalies').setVisible(nc > 0);
                const continuer = me.down('#btnContinuer');
                continuer.setText(me.canal() === 'WHATSAPP' ? 'Préparer les liens WhatsApp (' + c + ')'
                        : 'Envoyer les SMS (' + c + ')');
                continuer.setDisabled(c === 0);
                me.getLayout().setActiveItem(1);
            }
        });
    },

    /** Export des anomalies par envoi de formulaire (fichier), avec le meme JSON que le controle. */
    exporterAnomalies: function () {
        const me = this;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '../api/v1/notifications/clients/invalid-phones/excel';
        form.target = '_blank';
        const champ = document.createElement('input');
        champ.type = 'hidden';
        champ.name = 'corps';
        champ.value = Ext.encode(me.corps());
        form.appendChild(champ);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    },

    continuer: function () {
        const me = this;
        if (!me.controle || !me.controle.nbConformes) {
            Ext.Msg.alert('Message', 'Aucun numéro conforme : aucun envoi.');
            return;
        }
        if (me.canal() === 'WHATSAPP') {
            me.preparerWhatsapp();
            return;
        }
        Ext.Msg.confirm('Confirmation', 'Envoyer le SMS à ' + me.controle.nbConformes + ' client(s) ?', function (btn) {
            if (btn === 'yes') {
                me.envoyerSms();
            }
        });
    },

    envoyerSms: function () {
        const me = this;
        const bouton = me.down('#btnContinuer');
        bouton.disable();
        me.setLoading('Envoi en cours...');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/notifications/clients/send-sms',
            headers: {'Content-Type': 'application/json'},
            jsonData: me.corps(),
            callback: function (opts, success, response) {
                me.setLoading(false);
                let json = {};
                try {
                    json = Ext.decode(response.responseText);
                } catch (e) {
                }
                if (success && json.success) {
                    Ext.Msg.alert('Message', json.msg || 'SMS envoyés');
                    me.close();
                } else {
                    bouton.enable();
                    Ext.Msg.alert('Message', json.msg || 'L\'envoi a échoué');
                }
            }
        });
    },

    preparerWhatsapp: function () {
        const me = this;
        me.setLoading('Préparation des liens...');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/notifications/clients/whatsapp-liens',
            headers: {'Content-Type': 'application/json'},
            jsonData: me.corps(),
            callback: function (opts, success, response) {
                me.setLoading(false);
                let json = {};
                try {
                    json = Ext.decode(response.responseText);
                } catch (e) {
                }
                if (!success || !json.success) {
                    Ext.Msg.alert('Message', json.msg || 'La préparation des liens a échoué');
                    return;
                }
                me.down('#resumeWhatsapp').setValue('<b>' + json.total + '</b> conversation(s) à ouvrir : '
                        + 'cliquez sur l\'icône de chaque ligne, WhatsApp s\'ouvre avec le message prérempli ; '
                        + 'confirmez l\'envoi dans WhatsApp.');
                me.down('#grilleLiens').getStore().loadData(json.liens || []);
                me.getLayout().setActiveItem(2);
            }
        });
    }
});
