-- URL publique du callback Delivery Receipt, parametrable depuis l'application
-- (TParameters). Repli sur dicisms.properties (smsdrcallbackurl) si vide.
-- Modifiable via l'ecran Notifications > Accuses de reception (DR).

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_SMS_DR_CALLBACK_URL', 'https://app.prestige3.com.ngrok.pro/prestige/api/v1/sms/dr-callback',
       'URL publique appelee par Orange pour les accuses de reception SMS (Delivery Receipts)', 'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_SMS_DR_CALLBACK_URL');
