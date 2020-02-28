## Présentation

Drawing-Game est un jeu de dessin en ligne type Pictionary.


Dans son mode de jeu de base, des joueurs rejoignent une partie puis, à tour de rôle, ils doivent faire deviner un mot aux autres joueurs en dessinant. Les joueurs qui devinent le mot peuvent alors l'écrire dans un chat pour obtenir des points en fonction de leur réactivité.

Le jeu inclue un système de comptes utilisateur, de création/join de rooms et un système de monnaie in game que l'on peut gagner à chaque partie.

Derrière ce concept très simple, se trouve principalement une volonté d'améliorer les jeux similaires que l'on pouvait déjà trouver sur le Web en les adaptant à nos besoins tels que :
- La création de parties pouvant accueillir un nombre "illimité" de joueurs
- Le fait de laisser les joueurs créer ensemble, via une interface graphique, les pools de mots à faire deviner afin de rendre les parties plus conviviales en y incluant des blagues ou des références communes. (ces mots devant bien entendu être validés par une équipe de modération digne de confiance !)
- Et enfin, la nécessité avoir un système de compte utilisateur notamment pour contrôler les abus et la triche de manière efficace.

## Développement
Il s'agit d'un projet personnel réalisé en petite équipe de fin 2017 à avril 2018.\
Le serveur du jeu utilise Node.JS et Socket.io.
Le code du jeu inclut un mini-framework permettant de développer et d'ajouter facilement des nouveaux modes de jeu (voir [game_mode.js](https://github.com/SimonROZEC/Drawing-Game/blob/master/controllers/game/game_mode.js)). 

Notre but dans ce projet a été d'impliquer au maximum les joueurs dans la création du jeu. Pour cela, durant toute la phase de développement, un serveur Discord a été ouvert d'un part afin de recevoir des rapports de bugs ou des idées de la part des joueurs, mais également pour avertir les joueurs des nouveautés du jeu et organiser des événements.

## Images du jeu

<img src="https://github.com/SimonROZEC/Drawing-Game/blob/master/screenshots/connexion.png" width="500">
Page d'accueil du jeu<br/><br/>

<img src="https://github.com/SimonROZEC/Drawing-Game/blob/master/screenshots/partie.png" width="500">
En cours de partie  
