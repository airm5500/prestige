package job;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

public class NotificationJobHeuresTest {

    @Test
    public void heuresValidesConservees() {
        assertEquals("0,18,19,20", NotificationJob.heuresValides("0,18,19,20", "18,19"));
        assertEquals("7,19", NotificationJob.heuresValides(" 7, 19 ", "18,19"));
    }

    @Test
    public void valeurVideOuInvalideRemplacee() {
        assertEquals("18,19", NotificationJob.heuresValides(null, "18,19"));
        assertEquals("18,19", NotificationJob.heuresValides("", "18,19"));
        assertEquals("18,19", NotificationJob.heuresValides("18h", "18,19"));
        assertEquals("18,19", NotificationJob.heuresValides("18,25", "18,19"));
        assertEquals("18,19", NotificationJob.heuresValides("18,,19", "18,19"));
    }
}
