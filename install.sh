#!/bin/bash
echo "========================================"
echo "  PFE Management - Installation"
echo "========================================"

# Backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"

echo ""
echo "========================================"
echo "  Setup complete! How to start:"
echo "========================================"
echo ""
echo "1️⃣  Start MongoDB (if not running):"
echo "   mongod"
echo ""
echo "2️⃣  Start Backend (in /backend folder):"
echo "   cd backend"
echo "   npm run seed    ← Run ONCE to populate demo data"
echo "   npm run dev     ← Start server on port 5000"
echo ""
echo "3️⃣  Start Frontend (in /frontend folder):"
echo "   cd frontend"
echo "   npm start       ← Start app on port 3000"
echo ""
echo "========================================"
echo "  Test accounts:"
echo "========================================"
echo "  Admin:       admin@pfe.com      / Admin@123"
echo "  Encadrant:   supervisor@pfe.com  / Super@123"
echo "  Étudiant 1:  student@pfe.com    / Student@123"
echo "  Étudiant 2:  student2@pfe.com   / Student@123"
echo "========================================"
