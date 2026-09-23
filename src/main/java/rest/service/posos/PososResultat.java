package rest.service.posos;

import java.util.ArrayList;
import java.util.List;

/** Resultat d'une analyse : une liste d'alertes, et de quoi savoir si l'analyse a pu avoir lieu. */
public class PososResultat {

    private boolean disponible;
    private String message;
    private List<Alerte> alertes = new ArrayList<>();
    /** Produits que Posos n'a pas reconnus : l'officine doit savoir ce qui n'a PAS ete analyse. */
    private List<String> produitsNonReconnus = new ArrayList<>();
    /** Resultat du MODE DEMONSTRATION (regles preparees), jamais une vraie analyse Posos : l'ecran le dit. */
    private boolean demonstration;
    private String avertissement;

    public static PososResultat indisponible(String message) {
        PososResultat r = new PososResultat();
        r.disponible = false;
        r.message = message;
        return r;
    }

    public boolean isDisponible() {
        return disponible;
    }

    public void setDisponible(boolean disponible) {
        this.disponible = disponible;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<Alerte> getAlertes() {
        return alertes;
    }

    public void setAlertes(List<Alerte> alertes) {
        this.alertes = alertes == null ? new ArrayList<>() : alertes;
    }

    public boolean isDemonstration() {
        return demonstration;
    }

    public void setDemonstration(boolean demonstration) {
        this.demonstration = demonstration;
    }

    public String getAvertissement() {
        return avertissement;
    }

    public void setAvertissement(String avertissement) {
        this.avertissement = avertissement;
    }

    public List<String> getProduitsNonReconnus() {
        return produitsNonReconnus;
    }

    public void setProduitsNonReconnus(List<String> produitsNonReconnus) {
        this.produitsNonReconnus = produitsNonReconnus == null ? new ArrayList<>() : produitsNonReconnus;
    }

    /** Nombre d'alertes du niveau le plus eleve, pour que l'ecran puisse alerter sans tout parcourir. */
    public int nombreMajeures() {
        int n = 0;
        for (Alerte a : alertes) {
            if (a.estMajeure()) {
                n++;
            }
        }
        return n;
    }

    public static class Alerte {

        /** Nature : interaction, contre-indication, posologie, allergie... telle que Posos la nomme. */
        private String type;
        /** Gravite telle que Posos la nomme. Le niveau est deduit, la valeur d'origine est conservee. */
        private String gravite;
        private String libelle;
        private String recommandation;
        private List<String> produits = new ArrayList<>();
        /** DCI recommandee(s) par la conduite a tenir : l'ecran montre les produits du rayon qui l'ont. */
        private List<String> proposer = new ArrayList<>();

        /** Produits que la proposition REMPLACE ; vide = ne pas offrir de remplacement (on ne devine pas). */
        private List<String> aRemplacer = new ArrayList<>();

        public List<String> getARemplacer() {
            return aRemplacer;
        }

        public void setARemplacer(List<String> aRemplacer) {
            this.aRemplacer = aRemplacer == null ? new ArrayList<>() : aRemplacer;
        }

        public List<String> getProposer() {
            return proposer;
        }

        public void setProposer(List<String> proposer) {
            this.proposer = proposer == null ? new ArrayList<>() : proposer;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getGravite() {
            return gravite;
        }

        public void setGravite(String gravite) {
            this.gravite = gravite;
        }

        public String getLibelle() {
            return libelle;
        }

        public void setLibelle(String libelle) {
            this.libelle = libelle;
        }

        public String getRecommandation() {
            return recommandation;
        }

        public void setRecommandation(String recommandation) {
            this.recommandation = recommandation;
        }

        public List<String> getProduits() {
            return produits;
        }

        public void setProduits(List<String> produits) {
            this.produits = produits == null ? new ArrayList<>() : produits;
        }

        /**
         * Alerte a mettre en avant. La gravite est un texte libre cote Posos : on reconnait les formulations usuelles
         * et, dans le doute, on NE minimise PAS - une alerte inconnue est traitee comme majeure, parce qu'il vaut mieux
         * faire lire une alerte de trop qu'en cacher une qui compte.
         */
        public boolean estMajeure() {
            if (gravite == null || gravite.trim().isEmpty()) {
                return true;
            }
            String g = gravite.toLowerCase();
            if (g.contains("contre-indi") || g.contains("contre indi") || g.contains("contraindicat")
                    || g.contains("majeur") || g.contains("major") || g.contains("severe") || g.contains("sévère")
                    || g.contains("critique") || g.contains("high")) {
                return true;
            }
            return !(g.contains("mineur") || g.contains("minor") || g.contains("faible") || g.contains("low")
                    || g.contains("information") || g.contains("info") || g.contains("precaution")
                    || g.contains("précaution") || g.contains("surveillance") || g.contains("moderate")
                    || g.contains("prendre en compte") || g.contains("modere") || g.contains("modéré"));
        }
    }
}
