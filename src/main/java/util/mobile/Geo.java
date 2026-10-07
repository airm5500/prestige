package util.mobile;

/** Distance entre deux positions GPS (formule de haversine), en metres. Calcul pur (GeoTest). */
public final class Geo {

    private static final double RAYON_TERRE_M = 6_371_000d;

    private Geo() {
    }

    public static double distanceM(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * RAYON_TERRE_M * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    public static boolean positionPlausible(Double lat, Double lon) {
        return lat != null && lon != null && !lat.isNaN() && !lon.isNaN() && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
                && !(lat == 0d && lon == 0d);
    }
}
