/* global Ext */

Ext.define('testextjs.controller.SupportContactCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.support.SupportContact'],
    refs: [
        {
            ref: 'supportContactPanel',
            selector: 'supportcontact'
        },
        {
            ref: 'supportContactForm',
            selector: 'supportcontact form'
        },
        {
            ref: 'supportDemandeGrid',
            selector: 'supportcontact gridpanel'
        }
    ],
    init: function (application) {
        this.control({
            'supportcontact gridpanel': {
                viewready: this.doInitStore
            },
            'supportcontact button#btnEnvoyer': {
                click: this.onEnvoyer
            },
            'supportcontact button#btnReinit': {
                click: this.onReinit
            },
            'supportcontact gridpanel actioncolumn': {
                voir: this.onVoir
            }
        });
    },

    doInitStore: function () {
        this.getSupportDemandeGrid().getStore().load();
    },

    onReinit: function () {
        this.getSupportContactForm().getForm().reset();
    },

    onEnvoyer: function () {
        const me = this;
        const form = me.getSupportContactForm().getForm();
        if (!form.isValid()) {
            Ext.Msg.alert('Message', 'Veuillez renseigner l\'objet et le message');
            return;
        }
        form.submit({
            url: '../support-contact',
            waitMsg: 'Envoi de la demande en cours . . .',
            success: function (f, action) {
                form.reset();
                me.getSupportDemandeGrid().getStore().load();
                Ext.Msg.alert('Message', action.result.msg);
            },
            failure: function (f, action) {
                me.getSupportDemandeGrid().getStore().load();
                const msg = (action.result && action.result.msg) ? action.result.msg : 'Un problème avec le serveur';
                Ext.Msg.alert('Message', msg);
            }
        });
    },

    onVoir: function (view, rowIndex, colIndex, item, e, record) {
        const data = record.data;
        let html = '<b>Date :</b> ' + Ext.String.htmlEncode(data.createdAt) + '<br/>'
                + '<b>Objet :</b> ' + Ext.String.htmlEncode(data.objet) + '<br/>'
                + '<b>Module :</b> ' + Ext.String.htmlEncode(data.moduleConcerne) + '<br/>'
                + '<b>Urgence :</b> ' + Ext.String.htmlEncode(data.urgence) + '<br/>'
                + '<b>Utilisateur :</b> ' + Ext.String.htmlEncode(data.creePar) + '<br/><br/>'
                + '<b>Message :</b><br/>' + Ext.String.htmlEncode(data.message).replace(/\n/g, '<br/>');
        if (data.statutEnvoi === 'ECHOUEE' && data.erreurEnvoi) {
            html += '<br/><br/><b style="color:red;">Erreur d\'envoi :</b> '
                    + Ext.String.htmlEncode(data.erreurEnvoi);
        }
        Ext.create('Ext.window.Window', {
            title: 'Détail de la demande',
            modal: true,
            width: 550,
            maxHeight: 450,
            autoScroll: true,
            bodyPadding: 10,
            html: html
        }).show();
    }
});
