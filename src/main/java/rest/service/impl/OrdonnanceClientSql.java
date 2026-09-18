package rest.service.impl;

import java.time.LocalDate;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;

/**
 * Requetes de l'historique des ordonnances clients (evolution 6, point 2).
 *
 * <p>
 * Le SQL est sorti du service pour pouvoir etre VERIFIE sans base de donnees : c'est ici que se joue le respect des
 * filtres demandes (« rechercher et filtrer par client, type de client et periode »), et une clause oubliee dans une
 * edition ferait imprimer plus de lignes que celles affichees a l'ecran.
 *
 * <p>
 * Le comptage et la liste partagent la MEME clause : un total qui ne compte pas les memes lignes que la grille est un
 * defaut qu'on ne voit qu'a la pagination, donc tard.
 */
public final class OrdonnanceClientSql {

    /** Criteres de l'historique, tels que l'ecran les pose. */
    public static final class Criteres {

        /** Numero d'ordonnance, nom du client ou nom du prescripteur. */
        public final String recherche;
        /** Un client precis (sa fiche), ou null pour tous. */
        public final String clientId;
        /** Carnet, assurance, standard... ou null pour tous les types. */
        public final String typeClientId;
        /** Un prescripteur precis, ou null. Filtre non demande, mais reclame des le deuxieme mois d'usage. */
        public final String medecinId;
        public final LocalDate debut;
        public final LocalDate fin;
        /**
         * Les ordonnances annulees sont MASQUEES par defaut : elles restent consultables en les demandant, jamais
         * effacees, mais elles n'ont pas a polluer la lecture courante de l'historique.
         */
        public final boolean inclureAnnulees;

        public Criteres(String recherche, String clientId, String typeClientId, String medecinId, LocalDate debut,
                LocalDate fin, boolean inclureAnnulees) {
            this.recherche = recherche;
            this.clientId = clientId;
            this.typeClientId = typeClientId;
            this.medecinId = medecinId;
            this.debut = debut;
            this.fin = fin;
            this.inclureAnnulees = inclureAnnulees;
        }
    }

    private static final String COLONNES = "SELECT o.lg_ORDONNANCE_ID AS id, o.str_NUMERO AS numero,"
            + " o.dt_ORDONNANCE AS dateOrdonnance, o.str_STATUT AS statut,"
            + " o.str_MOTIF_ANNULATION AS motifAnnulation, o.str_ETABLISSEMENT AS etablissement,"
            + " o.str_OBSERVATIONS AS observations, o.lg_CLIENT_ID AS clientId,"
            + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME, ''), ' ', COALESCE(c.str_LAST_NAME, ''))) AS client,"
            + " tc.str_NAME AS typeClient, c.str_TELEPHONE AS telephone," + " o.lg_MEDECIN_ID AS medecinId,"
            + " TRIM(CONCAT(COALESCE(m.str_FIRST_NAME, ''), ' ', COALESCE(m.str_LAST_NAME, ''))) AS medecin,"
            + " (SELECT COUNT(*) FROM t_ordonnance_client_detail d"
            + "   WHERE d.lg_ORDONNANCE_ID = o.lg_ORDONNANCE_ID) AS nbProduits,"
            + " (SELECT COUNT(*) FROM t_ordonnance_client_piece p"
            + "   WHERE p.lg_ORDONNANCE_ID = o.lg_ORDONNANCE_ID) AS nbPieces," + " o.dt_CREATED AS creeLe,"
            + " TRIM(CONCAT(COALESCE(uc.str_FIRST_NAME, ''), ' ', COALESCE(uc.str_LAST_NAME, ''))) AS creePar,"
            + " o.dt_UPDATED AS modifieLe,"
            + " TRIM(CONCAT(COALESCE(uu.str_FIRST_NAME, ''), ' ', COALESCE(uu.str_LAST_NAME, ''))) AS modifiePar ";

    private static final String JOINTURES = " FROM t_ordonnance_client o"
            + " JOIN t_client c ON c.lg_CLIENT_ID = o.lg_CLIENT_ID"
            + " LEFT JOIN t_type_client tc ON tc.lg_TYPE_CLIENT_ID = c.lg_TYPE_CLIENT_ID"
            + " LEFT JOIN t_medecin m ON m.lg_MEDECIN_ID = o.lg_MEDECIN_ID"
            /*
             * L'auteur et le dernier modificateur sont JOINTS ici, et non relus ligne a ligne par le service : une
             * grille de 50 lignes aurait fait 100 lectures de plus a chaque page (le N+1 classique).
             */
            + " LEFT JOIN t_user uc ON uc.lg_USER_ID = o.lg_USER_CREATED"
            + " LEFT JOIN t_user uu ON uu.lg_USER_ID = o.lg_USER_UPDATED ";

    /*
     * « Afficher les ordonnances de la plus recente a la plus ancienne. » La date de saisie tranche entre deux
     * ordonnances du meme jour : sans elle, l'ordre de deux documents saisis le meme jour serait celui que la base
     * veut, c'est-a-dire aucun.
     */
    private static final String ORDRE = " ORDER BY o.dt_ORDONNANCE DESC, o.dt_CREATED DESC ";

    private OrdonnanceClientSql() {
    }

    static String conditions(Criteres c) {
        StringBuilder sb = new StringBuilder(" WHERE 1 = 1 ");
        if (!c.inclureAnnulees) {
            sb.append(" AND o.str_STATUT <> :annulee ");
        }
        if (StringUtils.isNotBlank(c.clientId)) {
            sb.append(" AND o.lg_CLIENT_ID = :clientId ");
        }
        if (StringUtils.isNotBlank(c.typeClientId)) {
            sb.append(" AND c.lg_TYPE_CLIENT_ID = :typeClientId ");
        }
        if (StringUtils.isNotBlank(c.medecinId)) {
            sb.append(" AND o.lg_MEDECIN_ID = :medecinId ");
        }
        if (c.debut != null) {
            sb.append(" AND o.dt_ORDONNANCE >= :debut ");
        }
        if (c.fin != null) {
            sb.append(" AND o.dt_ORDONNANCE <= :fin ");
        }
        if (StringUtils.isNotBlank(c.recherche)) {
            /*
             * On cherche dans ce que l'operateur a sous les yeux : le numero, le nom du client, celui du prescripteur.
             * Les observations sont volontairement EXCLUES de la recherche : y chercher ferait ressortir une ordonnance
             * sur un mot de commentaire medical, ce qui n'est ni attendu ni souhaitable.
             */
            sb.append(" AND (o.str_NUMERO LIKE :recherche"
                    + " OR CONCAT(COALESCE(c.str_FIRST_NAME, ''), ' ', COALESCE(c.str_LAST_NAME, '')) LIKE :recherche"
                    + " OR CONCAT(COALESCE(m.str_FIRST_NAME, ''), ' ', COALESCE(m.str_LAST_NAME, '')) LIKE :recherche"
                    + " OR o.str_ETABLISSEMENT LIKE :recherche) ");
        }
        return sb.toString();
    }

    public static String liste(Criteres c) {
        return COLONNES + JOINTURES + conditions(c) + ORDRE;
    }

    public static String compte(Criteres c) {
        return "SELECT COUNT(*) " + JOINTURES + conditions(c);
    }

    /** Les produits d'une ordonnance, dans l'ordre ou ils ont ete saisis. */
    public static String details() {
        return "SELECT d.lg_DETAIL_ID AS id, d.lg_FAMILLE_ID AS articleId, d.str_LIBELLE AS libelle,"
                + " f.int_CIP AS cip, d.int_QUANTITE AS quantite, d.str_POSOLOGIE AS posologie,"
                + " d.str_DUREE AS duree, d.int_ORDRE AS ordre" + " FROM t_ordonnance_client_detail d"
                + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " WHERE d.lg_ORDONNANCE_ID = :ordonnance ORDER BY d.int_ORDRE ASC";
    }

    /**
     * Pose les parametres des SEULES clauses presentes : en lier un de plus leverait une erreur a l'execution, en
     * oublier un aussi. Les deux requetes (liste et comptage) passent par ici, donc par les memes valeurs.
     */
    public static void lier(Query q, Criteres c) {
        if (!c.inclureAnnulees) {
            q.setParameter("annulee", dal.TOrdonnanceClient.STATUT_ANNULEE);
        }
        if (StringUtils.isNotBlank(c.clientId)) {
            q.setParameter("clientId", c.clientId);
        }
        if (StringUtils.isNotBlank(c.typeClientId)) {
            q.setParameter("typeClientId", c.typeClientId);
        }
        if (StringUtils.isNotBlank(c.medecinId)) {
            q.setParameter("medecinId", c.medecinId);
        }
        if (c.debut != null) {
            q.setParameter("debut", java.sql.Date.valueOf(c.debut));
        }
        if (c.fin != null) {
            q.setParameter("fin", java.sql.Date.valueOf(c.fin));
        }
        if (StringUtils.isNotBlank(c.recherche)) {
            q.setParameter("recherche", "%" + c.recherche.trim() + "%");
        }
    }
}
