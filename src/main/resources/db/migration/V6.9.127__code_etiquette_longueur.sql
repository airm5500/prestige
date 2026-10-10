-- Retours du 10/10 : le code d'etiquette ne se repete jamais ; quand les codes a 5 caracteres s'epuisent, on passe a
-- 6, puis 7, puis 8 caracteres (le registre accepte donc jusqu'a 8 caracteres).
ALTER TABLE t_etiquette_code MODIFY code VARCHAR(8) NOT NULL;
