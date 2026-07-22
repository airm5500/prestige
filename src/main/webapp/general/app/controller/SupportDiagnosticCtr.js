/* global Ext */

Ext.define('testextjs.controller.SupportDiagnosticCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.support.SupportDiagnostic'],
    refs: [
        {
            ref: 'diagnosticGrid',
            selector: 'supportdiagnostic gridpanel'
        },
        {
            ref: 'comboNiveau',
            selector: 'supportdiagnostic combobox#comboNiveau'
        }
    ],
    init: function (application) {
        this.control({
            'supportdiagnostic gridpanel': {
                viewready: this.doInitStore
            },
            'supportdiagnostic combobox#comboNiveau': {
                change: this.onNiveauChange
            },
            'supportdiagnostic button#btnActualiser': {
                click: this.doRefresh
            },
            'supportdiagnostic gridpanel actioncolumn': {
                voir: this.onVoir,
                creerticket: this.onCreerTicket
            }
        });
    },

    doInitStore: function () {
        this.getDiagnosticGrid().getStore().load();
    },

    doRefresh: function () {
        this.getDiagnosticGrid().getStore().reload();
    },

    onNiveauChange: function (combo, newValue) {
        const store = this.getDiagnosticGrid().getStore();
        store.getProxy().extraParams.niveau = (newValue === 'TOUS') ? '' : newValue;
        store.loadPage(1);
    },

    onVoir: function (view, rowIndex, colIndex, item, e, record) {
        const data = record.data;
        let html = '<b>1ère apparition :</b> ' + Ext.String.htmlEncode(data.createdAt) + '<br/>'
                + '<b>Dernière apparition :</b> ' + Ext.String.htmlEncode(data.lastSeenAt) + '<br/>'
                + '<b>Module :</b> ' + Ext.String.htmlEncode(data.module) + '<br/>'
                + '<b>Type :</b> ' + Ext.String.htmlEncode(data.type) + '<br/>'
                + '<b>Niveau :</b> ' + Ext.String.htmlEncode(data.niveau) + '<br/>'
                + '<b>Occurrences :</b> ' + data.occurrences + '<br/>'
                + '<b>Utilisateur :</b> ' + Ext.String.htmlEncode(data.utilisateur) + '<br/>'
                + '<b>Écran/URL :</b> ' + Ext.String.htmlEncode(data.urlOuEcran) + '<br/><br/>'
                + '<b>Message :</b><br/>' + Ext.String.htmlEncode(data.messageCourt);
        if (data.payloadJson) {
            html += '<br/><br/><b>Contexte :</b><br/><pre style="white-space:pre-wrap;">'
                    + Ext.String.htmlEncode(data.payloadJson) + '</pre>';
        }
        if (data.logRef) {
            html += '<br/><b>Fichier log :</b> ' + Ext.String.htmlEncode(data.logRef);
        }
        Ext.create('Ext.window.Window', {
            title: 'Détail de l\'événement',
            modal: true,
            width: 720,
            height: 480,
            resizable: true,
            maximizable: true,
            layout: 'fit',
            items: [
                {
                    xtype: 'panel',
                    autoScroll: true,
                    bodyPadding: 12,
                    html: html
                }
            ]
        }).show();
    },

    onCreerTicket: function (view, rowIndex, colIndex, item, e, record) {
        const me = this;
        Ext.Msg.confirm('Confirmation', 'Créer (ou rattacher) un ticket pour cet événement ?', function (btn) {
            if (btn !== 'yes') {
                return;
            }
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                url: '../api/v1/support/events/' + record.data.id + '/ticket',
                headers: {'Content-Type': 'application/json'},
                success: function (response) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true) || {};
                    Ext.Msg.alert('Message', result.msg || 'Opération effectuée');
                    me.doRefresh();
                },
                failure: function () {
                    progress.hide();
                    Ext.Msg.alert('Message', 'Un problème avec le serveur');
                }
            });
        });
    }
});
