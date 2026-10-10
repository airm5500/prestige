package etiquetagepro;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.HashSet;
import java.util.Random;
import java.util.Set;

/**
 * Etiquettage Pro autonome (hors Prestige) : registre local des codes d'etiquettes, jamais reproduits.
 * <p>
 * Chaque installation a son prefixe de 2 caracteres (tire au premier lancement, ou choisi), en tete de tous ses codes :
 * deux postes de prefixes differents ne peuvent pas donner le meme code. Les codes font 5 caracteres (prefixe compris),
 * puis 6, 7 et 8 quand ceux d'une longueur s'epuisent (au-dela de 90 % pris). Ils sont inscrits dans un fichier texte
 * (un code par ligne) sous verrou : deux fenetres ouvertes sur le meme poste ne se marchent pas dessus.
 */
public final class RegistreLocal implements RegistreCodes {

    /** Meme alphabet que Prestige : sans 0 / O ni 1 / I, que l'on confond a la lecture. */
    public static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    static final int LONGUEUR_PREFIXE = 2;

    private final Path codes;
    private final String prefixe;
    private final Set<String> donnes = new HashSet<>();
    private final Random hasard;
    private long lu;

    private RegistreLocal(Path codes, String prefixe, Random hasard) {
        this.codes = codes;
        this.prefixe = prefixe;
        this.hasard = hasard;
    }

    /** Registre du dossier donne (cree au besoin) ; prefixe lu, sinon tire et retenu. */
    public static RegistreLocal ouvrir(Path dossier) throws IOException {
        return ouvrir(dossier, new SecureRandom());
    }

    static RegistreLocal ouvrir(Path dossier, Random hasard) throws IOException {
        Files.createDirectories(dossier);
        Path p = dossier.resolve("prefixe.txt");
        String prefixe = Files.exists(p) ? new String(Files.readAllBytes(p), StandardCharsets.UTF_8).trim() : "";
        if (!prefixeValide(prefixe)) {
            StringBuilder b = new StringBuilder();
            for (int i = 0; i < LONGUEUR_PREFIXE; i++) {
                b.append(ALPHABET.charAt(hasard.nextInt(ALPHABET.length())));
            }
            prefixe = b.toString();
            Files.write(p, prefixe.getBytes(StandardCharsets.UTF_8));
        }
        RegistreLocal r = new RegistreLocal(dossier.resolve("codes.txt"), prefixe, hasard);
        if (!Files.exists(r.codes)) {
            Files.createFile(r.codes);
        }
        return r;
    }

    public static boolean prefixeValide(String p) {
        if (p == null || p.length() != LONGUEUR_PREFIXE) {
            return false;
        }
        for (char c : p.toCharArray()) {
            if (ALPHABET.indexOf(c) < 0) {
                return false;
            }
        }
        return true;
    }

    /** Change le prefixe de l'installation (les codes deja donnes restent au registre). */
    public static void changerPrefixe(Path dossier, String prefixe) throws IOException {
        if (!prefixeValide(prefixe)) {
            throw new IllegalArgumentException("Préfixe invalide : 2 caractères parmi " + ALPHABET);
        }
        Files.createDirectories(dossier);
        Files.write(dossier.resolve("prefixe.txt"), prefixe.getBytes(StandardCharsets.UTF_8));
    }

    public String getPrefixe() {
        return prefixe;
    }

    /** Codes deja donnes par ce poste (tous prefixes). */
    public synchronized int nombre() throws IOException {
        try (RandomAccessFile f = new RandomAccessFile(codes.toFile(), "rw"); FileChannel c = f.getChannel();
                FileLock verrou = c.lock()) {
            relire(f);
            return donnes.size();
        }
    }

    static long capacite(int longueur) {
        long c = 1;
        for (int i = 0; i < longueur - LONGUEUR_PREFIXE; i++) {
            c *= ALPHABET.length();
        }
        return c;
    }

    @Override
    public synchronized String attribuer(String cip) {
        try (RandomAccessFile f = new RandomAccessFile(codes.toFile(), "rw"); FileChannel c = f.getChannel();
                FileLock verrou = c.lock()) {
            relire(f);
            for (int longueur = 5; longueur <= 8; longueur++) {
                final int l = longueur;
                long pris = donnes.stream().filter(x -> x.length() == l && x.startsWith(prefixe)).count();
                if (pris >= capacite(l) * 9 / 10 && l < 8) {
                    continue;
                }
                for (int essai = 0; essai < 200; essai++) {
                    StringBuilder b = new StringBuilder(prefixe);
                    for (int i = LONGUEUR_PREFIXE; i < l; i++) {
                        b.append(ALPHABET.charAt(hasard.nextInt(ALPHABET.length())));
                    }
                    String code = b.toString();
                    if (donnes.add(code)) {
                        f.seek(f.length());
                        f.write((code + "\n").getBytes(StandardCharsets.UTF_8));
                        lu = f.length();
                        return code;
                    }
                }
            }
            return null;
        } catch (IOException e) {
            throw new IllegalStateException("Registre des codes illisible : " + e.getMessage(), e);
        }
    }

    /** Lit les codes ajoutes depuis la derniere lecture (par ce poste ou une autre fenetre). */
    private void relire(RandomAccessFile f) throws IOException {
        if (f.length() < lu) {
            donnes.clear();
            lu = 0;
        }
        if (f.length() == lu) {
            return;
        }
        f.seek(lu);
        byte[] b = new byte[(int) (f.length() - lu)];
        f.readFully(b);
        for (String l : new String(b, StandardCharsets.UTF_8).split("\n")) {
            if (!l.trim().isEmpty()) {
                donnes.add(l.trim());
            }
        }
        lu = f.length();
    }
}
