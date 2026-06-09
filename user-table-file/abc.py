import pandas as pd

# Read cleaned file
df = pd.read_excel("final_cleaned_deduplicated_numbers.xlsx")

# Column to check
PHONE_COLUMN = "cleaned_numbers"

# Find duplicate rows
duplicates = df[
    df.duplicated(subset=[PHONE_COLUMN], keep=False)
]

# Sort for easier viewing
duplicates = duplicates.sort_values(by=PHONE_COLUMN)

# Show result
print("\n===== DUPLICATE NUMBERS =====\n")

print(duplicates[[PHONE_COLUMN]].drop_duplicates())

print(f"\nTotal duplicate rows found: {len(duplicates)}")

# Save duplicates
duplicates.to_excel("duplicate_numbers.xlsx", index=False)

print("\nDuplicate rows saved as: duplicate_numbers.xlsx")