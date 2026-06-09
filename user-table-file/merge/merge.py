import pandas as pd

INPUT_FILE = "FINAL_MERGED.xlsx"
OUTPUT_FILE = "FINAL_MERGED_CLEAN.xlsx"

# Read file
df = pd.read_excel(INPUT_FILE, dtype=str)

# Convert empty strings / spaces to NaN
df = df.replace(r'^\s*$', pd.NA, regex=True)

# Drop fully empty rows
df = df.dropna(how="all")

# Save cleaned file
df.to_excel(OUTPUT_FILE, index=False)

print("Done! Clean file created:", OUTPUT_FILE)