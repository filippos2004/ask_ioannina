from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from typing import List
from pydantic import Field


class AboutMember(BaseModel):
    name: str
    am: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
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
    image: Optional[str] = None  # URL
    wikipediaUrl: Optional[str] = None

class PoiDetails(PoiListItem):
    categoryName: Optional[str] = None
    images: List[str] = Field(default_factory=list)  # >= 3 in UI
    extraText: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None  # debug/optional
