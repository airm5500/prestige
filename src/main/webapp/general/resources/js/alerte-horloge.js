/* global Ext */
/*
 * Rappel « date et heure du systeme fausses » (retours du 25/10, point 2).
 *
 * Employes qui reculent la date pour ressaisir des ventes, pile CMOS faible (date perdue au demarrage), fuseau horaire
 * change : verification a la connexion puis toutes les 5 minutes (GET v1/horloge/etat), pour tous les utilisateurs.
 * Le serveur compare son horloge a l'heure d'Internet, a la derniere operation de caisse et au fuseau attendu ; ce
 * poste compare en plus sa propre horloge a celle du serveur. Toast pose sur la page, comme celui de WhatsApp (au-dessus
 * de lui s'ils sont la tous les deux) :
 *  - « Mettre a jour » : le serveur se synchronise comme Windows (POST v1/horloge/synchroniser) ; le compte rendu
 *    s'affiche dans le toast, puis la verification est relancee ; pour l'horloge de ce poste, le toast dit comment faire ;
 *  - « Masquer » : jusqu'a la verification suivante (5 minutes).
 * Aucune fenetre.
 */
(function () {
    'use strict';

    var URL = '../api/v1/horloge/etat', TOLERANCE_MS = 120000;
    var REGLAGE = {periode: 300000};
    var minuteur = null, arrete = false, masqueeJusqua = 0;
    /* dernier compte rendu de « Mettre a jour » : garde quand le toast est redessine (verification suivante) */
    var compteRendu = null;

    var esc = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
        });
    };

    function styles() {
        if (document.getElementById('phr-styles')) {
            return;
        }
        var st = document.createElement('style');
        st.id = 'phr-styles';
        st.textContent = '#phr-toast{position:fixed;right:16px;bottom:16px;z-index:30001;width:460px;max-width:calc(100vw - 32px);animation:phr-arrivee .25s ease-out}'
                + '@keyframes phr-arrivee{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'
                + '#phr-toast .phr-cadre{display:flex;align-items:flex-start;flex-wrap:wrap;gap:8px 12px;padding:10px 12px 10px 14px;border-radius:10px;'
                + 'box-shadow:0 10px 28px rgba(15,23,42,.22),0 2px 6px rgba(15,23,42,.12);'
                + 'background:#fdecec;border:1px solid #e8a1a1;font:13px "Segoe UI",Arial,sans-serif;color:#8a1c1c}'
                + '#phr-toast .phr-ic{width:30px;height:30px;flex:0 0 30px;border-radius:50%;display:grid;place-items:center;background:#c0392b;color:#fff;font-size:15px}'
                + '#phr-toast .phr-txt{flex:1 1 300px;min-width:0;line-height:1.35}'
                + '#phr-toast .phr-txt ul{margin:4px 0 0 16px;padding:0}#phr-toast .phr-txt li{margin:2px 0}'
                + '#phr-toast .phr-raison{display:block;margin-top:4px;font-size:12px;opacity:.9}'
                + '#phr-toast .phr-actions{display:flex;gap:8px;margin-left:auto;align-self:flex-end}'
                + '#phr-toast button{font:inherit;border-radius:7px;padding:5px 11px;cursor:pointer;white-space:nowrap}'
                + '#phr-toast [data-phr="mettre-a-jour"]{background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;font-weight:600}'
                + '#phr-toast [data-phr="mettre-a-jour"][disabled]{opacity:.7;cursor:default}'
                + '#phr-toast [data-phr="masquer"]{background:transparent;color:inherit;border:1px solid currentColor;opacity:.8}'
                + '#phr-toast button:focus-visible{outline:2px solid #f2b84b;outline-offset:2px}';
        document.head.appendChild(st);
    }

    function retirer() {
        var t = document.getElementById('phr-toast');
        if (t) {
            t.parentNode.removeChild(t);
        }
    }

    /* au-dessus du toast WhatsApp s'il est affiche */
    function placer() {
        var t = document.getElementById('phr-toast'), w = document.getElementById('pwa-banniere');
        if (t) {
            t.style.bottom = (w ? w.getBoundingClientRect().height + 28 : 16) + 'px';
        }
    }

    function duree(ms) {
        var m = Math.round(Math.abs(ms) / 60000), h = Math.floor(m / 60), j = Math.floor(h / 24);
        return j ? j + (j > 1 ? ' jours' : ' jour') + (h % 24 ? ' ' + (h % 24) + ' h' : '') : h ? h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
    }

    function raison(t) {
        var r = document.querySelector('#phr-toast .phr-raison');
        if (r) {
            r.textContent = t;
        }
    }

    function afficher(messages, serveur) {
        styles();
        var html = '<div class="phr-cadre" role="alert"><span class="phr-ic"><i class="fa fa-clock-o"></i></span><span class="phr-txt">'
                + '<b>La date ou l\'heure n\'est pas bonne.</b><ul>' + messages.map(function (m) {
                    return '<li>' + esc(m) + '</li>';
                }).join('') + '</ul><span class="phr-raison"></span></span><span class="phr-actions">'
                + '<button type="button" data-phr="mettre-a-jour">Mettre à jour</button>'
                + '<button type="button" data-phr="masquer">Masquer</button></span></div>';
        var t = document.getElementById('phr-toast');
        if (t && t.querySelector('[data-phr="mettre-a-jour"][disabled]')) {
            return; /* synchronisation en cours : le compte rendu reste affiche */
        }
        if (!t) {
            t = document.createElement('div');
            t.id = 'phr-toast';
            document.body.appendChild(t);
            t.addEventListener('click', function (ev) {
                var a = ev.target.closest ? ev.target.closest('[data-phr]') : null;
                if (!a) {
                    return;
                }
                if (a.getAttribute('data-phr') === 'masquer') {
                    masqueeJusqua = Date.now() + REGLAGE.periode - 1000;
                    retirer();
                } else if (!a.disabled) {
                    mettreAJour(a, t.getAttribute('data-serveur') === '1');
                }
            });
        }
        t.innerHTML = html;
        t.setAttribute('data-serveur', serveur ? '1' : '0');
        if (compteRendu && Date.now() - compteRendu.le < REGLAGE.periode) {
            raison(compteRendu.texte);
            if (compteRendu.ok) {
                t.querySelector('[data-phr="mettre-a-jour"]').textContent = 'Mis à jour';
            }
        }
        placer();
    }

    function mettreAJour(bouton, serveur) {
        if (!serveur) {
            raison('Sur ce poste : clic droit sur l\'heure de Windows (en bas à droite) > « Ajuster la date et l\'heure » >'
                    + ' « Synchroniser maintenant ». Le serveur, lui, est à l\'heure.');
            return;
        }
        bouton.disabled = true;
        bouton.textContent = 'Mise à jour…';
        Ext.Ajax.request({url: '../api/v1/horloge/synchroniser', method: 'POST', timeout: 90000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                compteRendu = {texte: o.msg || (o.success ? 'Heure synchronisée.' : 'Synchronisation impossible.'), ok: !!o.success, le: Date.now()};
                bouton.disabled = false;
                bouton.textContent = o.success ? 'Mis à jour' : 'Mettre à jour';
                raison(compteRendu.texte);
                setTimeout(verifier, 1500);
            },
            failure: function () {
                bouton.disabled = false;
                bouton.textContent = 'Mettre à jour';
                raison('Synchronisation impossible (serveur injoignable).');
            }});
    }

    function verifier() {
        if (arrete || !window.Ext || !Ext.Ajax) {
            return;
        }
        var depart = Date.now();
        Ext.Ajax.request({url: URL, method: 'GET', timeout: 20000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (o.success === false) {
                    arrete = true; /* deconnecte */
                    clearInterval(minuteur);
                    retirer();
                    return;
                }
                var messages = (o.anomalies || []).map(function (a) {
                    return a.message;
                }), serveur = messages.length > 0;
                /* horloge de ce poste : comparee a celle du serveur (moitie de l'aller-retour) */
                if (o.serveurMs) {
                    var ecart = Date.now() - (o.serveurMs + (Date.now() - depart) / 2);
                    if (Math.abs(ecart) > TOLERANCE_MS) {
                        messages.push('L\'horloge de ce poste est ' + (ecart > 0 ? 'en avance' : 'en retard') + ' de ' + duree(ecart)
                                + ' sur le serveur (' + o.serveur + ').');
                    }
                }
                if (!messages.length) {
                    retirer();
                    return;
                }
                if (Date.now() < masqueeJusqua) {
                    return;
                }
                afficher(messages, serveur);
            }
        });
    }

    window.PrestigeAlerteHorloge = {verifier: verifier, reglage: REGLAGE};

    /* apres l'ouverture de l'application, puis toutes les 5 minutes */
    (function attendre() {
        if (window.Ext && Ext.Ajax && window.testextjs && testextjs.app) {
            setTimeout(verifier, 4000);
            minuteur = setInterval(verifier, REGLAGE.periode);
        } else {
            setTimeout(attendre, 500);
        }
    })();
})();
