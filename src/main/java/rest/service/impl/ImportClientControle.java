package rest.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import util.FichierTabulaire;

/**
 * Controle d'un fichier d'import de clients standards (evolution 5, point 3), avant toute ecriture.
 *
 * <p>
 * L'import historique lisait les colonnes par leur position, figee dans le code ({@code tabString[0]} a
 * {@code tabString[9]}), sans aucun controle : un fichier dont les colonnes etaient dans un autre ordre etait soit
 * refuse par une erreur de conversion, soit importe de travers, et une seule ligne fautive faisait echouer le lot
 * entier. Ici l'appelant DIT quelle colonne porte quoi, chaque ligne est controlee separement, et le rapport est rendu
 * AVANT d'ecrire quoi que ce soit.
 * </p>
 *
 * <p>
 * Classe sans dependance a la base ni au serveur : les numeros deja pris lui sont fournis. Elle se teste donc
 * entierement en unitaire, ce qui est bien le moins pour du code qui cree des clients en masse.
 * </p>
 */
public final class ImportClientControle {

    /** Une ligne du fichier, telle qu'elle a ete comprise. */
    public static final class Ligne {

        private final int numero;
        private final String nom;
        private final String prenoms;
        private final String telephone;
        private final String motif;

        Ligne(int numero, String nom, String prenoms, String telephone, String motif) {
            this.numero = numero;
            this.nom = nom;
            this.prenoms = prenoms;
            this.telephone = telephone;
            this.motif = motif;
        }

        public int getNumero() {
            return numero;
        }

        public String getNom() {
            return nom;
        }

        public String getPrenoms() {
            return prenoms;
        }

        /** Numero normalise au format local, vide si la ligne est rejetee pour un motif de numero. */
        public String getTelephone() {
            return telephone;
        }

        /** Motif du rejet, vide si la ligne est retenue. */
        public String getMotif() {
            return motif;
        }

        public boolean estRetenue() {
            return motif.isEmpty();
        }
    }

    /** Correspondance entre les colonnes du fichier et les trois informations attendues. */
    public static final class Correspondance {

        private final int colonneNom;
        private final int colonnePrenoms;
        private final int colonneTelephone;
        private final boolean premiereLigneEntete;

        public Correspondance(int colonneNom, int colonnePrenoms, int colonneTelephone, boolean premiereLigneEntete) {
            this.colonneNom = colonneNom;
            this.colonnePrenoms = colonnePrenoms;
            this.colonneTelephone = colonneTelephone;
            this.premiereLigneEntete = premiereLigneEntete;
        }

        /** Les trois colonnes doivent etre choisies, et distinctes : deux fois la meme n'aurait aucun sens. */
        public String motifInvalidite() {
            if (colonneNom < 0 || colonnePrenoms < 0 || colonneTelephone < 0) {
                return "Choisissez les colonnes du nom, des prénoms et du téléphone.";
            }
            if (colonneNom == colonnePrenoms || colonneNom == colonneTelephone || colonnePrenoms == colonneTelephone) {
                return "Les trois colonnes doivent être différentes.";
            }
            return "";
        }
    }

    private final List<Ligne> lignes = new ArrayList<>();

    private ImportClientControle() {
    }

    /**
     * Controle toutes les lignes.
     *
     * @param contenu
     *            lignes du fichier, toutes colonnes gardees
     * @param correspondance
     *            quelle colonne porte quoi
     * @param numerosDejaPris
     *            numeros (format local) deja portes par un client standard existant
     */
    public static ImportClientControle controler(List<List<String>> contenu, Correspondance correspondance,
            Collection<String> numerosDejaPris) {
        ImportClientControle rapport = new ImportClientControle();
        Set<String> pris = new HashSet<>();
        if (numerosDejaPris != null) {
            pris.addAll(numerosDejaPris);
        }
        // Un meme numero deux fois DANS le fichier : la premiere ligne est retenue, la seconde rejetee
        // en disant a quelle ligne elle fait doublon. Sans cela l'index unique ferait echouer l'import
        // au milieu, sans dire ou.
        Map<String, Integer> vuDansLeFichier = new HashMap<>();

        int debut = correspondance.premiereLigneEntete ? 1 : 0;
        for (int i = debut; i < contenu.size(); i++) {
            List<String> ligne = contenu.get(i);
            int numero = i + 1;
            String nom = FichierTabulaire.cellule(ligne, correspondance.colonneNom);
            String prenoms = FichierTabulaire.cellule(ligne, correspondance.colonnePrenoms);
            String telephoneBrut = FichierTabulaire.cellule(ligne, correspondance.colonneTelephone);

            if (nom.isEmpty() && prenoms.isEmpty() && telephoneBrut.isEmpty()) {
                continue; // ligne vide : ignoree, pas rejetee
            }

            ClientStandardSaisie saisie = ClientStandardSaisie.controler(nom, prenoms, telephoneBrut);
            if (!saisie.estValide()) {
                rapport.lignes.add(new Ligne(numero, nom, prenoms, telephoneBrut, saisie.message()));
                continue;
            }
            String local = saisie.getTelephone();
            Integer premiere = vuDansLeFichier.get(local);
            if (premiere != null) {
                rapport.lignes.add(new Ligne(numero, nom, prenoms, local,
                        "Numéro en doublon dans le fichier (déjà ligne " + premiere + ")."));
                continue;
            }
            if (pris.contains(local)) {
                rapport.lignes.add(
                        new Ligne(numero, nom, prenoms, local, "Numéro déjà attribué à un client standard existant."));
                continue;
            }
            vuDansLeFichier.put(local, numero);
            rapport.lignes.add(new Ligne(numero, saisie.getNom(), saisie.getPrenoms(), local, ""));
        }
        return rapport;
    }

    public List<Ligne> getLignes() {
        return lignes;
    }

    public List<Ligne> retenues() {
        List<Ligne> out = new ArrayList<>();
        for (Ligne l : lignes) {
            if (l.estRetenue()) {
                out.add(l);
            }
        }
        return out;
    }

    public List<Ligne> rejetees() {
        List<Ligne> out = new ArrayList<>();
        for (Ligne l : lignes) {
            if (!l.estRetenue()) {
                out.add(l);
            }
        }
        return out;
    }

    /** Numeros normalises des lignes retenues : ce que l'appelant doit interroger en base. */
    public Set<String> numerosRetenus() {
        Set<String> out = new HashSet<>();
        for (Ligne l : retenues()) {
            out.add(l.getTelephone());
        }
        return out;
    }

    /**
     * Numeros normalises de TOUTES les lignes exploitables du fichier, retenues ou non : c'est cette liste qu'on
     * interroge en base pour savoir lesquels sont deja pris, en une seule requete.
     */
    public static Set<String> numerosDuFichier(List<List<String>> contenu, Correspondance correspondance) {
        Set<String> out = new HashSet<>();
        int debut = correspondance.premiereLigneEntete ? 1 : 0;
        for (int i = debut; i < contenu.size(); i++) {
            ClientStandardSaisie saisie = ClientStandardSaisie.controler("x", "x",
                    FichierTabulaire.cellule(contenu.get(i), correspondance.colonneTelephone));
            if (saisie.estValide()) {
                out.add(saisie.getTelephone());
            }
        }
        return out;
    }

    /** Resume d'une ligne pour l'affichage : « 12 retenue(s), 3 rejetee(s) ». */
    public String resume() {
        int retenues = retenues().size();
        int rejetees = rejetees().size();
        return retenues + " ligne(s) retenue(s), " + rejetees + " rejetée(s)";
    }

}
