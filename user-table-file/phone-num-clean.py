import pandas as pd
import re

# ===== CONFIG =====
INPUT_FILE = "prospect-web-file.xlsx"
PHONE_COLUMN = "Number"

OUTPUT_FILE = "final_cleaned_deduplicated_numbers.xlsx"
# ==================

# Read Excel file
df = pd.read_excel(INPUT_FILE)


# ==========================================
# CLEANING FUNCTION
# ==========================================
def clean_phone_numbers(text):

    if pd.isna(text):
        return {
            "cleaned_numbers": "",
            "primary_number": "",
            "numbers_found": 0,
            "cleanup_action": "EMPTY CELL"
        }

    original_text = str(text)

    # Extract possible phone chunks
    matches = re.findall(r'[\+]?[\d\s\-\(\)/]{7,30}', original_text)

    cleaned_list = []

    for match in matches:

        # Remove spaces, brackets, hyphens, slashes
        num = re.sub(r'[\s\-\(\)/]', '', match)

        # Keep only digits and optional +
        num = re.sub(r'[^0-9+]', '', num)

        if not num:
            continue

        # Remove +
        digits = num.lstrip('+')

        # ===== NORMALIZATION =====

        # Pakistan local
        if digits.startswith("0") and len(digits) == 11:
            digits = "92" + digits[1:]

        # Pakistan local missing leading 0
        elif len(digits) == 10 and digits.startswith("3"):
            digits = "92" + digits
            
        # Pakistan international
        elif digits.startswith("0092"):
            digits = digits[2:]

        # Other international with 00 prefix
        elif digits.startswith("00"):
            digits = digits[2:]

        # Final validation
        if 8 <= len(digits) <= 15:
            cleaned_list.append(digits)

    # Remove duplicates inside same row
    cleaned_list = list(dict.fromkeys(cleaned_list))

    # Determine action
    if len(cleaned_list) == 0:
        action = "NO VALID NUMBER FOUND"

    elif len(cleaned_list) == 1:
        action = "STANDARDIZED SINGLE NUMBER"

    else:
        action = "EXTRACTED MULTIPLE NUMBERS"

    return {
        "cleaned_numbers": ", ".join(cleaned_list),
        "primary_number": cleaned_list[0] if cleaned_list else "",
        "numbers_found": len(cleaned_list),
        "cleanup_action": action
    }


# ==========================================
# APPLY CLEANING
# ==========================================
cleaned_data = df[PHONE_COLUMN].apply(clean_phone_numbers)

cleaned_df = pd.json_normalize(cleaned_data)

# Merge
final_df = pd.concat([df, cleaned_df], axis=1)


# ==========================================
# REMOVE ROWS WITH NO NUMBERS
# ==========================================
before_remove_invalid = len(final_df)

final_df = final_df[
    final_df["primary_number"] != ""
]

removed_invalid = before_remove_invalid - len(final_df)


# ==========================================
# REMOVE DUPLICATES
# Keep first occurrence only
# ==========================================
before_dedup = len(final_df)

final_df = final_df.drop_duplicates(
    subset=["primary_number"],
    keep="first"
)

removed_duplicates = before_dedup - len(final_df)


# ==========================================
# SUMMARY
# ==========================================
print("\n===== CLEANUP SUMMARY =====\n")

print(f"Original rows: {len(df)}")
print(f"Removed invalid rows: {removed_invalid}")
print(f"Removed duplicate rows: {removed_duplicates}")
print(f"Final remaining rows: {len(final_df)}")

print("\n===== CLEANUP ACTIONS =====\n")

print(final_df["cleanup_action"].value_counts())

print("\n===== SAMPLE CLEANED DATA =====\n")

print(
    final_df[
        [PHONE_COLUMN, "cleaned_numbers", "primary_number"]
    ].head(20)
)


# ==========================================
# SAVE OUTPUT
# ==========================================
final_df.to_excel(OUTPUT_FILE, index=False)

print(f"\nFinal cleaned file saved as: {OUTPUT_FILE}")