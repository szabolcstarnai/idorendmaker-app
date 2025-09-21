# Sample PDF Document Setup

## Required File: `sample-nevezetek-2025.pdf`

This directory should contain a sample PDF document that demonstrates the correct MKKSZ Kajak-Kenu Ablak export format.

### Requirements for the Sample PDF:

1. **Source**: Must be exported from official MKKSZ Kajak-Kenu Ablak software
2. **Export Type**: "NEVEZÉSEK - VERSENYSZÁMONKÉNT" format
3. **Content Structure**: Should contain typical competitive race categories with realistic competitor entries
4. **Headers**: Must include proper table headers: "Azonosító", "Név", "Tagszervezet", "Született"
5. **Data**: Should have multiple race types with sufficient competitor data for demonstration
6. **File Size**: Keep under 1MB for quick download performance
7. **Anonymization**: Use anonymized or sample data to protect competitor privacy

### Expected Structure:
```
Versenyszám: K1 1000m Férfi Serdülő
Azonosító    Név                 Tagszervezet       Született
A001         Példa János         Minta SE           2008.05.15
A002         Teszt Péter         Példa KSE          2008.03.22
...

Versenyszám: C1 500m Női Junior
Azonosító    Név                 Tagszervezet       Született
B001         Minta Anna          Teszt KK           2006.07.10
B002         Példa Éva           Minta VSE          2006.11.03
...
```

### Validation:
- The sample PDF must successfully process through the existing `VersenyszamNevezesekExtractor`
- Should extract competitive races with competitor entries
- Must demonstrate the correct document structure for user reference

### Installation:
1. Obtain a properly formatted MKKSZ export PDF
2. Anonymize competitor data if needed
3. Rename to `sample-nevezetek-2025.pdf`
4. Place in this directory (`src/main/resources/static/`)
5. Verify the StaticResourceController can serve it via `/api/static/sample-pdf`

### Testing:
- Test download functionality from error states in the UI
- Verify the PDF processes correctly through the extraction pipeline
- Confirm file size and download performance are acceptable