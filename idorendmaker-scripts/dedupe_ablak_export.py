import sys
import pandas as pd

if len(sys.argv) < 2:
    print("Usage: python dedupe_ablak_export.py <excel_file.xlsx>")
    sys.exit(1)

input_file = sys.argv[1]
output_file = "deduped_with_counts.xlsx"

# Load the Excel
df = pd.read_excel(input_file)

# Count duplicates
deduped = df.value_counts().reset_index(name="Occurrences")

# Save result
deduped.to_excel(output_file, index=False)

print(f"Done! Saved to {output_file}")
