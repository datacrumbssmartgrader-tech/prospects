import pandas as pd
import re

# ===== CONFIG =====
INPUT_FILE = "final_cleaned_deduplicated_numbers.xlsx"
PHONE_COLUMN = "cleaned_numbers"
# ==================

# Read Excel file
df = pd.read_excel(INPUT_FILE)

def detect_format(number):

    if pd.isna(number):
        return "EMPTY"

    num = str(number).strip()

    # Remove spaces, hyphens, brackets
    cleaned = re.sub(r'[\s\-\(\)]', '', num)

    # ===== CHECK INVALID CHARACTERS =====
    # Allow only digits and optional leading +
    if not re.match(r'^\+?\d+$', cleaned):
        return "Invalid Characters"

    # Remove + for easier checking
    digits = cleaned.lstrip('+')

    length = len(digits)

    # ===== PAKISTAN =====
    if digits.startswith("92") and length == 12:
        return "Pakistan (92)"

    elif digits.startswith("0092"):
        return "Pakistan International (0092)"

    elif digits.startswith("0") and length == 11:
        return "Pakistan Local (0)"

    # ===== INTERNATIONAL =====
    elif cleaned.startswith("+") and 8 <= length <= 15:
        return "International (+)"

    elif digits.startswith("00") and 10 <= length <= 17:
        return "International (00 Prefix)"

    elif 8 <= length <= 15:
        return "International (No Prefix)"

    # ===== OTHER =====
    return "Other / Invalid"


# Apply detection
df["phone_format"] = df[PHONE_COLUMN].apply(detect_format)

# Summary
format_summary = df["phone_format"].value_counts()

print("\n===== PHONE FORMAT SUMMARY =====\n")
print(format_summary)

# Save output
OUTPUT_FILE = "phone_format_check.xlsx"
df.to_excel(OUTPUT_FILE, index=False)

print(f"\nDetailed file saved as: {OUTPUT_FILE}")

print("\n===== INVALID NUMBER SAMPLES =====\n")

print(
    df[df["phone_format"].isin([
        "Invalid Characters",
        "Other / Invalid"
    ])][PHONE_COLUMN].head(20)
)