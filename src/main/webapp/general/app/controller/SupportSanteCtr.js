/* global Ext */

Ext.define('testextjs.controller.SupportSanteCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.support.SupportSante'],
    refs: [
        {
            ref: 'santePanel',
            selector: 'supportsante'
        }
    ],
    init: function (application) {
        this.control({
            'supportsante': {
                afterrender: this.doLoad
            },
            'supportsante button#btnActualiser': {
                click: this.doLoad
            },
            'supportsante button#btnCoherence': {
                click: this.onCoherence
            }
        });
    },

    onCoherence: function () {
        const me = this;
        Ext.Msg.confirm('Contrôles de cohérence',
                'Lancer maintenant tous les contrôles de cohérence actifs ?', function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const progress = Ext.MessageBox.wait('Analyse en cours . . .', 'Contrôles de cohérence');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/support/coherence/run',
                        headers: {'Content-Type': 'application/json'},
                        success: function (response) {
                            progress.hide();
                            const result = Ext.JSON.decode(response.responseText, true) || {};
                            me.showCoherenceResult(result.data || []);
                        },
                        failure: function () {
                            progress.hide();
                            Ext.Msg.alert('Message', 'Un problème avec le serveur');
                        }
                    });
                });
    },

    showCoherenceResult: function (lignes) {
        let html;
        if (!lignes || lignes.length === 0) {
            html = '<p>Aucun contrôle actif.</p>';
        } else {
            html = '<table style="border-collapse:collapse;width:100%;">'
                    + '<tr><th style="padding:6px;border:1px solid #ccc;text-align:left;">Contrôle</th>'
                    + '<th style="padding:6px;border:1px solid #ccc;">Cas détectés</th>'
                    + '<th style="padding:6px;border:1px solid #ccc;">Mode</th></tr>';
            Ext.Array.each(lignes, function (l) {
                const nb = (l.erreur ? '<span style="color:red;">erreur</span>' : (l.nbCas || 0));
                const color = l.erreur ? 'red' : ((l.nbCas || 0) > 0 ? 'orange' : 'green');
                html += '<tr><td style="padding:6px;border:1px solid #ccc;">'
                        + Ext.String.htmlEncode(l.libelle || l.code || '') + '</td>'
                        + '<td style="padding:6px;border:1px solid #ccc;text-align:center;color:' + color
                        + ';font-weight:bold;">' + nb + '</td>'
                        + '<td style="padding:6px;border:1px solid #ccc;text-align:center;">'
                        + (l.dryRun ? 'observation' : 'ticket auto') + '</td></tr>';
                if (l.erreur) {
                    html += '<tr><td colspan="3" style="padding:4px 6px;border:1px solid #ccc;color:red;font-size:11px;">'
                            + Ext.String.htmlEncode(l.erreur) + '</td></tr>';
                }
            });
            html += '</table>'
                    + '<p style="margin-top:8px;">Le détail des anomalies est consultable dans '
                    + '<b>Diagnostic &amp; bugs</b> (type COHERENCE).</p>';
        }
        Ext.create('Ext.window.Window', {
            title: 'Résultat des contrôles de cohérence',
            modal: true,
            width: 620,
            maxHeight: 500,
            autoScroll: true,
            bodyPadding: 12,
            html: html
        }).show();
        this.doLoad();
    },

    doLoad: function () {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/support/sante',
            success: function (response) {
                const result = Ext.JSON.decode(response.responseText, true) || {};
                me.render(result.data || {});
            },
            failure: function () {
                me.render(null);
            }
        });
    },

    render: function (data) {
        const content = this.getSantePanel().down('#santeContent');
        if (!content) {
            return;
        }
        if (!data) {
            content.update('<p style="color:red;font-weight:bold;">Impossible de charger les indicateurs '
                    + '(serveur injoignable).</p>');
            return;
        }
        const ok = function (flag, oui, non) {
            return flag ? '<span style="color:green;font-weight:bold;">' + oui + '</span>'
                    : '<span style="color:red;font-weight:bold;">' + non + '</span>';
        };
        const row = function (label, value) {
            return '<tr><td style="padding:6px;border:1px solid #ccc;font-weight:bold;">' + label
                    + '</td><td style="padding:6px;border:1px solid #ccc;">' + value + '</td></tr>';
        };
        const uptime = data.uptimeMinutes || 0;
        let html = '<h3>Indicateurs techniques</h3>';
        html += '<table style="border-collapse:collapse;min-width:60%;">';
        html += row('Base de données', ok(data.baseConnectee, 'Connectée', 'Injoignable')
                + (data.baseConnectee ? ' (latence : ' + data.latenceBaseMs + ' ms)' : ''));
        html += row('Mémoire JVM', data.jvmMemoireUtiliseeMo + ' Mo utilisés / ' + data.jvmMemoireMaxMo + ' Mo max');
        html += row('Serveur démarré depuis', Math.floor(uptime / 60) + ' h ' + (uptime % 60) + ' min');
        html += row('Erreurs (24 dernières heures)', data.erreurs24h);
        html += row('Erreurs (7 derniers jours)', data.erreurs7j);
        html += row('Tickets ouverts', data.ticketsOuverts);
        html += row('E-mail support (destinataire)', ok(data.emailSupportConfigure, 'Configuré', 'Non configuré'));
        html += row('E-mail expéditeur', ok(data.emailExpediteurConfigure, 'Configuré', 'Non configuré')
                + ' &nbsp; SMTP : ' + Ext.String.htmlEncode(data.smtpHost || ''));
        html += row('Dossier support', Ext.String.htmlEncode(data.dossierSupport || '')
                + (data.espaceDisqueLibreMo >= 0 ? ' (' + data.espaceDisqueLibreMo + ' Mo libres)' : ''));
        html += '</table>';

        const incidents = data.derniersIncidents || [];
        html += '<h3>Derniers incidents</h3>';
        if (incidents.length === 0) {
            html += '<p>Aucun incident récent.</p>';
        } else {
            html += '<table style="border-collapse:collapse;min-width:60%;">'
                    + '<tr><th style="padding:6px;border:1px solid #ccc;">Date</th>'
                    + '<th style="padding:6px;border:1px solid #ccc;">Niveau</th>'
                    + '<th style="padding:6px;border:1px solid #ccc;">Module</th>'
                    + '<th style="padding:6px;border:1px solid #ccc;">Message</th>'
                    + '<th style="padding:6px;border:1px solid #ccc;">Occ.</th></tr>';
            Ext.Array.each(incidents, function (incident) {
                const color = incident.niveau === 'FATAL' ? 'darkred' : 'red';
                html += '<tr><td style="padding:6px;border:1px solid #ccc;">'
                        + Ext.String.htmlEncode(incident.date || '') + '</td>'
                        + '<td style="padding:6px;border:1px solid #ccc;color:' + color + ';font-weight:bold;">'
                        + Ext.String.htmlEncode(incident.niveau || '') + '</td>'
                        + '<td style="padding:6px;border:1px solid #ccc;">'
                        + Ext.String.htmlEncode(incident.module || '') + '</td>'
                        + '<td style="padding:6px;border:1px solid #ccc;">'
                        + Ext.String.htmlEncode(incident.message || '') + '</td>'
                        + '<td style="padding:6px;border:1px solid #ccc;text-align:center;">'
                        + incident.occurrences + '</td></tr>';
            });
            html += '</table>';
        }
        content.update(html);
    }
});
