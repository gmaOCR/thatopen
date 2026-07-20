---
name: dev
description: Lancer le viewer IFC en local pour développer/tester dans le navigateur (serveur Vite + maquette de démo). À utiliser pour vérifier visuellement une modification 3D.
---

# Dév local du viewer

```bash
cd frontend/renderer
npm install        # première fois
npm run dev        # http://localhost:3000
```

Au démarrage, la maquette de démo (`public/models/demo.ifc`, Duplex Apartment) se charge
automatiquement. Pour tester un autre IFC : menu **Fichier → Ouvrir un IFC…**.

Vérifications avant commit :
```bash
npm run typecheck && npm run lint && npm test && npm run build
```

⚠️ Les interactions 3D (rendu, sélection, coupe, mesure) ne sont vérifiables qu'en
navigateur — `npm run dev` est le seul moyen fiable de les valider.
