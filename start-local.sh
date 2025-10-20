#!/bin/bash

# Start Local Dev Server with SQLite Database
# This uses the local enriched database for UI testing

echo "🍷 Starting Local Dev Server with Enriched Products"
echo "════════════════════════════════════════════════════"
echo ""
echo "📊 Database: SQLite (dev.db)"
echo "🎨 UI: Enriched product display enabled"
echo "🔍 Products: 10 enriched wines"
echo ""
echo "════════════════════════════════════════════════════"
echo ""
echo "🌐 Starting server..."
echo ""

# Set DATABASE_URL to local SQLite and start dev server
DATABASE_URL="file:./dev.db" npm run dev
