-- Plan avoir du 08/11, point 9 : une nouvelle installation recoit les vraies valeurs du service compagnon
-- WhatsApp Web (et non plus de simples indications grisees) : adresse http://localhost:3010 (PORT de
-- config.exemple.json) et dossier C:\prestige\whatsapp-web (dossier du service Windows).
-- Seul un compte Web jamais configure est complete : ni adresse, ni dossier, ni jeton, jamais enregistre depuis
-- l'ecran (updated_at et updated_by vides). Une installation deja configuree n'est pas touchee ; rejouee, la
-- migration ne change plus rien (idempotente).
-- La barre oblique inverse est ecrite par CHAR(92) : juste quel que soit le mode NO_BACKSLASH_ESCAPES.
UPDATE whatsapp_compte
   SET web_url = 'http://localhost:3010',
       web_repertoire = CONCAT('C:', CHAR(92), 'prestige', CHAR(92), 'whatsapp-web')
 WHERE mode = 'WEB'
   AND NULLIF(TRIM(web_url), '') IS NULL
   AND NULLIF(TRIM(web_repertoire), '') IS NULL
   AND NULLIF(TRIM(web_jeton), '') IS NULL
   AND updated_at IS NULL
   AND updated_by IS NULL;
