# Publier une mise à jour (App Store et Play Store)

Cette page décrit comment publier une mise à jour d'EspaceCo ou de NaviForest, depuis le build jusqu'à l'envoi en revue production.

La livraison se fait en deux temps :

1. un build signé est produit et uploadé automatiquement par GitHub Actions ;
2. une personne envoie ensuite ce binaire en revue production, dans App Store Connect pour iOS et dans la Google Play Console pour Android.

La CI ne soumet pas l'application à la revue production. Elle dépose le binaire signé à l'endroit suivant :

| Plateforme | Commande | Destination du binaire | Suite manuelle |
| --- | --- | --- | --- |
| iOS | `npm run deploy:ios` | TestFlight, dans App Store Connect | Associer le build à une version App Store, puis l'envoyer en revue |
| Android | `npm run deploy:android` | Piste de test interne du Play Store | Promouvoir cette release vers la piste Production, puis l'envoyer en revue |
| iOS et Android | `npm run deploy` | Les deux destinations ci-dessus | Les deux procédures, chacune dans sa console |

Les libellés d'interface ci-dessous sont ceux des consoles en anglais.

Les détails des workflows, des secrets et du dépannage de build sont dans [[Pipeline iOS (CI CD)]] et [[Pipeline Android (CI CD)]]. Les scripts npm sont décrits dans [[Scripts npm]].

## Applications

Chaque commande de déploiement ne livre que la variante sélectionnée dans `scripts/.selected-app`. EspaceCo et NaviForest sont deux fiches distinctes dans chaque console. La procédure se répète une fois par application.

| Variante | Nom affiché | Bundle ID iOS | Package Android |
| --- | --- | --- | --- |
| EspaceCo | Espace collaboratif IGN | `fr.ign.collaboratif` | `fr.ign.guichet` |
| NaviForest | Naviforest | `fr.ign.navi-forest` | `fr.ign.naviforest` |

La version affichée aux utilisateurs vient de `versionNumber` dans `scripts/EspaceCo/config.js` ou `scripts/NaviForest/config.js`. Le déploiement incrémente seulement le numéro de build :

- iOS : `CURRENT_PROJECT_VERSION`, affiché entre parenthèses à côté de la version dans App Store Connect ;
- Android : `versionCode`, visible dans les détails de la release Play Store. Le nom de version affiché aux utilisateurs est `versionName`.

## 1. Produire et uploader le build signé

### 1.1 Sélectionner la variante

Depuis la racine du dépôt, avec un environnement déjà installé (`npm install`) :

```bash
npm run selectapp:espaceco
```

ou :

```bash
npm run selectapp:naviforest
```

La commande écrit la variante dans `scripts/.selected-app`, puis lance un build. Ce build applique le nom, les identifiants natifs et `versionNumber` aux projets iOS et Android.

Le working tree doit ensuite être commité. `npm run deploy`, `npm run deploy:ios` et `npm run deploy:android` s'arrêtent si `git status` n'est pas propre.

### 1.2 Mettre à jour la version affichée

Le script de déploiement ne modifie pas `versionNumber`. Il part de la version déjà présente dans les projets natifs et incrémente le numéro de build.

Avant une mise à jour d'une version déjà en ligne, incrémenter `versionNumber` dans le fichier de la variante (`scripts/EspaceCo/config.js` ou `scripts/NaviForest/config.js`), par exemple `4.0.0` vers `4.0.1` :

- sur l'App Store, une version déjà au statut **Ready for Distribution** ne peut pas recevoir un nouveau binaire avec le même numéro de version. Le nouveau `versionNumber` doit être supérieur, et il doit être identique au numéro saisi dans App Store Connect ;
- sur le Play Store, un `versionCode` supérieur suffit pour publier. Le `versionName` peut rester identique, mais le changer en même temps garde les deux stores alignés.

Après avoir modifié `versionNumber`, relancer la sélection de l'application pour reporter la version dans les projets natifs, puis committer le résultat :

```bash
npm run selectapp:espaceco
```

La commande à utiliser est celle de la variante concernée. Committer ensuite tous les fichiers modifiés.

Si la version App Store précédente est encore au statut **Prepare for Submission**, on peut la remplacer par un nouveau build sans changer `versionNumber`. Le numéro de build, lui, augmente à chaque déploiement.

### 1.3 Lancer le pipeline

Le dépôt doit être propre, la bonne variante doit être commitée, et le compte doit avoir le droit de pousser sur le dépôt.

Une plateforme :

```bash
npm run deploy:ios
npm run deploy:android
```

Les deux plateformes de la même variante :

```bash
npm run deploy
```

Le script :

1. incrémente `CURRENT_PROJECT_VERSION` et/ou `versionCode` ;
2. crée un commit `chore: bump iOS build number`, `chore: bump Android build number` ou `chore: bump build numbers` ;
3. crée un tag annoté `deploy/ios/YYYYMMDD-HHMMSS` et/ou `deploy/android/YYYYMMDD-HHMMSS`, horodaté en UTC ;
4. pousse le commit et le tag.

Noter les numéros affichés dans le terminal, par exemple `iOS: CURRENT_PROJECT_VERSION set to 40012` et `Android: versionCode set to 40012`. Ce sont les numéros à retrouver dans les consoles.

### 1.4 Vérifier que l'upload a réussi (optionnel)

Ouvrir l'onglet **Actions** du dépôt GitHub.

- Le tag `deploy/ios/...` lance le workflow iOS. Lorsqu'il est vert, l'IPA signé a été accepté par App Store Connect. Le traitement du build continue côté Apple : le succès du workflow ne signifie pas encore que le build est sélectionnable.
- Le tag `deploy/android/...` lance le workflow Android. Lorsqu'il est vert, l'AAB signé est publié sur la piste `internal` avec le statut `completed`. L'AAB est aussi conservé 3 jours comme artefact `android-signed-aab`. Cet artefact n'a pas à être uploadé : la release interne contient déjà le binaire.

En cas d'échec du workflow, reprendre [[Pipeline iOS (CI CD)]] ou [[Pipeline Android (CI CD)]], selon la plateforme. Les causes les plus fréquentes sont un secret de signature manquant, un mauvais contenu de `scripts/.selected-app`, ou un numéro de build déjà utilisé.

Attendre ensuite que la console ait fini de traiter le binaire avant de passer à la revue :

- iOS : le build apparaît dans l'onglet **TestFlight**, souvent après quelques minutes, parfois plus longtemps. Tant qu'il est en **Processing**, il ne peut pas être ajouté à une version ;
- Android : la release interne apparaît dans **Test and release > Testing > Internal testing**. Le traitement du bundle peut prendre quelques minutes après la fin du workflow.

## 2. iOS : envoyer le build en revue App Store

Compte nécessaire : https://appstoreconnect.apple.com, avec le rôle **Account Holder**, **Admin** ou **App Manager**.

Le build uploadé par la CI est le même pour TestFlight et pour l'App Store. Il n'existe pas de bouton pour « promouvoir » un build TestFlight. On le retrouve dans TestFlight, puis on le sélectionne sur la fiche de version App Store.

### 2.1 Retrouver le build

1. Ouvrir [App Store Connect](https://appstoreconnect.apple.com/apps).
2. Ouvrir l'application qui correspond au bundle ID livré : `fr.ign.collaboratif` pour EspaceCo, `fr.ign.navi-forest` pour NaviForest.
3. Ouvrir l'onglet **TestFlight**.
4. Dans la barre latérale, sous **Builds**, choisir **iOS**.
5. Repérer la ligne dont le numéro de build est celui affiché par `npm run deploy:ios`. La version affichée doit être le `versionNumber` livré.

<img width="882" height="550" alt="Screenshot 2026-11-10 at 14 37 58" src="https://github.com/user-attachments/assets/00a02768-8ffc-42a2-87aa-69581a9c0aff" />

Statuts utiles :

| Statut | Lecture |
| --- | --- |
| **Processing** | Apple traite encore le binaire. Attendre, puis rafraîchir. |
| **Missing Compliance** | Le questionnaire de chiffrement n'a pas été répondu. Le build n'est pas encore sélectionnable. |
| **Ready to Submit** | Le build peut être ajouté à la version App Store. |
| **Invalid Binary** | Apple a refusé le binaire. Corriger la cause, puis relancer un déploiement : le numéro de build doit changer. |

### 2.2 Renseigner la conformité d'exportation

Le projet ne déclare pas `ITSAppUsesNonExemptEncryption` dans `Info.plist`. Chaque build s'arrête donc au statut **Missing Compliance** tant que le questionnaire n'est pas rempli.

1. Dans la liste des builds TestFlight, cliquer sur **Manage** à côté du build, ou ouvrir le build puis **Provide Export Compliance Information**.
2. Répondre aux questions sur l'usage du chiffrement (généralement, choisir **None of the algorithms mentioned above**).
3. Si aucune documentation supplémentaire n'est demandée, cliquer sur **Save**. Le build quitte **Missing Compliance**.

<img width="690" height="473" alt="compliance_information" src="https://github.com/user-attachments/assets/37028004-64b5-4c2f-9d64-698e58f4551e" />

Une fois le questionnaire enregistré, revenir à la liste des builds et vérifier que le statut permet la soumission.

### 2.3 Ouvrir ou créer la version App Store

Toujours dans l'application, revenir à la fiche de version dans la barre latérale.

- Si une version est déjà **Prepare for Submission** et que son numéro est exactement le `versionNumber` du build, ouvrir cette version.
- Si la version en ligne est **Ready for Distribution**, cliquer sur le bouton **+** à côté de la plateforme iOS. Saisir le même numéro que `versionNumber`, puis créer la version. Un numéro différent de celui du binaire empêche de sélectionner le build.

<img width="840" height="525" alt="Screenshot 2026-11-09 at 14 08 24" src="https://github.com/user-attachments/assets/96554483-e9a6-4fdb-919e-c9c3e7131412" />

Sur la page de la version :

1. Dans **What's New in This Version**, rédiger les nouveautés pour chaque langue déjà configurée sur la fiche, au minimum le français.
2. Vérifier les captures d'écran et le texte de fiche existants. Une mise à jour réutilise la fiche déjà en ligne. Mettre à jour les captures si l'interface présentée n'est plus celle de l'application.
3. Dans la section de publication, choisir le mode de mise à disposition après acceptation :
   - **Manually release this version** : la version acceptée reste en attente jusqu'à une publication manuelle ;
   - **Automatically release this version** : Apple publie dès l'acceptation ;
   - publication automatique à partir d'une date : Apple publie après l'acceptation, pas avant cette date.
4. Laisser ou activer le **phased release** selon le besoin. Activé, le déploiement automatique des mises à jour s'étale sur 7 jours. Il peut être accéléré ensuite.

<img width="597" height="420" alt="Screenshot 2026-11-10 at 14 45 54" src="https://github.com/user-attachments/assets/8c0ab0bc-a91e-4538-920f-0082ac6af3ad" />

***

<img width="650" height="350" alt="Screenshot 2026-11-10 at 14 46 50" src="https://github.com/user-attachments/assets/84ddabed-0a8a-4ba5-85cd-8024d90fa4cc" />


### 2.4 Renseigner l'accès pour la revue

Les deux applications demandent une connexion. La section **App Review Information** doit permettre au reviewer Apple d'ouvrir l'application.

En théorie :

1. Cocher **Sign-in required**.
2. Renseigner un identifiant et un mot de passe de démonstration valides. Pour NaviForest, ce compte doit accéder au guichet porté par l'application. Pour EspaceCo, il doit accéder aux guichets utiles pour parcourir l'application.
3. Compléter le contact (**Contact Information**) : prénom, nom, téléphone et e-mail d'une personne joignable pendant la revue.
4. Dans **Notes**, indiquer ce qui est nécessaire pour atteindre les écrans principaux : compte de démonstration, guichet à ouvrir, fonction qui dépend d'un accès particulier.

<img width="1170" height="466" alt="Screenshot 2026-11-10 at 14 50 17" src="https://github.com/user-attachments/assets/d9fb53d4-2144-4cd2-a481-ac267eb5c831" />

Si ces informations sont déjà remplies et toujours valides, les relire avant l'envoi. Un compte expiré ou un guichet inaccessible est un motif de refus fréquent.

### 2.5 Associer le build et soumettre

1. Sur la page de la version, descendre jusqu'à la section **Build**.
2. Cliquer sur **Add Build**, ou sur le build déjà sélectionné pour le remplacer.
3. Choisir le build dont le numéro correspond au déploiement qui vient d'être fait. Confirmer avec **Done**.
4. Enregistrer la page.
5. En haut à droite, cliquer sur **Add for Review**.
6. Choisir une nouvelle soumission, ou une soumission brouillon déjà ouverte. Le statut de la version passe à **Ready for Review**. À ce stade, la version n'est pas encore partie chez Apple.
7. Ouvrir **Draft Submissions**, en bas à droite de l'écran, ou la section **App Review** dans la barre latérale.
8. Ouvrir la soumission, vérifier qu'elle contient la bonne version et le bon build, puis cliquer sur **Submit for Review**.

<img width="1200" height="440" alt="Screenshot 2026-11-10 at 15 19 38" src="https://github.com/user-attachments/assets/13d7827d-51b5-4c04-93c4-d12eee8073f7" />

***

<img width="1049" height="500" alt="Screenshot 2026-11-10 at 15 19 43" src="https://github.com/user-attachments/assets/5da2ce4e-3776-4b8e-9dae-110e44c9c061" />

***

<img width="1085" height="600" alt="Screenshot 2026-11-10 at 15 20 01" src="https://github.com/user-attachments/assets/4f05b447-0cf6-414f-827d-58181d031d43" />

***

<img width="1220" height="800" alt="Screenshot 2026-11-09 at 14 08 34" src="https://github.com/user-attachments/assets/296838c8-7851-4580-9e82-6a531ab401a2" />


Le statut passe ensuite à **Waiting for Review**, puis à **In Review** quand la revue démarre.


### 2.6 Après la décision d'Apple

| Statut | Action |
| --- | --- |
| **Waiting for Review** | La soumission est dans la file. On peut encore la retirer si le mauvais build a été envoyé. |
| **In Review** | Apple examine la version. |
| **Pending Developer Release** | La version est acceptée et le mode manuel a été choisi. Ouvrir la version, puis cliquer sur **Release This Version**. |
| **Ready for Distribution** | La version est publiée sur l'App Store. |
| **Rejected** | Lire le message dans **Resolution Center**. |

En cas de refus :

- si le binaire doit changer, corriger le projet, relancer `npm run deploy:ios`, attendre le nouveau build, l'associer à la version, puis renvoyer en revue ;
- si seul le texte de la fiche ou les informations de connexion sont en cause, les corriger et renvoyer la même version.

## 3. Android : envoyer la release interne en revue production

Compte nécessaire : [Google Play Console](https://play.google.com/console), avec le droit de publier sur la piste production.

Le workflow a déjà déposé l'AAB signé sur la piste interne. La suite consiste à promouvoir cette release.

### 3.1 Vérifier la release interne

1. Ouvrir la Play Console et sélectionner l'application dont le package est `fr.ign.guichet` pour EspaceCo, ou `fr.ign.naviforest` pour NaviForest.
2. Aller dans **Test and release > Testing > Internal testing**.
3. Ouvrir la release la plus récente.
4. Vérifier que le `versionCode` est celui affiché par `npm run deploy:android`, et que le `versionName` correspond à `versionNumber`.

La piste interne ne constitue pas la publication publique. Les testeurs internes peuvent installer ce build, mais les utilisateurs du Play Store restent sur la release de production précédente tant que la promotion n'est pas acceptée et publiée.

S'il existe déjà une release de production non terminée, un brouillon ou un déploiement progressif qui bloque la création d'une nouvelle release, le traiter d'abord depuis **Test and release > Production** ou depuis **Publishing overview**. La console empêche d'en ouvrir une nouvelle tant qu'une release est en suspens. Dans l'onglet **Releases** on a accès la version en cours de traitement. Pour complètement annuler la version en brouillon, cliquer sur **Manage release** puis **Discard release**.

### 3.2 Promouvoir la release vers Production

1. Sur la page **Internal testing** (**Testing > Internal testing**), au niveau de la release à publier, ouvrir **Promote release**.
2. Choisir **Production**.
3. La console ouvre la préparation de la release de production avec le même AAB. Ne pas utiliser **Upload** : le binaire est déjà dans la bibliothèque.


<img width="1400" height="700" alt="Screenshot 2026-11-09 at 14 10 14" src="https://github.com/user-attachments/assets/c2e94e09-1c76-439c-96b6-fd7907bf60fd" />

Si **Promote release** n'est pas proposé, ouvrir **Test and release > Production**, créer la release, puis utiliser **Add from library** et sélectionner le même `versionCode`.

### 3.3 Compléter la release de production

Sur le formulaire de la release :

1. Vérifier le nom de release. La valeur proposée reprend en général le `versionName`.
2. Rédiger les notes de version pour les langues de la fiche, au minimum `fr-FR`.
3. Conserver le bundle déjà attaché. Le `versionCode` doit être strictement supérieur à celui de la production en ligne.
4. Choisir le pourcentage de déploiement :
   - **100 %** publie auprès de tous les utilisateurs des pays déjà configurés, une fois la revue acceptée ;
   - un pourcentage inférieur démarre un déploiement progressif. Il pourra être augmenté ensuite sur la page **Production**.
5. Cliquer sur **Next**.
6. Lire le récapitulatif et corriger les erreurs affichées sur la page. Traiter aussi les avertissements qui portent sur la déclaration de données, les autorisations ou l'accès à l'application.
7. Enregistrer la release.
   - **Save** place la release dans **Publishing overview**, dans les changements pas encore envoyés en revue.
   - **Start rollout to Production** confirme la release. Ouvrir ensuite **Publishing overview** : si elle figure encore dans les changements pas encore envoyés, l'envoi en revue reste à faire. Si elle figure déjà dans les changements en revue, cette étape est terminée.

<img width="1125" height="600" alt="Screenshot 2026-11-10 at 15 30 41" src="https://github.com/user-attachments/assets/19920f9b-1833-48b7-a9e4-da964a7be008" />

***

<img width="1350" height="600" alt="Screenshot 2026-11-10 at 15 30 44" src="https://github.com/user-attachments/assets/3cb321ba-914b-4d29-bf43-2f7f651cd1be" />

***

<img width="1090" height="600" alt="Screenshot 2026-11-09 at 14 10 58" src="https://github.com/user-attachments/assets/501221e5-5396-4548-b638-c4142f03e730" />

***

<img width="1160" height="600" alt="Screenshot 2026-11-09 at 14 11 09" src="https://github.com/user-attachments/assets/8fe015cc-75fa-4c53-92b4-89be7b96b911" />

### 3.4 Envoyer les changements en revue

1. Ouvrir **Publishing overview**.
2. Dans **Changes not yet sent for review**, vérifier que la ligne correspond à la release de production qui vient d'être préparée, avec le bon `versionCode`.
3. Laisser de côté, avec **Save for later**, les autres changements qui ne doivent pas partir dans la même revue.
4. Cliquer sur **Send for review**.

<img width="1057" height="600" alt="Screenshot 2026-11-09 at 14 12 46" src="https://github.com/user-attachments/assets/33e9d493-7b81-4477-aa99-279f3b832f9e" />

Si le bouton reste inactif, ouvrir le tableau de bord de l'application. La console y liste les déclarations manquantes, par exemple le contenu de l'application, la sécurité des données ou l'accès à l'application. Pour une mise à jour, ces déclarations existent déjà : les revoir si la version ajoute une autorisation, change la connexion, ou modifie les données manipulées. L'application utilise notamment la géolocalisation, l'appareil photo et le Bluetooth. Une déclaration qui ne correspond plus au binaire bloque ou fait échouer la revue.

Les identifiants de test se déclarent dans **Monitor and improve > Policy and programs > App content > Actioned > Sign in details**, lorsque l'application impose une connexion. Vérifier qu'ils sont encore valides avant l'envoi. Le compte NaviForest doit accéder à son guichet. Le compte EspaceCo doit pouvoir ouvrir les guichets nécessaires.

### 3.5 Publication après acceptation

Sur **Publishing overview**, regarder l'état de **Managed publishing**.

- S'il est désactivé, Google publie la release dès l'acceptation, au pourcentage choisi.
- S'il est activé, la release acceptée reste dans **Ready to publish**. Cliquer sur **Publish changes** au moment voulu. Tant que ce bouton n'est pas utilisé, les utilisateurs ne reçoivent pas la mise à jour.

Après publication, la page **Test and release > Production** montre la release active et, en cas de déploiement progressif, le pourcentage en cours. On peut augmenter ce pourcentage ou interrompre le déploiement avec **Halt rollout** si la version en ligne pose problème.

Un refus apparaît dans **Publishing overview** et dans la boîte mail du compte Play. Si le binaire doit être corrigé, relancer `npm run deploy:android` : le nouveau `versionCode` sera supérieur. Promouvoir ensuite cette nouvelle release interne. Si seul un texte de fiche ou une déclaration est en cause, corriger cet élément et renvoyer les changements en revue.

## 4. Ordre pratique lorsque les deux plateformes partent ensemble

`npm run deploy` pousse les deux tags de la même variante presque en même temps. Les consoles ne se débloquent pas au même moment : TestFlight attend souvent plus longtemps que la piste interne.

Ordre utilisable :

1. Vérifier que les deux workflows GitHub Actions sont verts.
2. Noter le numéro de build commun, ou les deux numéros si les plateformes n'ont pas été déployées ensemble.
3. Envoyer iOS dès que le build TestFlight n'est plus en **Processing** et que la conformité est enregistrée.
4. Promouvoir Android dès que la release interne affiche le `versionCode` attendu.
5. Vérifier le lendemain les statuts **In Review**, **Pending Developer Release**, **Ready to publish** ou **Ready for Distribution**.

EspaceCo et NaviForest demandent chacune leur propre déploiement. Changer `scripts/.selected-app`, committer, puis relancer `npm run deploy` pour l'autre variante. Un tag construit une seule application.

## Voir aussi

- [[Pipeline iOS (CI CD)]]
- [[Pipeline Android (CI CD)]]
- [[Scripts npm]]
- [[Variantes applicatives EspaceCo et NaviForest]]
