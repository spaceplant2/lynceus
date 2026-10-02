
import asyncio
import logging
from typing import Dict, Any

from app.config import DeviceConfig
from app.drivers.snmp import SnmpDriver
from app.profiles.loader import ProfileLoader

# Configure logging to display debug output during test execution
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_profiles")


def test_profile_loader():
    """Verify that ProfileLoader correctly loads, validates, and caches profile YAMLs."""
    print("\n--- 1. Testing ProfileLoader ---")
    ProfileLoader.clear_cache()

    # Test loading explicit profiles
    profiles_to_test = ["rfc1628_default", "apc_powernet", "eaton_xups", "cyberpower"]
    for pid in profiles_to_test:
        profile = ProfileLoader.get_profile(pid)
        print(f"  [PASS] Profile '{profile.id}': Loaded '{profile.name}' ({len(profile.oids)} OIDs)")

    # Test fallback mechanism for invalid profile name
    fallback_profile = ProfileLoader.get_profile("non_existent_profile")
    assert fallback_profile.id == "rfc1628_default"
    print("  [PASS] Missing profile correctly fell back to 'rfc1628_default'")


def test_transform_logic():
    """Verify SnmpDriver metric transformation logic for scaling factors and types."""
    print("\n--- 2. Testing Transformation Logic ---")

    # Initialize SnmpDriver with APC profile configuration
    apc_config = DeviceConfig(
        id="test-apc",
        name="Test APC UPS",
        device_type="ups",
        driver="snmp",
        host="127.0.0.1",
        profile="apc_powernet",
    )
    driver = SnmpDriver(apc_config)

    # Test current scale (deciamps to float amps: 52 -> 5.2 A)
    raw_current = 52
    scaled_current = driver._apply_transform("current_draw_amps", raw_current)
    assert scaled_current == 5.2
    print(f"  [PASS] APC Current Transform: {raw_current} raw -> {scaled_current} A")

    # Test battery runtime scale (minutes to seconds: 45 min -> 2700 s)
    raw_runtime_mins = 45
    scaled_runtime_secs = driver._apply_transform("battery_runtime_seconds", raw_runtime_mins)
    assert scaled_runtime_secs == 2700
    print(f"  [PASS] APC Runtime Transform: {raw_runtime_mins} min -> {scaled_runtime_secs} s")

    # Test power status code mapping (APC code 3 -> 'on_battery')
    raw_status = 3
    mapped_status = driver._map_power_status(raw_status)
    assert mapped_status == "on_battery"
    print(f"  [PASS] APC Status Mapping: Code {raw_status} -> '{mapped_status}'")


async def test_offline_poll_fallback():
    """Verify SnmpDriver poll returns offline status and null metrics on unroutable hosts."""
    print("\n--- 3. Testing Driver Poll Fallback (Unreachable Host) ---")

    offline_config = DeviceConfig(
        id="offline-test",
        name="Offline Test UPS",
        device_type="ups",
        driver="snmp",
        host="192.0.2.1",  # Non-routable documentation IP
        port=161,
        profile="eaton_xups",
    )
    driver = SnmpDriver(offline_config)

    metrics = await driver.poll()
    assert metrics.power_status == "offline"  # <--- Changed from metrics.status
    assert metrics.input_voltage is None
    assert metrics.current_draw_amps is None
    print(f"  [PASS] Offline device polled safely: power_status='{metrics.power_status}', metrics=null")


if __name__ == "__main__":
    print("=" * 60)
    print(" Running Lynceus v0.3.0 Profile & Driver Verification Suite ")
    print("=" * 60)

    test_profile_loader()
    test_transform_logic()
    asyncio.run(test_offline_poll_fallback())

    print("\n" + "=" * 60)
    print(" ALL TESTS PASSED SUCCESSFULLY! ")
    print("=" * 60)
    