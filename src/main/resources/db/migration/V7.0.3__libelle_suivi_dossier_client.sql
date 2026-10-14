-- Retours du 13/10, point 12 : « Ordonnances clients » devient « Suivi dossier client » (libelle et description du
-- menu ; 20 caracteres, sous les limites 25/30 de l'arbre de navigation). Le composant et le privilege ne changent pas.
UPDATE t_sous_menu SET str_VALUE = 'Suivi dossier client', str_DESCRIPTION = 'Suivi dossier client', dt_UPDATED = NOW()
 WHERE str_COMPOSANT = 'ordonnanceclient';
