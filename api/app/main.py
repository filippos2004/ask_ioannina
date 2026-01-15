from fastapi import FastAPI, HTTPException, Depends, Header
from typing import Optional, List

from .models import (
    AboutMember, LoginRequest, TokenResponse, RefreshRequest,
    SignupRequest,
    CategoryOut, PoiListItem, PoiDetails
)
from .data import TEAM_MEMBERS, CATEGORIES, POIS, EXTRA_IMAGES
from .auth import verify_user, create_access_token, create_refresh_token, decode_token, register_user
from .wikidata import fetch_wikidata_entity, parse_poi_from_wikidata, commons_file_url, fetch_wikipedia_short_description

app = FastAPI(title="Mobile Apps Assignment API", version="1.0.0")


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
    counts = {c["id"]: 0 for c in CATEGORIES}
    for p in POIS:
        if p["categoryId"] in counts:
            counts[p["categoryId"]] += 1
    return [{"id": c["id"], "name": c["name"], "count": counts.get(c["id"], 0)} for c in CATEGORIES]


@app.get("/pois/categories/{id}", response_model=List[PoiListItem])
async def get_pois_by_category(id: str, user: str = Depends(require_access_token)):
    items = [p for p in POIS if p["categoryId"] == id]
    if not any(c["id"] == id for c in CATEGORIES):
        raise HTTPException(status_code=404, detail="Category not found")

    out: List[PoiListItem] = []
    for p in items:
        try:
            wd = await fetch_wikidata_entity(p["wikidataId"])
            if not wd:
                continue

            parsed = parse_poi_from_wikidata(p["wikidataId"], wd)

            # Αν δεν έχει coords, δεν μπορεί να μπει σωστά στον χάρτη
            if parsed.get("lat") is None or parsed.get("lon") is None:
                continue

            out.append({
                "id": p["id"],
                "categoryId": p["categoryId"],
                "wikidataId": p["wikidataId"],
                "title": parsed.get("title"),
                "description": parsed.get("description"),
                "lat": parsed.get("lat"),
                "lon": parsed.get("lon"),
                "image": parsed.get("image"),
                "wikipediaUrl": parsed.get("wikipediaUrl"),
            })
        except Exception as e:
            print(f"⚠️ Skipping POI {p.get('id')} ({p.get('wikidataId')}): {e}")
            continue

    return out


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
    short_desc = None
    if parsed.get("wikipediaUrl"):
        short_desc = await fetch_wikipedia_short_description(parsed["wikipediaUrl"])
    # ---- images (3) ----
    images: List[str] = []
    if parsed.get("image"):
        images.append(parsed["image"])

    extra = EXTRA_IMAGES.get(id, [])
    for filename in extra[:3]:
        images.append(commons_file_url(filename, 1100))

    while len(images) < 3 and len(images) > 0:
        images.append(images[0])

    # ---- extraText from facts ----
    facts = parsed.get("facts", [])
    extra_text = "\n".join([f'{f["label"]}: {f["value"]}' for f in facts]) if facts else ""

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

        # ✅ ΕΠΙΣΤΡΕΦΕΙ ΟΛΑ:
        "facts": facts,
        "extraText": extra_text,
        "raw": parsed.get("raw"),   # ✅ ΟΛΟ το Wikidata entity (claims κτλ)
        "shortDescription": short_desc or parsed.get("description"),
    }
