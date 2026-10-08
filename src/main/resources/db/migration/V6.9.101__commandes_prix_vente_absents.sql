-- Retours du 08/10 : lignes de commandes NON receptionnees sans prix de vente (NULL : commande creee depuis une
-- suggestion dont la ligne n'en avait pas ; 0 : reponse PharmaML sans PUBTC, ex. DPCI). Une ligne sans prix rendait
-- la liste des commandes en cours impossible a afficher. Prix de vente de la fiche article repris.
UPDATE `t_order_detail` d
  JOIN `t_order` o ON o.`lg_ORDER_ID` = d.`lg_ORDER_ID`
  JOIN `t_famille` f ON f.`lg_FAMILLE_ID` = d.`lg_FAMILLE_ID`
SET d.`int_PRICE_DETAIL` = f.`int_PRICE`
WHERE (d.`int_PRICE_DETAIL` IS NULL OR d.`int_PRICE_DETAIL` = 0)
  AND o.`str_STATUT` IN ('is_Process', 'pharma')
  AND f.`int_PRICE` IS NOT NULL;
