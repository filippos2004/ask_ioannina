#Team members (/about)
TEAM_MEMBERS = [
    {"name": "ΟΝΟΜΑ 1", "am": "AM1"},
    {"name": "ΟΝΟΜΑ 2", "am": "AM2"},
]

# 3 categories x 5 POIs για Ιωάννινα (σύμφωνα με εκφώνηση)
CATEGORIES = [
    {"id": "monuments", "name": "Μνημεία"},
    {"id": "museums", "name": "Μουσεία"},
    {"id": "nature", "name": "Φύση"},
]

# κάθε POI: id, categoryId, wikidataId (Q-xxx)
POIS = [
    # Μνημεία (5)
    {"id": "ioannina-castle", "categoryId": "monuments", "wikidataId": "Q17496804"},  # Κάστρο Ιωαννίνων
    {"id": "aslan-pasha-mosque", "categoryId": "monuments", "wikidataId": "Q4807291"},  # Τζαμί Ασλάν Πασά
    {"id": "fethiye-mosque", "categoryId": "monuments", "wikidataId": "Q5445951"},  # Φετιχιέ Τζαμί
    {"id": "pyrsinella-mansion", "categoryId": "monuments", "wikidataId": "Q38282105"},  # Οικία Πυρσινέλλα
    {"id": "acropolis-kastritsa", "categoryId": "monuments", "wikidataId": "Q56397283"},  # Ακρόπολη Καστρίτσας

    # Μουσεία (5)
    {"id": "archaeological-museum", "categoryId": "museums", "wikidataId": "Q4785409"},  # Αρχαιολογικό Μουσείο Ιωαννίνων
    {"id": "byzantine-museum", "categoryId": "museums", "wikidataId": "Q5004703"},  # Βυζαντινό Μουσείο Ιωαννίνων
    {"id": "municipal-art-gallery", "categoryId": "museums", "wikidataId": "Q6936125"},  # Δημοτική Πινακοθήκη Ιωαννίνων
    {"id": "perama-cave", "categoryId": "museums", "wikidataId": "Q16328662"},  # Σπήλαιο Περάματος (τουριστικό αξιοθέατο)
    {"id": "ioannina-island", "categoryId": "museums", "wikidataId": "Q1455063"},  # Νήσος Ιωαννίνων (πολιτιστικός προορισμός)

    # Φύση (5)
    {"id": "lake-pamvotida", "categoryId": "nature", "wikidataId": "Q776956"},  # Λίμνη Παμβώτιδα
    {"id": "mitsikeli", "categoryId": "nature", "wikidataId": "Q752012"},  # Μιτσικέλι
    {"id": "vikos-gorge", "categoryId": "nature", "wikidataId": "Q15061872"},  # Φαράγγι του Βίκου
    {"id": "vikos-aoos-np", "categoryId": "nature", "wikidataId": "Q376436"},  # Εθνικός Δρυμός Βίκου-Αώου
    {"id": "pindus-national-park", "categoryId": "nature", "wikidataId": "Q1989158"},  # Εθνικός Δρυμός Πίνδου
]

# Προαιρετικά extra images ανά POI (για να έχεις >=3 φωτογραφίες στο UI)
# Αν δεν υπάρχουν εδώ, το API θα βάλει fallbacks.
EXTRA_IMAGES = {
    # "ioannina-castle": ["https://...", "https://..."],
}
