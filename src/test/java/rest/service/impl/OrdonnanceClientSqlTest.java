package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import rest.service.impl.OrdonnanceClientSql.Criteres;

/**
 * Requetes de l'historique des ordonnances clients (evolution 6, point 2).
 *
 * <p>
 * L'enjeu verifie ici : la liste et le COMPTAGE portent sur exactement les memes lignes, et chaque filtre demande
 * produit reellement sa clause. Un total qui ne compte pas les memes lignes que la grille est un defaut qu'on ne
 * decouvre qu'a la pagination, donc tard ; une clause oubliee dans une edition ferait imprimer plus de lignes que
 * celles affichees a l'ecran.
 */
public class OrdonnanceClientSqlTest {

    private static Criteres tous() {
        return new Criteres(null, null, null, null, null, null, false);
    }

    @Test
    public void laListeEtLeComptagePortentSurLesMemesLignes() {
        Criteres c = new Criteres("ZZ", "CL-1", "6", "MED-1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 9, 30),
                false);
        String conditions = OrdonnanceClientSql.conditions(c);
        assertTrue(OrdonnanceClientSql.liste(c).contains(conditions));
        assertTrue(OrdonnanceClientSql.compte(c).contains(conditions));
    }

    @Test
    public void lHistoriqueVaDuPlusRecentAuPlusAncien() {
        String sql = OrdonnanceClientSql.liste(tous());
        assertTrue(sql.contains("ORDER BY o.dt_ORDONNANCE DESC"), sql);
        // La date de saisie tranche entre deux ordonnances du meme jour
        assertTrue(sql.contains("o.dt_CREATED DESC"), sql);
    }

    @Test
    public void lesAnnuleesSontMasqueesParDefautEtMontreesSurDemande() {
        assertTrue(OrdonnanceClientSql.conditions(tous()).contains("o.str_STATUT <> :annulee"));
        Criteres avec = new Criteres(null, null, null, null, null, null, true);
        assertFalse(OrdonnanceClientSql.conditions(avec).contains("str_STATUT"));
    }

    @Test
    public void chaqueFiltreDemandeProduitSaClause() {
        assertTrue(OrdonnanceClientSql.conditions(new Criteres(null, "CL-1", null, null, null, null, false))
                .contains("o.lg_CLIENT_ID = :clientId"));
        assertTrue(OrdonnanceClientSql.conditions(new Criteres(null, null, "6", null, null, null, false))
                .contains("c.lg_TYPE_CLIENT_ID = :typeClientId"));
        assertTrue(OrdonnanceClientSql.conditions(new Criteres(null, null, null, "MED", null, null, false))
                .contains("o.lg_MEDECIN_ID = :medecinId"));
        assertTrue(OrdonnanceClientSql
                .conditions(new Criteres(null, null, null, null, LocalDate.of(2026, 1, 1), null, false))
                .contains("o.dt_ORDONNANCE >= :debut"));
        assertTrue(OrdonnanceClientSql
                .conditions(new Criteres(null, null, null, null, null, LocalDate.of(2026, 1, 1), false))
                .contains("o.dt_ORDONNANCE <= :fin"));
    }

    @Test
    public void aucunFiltreNeLaissePasserDeClauseInutile() {
        // Un parametre lie sans clause correspondante leverait une erreur a l'execution
        String conditions = OrdonnanceClientSql.conditions(new Criteres("", "", "", "", null, null, true));
        assertEquals(" WHERE 1 = 1 ", conditions);
    }

    @Test
    public void laRechercheCouvreLeNumeroLeClientLePrescripteurEtLEtablissement() {
        String conditions = OrdonnanceClientSql.conditions(new Criteres("ZZ", null, null, null, null, null, false));
        assertTrue(conditions.contains("o.str_NUMERO LIKE :recherche"), conditions);
        assertTrue(conditions.contains("c.str_LAST_NAME"), conditions);
        assertTrue(conditions.contains("m.str_LAST_NAME"), conditions);
        assertTrue(conditions.contains("o.str_ETABLISSEMENT LIKE :recherche"), conditions);
    }

    @Test
    public void laRechercheNePorteJamaisSurLesObservations() {
        /*
         * Volontaire : chercher dans les observations ferait ressortir une ordonnance sur un mot de commentaire
         * medical, ce qui n'est ni attendu ni souhaitable sur des donnees de sante.
         */
        String conditions = OrdonnanceClientSql
                .conditions(new Criteres("diabete", null, null, null, null, null, false));
        assertFalse(conditions.contains("str_OBSERVATIONS"), conditions);
    }

    @Test
    public void lAuteurEtLeModificateurSontJointsEtNonRelusLigneALigne() {
        // Sans cette jointure, une grille de 50 lignes faisait 100 lectures de plus a chaque page (N+1)
        String sql = OrdonnanceClientSql.liste(tous());
        assertTrue(sql.contains("LEFT JOIN t_user uc"), sql);
        assertTrue(sql.contains("LEFT JOIN t_user uu"), sql);
    }

    @Test
    public void laListeRendLeNombreDeProduitsEtDePieces() {
        String sql = OrdonnanceClientSql.liste(tous());
        assertTrue(sql.contains("AS nbProduits"), sql);
        assertTrue(sql.contains("AS nbPieces"), sql);
    }

    @Test
    public void lesProduitsSontRenvoyesDansLOrdreDeSaisie() {
        String sql = OrdonnanceClientSql.details();
        assertTrue(sql.contains("ORDER BY d.int_ORDRE ASC"), sql);
        // Le CIP vient du referentiel quand l'article y est encore, le libelle du document dans tous les cas
        assertTrue(sql.contains("LEFT JOIN t_famille"), sql);
        assertTrue(sql.contains("d.str_LIBELLE AS libelle"), sql);
    }

    @Test
    public void leClientEstJointFermementEtLePrescripteurLachement() {
        /*
         * Une ordonnance a TOUJOURS un client (jointure interne) mais pas toujours un prescripteur : une jointure
         * interne sur le medecin ferait disparaitre de l'historique toutes les ordonnances au tampon illisible.
         */
        String sql = OrdonnanceClientSql.liste(tous());
        assertTrue(sql.contains("JOIN t_client c ON"), sql);
        assertTrue(sql.contains("LEFT JOIN t_medecin m ON"), sql);
    }
}
