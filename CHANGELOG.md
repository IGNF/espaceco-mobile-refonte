# Change Log

Tous les changements notables du projet sont documentés dans ce fichier.

Le format suit [Keep a Changelog](http://keepachangelog.com/)
et le projet suit [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added

### Changed
 
### Fixed

## [0.0.12] - 2026-06-02

### Added

### Changed
- Le "Signalement via GNSS" (depuis la page de nouveau signalement) suit maintenant le chemin attendu, via l'ajout direct d'une trace

### Fixed
- Correctifs CSS

## [0.0.11] - 2026-06-01

### Added

### Changed
- Amélioration de la gestion de l'appui long sur la carte, pour déclencher l'ouverture de l'action sheet
- Remplacement des label 'GPS' par 'GNSS'
- Une erreur s'affiche systématiquement dans un Toast is l'envoi d'un signalement ne fonctionne pas
- Lors de la résolution des conflits, on n'affiche que les valeurs n'étant pas 'undefined' (ticket #124)
- Sur la page 'Mes signalements', en cas d'erreur d'envoi de signalement, on affiche ces erreurs directement sur la page (ticket #124 et #102)
- Lors de l'enregistrement direct d'une trace, le rond rouge (record) est remplacé par un carré rouge, qui arrête l'enregistrement au tap (ticket #135)
- S'il y a plusieurs éléments différents à l'endroit où on tap sur la carte (typiquement, trace GPS et objet de couche), on affiche une modal pour demander à l'utilisateur sur quel type d'éléments il veut travailler (ticket #135)
 
### Fixed
- Il n'y a plus de changement brusque de zoom/recentrage lors de l'enregistrement d'une trace (ticket #135)
- On peut maintenant enregistrer plusieurs traces à la suite sans qu'elles n'écrasent la précédente (ticket #135)

## [0.0.10] - 2026-05-29

### Added
- On peut maintenant changer le style des couches qui supportent cette option (ticket #143)
- La configuration de l'app (bundle ID, nom, icones, etc.) est maintenant correcte
- La sélection de l'app EspaceCo/Naviforest est maintenant effective, via des scripts, comme sur l'app actuelle
- La page 'Mes signalements' affiche maintenant les signalements envoyés durant la session (ticket #105)
- Des boutons d'action ont été ajoutés dans la page 'Mes signalements', pour envoyer tous les signalements, ou nettoyer la liste des signalements listés (ticket #105)

### Changed
- L'ordre des boutons d'action sur la page de signalement (en édition ou en brouillon) a été modifié (ticket #100)
- Le bouton de visualisation de la position d'un signalement sur la carte est maintenant sur la page de détails du signalement, plus sur la page d'édition (ticket #100)
 
### Fixed
- Pour le mode hors ligne, la liste des couches sélectionnables est maintenant dans le même ordre que les couches du guichet (ticket #120)
- La transaction (envoi) d'un polygone après saisie directe fonctionne maintenant (ticket #115)
- Correctifs CSS
- Correctif d'un bug qui empêchait l'envoi de signalement

## [0.0.9] - 2026-05-22

### Added
- Un utilisateur peut maintenant retourner vers la page de login depuis la page de sélection de groupe actif (à l'ouverture de l'app) (ticket #5)
- La page de sélection de groupe actif (à l'ouverture de l'app) affiche maintenant le nom/pseudo de l'utilisateur connecté (ticket #5)
- La page "À propos" a été ajoutée (ticket #119)
- La page "Aide" a été ajoutée (ticket #119)
- On peut maintenant signaler un objet depuis sa fiche (au tap sur un objet sur la carte) (ticket #141)

### Changed
- Sur les pages secondaires comportant un header avec boutons de navigation, ce header est maintenant en "sticky" pour être toujours visible (ticket #140)
- Le geste de swipe back ne redirige plus vers la page de choix du groupe (ticket #140)
- La "status bar" est maintenant obligatoirement affichée en light mode pour garder les informations peu importe le thème du device (ticket #139)

### Fixed
- Les couches 'Carte topographique( (IGN Sanc 25)' et 'Carte IGN' sont maintenant correctement affichées (ticket #98)

## [0.0.8] - 2026-05-20

### Added
- On peut maintenant visualiser la localisation d'un signalement sur la carte, depuis la page de détails du signalement (ticket #99)
- On peut maintenant naviguer entre les signalements depuis la page de détails des signalements (ticket #99)
- La position de l'utilisateur est maintenant indiquée sur la carte à tout moment
- Le bouton pour verrouiller la vue sur la position de l'utilisateur a été ajouté (ticket #135)
- On peut maintenant créer un tracé directement depuis la home page, depuis les boutons d'accès rapide (ticket #135)
- Fonctionnalité de Signalement Rapide (ticket #122)

### Changed
- Les boutons de zoom ont été déplacés en haut à droite de l'écran
- Un appui long sur al carte ouvre une action sheet (en bas de l'écran) et non plus une alerte, pour ne pas cacher l'écran (ticket #106)

### Fixed
- Un geste de zoom sur la carte ne déclenche plus la fonction d'appui long (ticket #106)
- Une nouvelle trace dans un signalement n'écrase plus la trace précédente (ticket #110)

## [0.0.7] - 2026-05-07

### Added

- Un double-tap sur le bouton de centrage vérouille maintenant le centrage, avec un recentrage déclenché toutes les 30 secondes (ticket #135)
- On peut maintenant visualiser un signalement sur la carte depuis le brouillon de celui-ci (ticket #100)
- Un appui long sur la carte ouvre maintenant une alerte pour proposer à l'utilisateur de créer un signalement à cet endroit, ou d'ouvrir cet endroit dans une appli de navigation (ticket #106)
- On peut maintenant ajouter une trace GPS avant de créer un signalement, et l'exporter au format GPX (ticket #110)

### Changed

- La liste des thèmes proposés dans un nouveau signalement sont ceux par défaut (shared themes) si un utilisateur n'a as de groupe associé
- La position d'un signalement peut maintenant être modifiée lorsqu'on modifie un brouillon (ticket #103)
- Dans la page listant les signalements, ceux-ci s'affichent maintenant dans l'ordre décroissant par ID, et la date de mise à jour est également affichée dans la liste (ticket #102)
- La source du GPS n'est modifiable qu'en mode expert
- Le niveau de zoom au recentrage est passé de 13 à 16  (ticket #135)

### Fixed

- L'opacité des couches Géoservices (Plan IGN) fonctionne à présent (ticket #98)
- L'opacité des "groupes de couches" sont maintenant décorrélées des couches elles-mêmes (ticket #98)
- On peut maintenant correctement ajouter un objet à un signalement, sans collision avec le mode signalement direct (ticket #138)
- Ajouter une nouvelle trace à un signalement ne supprime plus la précédente trace (ticket #110)

## [0.0.6] - 2026-05-06

### Added

### Changed

- Un utilisateur qui n'a pas de groupe est maintenant redirigé vers la home page et non plus vers la page de choix de groupe après connexion

### Fixed

## [0.0.5] - 2026-04-30

### Added

- Choix du mode d'affichage (débutant, confirmé, expert) dans les paramètres de l'application
- Ajout des options de l'affichage de la carte (zoom, recherche, rotation) dans les paramètres de l'application
- Ajout du mode "no cache" dans l'app, et dans les paramètres de l'application
- Ajout des informations de "Maintenance" dans les paramètres de l'application

### Changed

- Le contenu de la page "A propos du guichet" affiche maintenant la valeur du champ editorial ou description du groupe. (ticket #118)
- Item "Guichet" du menu de gauche supprimé (ticket #92)
- La tab "Guichet" de la tabbar ouvre maintenant les couches du guichet utilisé (ticket #92)

### Fixed

- Les couches s'affichent maintenant dans le bon ordre

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
