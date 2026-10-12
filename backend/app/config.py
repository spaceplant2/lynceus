import os
import json
from pathlib import Path
import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Lynceus Backend Telemetry"
    debug: bool = True
    poll_interval_seconds: int = 5
    profiles_dir: str = os.getenv("PROFILES_DIR", "./profiles")
    targets_file: str = os.getenv("TARGETS_FILE", "./targets.json")
    webhook_enabled: bool = False
    webhook_url: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()

def load_targets():
    path = Path(settings.targets_file)
    if not path.exists():
        return {}
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading targets file: {e}")
        return {}

class ProfileManager:
    def __init__(self, profiles_dir: str):
        self.profiles_dir = Path(profiles_dir)
        self.profiles = {}
        self.load_profiles()

    def load_profiles(self):
        self.profiles = {}
        if not self.profiles_dir.exists():
            print(f"Profiles directory {self.profiles_dir} does not exist.")
            return
        
        for file_path in self.profiles_dir.glob("*.yaml"):
            try:
                with open(file_path, "r") as f:
                    data = yaml.safe_load(f)
                    if data and "device_type" in data:
                        self.profiles[data["device_type"]] = data
            except Exception as e:
                print(f"Error loading profile {file_path}: {e}")
        
        for file_path in self.profiles_dir.glob("*.yml"):
            try:
                with open(file_path, "r") as f:
                    data = yaml.safe_load(f)
                    if data and "device_type" in data:
                        self.profiles[data["device_type"]] = data
            except Exception as e:
                print(f"Error loading profile {file_path}: {e}")

    def get_profiles(self):
        return self.profiles

# Instantiated so `profile_manager` can be imported directly by main.py
profile_manager = ProfileManager(settings.profiles_dir)
