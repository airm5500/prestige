package rest.service.dto;

/**
 * Resume des lignes d'un bon de livraison, calcule en base pour la liste de l'etat de controle des achats (demande du
 * 14/11).
 *
 * <p>
 * La liste chargeait chaque ligne du bon et son produit pour n'en tirer que quatre valeurs : le statut du controle, le
 * montant de l'avoir, la presence d'un ecart et le nombre de lignes. Elles sont desormais agregees par une seule
 * requete, avec les memes regles que celles de {@code EtatControlBonBuilder} et de {@code FiltresControleAchat} :
 * <ul>
 * <li>controle commence : une ligne cochee ou comptee (quantite controlee &gt; 0) ;</li>
 * <li>controle termine : toutes les lignes cochees ou comptees au moins a la quantite recue ;</li>
 * <li>avoir : somme des quantites en avoir x prix d'achat, sur les lignes qui ont une quantite en avoir ;</li>
 * <li>ecart : une ligne comptee (&gt; 0) dont le compte differe de la quantite recue.</li>
 * </ul>
 */
public final class ResumeLignes {

    /** Bon sans aucune ligne : a faire, sans avoir ni ecart. */
    public static final ResumeLignes VIDE = new ResumeLignes(0, false, false, 0, false);

    private final int nombre;
    private final boolean commence;
    private final boolean termine;
    private final int avoir;
    private final boolean ecart;

    public ResumeLignes(int nombre, boolean commence, boolean termine, int avoir, boolean ecart) {
        this.nombre = nombre;
        this.commence = commence;
        this.termine = termine;
        this.avoir = avoir;
        this.ecart = ecart;
    }

    /** Meme vocabulaire que la liste complete : NON_TRAITE, EN_COURS ou TERMINE. */
    public String statut() {
        if (nombre == 0 || !commence) {
            return "NON_TRAITE";
        }
        return termine ? "TERMINE" : "EN_COURS";
    }

    public int getNombre() {
        return nombre;
    }

    public boolean isCommence() {
        return commence;
    }

    public boolean isTermine() {
        return termine;
    }

    public int getAvoir() {
        return avoir;
    }

    public boolean isEcart() {
        return ecart;
    }
}
