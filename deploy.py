#!/usr/bin/env python3
"""
Deploy the production build through the Contabo storage manager.

Usage:
  1. Build the project: npm run build
  2. Export the deploy credential: export DEPLOY_TOKEN=...
  3. Run the deployment: python deploy.py

This script contacts https://storage.noahcohn.com to upload the build as a
single zip archive. The server extracts it and pushes all files over one
persistent SFTP connection. Actual FTP/SFTP credentials never leave the VPS.

Requirements:
  pip install requests
"""

import io
import os
import sys
import zipfile
from pathlib import Path

import requests


PROJECT_NAME = "rain-edit"
BUILD_DIR = "dist"
CONTABO_BASE_URL = "https://storage.noahcohn.com"
DEPLOY_FOLDER = ""  # Empty uses PROJECT_NAME as the remote target folder.
DEPLOY_TOKEN = os.environ.get("DEPLOY_TOKEN")


def build_zip(build_path: Path) -> bytes:
    """Zip the contents of build_path into an in-memory archive."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(build_path.rglob("*")):
            if file.is_dir():
                continue
            relative_path = file.relative_to(build_path)
            if any(
                part in (".git", "node_modules", "__pycache__")
                for part in relative_path.parts
            ):
                continue
            archive.write(file, str(relative_path))
            print(f"  + {relative_path}")
    return buffer.getvalue()


def deploy_bundle(build_path: Path) -> bool:
    """Zip the build and upload it as a single bundle."""
    target_folder = DEPLOY_FOLDER or PROJECT_NAME
    url = f"{CONTABO_BASE_URL}/api/deploy/{PROJECT_NAME}/bundle"
    headers = {"X-Deploy-Token": DEPLOY_TOKEN}

    print("Building zip archive...")
    zip_bytes = build_zip(build_path)
    print(f"Archive size: {len(zip_bytes) / 1024:.1f} KB\n")

    print("Uploading bundle...")
    try:
        response = requests.post(
            url,
            files={"bundle": ("build.zip", zip_bytes, "application/zip")},
            data={"target_folder": target_folder},
            headers=headers,
            timeout=300,
        )
    except Exception as exc:
        print(f"  ✗ Upload exception: {exc}")
        return False

    if response.status_code == 200:
        data = response.json()
        print(f"  ✓ {data.get('uploaded', 0)} files uploaded")
        if data.get("failed"):
            print("  Failures:")
            for failure in data["failed"]:
                print(f"    ✗ {failure['path']}: {failure['error']}")
        return not data.get("failed")

    print(f"  ✗ {response.status_code}: {response.text[:400]}")
    return False


def main() -> None:
    if not DEPLOY_TOKEN:
        print("ERROR: DEPLOY_TOKEN environment variable is required.", file=sys.stderr)
        print("Set it with: export DEPLOY_TOKEN='<rotated token>'", file=sys.stderr)
        sys.exit(1)

    print(f"\n=== Deploying '{PROJECT_NAME}' via Contabo storage ===\n")

    build_path = Path(BUILD_DIR)
    if not build_path.exists() or not build_path.is_dir():
        print(f"ERROR: Build directory '{BUILD_DIR}/' does not exist.")
        print("Please run `npm run build` first.")
        sys.exit(1)

    try:
        health = requests.get(f"{CONTABO_BASE_URL}/api/deploy/health", timeout=10)
        if health.status_code == 200:
            print(f"Contabo deploy service: {health.json().get('status', 'unknown')}")
    except Exception:
        print("Warning: Could not contact storage.noahcohn.com (continuing anyway).")

    print()
    success = deploy_bundle(build_path)

    status = "Deployment complete" if success else "Deployment finished with errors"
    print(f"\n=== {status} ===")
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
