-- Index pour les requetes de peremption (badge de la cloche de notifications, widget et ecran
-- des peremptions, exports) : WHERE dt_PEREMPTION entre deux bornes AND current_stock > 0.
-- Sans cet index (et avec l'ancien DATE(dt_PEREMPTION) non indexable), chaque appel parcourait
-- la table t_lot entiere jointe a 5 tables, trois fois par appel, toutes les 60 secondes :
-- les threads HTTP du serveur finissaient saturés et plus aucune donnee ne s'affichait.
ALTER TABLE t_lot
    ADD INDEX IF NOT EXISTS idx_lot_peremption_stock (dt_PEREMPTION, current_stock) USING BTREE;
