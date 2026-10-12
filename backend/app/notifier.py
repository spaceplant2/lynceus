from typing import Any
import httpx
import os
from app.config import settings

async def send_critical_alert(ip: str, device_type: str, metric_name: str, value: Any, unit: str):
    webhook_url = os.getenv("WEBHOOK_URL")
    webhook_enabled = os.getenv("WEBHOOK_ENABLED", "false").lower() == "true"
    
    if not webhook_enabled or not webhook_url:
        return
        
    payload = {
        "text": f"🚨 *CRITICAL ALERT* | Device `{ip}` ({device_type})\n*Metric:* `{metric_name}` reached *{value} {unit}*"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            await client.post(webhook_url, json=payload, timeout=5.0)
        except Exception as e:
            print(f"Failed to dispatch webhook alert: {e}")
            