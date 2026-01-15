from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr


class AboutMember(BaseModel):
    name: str
    role: str
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    accessToken: str
    refreshToken: str


class RefreshRequest(BaseModel):
    refreshToken: str


class CategoryOut(BaseModel):
    id: str
    name: str
    count: int


class PoiListItem(BaseModel):
    id: str
    categoryId: str
    wikidataId: str
    title: Optional[str] = None
    description: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    image: Optional[str] = None
    wikipediaUrl: Optional[str] = None


class FactItem(BaseModel):
    label: str
    value: str


class PoiDetails(BaseModel):
    id: str
    categoryId: str
    wikidataId: str
    categoryName: Optional[str] = None
    shortDescription: Optional[str] = None


    title: Optional[str] = None
    description: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

    image: Optional[str] = None
    wikipediaUrl: Optional[str] = None

    images: List[str] = []
    extraText: Optional[str] = None

    # ✅ ΝΕΑ: επιστρέφει facts & raw
    facts: List[FactItem] = []
    raw: Optional[Dict[str, Any]] = None
