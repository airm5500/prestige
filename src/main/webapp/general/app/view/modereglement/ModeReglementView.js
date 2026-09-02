Ext.define('testextjs.view.modereglement.ModeReglementView', {
    extend: 'Ext.panel.Panel',
    xtype: 'modereglementview',
    id: 'modereglementview',
    width: '97%',
    height: 'auto',
    frame: true,
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'

    },
    requires: [
        'Ext.grid.feature.Grouping',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'testextjs.view.modereglement.ModeReglementGrid'
    ],

    title: 'Gestion des modes de règlement',

    initComponent: function () {




        const me = this;
        Ext.applyIf(me, {
            /* Point 7 : creation d'un mode de reglement depuis le menu, regroupe avec les existants.
             * Le mode est cree cote serveur (type + mode) et classe mobile money ou standard. */
            tbar: [{
                    xtype: 'button',
                    itemId: 'btnNouveauMode',
                    text: 'Nouveau mode de règlement',
                    iconCls: 'addicon',
                    handler: function () {
                        me.ouvrirCreation();
                    }
                }],
            items: [{
                    xtype: 'modereglementgrid'

                }]

        });
        me.callParent(arguments);
    },

    ouvrirCreation: function () {
        const me = this;
        const win = Ext.create('Ext.window.Window', {
            title: 'Nouveau mode de règlement',
            modal: true,
            width: 420,
            bodyPadding: 12,
            layout: 'anchor',
            defaults: {anchor: '100%'},
            items: [{
                    xtype: 'textfield',
                    itemId: 'nomMode',
                    fieldLabel: 'Nom',
                    labelWidth: 110,
                    allowBlank: false,
                    maxLength: 20,
                    enforceMaxLength: true,
                    fieldStyle: 'text-transform:uppercase;',
                    emptyText: 'Ex. WYZALL, PUSH PAY...',
                    listeners: {
                        afterrender: function (cmp) {
                            cmp.focus(true, 100);
                        },
                        specialkey: function (cmp, e) {
                            if (e.getKey() === e.ENTER) {
                                me.enregistrerCreation(win);
                            }
                        }
                    }
                }, {
                    xtype: 'checkbox',
                    itemId: 'mobileMoney',
                    fieldLabel: 'Mobile money',
                    labelWidth: 110,
                    boxLabel: 'compté avec Orange, MTN, Moov, Wave, Djamo (caisse, balance, ticket Z)',
                    checked: true
                }],
            buttons: [{
                    text: 'Enregistrer',
                    itemId: 'btnEnregistrerMode',
                    handler: function () {
                        me.enregistrerCreation(win);
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.destroy();
                    }
                }]
        });
        win.show();
        return win;
    },

    enregistrerCreation: function (win) {
        const me = this;
        const nomField = win.down('#nomMode');
        const nom = (nomField.getValue() || '').trim();
        if (!nom) {
            nomField.markInvalid('Le nom est obligatoire');
            nomField.focus();
            return;
        }
        const bouton = win.down('#btnEnregistrerMode');
        if (bouton.isDisabled()) {
            return;
        }
        bouton.disable();
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/modereglement',
            jsonData: {name: nom, mobileMoney: win.down('#mobileMoney').getValue()},
            callback: function (opts, success, response) {
                let json = {};
                try {
                    json = Ext.decode(response.responseText);
                } catch (e) {
                }
                if (json.success) {
                    win.destroy();
                    const grille = me.down('modereglementgrid');
                    if (grille) {
                        grille.getStore().reload();
                    }
                    Ext.Msg.alert('Message', json.msg || 'Mode de règlement créé');
                } else {
                    bouton.enable();
                    Ext.Msg.alert('Message', json.msg || 'La création a échoué');
                }
            }
        });
    }








    /* items: [
     {
     xtype: 'modereglementgrid'
     }
     ]*/
});



