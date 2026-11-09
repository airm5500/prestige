-- Plan du 08/11, point 13 : une vente ratee d'un produit connu passe « Commandé » quand ce produit entre en stock (BL
-- cloture avec une quantite entree), si la demande est anterieure a l'entree. La reference du BL est gardee pour
-- l'afficher (« Commandé · entrée BL … ») ; vide pour un marquage a la main (« Commander »). Rejouable.
ALTER TABLE t_vente_ratee ADD COLUMN IF NOT EXISTS str_REF_ENTREE varchar(40) DEFAULT NULL;
