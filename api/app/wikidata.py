import time
import httpx
from typing import Optional, Dict, Any, Tuple, List
from urllib.parse import quote, unquote
import re

# cache: qid -> (timestamp, data)
_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
TTL_SECONDS = 60 * 30  # 30 minutes

WIKIDATA_HEADERS = {
    "User-Agent": "IoanninaExplorer/1.0 (University project; contact: filip.chatziergatis@gmail.com)",
    "Accept": "application/json",
}
async def fetch_wikipedia_short_description(wikipedia_url: str) -> Optional[str]:
    if not wikipedia_url:
        return None

    lang = "el" if "el.wikipedia.org" in wikipedia_url else "en"
    title = wikipedia_url.split("/wiki/")[-1]
    title = unquote(title)

    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}"

    async with httpx.AsyncClient(headers=WIKIDATA_HEADERS, timeout=10.0) as client:
        r = await client.get(url)
        if r.status_code != 200:
            return None

        data = r.json()
        extract = data.get("extract")
        if not extract:
            return None

        # 👉 Κράτα μόνο τις πρώτες 2–3 προτάσεις
        sentences = re.split(r'(?<=[.!;])\s+', extract)
        return " ".join(sentences[:3])

def _cache_get(key: str) -> Optional[Dict[str, Any]]:
    item = _CACHE.get(key)
    if not item:
        return None
    ts, data = item
    if time.time() - ts > TTL_SECONDS:
        _CACHE.pop(key, None)
        return None
    return data


def _cache_set(key: str, data: Dict[str, Any]) -> None:
    _CACHE[key] = (time.time(), data)


def commons_file_url(filename: str, width: int = 1100) -> str:
    # ✅ σωστό URL από Wikimedia Commons
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(filename)}?width={width}"


async def fetch_wikidata_entity(qid: str) -> Optional[Dict[str, Any]]:
    """
    Reliable endpoint (χωρίς wbgetentities): Special:EntityData
    """
    cache_key = f"wd:{qid}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    url = f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json"
    try:
        async with httpx.AsyncClient(
                headers=WIKIDATA_HEADERS,
                timeout=20.0,
                follow_redirects=True
        ) as client:
            r = await client.get(url)
            if r.status_code != 200:
                print(f"⚠️ Wikidata returned {r.status_code} for {qid}")
                return None

            data = r.json()
            _cache_set(cache_key, data)
            return data
    except Exception as e:
        print(f"⚠️ Wikidata request failed for {qid}: {e}")
        return None


# ------------------ Wikidata parsing helpers ------------------

def _get_entity(data: Dict[str, Any], qid: str) -> Dict[str, Any]:
    return (data.get("entities") or {}).get(qid) or {}


def _get_claims(entity: Dict[str, Any], prop: str) -> List[Dict[str, Any]]:
    return (entity.get("claims") or {}).get(prop) or []


def _get_claim_str(entity: Dict[str, Any], prop: str) -> Optional[str]:
    claims = _get_claims(entity, prop)
    if not claims:
        return None
    dv = claims[0].get("mainsnak", {}).get("datavalue", {})
    v = dv.get("value")
    return v if isinstance(v, str) else None


def _get_claim_url(entity: Dict[str, Any], prop: str) -> Optional[str]:
    return _get_claim_str(entity, prop)


def _get_claim_quantity(entity: Dict[str, Any], prop: str) -> Optional[float]:
    claims = _get_claims(entity, prop)
    if not claims:
        return None
    v = claims[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
    amount = v.get("amount")
    if not isinstance(amount, str):
        return None
    try:
        return float(amount.replace("+", ""))
    except:
        return None


def _get_claim_time_year(entity: Dict[str, Any], prop: str) -> Optional[str]:
    claims = _get_claims(entity, prop)
    if not claims:
        return None
    v = claims[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
    t = v.get("time")
    if not isinstance(t, str) or len(t) < 5:
        return None
    # "+1880-00-00T00:00:00Z" -> "1880"
    return t[1:5]


def _get_claim_entity_id(entity: Dict[str, Any], prop: str) -> Optional[str]:
    claims = _get_claims(entity, prop)
    if not claims:
        return None
    v = claims[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
    # {"id":"Qxxx"...}
    if isinstance(v, dict):
        return v.get("id")
    return None


def _get_coordinates(entity: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    claims = _get_claims(entity, "P625")
    if not claims:
        return None, None
    v = claims[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
    if not isinstance(v, dict):
        return None, None
    return v.get("latitude"), v.get("longitude")


def _get_wikipedia_link(sitelinks: Dict[str, Any], lang_pref=("elwiki", "enwiki")) -> Optional[str]:
    for key in lang_pref:
        sl = sitelinks.get(key)
        if sl and "title" in sl:
            title = sl["title"].replace(" ", "_")
            lang = "el" if key == "elwiki" else "en"
            return f"https://{lang}.wikipedia.org/wiki/{title}"
    return None


def parse_poi_from_wikidata(qid: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Επιστρέφει:
    - title/description/coords/image/wikipediaUrl
    - facts: ωραία “έξτρα” που μπορείς να δείξεις στο 'Περισσότερα'
    - raw: ΟΛΟ το Wikidata entity (claims/labels/sitelinks κτλ)
    """
    entity = _get_entity(data, qid)

    labels = entity.get("labels", {}) or {}
    descriptions = entity.get("descriptions", {}) or {}
    sitelinks = entity.get("sitelinks", {}) or {}

    title = (labels.get("el") or labels.get("en") or {}).get("value")
    description = (descriptions.get("el") or descriptions.get("en") or {}).get("value")

    lat, lon = _get_coordinates(entity)

    photoname = _get_claim_str(entity, "P18")  # image filename
    image_url = commons_file_url(photoname, 1200) if photoname else None

    wikipedia_url = _get_wikipedia_link(sitelinks)

    # ===== EXTRA FACTS (ό,τι υπάρχει) =====
    facts: List[Dict[str, str]] = []

    # Official website
    website = _get_claim_url(entity, "P856")
    if website:
        facts.append({"label": "Ιστότοπος", "value": website})

    # Elevation
    elevation = _get_claim_quantity(entity, "P2044")
    if elevation is not None:
        facts.append({"label": "Υψόμετρο", "value": f"{int(round(elevation))} m"})

    # Inception year
    year = _get_claim_time_year(entity, "P571")
    if year:
        facts.append({"label": "Έτος", "value": year})

    # Commons category
    commons_category = _get_claim_str(entity, "P373")
    if commons_category:
        facts.append({"label": "Commons category", "value": commons_category})

    # Located in (admin entity)
    located_in_q = _get_claim_entity_id(entity, "P131")
    if located_in_q:
        facts.append({"label": "Τοποθεσία (Wikidata)", "value": f"https://www.wikidata.org/wiki/{located_in_q}"})

    # Instance of
    instance_of_q = _get_claim_entity_id(entity, "P31")
    if instance_of_q:
        facts.append({"label": "Τύπος (Wikidata)", "value": f"https://www.wikidata.org/wiki/{instance_of_q}"})

    # Country
    country_q = _get_claim_entity_id(entity, "P17")
    if country_q:
        facts.append({"label": "Χώρα (Wikidata)", "value": f"https://www.wikidata.org/wiki/{country_q}"})

    return {
        "title": title,
        "description": description,
        "lat": lat,
        "lon": lon,
        "image": image_url,
        "wikipediaUrl": wikipedia_url,
        "facts": facts,
        "raw": entity,  # ✅ ΟΛΟ το entity
    }
