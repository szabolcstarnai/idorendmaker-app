import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

def process_license_summary_grouped(xml_file: str, output_file: str):
    tree = ET.parse(xml_file)
    root = tree.getroot()

    # license_name -> list of (groupId, artifactId, version, file, url)
    license_map = defaultdict(list)

    for dep in root.findall(".//dependency"):
        group_id = dep.findtext("groupId", default="N/A")
        artifact_id = dep.findtext("artifactId", default="N/A")
        version = dep.findtext("version", default="N/A")
        licenses = dep.findall(".//license")

        for lic in licenses:
            name = lic.findtext("name", default="Unknown License")
            file_ = lic.findtext("file", default="N/A")
            url = lic.findtext("url", default="N/A")
            license_map[name].append((group_id, artifact_id, version, file_, url))

    lines = [
        "THIRD-PARTY LICENSES",
        "",
        "This project uses the following third-party libraries.",
        "Each library is distributed under its respective license.",
        "Please refer to the corresponding license files for full terms.",
        ""
    ]

    for license_name, deps in license_map.items():
        lines.append("=" * 60)
        lines.append(f"License: {license_name}")
        for i, (group_id, artifact_id, version, file_, url) in enumerate(deps, start=1):
            lines.append(f"{i}) {artifact_id} ({group_id}, version {version})")
            lines.append(f"     License file: {file_}")
            lines.append(f"     License URL: {url}")
        lines.append("")

    # Write output
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Third-party licenses written to {output_file}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate grouped third-party licenses file from Maven licenseSummary XML.")
    parser.add_argument("xml_file", help="Path to the licenseSummary.xml")
    parser.add_argument("-o", "--output", default="THIRD-PARTY-LICENSES.txt", help="Output file name")
    args = parser.parse_args()

    if not Path(args.xml_file).is_file():
        print(f"Error: XML file '{args.xml_file}' not found")
    else:
        process_license_summary_grouped(args.xml_file, args.output)
