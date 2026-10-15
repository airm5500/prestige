/* Produits nommes dont un test a besoin (SINTROM, BRUFEN...) et que le catalogue du banc ne porte pas toujours : ceux
 * qui manquent sont crees le temps du test, par copie d'un article existant (meme forme de fiche, stock au rayon), sous
 * des identifiants marques ; retirer() n'enleve que ces copies. Un produit deja present n'est jamais touche. */
module.exports = function produitsEssai(q, exec, marque) {
  const texte = (v) => "'" + String(v).replace(/'/g, "''") + "'";
  const colonnes = (table) => q("SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.COLUMNS"
    + " WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '" + table + "'").split(',');
  /* copie d'une ligne : chaque colonne reprend la valeur de la source, sauf celles donnees */
  const copier = (table, cle, source, valeurs) => {
    const cols = colonnes(table);
    exec('INSERT INTO ' + table + ' (' + cols.map((c) => '`' + c + '`').join(',') + ') SELECT '
      + cols.map((c) => (Object.prototype.hasOwnProperty.call(valeurs, c) ? valeurs[c] : '`' + c + '`')).join(',')
      + ' FROM ' + table + ' WHERE ' + cle + ' = ' + texte(source) + ' LIMIT 1');
  };
  return {
    assurer(noms) {
      retirer();
      const source = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
        + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_PRICE > 0 ORDER BY f.lg_FAMILLE_ID LIMIT 1");
      const stock = q("SELECT lg_FAMILLE_STOCK_ID FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + source + "' AND lg_EMPLACEMENT_ID = '1' LIMIT 1");
      const crees = [];
      noms.forEach((nom, i) => {
        if (q("SELECT COUNT(*) FROM t_famille WHERE str_NAME = " + texte(nom) + " AND str_STATUT = 'enable'") !== '0') {
          return;
        }
        const id = marque + 'P' + i;
        let cip;
        do { cip = '9' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0'); } while (q("SELECT COUNT(*) FROM t_famille WHERE int_CIP = '" + cip + "'") !== '0');
        copier('t_famille', 'lg_FAMILLE_ID', source, { lg_FAMILLE_ID: texte(id), str_NAME: texte(nom), str_DESCRIPTION: texte(nom),
          int_CIP: texte(cip), int_EAN13: 'NULL', code_ean_fabriquant: 'NULL', dt_CREATED: 'NOW()', dt_UPDATED: 'NOW()' });
        copier('t_famille_stock', 'lg_FAMILLE_STOCK_ID', stock, { lg_FAMILLE_STOCK_ID: texte(id + 'S'), lg_FAMILLE_ID: texte(id),
          int_NUMBER: '20', int_NUMBER_AVAILABLE: '20', dt_CREATED: 'NOW()', dt_UPDATED: 'NOW()' });
        // la recherche de la vente joint les grossistes du produit (jointure interne)
        const fg = q("SELECT lg_FAMILLE_GROSSISTE_ID FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + source + "' LIMIT 1");
        if (fg) {
          copier('t_famille_grossiste', 'lg_FAMILLE_GROSSISTE_ID', fg, { lg_FAMILLE_GROSSISTE_ID: texte(id + 'G'), lg_FAMILLE_ID: texte(id),
            str_CODE_ARTICLE: texte(cip), dt_CREATED: 'NOW()', dt_UPDATED: 'NOW()' });
        }
        crees.push(nom);
      });
      return crees;
    },
    retirer
  };
  function retirer() {
    exec("DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_ID LIKE '" + marque + "P%';"
      + " DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID LIKE '" + marque + "P%';"
      + " DELETE FROM t_famille WHERE lg_FAMILLE_ID LIKE '" + marque + "P%';");
  }
};
