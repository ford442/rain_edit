"""Legacy interactive SFTP deployment helper.

Prefer deploy.py for current deployments. This helper deliberately prompts for
the SFTP password and never stores it in source control.
"""

import getpass
import os

import paramiko


HOSTNAME = "1ink.us"
PORT = 22
USERNAME = "ford442"

LOCAL_DIRECTORY = "dist"
REMOTE_DIRECTORY = "test.1ink.us/rain-edit"


def upload_directory(sftp_client, local_path, remote_path):
    """Recursively upload a directory and its contents."""
    print(f"Creating remote directory: {remote_path}")
    try:
        sftp_client.mkdir(remote_path)
    except IOError:
        print(f"Directory {remote_path} already exists.")

    for item in os.listdir(local_path):
        local_item_path = os.path.join(local_path, item)
        remote_item_path = f"{remote_path}/{item}"

        if os.path.isfile(local_item_path):
            print(f"Uploading file: {local_item_path} -> {remote_item_path}")
            sftp_client.put(local_item_path, remote_item_path)
        elif os.path.isdir(local_item_path):
            upload_directory(sftp_client, local_item_path, remote_item_path)


def main():
    """Connect to the server and upload the production bundle."""
    password = getpass.getpass(f"Enter password for {USERNAME}@{HOSTNAME}: ")

    transport = None
    sftp = None
    try:
        transport = paramiko.Transport((HOSTNAME, PORT))
        print("Connecting to server...")
        transport.connect(username=USERNAME, password=password)
        print("Connection successful!")

        sftp = paramiko.SFTPClient.from_transport(transport)
        print(f"Starting upload of '{LOCAL_DIRECTORY}' to '{REMOTE_DIRECTORY}'...")
        upload_directory(sftp, LOCAL_DIRECTORY, REMOTE_DIRECTORY)
        print("\n✅ Deployment complete!")
    except Exception as exc:
        print(f"❌ An error occurred: {exc}")
    finally:
        if sftp:
            sftp.close()
        if transport:
            transport.close()
        print("Connection closed.")


if __name__ == "__main__":
    if not os.path.exists(LOCAL_DIRECTORY):
        print(
            f"Error: Local directory '{LOCAL_DIRECTORY}' not found. "
            "Did you run 'npm run build' first?"
        )
    else:
        main()
