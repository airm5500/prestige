package rest.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

/**
 * Demande 67, retour de l'application Prestige Pharmacien (20/11) : periodes lues pour {@code GET v1/ca-credit} pagine.
 * <ul>
 * <li><b>Duree glissante</b> : une periode lue sert 60 s apres la DERNIERE page servie (et non apres la lecture). Tant
 * que le pharmacien fait defiler la liste, les pages viennent de la meme lecture, sans decalage.</li>
 * <li><b>Repere {@code luLe}</b> : instant (millisecondes depuis 1970) du debut de la lecture qui sert la page. Il ne
 * change pas tant que la meme lecture sert ; s'il change, l'application relit la page 0.</li>
 * <li><b>Lecture partagee</b> : si une lecture de la meme periode est en cours, une autre demande (meme une premiere
 * page) l'attend et en recoit le resultat, au lieu de relire la base.</li>
 * <li>Une lecture en echec n'est pas gardee.</li>
 * </ul>
 *
 * @param <T>
 *            type des lignes lues
 */
public final class PeriodesCaCredit<T> {

    /** Duree de vie d'une periode apres la derniere page servie. */
    public static final long DUREE = 60_000L;

    /** Resultat d'une lecture : les lignes (non modifiables) et le repere de la lecture. */
    public static final class Lecture<T> {
        public final List<T> lignes;
        public final long luLe;

        Lecture(List<T> lignes, long luLe) {
            this.lignes = lignes;
            this.luLe = luLe;
        }
    }

    private static final class Entree<T> {
        final CompletableFuture<Lecture<T>> lecture = new CompletableFuture<>();
        final long luLe;
        volatile long expire;

        Entree(long luLe) {
            this.luLe = luLe;
            this.expire = luLe + DUREE;
        }
    }

    private final Map<String, Entree<T>> periodes = new ConcurrentHashMap<>();
    private final LongSupplier horloge;

    public PeriodesCaCredit(LongSupplier horloge) {
        this.horloge = horloge;
    }

    /**
     * @param cle
     *            la periode ({@code dtStart|dtEnd})
     * @param relire
     *            premiere page sans filtre (ou tirer pour rafraichir) : relire la base, sauf si une lecture est deja en
     *            cours
     * @param lecteur
     *            la lecture de la base
     */
    public Lecture<T> lire(String cle, boolean relire, Supplier<List<T>> lecteur) {
        long maintenant = horloge.getAsLong();
        @SuppressWarnings("unchecked")
        Entree<T>[] creee = new Entree[1];
        Entree<T> e = periodes.compute(cle, (k, ex) -> {
            if (ex != null && !ex.lecture.isDone()) {
                return ex; // lecture en cours : partagee
            }
            if (ex != null && !relire && !ex.lecture.isCompletedExceptionally() && ex.expire > maintenant) {
                return ex;
            }
            creee[0] = new Entree<>(maintenant);
            return creee[0];
        });
        if (creee[0] != null) {
            try {
                List<T> lignes = Collections.unmodifiableList(lecteur.get());
                e.lecture.complete(new Lecture<>(lignes, e.luLe));
            } catch (RuntimeException | Error x) {
                periodes.remove(cle, e);
                e.lecture.completeExceptionally(x);
                throw x;
            }
        }
        Lecture<T> l = attendre(e);
        long servi = horloge.getAsLong();
        e.expire = Math.max(e.expire, servi + DUREE); // duree glissante
        periodes.values().removeIf(v -> v.lecture.isDone() && v.expire <= servi);
        return l;
    }

    private static <T> Lecture<T> attendre(Entree<T> e) {
        try {
            return e.lecture.get();
        } catch (InterruptedException x) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(x);
        } catch (ExecutionException x) {
            Throwable c = x.getCause();
            if (c instanceof RuntimeException) {
                throw (RuntimeException) c;
            }
            if (c instanceof Error) {
                throw (Error) c;
            }
            throw new CompletionException(c);
        }
    }
}
