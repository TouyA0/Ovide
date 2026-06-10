#!/bin/sh
# Met à jour l'app depuis GitHub et relance le conteneur
# Usage : ./update.sh
set -e

echo "==> Pull des dernières modifs..."
git pull

echo "==> Rebuild et redémarrage du conteneur..."
docker compose up --build -d

echo "==> Suppression des images orphelines..."
docker image prune -f

echo "✓ Mise à jour terminée"
docker compose ps
