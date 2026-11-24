-- Libellé du menu « Ouverture / clôture caisse » (plan du 14/11, point 5) : 26 caractères, au-delà de la règle des
-- 25 (test retours/test-libelles-menus). Mêmes mots, sans les espaces autour de la barre : « Ouverture/clôture caisse »
-- (24 caractères).
-- Seul le libellé d'origine est remplacé : un libellé changé à la main en officine est gardé. Rejouable.

UPDATE t_sous_menu
   SET str_DESCRIPTION = 'Ouverture/clôture caisse', dt_UPDATED = NOW()
 WHERE str_COMPOSANT = 'caisseouverturecloture'
   AND str_DESCRIPTION = 'Ouverture / clôture caisse';
