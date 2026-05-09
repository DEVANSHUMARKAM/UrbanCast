from geopy.distance import geodesic

CITY_REGISTRY: dict[str, dict] = {
    "mumbai":       {"lat": 19.0760, "lng": 72.8777, "state": "Maharashtra"},
    "pune":         {"lat": 18.5204, "lng": 73.8567, "state": "Maharashtra"},
    "nagpur":       {"lat": 21.1458, "lng": 79.0882, "state": "Maharashtra"},
    "nashik":       {"lat": 19.9975, "lng": 73.7898, "state": "Maharashtra"},
    "aurangabad":   {"lat": 19.8762, "lng": 75.3433, "state": "Maharashtra"},
    "solapur":      {"lat": 17.6805, "lng": 75.9064, "state": "Maharashtra"},
    "kolhapur":     {"lat": 16.7050, "lng": 74.2433, "state": "Maharashtra"},
    "amravati":     {"lat": 20.9320, "lng": 77.7523, "state": "Maharashtra"},
    "delhi":        {"lat": 28.6139, "lng": 77.2090, "state": "Delhi"},
    "bangalore":    {"lat": 12.9716, "lng": 77.5946, "state": "Karnataka"},
    "hyderabad":    {"lat": 17.3850, "lng": 78.4867, "state": "Telangana"},
    "chennai":      {"lat": 13.0827, "lng": 80.2707, "state": "Tamil Nadu"},
    "kolkata":      {"lat": 22.5726, "lng": 88.3639, "state": "West Bengal"},
    "ahmedabad":    {"lat": 23.0225, "lng": 72.5714, "state": "Gujarat"},
    "surat":        {"lat": 21.1702, "lng": 72.8311, "state": "Gujarat"},
    "vadodara":     {"lat": 22.3072, "lng": 73.1812, "state": "Gujarat"},
    "jaipur":       {"lat": 26.9124, "lng": 75.7873, "state": "Rajasthan"},
    "jodhpur":      {"lat": 26.2389, "lng": 73.0243, "state": "Rajasthan"},
    "lucknow":      {"lat": 26.8467, "lng": 80.9462, "state": "Uttar Pradesh"},
    "kanpur":       {"lat": 26.4499, "lng": 80.3319, "state": "Uttar Pradesh"},
    "agra":         {"lat": 27.1767, "lng": 78.0081, "state": "Uttar Pradesh"},
    "varanasi":     {"lat": 25.3176, "lng": 82.9739, "state": "Uttar Pradesh"},
    "patna":        {"lat": 25.5941, "lng": 85.1376, "state": "Bihar"},
    "bhopal":       {"lat": 23.2599, "lng": 77.4126, "state": "Madhya Pradesh"},
    "indore":       {"lat": 22.7196, "lng": 75.8577, "state": "Madhya Pradesh"},
    "gwalior":      {"lat": 26.2183, "lng": 78.1828, "state": "Madhya Pradesh"},
    "raipur":       {"lat": 21.2514, "lng": 81.6296, "state": "Chhattisgarh"},
    "bhubaneswar":  {"lat": 20.2961, "lng": 85.8245, "state": "Odisha"},
    "visakhapatnam":{"lat": 17.6868, "lng": 83.2185, "state": "Andhra Pradesh"},
    "coimbatore":   {"lat": 11.0168, "lng": 76.9558, "state": "Tamil Nadu"},
    "madurai":      {"lat": 9.9252,  "lng": 78.1198, "state": "Tamil Nadu"},
    "kochi":        {"lat": 9.9312,  "lng": 76.2673, "state": "Kerala"},
    "thiruvananthapuram": {"lat": 8.5241, "lng": 76.9366, "state": "Kerala"},
    "mangalore":    {"lat": 12.9141, "lng": 74.8560, "state": "Karnataka"},
    "mysore":       {"lat": 12.2958, "lng": 76.6394, "state": "Karnataka"},
    "hubli":        {"lat": 15.3647, "lng": 75.1240, "state": "Karnataka"},
    "chandigarh":   {"lat": 30.7333, "lng": 76.7794, "state": "Punjab"},
    "ludhiana":     {"lat": 30.9010, "lng": 75.8573, "state": "Punjab"},
    "amritsar":     {"lat": 31.6340, "lng": 74.8723, "state": "Punjab"},
    "dehradun":     {"lat": 30.3165, "lng": 78.0322, "state": "Uttarakhand"},
    "guwahati":     {"lat": 26.1445, "lng": 91.7362, "state": "Assam"},
    "ranchi":       {"lat": 23.3441, "lng": 85.3096, "state": "Jharkhand"},
    "jamshedpur":   {"lat": 22.8046, "lng": 86.2029, "state": "Jharkhand"},
    "rajkot":       {"lat": 22.3039, "lng": 70.8022, "state": "Gujarat"},
    "jabalpur":     {"lat": 23.1815, "lng": 79.9864, "state": "Madhya Pradesh"},
    "allahabad":    {"lat": 25.4358, "lng": 81.8463, "state": "Uttar Pradesh"},
    "meerut":       {"lat": 28.9845, "lng": 77.7064, "state": "Uttar Pradesh"},
    "faridabad":    {"lat": 28.4089, "lng": 77.3178, "state": "Haryana"},
    "gurgaon":      {"lat": 28.4595, "lng": 77.0266, "state": "Haryana"},
    "noida":        {"lat": 28.5355, "lng": 77.3910, "state": "Uttar Pradesh"},
}


def search_cities(query: str) -> list[dict]:
    """Return cities whose name contains the query string (case-insensitive)."""
    q = query.strip().lower()
    results = []
    for name, data in CITY_REGISTRY.items():
        if q in name:
            results.append({
                "name": name.title(),
                "key": name,
                "lat": data["lat"],
                "lng": data["lng"],
                "state": data["state"],
            })
    return sorted(results, key=lambda x: x["name"])


def find_nearest_city(polygon_coords: list[list[float]]) -> dict:
    """
    Given a polygon as [[lat, lng], ...], find the nearest known city
    to the polygon centroid using geodesic distance.
    """
    centroid_lat = sum(c[0] for c in polygon_coords) / len(polygon_coords)
    centroid_lng = sum(c[1] for c in polygon_coords) / len(polygon_coords)
    centroid = (centroid_lat, centroid_lng)

    nearest = None
    min_dist_km = float("inf")

    for name, data in CITY_REGISTRY.items():
        city_point = (data["lat"], data["lng"])
        dist_km = geodesic(centroid, city_point).km
        if dist_km < min_dist_km:
            min_dist_km = dist_km
            nearest = {
                "name": name.title(),
                "key": name,
                "lat": data["lat"],
                "lng": data["lng"],
                "state": data["state"],
                "distance_km": round(min_dist_km, 2),
            }

    return nearest