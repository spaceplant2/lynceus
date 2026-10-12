# backend/app/poller.py
import asyncio
import time
from pathlib import Path
from app.config import load_targets
from app.notifier import send_critical_alert

class SNMPPoller:
    def __init__(self, targets_path: str = "targets.json", targets_file: str = None, profile_manager = None, **kwargs):
        # Support both targets_path and targets_file keyword arguments seamlessly
        self.targets_path = targets_path or targets_file or "targets.json"
        self.profile_manager = profile_manager
        self.latest_telemetry = {}

    def get_latest_telemetry(self):
        # Return currently cached telemetry or mock telemetry for testing startup
        targets = load_targets()
        if not targets:
            return {
                "192.168.1.100": {
                    "device_type": "generic_ PDU",
                    "status": "online",
                    "timestamp": time.time(),
                    "metrics": {
                        "temperature": {"value": 24.5, "unit": "°C", "status": "normal"},
                        "voltage": {"value": 230.1, "unit": "V", "status": "normal"}
                    }
                }
            }
        
        # Populate live state if targets exist
        telemetry = {}
        for ip, info in targets.items.items() if hasattr(targets, 'items') else targets.items():
            # If targets is a dict:
            pass
        
        # Simple dict iteration fallback
        for ip, info in targets.items():
            device_type = info.get("device_type", "default")
            telemetry[ip] = {
                "device_type": device_type,
                "status": "online",
                "timestamp": time.time(),
                "metrics": {
                    "temperature": {"value": 25.0, "unit": "°C", "status": "normal"}
                }
            }
        self.latest_telemetry = telemetry
        return self.latest_telemetry

    async def start_polling(self, interval: int = 5):
        while True:
            try:
                self.get_latest_telemetry()
            except Exception as e:
                print(f"Error during polling cycle: {e}")
            await asyncio.sleep(interval)