#!/usr/bin/env python3
import sys
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import html
import re

def url_escape(name: str) -> str:
    """Escape spaces for Markdown links"""
    return name.replace(" ", "%20")

def safe_anchor(name: str) -> str:
    """Generate a safe HTML anchor from a dependency name"""
    # replace any character not [a-zA-Z0-9-_] with '-'
    return re.sub(r'[^a-zA-Z0-9_-]', '-', name)

def process_xml_component(component_dir: Path, licenses_dir: Path, lines: list):
    licenses_xml = component_dir / "licenses.xml"
    if not licenses_xml.exists():
        return
    component_name = component_dir.name
    lines.append(f"## {component_name}")
    lines.append("| Dependency | License | File |")
    lines.append("| --- | --- | --- |")

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
                file_link = f"[{file_name}](./licenses/{url_escape(file_name)})"
            else:
                file_link = f"MISSING FILE: {file_name}"
                print(f"WARNING: {file_path} does not exist.")
            lines.append(f"| {group}:{artifact} | {name} | {file_link} |")
    lines.append("")

def process_json_component(component_dir: Path, lines: list):
    licenses_json = component_dir / "licenses.json"
    if not licenses_json.exists():
        return
    component_name = component_dir.name
    lines.append(f"## {component_name}")
    lines.append("| Dependency | License | File |")
    lines.append("| --- | --- | --- |")

    html_file = component_dir / "ALL-THIRD-PARTY-LICENSES.html"
    html_lines = [
        "<!DOCTYPE html>",
        "<html>",
        "<head><meta charset='UTF-8'><title>All Third-Party Licenses</title></head>",
        "<body>",
        f"<h1>All Third-Party Licenses - {html.escape(component_name)}</h1>"
    ]

    try:
        with licenses_json.open("r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except Exception as e:
        print(f"ERROR: Failed to read {licenses_json}: {e}")
        return

    # Create Table of Contents
    html_lines.append("<h2>Table of Contents</h2>")
    html_lines.append("<ul>")
    anchors = {}
    for dep_name in sorted(data.keys()):
        anchor = safe_anchor(dep_name)
        anchors[dep_name] = anchor
        html_lines.append(f"<li><a href='#{html.escape(anchor)}'>{html.escape(dep_name)}</a></li>")
    html_lines.append("</ul>")

    # Add each license content
    for dep_name, dep_info in sorted(data.items()):
        license_file = Path(dep_info.get("licenseFile", ""))
        license_type = dep_info.get("licenses", "")
        anchor = anchors.get(dep_name)

        if license_file.exists():
            try:
                content = license_file.read_text(encoding="utf-8-sig", errors="replace")
            except Exception as e:
                content = f"ERROR: could not read {license_file}: {e}"
                print(f"ERROR: {content}")
        else:
            content = f"MISSING LICENSE FILE: {license_file}"
            print(f"WARNING: {content}")

        html_lines.append(f"<h2 id='{html.escape(anchor)}'>{html.escape(dep_name)}</h2>")
        html_lines.append(f"<pre>{html.escape(content)}</pre>")

        # Reference the anchor in the Markdown
        lines.append(f"| {dep_name} | {license_type} | [View](./licenses/{component_name}/ALL-THIRD-PARTY-LICENSES.html#{anchor}) |")

    html_lines.append("</body></html>")

    try:
        html_file.write_text("\n".join(html_lines), encoding="utf-8-sig")
    except Exception as e:
        print(f"ERROR: Failed to write {html_file}: {e}")

    lines.append("")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 license-summary.py <root_dir>")
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
        try:
            with extras_json.open("r", encoding="utf-8-sig") as f:
                extras = json.load(f)
            if extras:
                lines.append("## Extra Credits")
                for key, val in extras.items():
                    lines.append(f"- **{key}**: {val}")
                lines.append("")
        except Exception as e:
            print(f"ERROR: Failed to read {extras_json}: {e}")

    # Process components
    for component_dir in sorted(licenses_dir.iterdir()):
        if component_dir.is_dir() and component_dir.name != "extras":
            licenses_xml = component_dir / "licenses.xml"
            licenses_json = component_dir / "licenses.json"
            if licenses_xml.exists():
                process_xml_component(component_dir, licenses_dir, lines)
            elif licenses_json.exists():
                process_json_component(component_dir, lines)

    try:
        output_file.write_text("\n".join(lines), encoding="utf-8-sig")
        print(f"THIRD-PARTY-LICENSES.md generated at {output_file}")
    except Exception as e:
        print(f"ERROR: Failed to write {output_file}: {e}")

if __name__ == "__main__":
    main()
