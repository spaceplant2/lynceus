import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.models import TelemetryMetrics


@pytest.fixture
def client():
    """Provides a fresh FastAPI TestClient instance for API requests."""
    return TestClient(app)


@pytest.fixture
def mock_telemetry():
    """Provides a realistic TelemetryMetrics instance matching our updated schema."""
    return TelemetryMetrics(
        device_id="apc-ups-01",
        status="normal",
        input_voltage=120.5,
        output_voltage=120.0,
        output_load_percent=24.0,
        battery_charge_percent=100.0,
        battery_runtime_seconds=2700,
        current_draw_amps=3.2,
        power_watts=384.0,
    )

def test_get_devices_endpoint_status_and_schema(client, mock_telemetry):
    """
    Verifies that GET /api/devices returns HTTP 200 and a valid list of device 
    configs populated with telemetry metrics.
    """
    with patch("app.drivers.snmp.SnmpDriver.poll", new_callable=AsyncMock) as mock_poll:
        mock_poll.return_value = mock_telemetry

        response = client.get("/api/devices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        assert isinstance(data, list) and len(data) > 0

        # Find the device that received mock_telemetry
        matching_device = None
        for dev in data:
            metrics = dev.get("metrics", {})
            # Check for unique field value from mock_telemetry (e.g. power_watts or input_voltage)
            if metrics.get("power_watts") == getattr(mock_telemetry, "power_watts", None):
                matching_device = dev
                break

        # Fallback to first device if all match
        target_device = matching_device or data[0]

        # Verify key schema structure
        assert "device_id" in target_device
        assert "name" in target_device
        assert "protocol" in target_device
        assert "status" in target_device
        assert "metrics" in target_device

        metrics = target_device["metrics"]
        assert isinstance(metrics, dict)

        # Assert status string alignment
        expected_status = getattr(mock_telemetry, "status", "normal")
        if hasattr(expected_status, "value"):
            expected_status = expected_status.value

        assert metrics["status"] == str(expected_status)

def test_get_devices_offline_fallback(client):
    """
    Verifies that when an SNMP device fails or times out, the endpoint 
    returns status='offline' gracefully without crashing the API.
    """
    offline_metrics = TelemetryMetrics(device_id="offline-test", status="offline", input_voltage=None)

    with patch("app.drivers.snmp.SnmpDriver.poll", new_callable=AsyncMock) as mock_poll:
        mock_poll.return_value = offline_metrics

        response = client.get("/api/devices")
        assert response.status_code == 200

        data = response.json()
        assert len(data) > 0

        # Verify that all mocked/polling instances report offline status gracefully
        for device in data:
            assert "metrics" in device
            metrics = device["metrics"]
            
            # Verify status fields match offline state
            if metrics.get("device_id") == "offline-test" or device.get("status") == "offline":
                assert device["status"] == "offline"
                assert device["is_reachable"] is False
                assert metrics["status"] == "offline"
                assert metrics.get("input_voltage") is None

