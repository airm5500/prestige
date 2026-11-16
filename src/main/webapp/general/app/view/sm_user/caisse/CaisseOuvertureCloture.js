/* global Ext, PrestigeTicketMvtCaisse */

/*
 * Plan du 14/11, point 5 : « Ouverture / clôture de caisse » en un seul ecran.
 *  - ouverture a gauche, cloture a droite ; le cote qui ne s'applique pas est grise (pas masque) : caisse fermee,
 *    la cloture est grisee ; caisse ouverte, l'ouverture est grisee ;
 *  - chaque cote garde le droit de son ancien menu (v1/caisse/droits-ecran) : sans ce droit, il reste grise ;
 *  - memes API que les deux anciens ecrans (billetage/ouventure-data, caisse/ouvrir-caisse, billetage/cloture-data,
 *    fenetre de billetage puis billetage/cloture). cloture-data cree une caisse s'il n'en existe pas : il n'est
 *    appele que caisse ouverte ;
 *  - la cloture se confirme dans le bouton (deux clics), sans fenetre ; apres chaque operation l'ecran relit son
 *    etat au lieu de partir ailleurs ;
 *  - identifiants locaux (itemId) seulement : l'ecran d'ouverture garde ses ids globaux, il sert encore de fenetre
 *    forcee dans la vente, le depot et le reglement.
 */
Ext.define('testextjs.view.sm_user.caisse.CaisseOuvertureCloture', {
    extend: 'Ext.panel.Panel',
    xtype: 'caisseouverturecloture',
    requires: ['testextjs.view.sm_user.caisse.action.DoBilletage'],
    border: false,
    header: false,
    autoScroll: true,
    bodyPadding: 12,
    cls: 'caisse-oc',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },
    DELAI_CONFIRMATION: 10000,

    initComponent: function () {
        var me = this;
        var valeur = {fieldStyle: 'color:#1a5f9e;font-size:1.25em;font-weight:bold;'};
        /* Retour du 16/11 : le bloc est centre dans le panneau, sur LARGEUR_MAX au plus. Colle a gauche, il passait
         * sous le volet de navigation deplie (260 px, flottant) ; centre et limite, il laisse ce volet a sa gauche sur
         * un ecran de portable (1366 px). */
        Ext.apply(me, {
            layout: {type: 'hbox', pack: 'center', align: 'start'},
            items: [{
                    xtype: 'container', itemId: 'ocBloc', flex: 1, maxWidth: me.LARGEUR_MAX,
                    layout: {type: 'vbox', align: 'stretch'},
                    items: me.contenu(valeur)
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', me.charger, me, {single: true});
    },

    LARGEUR_MAX: 860,

    contenu: function (valeur) {
        var me = this;
        return [{
                    xtype: 'component', itemId: 'ocEtat', margin: '0 0 10 0', cls: 'caisse-oc-etat',
                    html: 'Lecture de l\'état de la caisse…'
                }, {
                    xtype: 'container', layout: {type: 'hbox', align: 'stretch'},
                    defaults: {flex: 1, minWidth: 320, bodyPadding: 12, frame: true},
                    items: [{
                            xtype: 'form', itemId: 'ocOuverture', title: 'Ouverture de caisse', margin: '0 12 0 0',
                            disabled: true,
                            fieldDefaults: {labelAlign: 'left', labelWidth: 110, anchor: '100%'},
                            items: [
                                {xtype: 'hiddenfield', name: 'id', itemId: 'ocCoffreId'},
                                Ext.apply({xtype: 'displayfield', fieldLabel: 'Nom', itemId: 'ocNom'}, valeur),
                                Ext.apply({xtype: 'displayfield', fieldLabel: 'Prénom', itemId: 'ocPrenom'}, valeur),
                                {
                                    xtype: 'numberfield', fieldLabel: 'Fond de caisse', name: 'amount', itemId: 'ocMontant', minValue: 0,
                                    height: 30, allowBlank: false, hideTrigger: true,
                                    blankText: 'Saisissez le montant du fond de caisse (0 s\'il n\'y en a pas)',
                                    /* meme regle que l'ecran d'ouverture : francs entiers, refus explique sous le champ */
                                    validator: function (v) {
                                        return /^\s*\d*\s*$/.test(String(v)) || 'Montant en francs entiers, sans virgule ni décimale';
                                    },
                                    listeners: {specialkey: function (f, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.ouvrir();
                                            }
                                        }}
                                },
                                Ext.apply({xtype: 'displayfield', fieldLabel: 'Ouverte à', itemId: 'ocOuverteA', hidden: true}, valeur)
                            ],
                            buttons: [{text: 'Ouvrir la caisse', itemId: 'ocBtnOuvrir', iconCls: 'icon-add', handler: function () {
                                        me.ouvrir();
                                    }}]
                        }, {
                            xtype: 'form', itemId: 'ocCloture', title: 'Clôture de caisse', disabled: true,
                            fieldDefaults: {labelAlign: 'left', labelWidth: 110, anchor: '100%'},
                            items: [
                                {xtype: 'hiddenfield', itemId: 'ocResumeId'},
                                Ext.apply({xtype: 'displayfield', fieldLabel: 'Caissier(ère)', itemId: 'ocCaissier'}, valeur),
                                Ext.apply({xtype: 'displayfield', fieldLabel: 'Fond de caisse', itemId: 'ocFond'}, valeur),
                                Ext.apply({xtype: 'displayfield', fieldLabel: 'Ouverte le', itemId: 'ocDate'}, valeur)
                            ],
                            buttons: [{text: 'Clôturer la caisse', itemId: 'ocBtnCloturer', handler: function (b) {
                                        me.clicCloture(b);
                                    }}]
                        }]
                }];
    },

    q: function (itemId) {
        return this.down('#' + itemId);
    },

    /** Droits (une fois), puis etat de la caisse ; chaque cote est active ou grise selon les deux. */
    charger: function () {
        var me = this;
        me.remettreBoutonCloture();
        var lireEtat = function () {
            Ext.Ajax.request({
                method: 'GET', url: '../api/v1/billetage/ouventure-data',
                success: function (response) {
                    if (me.isDestroyed) {
                        return;
                    }
                    var o = Ext.JSON.decode(response.responseText, true) || {}, c = o.data || {};
                    me.q('ocCoffreId').setValue(c.id);
                    me.q('ocNom').setValue(Ext.String.htmlEncode(c.firstName || ''));
                    me.q('ocPrenom').setValue(Ext.String.htmlEncode(c.lastName || ''));
                    if (!me.motifRefus || c.inUse === true) {
                        /* apres un refus, le montant tape reste dans le champ pour etre corrige */
                        me.q('ocMontant').setValue(c.amount);
                    }
                    me.ouverte = c.inUse === true;
                    me.q('ocOuverteA').setVisible(me.ouverte);
                    me.q('ocOuverteA').setValue(c.createAt || '');
                    me.q('ocMontant').setReadOnly(me.ouverte);
                    me.q('ocOuverture').setDisabled(me.ouverte || !me.droits.ouverture);
                    if (me.ouverte) {
                        me.lireCloture();
                    } else {
                        me.viderCloture();
                        me.q('ocCloture').setDisabled(true);
                        me.afficherEtat();
                        if (me.droits.ouverture) {
                            /* le curseur va dans le fond de caisse, sans selectionner ce que l'utilisateur a deja
                               commence a taper (une selection differee effacait les premiers chiffres) */
                            Ext.defer(function () {
                                var champ = me.isDestroyed ? null : me.q('ocMontant');
                                if (champ && !champ.hasFocus && champ.inputEl && document.activeElement !== champ.inputEl.dom) {
                                    champ.focus(true);
                                }
                            }, 100);
                        }
                    }
                },
                failure: function (response) {
                    if (!me.isDestroyed) {
                        me.q('ocEtat').update('<span class="caisse-oc-erreur">L\'état de la caisse n\'a pas pu être lu (erreur '
                                + (response ? response.status : '?') + '). Réessayez.</span>');
                    }
                }
            });
        };
        if (me.droits) {
            lireEtat();
            return;
        }
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/caisse/droits-ecran',
            callback: function (opt, reussi, response) {
                var d = reussi ? Ext.JSON.decode(response.responseText, true) : null;
                me.droits = {ouverture: !!(d && d.ouverture), cloture: !!(d && d.cloture)};
                if (!me.isDestroyed) {
                    if (!me.droits.ouverture) {
                        me.q('ocOuverture').setTitle('Ouverture de caisse (droit requis)');
                    }
                    if (!me.droits.cloture) {
                        me.q('ocCloture').setTitle('Clôture de caisse (droit requis)');
                    }
                    lireEtat();
                }
            }
        });
    },

    lireCloture: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/billetage/cloture-data',
            success: function (response) {
                if (me.isDestroyed) {
                    return;
                }
                var o = Ext.JSON.decode(response.responseText, true) || {};
                if (o.success === false || !o.data) {
                    me.viderCloture();
                    me.q('ocCloture').setDisabled(true);
                    me.afficherEtat(o.msg);
                    return;
                }
                var c = o.data;
                me.q('ocResumeId').setValue(c.resumeCaisseId);
                me.q('ocCaissier').setValue(Ext.String.htmlEncode(c.userFullName || ''));
                me.q('ocFond').setValue(Ext.util.Format.number(c.cashFund || 0, '0,000.') + ' CFA');
                me.q('ocDate').setValue(c.createAt || '');
                me.q('ocCloture').setDisabled(!(c.display === true && me.droits.cloture));
                me.afficherEtat();
            }
        });
    },

    viderCloture: function () {
        var me = this;
        ['ocResumeId', 'ocCaissier', 'ocFond', 'ocDate'].forEach(function (i) {
            me.q(i).setValue('');
        });
    },

    afficherEtat: function (motif) {
        var me = this, t;
        /* un refus du serveur reste affiche apres la relecture de l'etat qui le suit */
        motif = motif || me.motifRefus;
        me.motifRefus = null;
        if (me.ouverte) {
            t = 'Caisse <b>ouverte</b>' + (me.q('ocOuverteA').getValue() ? ' depuis le ' + me.q('ocOuverteA').getValue() : '')
                    + (me.droits.cloture ? ' : clôturez-la à droite.' : '.');
        } else {
            t = 'Caisse <b>fermée</b>' + (me.droits.ouverture ? ' : ouvrez-la à gauche.' : '.');
        }
        me.q('ocEtat').update(t + (motif ? ' <span class="caisse-oc-erreur">' + Ext.String.htmlEncode(motif) + '</span>' : ''));
    },

    ouvrir: function () {
        var me = this, champ = me.q('ocMontant'), bouton = me.q('ocBtnOuvrir');
        if (me.q('ocOuverture').isDisabled() || bouton.isDisabled()) {
            return;
        }
        if (!champ.isValid()) {
            champ.focus(true);
            return;
        }
        bouton.disable();
        me.setLoading('Ouverture de la caisse…');
        Ext.Ajax.request({
            method: 'POST', url: '../api/v1/caisse/ouvrir-caisse', headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode({id: me.q('ocCoffreId').getValue() || null, amount: parseInt(String(champ.getRawValue()).trim(), 10)}),
            callback: function (opt, reussi, response) {
                if (me.isDestroyed) {
                    return;
                }
                me.setLoading(false);
                bouton.enable();
                var o = response && response.responseText ? Ext.JSON.decode(response.responseText, true) : null;
                if (!reussi || !o || o.success === false) {
                    var refus = (o && o.msg) || 'L\'ouverture de caisse a été refusée (erreur ' + (response ? response.status : '?') + ').';
                    me.afficherEtat(refus);
                    me.motifRefus = refus;
                    me.charger();
                    return;
                }
                me.charger();
                me.proposerTicket(o.mvtId);
            }
        });
    },

    /** Meme question qu'a l'ecran d'ouverture : le ticket du fond de caisse s'imprime si on le demande. */
    proposerTicket: function (mvtId) {
        if (!mvtId) {
            return;
        }
        Ext.MessageBox.confirm('Message', 'Confirmation de l\'impression du ticket', function (b) {
            if (b === 'yes' && window.PrestigeTicketMvtCaisse) {
                PrestigeTicketMvtCaisse.imprimer(mvtId, Ext.emptyFn);
            }
        });
    },

    /** Premier clic : le bouton demande confirmation (10 s) ; second clic : fenetre de billetage. */
    clicCloture: function (b) {
        var me = this;
        if (!b.attenteConfirmation) {
            b.attenteConfirmation = true;
            b.setText('Confirmer la clôture ?');
            b.addCls('caisse-oc-confirmer');
            me.minuterie = Ext.defer(me.remettreBoutonCloture, me.DELAI_CONFIRMATION, me);
            return;
        }
        me.remettreBoutonCloture();
        /* la fenetre de billetage porte des ids globaux et son composant n'est jamais detruit : un second essai (apres
         * « Annuler ») leverait « id en double » ; l'instance precedente est detruite d'abord */
        ['DoBilletageID', 'do_billetage_ID'].forEach(function (id) {
            var c = Ext.getCmp(id);
            if (c) {
                c.destroy();
            }
        });
        Ext.create('testextjs.view.sm_user.caisse.action.DoBilletage', {
            odatasource: me.q('ocResumeId').getValue(),
            parentview: me,
            mode: 'dobilletage',
            titre: 'BILLETAGE'
        });
    },

    remettreBoutonCloture: function () {
        var b = this.q('ocBtnCloturer');
        if (this.minuterie) {
            clearTimeout(this.minuterie);
            this.minuterie = null;
        }
        if (b && !b.isDestroyed) {
            b.attenteConfirmation = false;
            b.setText('Clôturer la caisse');
            b.removeCls('caisse-oc-confirmer');
        }
    },

    /** Appele par la fenetre de billetage apres une cloture reussie : l'ecran relit son etat. */
    apresCloture: function () {
        if (!this.isDestroyed) {
            this.charger();
        }
    },

    onDestroy: function () {
        this.remettreBoutonCloture();
        this.callParent(arguments);
    }
});
