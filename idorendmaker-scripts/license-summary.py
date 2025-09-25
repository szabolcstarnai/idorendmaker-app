#!/usr/bin/env python3
import sys
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import urllib.parse  # <-- for URL encoding

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate_third_party_licenses.py <root_dir>")
        sys.exit(1)

    root_dir = Path(sys.argv[1]).resolve()
    licenses_dir = root_dir / "licenses"

    if not licenses_dir.exists():
        print(f"licenses/ folder not found in {root_dir}")
        sys.exit(1)

    output_file = root_dir / "THIRD-PARTY-LICENSES.md"
    lines = ["# Third-Party Licenses", ""]

    # Extras
    extras_json = licenses_dir / "extras" / "extras.json"
    if extras_json.exists():
        with extras_json.open("r", encoding="utf-8-sig") as f:  # <-- use utf-8-sig
            extras = json.load(f)
        if extras:
            lines.append("## Extra Credits")
            for key, val in extras.items():
                lines.append(f"- **{key}**: {val}")
            lines.append("")

    # Component sections
    for component_dir in sorted(licenses_dir.iterdir()):
        if component_dir.is_dir() and component_dir.name != "extras":
            component_name = component_dir.name
            lines.append(f"## {component_name}")
            lines.append("| Dependency | License | File |")
            lines.append("| --- | --- | --- |")

            # XML licenses
            licenses_xml = component_dir / "licenses.xml"
            if licenses_xml.exists():
                tree = ET.parse(licenses_xml)
                root = tree.getroot()
                for dep in root.findall("dependencies/dependency"):
                    group = dep.find("groupId").text if dep.find("groupId") is not None else ""
                    artifact = dep.find("artifactId").text if dep.find("artifactId") is not None else ""
                    licenses = dep.findall("licenses/license")
                    for lic in licenses:
                        name = lic.find("name").text if lic.find("name") is not None else ""
                        file_elem = lic.find("file")
                        file_name = file_elem.text if file_elem is not None else ""
                        file_path = licenses_dir / file_name
                        if file_path.exists():
                            file_url = urllib.parse.quote(str(file_name))  # <-- encode spaces
                            lines.append(f"| {group}:{artifact} | {name} | [{file_name}](./licenses/{file_url}) |")
                        else:
                            lines.append(f"| {group}:{artifact} | {name} | MISSING FILE: {file_name} |")

            # JSON licenses
            licenses_json = component_dir / "licenses.json"
            if licenses_json.exists():
                with licenses_json.open("r", encoding="utf-8-sig") as f:
                    data = json.load(f)
                for key, info in data.items():
                    license_file_path = Path(info.get("licenseFile", ""))
                    if license_file_path.exists():
                        dest_file = licenses_dir / f"{component_name}_{license_file_path.name}"
                        dest_file.write_bytes(license_file_path.read_bytes())
                        file_url = urllib.parse.quote(dest_file.name)
                        lines.append(f"| {key} | {info.get('licenses','')} | [{dest_file.name}](./licenses/{file_url}) |")
                    else:
                        lines.append(f"| {key} | {info.get('licenses','')} | MISSING FILE |")
            lines.append("")

    output_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"THIRD-PARTY-LICENSES.md generated at {output_file}")

if __name__ == "__main__":
    main()
