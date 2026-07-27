/* global Ext, valheight */

// Conteneur a onglets de la gestion des reserves.
//   - ALL             : tous les articles en reserve (vue historique)
//   - REAPPRO RESERVE : articles ou stock rayon > stock reserve (rayon -> reserve)
//   - REASSORT RAYON  : articles ou stock reserve > stock rayon (reserve -> rayon)
Ext.define('testextjs.view.stockmanagement.reserve.ReserveManager', {
    extend: 'Ext.tab.Panel',
    xtype: 'reservemanager',
    id: 'reservemanagerID',
    requires: [
        'testextjs.view.stockmanagement.reserve.ReserveGrid',
        'testextjs.view.stockmanagement.reserve.SuggestionsGrid',
        'testextjs.view.stockmanagement.reserve.HistoriqueGrid'
    ],
    title: 'Gestion des reserves',
    width: '98%',
    height: valheight,
    plain: true,
    maximizable: true,
    closable: false,
    frame: true,
    initComponent: function () {
        // Inject tab color CSS once
        if (!document.getElementById('reserve-tab-styles')) {
            var s = document.createElement('style');
            s.id = 'reserve-tab-styles';
            s.textContent = [
                '.tab-reappro.x-tab { background-color: #d97200 !important; border-color: #b05a00 !important; }',
                '.tab-reappro.x-tab .x-tab-inner, .tab-reappro.x-tab .x-tab-text { color: #fff !important; font-weight: bold !important; }',
                '.tab-reappro.x-tab-active { background-color: #ff9500 !important; border-top: 3px solid #fff !important; }',
                '.tab-reassort.x-tab { background-color: #2a6b2e !important; border-color: #1a4a1e !important; }',
                '.tab-reassort.x-tab .x-tab-inner, .tab-reassort.x-tab .x-tab-text { color: #fff !important; font-weight: bold !important; }',
                '.tab-reassort.x-tab-active { background-color: #3daa42 !important; border-top: 3px solid #fff !important; }',
                '.btn-reappro-orange.x-btn { background-color: #ff9500 !important; background-image: none !important; border-color: #b05a00 !important; }',
                '.btn-reappro-orange.x-btn .x-btn-inner { color: #fff !important; font-weight: bold !important; }',
                '.btn-reassort-green.x-btn { background-color: #3daa42 !important; background-image: none !important; border-color: #1a4a1e !important; }',
                '.btn-reassort-green.x-btn .x-btn-inner { color: #fff !important; font-weight: bold !important; }',
                // Onglet SUGGESTIONS : violet
                '.tab-suggestions.x-tab { background-color: #6a1b9a !important; border-color: #4a137a !important; }',
                '.tab-suggestions.x-tab .x-tab-inner, .tab-suggestions.x-tab .x-tab-text { color: #fff !important; font-weight: bold !important; }',
                '.tab-suggestions.x-tab-active { background-color: #8e24aa !important; border-top: 3px solid #fff !important; }',
                '.btn-suggestions-violet.x-btn { background-color: #8e24aa !important; background-image: none !important; border-color: #4a137a !important; }',
                '.btn-suggestions-violet.x-btn .x-btn-inner { color: #fff !important; font-weight: bold !important; }',
                // Onglet HISTORIQUE : gris
                '.tab-historique.x-tab { background-color: #5f6368 !important; border-color: #3c4043 !important; }',
                '.tab-historique.x-tab .x-tab-inner, .tab-historique.x-tab .x-tab-text { color: #fff !important; font-weight: bold !important; }',
                '.tab-historique.x-tab-active { background-color: #80868b !important; border-top: 3px solid #fff !important; }',
                // Pastille sur l'onglet ACTIF (copie isolee de la pastille des avoirs)
                '.reserve-pastille { display:inline-block; width:10px; height:10px; border-radius:50%; background:#fff; border:2px solid rgba(0,0,0,0.35); margin-right:7px; vertical-align:middle; box-shadow:0 0 0 2px rgba(255,255,255,0.65); animation:reservePastille 1.1s infinite; }',
                '@keyframes reservePastille { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.3); opacity:0.7; } }',
                '.reserve-tab-on-label { text-decoration:underline; text-underline-offset:3px; }'
            ].join('\n');
            document.head.appendChild(s);
        }

        // Met une pastille + libelle souligne sur l'onglet actif, libelle brut sur les autres.
        var updateReservePastille = function (tabPanel) {
            var active = tabPanel.getActiveTab();
            tabPanel.items.each(function (card) {
                var label = card.baseTitle || card.title;
                if (card === active) {
                    card.setTitle('<span class="reserve-pastille"></span><span class="reserve-tab-on-label">'
                            + label + '</span>');
                } else {
                    card.setTitle(label);
                }
            });
        };

        // Explication au survol de chaque onglet : phrase simple, en bleu et en gras, qui dit d'ou part le stock
        // et ou il arrive. Le style est en ligne pour rester prioritaire sur l'habillage de l'infobulle.
        var tip = function (texte) {
            return '<span style="color:#0b57d0;font-weight:bold;">' + texte + '</span>';
        };

        this.items = [
            {
                xtype: 'reservegrid', title: 'TOUT', baseTitle: 'TOUT', gridmode: 'ALL',
                tabConfig: {
                    tooltip: tip('Tous les articles suivis en reserve.<br>'
                            + 'Vue d\'ensemble : le rayon et la reserve sont affiches cote a cote.')
                }
            },
            {
                xtype: 'reservegrid', gridmode: 'REAPPRO',
                title: 'REAPPRO RESERVE (ENVOI EN RESERVE)', baseTitle: 'REAPPRO RESERVE (ENVOI EN RESERVE)',
                tabConfig: {
                    cls: 'tab-reappro',
                    tooltip: tip('On REMPLIT LA RESERVE avec le trop-plein du rayon.<br>'
                            + 'Le stock part DU RAYON &rarr; et arrive EN RESERVE.<br>'
                            + 'Articles proposes : ceux dont le rayon depasse le seuil reserve.')
                }
            },
            {
                xtype: 'reservegrid', gridmode: 'REASSORT',
                title: 'REASSORT RAYON (ENVOI EN RAYON)', baseTitle: 'REASSORT RAYON (ENVOI EN RAYON)',
                tabConfig: {
                    cls: 'tab-reassort',
                    tooltip: tip('On REGARNIT LE RAYON en puisant dans la reserve.<br>'
                            + 'Le stock part DE LA RESERVE &rarr; et arrive AU RAYON.<br>'
                            + 'Articles proposes : ceux dont le rayon est tombe au seuil mini.')
                }
            },
            {
                xtype: 'reservesuggestionsgrid', itemId: 'ongletSuggestions',
                title: 'SUGGESTIONS', baseTitle: 'SUGGESTIONS',
                tabConfig: {
                    cls: 'tab-suggestions',
                    tooltip: tip('Les suggestions enregistrees, a traiter ou deja traitees.<br>'
                            + 'Chaque suggestion garde la trace de ce qui a ete propose,<br>'
                            + 'de ce qui a ete retenu et de ce qui a reellement ete deplace.')
                }
            },
            {
                xtype: 'reservehistoriquegrid', itemId: 'ongletHistorique',
                title: 'HISTORIQUE', baseTitle: 'HISTORIQUE',
                tabConfig: {
                    cls: 'tab-historique',
                    tooltip: tip('Tous les mouvements entre le rayon et la reserve.<br>'
                            + 'Rien n\'y est jamais supprime : une erreur se corrige<br>'
                            + 'par un mouvement inverse, qui s\'ajoute a la suite.')
                }
            }
        ];
        // Chargement pilote UNIQUEMENT ici. Les grilles ne se chargent plus d'elles-memes a
        // l'affichage : leur chargement automatique se cumulait avec celui declenche au
        // changement d'onglet, et la meme requete partait deux fois.
        var chargerOnglet = function (card) {
            if (card && card.reloadGrid) {
                card.reloadGrid();
            }
        };

        this.listeners = {
            tabchange: function (tabPanel, newCard) {
                chargerOnglet(newCard);
                updateReservePastille(tabPanel);
            },
            afterrender: function (tabPanel) {
                updateReservePastille(tabPanel);
                // Le premier onglet affiche n'a pas recu d'evenement de changement : on le charge ici.
                Ext.defer(function () {
                    chargerOnglet(tabPanel.getActiveTab());
                }, 1);
            }
        };
        this.callParent();
    }
});
