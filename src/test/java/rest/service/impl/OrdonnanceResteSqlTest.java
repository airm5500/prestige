package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Reste a delivrer (retour du 30/09) : une ligne due a un service RENSEIGNE et inferieur a la prescription ; le filtre
 * de l'historique n'existe que s'il est demande, et les appels existants ne changent pas.
 */
public class OrdonnanceResteSqlTest {

    @Test
    public void uneLigneARenseignerNEstPasUnReste() {
        assertTrue(OrdonnanceClientSql.LIGNE_EN_RESTE.contains("int_QTE_SERVIE IS NOT NULL"));
        assertTrue(OrdonnanceClientSql.LIGNE_EN_RESTE.contains("int_QTE_SERVIE < d.int_QUANTITE"));
    }

    @Test
    public void filtreSeulementSiDemande() {
        OrdonnanceClientSql.Criteres avant = new OrdonnanceClientSql.Criteres(null, null, null, null, null, null,
                false);
        assertFalse(avant.resteSeulement, "l'ancien constructeur ne filtre pas");
        assertFalse(OrdonnanceClientSql.conditions(avant).contains("EXISTS"));
        OrdonnanceClientSql.Criteres reste = new OrdonnanceClientSql.Criteres(null, null, null, null, null, null, true,
                true);
        String w = OrdonnanceClientSql.conditions(reste);
        assertTrue(w.contains("EXISTS") && w.contains(OrdonnanceClientSql.LIGNE_EN_RESTE));
        assertTrue(w.contains("o.str_STATUT <> 'annulee'"), "une annulee n'a plus rien a delivrer, meme affichee");
        /* Liste et comptage partagent la meme clause. */
        assertTrue(OrdonnanceClientSql.compte(reste).contains("EXISTS"));
        assertTrue(OrdonnanceClientSql.liste(reste).contains("AS qteReste"));
    }

    @Test
    public void resteDUnClientSansEtAvecExclusion() {
        assertFalse(OrdonnanceClientSql.resteClient(false).contains(":sauf"));
        assertTrue(OrdonnanceClientSql.resteClient(true).contains("o.lg_ORDONNANCE_ID <> :sauf"));
        assertTrue(OrdonnanceClientSql.resteClient(false).contains("ORDER BY o.dt_ORDONNANCE ASC"),
                "la plus ancienne d'abord");
    }
}
