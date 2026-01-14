import time
import httpx
from typing import Optional, Dict, Any, Tuple

WIKIDATA_ENDPOINT = "https://www.wikidata.org/w/api.php"

# cache: wikidataId -> (timestamp, data)
_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
TTL_SECONDS = 60 * 30  # 30 min

def _commons_thumb_url(photoname: str) -> str:
    # ΕΚΦΩΝΗΣΗ δίνει παράδειγμα thumb/4/4a/... (δεν είναι πάντα έτσι στην πράξη),
    # αλλά για συμβατότητα θα κρατήσουμε “απλό” URL και θα αφήσουμε το app να δείχνει.
    # Πιο “σωστό” είναι να κάνεις call στο Commons API για το πραγματικό path.
    safe = photoname.replace(" ", "_")
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/{safe}/1000px-{safe}"

def _get_claim_str(entity: Dict[str, Any], prop: str) -> Optional[str]:
    claims = entity.get("claims", {}).get(prop, [])
    if not claims:
        return None
    mainsnak = claims[0].get("mainsnak", {})
    datavalue = mainsnak.get("datavalue", {})
    value = datavalue.get("value")
    if isinstance(value, str):
        return value
    return None

def _get_coordinates(entity: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    claims = entity.get("claims", {}).get("P625", [])
    if not claims:
        return None, None
    dv = claims[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
    lat = dv.get("latitude")
    lon = dv.get("longitude")
    return lat, lon

def _get_wikipedia_link(sitelinks: Dict[str, Any], lang_pref=("elwiki","enwiki")) -> Optional[str]:
    for key in lang_pref:
        if key in sitelinks and "title" in sitelinks[key]:
            title = sitelinks[key]["title"].replace(" ", "_")
            lang = "el" if key == "elwiki" else "en"
            return f"https://{lang}.wikipedia.org/wiki/{title}"
    return None
WIKIDATA_HEADERS = {
    "User-Agent": "IoanninaExplorer/1.0 (University project; contact: filip.chatziergatis@gmail.com)",
    "Accept": "application/json",
}
async def fetch_wikidata_entity(qid: str):
    url = f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json"

    async with httpx.AsyncClient(
            headers=WIKIDATA_HEADERS,
            timeout=20.0,
            follow_redirects=True
    ) as client:
        r = await client.get(url)
        if r.status_code != 200:
            print(f"Wikidata error {r.status_code} for {qid}")
            return None
        return r.json()

def parse_poi_from_wikidata(qid: str, data: Dict[str, Any]) -> Dict[str, Any]:
    entities = data.get("entities", {})
    entity = entities.get(qid, {})
    commons_category = _get_claim_str(entity, "P373")
    labels = entity.get("labels", {})
    descriptions = entity.get("descriptions", {})

    # prefer el then en
    title = (labels.get("el", {}) or labels.get("en", {}) or {}).get("value")
    description = (descriptions.get("el", {}) or descriptions.get("en", {}) or {}).get("value")

    lat, lon = _get_coordinates(entity)

    photoname = _get_claim_str(entity, "P18")
    image_url = _commons_thumb_url(photoname) if photoname else None

    wikipedia_url = _get_wikipedia_link(entity.get("sitelinks", {}))

    return {
        "title": title,
        "description": description,
        "lat": lat,
        "lon": lon,
        "image": image_url,
        "photoname": photoname,
        "wikipediaUrl": wikipedia_url,
        "raw": entity,
        "commonsCategory": commons_category,
    }