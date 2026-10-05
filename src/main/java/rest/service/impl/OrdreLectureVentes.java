package rest.service.impl;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.resource.jdbc.spi.StatementInspector;

/**
 * ARTICLES VENDUS (recapitulatif) : lecture des ventes PAR LA DATE quand la periode est courte (blocage signale le
 * 05/10 : « requete en traitement depuis 39s : article-vendus-recap »).
 *
 * <p>
 * Sur ces requetes, MariaDB part des fiches de stock et relit TOUT l'historique de chaque produit avant de filtrer par
 * date. Pour une periode qui ne couvre qu'une partie des ventes, lire d'abord les ventes de la periode puis leurs
 * lignes est nettement plus rapide, pour exactement le meme resultat. Hibernate ne sait pas imposer cet ordre : cet
 * inspecteur le fixe (les deux premieres tables, lignes et ventes, sont interverties - jointure interne, meme resultat
 * - et STRAIGHT_JOIN garde l'ordre ecrit), SEULEMENT pendant les requetes que le service a explicitement marquees sur
 * ce fil (activer / desactiver). Toutes les autres requetes passent telles quelles.
 *
 * <p>
 * (Un simple FORCE INDEX sur les ventes a ete essaye puis ecarte : il n'impose pas l'ordre, et avec un filtre de stock
 * l'optimiseur relisait l'index des ventes pour chaque produit - plusieurs minutes.)
 */
public class OrdreLectureVentes implements StatementInspector {

    private static final long serialVersionUID = 1L;

    /** Index cree par la migration V6.0.2 (str_STATUT, b_IS_CANCEL, dt_UPDATED, int_PRICE, lg_USER_ID). */
    public static final String INDEX = "idx_preenregistrement_articles_vendus";

    private static final ThreadLocal<Boolean> ACTIF = new ThreadLocal<>();

    /** Debut de requete d'Hibernate : lignes de vente, puis ventes jointes sur la vente de la ligne. */
    private static final Pattern DEBUT = Pattern.compile(
            "^select (.*?) from t_preenregistrement_detail (\\w+) inner join t_preenregistrement (\\w+) on ",
            Pattern.DOTALL);

    public static void activer() {
        ACTIF.set(Boolean.TRUE);
    }

    public static void desactiver() {
        ACTIF.remove();
    }

    @Override
    public String inspect(String sql) {
        if (!Boolean.TRUE.equals(ACTIF.get()) || sql == null) {
            return sql;
        }
        Matcher m = DEBUT.matcher(sql);
        if (!m.find()) {
            return sql;
        }
        return "select STRAIGHT_JOIN " + m.group(1) + " from t_preenregistrement " + m.group(3)
                + " inner join t_preenregistrement_detail " + m.group(2) + " on " + sql.substring(m.end());
    }
}
