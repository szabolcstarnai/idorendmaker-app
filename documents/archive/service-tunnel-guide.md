# Service Tunnel Scripts

This directory contains standalone scripts for database operations and data management.

## Database Population Script

The `populate-db.ts` script reads the Excel file containing all possible race data and populates the SQLite database with normalized data structure.

### Prerequisites

1. Ensure the Excel file exists at `documents/versenyszamok.xlsx`
2. Install dependencies: `npm install`

### Usage

```bash
# Run the database population script
npm run populate-db
```

### What the script does

1. **Checks Excel file** - Verifies `documents/versenyszamok.xlsx` exists
2. **Initializes database** - Creates tables using the v2 schema with normalized age groups
3. **Reads Excel data** - Parses the Excel file into structured data
4. **Normalizes data** - Converts raw Excel data to the normalized format:
   - Splits age groups on `;` separator
   - Validates data types and required fields
   - Handles missing or invalid data gracefully
5. **Populates database** - Uses transactions for performance:
   - Creates unique age groups
   - Inserts races
   - Links races to their age groups
6. **Verifies results** - Shows summary and sample data

### Expected Excel Format

The script expects the Excel file to have these columns:

| Column | Description | Example |
|--------|-------------|---------|
| `Versenyszám neve` | Race name | `K1 Férfi Serdülő U15-U16 500 m` |
| `Versenyszám szakág` | Discipline | `Kajak`, `Kenu`, `SUP`, `Kajakpóló`, `Parakenu`, `Sárkányhajó`, `Szlalom`, `Tengeri kajak` |
| `Hajóosztály` | Boat class | `Kajak egyes`, `Kajak páros` |
| `Versenyszám nem` | Gender | `Férfi`, `Női`, `Vegyes` |
| `Versenyszám évfolyamok` | Age groups | `Serdülő - U15; Serdülő - U16` |
| `Versenyszám táv` | Distance | `500 m`, `1000 m` |

### Age Group Normalization

Age groups in the Excel can contain multiple values separated by `;`:
- `Serdülő - U15` → Single age group
- `Serdülő - U15; Serdülő - U16` → Two age groups

The script:
1. Splits on `;` separator
2. Trims whitespace
3. Creates separate records for each age group
4. Links races to all their age groups

### Database Schema

The script creates a normalized schema:

```sql
races: id, name, discipline, boat_class, gender, distance
age_groups: id, name
race_age_groups: race_id, age_group_id (many-to-many)
```

### Error Handling

The script handles various error conditions:
- Missing Excel file
- Invalid discipline values (supports 8 water sports disciplines)
- Missing required fields
- Database constraint violations
- Age group parsing errors

Warnings are logged for problematic data, but the script continues processing.

### Output

Successful run output:
```
🚀 Starting database population...
📁 Excel file found: /path/to/versenyszamok.xlsx
🔧 Initializing database schema...
✅ Database schema initialized
📖 Reading Excel file...
✅ Successfully read 342 rows from Excel
🔄 Normalizing race data...
✅ Successfully normalized 340 races
💾 Populating database...
📝 Processed 100 races...
📝 Processed 200 races...
📝 Processed 300 races...
✅ Inserted 340 races and 12 unique age groups
🔍 Verifying database contents...
📊 Database contents:
   - Races: 340
   - Age Groups: 12
   - Race-Age Group Links: 456
🎉 Database population completed successfully!
```

### Troubleshooting

**Excel file not found**
- Ensure `documents/versenyszamok.xlsx` exists in the project root
- Check file permissions

**Database errors**
- Delete existing `idorendmaker.db` file to start fresh
- Check disk space and permissions

**Data parsing errors**
- Check Excel file format matches expected columns
- Look for warnings in the output for problematic rows