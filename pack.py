import struct
import json
import os

def pack():
    # File mapping
    files = {
        "manifest": "manifest.yaml",
        "license": "LICENSE",
        "icon": "icon.png",
        "image": "image.tar"
    }

    # 1. Read all files into memory and track offsets
    blobs = []
    header = {}
    current_offset = 0

    for key, filename in files.items():
        if not os.path.exists(filename):
            print(f"Error: {filename} not found.")
            return

        with open(filename, "rb") as f:
            data = f.read()
            header[key] = {"offset": current_offset, "length": len(data)}
            blobs.append(data)
            current_offset += len(data)

    header_json = json.dumps(header).encode('utf-8')

    # 2. Write the .s9pk file
    output_filename = "nutshell.s9pk"
    with open(output_filename, "wb") as f:
        # Magic Number (S9PK)
        f.write(b"S9PK")
        # Version (1 byte)
        f.write(struct.pack("B", 1))
        # Header Length (4 bytes, Little Endian)
        f.write(struct.pack("<I", len(header_json)))
        # Header (JSON)
        f.write(header_json)
        # Data Blobs
        for data in blobs:
            f.write(data)

    print(f"Successfully packed {output_filename}")

if __name__ == "__main__":
    pack()
