package util;

import dal.dataManager;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;

/**
 * Faille de droits du 31/10 : les profils super administrateur, administrateur et pharmacien etaient reconnus a leur
 * NOM ; un vendeur qui renommait son profil devenait super administrateur. Ils sont maintenant reconnus a un droit
 * attache au profil (P_PROFIL_*, type SYSTEME : seul le super administrateur peut l'accorder). Le nom n'a plus aucun
 * effet sur les droits.
 *
 * <p>
 * Les profils marques sont relus en base au plus toutes les 30 s (et aussitot apres une modification des droits d'un
 * profil, par {@link #oublier()}). Une base illisible garde la derniere liste connue ; avant toute lecture reussie,
 * aucun profil n'est special (seul le compte systeme « 00 » reste super administrateur).
 */
public final class RolesSpeciaux {

    public static final String P_SUPER_ADMIN = "P_PROFIL_SUPER_ADMIN";
    public static final String P_ADMIN = "P_PROFIL_ADMIN";
    public static final String P_PHARMACIEN = "P_PROFIL_PHARMACIEN";
    public static final Set<String> MARQUES = Set.of(P_SUPER_ADMIN, P_ADMIN, P_PHARMACIEN);
    /** Identifiant qui n'existe pas : une liste vide ne s'ecrit pas dans « NOT IN ». */
    public static final String AUCUN = "-";

    private static final Logger LOG = Logger.getLogger(RolesSpeciaux.class.getName());
    private static final long DUREE_MS = 30_000L;
    private static volatile Map<String, Set<String>> rolesParMarque = Collections.emptyMap();
    private static volatile long luLe;

    private RolesSpeciaux() {
    }

    /** Vrai si le profil porte ce droit de profil special. */
    public static boolean a(String roleId, String marque) {
        return roleId != null && roles(marque).contains(roleId);
    }

    /** Profils portant ce droit ; jamais vide (contient {@link #AUCUN}), pour les clauses « IN » / « NOT IN ». */
    public static Set<String> roles(String marque) {
        Set<String> s = carte().get(marque);
        return s == null || s.isEmpty() ? Set.of(AUCUN) : s;
    }

    /** Profils portant l'un de ces droits ; jamais vide. */
    public static Set<String> roles(String... marques) {
        Set<String> s = new HashSet<>();
        for (String m : marques) {
            s.addAll(roles(m));
        }
        return s;
    }

    /** A appeler apres toute modification des droits d'un profil. */
    public static void oublier() {
        luLe = 0;
    }

    private static Map<String, Set<String>> carte() {
        if (System.currentTimeMillis() - luLe > DUREE_MS) {
            charger();
        }
        return rolesParMarque;
    }

    @SuppressWarnings("unchecked")
    private static synchronized void charger() {
        if (System.currentTimeMillis() - luLe <= DUREE_MS) {
            return;
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            List<Object[]> lignes = em
                    .createNativeQuery("SELECT p.str_NAME, rp.lg_ROLE_ID FROM t_role_privelege rp"
                            + " JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
                            + " WHERE p.str_STATUT = 'enable' AND p.str_NAME IN (?1, ?2, ?3)")
                    .setParameter(1, P_SUPER_ADMIN).setParameter(2, P_ADMIN).setParameter(3, P_PHARMACIEN)
                    .getResultList();
            Map<String, Set<String>> m = new HashMap<>();
            for (Object[] l : lignes) {
                m.computeIfAbsent(String.valueOf(l[0]), k -> new HashSet<>()).add(String.valueOf(l[1]));
            }
            m.replaceAll((k, v) -> Collections.unmodifiableSet(v));
            rolesParMarque = Collections.unmodifiableMap(m);
            luLe = System.currentTimeMillis();
        } catch (RuntimeException e) {
            LOG.log(Level.SEVERE, "Lecture des profils speciaux impossible : derniere liste connue conservee", e);
            luLe = System.currentTimeMillis() - DUREE_MS + 5_000L; // nouvel essai dans 5 s
        } finally {
            try {
                odm.closeEntityManager();
            } catch (RuntimeException ignore) {
            }
        }
    }
}
