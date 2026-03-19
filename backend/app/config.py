"""
Buscador DTIC — Configuration
Pydantic Settings simplificado para o buscador standalone (apenas DTIC).
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Configurações carregadas do .env"""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # DTIC Database
    db_host_dtic: str = Field(default="10.72.30.39", alias="DB_HOST_DTIC")
    db_port_dtic: int = Field(default=3306, alias="DB_PORT_DTIC")
    db_name_dtic: str = Field(default="glpi2db", alias="DB_NAME_DTIC")
    db_user_dtic: str = Field(default="cau_r", alias="DB_USER_DTIC")
    db_pass_dtic: str = Field(default="", alias="DB_PASS_DTIC")

    # App
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    app_port: int = Field(default=8000, alias="APP_PORT")
    app_timezone: str = Field(default="America/Sao_Paulo", alias="APP_TIMEZONE")
    cors_origins_raw: str = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    @property
    def db_dsn(self) -> str:
        return f"mysql+aiomysql://{self.db_user_dtic}:{self.db_pass_dtic}@{self.db_host_dtic}:{self.db_port_dtic}/{self.db_name_dtic}"


# Singleton
settings = Settings()
