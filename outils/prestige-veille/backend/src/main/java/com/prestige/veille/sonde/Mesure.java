package com.prestige.veille.sonde;

import java.time.LocalDateTime;

/** Resultat d'une sonde. Les valeurs non mesurees restent nulles. */
public class Mesure {
    public LocalDateTime quand = LocalDateTime.now();
    public String cible, sonde, detail;
    public boolean ok;
    public Integer ms, filsHttp, poolMs, bddConnexions, bddPic, appelMoyenMs, ecranMoyenMs, erreurs;
    public Double memoirePct, cpuServeur, cpuMachine;
    public Long ramLibreMo, ramTotaleMo, disqueLibreMo;

    public static Mesure de(String cible, String sonde) {
        Mesure m = new Mesure();
        m.cible = cible;
        m.sonde = sonde;
        return m;
    }
}
