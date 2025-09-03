# Data Normalization Rules

## Overview

All payment rail data **must be normalized before hashing** to ensure different formatting variations produce identical hash values. This enables reliable verification across various input formats.

---

## Normalization Functions

### Core Functions
- **`digitsOnly(s)`**: Removes all non-digit characters
- **`upperNoSpaces(s)`**: Removes spaces and converts to uppercase
- **`lower(s)`**: Converts to lowercase ASCII

### Hashing Function
```javascript
keccak256(utf8Bytes(normalizedValue)) → bytes32
```

---

## Field-Specific Rules

### Short Code
- **Rule**: `lower(shortCode)`
- **Purpose**: Case-insensitive bank identification
- **Note**: Frontend must send lowercase to contract

### Routing Numbers (ABA)
- **Rule**: `digitsOnly(routing)`
- **Validation**: Must be 9 digits for UI validation
- **Note**: Hashed regardless of validation status

### Account Numbers
- **Rule**: `digitsOnly(account)`
- **Validation**: No length enforcement (bank responsibility)
- **Note**: All non-digit characters removed

### IBAN (International)
- **Rule**: `upperNoSpaces(iban)`
- **Format**: Country code + check digits + account identifier
- **Note**: Spaces and case variations normalized

### BIC/SWIFT Codes
- **Rule**: `upperNoSpaces(bic)`
- **Format**: Typically 8-11 alphanumeric characters
- **Note**: No spaces in standard format

---

## Normalization Examples

### US Routing Number
```
Input:  "0260-095-93"
Rule:   digitsOnly()
Output: "026009593"
Hash:   keccak256("026009593")
```

### US Account Number
```
Input:  "000 123 456 789"
Rule:   digitsOnly()
Output: "000123456789"
Hash:   keccak256("000123456789")
```

### IBAN
```
Input:  "gb33 bukb 2020 1555 5555 55"
Rule:   upperNoSpaces()
Output: "GB33BUKB20201555555555"
Hash:   keccak256("GB33BUKB20201555555555")
```

### BIC/SWIFT
```
Input:  "bofaus3n"
Rule:   upperNoSpaces()
Output: "BOFAUS3N"
Hash:   keccak256("BOFAUS3N")
```

---

## Implementation Notes

### Frontend Consistency
- All normalization must match between frontend and contract
- Use identical functions in JavaScript and Solidity
- Test edge cases with various input formats

### Security Considerations
- Normalization prevents format-based bypass attempts
- Consistent hashing ensures verification reliability
- All transformations are deterministic and reversible in concept
