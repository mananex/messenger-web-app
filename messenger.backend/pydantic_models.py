from pydantic import BaseModel

class User(BaseModel):
    login: str
    password: str

class SessionToken(BaseModel):
    session_token: str