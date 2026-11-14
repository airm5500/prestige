package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TFamille;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.TypedQuery;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Rapport d'exploitation du 13/11, point 2 : la peremption proche, information facultative de l'ecran de vente, ne
 * bloque plus la caisse quand la base coupe la connexion (caisse 4 le 13/11 a 18:37 : « Communications link failure »
 * apres 42 s, l'ajout de l'article echouait).
 * <p>
 * Test de COHERENCE sur 1 000 cas tires au hasard (graine fixe) : identifiant vide ou blanc, lecture du produit en
 * echec, produit absent, lecture des lots en echec, lot en stock, aucun lot mais date sur la fiche, aucune date. Regles
 * : jamais d'exception ; toujours trois chaines ; en cas d'echec ou d'absence, trois chaines vides ; sinon la date au
 * format jj/mm/aaaa, le lot et sa quantite tels que la base les rend.
 * </p>
 */
class PeremptionProcheCoherenceTest {

    private enum Cas {
        ID_VIDE, LECTURE_PRODUIT_EN_ECHEC, PRODUIT_ABSENT, LECTURE_LOTS_EN_ECHEC, LOT_EN_STOCK, DATE_SUR_FICHE,
        AUCUNE_DATE
    }

    private static final String[] ERREURS = { "Communications link failure",
            "No operations allowed after connection closed", "Connection reset", "Lock wait timeout exceeded" };

    /** gestionnaire d'entites d'essai : le produit, les lots, ou une coupure de connexion, selon le cas */
    private static EntityManager em(Cas cas, TFamille famille, Object[] lot, String erreur) {
        InvocationHandler requete = new InvocationHandler() {
            @Override
            public Object invoke(Object proxy, java.lang.reflect.Method m, Object[] a) {
                switch (m.getName()) {
                case "getResultList":
                    if (cas == Cas.LECTURE_LOTS_EN_ECHEC) {
                        throw new PersistenceException(erreur);
                    }
                    return lot == null ? Collections.emptyList() : Collections.singletonList(lot);
                case "setParameter":
                case "setMaxResults":
                    return proxy;
                default:
                    throw new UnsupportedOperationException(m.getName());
                }
            }
        };
        TypedQuery<?> q = (TypedQuery<?>) Proxy.newProxyInstance(TypedQuery.class.getClassLoader(),
                new Class<?>[] { TypedQuery.class }, requete);
        return (EntityManager) Proxy.newProxyInstance(EntityManager.class.getClassLoader(),
                new Class<?>[] { EntityManager.class }, (proxy, m, a) -> {
                    switch (m.getName()) {
                    case "find":
                        if (cas == Cas.LECTURE_PRODUIT_EN_ECHEC) {
                            throw new PersistenceException(erreur);
                        }
                        return cas == Cas.PRODUIT_ABSENT ? null : famille;
                    case "createQuery":
                        return q;
                    default:
                        throw new UnsupportedOperationException(m.getName());
                    }
                });
    }

    private static SearchProduitServcieImpl service(EntityManager em) throws Exception {
        SearchProduitServcieImpl s = new SearchProduitServcieImpl();
        Field f = SearchProduitServcieImpl.class.getDeclaredField("em");
        f.setAccessible(true);
        f.set(s, em);
        return s;
    }

    @Test
    @DisplayName("1 000 cas : jamais d'exception, toujours trois chaines, vides en cas de coupure")
    void millCas() throws Exception {
        Random r = new Random(20261113L);
        SimpleDateFormat jj = new SimpleDateFormat("dd/MM/yyyy");
        Map<Cas, Integer> vus = new EnumMap<>(Cas.class);
        String[] vides = { "", "", "" };
        for (int i = 0; i < 1000; i++) {
            Cas cas = Cas.values()[r.nextInt(Cas.values().length)];
            vus.merge(cas, 1, Integer::sum);
            String erreur = ERREURS[r.nextInt(ERREURS.length)];
            String id = cas == Cas.ID_VIDE ? new String[] { null, "", "   ", "\t" }[r.nextInt(4)]
                    : (r.nextBoolean() ? " " : "") + "P" + r.nextInt(1_000_000) + (r.nextBoolean() ? " " : "");
            TFamille famille = new TFamille();
            famille.setLgFAMILLEID(id == null ? null : id.trim());
            Date dateFiche = new Date(1_700_000_000_000L + r.nextInt(2000) * 86_400_000L);
            if (cas == Cas.DATE_SUR_FICHE) {
                famille.setDtPEREMPTION(dateFiche);
            }
            Date dateLot = new Date(1_700_000_000_000L + r.nextInt(2000) * 86_400_000L);
            Object numLot = r.nextInt(5) == 0 ? null : "L" + r.nextInt(100_000);
            Object quantite = r.nextInt(5) == 0 ? null : 1 + r.nextInt(500);
            Object[] lot = cas == Cas.LOT_EN_STOCK ? new Object[] { dateLot, numLot, quantite } : null;

            Object[] rendu = service(em(cas, famille, lot, erreur)).peremptionProche(id);

            String quoi = "cas " + i + " " + cas + " id=" + id;
            assertNotNull(rendu, quoi);
            assertEquals(3, rendu.length, quoi);
            for (Object o : rendu) {
                assertTrue(o instanceof String, quoi + " : " + o);
            }
            switch (cas) {
            case LOT_EN_STOCK:
                assertArrayEquals(new Object[] { jj.format(dateLot), numLot == null ? "" : String.valueOf(numLot),
                        quantite == null ? "" : String.valueOf(quantite) }, rendu, quoi);
                break;
            case DATE_SUR_FICHE:
                assertArrayEquals(new Object[] { jj.format(dateFiche), "", "" }, rendu, quoi);
                break;
            default:
                assertArrayEquals(vides, rendu, quoi);
            }
        }
        for (Cas c : Cas.values()) {
            assertTrue(vus.getOrDefault(c, 0) > 50, "cas peu tire : " + c + " " + vus);
        }
    }

    @Test
    @DisplayName("Coupure de la base a la lecture du produit : peremption vide, pas d'erreur technique")
    void coupureALaLectureDuProduit() throws Exception {
        List<String> erreurs = java.util.Arrays.asList(ERREURS);
        for (String e : erreurs) {
            assertArrayEquals(new Object[] { "", "", "" },
                    service(em(Cas.LECTURE_PRODUIT_EN_ECHEC, new TFamille(), null, e)).peremptionProche("P1"), e);
        }
    }
}
