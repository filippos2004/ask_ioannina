from fastapi import FastAPI, HTTPException, Depends, Header
from typing import Optional, List
from urllib.parse import quote

from .models import (
    AboutMember, LoginRequest, TokenResponse, RefreshRequest,
    SignupRequest,
    CategoryOut, PoiListItem, PoiDetails
)
from .data import TEAM_MEMBERS, CATEGORIES, POIS, EXTRA_IMAGES
from .auth import verify_user, create_access_token, create_refresh_token, decode_token, register_user
from .wikidata import fetch_wikidata_entity, parse_poi_from_wikidata
def get_lat_lon(p: dict):
    # κοινές περιπτώσεις σε datasets
    if "lat" in p and "lon" in p:
        return p["lat"], p["lon"]
    if "latitude" in p and "longitude" in p:
        return p["latitude"], p["longitude"]
    if "lat" in p and "lng" in p:
        return p["lat"], p["lng"]
    if "coordinates" in p and isinstance(p["coordinates"], dict):
        c = p["coordinates"]
        if "lat" in c and "lon" in c:
            return c["lat"], c["lon"]
        if "latitude" in c and "longitude" in c:
            return c["latitude"], c["longitude"]
    if "location" in p and isinstance(p["location"], dict):
        c = p["location"]
        if "lat" in c and "lon" in c:
            return c["lat"], c["lon"]
        if "latitude" in c and "longitude" in c:
            return c["latitude"], c["longitude"]
    # αν τα έχει σαν λίστα [lon, lat]
    if "location" in p and isinstance(p["location"], (list, tuple)) and len(p["location"]) >= 2:
        lon, lat = p["location"][0], p["location"][1]
        return lat, lon

    raise KeyError("No coordinates found in POI")

app = FastAPI(title="Mobile Apps Assignment API", version="1.0.0")



def commons_file_url(filename: str, width: int = 1100) -> str:
    # ✅ σωστό URL για εικόνες από Wikimedia Commons
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(filename)}?width={width}"


def require_access_token(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid access token")
    return payload["sub"]


@app.get("/about", response_model=List[AboutMember])
def about():
    return TEAM_MEMBERS


@app.post("/api/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    if not verify_user(body.email, body.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "accessToken": create_access_token(body.email),
        "refreshToken": create_refresh_token(body.email),
    }


@app.post("/api/auth/signup", response_model=TokenResponse)
def signup(body: SignupRequest):
    # very simple registration (stores hashed password in app/users.json)
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    try:
        register_user(body.email, body.password)
    except ValueError:
        raise HTTPException(status_code=409, detail="User already exists")
    return {
        "accessToken": create_access_token(body.email),
        "refreshToken": create_refresh_token(body.email),
    }


@app.post("/api/auth/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest):
    payload = decode_token(body.refreshToken)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    email = payload["sub"]
    return {
        "accessToken": create_access_token(email),
        "refreshToken": create_refresh_token(email),
    }


@app.get("/pois/categories", response_model=List[CategoryOut])
def get_categories(user: str = Depends(require_access_token)):
    # count pois per category
    counts = {c["id"]: 0 for c in CATEGORIES}
    for p in POIS:
        if p["categoryId"] in counts:
            counts[p["categoryId"]] += 1
    return [{"id": c["id"], "name": c["name"], "count": counts.get(c["id"], 0)} for c in CATEGORIES]


# ✅ ΑΛΛΑΓΜΕΝΟ: Δεν κάνουμε Wikidata calls εδώ (για να μην τρώμε 403/500)
@app.get("/pois/categories/{id}", response_model=List[PoiListItem])
async def get_pois_by_category(id: str, user: str = Depends(require_access_token)):
    if not any(c["id"] == id for c in CATEGORIES):
        raise HTTPException(status_code=404, detail="Category not found")

    items = [p for p in POIS if p["categoryId"] == id]

    out: List[PoiListItem] = []
    for p in items:
        try:
            wd = await fetch_wikidata_entity(p["wikidataId"])
            if not wd:
                continue  # αν δεν απαντήσει το wikidata, απλά το προσπερνάμε

            parsed = parse_poi_from_wikidata(p["wikidataId"], wd)

            # αν δεν έχει coords, skip (δεν μπορεί να μπει στον χάρτη)
            if parsed.get("lat") is None or parsed.get("lon") is None:
                continue

            out.append({
                "id": p["id"],
                "categoryId": p["categoryId"],
                "wikidataId": p["wikidataId"],
                "title": parsed.get("title") or "POI",
                "description": parsed.get("description") or "",
                "lat": parsed["lat"],
                "lon": parsed["lon"],
                "image": parsed.get("image"),
                "wikipediaUrl": parsed.get("wikipediaUrl"),
            })
        except Exception as e:
            # ✅ να μην πέφτει όλο το endpoint για 1 POI
            print(f"⚠️ Skipping POI {p.get('id')} ({p.get('wikidataId')}): {e}")
            continue

    return out


# ✅ Details: εδώ φέρνουμε Wikidata και εικόνες
@app.get("/pois/{id}", response_model=PoiDetails)
async def get_poi_details(id: str, user: str = Depends(require_access_token)):
    p = next((x for x in POIS if x["id"] == id), None)
    if not p:
        raise HTTPException(status_code=404, detail="POI not found")

    cat = next((c for c in CATEGORIES if c["id"] == p["categoryId"]), None)

    wd = await fetch_wikidata_entity(p["wikidataId"])
    if not wd:
        raise HTTPException(status_code=502, detail="Wikidata unavailable")

    parsed = parse_poi_from_wikidata(p["wikidataId"], wd)

    images: List[str] = []

    # 1) βασική P18 (αν υπάρχει) - από wikidata.py
    if parsed.get("image"):
        images.append(parsed["image"])

    # 2) extra images (αν έχεις βάλει filenames) -> σωστό URL
    extra = EXTRA_IMAGES.get(id, [])
    for filename in extra[:3]:
        images.append(commons_file_url(filename, 1100))

    # 3) αν ακόμη <3, συμπλήρωσε με την πρώτη (ώστε να μην σπάει το UI)
    while len(images) < 3 and len(images) > 0:
        images.append(images[0])

    return {
        "id": p["id"],
        "categoryId": p["categoryId"],
        "wikidataId": p["wikidataId"],
        "categoryName": cat["name"] if cat else None,
        "title": parsed.get("title"),
        "description": parsed.get("description"),
        "lat": parsed.get("lat"),
        "lon": parsed.get("lon"),
        "image": parsed.get("image"),
        "wikipediaUrl": parsed.get("wikipediaUrl"),
        "images": images,
        "extraText": "Optional extra text you can enrich later.",
        "raw": None,  # βάλε parsed["raw"] αν θες debug
    }
