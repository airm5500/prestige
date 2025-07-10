package rest.service.dto;

/**
 *
 * @author koben
 */
public class EtatAnnuelWrapperDTO {

    private EtatAnnuelDTO currentYear;
    private EtatAnnuelDTO yearMinusOne;
    private EtatAnnuelDTO yearMinusTwo;

    public EtatAnnuelDTO getCurrentYear() {
        return currentYear;
    }

    public void setCurrentYear(EtatAnnuelDTO currentYear) {
        this.currentYear = currentYear;
    }

    public EtatAnnuelDTO getYearMinusOne() {
        return yearMinusOne;
    }

    public void setYearMinusOne(EtatAnnuelDTO yearMinusOne) {
        this.yearMinusOne = yearMinusOne;
    }

    public EtatAnnuelDTO getYearMinusTwo() {
        return yearMinusTwo;
    }

    public void setYearMinusTwo(EtatAnnuelDTO yearMinusTwo) {
        this.yearMinusTwo = yearMinusTwo;
    }

}
