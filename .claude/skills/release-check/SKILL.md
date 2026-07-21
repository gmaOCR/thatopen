---
name: release-check
description: Vérifie que le viewer est prêt à être commité/déployé — typecheck + lint + tests + build. À lancer avant tout commit ou déploiement.
---

# Contrôle pré-commit / pré-déploiement

Depuis `frontend/renderer/` :

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Tout doit être vert avant de committer ou de déclencher un déploiement.

- `typecheck` : `tsc --noEmit` — filet de sécurité contre les erreurs d'API ThatOpen v3.
- `lint` : eslint (dont jsx-a11y).
- `test` : Vitest (unités : loader, raccourcis, toasts…).
- `build` : `vite build` — vérifie le bundle + le code-splitting.

⚠️ Les interactions 3D (rendu, sélection, coupe, mesures) ne sont vérifiables qu'en navigateur (`npm run dev`) — à valider manuellement après un changement de rendu.
