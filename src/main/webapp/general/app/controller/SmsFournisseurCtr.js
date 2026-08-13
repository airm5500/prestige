/* global Ext */

Ext.define('testextjs.controller.SmsFournisseurCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.notification.SmsFournisseur', 'testextjs.view.notification.SmsFournisseurForm'],
    refs: [
        {
            ref: 'smsfournisseur',
            selector: 'smsfournisseur'
        },
        {
            ref: 'smsfournisseurGrid',
            selector: 'smsfournisseur gridpanel'
        },
        {
            ref: 'smsfournisseurForm',
            selector: 'smsfournisseurForm'
        },
        {
            ref: 'form',
            selector: 'smsfournisseurForm form'
        },
        {
            ref: 'paramsFieldset',
            selector: 'smsfournisseurForm #paramsFieldset'
        },
        {
            ref: 'codeField',
            selector: 'smsfournisseurForm #codeField'
        },
        {
            ref: 'dlrModeField',
            selector: 'smsfournisseurForm #dlrModeField'
        },
        {
            ref: 'dlrCallbackUrlField',
            selector: 'smsfournisseurForm #dlrCallbackUrlField'
        }
    ],
    init: function (application) {
        this.control({
            'smsfournisseur gridpanel': {
                viewready: this.doInitStore,
                cellclick: this.onCellClick
            },
            'smsfournisseur gridpanel actioncolumn': {
                editer: this.editer,
                tester: this.tester,
                envigueur: this.definirEnVigueur,
                remove: this.remove
            },
            'smsfournisseur #addBtn': {
                click: this.add
            },
            'smsfournisseurForm #btnsave': {
                click: this.saveRecord
            },
            'smsfournisseurForm #btnCancel': {
                click: this.closeWindows
            },
            'smsfournisseurForm #dlrModeField': {
                change: this.onDlrModeChange
            }
        });
    },
    doInitStore: function () {
        this.reload();
    },
    reload: function () {
        this.getSmsfournisseurGrid().getStore().load();
    },
    add: function () {
        const me = this;
        const formwin = Ext.create('testextjs.view.notification.SmsFournisseurForm');
        formwin.show();
        me.buildParamFields(null);
    },
    editer: function (view, rowIndex, colIndex, item, e, record) {
        const me = this;
        const formwin = Ext.create('testextjs.view.notification.SmsFournisseurForm');
        formwin.show();
        me.getForm().getForm().setValues({
            id: record.get('id'),
            code: record.get('code'),
            libelle: record.get('libelle'),
            dlrMode: record.get('dlrMode'),
            dlrCallbackUrl: record.get('dlrCallbackUrl')
        });
        // Le code identifie le fournisseur : non modifiable sur une fiche existante.
        me.getCodeField().setReadOnly(true);
        me.onDlrModeChange();
        me.buildParamFields(record.get('params'));
    },
    /**
     * Construit les champs du fieldset "Paramètres" à partir des définitions renvoyées par le serveur
     * (cle/libelle/valeur/secret/obligatoire). Les secrets sont des champs mot de passe, vides = inchangés.
     */
    buildParamFields: function (params) {
        const fieldset = this.getParamsFieldset();
        fieldset.removeAll();
        if (!params || params.length === 0) {
            fieldset.add({
                xtype: 'component',
                html: '<i>Les param&egrave;tres appara&icirc;tront apr&egrave;s enregistrement pour les fournisseurs reconnus (ORANGE, LETEXTO).</i>'
            });
            return;
        }
        Ext.Array.each(params, function (param) {
            fieldset.add({
                xtype: 'textfield',
                fieldLabel: param.libelle + (param.obligatoire ? ' *' : ''),
                name: 'param_' + param.cle,
                inputType: param.secret ? 'password' : 'text',
                value: param.secret ? '' : (param.valeur || ''),
                emptyText: param.secret ? (param.definie ? '•••••• (laisser vide pour conserver)' : 'À renseigner') : ''
            });
        });
    },
    onDlrModeChange: function () {
        const me = this;
        const callback = me.getDlrModeField().getValue() === 'CALLBACK';
        me.getDlrCallbackUrlField().setVisible(callback);
    },
    closeWindows: function () {
        this.getSmsfournisseurForm().destroy();
    },
    saveRecord: function () {
        const me = this;
        const form = me.getForm();
        if (!form.isValid()) {
            return;
        }
        const values = form.getValues();
        const payload = {
            id: values.id,
            code: values.code,
            libelle: values.libelle,
            dlrMode: values.dlrMode,
            dlrCallbackUrl: values.dlrCallbackUrl,
            params: {}
        };
        Ext.Object.each(values, function (key, value) {
            if (key.indexOf('param_') === 0) {
                payload.params[key.substring('param_'.length)] = value;
            }
        });
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/sms-fournisseurs',
            params: Ext.JSON.encode(payload),
            success: function (response) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result && result.success) {
                    me.closeWindows();
                    me.reload();
                } else {
                    Ext.Msg.alert('Message', (result && result.msg) || "L'opération a échoué");
                }
            },
            failure: function (response) {
                progress.hide();
                Ext.Msg.alert('Message', 'Erreur serveur (code ' + response.status + ')');
            }
        });
    },
    onCellClick: function (view, td, cellIndex, record, tr, rowIndex, e) {
        const column = view.getHeaderAtIndex(cellIndex);
        if (!column || column.itemId !== 'actifSwitchColumn') {
            return;
        }
        this.postAction(record, 'toggle', null);
    },
    tester: function (view, rowIndex, colIndex, item, e, record) {
        const progress = Ext.MessageBox.wait('Test de connexion en cours . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/sms-fournisseurs/' + record.get('id') + '/tester',
            success: function (response) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                Ext.MessageBox.show({
                    title: 'Test ' + record.get('libelle'),
                    width: 380,
                    msg: (result && result.msg) || 'Résultat indisponible',
                    buttons: Ext.MessageBox.OK,
                    icon: (result && result.success) ? Ext.MessageBox.INFO : Ext.MessageBox.WARNING
                });
            },
            failure: function (response) {
                progress.hide();
                Ext.Msg.alert('Message', 'Erreur serveur (code ' + response.status + ')');
            }
        });
    },
    definirEnVigueur: function (view, rowIndex, colIndex, item, e, record) {
        const me = this;
        if (record.get('enVigueur')) {
            Ext.Msg.alert('Message', 'Ce fournisseur est déjà en vigueur.');
            return;
        }
        Ext.MessageBox.confirm('Confirmation',
                'Basculer tous les envois de SMS vers <b>' + record.get('libelle') + '</b> ?',
                function (btn) {
                    if (btn === 'yes') {
                        me.postAction(record, 'en-vigueur', 'Les envois passent par ' + record.get('libelle') + '.');
                    }
                });
    },
    remove: function (view, rowIndex, colIndex, item, e, record) {
        const me = this;
        Ext.MessageBox.confirm('Confirmation',
                'Supprimer le fournisseur <b>' + record.get('libelle') + '</b> ?',
                function (btn) {
                    if (btn === 'yes') {
                        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                        Ext.Ajax.request({
                            method: 'DELETE',
                            headers: {'Content-Type': 'application/json'},
                            url: '../api/v1/sms-fournisseurs/' + record.get('id'),
                            success: function (response) {
                                progress.hide();
                                const result = Ext.JSON.decode(response.responseText, true);
                                if (result && result.success) {
                                    me.reload();
                                } else {
                                    Ext.Msg.alert('Message', (result && result.msg) || "L'opération a échoué");
                                }
                            },
                            failure: function (response) {
                                progress.hide();
                                Ext.Msg.alert('Message', 'Erreur serveur (code ' + response.status + ')');
                            }
                        });
                    }
                });
    },
    /** POST générique sur une action de fournisseur (toggle, en-vigueur) puis rechargement de la grille. */
    postAction: function (record, action, successMsg) {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/sms-fournisseurs/' + record.get('id') + '/' + action,
            success: function (response) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result && result.success) {
                    if (successMsg) {
                        Ext.Msg.alert('Message', successMsg);
                    }
                    me.reload();
                } else {
                    Ext.Msg.alert('Message', (result && result.msg) || "L'opération a échoué");
                }
            },
            failure: function (response) {
                progress.hide();
                Ext.Msg.alert('Message', 'Erreur serveur (code ' + response.status + ')');
            }
        });
    }
});
