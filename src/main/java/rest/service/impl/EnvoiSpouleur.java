package rest.service.impl;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Envoi d'un ticket au spouleur de Windows, avec un DELAI MAXIMAL (rapport d'exploitation du 13/11, point 1).
 * <p>
 * Le 13/11 chez appaul, l'impression d'un ticket de mouvement de caisse est restee 7 h 09 dans
 * {@code WPrinterJob._startDoc} : le fil HTTP et sa connexion a la base etaient pris, 134 alertes de blocage. Le pilote
 * de Windows ne rend jamais la main quand l'imprimante est virtuelle (« Microsoft Print to PDF » attend un nom de
 * fichier), hors ligne ou que sa file est bloquee, et rien ne peut interrompre cet appel natif.
 * </p>
 * <ul>
 * <li>l'envoi se fait dans un fil a part ; l'appelant attend au plus {@code delaiMs} puis reprend la main ;</li>
 * <li>un envoi qui depasse le delai reste « bloque » sur son imprimante tant que le spouleur ne l'a pas rendu : les
 * envois suivants vers la meme imprimante sont refuses tout de suite (sinon chaque ticket ajouterait un fil fige)
 * ;</li>
 * <li>au-dela de {@link #BLOQUES_MAX} envois figes, toutes imprimantes confondues, plus rien n'est envoye ;</li>
 * <li>une imprimante virtuelle (PDF, XPS, OneNote, fax) est refusee avant l'envoi : elle ne peut pas sortir un ticket
 * et fige l'appel.</li>
 * </ul>
 */
public final class EnvoiSpouleur {

    private static final Logger LOG = Logger.getLogger(EnvoiSpouleur.class.getName());

    /** Delai d'un envoi : un ticket part en moins d'une seconde quand l'imprimante est prete. */
    public static final long DELAI_MS = 20_000L;

    /** Envois figes au-dela desquels plus rien n'est envoye (chacun tient un fil jusqu'au retour du pilote). */
    public static final int BLOQUES_MAX = 4;

    private static final String[] VIRTUELLES = { "pdf", "xps", "onenote", "fax", "send to", "envoyer vers" };

    private static final EnvoiSpouleur INSTANCE = new EnvoiSpouleur();

    public static EnvoiSpouleur instance() {
        return INSTANCE;
    }

    /** Issue d'un envoi. */
    public enum Issue {
        ENVOYE, DELAI_DEPASSE, IMPRIMANTE_BLOQUEE, IMPRIMANTE_VIRTUELLE, ECHEC
    }

    /** Resultat d'un envoi : l'issue, un message pour la caissiere (vide si envoye), la duree d'attente. */
    public static final class Resultat {
        private final Issue issue;
        private final String message;
        private final long dureeMs;

        Resultat(Issue issue, String message, long dureeMs) {
            this.issue = issue;
            this.message = message == null ? "" : message;
            this.dureeMs = dureeMs;
        }

        public Issue getIssue() {
            return issue;
        }

        public boolean isEnvoye() {
            return issue == Issue.ENVOYE;
        }

        public String getMessage() {
            return message;
        }

        public long getDureeMs() {
            return dureeMs;
        }

        @Override
        public String toString() {
            return issue + " (" + dureeMs + " ms) " + message;
        }
    }

    private static final int EN_COURS = 0;
    private static final int RENDU = 1;
    private static final int DEPASSE = 2;

    private final ExecutorService fils;
    private final Map<String, AtomicInteger> bloquesParImprimante = new ConcurrentHashMap<>();
    private final AtomicInteger bloques = new AtomicInteger();
    private final AtomicLong numero = new AtomicLong();

    EnvoiSpouleur() {
        fils = Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "envoi-spouleur-" + numero.incrementAndGet());
            t.setDaemon(true);
            return t;
        });
    }

    /** Imprimante qui ne peut pas sortir un ticket : PDF, XPS, OneNote, fax. */
    public static boolean virtuelle(String nom) {
        if (nom == null) {
            return false;
        }
        String n = nom.toLowerCase(Locale.ROOT);
        for (String v : VIRTUELLES) {
            if (n.contains(v)) {
                return true;
            }
        }
        return false;
    }

    /** Nombre d'envois figes en ce moment (toutes imprimantes). */
    public int getBloques() {
        return bloques.get();
    }

    /** Nombre d'envois figes en ce moment sur cette imprimante. */
    public int getBloques(String imprimante) {
        AtomicInteger n = bloquesParImprimante.get(cle(imprimante));
        return n == null ? 0 : n.get();
    }

    /**
     * Envoie {@code envoi} (l'appel au pilote) et attend au plus {@code delaiMs}. Ne leve jamais d'exception : l'issue
     * dit ce qui s'est passe.
     */
    public Resultat envoyer(String imprimante, Callable<?> envoi, long delaiMs) {
        long t0 = System.nanoTime();
        String nom = imprimante == null ? "" : imprimante;
        if (virtuelle(nom)) {
            /* imprimante qui attend un nom de fichier : l'appel au pilote ne rendrait jamais la main (13/11, 7 h 09) */
            return new Resultat(Issue.IMPRIMANTE_VIRTUELLE, "Pas d'imprimante à tickets : l'imprimante par défaut est"
                    + " « " + nom + " », une imprimante virtuelle qui ne peut pas sortir de ticket.", ms(t0));
        }
        String cle = cle(nom);
        if (getBloques(nom) > 0) {
            return new Resultat(Issue.IMPRIMANTE_BLOQUEE, "L'imprimante « " + nom + " » ne répond plus : un ticket"
                    + " précédent est encore dans sa file d'attente. Vérifiez qu'elle est allumée, en ligne et que"
                    + " sa file n'est pas bloquée.", ms(t0));
        }
        if (bloques.get() >= BLOQUES_MAX) {
            return new Resultat(Issue.IMPRIMANTE_BLOQUEE, BLOQUES_MAX + " tickets attendent déjà le spouleur de"
                    + " Windows : plus rien n'est envoyé tant qu'il n'a pas répondu.", ms(t0));
        }
        /* 0 : en cours ; 1 : rendu ; 2 : delai depasse (le fil, a son retour, libere l'imprimante) */
        AtomicInteger etat = new AtomicInteger(EN_COURS);
        Future<?> f;
        try {
            f = fils.submit(() -> {
                try {
                    return envoi.call();
                } finally {
                    if (etat.getAndSet(RENDU) == DEPASSE) {
                        liberer(cle);
                        LOG.log(Level.WARNING, "Envoi au spouleur rendu en retard par l''imprimante {0}", nom);
                    }
                }
            });
        } catch (RuntimeException e) {
            return new Resultat(Issue.ECHEC, "Le ticket n'a pas pu être envoyé : " + e, ms(t0));
        }
        try {
            f.get(Math.max(0L, delaiMs), TimeUnit.MILLISECONDS);
            return new Resultat(Issue.ENVOYE, "", ms(t0));
        } catch (TimeoutException e) {
            /* l'appel natif ne s'interrompt pas : le fil reste pris jusqu'au retour du pilote, et il est compte */
            bloquesParImprimante.computeIfAbsent(cle, k -> new AtomicInteger()).incrementAndGet();
            bloques.incrementAndGet();
            if (!etat.compareAndSet(EN_COURS, DEPASSE)) {
                /* rendu entre la fin du delai et le comptage */
                liberer(cle);
                return new Resultat(Issue.ENVOYE, "", ms(t0));
            }
            return new Resultat(Issue.DELAI_DEPASSE, "L'imprimante « " + nom + " » n'a pas répondu en "
                    + (delaiMs / 1000) + " s : le ticket n'est pas imprimé. Vérifiez qu'elle est allumée et en ligne.",
                    ms(t0));
        } catch (ExecutionException e) {
            Throwable c = e.getCause() == null ? e : e.getCause();
            LOG.log(Level.WARNING, "Envoi au spouleur en echec", c);
            return new Resultat(Issue.ECHEC, "Le ticket n'a pas pu être imprimé : " + c.getMessage(), ms(t0));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Resultat(Issue.ECHEC, "Impression interrompue", ms(t0));
        }
    }

    private void liberer(String cle) {
        AtomicInteger n = bloquesParImprimante.get(cle);
        if (n != null && n.get() > 0) {
            n.decrementAndGet();
        }
        if (bloques.get() > 0) {
            bloques.decrementAndGet();
        }
    }

    private static String cle(String imprimante) {
        return imprimante == null ? "" : imprimante.trim().toLowerCase(Locale.ROOT);
    }

    private static long ms(long t0) {
        return (System.nanoTime() - t0) / 1_000_000L;
    }
}
