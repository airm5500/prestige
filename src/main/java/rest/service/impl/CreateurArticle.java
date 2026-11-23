package rest.service.impl;

import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.EntityManager;

/**
 * Auteur de la creation d'un article (retours du 23/11).
 *
 * La creation d'un article ecrit deux traces : une notification (entity_ref = id de l'article) et une ligne du journal
 * t_event_log (« Création du produit cip [CIP NOM par PRENOM NOM ] », avec l'utilisateur). Les notifications ne sont
 * pas gardees longtemps (sur la copie d'appaul, rien avant le 12/11/2026) : l'auteur se lisait seulement la, et il
 * manquait pour 32 des 50 articles crees sur 30 jours. Le journal, lui, est garde (purge seulement si
 * KEY_JOURNAL_CONSERVATION_MOIS est regle).
 *
 * On lit donc la notification, sinon la ligne du journal ecrite au moment de la creation (de 5 s avant a 60 s apres la
 * date de creation de l'article) pour le meme CIP, ou a defaut pour le meme nom : le CIP d'un article peut avoir ete
 * change apres sa creation (cas du FINSTAM d'appaul, cree en 3000001239734, devenu 1239734). Le journal est lu en une
 * seule requete sur la plage de dates, l'appariement se fait ici : une sous-requete par article parcourait l'index des
 * dates en entier (3 a 44 s pour 50 articles sur appaul).
 */
public final class CreateurArticle {

    /** Ecart tolere entre la date de creation de l'article et celle de sa ligne de journal (ecrite juste apres). */
    static final long AVANT_MS = 5_000L;
    static final long APRES_MS = 60_000L;

    private static final String NOM = "NULLIF(TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))), '')";

    private CreateurArticle() {
    }

    /** Article dont on cherche l'auteur. */
    public static final class Fiche {
        final String id;
        final String cip;
        final String nom;
        final Date creeLe;

        public Fiche(String id, String cip, String nom, Date creeLe) {
            this.id = id;
            this.cip = cip;
            this.nom = nom;
            this.creeLe = creeLe;
        }
    }

    /** Ligne de creation du journal. */
    static final class Creation {
        final Date le;
        final String description;
        final String auteur;

        Creation(Date le, String description, String auteur) {
            this.le = le;
            this.description = description;
            this.auteur = auteur;
        }
    }

    /**
     * Vrai si la ligne de journal (description, date) est celle de la creation de l'article (cip, nom, date) : ecrite
     * dans la fenetre [creation - 5 s, creation + 60 s] et portant « cip [CIP » suivi d'une espace, ou « NOM par ».
     */
    static boolean correspond(String description, Date le, String cip, String nom, Date creeLe) {
        if (description == null || le == null || creeLe == null) {
            return false;
        }
        long ecart = le.getTime() - creeLe.getTime();
        if (ecart < -AVANT_MS || ecart > APRES_MS) {
            return false;
        }
        int i = description.indexOf("cip [");
        if (i < 0) {
            return false;
        }
        String reste = description.substring(i + 5);
        if (cip != null && !cip.trim().isEmpty() && reste.startsWith(cip.trim() + " ")) {
            return true;
        }
        return nom != null && !nom.trim().isEmpty() && reste.contains(" " + nom.trim() + " par ");
    }

    /** Auteur pris dans les creations du journal : la premiere ligne qui correspond, en priorite par le CIP. */
    static String parJournal(Fiche f, List<Creation> creations) {
        Creation parNom = null;
        for (Creation c : creations) {
            if (correspond(c.description, c.le, f.cip, null, f.creeLe)) {
                return c.auteur;
            }
            if (parNom == null && correspond(c.description, c.le, null, f.nom, f.creeLe)) {
                parNom = c;
            }
        }
        return parNom == null ? null : parNom.auteur;
    }

    /** Auteur de chaque article (id → nom ; absent si introuvable). */
    @SuppressWarnings("unchecked")
    public static Map<String, String> auteurs(EntityManager em, Collection<Fiche> fiches) {
        Map<String, String> r = new HashMap<>();
        if (fiches.isEmpty()) {
            return r;
        }
        List<String> ids = new ArrayList<>();
        for (Fiche f : fiches) {
            ids.add(f.id);
        }
        for (Object o : em.createNativeQuery("SELECT nt.entity_ref, " + NOM + " FROM notification nt"
                + " JOIN t_user u ON u.lg_USER_ID = nt.user_id WHERE nt.type_notification IN ("
                + TypeNotification.AJOUT_DE_NOUVEAU_PRODUIT.ordinal() + ", "
                + TypeNotification.AJOUT_DE_DETAIL_PRODUIT.ordinal() + ") AND nt.entity_ref IN ?1"
                + " ORDER BY nt.created_at").setParameter(1, ids).getResultList()) {
            Object[] l = (Object[]) o;
            if (l[1] != null) {
                r.putIfAbsent(String.valueOf(l[0]), String.valueOf(l[1]));
            }
        }
        Date min = null;
        Date max = null;
        for (Fiche f : fiches) {
            if (!r.containsKey(f.id) && f.creeLe != null) {
                min = min == null || f.creeLe.before(min) ? f.creeLe : min;
                max = max == null || f.creeLe.after(max) ? f.creeLe : max;
            }
        }
        if (min == null) {
            return r;
        }
        List<Creation> creations = new ArrayList<>();
        for (Object o : em
                .createNativeQuery("SELECT e.dt_CREATED, e.str_DESCRIPTION, " + NOM + " FROM t_event_log e"
                        + " JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID WHERE e.dt_CREATED BETWEEN ?1 AND ?2"
                        + " AND e.typeLog IN (" + TypeLog.AJOUT_DE_NOUVEAU_PRODUIT.ordinal() + ", "
                        + TypeLog.AJOUT_DE_DETAIL_PRODUIT.ordinal() + ") AND e.str_TABLE_CONCERN = 'dal.TFamille'"
                        + " ORDER BY e.dt_CREATED")
                .setParameter(1, new Timestamp(min.getTime() - AVANT_MS))
                .setParameter(2, new Timestamp(max.getTime() + APRES_MS)).getResultList()) {
            Object[] l = (Object[]) o;
            if (l[2] != null) {
                creations.add(new Creation((Date) l[0], (String) l[1], String.valueOf(l[2])));
            }
        }
        for (Fiche f : fiches) {
            if (!r.containsKey(f.id)) {
                String a = parJournal(f, creations);
                if (a != null) {
                    r.put(f.id, a);
                }
            }
        }
        return r;
    }
}
