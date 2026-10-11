package com.prestige.etiquettage.importation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prestige.etiquettage.catalogue.Champ;
import com.prestige.etiquettage.catalogue.Champ.Type;
import com.prestige.etiquettage.catalogue.ChampDepot;
import com.prestige.etiquettage.catalogue.Controles;
import com.prestige.etiquettage.catalogue.Historique;
import com.prestige.etiquettage.catalogue.Produit;
import com.prestige.etiquettage.catalogue.Produits;
import com.prestige.etiquettage.web.Refus;
import etiquetagepro.Correspondance;
import etiquetagepro.LecteurTableau;
import etiquetagepro.Tableau;
import etiquetagepro.Zone;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Import du catalogue en 4 etapes : fichier (lecture, correspondance proposee), champs (choix de l'utilisateur),
 * controle (compteurs et erreurs, sans rien ecrire), resultat (application en une transaction).
 * <ul>
 * <li>le CIP est la cle : produit existant mis a jour, sinon cree (la designation est alors obligatoire) ;</li>
 * <li>une cellule vide n'efface jamais une valeur existante ;</li>
 * <li>meme CIP sur plusieurs lignes : la derniere ligne est gardee, les autres comptees comme doublons ;</li>
 * <li>une ligne en erreur n'est pas importee ; les erreurs s'exportent en CSV ;</li>
 * <li>une colonne inconnue peut devenir un champ (ajoute au catalogue) ou etre ignoree ;</li>
 * <li>la correspondance est memorisee par format de fichier (titres des colonnes).</li>
 * </ul>
 * Le fichier lu reste en memoire, une heure au plus, jusqu'a l'application.
 */
@Service
public class ImportService {

    static final Duration DUREE = Duration.ofHours(1);
    static final int MAX_EN_COURS = 10;
    /** Erreurs detaillees rendues a l'ecran (toutes sont dans le CSV). */
    static final int MAX_ERREURS_AFFICHEES = 200;
    private static final DateTimeFormatter HORODATE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Map<Zone, String> ZONES = Map.of(Zone.CIP, "cip", Zone.DESIGNATION, "designation", Zone.PRIX,
            "prix", Zone.GROSSISTE, "grossiste", Zone.LOT, "lot", Zone.PEREMPTION, "peremption", Zone.EAN, "ean",
            Zone.NOMBRE, "nombre", Zone.MENTION, "mention", Zone.CODE_GEO, "code_geo");

    private final ChampDepot champs;
    private final Produits produits;
    private final Historique historique;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final SecureRandom hasard = new SecureRandom();
    private final Map<String, EnCours> enCours = new ConcurrentHashMap<>();

    public ImportService(ChampDepot champs, Produits produits, Historique historique, JdbcTemplate jdbc,
            ObjectMapper json) {
        this.champs = champs;
        this.produits = produits;
        this.historique = historique;
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Fichier lu, en attente d'application. */
    static final class EnCours {
        final String id, fichier, qui;
        final byte[] contenu;
        final Instant cree = Instant.now();
        Tableau tableau;
        boolean avecTitres;
        String signature;
        Controle dernier;
        boolean applique;

        EnCours(String id, String fichier, String qui, byte[] contenu) {
            this.id = id;
            this.fichier = fichier;
            this.qui = qui;
            this.contenu = contenu;
        }
    }

    /**
     * Correspondance d'une colonne : {@code champ} (associee a un champ existant), {@code nouveau} (champ a creer :
     * libelle, type) ou {@code ignorer}.
     */
    public record Colonne(int index, String action, String champ, String libelle, String type) {
    }

    public record ErreurLigne(int ligne, String cip, String colonne, String valeur, String message) {
    }

    public record Doublon(String cip, List<Integer> lignes, int gardee) {
    }

    /** Controle d'un import (rien n'est ecrit). */
    public record Controle(int lignes, int nouveaux, int misAJour, int inchanges, int lignesEnErreur, int doublons,
            List<ErreurLigne> erreurs, int totalErreurs, List<Doublon> detailDoublons, List<String> champsAjoutes) {
    }

    /* ------------------------------------------------------------ etape 1 : fichier */

    private void purger() {
        Instant limite = Instant.now().minus(DUREE);
        enCours.values().removeIf(e -> e.cree.isBefore(limite));
        while (enCours.size() >= MAX_EN_COURS) {
            enCours.values().stream().min((a, b) -> a.cree.compareTo(b.cree)).ifPresent(e -> enCours.remove(e.id));
        }
    }

    private EnCours enCours(String id, String qui) {
        EnCours e = id == null ? null : enCours.get(id);
        if (e == null || !e.qui.equals(qui) || e.cree.isBefore(Instant.now().minus(DUREE))) {
            throw new Refus(HttpStatus.GONE, "Import expiré : choisissez de nouveau le fichier.");
        }
        return e;
    }

    public Map<String, Object> analyser(String fichier, byte[] contenu, String feuille, boolean avecTitres, String qui) {
        purger();
        byte[] id = new byte[12];
        hasard.nextBytes(id);
        String nom = fichier == null || fichier.isBlank() ? "fichier" : fichier.replaceAll("[\\p{Cntrl}\\\\/]", "_");
        if (nom.length() > 200) {
            nom = nom.substring(nom.length() - 200);
        }
        EnCours e = new EnCours(HexFormat.of().formatHex(id), nom, qui, contenu);
        lire(e, feuille, avecTitres);
        enCours.put(e.id, e);
        return analyse(e);
    }

    /** Relit le meme fichier : autre feuille, ou premiere ligne de titres ou non. */
    public Map<String, Object> relire(String id, String feuille, boolean avecTitres, String qui) {
        EnCours e = enCours(id, qui);
        lire(e, feuille, avecTitres);
        e.dernier = null;
        return analyse(e);
    }

    private static void lire(EnCours e, String feuille, boolean avecTitres) {
        try {
            e.tableau = LecteurTableau.lire(e.fichier, e.contenu, feuille, avecTitres);
        } catch (IOException x) {
            throw Refus.requete(x.getMessage());
        } catch (RuntimeException x) {
            throw Refus.requete("Fichier illisible : est-ce bien un CSV ou un classeur Excel ?");
        }
        if (e.tableau.getLignes().isEmpty()) {
            throw Refus.requete("Le fichier ne contient aucune ligne de produit.");
        }
        e.avecTitres = avecTitres;
        e.signature = avecTitres ? signature(e.tableau.getColonnes()) : null;
    }

    static String signature(List<String> titres) {
        StringBuilder b = new StringBuilder();
        titres.forEach(t -> b.append(Correspondance.normaliser(t)).append('\u0001'));
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(b.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException x) {
            throw new IllegalStateException(x);
        }
    }

    private Map<String, Object> analyse(EnCours e) {
        Tableau t = e.tableau;
        Map<String, Champ> cs = champs.parNom();
        List<Colonne> propositions = memorisee(e, cs);
        boolean modeleReconnu = propositions != null;
        if (propositions == null) {
            propositions = proposer(t, e.avecTitres, cs);
        }
        List<Map<String, Object>> colonnes = new ArrayList<>();
        for (int i = 0; i < t.getColonnes().size(); i++) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("index", i);
            c.put("titre", t.getColonnes().get(i));
            c.put("exemples", exemples(t, i));
            c.put("proposition", propositions.get(i));
            colonnes.add(c);
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", e.id);
        r.put("fichier", e.fichier);
        r.put("lignes", t.getLignes().size());
        r.put("lignesIgnorees", t.getLignesIgnorees());
        r.put("feuilles", t.getFeuilles());
        r.put("feuille", t.getFeuille());
        r.put("separateur", t.getSeparateur());
        r.put("encodage", t.getEncodage());
        r.put("avecTitres", e.avecTitres);
        r.put("modeleReconnu", modeleReconnu);
        r.put("colonnes", colonnes);
        return r;
    }

    private static List<String> exemples(Tableau t, int i) {
        List<String> l = new ArrayList<>();
        for (List<String> ligne : t.getLignes()) {
            String v = ligne.get(i);
            if (!v.isBlank() && !l.contains(v)) {
                l.add(v.length() > 60 ? v.substring(0, 60) + "…" : v);
                if (l.size() == 3) {
                    break;
                }
            }
        }
        return l;
    }

    /** Correspondance memorisee pour ce format de fichier (champs supprimes depuis : colonne ignoree). */
    private List<Colonne> memorisee(EnCours e, Map<String, Champ> cs) {
        if (e.signature == null) {
            return null;
        }
        List<String> l = jdbc.queryForList("SELECT correspondance FROM modele_import WHERE signature = ?", String.class,
                e.signature);
        if (l.isEmpty()) {
            return null;
        }
        try {
            List<Colonne> m = json.readValue(l.get(0), new TypeReference<List<Colonne>>() {
            });
            if (m.size() != e.tableau.getColonnes().size()) {
                return null;
            }
            List<Colonne> r = new ArrayList<>();
            for (int i = 0; i < m.size(); i++) {
                Colonne c = m.get(i);
                boolean connu = "champ".equals(c.action()) && cs.containsKey(c.champ());
                r.add(connu ? new Colonne(i, "champ", c.champ(), null, null) : new Colonne(i, "ignorer", null, null, null));
            }
            return r;
        } catch (JsonProcessingException x) {
            return null;
        }
    }

    /**
     * Proposition : champ de meme nom ou libelle, puis titres reconnus par Etiquettage Pro (« Prix public » -> Prix),
     * sinon nouveau champ (titre et type deduits) ; sans ligne de titres, colonnes ignorees sauf le CIP et la
     * designation devines au contenu.
     */
    static List<Colonne> proposer(Tableau t, boolean avecTitres, Map<String, Champ> cs) {
        List<Colonne> r = new ArrayList<>();
        Set<String> pris = new HashSet<>();
        for (int i = 0; i < t.getColonnes().size(); i++) {
            String titre = t.getColonnes().get(i);
            String champ = null;
            if (avecTitres) {
                String n = Correspondance.normaliser(titre);
                for (Champ c : cs.values()) {
                    if (!pris.contains(c.nom()) && (Correspondance.normaliser(c.libelle()).equals(n)
                            || Correspondance.normaliser(c.nom()).equals(n))) {
                        champ = c.nom();
                        break;
                    }
                }
                if (champ == null) {
                    for (Map.Entry<Zone, String> z : ZONES.entrySet()) {
                        if (!pris.contains(z.getValue()) && z.getKey().reconnait(titre)) {
                            champ = z.getValue();
                            break;
                        }
                    }
                }
            } else {
                Type devine = typeDeduit(t, i);
                if (devine == Type.CODE && !pris.contains("cip")) {
                    champ = "cip";
                } else if (devine == Type.TEXTE && !pris.contains("designation")) {
                    champ = "designation";
                }
            }
            if (champ != null) {
                pris.add(champ);
                r.add(new Colonne(i, "champ", champ, null, null));
            } else if (avecTitres && !Correspondance.normaliser(titre).isEmpty()) {
                String lib = titre.strip().replaceAll("\\s+", " ");
                lib = lib.length() > ChampDepot.LIBELLE_MAX ? lib.substring(0, ChampDepot.LIBELLE_MAX) : lib;
                Type ty = typeDeduit(t, i);
                r.add(new Colonne(i, "nouveau", null, lib, (ty == Type.CODE ? Type.TEXTE : ty).name()));
            } else {
                r.add(new Colonne(i, "ignorer", null, null, null));
            }
        }
        return r;
    }

    /** Type le plus probable d'une colonne, d'apres ses 200 premieres valeurs non vides. */
    static Type typeDeduit(Tableau t, int i) {
        Champ date = new Champ("x", "x", Type.DATE, null, false, false, true, 0);
        int n = 0, dates = 0, entiers = 0, codes = 0;
        for (List<String> l : t.getLignes()) {
            String v = l.get(i).strip();
            if (v.isEmpty()) {
                continue;
            }
            n++;
            if (Controles.controler(date, v).ok()) {
                dates++;
            }
            if (v.matches("\\d{7}|\\d{13}")) {
                codes++;
            } else if (v.matches("[1-9]\\d{0,8}|0")) {
                entiers++;
            }
            if (n == 200) {
                break;
            }
        }
        if (n == 0) {
            return Type.TEXTE;
        }
        if (dates == n) {
            return Type.DATE;
        }
        if (codes == n) {
            return Type.CODE;
        }
        if (entiers + codes == n && codes == 0) {
            return Type.ENTIER;
        }
        return Type.TEXTE;
    }

    /* ------------------------------------------------------------ etapes 2 et 3 : champs, controle */

    /** Plan d'import : controle et operations a appliquer. */
    private record Plan(Controle controle, List<Map<String, String>> creations, List<Map<String, String>> majs,
            List<String> inchanges, Map<String, List<Historique.Ecart>> ecarts) {
    }

    /** Champ vise par chaque colonne (index -> champ), nouveaux champs compris (nom provisoire). */
    private static Map<Integer, Champ> cibles(List<Colonne> colonnes, Tableau t, Map<String, Champ> cs) {
        if (colonnes == null || colonnes.isEmpty()) {
            throw Refus.requete("Indiquez la correspondance des colonnes.");
        }
        Map<Integer, Champ> r = new LinkedHashMap<>();
        Set<String> pris = new HashSet<>();
        Map<String, Champ> existants = new LinkedHashMap<>(cs);
        int nouveau = 0;
        for (Colonne c : colonnes) {
            if (c == null || c.index() < 0 || c.index() >= t.getColonnes().size() || r.containsKey(c.index())) {
                throw Refus.requete("Correspondance des colonnes incohérente : rechargez le fichier.");
            }
            String action = c.action() == null ? "ignorer" : c.action();
            switch (action) {
                case "ignorer" -> {
                }
                case "champ" -> {
                    Champ ch = cs.get(c.champ());
                    if (ch == null) {
                        throw Refus.requete("Champ inconnu : " + c.champ() + ".");
                    }
                    if (!pris.add(ch.nom())) {
                        throw Refus.requete("Le champ « " + ch.libelle() + " » est associé à deux colonnes.");
                    }
                    r.put(c.index(), ch);
                }
                case "nouveau" -> {
                    String lib = ChampDepot.libelleValide(c.libelle(), existants);
                    Type ty;
                    try {
                        ty = Type.valueOf(c.type() == null ? "TEXTE" : c.type());
                    } catch (IllegalArgumentException x) {
                        throw Refus.requete("Type de champ inconnu : " + c.type() + ".");
                    }
                    Integer lg = ty == Type.TEXTE ? 100 : null;
                    Champ ch = new Champ("+" + (nouveau++), lib, ty, lg, false, false, true, 1000);
                    existants.put(ch.nom(), ch);
                    r.put(c.index(), ch);
                }
                default -> throw Refus.requete("Action inconnue pour une colonne : " + action + ".");
            }
        }
        if (!pris.contains("cip")) {
            throw Refus.requete("Associez une colonne au CIP : c'est lui qui identifie le produit.");
        }
        return r;
    }

    private Plan planifier(EnCours e, List<Colonne> colonnes, Map<String, Champ> cs) {
        Tableau t = e.tableau;
        Map<Integer, Champ> cibles = cibles(colonnes, t, cs);
        int cipIdx = cibles.entrySet().stream().filter(x -> "cip".equals(x.getValue().nom())).findFirst().get().getKey();
        Champ cipChamp = cibles.get(cipIdx);
        int decalage = e.avecTitres ? 2 : 1;
        List<ErreurLigne> erreurs = new ArrayList<>();
        Set<Integer> lignesEnErreur = new HashSet<>();
        /* derniere ligne de chaque CIP ; lignes de chaque CIP pour les doublons */
        Map<String, List<Integer>> parCip = new LinkedHashMap<>();
        List<List<String>> lignes = t.getLignes();
        for (int i = 0; i < lignes.size(); i++) {
            String brute = lignes.get(i).get(cipIdx);
            Controles.Resultat r = Controles.controler(cipChamp, brute);
            if (!r.ok()) {
                erreurs.add(new ErreurLigne(i + decalage, brute, t.getColonnes().get(cipIdx), brute, r.erreur()));
                lignesEnErreur.add(i);
                continue;
            }
            parCip.computeIfAbsent(r.valeur(), k -> new ArrayList<>()).add(i);
        }
        List<Doublon> doublons = new ArrayList<>();
        int nbDoublons = 0;
        for (Map.Entry<String, List<Integer>> x : parCip.entrySet()) {
            List<Integer> l = x.getValue();
            if (l.size() > 1) {
                nbDoublons += l.size() - 1;
                if (doublons.size() < MAX_ERREURS_AFFICHEES) {
                    doublons.add(new Doublon(x.getKey(), l.stream().map(k -> k + decalage).toList(),
                            l.get(l.size() - 1) + decalage));
                }
            }
        }
        Map<String, Produit> existants = produits.lire(parCip.keySet());
        Map<String, Champ> tousChamps = new LinkedHashMap<>(cs);
        cibles.values().forEach(c -> tousChamps.putIfAbsent(c.nom(), c));
        List<Map<String, String>> creations = new ArrayList<>(), majs = new ArrayList<>();
        List<String> inchanges = new ArrayList<>();
        Map<String, List<Historique.Ecart>> ecarts = new HashMap<>();
        for (Map.Entry<String, List<Integer>> x : parCip.entrySet()) {
            String cip = x.getKey();
            int i = x.getValue().get(x.getValue().size() - 1);
            List<String> ligne = lignes.get(i);
            Map<String, String> lues = new LinkedHashMap<>();
            boolean ok = true;
            for (Map.Entry<Integer, Champ> c : cibles.entrySet()) {
                String brute = ligne.get(c.getKey());
                if (brute == null || brute.isBlank()) {
                    continue;
                }
                Controles.Resultat r = Controles.controler(c.getValue(), brute);
                if (r.ok()) {
                    lues.put(c.getValue().nom(), r.valeur());
                } else {
                    ok = false;
                    erreurs.add(new ErreurLigne(i + decalage, cip, t.getColonnes().get(c.getKey()), brute, r.erreur()));
                }
            }
            Produit avant = existants.get(cip);
            if (avant == null && !lues.containsKey("designation")) {
                ok = false;
                erreurs.add(new ErreurLigne(i + decalage, cip, "Désignation", "",
                        "Désignation obligatoire pour un nouveau produit."));
            }
            if (!ok) {
                lignesEnErreur.add(i);
                continue;
            }
            if (avant == null) {
                creations.add(lues);
            } else {
                Map<String, String> fusion = new LinkedHashMap<>(avant.valeurs());
                fusion.putAll(lues);
                List<Historique.Ecart> d = Historique.ecarts(avant.valeurs(), fusion, tousChamps);
                if (d.isEmpty()) {
                    inchanges.add(cip);
                } else {
                    majs.add(fusion);
                    ecarts.put(cip, d);
                }
            }
        }
        erreurs.sort((a, b) -> Integer.compare(a.ligne(), b.ligne()));
        List<String> ajoutes = cibles.values().stream().filter(c -> c.nom().startsWith("+")).map(Champ::libelle)
                .toList();
        Controle c = new Controle(lignes.size(), creations.size(), majs.size(), inchanges.size(), lignesEnErreur.size(),
                nbDoublons, erreurs.size() > MAX_ERREURS_AFFICHEES ? erreurs.subList(0, MAX_ERREURS_AFFICHEES) : erreurs,
                erreurs.size(), doublons, ajoutes);
        e.dernier = new Controle(c.lignes(), c.nouveaux(), c.misAJour(), c.inchanges(), c.lignesEnErreur(),
                c.doublons(), erreurs, erreurs.size(), doublons, ajoutes);
        return new Plan(c, creations, majs, inchanges, ecarts);
    }

    public Controle controler(String id, List<Colonne> colonnes, String qui) {
        EnCours e = enCours(id, qui);
        return planifier(e, colonnes, champs.parNom()).controle();
    }

    /** Erreurs du dernier controle, en CSV (separateur « ; », UTF-8 avec BOM, lisible par Excel). */
    public byte[] erreursCsv(String id, String qui) {
        EnCours e = enCours(id, qui);
        if (e.dernier == null) {
            throw Refus.requete("Lancez d'abord le contrôle.");
        }
        StringBuilder b = new StringBuilder("﻿Ligne;CIP;Colonne;Valeur;Erreur\r\n");
        for (ErreurLigne x : e.dernier.erreurs()) {
            b.append(x.ligne()).append(';').append(cellule(x.cip())).append(';').append(cellule(x.colonne()))
                    .append(';').append(cellule(x.valeur())).append(';').append(cellule(x.message())).append("\r\n");
        }
        return b.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** Cellule CSV : guillemets doubles, et jamais interpretee comme formule par un tableur. */
    static String cellule(String v) {
        String s = v == null ? "" : v.replaceAll("[\\r\\n]+", " ");
        if (!s.isEmpty() && "=+-@\t".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s;
        }
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    /* ------------------------------------------------------------ etape 4 : application */

    @Transactional
    public Map<String, Object> appliquer(String id, List<Colonne> colonnes, String qui) {
        EnCours e = enCours(id, qui);
        synchronized (e) {
            if (e.applique) {
                throw new Refus(HttpStatus.CONFLICT, "Cet import a déjà été appliqué.");
            }
            Map<String, Champ> cs = champs.parNom();
            /* verifie tout avant de creer le moindre champ */
            planifier(e, colonnes, cs);
            List<Colonne> definitives = new ArrayList<>();
            List<String> ajoutes = new ArrayList<>();
            for (Colonne c : colonnes) {
                if ("nouveau".equals(c.action())) {
                    Champ ch = champs.ajouter(c.libelle(), Type.valueOf(c.type() == null ? "TEXTE" : c.type()),
                            Type.valueOf(c.type() == null ? "TEXTE" : c.type()) == Type.TEXTE ? 100 : null);
                    ajoutes.add(ch.libelle());
                    definitives.add(new Colonne(c.index(), "champ", ch.nom(), null, null));
                } else {
                    definitives.add(new Colonne(c.index(), c.action() == null ? "ignorer" : c.action(), c.champ(), null,
                            null));
                }
            }
            Plan p = planifier(e, definitives, champs.parNom());
            Controle c = p.controle();
            long journal = journaliser(e, qui, c, ajoutes);
            produits.insererTous(p.creations(), qui, journal);
            produits.modifierTous(p.majs(), qui, journal);
            produits.marquerImport(p.inchanges(), journal);
            String source = "Import " + e.fichier;
            List<Object[]> h = new ArrayList<>();
            p.creations().forEach(v -> h.add(historique.ligne(v.get("cip"), qui, source, null)));
            p.majs().forEach(v -> h.add(historique.ligne(v.get("cip"), qui, source, p.ecarts().get(v.get("cip")))));
            historique.ajouterTous(h);
            memoriser(e, definitives);
            e.applique = true;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("journal", journal);
            r.put("lignes", c.lignes());
            r.put("crees", c.nouveaux());
            r.put("misAJour", c.misAJour());
            r.put("inchanges", c.inchanges());
            r.put("lignesEnErreur", c.lignesEnErreur());
            r.put("doublons", c.doublons());
            r.put("champsAjoutes", ajoutes);
            return r;
        }
    }

    private long journaliser(EnCours e, String qui, Controle c, List<String> ajoutes) {
        String champsAjoutes = ajoutes.isEmpty() ? null : String.join(", ", ajoutes);
        if (champsAjoutes != null && champsAjoutes.length() > 400) {
            champsAjoutes = champsAjoutes.substring(0, 399) + "…";
        }
        String ca = champsAjoutes;
        KeyHolder k = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("INSERT INTO journal_import (qui, fichier, lignes, crees,"
                    + " mis_a_jour, inchanges, erreurs, doublons, champs_ajoutes) VALUES (?,?,?,?,?,?,?,?,?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, qui);
            ps.setString(2, e.fichier);
            ps.setInt(3, c.lignes());
            ps.setInt(4, c.nouveaux());
            ps.setInt(5, c.misAJour());
            ps.setInt(6, c.inchanges());
            ps.setInt(7, c.lignesEnErreur());
            ps.setInt(8, c.doublons());
            ps.setString(9, ca);
            return ps;
        }, k);
        return k.getKey().longValue();
    }

    private void memoriser(EnCours e, List<Colonne> colonnes) {
        if (e.signature == null) {
            return;
        }
        try {
            List<Colonne> m = new ArrayList<>(colonnes);
            m.sort((a, b) -> Integer.compare(a.index(), b.index()));
            String titres = String.join(" | ", e.tableau.getColonnes());
            jdbc.update("INSERT INTO modele_import (signature, titres, correspondance) VALUES (?, ?, ?)"
                    + " ON DUPLICATE KEY UPDATE titres = VALUES(titres), correspondance = VALUES(correspondance),"
                    + " utilise_le = NOW()", e.signature, titres.length() > 4000 ? titres.substring(0, 4000) : titres,
                    json.writeValueAsString(m));
        } catch (JsonProcessingException x) {
            throw new IllegalStateException(x);
        }
    }

    public List<Map<String, Object>> journal() {
        return jdbc.query("SELECT id, quand, qui, fichier, lignes, crees, mis_a_jour, inchanges, erreurs, doublons,"
                + " champs_ajoutes FROM journal_import ORDER BY id DESC LIMIT 50", (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("quand", rs.getTimestamp("quand").toLocalDateTime().format(HORODATE));
                    m.put("qui", rs.getString("qui"));
                    m.put("fichier", rs.getString("fichier"));
                    m.put("lignes", rs.getInt("lignes"));
                    m.put("crees", rs.getInt("crees"));
                    m.put("misAJour", rs.getInt("mis_a_jour"));
                    m.put("inchanges", rs.getInt("inchanges"));
                    m.put("lignesEnErreur", rs.getInt("erreurs"));
                    m.put("doublons", rs.getInt("doublons"));
                    m.put("champsAjoutes", rs.getString("champs_ajoutes"));
                    return m;
                });
    }
}
