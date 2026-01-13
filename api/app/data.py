# ΒΑΛΕΤΕ ΕΔΩ ΤΑ ΔΙΚΑ ΣΑΣ (3 categories x 5 pois)
TEAM_MEMBERS = [
    {"name": "ΟΝΟΜΑ 1", "am": "AM1"},
    {"name": "ΟΝΟΜΑ 2", "am": "AM2"},
]

# categories id/name όπως θα τα θέλει το openapi
CATEGORIES = [
    {"id": "monuments", "name": "Monuments"},
    {"id": "museums", "name": "Museums"},
    {"id": "nature", "name": "Natural Attractions"},
]

# κάθε POI: id (δικό σας), categoryId, wikidataId (Q-xxx)
POIS = [
    # Monuments (5)
    {"id": "poi-1", "categoryId": "monuments", "wikidataId": "QXXXXXX"},
    {"id": "poi-2", "categoryId": "monuments", "wikidataId": "QXXXXXX"},
    {"id": "poi-3", "categoryId": "monuments", "wikidataId": "QXXXXXX"},
    {"id": "poi-4", "categoryId": "monuments", "wikidataId": "QXXXXXX"},
    {"id": "poi-5", "categoryId": "monuments", "wikidataId": "QXXXXXX"},

    # Museums (5)
    {"id": "poi-6", "categoryId": "museums", "wikidataId": "QXXXXXX"},
    {"id": "poi-7", "categoryId": "museums", "wikidataId": "QXXXXXX"},
    {"id": "poi-8", "categoryId": "museums", "wikidataId": "QXXXXXX"},
    {"id": "poi-9", "categoryId": "museums", "wikidataId": "QXXXXXX"},
    {"id": "poi-10", "categoryId": "museums", "wikidataId": "QXXXXXX"},

    # Nature (5)
    {"id": "poi-11", "categoryId": "nature", "wikidataId": "QXXXXXX"},
    {"id": "poi-12", "categoryId": "nature", "wikidataId": "QXXXXXX"},
    {"id": "poi-13", "categoryId": "nature", "wikidataId": "QXXXXXX"},
    {"id": "poi-14", "categoryId": "nature", "wikidataId": "QXXXXXX"},
    {"id": "poi-15", "categoryId": "nature", "wikidataId": "QXXXXXX"},
]

# Για να εξασφαλίσεις slider >=3 εικόνες:
# μπορείς να βάλεις 2 extra commons filenames per POI σαν fallback.
EXTRA_IMAGES = {
    # "poi-1": ["FileName1.jpg", "FileName2.jpg"],
}
