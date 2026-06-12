/* ============================================================
   PRESTIGE — Icônes de secours du menu Metro
   Certaines entrées de menu n'ont pas de classe d'icône en base
   (valeur vide ou "null") : on déduit alors une icône Font
   Awesome 4 du libellé de la tuile. Les icônes déjà définies en
   base restent prioritaires et ne sont jamais remplacées.
   ============================================================ */
(function () {

    /* Mots-clés (français) -> icône FA4. Le premier qui matche gagne. */
    var ICON_MAP = [
        ['tableau de bord', 'fa-tachometer'],
        ['dashboard',       'fa-tachometer'],
        ['vente',           'fa-shopping-cart'],
        ['devis',           'fa-file-text-o'],
        ['caisse',          'fa-money'],
        ['billetage',       'fa-money'],
        ['client',          'fa-users'],
        ['ayant droit',     'fa-user-plus'],
        ['stock',           'fa-cubes'],
        ['inventaire',      'fa-list-alt'],
        ['commande',        'fa-clipboard'],
        ['suggestion',      'fa-lightbulb-o'],
        ['reserve',         'fa-exchange'],
        ['réserve',         'fa-exchange'],
        ['peremption',      'fa-clock-o'],
        ['péremption',      'fa-clock-o'],
        ['perime',          'fa-clock-o'],
        ['périmé',          'fa-clock-o'],
        ['fournisseur',     'fa-building'],
        ['grossiste',       'fa-building'],
        ['tiers',           'fa-credit-card'],
        ['facturation',     'fa-file-text'],
        ['facture',         'fa-file-text'],
        ['reglement',       'fa-credit-card'],
        ['règlement',       'fa-credit-card'],
        ['analyse',         'fa-bar-chart'],
        ['statistique',     'fa-bar-chart'],
        ['rapport',         'fa-line-chart'],
        ['chiffre',         'fa-line-chart'],
        ['utilisateur',     'fa-user'],
        ['role',            'fa-key'],
        ['rôle',            'fa-key'],
        ['privilege',       'fa-key'],
        ['privilège',       'fa-key'],
        ['sms',             'fa-envelope'],
        ['notification',    'fa-bell'],
        ['message',         'fa-envelope'],
        ['alerte',          'fa-bell'],
        ['parametre',       'fa-cogs'],
        ['paramètre',       'fa-cogs'],
        ['configuration',   'fa-cogs'],
        ['retour',          'fa-undo'],
        ['avoir',           'fa-undo'],
        ['ajustement',      'fa-sliders'],
        ['deconditionnement', 'fa-object-ungroup'],
        ['déconditionnement', 'fa-object-ungroup'],
        ['etiquette',       'fa-tags'],
        ['étiquette',       'fa-tags'],
        ['tarif',           'fa-tags'],
        ['prix',            'fa-tags'],
        ['promotion',       'fa-percent'],
        ['remise',          'fa-percent'],
        ['medecin',         'fa-user-md'],
        ['médecin',         'fa-user-md'],
        ['pharmacien',      'fa-medkit'],
        ['famille',         'fa-sitemap'],
        ['article',         'fa-medkit'],
        ['produit',         'fa-medkit'],
        ['fiche',           'fa-folder-open'],
        ['depot',           'fa-archive'],
        ['dépôt',           'fa-archive'],
        ['retrocession',    'fa-exchange'],
        ['rétrocession',    'fa-exchange'],
        ['migration',       'fa-database'],
        ['societe',         'fa-industry'],
        ['société',         'fa-industry'],
        ['gestion courante', 'fa-briefcase'],
        ['service',         'fa-handshake-o'],
        ['menu',            'fa-th-large']
    ];

    var DEFAULT_ICON = 'fa-th-large';

    function hasRealIcon(cls) {
        if (!cls) {
            return false;
        }
        cls = String(cls).trim().toLowerCase();
        if (cls === '' || cls === 'null' || cls === 'undefined' || cls === 'fa') {
            return false;
        }
        /* une vraie icone porte un glyphe fa-xxx ou icon-xxx */
        return /(^|\s)fa-[a-z0-9-]+/.test(cls) || /(^|\s)icon-[a-z0-9-]+/.test(cls);
    }

    function iconForLabel(label) {
        var lower = (label || '').toLowerCase();
        for (var i = 0; i < ICON_MAP.length; i++) {
            if (lower.indexOf(ICON_MAP[i][0]) !== -1) {
                return ICON_MAP[i][1];
            }
        }
        return DEFAULT_ICON;
    }

    function prestigeMetroIcons() {
        var tiles = document.querySelectorAll('.pm-tile');
        for (var i = 0; i < tiles.length; i++) {
            var ico = tiles[i].querySelector('.pm-ico i');
            if (!ico || hasRealIcon(ico.className)) {
                continue;
            }
            var labelEl = tiles[i].querySelector('.pm-label');
            var label = labelEl ? (labelEl.textContent || labelEl.innerText || '') : '';
            ico.className = 'fa ' + iconForLabel(label);
        }
    }

    window.prestigeMetroIcons = prestigeMetroIcons;

    if (document.readyState !== 'loading') {
        prestigeMetroIcons();
    } else {
        document.addEventListener('DOMContentLoaded', prestigeMetroIcons);
    }
})();
