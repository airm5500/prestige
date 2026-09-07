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
        },
        {
            ref: 'champRecherche',
            selector: 'supportdiagnostic textfield#champRecherche'
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
            'supportdiagnostic textfield#champRecherche': {
                specialkey: this.onToucheRecherche
            },
            'supportdiagnostic button#btnRechercher': {
                click: this.onRechercher
            },
            'supportdiagnostic button#btnEffacerRecherche': {
                click: this.onEffacerRecherche
            },
            'supportdiagnostic button#btnPurger': {
                click: this.onPurger
            },
            'supportdiagnostic button#btnExcel': {
                click: this.onExcel
            },
            'supportdiagnostic button#btnPreflight': {
                click: this.onPreflight
            },
            'supportdiagnostic button#btnBoiteNoire': {
                click: this.onBoiteNoire
            },
            'supportdiagnostic button#btnBase': {
                click: this.onBase
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

    /* Export Excel du journal : memes criteres que l'ecran, niveau ET recherche. */
    onExcel: function () {
        const niveau = this.getComboNiveau() ? this.getComboNiveau().getValue() : 'TOUS';
        window.open('../api/v1/support/events/export/excel?limit=500&niveau='
                + encodeURIComponent(niveau === 'TOUS' || !niveau ? '' : niveau)
                + '&query=' + encodeURIComponent(this.termeRecherche()));
    },

    /** Terme saisi dans le champ de recherche, vide si le champ est absent. */
    termeRecherche: function () {
        const champ = this.getChampRecherche();
        return champ && champ.getValue() ? champ.getValue().trim() : '';
    },

    /* Recharge la liste avec les deux criteres, en revenant a la premiere page : rester sur la
       page 7 d'un resultat qui n'en compte plus que deux afficherait une grille vide. */
    rechargerListe: function () {
        const store = this.getDiagnosticGrid().getStore();
        const niveau = this.getComboNiveau() ? this.getComboNiveau().getValue() : '';
        store.getProxy().extraParams.niveau = (niveau === 'TOUS') ? '' : niveau;
        store.getProxy().extraParams.query = this.termeRecherche();
        store.loadPage(1);
    },

    onRechercher: function () {
        this.rechargerListe();
    },

    onToucheRecherche: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.rechargerListe();
        }
    },

    onEffacerRecherche: function () {
        const champ = this.getChampRecherche();
        if (champ) {
            champ.setValue('');
        }
        this.rechargerListe();
    },

    onNiveauChange: function () {
        this.rechargerListe();
    },

    /**
     * Purge manuelle du journal : choix des niveaux, date limite optionnelle ou tout vider. Les evenements lies a un
     * ticket sont proteges par defaut. Apercu du nombre puis confirmation avant suppression.
     */
    onPurger: function () {
        const me = this;
        const win = Ext.create('Ext.window.Window', {
            title: 'Purger le journal des événements',
            modal: true,
            width: 430,
            resizable: false,
            layout: 'fit',
            items: [{
                    xtype: 'form',
                    bodyPadding: 14,
                    defaults: {anchor: '100%'},
                    items: [
                        {
                            xtype: 'checkboxgroup',
                            itemId: 'grpNiveaux',
                            fieldLabel: 'Niveaux',
                            columns: 4,
                            items: [
                                {boxLabel: 'INFO', name: 'niveau', inputValue: 'INFO', checked: true},
                                {boxLabel: 'WARN', name: 'niveau', inputValue: 'WARN', checked: true},
                                {boxLabel: 'ERROR', name: 'niveau', inputValue: 'ERROR', checked: false},
                                {boxLabel: 'FATAL', name: 'niveau', inputValue: 'FATAL', checked: false}
                            ]
                        },
                        {
                            xtype: 'datefield',
                            itemId: 'dtAvant',
                            fieldLabel: 'Vus avant le',
                            format: 'd/m/Y',
                            submitFormat: 'Y-m-d',
                            emptyText: '(optionnel : vide = sans limite de date)'
                        },
                        {
                            xtype: 'checkbox',
                            itemId: 'chkTout',
                            boxLabel: 'Tout vider (tous les niveaux, sans limite de date)',
                            listeners: {
                                change: function (chk, checked) {
                                    const form = chk.up('form');
                                    form.down('#grpNiveaux').setDisabled(checked);
                                    form.down('#dtAvant').setDisabled(checked);
                                }
                            }
                        },
                        {
                            xtype: 'checkbox',
                            itemId: 'chkTickets',
                            boxLabel: 'Inclure les événements liés à un ticket (sinon protégés)'
                        }
                    ]
                }],
            buttons: [
                {
                    text: 'Purger',
                    handler: function () {
                        const form = win.down('form');
                        const tout = form.down('#chkTout').getValue();
                        const inclureTickets = form.down('#chkTickets').getValue();
                        let niveaux = '';
                        let avantLe = '';
                        if (!tout) {
                            const coches = form.down('#grpNiveaux').getChecked();
                            if (!coches.length) {
                                Ext.Msg.alert('Message', 'Sélectionnez au moins un niveau (ou cochez « Tout vider »)');
                                return;
                            }
                            niveaux = Ext.Array.map(coches, function (c) {
                                return c.inputValue;
                            }).join(',');
                            const dt = form.down('#dtAvant').getValue();
                            avantLe = dt ? Ext.Date.format(dt, 'Y-m-d') : '';
                        }
                        const progress = Ext.MessageBox.wait('Calcul du nombre d\'événements . . .', 'Veuillez patienter');
                        Ext.Ajax.request({
                            method: 'GET',
                            url: '../api/v1/support/events/purge/count',
                            params: {niveaux: niveaux, avantLe: avantLe, inclureTickets: inclureTickets},
                            success: function (response) {
                                progress.hide();
                                const result = Ext.JSON.decode(response.responseText, true) || {};
                                const nombre = parseInt(result.data, 10) || 0;
                                if (nombre <= 0) {
                                    Ext.Msg.alert('Message', 'Aucun événement ne correspond à ces critères.');
                                    return;
                                }
                                Ext.Msg.confirm('Confirmation', nombre
                                        + ' événement(s) seront définitivement supprimé(s) (ainsi que leurs fichiers logs). Continuer ?',
                                        function (btn) {
                                            if (btn !== 'yes') {
                                                return;
                                            }
                                            const progress2 = Ext.MessageBox.wait('Purge en cours . . .', 'Veuillez patienter');
                                            Ext.Ajax.request({
                                                method: 'POST',
                                                url: '../api/v1/support/events/purge?niveaux=' + encodeURIComponent(niveaux)
                                                        + '&avantLe=' + encodeURIComponent(avantLe)
                                                        + '&inclureTickets=' + inclureTickets,
                                                headers: {'Content-Type': 'application/json'},
                                                success: function (resp) {
                                                    progress2.hide();
                                                    const res = Ext.JSON.decode(resp.responseText, true) || {};
                                                    Ext.Msg.alert('Message', res.msg || 'Purge effectuée');
                                                    win.close();
                                                    me.doRefresh();
                                                },
                                                failure: function () {
                                                    progress2.hide();
                                                    Ext.Msg.alert('Message', 'Un problème avec le serveur');
                                                }
                                            });
                                        });
                            },
                            failure: function () {
                                progress.hide();
                                Ext.Msg.alert('Message', 'Un problème avec le serveur');
                            }
                        });
                    }
                },
                {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }
            ]
        });
        win.show();
    },

    /**
     * Rejeu de l'auto-diagnostic de la configuration de la supervision. Lecture seule : ce rejeu n'ecrit AUCUN
     * evenement, seul le passage automatique au demarrage alimente le journal (une verification repetee a la main ne
     * doit pas creer de bruit).
     */
    onPreflight: function () {
        const progress = Ext.MessageBox.wait('Vérification de la configuration . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/support/diagnostic/preflight',
            success: function (response) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true) || {};
                const data = result.data || {};
                const controles = data.controles || [];
                let html = '<div style="margin-bottom:10px;"><b>' + Ext.String.htmlEncode(data.synthese || '')
                        + '</b><br/><span style="color:#777;">Vérifié le '
                        + Ext.String.htmlEncode(data.execute || '') + '</span></div>';
                if (data.anomalie) {
                    html += '<div style="background:#fff8e1;border:1px solid #f0d264;border-radius:6px;'
                            + 'padding:8px 10px;margin-bottom:10px;">Les lignes en rouge demandent une correction '
                            + 'dans les paramètres ou sur le serveur.</div>';
                }
                html += '<table style="width:100%;border-collapse:collapse;">';
                Ext.Array.each(controles, function (c) {
                    const couleur = c.ok ? 'green' : 'red';
                    const marque = c.ok ? '&#10004;' : '&#10008;';
                    html += '<tr style="border-bottom:1px solid #eee;">'
                            + '<td style="width:24px;vertical-align:top;padding:6px 4px;color:' + couleur
                            + ';font-weight:bold;">' + marque + '</td><td style="padding:6px 4px;">'
                            + '<span style="color:' + couleur + ';font-weight:bold;">'
                            + Ext.String.htmlEncode(c.libelle || '') + '</span><br/>'
                            + '<span style="color:#666;">' + Ext.String.htmlEncode(c.detail || '')
                            + '</span></td></tr>';
                });
                html += '</table>';
                Ext.create('Ext.window.Window', {
                    title: 'Auto-diagnostic de la supervision',
                    modal: true,
                    width: 720,
                    height: 480,
                    resizable: true,
                    maximizable: true,
                    layout: 'fit',
                    items: [{xtype: 'panel', autoScroll: true, bodyPadding: 12, html: html}]
                }).show();
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'Un problème avec le serveur');
            }
        });
    },

    /**
     * Boite noire du watchdog : dernier etat connu du serveur avant le crash detecte au demarrage (s'il y en a eu un),
     * puis etat courant. Lecture seule.
     */
    onBoiteNoire: function () {
        const progress = Ext.MessageBox.wait('Lecture de la boîte noire . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/support/diagnostic/boite-noire',
            success: function (response) {
                progress.hide();
                Ext.create('Ext.window.Window', {
                    title: 'Boîte noire du watchdog',
                    modal: true,
                    width: 640,
                    height: 460,
                    resizable: true,
                    maximizable: true,
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'textarea',
                            readOnly: true,
                            selectOnFocus: false,
                            fieldStyle: 'font-family:monospace;font-size:12px;',
                            value: response.responseText
                        }
                    ]
                }).show();
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'Impossible de lire la boîte noire');
            }
        });
    },

    /**
     * Mesures courantes de la base de donnees. Lecture seule : la surveillance periodique est ce qui alerte, cet ecran
     * ne fait que montrer l'etat a l'instant du clic.
     */
    onBase: function () {
        const progress = Ext.MessageBox.wait('Lecture de la base . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/support/diagnostic/base',
            success: function (response) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true) || {};
                const d = result.data || {};
                function ligne(libelle, valeur, alerte) {
                    return '<tr style="border-bottom:1px solid #eee;">'
                            + '<td style="padding:6px 4px;color:#555;">' + libelle + '</td>'
                            + '<td style="padding:6px 4px;text-align:right;font-weight:bold;'
                            + (alerte ? 'color:red;' : '') + '">' + valeur + '</td></tr>';
                }
                const pct = d.connexionsPct;
                let html = '<table style="width:100%;border-collapse:collapse;">';
                html += ligne('Connexions ouvertes', d.connexionsOuvertes + ' / ' + d.connexionsMax
                        + (pct >= 0 ? ' (' + pct + '%)' : ''), pct >= 80);
                html += ligne('Requêtes réellement actives', d.requetesActives, false);
                html += ligne('Requêtes de plus de ' + d.seuilRequeteLenteS + ' s', d.requetesLentes,
                        d.requetesLentes > 0);
                html += ligne('Transactions en attente d\'un verrou', d.attentesVerrou, d.attentesVerrou > 0);
                html += ligne('Attente moyenne sur verrou', d.attenteVerrouMoyenneMs + ' ms', false);
                html += ligne('Connexions refusées depuis le démarrage', d.connexionsRefusees, false);
                html += '</table>';
                html += '<div style="margin-top:12px;"><b>Requêtes en cours au-delà du seuil</b>'
                        + '<pre style="white-space:pre-wrap;background:#f7f7f7;border:1px solid #e0e0e0;'
                        + 'border-radius:4px;padding:8px;margin-top:4px;font-size:12px;">'
                        + Ext.String.htmlEncode(d.detailRequetesLentes || '') + '</pre></div>';
                Ext.create('Ext.window.Window', {
                    title: 'Base de données — état courant',
                    modal: true,
                    width: 680,
                    height: 480,
                    resizable: true,
                    maximizable: true,
                    layout: 'fit',
                    items: [{xtype: 'panel', autoScroll: true, bodyPadding: 12, html: html}]
                }).show();
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'Un problème avec le serveur');
            }
        });
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
            if (data.payloadJson.indexOf('Explication :') === 0) {
                // Traduction "terre a terre" de l'erreur technique, produite cote serveur.
                html += '<br/><br/><b>💡 Explication :</b><br/><div style="background:#fff8e1;border:1px solid #f0d264;'
                        + 'border-radius:6px;padding:8px 10px;margin-top:4px;">'
                        + Ext.String.htmlEncode(data.payloadJson.substring(14)) + '</div>';
            } else {
                html += '<br/><br/><b>Contexte :</b><br/><pre style="white-space:pre-wrap;">'
                        + Ext.String.htmlEncode(data.payloadJson) + '</pre>';
            }
        }
        if (data.logRef) {
            html += '<br/><b>Fichier log :</b> ' + Ext.String.htmlEncode(data.logRef);
        }
        const me = this;
        const tbar = [];
        if (data.logRef) {
            tbar.push({
                xtype: 'button',
                text: 'Voir le log',
                iconCls: 'icon-grid',
                handler: function () {
                    me.onVoirLog(data.id);
                }
            });
        }
        if (data.niveau === 'ERROR' || data.niveau === 'FATAL') {
            tbar.push({
                xtype: 'button',
                text: 'Occurrences (' + data.occurrences + ')',
                iconCls: 'icon-grid',
                handler: function () {
                    me.onVoirOccurrences(data.id);
                }
            });
        }
        Ext.create('Ext.window.Window', {
            title: 'Détail de l\'événement',
            modal: true,
            width: 720,
            height: 480,
            resizable: true,
            maximizable: true,
            layout: 'fit',
            tbar: tbar.length ? tbar : undefined,
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

    /**
     * Liste des dates/heures des occurrences individuelles (ERROR/FATAL, plafond 100, enregistrees depuis la mise en
     * place de l'historique detaille : les occurrences anterieures n'y figurent pas).
     */
    onVoirOccurrences: function (eventId) {
        const progress = Ext.MessageBox.wait('Chargement des occurrences . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/support/events/' + eventId + '/occurrences',
            success: function (response) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true) || {};
                const dates = result.data || [];
                let html;
                if (dates.length) {
                    html = '<b>' + dates.length + ' occurrence(s) enregistrée(s) (de la plus récente à la plus ancienne, maximum 100) :</b><br/><br/>'
                            + '<ol style="margin:0;padding-left:24px;">';
                    Ext.Array.each(dates, function (d) {
                        html += '<li style="margin-bottom:2px;font-family:monospace;">' + Ext.String.htmlEncode(d) + '</li>';
                    });
                    html += '</ol>';
                } else {
                    html = 'Aucune occurrence détaillée enregistrée pour cet événement.<br/><br/>'
                            + '<i>L\'historique détaillé des dates/heures est enregistré à partir de la mise en place de cette '
                            + 'fonctionnalité : les occurrences antérieures ne sont connues que par la 1ère et la dernière apparition.</i>';
                }
                Ext.create('Ext.window.Window', {
                    title: 'Occurrences de l\'événement',
                    modal: true,
                    width: 420,
                    height: 460,
                    resizable: true,
                    layout: 'fit',
                    items: [{
                            xtype: 'panel',
                            autoScroll: true,
                            bodyPadding: 12,
                            html: html
                        }]
                }).show();
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'Un problème avec le serveur');
            }
        });
    },

    onVoirLog: function (eventId) {
        const progress = Ext.MessageBox.wait('Lecture du fichier log . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/support/diagnostic/log',
            params: {eventId: eventId},
            success: function (response) {
                progress.hide();
                Ext.create('Ext.window.Window', {
                    title: 'Contenu du fichier log',
                    modal: true,
                    width: 820,
                    height: 560,
                    resizable: true,
                    maximizable: true,
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'textarea',
                            readOnly: true,
                            selectOnFocus: false,
                            fieldStyle: 'font-family:monospace;font-size:12px;',
                            value: response.responseText
                        }
                    ]
                }).show();
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'Impossible de lire le fichier log');
            }
        });
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
