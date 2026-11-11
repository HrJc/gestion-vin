# Cahier des charges – Application de gestion (vin en vrac & trading)

**18 octobre 2026 · version 2**

> Transcription Markdown du cahier des charges PDF original (7 pages). Le contenu métier et les choix techniques proposés sont conservés tels que formulés dans la source ; aucune décision nouvelle n'est ajoutée.

## 1. Contexte du projet

Le client veut une application unique pour piloter ses deux activités, remplacer la saisie par WhatsApp et produire un bilan mensuel fiable.

La société fait de l'achat-revente et exerce deux activités :

- **Activité 1 – Production de vin en vrac** : vente via des collaborations avec des revendeurs et des vendeurs, et gestion d'un stock de matières premières venant de plusieurs fournisseurs et stockées à plusieurs endroits.
- **Activité 2 – Achat-vente de marchandises** : achat et revente de marchandises dont le prix fluctue.

Le dirigeant utilisera lui-même l'application. Son niveau en informatique est général : la simplicité d'utilisation est une exigence prioritaire, pas un bonus.

## 2. Problèmes actuels et objectifs

Chaque problème exprimé par le client correspond à un objectif mesurable de l'application.

| Problème actuel | Conséquence | Objectif de l'application |
|---|---|---|
| Ventes enregistrées par messages WhatsApp | Beaucoup de temps perdu à recopier les données dans un tableur | Saisie directe dans l'application, en moins de 30 secondes par vente |
| Prix de vente différents selon chaque partenaire | Calculs compliqués, risques d'erreurs | Grille de prix par partenaire, prix appliqué automatiquement |
| Traitement des données en retard | Bilan mensuel repoussé en bilan trimestriel | Bilan mensuel généré automatiquement, disponible dès le 1er du mois suivant |
| Ancienne application qui effaçait les données à chaque mise à jour | Inventaire à refaire à chaque fois | Données conservées en permanence, sauvegardes automatiques, mises à jour sans aucune perte |
| Stock dispersé (produits, fournisseurs, emplacements) | Pas de vision claire des quantités disponibles | Stock en temps réel par produit, fournisseur et emplacement |
| Pas d'outil pour suivre l'achat-vente de marchandises | Pas de vision des gains, pertes et fluctuations | Stock, historique des opérations et graphiques d'évolution des prix |

## 3. Utilisateurs et rôles

Trois rôles suffisent ; seuls les administrateurs voient les chiffres globaux et le module achat-vente.

| Rôle | Qui | Ce qu'il peut faire |
|---|---|---|
| Administrateur | Le dirigeant et son associé | Tout voir et tout modifier : ventes, stock, trading, bilans, prix, utilisateurs |
| Employé (optionnel, plus tard) | Personnel de production ou de vente | Saisir les ventes et les mouvements de stock ; voir uniquement ses propres saisies |
| Partenaire (accès restreint) | Revendeur ou vendeur | Consulter ses propres ventes et paiements ; accès ouvert seulement à quelques membres choisis |

Le module achat-vente est réservé aux administrateurs.

## 4. Module 1 – Ventes et partenaires (vin en vrac)

Ce module remplace WhatsApp : chaque vente est saisie une seule fois, sur téléphone, et alimente directement le bilan.

### 4.1 Gestion des partenaires

- Fiche partenaire : nom, type (revendeur ou vendeur), téléphone, adresse, zone, date de début de collaboration.
- Grille de prix propre à chaque partenaire : prix fixe par produit, avec une remise en pourcentage possible.
- Conditions particulières : remise en pourcentage, délai de paiement.
- Historique des prix : un changement de prix ne modifie pas les ventes passées.
- Activation ou désactivation d'un partenaire sans supprimer son historique.

### 4.2 Saisie des ventes

- Formulaire court reprenant le format actuel des messages (voir 4.6) : partenaire, client livré, produit, quantité, frais de livraison, date (remplie automatiquement).
- Le prix unitaire et le montant total se calculent automatiquement selon la grille du partenaire.
- Possibilité de corriger le prix à la main, avec une note obligatoire.
- Statut de paiement : payé, partiellement payé, à payer.
- Mode de paiement : espèces ou Mobile Money.
- Ajout facultatif d'une photo (bon de livraison, reçu).

### 4.3 Suivi des paiements et des créances

- Liste des montants dus par partenaire.
- Enregistrement des paiements reçus, total ou partiel.
- Alerte pour les impayés au-delà du délai convenu.

### 4.4 Lien avec le stock

Chaque vente diminue automatiquement le stock de vin du produit concerné (module 2).

### 4.5 Reprise de l'existant

Les anciennes données ne sont pas récupérables : l'application démarre à zéro, avec la saisie des partenaires, des produits et des prix au lancement.

### 4.6 Format actuel des messages WhatsApp

Chaque vente est aujourd'hui envoyée sur une ligne codée, par exemple `NLS/DON BOSCO/D/1/28 000/FL 4 000/OK`. Le formulaire reprendra exactement ces champs, dans le même ordre.

| Champ du message | Exemple | Champ dans l'application |
|---|---|---|
| Partenaire | NLS, BEAHITSE, THM | Liste déroulante des partenaires |
| Client livré (facultatif) | DON BOSCO, UFEEL | Champ libre, rattaché au partenaire |
| Produit | D, L, SV | Liste déroulante des produits |
| Quantité | 1, 5, 10 | Nombre |
| Montant | 28 000 | Calculé automatiquement selon la grille du partenaire |
| Frais de livraison (FL) | FL 4 000 | Champ facultatif |
| Statut de paiement | OK, NP | Payé ou à payer |

Les exemples confirment le besoin d'une grille par partenaire : une unité de D est vendue 20 500 Ar à plusieurs partenaires, 25 000 Ar à BEAHITSE et 28 000 Ar à DON BOSCO via NLS. Un paiement reçu plus tard, aujourd'hui signalé par une réponse « PAYÉ », se fera en un clic sur la vente concernée.

## 5. Module 2 – Stock et production

Le stock n'est jamais tapé à la main : il est calculé à partir de mouvements tracés, ce qui supprime le besoin de refaire l'inventaire.

### 5.1 Référentiels

- Produits : matières premières (raisin, sucre, levures, bouteilles, bidons, étiquettes, etc.) et produits finis (vin en vrac par type), avec leur unité (kg, litre, pièce).
- Fournisseurs : nom, contact, produits fournis, prix d'achat habituel.
- Emplacements : dépôts, caves ou magasins, chacun avec son nom et sa localisation.

### 5.2 Mouvements de stock

- Entrée : achat chez un fournisseur (produit, quantité, prix, fournisseur, emplacement).
- Sortie : utilisation en production, vente, perte ou casse (avec motif).
- Transfert : déplacement d'un emplacement vers un autre.
- Production : consommation des matières premières et entrée du vin produit, en une seule opération.
- Chaque mouvement garde la date, l'auteur et une note ; aucun mouvement n'est supprimé, une erreur se corrige par un mouvement inverse.

### 5.3 Consultation du stock

- Quantité disponible par produit, par emplacement et au total.
- Valeur du stock, calculée à partir des prix d'achat.
- Alerte quand un produit passe sous un seuil minimum défini.
- Historique complet des mouvements, filtrable par produit, fournisseur, emplacement ou période.

### 5.4 Inventaire

- Saisie d'un inventaire physique (comptage réel).
- Affichage automatique des écarts entre stock théorique et stock compté.
- Validation des écarts sous forme de mouvements d'ajustement.

### 5.5 Reprise de l'existant

Les données de l'ancienne application sont perdues : un inventaire physique complet est fait une seule fois, au lancement, puis saisi dans l'application ; il n'aura plus jamais à être refait à cause d'une mise à jour.

## 6. Module 3 – Achat-vente de marchandises

Ce module est un journal de bord simple : le dirigeant note ses achats et ventes, et l'application affiche la valeur actuelle, les gains et les fluctuations.

### 6.1 Marchandises suivies

- Liste des marchandises suivies, avec leur unité de mesure.
- Prix du marché saisi manuellement, chaque fois que le dirigeant le relève, pour suivre les fluctuations.

### 6.2 Saisie des opérations

- Formulaire : achat ou vente, marchandise, quantité, prix unitaire, frais (transport, etc.), date, fournisseur ou acheteur, mode de paiement, note.
- Montants en ariary ; ventes à crédit suivies comme créances, comme dans le module 1.

### 6.3 Stock et résultats

- Quantité en stock par marchandise, prix d'achat moyen, valeur au dernier prix du marché.
- Gain ou perte latent (sur ce qui est encore détenu) et réalisé (sur ce qui a été vendu).
- Valeur totale du stock de marchandises en ariary.

### 6.4 Fluctuations

- Graphique d'évolution du prix de chaque marchandise (semaine, mois, année), à partir des prix saisis.
- Graphique d'évolution de la valeur du stock de marchandises.
- Alerte facultative quand un prix dépasse un seuil haut ou bas choisi.

### 6.5 Simplicité

Un seul écran principal : la valeur totale, la liste des marchandises avec leur variation de prix en couleur (vert ou rouge), et un gros bouton « Nouvelle opération ». Aucune fonction d'achat ou de vente réelle n'est passée depuis l'application : elle suit les opérations, elle ne les exécute pas.

## 7. Tableau de bord et bilans

Le bilan mensuel est produit automatiquement, sans retraitement : c'est la réponse directe au passage forcé au bilan trimestriel.

### 7.1 Tableau de bord (page d'accueil)

- Chiffre d'affaires du mois en cours, comparé au mois précédent.
- Top partenaires et top produits du mois.
- Montant total des impayés.
- Produits en stock bas.
- Valeur du stock de marchandises (activité 2) et sa variation.

### 7.2 Bilan mensuel automatique

- Ventes par partenaire, par produit et par type de partenaire (revendeur ou vendeur).
- Achats de matières premières par fournisseur.
- Marge brute : ventes moins coût des matières consommées.
- État du stock en fin de mois (quantités et valeur).
- Résultat de l'achat-vente de marchandises du mois (marges réalisées).

### 7.3 Analyses

- Comparaison mois par mois, trimestre et année.
- Graphiques d'évolution des ventes et des marges.
- Filtres par période, partenaire, produit, emplacement.

### 7.4 Exports

Export de chaque bilan et de chaque liste en Excel et en PDF, pour le comptable ou pour archivage.

## 8. Exigences non fonctionnelles

Trois exigences priment sur tout le reste : ne jamais perdre de données, être utilisable sans formation, fonctionner avec une connexion instable.

### 8.1 Sécurité et conservation des données

- Base de données hébergée en ligne, séparée du code de l'application.
- Les mises à jour modifient la structure par migrations contrôlées, sans jamais effacer de données.
- Sauvegarde automatique quotidienne, conservée au moins 30 jours, plus une sauvegarde avant chaque mise à jour.
- Procédure de restauration testée avant la mise en service.
- Aucune suppression définitive : les éléments supprimés sont archivés et récupérables.
- Journal des modifications : qui a modifié quoi et quand.

### 8.2 Facilité d'utilisation

- Interface en français (malgache en option).
- Gros boutons, peu de champs, menus courts.
- Calculs automatiques partout où c'est possible (prix, totaux, stock).
- Une démonstration et un guide illustré de quelques pages sont fournis à la livraison.

### 8.3 Accessibilité et connexion

- Utilisable sur téléphone, tablette et ordinateur, depuis un navigateur.
- Installable sur l'écran d'accueil du téléphone comme une application.
- Mode hors-ligne pour la saisie des ventes et des mouvements de stock, avec synchronisation au retour du réseau.

### 8.4 Accès sécurisé

- Connexion par identifiant et mot de passe, un compte par personne.
- Droits d'accès selon le rôle (section 3).
- Connexion chiffrée (HTTPS).

### 8.5 Formats locaux

Montants en ariary (MGA) par défaut, dates au format JJ/MM/AAAA.

## 9. Architecture technique

Une application web unique, installable sur téléphone, avec une base de données en ligne strictement séparée du code : c'est ce qui garantit qu'une mise à jour n'efface plus rien.

### Schéma fonctionnel (retranscription textuelle du diagramme PDF)

```text
Utilisateurs (téléphone, tablette, ordinateur)
                   |
Application web installable (PWA) — saisie hors-ligne possible
                   |
      +------------+-------------+--------------+
      |            |             |              |
    Ventes        Stock       Achat-vente       Bilans
 prix/partenaire  mouvements  marchandises      mensuels/exports
      +------------+-------------+--------------+
                   |
            Serveur (API sécurisée)
            droits par rôle, calculs
                   |
          Base de données en ligne
             séparée du code
                   |
        Sauvegardes chaque jour
       et avant chaque mise à jour

Prix du marché (activité 2) : saisi à la main.
```

Les utilisateurs passent par l'application ; le serveur contrôle les droits et fait les calculs ; seule la base conserve les données, copiées chaque jour dans les sauvegardes.

### Choix techniques proposés

| Élément | Choix proposé | Raison |
|---|---|---|
| Interface | Application web progressive (PWA), par exemple Next.js | Une seule application pour téléphone et ordinateur, sans passer par les stores |
| Serveur et base de données | PostgreSQL, par exemple via Supabase | Base fiable, comptes utilisateurs et sauvegardes inclus |
| Hébergement | Hébergeur cloud avec sauvegardes automatiques | Accès depuis partout, pas de serveur à gérer chez le client |
| Prix des marchandises | Saisie manuelle dans l'application | Suivi des fluctuations sans dépendre d'une source en ligne |
| Hors-ligne | Stockage local dans le navigateur, synchronisation automatique | Saisie possible malgré une connexion instable |
| Exports | Génération de fichiers Excel et PDF | Transmission au comptable et archivage |

Ces choix restent ajustables selon les outils maîtrisés par le développeur (par exemple Laravel et MySQL), tant que la séparation code / données et les sauvegardes sont respectées.

## 10. Planning, livrables et points à valider

Le projet est livré en trois phases, en commençant par le problème le plus urgent : les ventes et le bilan mensuel. Les durées sont indicatives et seront confirmées après validation de ce cahier des charges.

### 10.1 Phases

1. **Phase 1 – Ventes, partenaires et bilan mensuel** (environ 4 à 6 semaines) : modules 1 et 7, comptes utilisateurs, sauvegardes, saisie des partenaires et des prix.
2. **Phase 2 – Stock et production** (environ 3 à 5 semaines) : module 2, inventaire initial, lien ventes-stock.
3. **Phase 3 – Achat-vente de marchandises** (environ 2 à 4 semaines) : module 3, historique des prix et graphiques.

Chaque phase se termine par une démonstration, deux semaines de test par le client et la correction des anomalies avant de passer à la suivante.

### 10.2 Livrables

- Application en ligne, installable sur téléphone et accessible sur ordinateur.
- Comptes utilisateurs créés et paramétrés.
- Partenaires, prix et inventaire initial saisis au lancement.
- Guide d'utilisation illustré et séance de prise en main.
- Période de maintenance corrective après la mise en service (durée à définir).

### 10.3 Décisions prises avec le client

| Point | Décision |
|---|---|
| Activité 2 | Achat-vente de marchandises (pas de crypto) |
| Suivi des opérations | Saisie manuelle, sans connexion à une plateforme |
| Utilisateurs | Le dirigeant et son associé, tous deux administrateurs |
| Accès partenaires | Réservé à quelques membres choisis |
| Prix par partenaire | Prix fixe par produit, avec remise en pourcentage possible |
| Paiements | Espèces et Mobile Money, avec suivi des créances |
| Format WhatsApp | Exemple fourni et analysé (section 4.6) |
| Anciennes données | Non récupérables : démarrage à zéro |

### 10.4 Questions restantes

- [ ] Signification des codes produits D, L et SV, et unité de chacun.
- [ ] Signification de CONT dans `NLS/CONT/SV/10/67 000/FL 2 000/OK` : client livré ou autre ?
- [ ] FL correspond-il bien aux frais de livraison, et qui les paie ?
- [ ] NP signifie-t-il « non payé » ? Existe-t-il d'autres statuts ?
- [ ] Liste des produits, fournisseurs et emplacements, à fournir au lancement.
- [ ] Budget, délai souhaité, hébergement et maintenance.
