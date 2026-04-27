# Change Log

Tous les changements notables du projet sont documentés dans ce fichier.

Le format suit [Keep a Changelog](http://keepachangelog.com/)
et le projet suit [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added

### Changed

### Fixed

## [0.0.5] - 2026-04-xx

### Added

- Choix du mode d'affichage dans les paramètres de l'application

### Changed

- Le contenu de la page "A propos du guichet" affiche maintenant la valeur du champ editorial ou description du groupe.

### Fixed

## [0.0.4] - 2026-04-27

### Added

- Support du more hors ligne (téléchargement de zones, couches, fonds de carte ; switch online/offline ; gestion du cache)
- Pages 'À propos du guichet'
- Pages 'À propos des signalements'

### Changed

### Fixed

## [0.0.3] - 2026-04-07

### Added

- Un utilisateur peut maintenant changer de groupe via la page Mes Groupes
- Un utilisateur peut maintemander demander à rejoindre un groupe via la page Mes Groupes
- L'app affiche maintenant un loader à l'ouverture, pour éviter un écran blanc de quelques secondes
- L'app pré-sélectionne automatiquement le dernier groupe actif, lors de la page de sélection après login (voir ticket #5)
- Ajout du lien "Mot de passe oublié"

### Changed

- Le module d'authentification a été externalisé dans le package mobile-core. La refonte utilise maintenant l'auth depuis ce package, et non plus localement.
- Remplacement des libellés "Profil actif" par "Groupe" (voir ticket #5)
- Ajustements de style dans divers endroits de l'app

### Fixed

- Lors de la sélection du groupe, un text "common.loading" s'affichait brièvement à l'appui sur le bouton. C'est corrigé. (voir ticket #5)

## [0.0.2] - 2026-03-27

### Added

- Ajout des contributions directes avec gestion des conflits

### Changed

### Fixed

- Résolution d'un problème provoquant un chargement à l'ouverture long, qui pouvait faire planter l'application

## [0.0.1] - 2026-03-23

### Added

- Implémentation basique des pages 'Aide' et 'À propos'.
- Meilleure gestion des erreurs et des logs d'erreurs.

### Changed

- La modale d'onboarding est maintenant affichée seulement après la fin de l'écran de chargement initial.
- Le chargement au démarrage est plus fluide, le timeout mieux géré.
- Le nom du groupe actif est maintenant affiché à la place du placeholder

### Fixed

- La déconnexion vide maintenant complètement la session locale, donc une réouverture de l'application renvoie bien vers la page de connexion.
- Sur mobile, fermer le navigateur de connexion sans se connecter réinitialise maintenant correctement le bouton "Se connecter".
- Au redémarrage de l'application, les utilisateurs connectés ne voient plus brièvement la page de connexion avant la redirection.
- Sur Android, le tap sur les boutons, switches et éléments de menu ne montre plus le "highlight" bleu.
