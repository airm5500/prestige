/* Retrait temporaire d'un privilege au role du compte de test (tests « sans le privilege » joues avec admin, qui les
 * a tous). Les lignes retirees sont sauvegardees dans une table du test, puis remises a l'identique ; un test
 * interrompu est repare au lancement suivant (remettre() d'abord). */
module.exports = function privilegeEssai(q, exec, login, privilege) {
  const role = () => q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID WHERE u.str_LOGIN='" + login + "' LIMIT 1");
  const priv = () => q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME='" + privilege + "'");
  const table = 'e2e_priv_' + privilege.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
  return {
    retirer() {
      exec("CREATE TABLE IF NOT EXISTS " + table + " AS SELECT * FROM t_role_privelege WHERE 1 = 0;"
        + " INSERT INTO " + table + " SELECT * FROM t_role_privelege WHERE lg_ROLE_ID='" + role() + "' AND lg_PRIVILEGE_ID='" + priv() + "';"
        + " DELETE FROM t_role_privelege WHERE lg_ROLE_ID='" + role() + "' AND lg_PRIVILEGE_ID='" + priv() + "';");
    },
    remettre() {
      exec("CREATE TABLE IF NOT EXISTS " + table + " AS SELECT * FROM t_role_privelege WHERE 1 = 0;"
        + " INSERT IGNORE INTO t_role_privelege SELECT * FROM " + table + "; DROP TABLE " + table + ";");
    }
  };
};
