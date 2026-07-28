<div align="center">

# 🌐 Glocal Translate & Prompt Enhancer

<p align="center">
  <b>Traduction locale ultra-fidèle (FR ↔ EN), 100% Non-Censurée (NSFW) et Optimiseur de Prompts IA alimenté par Qwen2.5-3B sur CPU.</b>
</p>

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LLM](https://img.shields.io/badge/LLM-Qwen2.5--3B--Uncensored-7A22CE?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/mradermacher/Qwen2.5-3B-Instruct-Uncensored-GGUF)
[![CPU Optimized](https://img.shields.io/badge/Hardware-CPU_Optimized-FF6F00?style=for-the-badge&logo=intel&logoColor=white)](#-performances--cpu)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<br/>

![Glocal Translate UI Demo](Preview.png)

</div>

---

## 📖 À propos

**Glocal Translate** est une application web de traduction et d'optimisation de prompts **100% privée, autonome et hors-ligne**. Elle fonctionne entièrement sur votre processeur (CPU) sans nécessiter de carte graphique dédiée (GPU), de clé API ni de serveur distant.

Conçu autour du modèle **Qwen2.5-3B-Instruct-Uncensored** (format GGUF Q4_K_M), cet outil élimine toutes les restrictions de modération usuelles pour offrir une fidélité de traduction absolue, y compris pour le langage familier, l'argot, les gros mots et les contenus explicites/NSFW.

---

## ✨ Fonctionnalités Clés

* 🔒 **100% Privé & Hors-Ligne** : Vos textes ne quittent jamais votre machine. Aucune télémétrie, aucun tracker.
* 🔓 **100% Non-Censuré (NSFW / Argot / Insultes)** : Grâce au modèle débridé (*abliterated*), tout le vocabulaire est traduit avec une fidélité brute sans refus ni moralisation.
* ⚡ **Optimisé CPU & Déchargement Auto de la RAM** :
  * **Faible empreinte RAM** (~2.0 Go) et vitesse d'exécution élevée (~40 tokens/sec).
  * **Auto-Unload RAM après 60s d'inactivité** : Libère automatiquement la mémoire vive du processeur si aucune activité n'est détectée pendant 1 minute. Le modèle se recharche instantanément à la requête suivante.
* 💡 **Correction Orthographique & Grammaticale Intelligente** : Détecte les fautes de frappe, coquilles et accents manquants à la volée (*ex: "salt ca va ?" ➔ "salut ça va ?"*) et propose une correction en 1 clic.
* ✨ **Mode Prompt Enhancer (Mode dédié)** :
  * 🎨 **Image AI** (Midjourney, Flux.1, Stable Diffusion, DALL-E 3)
  * 🤖 **Prompt Système LLM** (ChatGPT, Claude, Llama)
  * 📝 **Expansion Créative**
* ⚡ **Autocomplétion Contextuelle** : Propose la suite logique de vos phrases en temps réel dans la langue source choisie.
* 🚀 **Lanceur 1-Clic (`start.bat`)** : Gestion autonome du venv Python, téléchargement automatique du modèle depuis Hugging Face et ouverture du navigateur.

---

## 🛠️ Stack Technique

```text
├── Backend  : Python 3.10+ • FastAPI • Uvicorn • llama-cpp-python (CPU SIMD)
├── Frontend : Vanilla HTML5 • CSS3 (Dark Theme Glassmorphism) • JavaScript ES6+
├── Modèle   : Qwen2.5-3B-Instruct-Uncensored-GGUF (Q4_K_M ~ 2.0 Go)
└── Deployment: Script Batch autonome (.bat)
```

---

## 🚀 Installation & Démarrage Rapide

### Prérequis
* **Windows 10 / 11**
* **Python 3.10+** installé et ajouté au `PATH` système.

### Étapes d'installation

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/Guillaume-127/glocal-translate.git
   cd glocal-translate
   ```

2. **Lancer l'application** :
   Double-cliquez simplement sur le fichier **`start.bat`**.

3. **Première utilisation** (Automatique) :
   * Le script va créer l'environnement virtuel Python (`venv`).
   * Il va installer les dépendances et la roue pré-compilée CPU de `llama-cpp-python`.
   * Le modèle non censuré **Qwen2.5-3B** (~2.0 Go) sera téléchargé automatiquement dans le dossier `models/`.
   * L'interface s'ouvrira automatiquement dans votre navigateur par défaut à l'adresse : `http://127.0.0.1:8080/`.

---

## 💡 Guide d'Utilisation

### 1. 🌐 Mode Traducteur
* Saisissez votre texte dans le panneau de gauche.
* La traduction s'effectue automatiquement pendant la saisie avec debouncing.
* Si une faute de frappe ou d'accent est détectée, un bandeau **💡 Correction suggérée** apparaît. Cliquez sur **Corriger la phrase** pour appliquer la modification.

### 2. ✨ Mode Prompt Enhancer
* En haut au centre, cliquez sur l'onglet **✨ Prompt Enhancer**.
* Choisissez votre style (🎨 Image AI, 🤖 Prompt Système LLM, 📝 Expansion Créative).
* Entrez votre idée brute (ex: *"Un guerrier cybernetic sous la pluie"*).
* Cliquez sur **Améliorer le Prompt** pour obtenir un prompt professionnel optimisé en Anglais prêt à être copié dans Midjourney / Flux / ChatGPT.

---

## 🖥️ Performances CPU & Consommation

| Métrique | Valeur |
| :--- | :--- |
| **Empreinte RAM (Modèle chargé)** | ~2.0 Go |
| **Empreinte RAM (Après 60s d'inactivité)** | **0 Go (Déchargé de la RAM)** |
| **Vitesse de génération CPU** | ~35 à 55 tokens/sec |
| **Temps de réponse moyen** | < 1 seconde par phrase |

---

## ⚙️ Structure du Projet

```text
glocal-translate/
├── backend/
│   ├── main.py          # Serveur FastAPI, Engine llama-cpp, Auto-Unload & Routes API
│   └── downloader.py    # Script de téléchargement Hugging Face
├── frontend/
│   ├── index.html       # Interface Web (Traducteur + Prompt Enhancer)
│   ├── style.css        # Styles Dark Mode Modernes & Responsive
│   └── app.js           # Gestionnaire d'UI, Heartbeat & Requêtes API
├── models/              # Dossier de stockage du fichier GGUF
├── start.bat            # Script de lancement automatique 1-clic pour Windows
├── requirements.txt     # Dépendances Python
└── README.md            # Documentation officielle
```

---

## 📄 Licence

Ce projet est distribué sous licence **MIT**. Vous êtes libre de le réutiliser, le modifier et le distribuer.

---

<div align="center">
  <sub>Développé avec ❤️ pour la communauté Open Source et le respect de la vie privée.</sub>
</div>
