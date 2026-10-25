/* global Ext */

/*
 * DISCUSSIONS WHATSAPP (demande du 25/10, repris du CRM UBIPHARM), API v1/whatsapp-discussions, droit
 * P_SM_WHATSAPP_DISCUSSIONS.
 *  - A gauche : une discussion par client (numero), la plus recente en haut, messages recus non lus en pastille ;
 *    recherche (nom, numero, texte) et « Non lues seulement ».
 *  - A droite : le fil, du plus ancien au plus recent ; reponse en texte libre ou depuis un modele (variables
 *    remplacees par le serveur), piece jointe (image ou PDF) facultative. Envoi confirme dans le bouton lui-meme.
 *  - Un client qui a demande l'arret (STOP) ne recoit plus rien : la zone de reponse le dit et reste fermee.
 *  - Liste et fil relus toutes les 20 s tant que l'ecran est ouvert.
 */
Ext.define('testextjs.view.campagnes.DiscussionsWhatsApp', {
    extend: 'Ext.panel.Panel',
    xtype: 'whatsappdiscussions',
    title: 'Discussions WhatsApp',
    frame: true,
    width: '98%',
    height: 680,
    layout: {type: 'hbox', align: 'stretch'},
    cls: 'wad',
    URL: '../api/v1/whatsapp-discussions',
    config: {nameintern: '', titre: '', odatasource: ''},

    esc: function (s) {
        return Ext.String.htmlEncode(s == null ? '' : String(s));
    },

    styles: function () {
        Ext.util.CSS.createStyleSheet(
                '.wad .wad-liste{background:#f3f6fa}'
                + '.wad .wad-item{display:flex;gap:10px;padding:9px 12px;border-bottom:1px solid #e3e9f1;cursor:pointer;align-items:flex-start}'
                + '.wad .wad-item:hover{background:#eaf1f8}'
                + '.wad .wad-item.x-item-selected{background:#e3f4f8;box-shadow:inset 3px 0 0 #f2b84b}'
                + '.wad .wad-av{width:36px;height:36px;flex:0 0 36px;border-radius:50%;background:#dcfce7;color:#15803d;display:grid;place-items:center;font-size:16px}'
                + '.wad .wad-corps{flex:1;min-width:0}'
                + '.wad .wad-l1{display:flex;gap:6px;align-items:baseline}'
                + '.wad .wad-nom{font-weight:700;color:#0f1d33;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}'
                + '.wad .wad-date{font-size:11px;color:#5b6b80;white-space:nowrap}'
                + '.wad .wad-l2{display:flex;gap:6px;align-items:center;margin-top:2px}'
                + '.wad .wad-dernier{font-size:12.5px;color:#5b6b80;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}'
                + '.wad .wad-nl{background:#16a34a;color:#fff;border-radius:10px;font-size:11px;font-weight:700;padding:1px 7px}'
                + '.wad .wad-stop{background:#fde2e2;color:#a61b1b;border-radius:10px;font-size:10.5px;font-weight:700;padding:1px 7px}'
                + '.wad .wad-fil{background:#efeae2;padding:14px 18px}'
                + '.wad .wad-msg{max-width:72%;margin:6px 0;padding:7px 10px 5px;border-radius:9px;box-shadow:0 1px 1px rgba(0,0,0,.08);font-size:13.5px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}'
                + '.wad .wad-E{background:#fff;margin-right:auto;border-top-left-radius:2px}'
                + '.wad .wad-S{background:#d9fdd3;margin-left:auto;border-top-right-radius:2px}'
                + '.wad .wad-ligne{display:flex}'
                + '.wad .wad-meta{font-size:11px;color:#667781;text-align:right;margin-top:3px}'
                + '.wad .wad-piece{font-size:12px;color:#0e7490;margin-bottom:3px}'
                + '.wad .wad-jour{text-align:center;margin:10px 0}'
                + '.wad .wad-jour span{background:#fff;border-radius:7px;padding:3px 10px;font-size:11.5px;color:#54656f;box-shadow:0 1px 1px rgba(0,0,0,.06)}'
                + '.wad .wad-entete{display:flex;gap:10px;align-items:center;padding:8px 14px;border-bottom:1px solid #dde4ee;background:#fff}'
                + '.wad .wad-vide{color:#5b6b80;text-align:center;margin-top:40px;font-size:13px}'
                + '.wad .wad-etat{font-size:12px;padding:2px 4px}'
                + '.wad .wad-ok{color:#15803d}.wad .wad-erreur{color:#b42318}'
                + '.x-btn.wad-confirmer{background:#c0392b !important;border-color:#922b21 !important}'
                + '.x-btn.wad-confirmer .x-btn-inner{color:#fff !important}', 'wad-styles');
    },

    initComponent: function () {
        var me = this;
        me.styles();
        me.discussions = Ext.create('Ext.data.Store', {
            fields: ['numero', 'clientId', 'client', 'nomProfil', 'dernier', 'dernierSens', 'date', {name: 'nonLus', type: 'int'},
                {name: 'total', type: 'int'}, {name: 'stop', type: 'boolean'}],
            data: []
        });
        me.modeles = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', 'canal', 'contenu'],
            proxy: {type: 'ajax', url: '../api/v1/modeles-messages', extraParams: {canal: 'WHATSAPP'}, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        me.items = [{
                xtype: 'panel', width: 340, layout: {type: 'vbox', align: 'stretch'}, border: false, bodyCls: 'wad-liste',
                dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                            {xtype: 'textfield', itemId: 'recherche', flex: 1, emptyText: 'Nom, numéro ou mot du message', enableKeyEvents: true,
                                listeners: {buffer: 400, keyup: function () {
                                        me.chargerListe();
                                    }}},
                            {xtype: 'checkbox', itemId: 'nonLues', boxLabel: 'Non lues', listeners: {change: function () {
                                        me.chargerListe();
                                    }}}
                        ]}, {xtype: 'toolbar', dock: 'bottom', items: [{xtype: 'tbtext', itemId: 'compte', text: ''}]}],
                items: [{
                        xtype: 'dataview', itemId: 'liste', flex: 1, autoScroll: true, store: me.discussions, singleSelect: true,
                        itemSelector: 'div.wad-item', selectedItemCls: 'x-item-selected',
                        emptyText: '<div class="wad-vide">Aucune discussion pour le moment.<br>Les réponses des clients par WhatsApp arriveront ici.</div>',
                        deferEmptyText: false,
                        tpl: new Ext.XTemplate('<tpl for=".">',
                                '<div class="wad-item" data-numero="{numero}">',
                                '<span class="wad-av"><i class="fa fa-whatsapp"></i></span>',
                                '<div class="wad-corps"><div class="wad-l1"><span class="wad-nom">{[this.nom(values)]}</span>',
                                '<span class="wad-date">{[this.quand(values.date)]}</span></div>',
                                '<div class="wad-l2"><span class="wad-dernier">{[values.dernierSens === "S" ? "Vous : " : ""]}{dernier:htmlEncode}</span>',
                                '<tpl if="stop"><span class="wad-stop">STOP</span></tpl>',
                                '<tpl if="nonLus &gt; 0"><span class="wad-nl">{nonLus}</span></tpl></div></div></div>',
                                '</tpl>', {
                                    nom: function (v) {
                                        return me.esc(me.nom(v));
                                    },
                                    quand: function (d) {
                                        return me.quand(d);
                                    }
                                }),
                        listeners: {
                            itemclick: function (v, rec) {
                                me.ouvrir(rec.get('numero'));
                            }
                        }
                    }]
            }, {
                xtype: 'panel', flex: 1, itemId: 'droite', layout: {type: 'vbox', align: 'stretch'}, border: false,
                items: [
                    {xtype: 'component', itemId: 'entete', html: ''},
                    {xtype: 'component', itemId: 'fil', flex: 1, autoScroll: true, cls: 'wad-fil',
                        html: '<div class="wad-vide">Choisissez une discussion à gauche.</div>'},
                    {xtype: 'form', itemId: 'reponse', bodyPadding: '8 10 6 10', border: false, disabled: true, layout: {type: 'vbox', align: 'stretch'},
                        items: [
                            {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, margin: '0 0 6 0', items: [
                                    {xtype: 'combobox', itemId: 'modele', width: 300, emptyText: 'Partir d\'un modèle (facultatif)', store: me.modeles,
                                        queryMode: 'remote', displayField: 'libelle', valueField: 'id', editable: false,
                                        listeners: {select: function (c, recs) {
                                                var r = Ext.isArray(recs) ? recs[0] : recs;
                                                me.down('#texte').setValue(r ? r.get('contenu') : '');
                                                me.down('#texte').focus(false, 50);
                                            }}},
                                    {xtype: 'component', flex: 1, margin: '0 0 0 8', html: '<span style="font-size:11.5px;color:#5b6b80">Variables : {prenom} {nom} {officine} {telephone_officine}</span>'},
                                    {xtype: 'filefield', itemId: 'piece', buttonOnly: true, buttonText: 'Joindre', hideLabel: true,
                                        buttonConfig: {iconCls: 'fa fa-paperclip', tooltip: 'Image JPEG ou PNG, ou document PDF, 5 Mo au plus (WhatsApp Web)'},
                                        listeners: {change: function (champ) {
                                                me.lirePiece(champ);
                                            }}}
                                ]},
                            {xtype: 'textareafield', itemId: 'texte', height: 70, emptyText: 'Votre réponse…', enforceMaxLength: true, maxLength: 4000},
                            {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, margin: '6 0 0 0', items: [
                                    {xtype: 'component', itemId: 'nomPiece', html: ''},
                                    {xtype: 'button', itemId: 'retirerPiece', hidden: true, text: 'Retirer', iconCls: 'fa fa-times', margin: '0 0 0 6', handler: function () {
                                            me.retirerPiece();
                                        }},
                                    {xtype: 'component', itemId: 'etat', flex: 1, cls: 'wad-etat', html: ''},
                                    {xtype: 'button', itemId: 'envoyer', text: 'Envoyer', iconCls: 'fa fa-paper-plane', scale: 'medium', handler: function (b) {
                                            me.envoyer(b);
                                        }}
                                ]}
                        ]}
                ]
            }];
        me.callParent();
        me.on('afterrender', function () {
            me.chargerListe();
            me.minuteur = setInterval(function () {
                if (me.isDestroyed) {
                    clearInterval(me.minuteur);
                    return;
                }
                me.chargerListe(true);
                if (me.numero) {
                    me.chargerFil(true);
                }
            }, 20000);
        });
        me.on('destroy', function () {
            clearInterval(me.minuteur);
        });
    },

    /* 0708473750 -> 07 08 47 37 50 (texte brut, a encoder a l'affichage) */
    numeroLisible: function (n) {
        var s = String(n || '');
        return /^\d{10}$/.test(s) ? s.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : s;
    },

    nom: function (v) {
        return v.client || v.nomProfil || this.numeroLisible(v.numero);
    },

    quand: function (d) {
        if (!d) {
            return '';
        }
        var dt = Ext.Date.parse(d, 'Y-m-d H:i:s'), auj = Ext.Date.clearTime(new Date());
        if (!dt) {
            return this.esc(d);
        }
        return Ext.Date.clearTime(dt, true).getTime() === auj.getTime() ? Ext.Date.format(dt, 'H:i') : Ext.Date.format(dt, 'd/m/Y');
    },

    chargerListe: function (discret) {
        var me = this;
        Ext.Ajax.request({url: me.URL, method: 'GET', params: {q: me.down('#recherche').getValue() || '', nonLues: me.down('#nonLues').getValue()},
            success: function (r) {
                if (me.isDestroyed) {
                    return;
                }
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    if (!discret) {
                        me.etat(o.msg || o.message || 'Liste indisponible.', 'wad-erreur');
                    }
                    return;
                }
                var v = me.down('#liste'), sel = me.numero;
                me.discussions.loadData(o.data || []);
                if (sel) {
                    var rec = me.discussions.findRecord('numero', sel, 0, false, true, true);
                    if (rec) {
                        v.getSelectionModel().select(rec, false, true);
                    }
                }
                me.down('#compte').setText((o.data || []).length + ' discussion(s)' + (o.nonLus ? ' · ' + o.nonLus + ' message(s) non lu(s)' : ''));
            }});
    },

    ouvrir: function (numero) {
        var me = this;
        if (me.numero !== numero) {
            me.down('#texte').setValue('');
            me.down('#modele').clearValue();
            me.retirerPiece();
            me.etat('', '');
        }
        me.numero = numero;
        me.chargerFil();
    },

    chargerFil: function (discret) {
        var me = this, numero = me.numero;
        Ext.Ajax.request({url: me.URL + '/' + encodeURIComponent(numero), method: 'GET',
            success: function (r) {
                if (me.isDestroyed || me.numero !== numero) {
                    return;
                }
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success || !o.data) {
                    return;
                }
                me.dessinerFil(o.data, discret);
                var rec = me.discussions.findRecord('numero', numero, 0, false, true, true);
                if (rec && rec.get('nonLus')) {
                    rec.set('nonLus', 0);
                    rec.commit();
                }
            }});
    },

    dessinerFil: function (d, discret) {
        var me = this, disc = d.discussion || {numero: me.numero}, msgs = d.messages || [], h = '', jour = '';
        var stop = !!disc.stop;
        me.down('#entete').update('<div class="wad-entete"><span class="wad-av"><i class="fa fa-whatsapp"></i></span><div style="flex:1">'
                + '<div style="font-weight:700;color:#0f1d33">' + me.esc(me.nom(disc)) + (stop ? ' <span class="wad-stop">STOP</span>' : '') + '</div>'
                + '<div style="font-size:12px;color:#5b6b80">' + me.esc(me.numeroLisible(disc.numero || me.numero))
                + (disc.client && disc.nomProfil ? ' · profil WhatsApp : ' + me.esc(disc.nomProfil) : '')
                + (!disc.clientId ? ' · aucun client de la base n\'est rattaché à ce numéro' : '') + '</div>'
                + (stop ? '<div style="font-size:12.5px;color:#b42318;font-weight:600;margin-top:2px">Ce client a demandé l\'arrêt des messages WhatsApp (STOP) : on ne peut plus lui écrire.</div>' : '')
                + '</div></div>');
        Ext.each(msgs, function (m) {
            var j = (m.date || '').substring(0, 10);
            if (j !== jour) {
                jour = j;
                var dt = Ext.Date.parse(j, 'Y-m-d');
                h += '<div class="wad-jour"><span>' + (dt ? Ext.Date.format(dt, 'd/m/Y') : me.esc(j)) + '</span></div>';
            }
            var statut = m.sens === 'S' ? ({SIMULE: ' · simulé', ENVOYE: ' · envoyé', DELIVRE: ' · distribué', LU: ' · lu', ECHEC: ' · échec'}[m.statut] || '') : '';
            h += '<div class="wad-ligne"><div class="wad-msg wad-' + (m.sens === 'S' ? 'S' : 'E') + '">'
                    + (m.pieceNom ? '<div class="wad-piece"><i class="fa fa-paperclip"></i> ' + me.esc(m.pieceNom) + '</div>' : '')
                    + (m.type && m.type !== 'TEXTE' && !m.pieceNom ? '<div class="wad-piece"><i class="fa fa-file-o"></i> ' + me.esc({IMAGE: 'Image', VIDEO: 'Vidéo', DOCUMENT: 'Document', AUDIO: 'Message vocal', AUTRE: 'Message'}[m.type] || m.type) + '</div>' : '')
                    + me.esc(m.texte)
                    + '<div class="wad-meta">' + (m.sens === 'S' && m.auteur ? me.esc(m.auteur) + ' · ' : '') + me.esc((m.date || '').substring(11, 16)) + statut + '</div></div></div>';
        });
        var fil = me.down('#fil'), el = fil.getEl() && fil.getEl().dom, enBas = !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
        fil.update(h || '<div class="wad-vide">Aucun message.</div>');
        if (el && (!discret || enBas)) {
            el.scrollTop = el.scrollHeight;
        }
        var form = me.down('#reponse');
        form.setDisabled(stop);
        if (stop) {
            me.etat('', '');
        }
    },

    lirePiece: function (champ) {
        var me = this, input = champ.fileInputEl && champ.fileInputEl.dom, fichier = input && input.files && input.files[0];
        if (!fichier) {
            return;
        }
        if (fichier.size > 5 * 1024 * 1024) {
            me.etat('Pièce jointe trop lourde (5 Mo au plus).', 'wad-erreur');
            champ.reset();
            return;
        }
        if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(fichier.type)) {
            me.etat('La pièce jointe doit être une image JPEG, PNG ou un document PDF.', 'wad-erreur');
            champ.reset();
            return;
        }
        var lecteur = new FileReader();
        lecteur.onload = function () {
            var r = String(lecteur.result || '');
            me.pieceJointe = {base64: r.substring(r.indexOf(',') + 1), nomFichier: fichier.name};
            me.down('#nomPiece').update('<span style="font-size:12px;color:#0e7490"><i class="fa fa-paperclip"></i> ' + me.esc(fichier.name)
                    + ' (' + Math.max(1, Math.round(fichier.size / 1024)) + ' Ko)</span>');
            me.down('#retirerPiece').show();
            me.etat('', '');
        };
        lecteur.readAsDataURL(fichier);
        champ.reset();
    },

    retirerPiece: function () {
        this.pieceJointe = null;
        if (this.down('#nomPiece')) {
            this.down('#nomPiece').update('');
            this.down('#retirerPiece').hide();
        }
    },

    etat: function (texte, cls) {
        var e = this.down('#etat');
        if (e) {
            e.update(texte ? '<span class="' + (cls || '') + '">' + this.esc(texte) + '</span>' : '');
        }
    },

    /* premier clic -> « Confirmer l'envoi » (5 s), second clic -> envoi (aucune fenetre) */
    envoyer: function (b) {
        var me = this, texte = Ext.String.trim(me.down('#texte').getValue() || '');
        if (!me.numero) {
            return;
        }
        if (!texte && !me.pieceJointe) {
            me.etat('Écrivez un message ou joignez un fichier.', 'wad-erreur');
            return;
        }
        if (!b.enConfirmation) {
            b.texteInitial = b.texteInitial || b.getText();
            b.enConfirmation = true;
            b.addCls('wad-confirmer');
            b.setText('Confirmer l\'envoi');
            Ext.defer(function () {
                if (b.enConfirmation && !b.isDestroyed) {
                    b.enConfirmation = false;
                    b.removeCls('wad-confirmer');
                    b.setText(b.texteInitial);
                }
            }, 5000);
            return;
        }
        b.enConfirmation = false;
        b.removeCls('wad-confirmer');
        b.setText(b.texteInitial);
        b.disable();
        me.etat('Envoi…', '');
        var corps = {texte: texte};
        if (me.pieceJointe) {
            corps.pieceJointe = me.pieceJointe;
        }
        Ext.Ajax.request({url: me.URL + '/' + encodeURIComponent(me.numero), method: 'POST', jsonData: corps, timeout: 60000,
            success: function (r) {
                if (me.isDestroyed) {
                    return;
                }
                b.enable();
                var o = Ext.decode(r.responseText, true) || {};
                me.etat(o.message || (o.success ? 'Envoyé.' : 'Envoi refusé.'), o.success ? 'wad-ok' : 'wad-erreur');
                if (o.success) {
                    me.down('#texte').setValue('');
                    me.down('#modele').clearValue();
                    me.retirerPiece();
                }
                me.chargerFil();
                me.chargerListe(true);
            },
            failure: function (r) {
                if (!me.isDestroyed) {
                    b.enable();
                    me.etat('Envoi impossible (' + r.status + ').', 'wad-erreur');
                }
            }});
    }
});
