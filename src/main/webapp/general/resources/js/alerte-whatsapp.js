/* global Ext, testextjs */
/*
 * Banniere « session WhatsApp a reconnecter » (demande du 25/10, reprise du CRM UBIPHARM).
 *
 * Pour ceux qui gerent les comptes WhatsApp ou lisent les discussions (le serveur verifie le droit) : verification au
 * demarrage puis toutes les 2 minutes (GET v1/whatsapp/web/alerte). Si la reception est degradee, la session
 * deconnectee ou le service arrete, une banniere s'affiche en haut de la zone de travail, sur tous les ecrans (ancree
 * dans le panneau central : l'ecran se decale, rien n'est cache) :
 *  - « Reconnecter » ouvre Comptes WhatsApp sur l'onglet de connexion (QR code) ;
 *  - « Masquer » la cache 30 minutes sur ce poste.
 * Sans le droit, ou deconnecte : plus aucune verification. Aucune fenetre.
 */
(function () {
    'use strict';

    var URL = '../api/v1/whatsapp/web/alerte';
    var CLE_MASQUEE = 'prestige.alerteWhatsApp.masquee';
    var PERIODE = 120000, MASQUAGE = 30 * 60000;
    var minuteur = null, arrete = false;

    var esc = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
        });
    };

    function masqueeJusqua() {
        try {
            return Number(localStorage.getItem(CLE_MASQUEE) || 0);
        } catch (e) {
            return 0;
        }
    }

    function styles() {
        if (document.getElementById('pwa-styles')) {
            return;
        }
        var st = document.createElement('style');
        st.id = 'pwa-styles';
        st.textContent = '#pwa-banniere .pwa-cadre{display:flex;align-items:center;gap:12px;margin:6px 8px 2px;padding:7px 12px 7px 14px;border-radius:9px;'
                + 'background:#fff4e5;border:1px solid #f0b46a;font:13px "Segoe UI",Arial,sans-serif;color:#7a3b00}'
                + '#pwa-banniere.pwa-grave .pwa-cadre{background:#fdecec;border-color:#e8a1a1;color:#8a1c1c}'
                + '#pwa-banniere .pwa-ic{width:30px;height:30px;flex:0 0 30px;border-radius:50%;display:grid;place-items:center;background:#25d366;color:#fff;font-size:16px}'
                + '#pwa-banniere .pwa-txt{flex:1;min-width:0;line-height:1.35}'
                + '#pwa-banniere .pwa-raison{display:block;font-size:12px;opacity:.85}'
                + '#pwa-banniere button{font:inherit;border-radius:7px;padding:5px 11px;cursor:pointer;white-space:nowrap}'
                + '#pwa-banniere [data-pwa="reconnecter"]{background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;font-weight:600}'
                + '#pwa-banniere [data-pwa="masquer"]{background:transparent;color:inherit;border:1px solid currentColor;opacity:.8}'
                + '#pwa-banniere button:focus-visible{outline:2px solid #f2b84b;outline-offset:2px}';
        document.head.appendChild(st);
    }

    function centre() {
        return Ext.ComponentQuery.query('contentPanel')[0];
    }

    function retirer() {
        var c = centre(), b = Ext.getCmp('pwa-banniere');
        if (c && b) {
            c.removeDocked(b, true);
        }
    }

    /* Comptes WhatsApp, onglet de connexion, s'il est dans le menu de l'utilisateur (memes droits) */
    function reconnecter() {
        var nav = Ext.ComponentQuery.query('navigation')[0], store = nav && nav.getStore ? nav.getStore() : null, titre = null;
        if (store && store.getRootNode) {
            store.getRootNode().cascadeBy(function (n) {
                if (n.get('id') === 'whatsappcomptes') {
                    titre = n.get('text');
                    return false;
                }
            });
        }
        if (!titre) {
            return;
        }
        testextjs.app.getController('App').onLoadNewComponent('whatsappcomptes', titre, '');
        var essais = 0;
        (function onglet() {
            var t = Ext.ComponentQuery.query('whatsappcomptes #ongletsWhatsApp')[0];
            if (t && t.rendered && t.down('#ongletWeb')) {
                t.setActiveTab(t.down('#ongletWeb'));
            } else if (++essais < 40) {
                setTimeout(onglet, 150);
            }
        })();
    }

    function afficher(o) {
        styles();
        var c = centre();
        if (!c) {
            return;
        }
        var html = '<div class="pwa-cadre" role="alert"><span class="pwa-ic"><i class="fa fa-whatsapp"></i></span><span class="pwa-txt"><b>' + esc(o.message) + '</b>'
                + (o.raison ? '<span class="pwa-raison">' + esc(o.raison) + '</span>' : '') + '</span>'
                + '<button type="button" data-pwa="reconnecter">Reconnecter</button><button type="button" data-pwa="masquer">Masquer</button></div>';
        var cmp = Ext.getCmp('pwa-banniere');
        if (cmp) {
            cmp.removeCls('pwa-grave');
            if (o.type !== 'DEGRADE') {
                cmp.addCls('pwa-grave');
            }
            cmp.update(html);
            return;
        }
        cmp = c.addDocked({xtype: 'component', id: 'pwa-banniere', dock: 'top', cls: o.type === 'DEGRADE' ? '' : 'pwa-grave', html: html})[0];
        cmp.getEl().on('click', function (ev) {
            var t = ev.browserEvent.target, a = t.closest ? t.closest('[data-pwa]') : null;
            if (!a) {
                return;
            }
            if (a.getAttribute('data-pwa') === 'masquer') {
                try {
                    localStorage.setItem(CLE_MASQUEE, String(Date.now() + MASQUAGE));
                } catch (x) {
                    /* navigation privee : masquee jusqu'au rechargement seulement */
                }
                retirer();
            } else {
                reconnecter();
            }
        });
    }

    function verifier() {
        if (arrete || !window.Ext || !Ext.Ajax) {
            return;
        }
        Ext.Ajax.request({url: URL, method: 'GET', timeout: 15000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (o.sansDroit) {
                    arrete = true;
                    clearInterval(minuteur);
                    retirer();
                    return;
                }
                if (o.success && o.alerte && Date.now() > masqueeJusqua()) {
                    afficher(o);
                } else {
                    retirer();
                }
            },
            failure: function (r) {
                if (r.status === 401) {
                    arrete = true;
                    clearInterval(minuteur);
                }
            }});
    }

    window.PrestigeAlerteWhatsApp = {verifier: verifier};

    /* au demarrage de l'application (apres le chargement du menu), puis regulierement */
    (function attendre() {
        if (window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length && centre()) {
            setTimeout(verifier, 3000);
            minuteur = setInterval(verifier, PERIODE);
        } else {
            setTimeout(attendre, 500);
        }
    })();
})();
