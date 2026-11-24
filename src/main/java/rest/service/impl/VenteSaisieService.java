package rest.service.impl;

import java.math.BigInteger;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.EJB;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import util.vente.EmpreinteJournal;
import util.vente.EtatsSaisieVente;
import util.vente.EtatsSaisieVente.Droit;
import util.vente.EtatsSaisieVente.Etat;
import util.vente.EtatsSaisieVente.Geste;

/**
 * Ventes en saisie (cahier des charges du 24/11, point 2) : état de chaque vente (en cours, en attente, interrompue,
 * abandonnée, clôturée), droits vérifiés au serveur, et journal de preuve chaîné.
 * <p>
 * Chaque geste passe par {@link EtatsSaisieVente#decider} ; l'état et la ligne du journal sont écrits dans la même
 * transaction, une seule à la fois (verrou d'écriture du singleton) : la chaîne d'empreintes ne peut pas fourcher. Un
 * refus est journalisé lui aussi (qui, quoi, quand, pourquoi) : c'est la preuve que la caissière demande quand elle
 * accuse l'application.
 * <p>
 * Une vente dont l'état n'est pas encore renseigné (créée par un autre chemin, ou avant la mise à jour) garde le
 * comportement d'avant : rien ne la bloque, rien ne la cache.
 */
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.CONTAINER)
@Lock(LockType.WRITE)
@TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
public class VenteSaisieService {

    private static final Logger LOG = Logger.getLogger(VenteSaisieService.class.getName());

    /** Une saisie sans signal de son écran depuis ce délai est interrompue. */
    public static final int SIGNAL_PERDU_SECONDES = 120;

    public static final String DEBUT_SAISIE = "DEBUT_SAISIE";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private HorlogeVeille horloge;

    /** Qui fait le geste. */
    public static final class Acteur {
        public final String utilisateurId;
        public final String poste;
        public final String session;
        public final Set<Droit> droits;

        public Acteur(String utilisateurId, String poste, String session, Set<Droit> droits) {
            this.utilisateurId = utilisateurId;
            this.poste = poste;
            this.session = session;
            this.droits = droits == null ? EnumSet.noneOf(Droit.class) : droits;
        }

        static Acteur systeme() {
            return new Acteur(null, "SERVEUR", null, null);
        }
    }

    /** Réponse d'un geste. */
    public static final class Reponse {
        public final boolean admis;
        public final String etat;
        public final String motif;
        /** la vente n'a pas d'état (ancienne vente) : le comportement d'avant s'applique */
        public final boolean libre;

        Reponse(boolean admis, Etat etat, String motif, boolean libre) {
            this.admis = admis;
            this.etat = etat == null ? null : etat.name();
            this.motif = motif;
            this.libre = libre;
        }
    }

    /** Vente lue sous verrou. */
    private static final class Vente {
        String id, statut, auteur, poste, session, numero;
        Etat etat;
        boolean depot, memeJour;
        Integer nbLignes, montant;
    }

    private LocalDateTime maintenant() {
        try {
            return horloge.maintenantReel();
        } catch (RuntimeException e) {
            return LocalDateTime.now();
        }
    }

    private static Integer entier(Object o) {
        return o instanceof Number ? ((Number) o).intValue() : null;
    }

    private Vente lire(String venteId) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em
                .createNativeQuery("SELECT p.etat_saisie, p.str_STATUT, p.lg_USER_ID, p.saisie_poste,"
                        + " p.saisie_session, p.str_REF, p.lg_NATURE_VENTE_ID, DATE(p.dt_UPDATED) = ?2, p.int_PRICE,"
                        + " (SELECT COUNT(*) FROM t_preenregistrement_detail d"
                        + "   WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)"
                        + " FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = ?1 FOR UPDATE")
                .setParameter(1, venteId).setParameter(2, java.sql.Date.valueOf(maintenant().toLocalDate()))
                .getResultList();
        if (l.isEmpty()) {
            return null;
        }
        Object[] r = l.get(0);
        Vente v = new Vente();
        v.id = venteId;
        v.etat = EtatsSaisieVente.lire(r[0] == null ? null : String.valueOf(r[0]));
        v.statut = r[1] == null ? "" : String.valueOf(r[1]);
        v.auteur = r[2] == null ? null : String.valueOf(r[2]);
        v.poste = r[3] == null ? null : String.valueOf(r[3]);
        v.session = r[4] == null ? null : String.valueOf(r[4]);
        v.numero = r[5] == null ? null : String.valueOf(r[5]);
        v.depot = "3".equals(r[6] == null ? null : String.valueOf(r[6]));
        v.memeJour = r[7] != null && ((Number) r[7]).intValue() == 1;
        v.montant = entier(r[8]);
        v.nbLignes = entier(r[9]);
        if (util.Constant.STATUT_IS_CLOSED.equals(v.statut)) {
            v.etat = Etat.CLOTUREE;
        }
        return v;
    }

    private void ecrireEtat(String venteId, Etat etat, String poste, String session, LocalDateTime signal,
            String interruption) {
        em.createNativeQuery("UPDATE t_preenregistrement SET etat_saisie = ?2, saisie_poste = ?3,"
                + " saisie_session = ?4, saisie_signal = ?5, saisie_interruption = ?6"
                + " WHERE lg_PREENREGISTREMENT_ID = ?1").setParameter(1, venteId).setParameter(2, etat.name())
                .setParameter(3, poste).setParameter(4, session)
                .setParameter(5, signal == null ? null : Timestamp.valueOf(signal)).setParameter(6, interruption)
                .executeUpdate();
    }

    /** Ajoute une ligne au journal, chaînée derrière la dernière. Appelé sous le verrou d'écriture. */
    private void journaliser(Vente v, String geste, Etat avant, Etat apres, boolean admis, String motif, String cause,
            Acteur a) {
        @SuppressWarnings("unchecked")
        List<Object> derniere = em
                .createNativeQuery("SELECT empreinte FROM vente_journal_saisie ORDER BY id DESC LIMIT 1 FOR UPDATE")
                .getResultList();
        String precedente = derniere.isEmpty() ? EmpreinteJournal.ORIGINE : String.valueOf(derniere.get(0));
        EmpreinteJournal.Ligne l = new EmpreinteJournal.Ligne(0, maintenant(), v.id, v.numero, v.depot, geste,
                avant == null ? null : avant.name(), apres == null ? null : apres.name(), admis,
                motif == null ? null : (motif.length() > 255 ? motif.substring(0, 255) : motif), cause, a.utilisateurId,
                a.poste, v.nbLignes, v.montant, null, null).scellee(precedente);
        em.createNativeQuery("INSERT INTO vente_journal_saisie (cree_le, vente_id, numero, depot, geste, etat_avant,"
                + " etat_apres, admis, motif, cause, utilisateur_id, poste, nb_lignes, montant,"
                + " empreinte_precedente, empreinte) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)")
                .setParameter(1, Timestamp.valueOf(l.creeLe)).setParameter(2, l.venteId).setParameter(3, l.numero)
                .setParameter(4, l.depot ? 1 : 0).setParameter(5, l.geste).setParameter(6, l.etatAvant)
                .setParameter(7, l.etatApres).setParameter(8, l.admis ? 1 : 0).setParameter(9, l.motif)
                .setParameter(10, l.cause).setParameter(11, l.utilisateurId).setParameter(12, l.poste)
                .setParameter(13, l.nbLignes).setParameter(14, l.montant).setParameter(15, l.empreintePrecedente)
                .setParameter(16, l.empreinte).executeUpdate();
    }

    private Reponse appliquer(Vente v, Geste g, Acteur a, boolean tenue, String cause) {
        EtatsSaisieVente.Contexte c = new EtatsSaisieVente.Contexte(a.droits,
                a.utilisateurId != null && a.utilisateurId.equals(v.auteur), v.memeJour, tenue, g.systeme);
        EtatsSaisieVente.Decision d = EtatsSaisieVente.decider(v.etat, g, c);
        if (!d.admis) {
            journaliser(v, g.name(), v.etat, v.etat, false, d.motif, cause, a);
            return new Reponse(false, v.etat, d.motif, false);
        }
        LocalDateTime t = maintenant();
        switch (d.etat) {
        case EN_COURS:
            ecrireEtat(v.id, Etat.EN_COURS, a.poste, a.session, t, null);
            break;
        case INTERROMPUE:
            ecrireEtat(v.id, Etat.INTERROMPUE, v.poste, v.session, null, cause);
            break;
        default:
            ecrireEtat(v.id, d.etat, null, null, null, null);
        }
        journaliser(v, g.name(), v.etat, d.etat, true, null, cause, a);
        return new Reponse(true, d.etat, null, false);
    }

    private static boolean tenue(Vente v, Acteur a) {
        return a.session != null && a.session.equals(v.session);
    }

    private static Reponse introuvable() {
        return new Reponse(false, null, "Vente introuvable.", false);
    }

    /**
     * Signal de l'écran qui tient la vente (toutes les 30 s). Vente sans état : la saisie commence ici. Saisie
     * interrompue, même poste et même session : le signal est retrouvé.
     */
    public Reponse signal(String venteId, Acteur a) {
        Vente v = lire(venteId);
        if (v == null) {
            return introuvable();
        }
        if (v.etat == null) {
            if (!util.Constant.STATUT_IS_PROGRESS.equals(v.statut) && !util.Constant.STATUT_PENDING.equals(v.statut)) {
                return new Reponse(false, null, null, true);
            }
            ecrireEtat(v.id, Etat.EN_COURS, a.poste, a.session, maintenant(), null);
            journaliser(v, DEBUT_SAISIE, null, Etat.EN_COURS, true, null, null, a);
            return new Reponse(true, Etat.EN_COURS, null, false);
        }
        if (v.etat == Etat.EN_COURS) {
            if (!tenue(v, a)) {
                return new Reponse(false, v.etat,
                        "Cette vente est ouverte sur un autre poste (" + (v.poste == null ? "?" : v.poste) + ").",
                        false);
            }
            em.createNativeQuery("UPDATE t_preenregistrement SET saisie_signal = ?2 WHERE lg_PREENREGISTREMENT_ID = ?1")
                    .setParameter(1, v.id).setParameter(2, Timestamp.valueOf(maintenant())).executeUpdate();
            return new Reponse(true, v.etat, null, false);
        }
        if (v.etat == Etat.INTERROMPUE && tenue(v, a)) {
            return appliquer(v, Geste.SIGNAL_RETROUVE, a, true, null);
        }
        return new Reponse(false, v.etat,
                "Cette vente n'est plus en cours de saisie sur ce poste (" + v.etat.libelle.toLowerCase() + ").",
                false);
    }

    /** Mise en attente demandée par l'écran qui tient la vente. */
    public Reponse mettreEnAttente(String venteId, Acteur a) {
        Vente v = lire(venteId);
        if (v == null) {
            return introuvable();
        }
        if (v.etat == null && v.statut.equals(util.Constant.STATUT_IS_PROGRESS)) {
            /* l'écran n'a pas encore envoyé son premier signal : c'est lui qui tient la vente */
            v.etat = Etat.EN_COURS;
            return appliquer(v, Geste.METTRE_EN_ATTENTE, a, true, null);
        }
        Reponse r = appliquer(v, Geste.METTRE_EN_ATTENTE, a, tenue(v, a), null);
        if (r.admis) {
            em.createNativeQuery("UPDATE t_preenregistrement SET str_RAPPEL_PAR = NULL, dt_RAPPEL_LE = NULL"
                    + " WHERE lg_PREENREGISTREMENT_ID = ?1").setParameter(1, v.id).executeUpdate();
        }
        return r;
    }

    /**
     * Rappel depuis « Ventes en attente ». Une vente sans état (d'avant la mise à jour, ou d'un autre chemin) se
     * rappelle comme avant, droit vérifié. Une vente en cours de saisie ou interrompue ne se rappelle jamais d'ici.
     */
    public Reponse reprendreAttente(String venteId, Acteur a) {
        Vente v = lire(venteId);
        if (v == null) {
            return introuvable();
        }
        if (v.etat == null) {
            if (!a.droits.contains(Droit.REPRENDRE_ATTENTE)) {
                String m = "Droit manquant : " + Droit.REPRENDRE_ATTENTE.libelle + ".";
                journaliser(v, Geste.REPRENDRE_ATTENTE.name(), null, null, false, m, null, a);
                return new Reponse(false, null, m, false);
            }
            v.etat = Etat.EN_ATTENTE;
        }
        return appliquer(v, Geste.REPRENDRE_ATTENTE, a, tenue(v, a), null);
    }

    /** « Reprendre la vente interrompue » : jour même ; l'auteur, ou le droit de reprendre celle d'un autre. */
    public Reponse reprendreInterrompue(String venteId, Acteur a) {
        Vente v = lire(venteId);
        if (v == null) {
            return introuvable();
        }
        return appliquer(v, Geste.REPRENDRE_INTERROMPUE, a, tenue(v, a), null);
    }

    /**
     * Retour, choix « Supprimer la vente » : la vente est abandonnée. Le service des ventes la retire ensuite par le
     * chemin habituel, qui garde ses lignes dans « Produits retirés et ventes abandonnées ».
     */
    public Reponse retourSupprimer(String venteId, Acteur a) {
        Vente v = lire(venteId);
        if (v == null) {
            return introuvable();
        }
        if (v.etat == null && util.Constant.STATUT_IS_PROGRESS.equals(v.statut)) {
            v.etat = Etat.EN_COURS;
            return appliquer(v, Geste.RETOUR_SUPPRIMER, a, true, null);
        }
        return appliquer(v, Geste.RETOUR_SUPPRIMER, a, tenue(v, a), null);
    }

    /** Suppression depuis la liste « Ventes en attente » : tracée comme un abandon. */
    public Reponse supprimerAttente(String venteId, Acteur a) {
        Vente v = lire(venteId);
        if (v == null) {
            return introuvable();
        }
        if (!util.Constant.STATUT_IS_PROGRESS.equals(v.statut) && !util.Constant.STATUT_PENDING.equals(v.statut)) {
            /* devis, vente clôturée : hors du périmètre des ventes en saisie, comportement d'avant */
            return new Reponse(true, v.etat, null, true);
        }
        if (v.etat == Etat.EN_COURS || v.etat == Etat.CLOTUREE) {
            String m = v.etat == Etat.EN_COURS
                    ? "Cette vente est en cours de saisie sur un poste : elle ne peut pas être supprimée."
                    : "Cette vente est déjà clôturée.";
            journaliser(v, "SUPPRIMER_ATTENTE", v.etat, v.etat, false, m, null, a);
            return new Reponse(false, v.etat, m, false);
        }
        if (v.etat == Etat.ABANDONNEE) {
            /* abandon déjà journalisé (Retour, choix « Supprimer la vente ») : la suppression suit */
            return new Reponse(true, Etat.ABANDONNEE, null, false);
        }
        ecrireEtat(v.id, Etat.ABANDONNEE, null, null, null, null);
        journaliser(v, "SUPPRIMER_ATTENTE", v.etat, Etat.ABANDONNEE, true, null, null, a);
        return new Reponse(true, Etat.ABANDONNEE, null, false);
    }

    /**
     * Interruption signalée par l'écran lui-même (fermeture du navigateur, changement de menu, déconnexion) : seule la
     * session qui tient la vente peut la signaler.
     */
    public Reponse interrompre(String venteId, Acteur a, String cause) {
        Vente v = lire(venteId);
        if (v == null) {
            return introuvable();
        }
        if (v.etat != Etat.EN_COURS || !tenue(v, a)) {
            return new Reponse(false, v.etat, null, v.etat == null);
        }
        return appliquer(v, Geste.INTERROMPRE, a, true, cause);
    }

    /** Ventes de la veille abandonnées par le traitement de nuit : tracées avant leur retrait. */
    public void expirer(String venteId) {
        try {
            Vente v = lire(venteId);
            if (v == null || v.etat == Etat.CLOTUREE || v.etat == Etat.ABANDONNEE) {
                return;
            }
            if (v.etat == null) {
                v.etat = Etat.EN_ATTENTE;
            }
            v.memeJour = false;
            appliquer(v, Geste.EXPIRER, Acteur.systeme(), false, "CHANGEMENT_DE_JOUR");
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "expiration de la vente " + venteId, e);
        }
    }

    /** Chaque minute : saisies sans signal depuis 2 minutes (poste éteint, réseau coupé) marquées interrompues. */
    @Schedule(hour = "*", minute = "*", second = "30", persistent = false)
    public void veiller() {
        try {
            LocalDateTime limite = maintenant().minusSeconds(SIGNAL_PERDU_SECONDES);
            @SuppressWarnings("unchecked")
            List<Object> ids = em
                    .createNativeQuery("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement"
                            + " WHERE etat_saisie = 'EN_COURS' AND (saisie_signal IS NULL OR saisie_signal < ?1)"
                            + " AND str_STATUT IN ('is_Process', 'pending')")
                    .setParameter(1, Timestamp.valueOf(limite)).getResultList();
            for (Object id : ids) {
                Vente v = lire(String.valueOf(id));
                if (v != null && v.etat == Etat.EN_COURS) {
                    appliquer(v, Geste.INTERROMPRE, Acteur.systeme(), true, "SIGNAL_PERDU");
                }
            }
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "veille des ventes en saisie", e);
        }
    }

    /** Contrôle de toute la chaîne : identifiant de la première ligne cassée, ou -1 ; et nombre de lignes lues. */
    @Lock(LockType.READ)
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public long[] verifier() {
        List<EmpreinteJournal.Ligne> lignes = new ArrayList<>();
        long apres = 0;
        long rupture = -1;
        String attendue = EmpreinteJournal.ORIGINE;
        long n = 0;
        while (true) {
            lignes.clear();
            @SuppressWarnings("unchecked")
            List<Object[]> l = em.createNativeQuery("SELECT id, cree_le, vente_id, numero, depot, geste, etat_avant,"
                    + " etat_apres, admis, motif, cause, utilisateur_id, poste, nb_lignes, montant,"
                    + " empreinte_precedente, empreinte FROM vente_journal_saisie WHERE id > ?1 ORDER BY id LIMIT 5000")
                    .setParameter(1, apres).getResultList();
            if (l.isEmpty()) {
                break;
            }
            for (Object[] r : l) {
                EmpreinteJournal.Ligne x = ligne(r);
                n++;
                if (rupture < 0 && (!attendue.equals(x.empreintePrecedente)
                        || !EmpreinteJournal.calculer(x).equals(x.empreinte))) {
                    rupture = x.id;
                }
                attendue = x.empreinte;
                apres = x.id;
            }
        }
        return new long[] { rupture, n };
    }

    static EmpreinteJournal.Ligne ligne(Object[] r) {
        LocalDateTime t = r[1] instanceof Timestamp ? ((Timestamp) r[1]).toLocalDateTime()
                : r[1] instanceof LocalDateTime ? (LocalDateTime) r[1] : null;
        return new EmpreinteJournal.Ligne(((Number) r[0]).longValue(), t, s(r[2]), s(r[3]), vrai(r[4]), s(r[5]),
                s(r[6]), s(r[7]), vrai(r[8]), s(r[9]), s(r[10]), s(r[11]), s(r[12]), entier(r[13]), entier(r[14]),
                s(r[15]), s(r[16]));
    }

    private static String s(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static boolean vrai(Object o) {
        if (o instanceof Boolean) {
            return (Boolean) o;
        }
        return o instanceof Number && ((Number) o).intValue() != 0;
    }

    /** Nombre de lignes du journal (lecture, pour les tests de bilan). */
    @Lock(LockType.READ)
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public long taille() {
        Object o = em.createNativeQuery("SELECT COUNT(*) FROM vente_journal_saisie").getSingleResult();
        return o instanceof BigInteger ? ((BigInteger) o).longValue() : ((Number) o).longValue();
    }
}
